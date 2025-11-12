/**
 * LLM client for Gemini API interactions
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Configuration } from "./config.js";

interface Message {
	role: "system" | "user" | "assistant";
	content: string;
}

export class LLMClient {
	private config: Configuration;
	private genAI: GoogleGenerativeAI | null = null;

	/**
	 * Initializes the LLM client with configuration.
	 *
	 * Sets up the client with the provided configuration and initializes
	 * the Google Generative AI client for making API calls.
	 *
	 * @param config - Configuration object containing API keys and settings
	 */
	constructor(config: Configuration) {
		this.config = config;
		this.initializeGenAI();
	}

	/**
	 * Initializes the Google Generative AI client.
	 *
	 * Creates a new instance of the GoogleGenerativeAI client using the
	 * current API key from the configuration rotation.
	 *
	 * @private
	 */
	private initializeGenAI(): void {
		try {
			const apiKey = this.config.llmApiKey;
			this.genAI = new GoogleGenerativeAI(apiKey);
		} catch (error) {
			console.error("Failed to initialize GoogleGenerativeAI:", error);
			this.genAI = null;
		}
	}

	/**
	 * Gets a response from the LLM with automatic API key rotation.
	 *
	 * Sends messages to the Gemini API and handles automatic key rotation
	 * when rate limits are encountered. Continues trying different keys
	 * until successful or all keys are exhausted.
	 *
	 * @param messages - Array of messages to send to the LLM
	 * @returns Promise resolving to the LLM's response text
	 * @throws Error if all API keys fail or no keys are configured
	 */
	async getResponse(messages: Message[]): Promise<string> {
		const maxRetries = this.config.totalKeys; // Try each key once
		let lastError: Error | null = null;

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				// Always rotate to next key for each conversation step
				this.initializeGenAI();
				if (!this.genAI) {
					throw new Error("Failed to initialize GoogleGenerativeAI");
				}

				// Convert MCP messages to Gemini format
				let conversation = "";
				for (const message of messages) {
					if (message.role === "user") {
						conversation += `User: ${message.content}\n`;
					} else if (message.role === "assistant") {
						conversation += `Assistant: ${message.content}\n`;
					} else if (message.role === "system") {
						conversation += `System: ${message.content}\n`;
					}
				}

				const model = this.genAI.getGenerativeModel({
					model: "gemini-2.5-flash",
				});
				const result = await model.generateContent(conversation);
				const response = await result.response;
				const text = response.text();

				return text;
			} catch (error) {
				lastError = error as Error;
				const errorMessage =
					error instanceof Error ? error.message : String(error);

				// Check if this is a rate limit or quota exceeded error
				const isRateLimitError =
					errorMessage.includes("rate limit") ||
					errorMessage.includes("quota exceeded") ||
					errorMessage.includes("RESOURCE_EXHAUSTED") ||
					errorMessage.includes("429");

				if (isRateLimitError && attempt < maxRetries - 1) {
					console.warn(
						`API key rate limited, trying next key (attempt ${attempt + 1}/${maxRetries})`,
					);
					// Reinitialize with next key
					this.initializeGenAI();
					continue;
				}

				// If not a rate limit error or we've exhausted all keys, break
				break;
			}
		}

		// If we get here, all retries failed
		const errorMessage = `Error getting LLM response after trying ${maxRetries} key(s): ${lastError}`;
		console.error(errorMessage);
		return `I encountered an error: ${errorMessage}. Please try again or rephrase your request.`;
	}
}

export type { Message };
