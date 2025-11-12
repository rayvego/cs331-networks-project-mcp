/**
 * Chat session orchestration and message processing
 */

import type {
	GetPromptResult,
	Prompt,
	ReadResourceResult,
	Resource,
} from "@modelcontextprotocol/sdk/types.js";
import type { LLMClient } from "../core/llmClient.js";
import type { McpServer } from "../core/mcpServer.js";
import type { ToolInfo } from "../core/toolInfo.js";
import * as terminalUI from "../ui/terminal.js";
import { SSEManager } from "./sseManager.js";

interface Message {
	role: "system" | "user" | "assistant";
	content: string;
}

interface ToolCall {
	tool?: string;
	arguments?: Record<string, unknown>;
}

export class ChatSession {
	private servers: McpServer[];
	private llmClient: LLMClient;
	private sseManager: SSEManager;

	/**
	 * Creates a new chat session orchestrator.
	 *
	 * Initializes the session with MCP servers and LLM client for coordinating
	 * multi-turn conversations with tool execution and streaming capabilities.
	 *
	 * @param servers - Array of initialized MCP server instances
	 * @param llmClient - Configured LLM client for generating responses
	 */
	constructor(servers: McpServer[], llmClient: LLMClient) {
		this.servers = servers;
		this.llmClient = llmClient;
		this.sseManager = new SSEManager();
	}

	/**
	 * Cleans up all server connections and SSE manager.
	 *
	 * Properly shuts down all MCP server connections and closes any active
	 * Server-Sent Events connections to prevent resource leaks.
	 *
	 * @returns Promise that resolves when all cleanup is complete
	 */
	async cleanupServers(): Promise<void> {
		await this.sseManager.cleanup();

		const cleanupPromises = this.servers.map((server) => server.cleanup());

		try {
			await Promise.allSettled(cleanupPromises);
		} catch (error) {
			console.warn("Warning during final cleanup:", error);
		}
	}

	/**
	 * Handles @resource commands to fetch and optionally attach resources.
	 *
	 * Processes resource access commands by finding the requested resource
	 * across all connected servers, displaying its metadata, and optionally
	 * attaching its content to the conversation context for the LLM.
	 *
	 * @param resourceIdentifier - Name or URI of the resource to access
	 * @param messages - Current conversation message history
	 * @returns Promise that resolves when resource handling is complete
	 */
	async handleResourceCommand(
		resourceIdentifier: string,
		messages: Message[],
	): Promise<void> {
		try {
			// Find the resource across all servers
			let foundResource: Resource | null = null;
			let foundServer: McpServer | null = null;

			for (const server of this.servers) {
				const resources = server.getResources();
				// Try to match by name or URI
				const resource = resources.find(
					(r) => r.name === resourceIdentifier || r.uri === resourceIdentifier,
				);
				if (resource) {
					foundResource = resource;
					foundServer = server;
					break;
				}
			}

			if (!foundResource || !foundServer) {
				terminalUI.displayNotFound("Resource", resourceIdentifier);
				return;
			}

			terminalUI.displayResourceHeader(
				foundResource.name,
				foundResource.uri,
				foundResource.description,
				foundResource.mimeType,
			);

			// Read the resource
			terminalUI.displayFetchingResource();
			const resourceResult: ReadResourceResult = await foundServer.readResource(
				foundResource.uri,
			);

			// Display the resource contents
			let resourceText = "";
			if (resourceResult.contents && resourceResult.contents.length > 0) {
				for (const content of resourceResult.contents) {
					if (content.text) {
						terminalUI.displaySeparator();
						console.log(content.text);
						terminalUI.displaySeparator();
						resourceText += content.text + "\n";
					} else if (content.blob && typeof content.blob === "string") {
						console.log(`[Binary content: ${content.blob.length} bytes]`);
					}
				}
				terminalUI.displayEmptyLine();

				// Ask if user wants to attach to context
				if (terminalUI.askAttachResource()) {
					// Add resource to context as a system message
					const contextMessage = `Resource: ${foundResource.name}
URI: ${foundResource.uri}
Description: ${foundResource.description || "No description"}

Content:
${resourceText}`;

					messages.push({
						role: "system",
						content: contextMessage,
					});
					terminalUI.displayResourceAttached();
				} else {
					terminalUI.displayResourceNotAttached();
				}
			} else {
				terminalUI.displayNoContent();
			}
		} catch (error) {
			terminalUI.displayResourceError(String(error));
		}
	}

	/**
	 * Handles /prompt commands to execute structured prompts.
	 *
	 * Processes prompt execution commands by finding the requested prompt,
	 * collecting required arguments from the user, executing the prompt workflow,
	 * and handling any tool calls that result from the prompt execution.
	 *
	 * @param promptName - Name of the prompt to execute
	 * @param messages - Current conversation message history
	 * @returns Promise that resolves when prompt execution is complete
	 */
	async handlePromptCommand(
		promptName: string,
		messages: Message[],
	): Promise<void> {
		try {
			// Find the prompt across all servers
			let foundPrompt: Prompt | null = null;
			let foundServer: McpServer | null = null;

			for (const server of this.servers) {
				const prompts = server.getPrompts();
				const prompt = prompts.find((p) => p.name === promptName);
				if (prompt) {
					foundPrompt = prompt;
					foundServer = server;
					break;
				}
			}

			if (!foundPrompt || !foundServer) {
				terminalUI.displayNotFound("Prompt", promptName);
				return;
			}

			terminalUI.displayUsingPrompt(foundPrompt.name, foundPrompt.description);

			// Collect arguments if needed
			const promptArgs: Record<string, unknown> = {};
			if (foundPrompt.arguments && Array.isArray(foundPrompt.arguments)) {
				terminalUI.displayCollectingArguments();
				for (const arg of foundPrompt.arguments) {
					const argName = arg.name;
					const argDescription = arg.description || "No description";
					const isRequired = arg.required || false;

					const value = terminalUI.promptForArgument(
						argName,
						argDescription,
						isRequired,
					);

					if (value) {
						promptArgs[argName] = value.trim();
					} else if (isRequired) {
						terminalUI.displayArgumentRequired(argName);
						return;
					}
				}
			}

			// Get the prompt with arguments
			terminalUI.displayFetchingPromptInstructions();
			const promptResult: GetPromptResult = await foundServer.getPrompt(
				promptName,
				promptArgs,
			);

			// Construct messages for the LLM
			// The prompt messages should come first, then continue with conversation
			if (promptResult.messages && promptResult.messages.length > 0) {
				// Add prompt messages to the conversation
				for (const promptMessage of promptResult.messages) {
					if (promptMessage.role === "user" && promptMessage.content) {
						if (typeof promptMessage.content === "string") {
							messages.push({
								role: "user",
								content: promptMessage.content,
							});
						} else if (promptMessage.content.type === "text") {
							messages.push({
								role: "user",
								content: promptMessage.content.text,
							});
						}
					} else if (
						promptMessage.role === "assistant" &&
						promptMessage.content
					) {
						if (typeof promptMessage.content === "string") {
							messages.push({
								role: "assistant",
								content: promptMessage.content,
							});
						} else if (promptMessage.content.type === "text") {
							messages.push({
								role: "assistant",
								content: promptMessage.content.text,
							});
						}
					}
				}

				terminalUI.displayPromptWorkflowStarted();

				// Continue executing tools until we get a natural language response
				let continueProcessing = true;
				while (continueProcessing) {
					// Get LLM response
					const llmResponse = await this.llmClient.getResponse(messages);
					terminalUI.displayAssistantResponse(llmResponse);

					// Process response (execute tool if needed)
					const result = await this.processLLMResponse(llmResponse);

					if (result !== llmResponse) {
						// Tool was executed
						messages.push({ role: "assistant", content: llmResponse });
						messages.push({ role: "system", content: result });

						// Show tool output to user
						this.displayToolOutput(result);

						// Continue loop to get next response
					} else {
						// Natural language response - we're done
						messages.push({ role: "assistant", content: llmResponse });
						continueProcessing = false;
					}
				}

				terminalUI.displayEmptyLine();
			}
		} catch (error) {
			terminalUI.displayPromptError(String(error));
		}
	}

	/**
	 * Formats and displays tool execution results.
	 *
	 * Parses tool execution results (typically JSON) and presents them
	 * in a readable format to the user, handling both structured and
	 * unstructured output gracefully.
	 *
	 * @param result - Raw tool execution result string
	 * @private
	 */
	private displayToolOutput(result: string): void {
		try {
			// Try to parse and format the result as JSON
			const parsedResult = JSON.parse(
				result.replace("Tool execution result: ", ""),
			);

			// Function to recursively parse nested JSON strings in text fields
			const parseNestedJson = (obj: unknown): unknown => {
				if (typeof obj === "string") {
					try {
						return JSON.parse(obj);
					} catch {
						return obj;
					}
				}
				if (Array.isArray(obj)) {
					return obj.map(parseNestedJson);
				}
				if (obj && typeof obj === "object") {
					const result: Record<string, unknown> = {};
					for (const [key, value] of Object.entries(obj)) {
						result[key] = parseNestedJson(value);
					}
					return result;
				}
				return obj;
			};

			const fullyParsedResult = parseNestedJson(parsedResult);
			terminalUI.displayToolResult(JSON.stringify(fullyParsedResult, null, 2));
		} catch {
			// If parsing fails, just show the raw result
			terminalUI.displayToolResult(result);
		}
	}

	/**
	 * Parses LLM response and executes tools if requested.
	 *
	 * Analyzes the LLM response to detect tool execution requests (JSON format),
	 * finds the appropriate tool across all servers, executes it, and returns
	 * the result. If no tool call is detected, returns the original response.
	 *
	 * @param llmResponse - The raw response from the LLM
	 * @returns Promise resolving to tool execution result or original response
	 */
	async processLLMResponse(llmResponse: string): Promise<string> {
		try {
			// Extract JSON from markdown code blocks if present
			let jsonString = llmResponse.trim();

			// Check if the response is wrapped in markdown code blocks
			const codeBlockRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/;
			const match = jsonString.match(codeBlockRegex);
			if (match?.[1]) {
				jsonString = match[1].trim();
			}

			const toolCall = JSON.parse(jsonString) as ToolCall;
			if (toolCall.tool && toolCall.arguments) {
				terminalUI.displayToolExecution(toolCall.tool);
				terminalUI.displayToolArguments(toolCall.arguments);

				// Special handling for streaming tools (traceroute and ping) - add sessionId
				const modifiedArgs = { ...toolCall.arguments };
				const actualToolName = toolCall.tool;

				if (
					toolCall.tool === "network-traceroute" ||
					toolCall.tool === "network-ping"
				) {
					// Generate a unique session ID for SSE streaming
					const sessionId = this.sseManager.generateNewSessionId();
					modifiedArgs.sessionId = sessionId;

					// Connect to SSE before executing the tool
					try {
						await this.sseManager.connectToSSE(sessionId);
					} catch (error) {
						console.warn("Failed to connect to SSE:", error);
					}
				}

				for (const server of this.servers) {
					const tools = await server.listTools();
					if (tools.some((tool) => tool.name === actualToolName)) {
						try {
							const result = await server.executeTool(
								actualToolName,
								modifiedArgs,
							);

							// Handle progress tracking if present in result
							if (result.content && Array.isArray(result.content)) {
								const progressContent = result.content.find(
									(item) =>
										typeof item === "object" &&
										item !== null &&
										"progress" in item,
								);
								if (progressContent && typeof progressContent === "object") {
									const progress = (
										progressContent as {
											progress?: number;
											total?: number;
										}
									).progress;
									const total = (
										progressContent as {
											progress?: number;
											total?: number;
										}
									).total;
									if (
										typeof progress === "number" &&
										typeof total === "number"
									) {
										console.log(
											`Progress: ${progress}/${total} (${((progress / total) * 100).toFixed(1)}%)`,
										);
									}
								}
							}

							return `Tool execution result: ${JSON.stringify(result, null, 2)}`;
						} catch (error) {
							const errorMsg = `Error executing tool: ${error}`;
							console.error(errorMsg);
							return errorMsg;
						}
					}
				}

				return `No server found with tool: ${toolCall.tool}`;
			}
			return llmResponse;
		} catch {
			return llmResponse;
		}
	}

	/**
	 * Main chat loop - initialize servers and handle user interaction.
	 *
	 * Orchestrates the complete chat session lifecycle: initializes all MCP servers,
	 * collects available tools, sets up the system prompt, and runs the interactive
	 * command loop handling user input, prompt/resource commands, and tool execution.
	 *
	 * @returns Promise that resolves when the chat session ends (user quits)
	 */
	async start(): Promise<void> {
		try {
			// Initialize all servers
			for (const server of this.servers) {
				try {
					await server.initialize();
				} catch (error) {
					console.error(`Failed to initialize server:`, error);
					await this.cleanupServers();
					return;
				}
			}

			// Collect all tools
			const allTools: ToolInfo[] = [];
			for (const server of this.servers) {
				const tools = await server.listTools();
				allTools.push(...tools);
			}

			const toolsDescription = allTools
				.map((tool) => tool.formatForLLM())
				.join("\n");

			const systemMessage = `You are a helpful assistant with access to these tools: 

${toolsDescription}
Choose the appropriate tool based on the user's question. If no tool is needed, reply directly.

IMPORTANT: When you need to use a tool, you must ONLY respond with the exact JSON object format below, nothing else:
{
    "tool": "tool-name",
    "arguments": {
        "argument-name": "value"
    }
}

After receiving a tool's response:
1. Transform the raw data into a natural, conversational response
2. Keep responses concise but informative
3. Focus on the most relevant information
4. Use appropriate context from the user's question
5. Avoid simply repeating the raw data

Please use only the tools that are explicitly defined above.`;

			const messages: Message[] = [
				{
					role: "system",
					content: systemMessage,
				},
			];

			terminalUI.displayWelcomeMessage();

			// Main chat loop
			while (true) {
				try {
					// Read user input
					const userInput = terminalUI.promptForInput("You: ");
					if (!userInput) continue;

					const trimmedInput = userInput.trim();
					const lowerInput = trimmedInput.toLowerCase();
					if (lowerInput === "quit" || lowerInput === "exit") {
						terminalUI.displayExit();
						break;
					}

					// Check if it's a prompt command
					if (trimmedInput.startsWith("/")) {
						if (trimmedInput === "/prompts") {
							// List all available prompts
							terminalUI.displayPromptsHeader();
							for (const server of this.servers) {
								const prompts = server.getPrompts();
								if (prompts.length > 0) {
									for (const promptDef of prompts) {
										terminalUI.displayPromptItem(
											promptDef.name,
											promptDef.description,
										);
									}
								}
							}
							if (this.servers.every((s) => s.getPrompts().length === 0)) {
								terminalUI.displayEmptyList("prompts");
							}
							terminalUI.displayEmptyLine();
							continue;
						}

						// Extract prompt name (remove leading /)
						const promptName = trimmedInput.substring(1);
						await this.handlePromptCommand(promptName, messages);
						continue;
					}

					// Check if it's a resource command
					if (trimmedInput.startsWith("@")) {
						if (trimmedInput === "@resources") {
							// List all available resources
							terminalUI.displayResourcesHeader();
							for (const server of this.servers) {
								const resources = server.getResources();
								if (resources.length > 0) {
									for (const resourceDef of resources) {
										terminalUI.displayResourceItem(
											resourceDef.name,
											resourceDef.description,
											resourceDef.uri,
											resourceDef.mimeType,
										);
									}
								}
							}
							if (this.servers.every((s) => s.getResources().length === 0)) {
								terminalUI.displayEmptyList("resources");
							}
							terminalUI.displayEmptyLine();
							continue;
						}

						// Extract resource name (remove leading @)
						const resourceName = trimmedInput.substring(1);
						await this.handleResourceCommand(resourceName, messages);
						continue;
					}

					messages.push({ role: "user", content: userInput });

					// Get LLM response
					const llmResponse = await this.llmClient.getResponse(messages);
					terminalUI.displayAssistantResponse(llmResponse);

					// Process response (execute tool if needed)
					const result = await this.processLLMResponse(llmResponse);

					if (result !== llmResponse) {
						// Tool was executed
						messages.push({ role: "assistant", content: llmResponse });
						messages.push({ role: "system", content: result });

						// Show tool output to user
						this.displayToolOutput(result);

						// Get final response from LLM
						const finalResponse = await this.llmClient.getResponse(messages);
						terminalUI.displayFinalResponse(finalResponse);
						messages.push({ role: "assistant", content: finalResponse });
					} else {
						messages.push({ role: "assistant", content: llmResponse });
					}

					terminalUI.displayEmptyLine();
				} catch (error) {
					if (error instanceof Error && error.message.includes("EOF")) {
						terminalUI.displayExit();
						break;
					}
					console.error("Error:", error);
				}
			}
		} finally {
			await this.cleanupServers();
		}
	}
}
