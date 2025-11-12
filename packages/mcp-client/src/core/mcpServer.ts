/**
 * MCP Server management and communication
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
	CallToolResult,
	ElicitRequest,
	ElicitResult,
	GetPromptResult,
	ListPromptsResult,
	ListResourcesResult,
	ListToolsResult,
	Prompt,
	ReadResourceResult,
	Resource,
} from "@modelcontextprotocol/sdk/types.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { getInputFromUser } from "../ui/terminal.js";
import { ToolInfo } from "./toolInfo.js";

interface ServerConfig {
	command: string;
	args: string[];
	env?: Record<string, string>;
}

export class McpServer {
	private name: string;
	private config: ServerConfig;
	private client: Client | null = null;
	private transport: StdioClientTransport | null = null;
	private capabilities: Record<string, unknown> | null | undefined = null;
	private prompts: Prompt[] = [];
	private resources: Resource[] = [];

	/**
	 * Creates a new MCP server instance.
	 *
	 * Initializes the server wrapper with configuration but does not establish
	 * the actual connection. Connection is established later via initialize().
	 *
	 * @param name - Unique identifier for this server instance
	 * @param config - Server configuration including command, args, and env
	 */
	constructor(name: string, config: ServerConfig) {
		this.name = name;
		this.config = config;
	}

	/**
	 * Initializes the MCP server connection and caches capabilities.
	 *
	 * Establishes stdio transport connection to the MCP server, sets up
	 * elicitation request handlers, and caches available prompts and resources.
	 * This is an expensive operation that should be called once per server.
	 *
	 * @returns Promise that resolves when initialization is complete
	 * @throws Error if connection fails or server capabilities cannot be determined
	 */
	async initialize(): Promise<void> {
		try {
			const command =
				this.config.command === "npx" ? "npx" : this.config.command;

			const envVars: Record<string, string> = {};
			if (this.config.env) {
				// Merge process.env with config.env, filtering out undefined values
				for (const [key, value] of Object.entries(process.env)) {
					if (value !== undefined) {
						envVars[key] = value;
					}
				}
				Object.assign(envVars, this.config.env);
			}

			this.transport = new StdioClientTransport({
				command,
				args: this.config.args,
				env: this.config.env ? envVars : undefined,
			});

			this.client = new Client(
				{
					name: "mcp-terminal-client",
					version: "1.0.0",
				},
				{
					capabilities: {
						elicitation: {},
					},
				},
			);

			// Set up elicitation request handler
			this.client.setRequestHandler(
				ElicitRequestSchema,
				async (request: ElicitRequest): Promise<ElicitResult> => {
					const userResponse = await getInputFromUser(
						request.params.message,
						request.params.requestedSchema,
					);

					return {
						action: userResponse.action,
						content:
							userResponse.action === "accept" ? userResponse.data : undefined,
					};
				},
			);

			await this.client.connect(this.transport);
			this.capabilities = this.client.getServerCapabilities();

			// Fetch and cache prompts
			try {
				const promptsResult: ListPromptsResult =
					await this.client.listPrompts();
				this.prompts = promptsResult.prompts || [];
			} catch (error) {
				console.warn(
					`Warning: Could not fetch prompts from ${this.name}:`,
					error,
				);
			}

			// Fetch and cache resources
			try {
				const resourcesResult: ListResourcesResult =
					await this.client.listResources();
				this.resources = resourcesResult.resources || [];
			} catch (error) {
				console.warn(
					`Warning: Could not fetch resources from ${this.name}:`,
					error,
				);
			}

			// Log initialization summary
			const items: string[] = [];
			if (this.prompts.length > 0)
				items.push(`${this.prompts.length} prompt(s)`);
			if (this.resources.length > 0)
				items.push(`${this.resources.length} resource(s)`);

			if (items.length > 0) {
				console.log(
					`✓ Server ${this.name} initialized with ${items.join(", ")}`,
				);
			} else {
				console.log(`✓ Server ${this.name} initialized`);
			}
		} catch (error) {
			console.error(`✗ Error initializing server ${this.name}:`, error);
			await this.cleanup();
			throw error;
		}
	}

	/**
	 * Gets cached prompts available from this server.
	 *
	 * Returns the list of MCP prompts that were discovered and cached
	 * during server initialization. This list is static and doesn't
	 * change during the server's lifetime.
	 *
	 * @returns Array of available prompts from this server
	 */
	getPrompts(): Prompt[] {
		return this.prompts;
	}

	/**
	 * Retrieves a specific prompt with arguments from the server.
	 *
	 * Fetches the prompt content and applies any provided arguments
	 * to customize the prompt execution. Arguments are converted to
	 * strings as required by the MCP protocol.
	 *
	 * @param name - Name of the prompt to retrieve
	 * @param args - Optional arguments to customize the prompt
	 * @returns Promise resolving to the prompt content and messages
	 * @throws Error if server is not initialized or prompt doesn't exist
	 */
	async getPrompt(
		name: string,
		args?: Record<string, unknown>,
	): Promise<GetPromptResult> {
		if (!this.client) {
			throw new Error(`Server ${this.name} not initialized`);
		}

		// Convert Record<string, unknown> to Record<string, string> as required by MCP SDK
		const stringArgs: Record<string, string> | undefined = args
			? Object.entries(args).reduce(
					(acc, [key, value]) => {
						acc[key] = String(value);
						return acc;
					},
					{} as Record<string, string>,
				)
			: undefined;

		return await this.client.getPrompt({
			name,
			arguments: stringArgs,
		});
	}

	/**
	 * Gets cached resources available from this server.
	 *
	 * Returns the list of MCP resources that were discovered and cached
	 * during server initialization. This list is static and doesn't
	 * change during the server's lifetime.
	 *
	 * @returns Array of available resources from this server
	 */
	getResources(): Resource[] {
		return this.resources;
	}

	/**
	 * Reads the content of a specific resource by URI.
	 *
	 * Fetches the actual content of an MCP resource using its unique
	 * identifier. The resource must be available on this server.
	 *
	 * @param uri - The unique URI identifier of the resource to read
	 * @returns Promise resolving to the resource content and metadata
	 * @throws Error if server is not initialized or resource doesn't exist
	 */
	async readResource(uri: string): Promise<ReadResourceResult> {
		if (!this.client) {
			throw new Error(`Server ${this.name} not initialized`);
		}

		return await this.client.readResource({ uri });
	}

	/**
	 * Lists and wraps available tools from the server.
	 *
	 * Retrieves all tools available on this MCP server and wraps them
	 * in ToolInfo objects for consistent interface. Also checks for
	 * progress tracking capabilities and logs accordingly.
	 *
	 * @returns Promise resolving to array of wrapped tool information
	 * @throws Error if server is not initialized
	 */
	async listTools(): Promise<ToolInfo[]> {
		if (!this.client) {
			throw new Error(`Server ${this.name} not initialized`);
		}

		const response: ListToolsResult = await this.client.listTools();
		const tools: ToolInfo[] = [];

		const supportsProgress = this.capabilities?.progress === true;

		if (supportsProgress) {
			console.log(`Server ${this.name} supports progress tracking`);
		}

		for (const tool of response.tools) {
			tools.push(
				new ToolInfo(
					tool.name,
					tool.description || "No description",
					tool.inputSchema,
				),
			);
			if (supportsProgress) {
				console.log(`Tool '${tool.name}' will support progress tracking`);
			}
		}

		return tools;
	}

	/**
	 * Executes a tool with retry logic and progress tracking.
	 *
	 * Calls the specified tool on the MCP server with provided arguments.
	 * Implements automatic retry on failure with configurable delay.
	 * Supports progress tracking if the server and tool capabilities allow.
	 *
	 * @param toolName - Name of the tool to execute
	 * @param args - Arguments to pass to the tool
	 * @param retries - Number of retry attempts on failure (default: 2)
	 * @param delay - Delay in milliseconds between retries (default: 1000)
	 * @returns Promise resolving to tool execution result
	 * @throws Error if server is not initialized or all retries fail
	 */
	async executeTool(
		toolName: string,
		args: Record<string, unknown>,
		retries: number = 2,
		delay: number = 1000,
	): Promise<CallToolResult> {
		if (!this.client) {
			throw new Error(`Server ${this.name} not initialized`);
		}

		let attempt = 0;
		while (attempt < retries) {
			try {
				const supportsProgress = this.capabilities?.progress === true;

				if (supportsProgress) {
					console.log(`Executing ${toolName} with progress tracking...`);
				} else {
					console.log(`Executing ${toolName}...`);
				}

				const result = await this.client.callTool(
					{
						name: toolName,
						arguments: args,
					},
					undefined,
					{ timeout: 3000000 },
				);

				// Ensure result has content property as required by CallToolResult
				if (!result.content) {
					return {
						content: [],
						isError: false,
					} as CallToolResult;
				}

				return result as CallToolResult;
			} catch (error) {
				attempt++;
				console.warn(
					`Error executing tool: ${error}. Attempt ${attempt} of ${retries}.`,
				);
				if (attempt < retries) {
					console.log(`Retrying in ${delay / 1000} seconds...`);
					await new Promise((resolve) => setTimeout(resolve, delay));
				} else {
					console.error("Max retries reached. Failing.");
					throw error;
				}
			}
		}

		throw new Error("Failed to execute tool");
	}

	/**
	 * Cleans up server connections and resources.
	 *
	 * Properly closes the MCP client connection and stdio transport.
	 * Should be called when the server is no longer needed to prevent
	 * resource leaks and ensure clean shutdown.
	 *
	 * @returns Promise that resolves when cleanup is complete
	 */
	async cleanup(): Promise<void> {
		try {
			if (this.client) {
				try {
					await this.client.close();
				} catch (error) {
					console.warn(
						`Warning during client cleanup for ${this.name}:`,
						error,
					);
				} finally {
					this.client = null;
				}
			}

			if (this.transport) {
				try {
					await this.transport.close();
				} catch (error) {
					console.info(
						`Note: Normal shutdown message for ${this.name}:`,
						error,
					);
				} finally {
					this.transport = null;
				}
			}
		} catch (error) {
			console.error(`Error during cleanup of server ${this.name}:`, error);
		}
	}
}
