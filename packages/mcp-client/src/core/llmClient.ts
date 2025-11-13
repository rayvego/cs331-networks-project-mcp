/**
 * LLM client for Gemini and Groq API interactions
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Groq } from "groq-sdk";
import type { Configuration, LLMProvider } from "./config.js";
import type { ToolInfo } from "./toolInfo.js";

interface Message {
	role: "system" | "user" | "assistant";
	content: string;
}

export class LLMClient {
	private config: Configuration;
	private genAI: GoogleGenerativeAI | null = null;
	private groq: Groq | null = null;

	/**
	 * Initializes the LLM client with configuration.
	 *
	 * Sets up the client with the provided configuration and initializes
	 * the appropriate LLM client based on the configured provider.
	 *
	 * @param config - Configuration object containing API keys and settings
	 */
	constructor(config: Configuration) {
		this.config = config;
		this.initializeClients();
	}

	/**
	 * Initializes the LLM clients for both providers.
	 *
	 * Creates instances of both GoogleGenerativeAI and Groq clients using
	 * the current API keys from the configuration rotation.
	 *
	 * @private
	 */
	private initializeClients(): void {
		// Initialize Gemini client
		try {
			const geminiApiKey = this.getApiKeyForProvider("gemini");
			this.genAI = new GoogleGenerativeAI(geminiApiKey);
		} catch (error) {
			console.error("Failed to initialize GoogleGenerativeAI:", error);
			this.genAI = null;
		}

		// Initialize Groq client
		try {
			const groqApiKey = this.getApiKeyForProvider("groq");
			this.groq = new Groq({ apiKey: groqApiKey });
		} catch (error) {
			console.error("Failed to initialize Groq:", error);
			this.groq = null;
		}
	}

	/**
	 * Gets an API key for a specific provider without rotating.
	 *
	 * This is used for initialization where we don't want to affect rotation.
	 *
	 * @param provider - The provider to get the key for
	 * @returns API key for the provider
	 * @private
	 */
	private getApiKeyForProvider(provider: LLMProvider): string {
		const originalProvider = this.config.llmProvider;

		// Temporarily set the provider to get the key
		process.env.LLM_PROVIDER = provider;
		try {
			return this.config.llmApiKey;
		} finally {
			// Restore original provider
			process.env.LLM_PROVIDER = originalProvider;
		}
	}

	/**
	 * Gets a response from the LLM with automatic API key rotation.
	 *
	 * Sends messages to the configured LLM provider and handles automatic key rotation
	 * when rate limits are encountered. Continues trying different keys
	 * until successful or all keys are exhausted.
	 *
	 * @param messages - Array of messages to send to the LLM
	 * @param tools - Optional array of available tools for the LLM to use
	 * @returns Promise resolving to the LLM's response text
	 * @throws Error if all API keys fail or no keys are configured
	 */
	async getResponse(messages: Message[], tools?: ToolInfo[]): Promise<string> {
		const provider = this.config.llmProvider;
		const maxRetries = this.config.totalKeys; // Try each key once
		let lastError: Error | null = null;

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				if (provider === "groq") {
					return await this.getGroqResponse(messages, tools);
				} else {
					return await this.getGeminiResponse(messages, tools);
				}
			} catch (error) {
				lastError = error as Error;
				const errorMessage =
					error instanceof Error ? error.message : String(error);

				// Check if this is a rate limit or quota exceeded error
				const isRateLimitError =
					errorMessage.includes("rate limit") ||
					errorMessage.includes("quota exceeded") ||
					errorMessage.includes("RESOURCE_EXHAUSTED") ||
					errorMessage.includes("429") ||
					errorMessage.includes("insufficient_quota");

				if (isRateLimitError && attempt < maxRetries - 1) {
					console.warn(
						`API key rate limited, trying next key (attempt ${attempt + 1}/${maxRetries})`,
					);
					// Reinitialize clients with next key
					this.initializeClients();
					continue;
				}

				// If not a rate limit error or we've exhausted all keys, break
				break;
			}
		}

		// If we get here, all retries failed
		const errorMessage = `Error getting ${provider} LLM response after trying ${maxRetries} key(s): ${lastError}`;
		console.error(errorMessage);
		return `I encountered an error: ${errorMessage}. Please try again or rephrase your request.`;
	}

	/**
	 * Gets a response from the Gemini API.
	 *
	 * @param messages - Array of messages to send to Gemini
	 * @param tools - Optional array of available tools (not used for Gemini)
	 * @returns Promise resolving to the response text
	 * @private
	 */
	private async getGeminiResponse(
		messages: Message[],
		_tools?: ToolInfo[],
	): Promise<string> {
		if (!this.genAI) {
			throw new Error("GoogleGenerativeAI client not initialized");
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
		return response.text();
	}

	/**
	 * Gets a response from the Groq API.
	 *
	 * @param messages - Array of messages to send to Groq
	 * @param tools - Optional array of available tools for the LLM to use
	 * @returns Promise resolving to the response text
	 * @private
	 */
	private async getGroqResponse(
		messages: Message[],
		tools?: ToolInfo[],
	): Promise<string> {
		if (!this.groq) {
			throw new Error("Groq client not initialized");
		}

		// Convert MCP messages to Groq format
		const groqMessages: Array<{ role: string; content: string }> = messages.map(
			(message) => ({
				role: message.role === "system" ? "system" : message.role,
				content: message.content,
			}),
		);

		// Convert MCP tools to OpenAI tools format
		let openaiTools:
			| Array<{
					type: "function";
					function: {
						name: string;
						description: string;
						parameters: Record<string, unknown>;
					};
			  }>
			| undefined;
		let toolChoice: "none" | "auto" = "none";

		if (tools && tools.length > 0) {
			openaiTools = tools.map((tool) => ({
				type: "function" as const,
				function: {
					name: tool.name,
					description: tool.description,
					parameters: tool.inputSchema,
				},
			}));
			toolChoice = "auto"; // Allow the model to choose whether to use tools
		}

		const chatCompletion = await this.groq.chat.completions.create({
			messages: groqMessages as any,
			model: "openai/gpt-oss-20b",
			temperature: 1,
			max_completion_tokens: 8192,
			top_p: 1,
			stream: false, // We'll handle streaming separately if needed
			reasoning_effort: "medium",
			stop: null,
			tools: openaiTools,
			tool_choice: toolChoice,
		});

		// Handle tool calls in the response
		const choice = chatCompletion.choices[0];
		if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
			// Convert tool calls to the MCP system's expected JSON format
			const toolCall = choice.message.tool_calls[0];
			if (toolCall?.function) {
				const toolName = toolCall.function.name;
				const toolArgs = JSON.parse(toolCall.function.arguments);

				return JSON.stringify({
					tool: toolName,
					arguments: toolArgs,
				});
			}
		}

		return choice?.message?.content || "";
	}
}

export type { Message };
