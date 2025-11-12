/**
 * MCP Terminal Client - Main Entry Point
 *
 * A modular terminal client for Model Context Protocol (MCP) servers
 * with support for tools, prompts, resources, and LLM integration.
 */

import { resolve } from "path";
import { Configuration } from "./core/config.js";
import { LLMClient } from "./core/llmClient.js";
import { McpServer } from "./core/mcpServer.js";
import { ChatSession } from "./session/chatSession.js";

/**
 * Main entry point for the MCP Terminal Client.
 *
 * Initializes the application by loading configuration, creating MCP server
 * instances, setting up the LLM client, and starting the interactive chat session.
 * This function orchestrates the complete application lifecycle from startup
 * to shutdown, including proper error handling and cleanup.
 *
 * @returns Promise that resolves when the application exits
 * @throws Error if configuration loading fails or servers cannot be initialized
 */
async function main(): Promise<void> {
	try {
		const config = new Configuration();
		const configPath = resolve(process.cwd(), "servers_config.json");
		const serverConfig = await Configuration.loadConfig(configPath);

		const servers = Object.entries(serverConfig.mcpServers).map(
			([name, config]) => new McpServer(name, config),
		);

		const llmClient = new LLMClient(config);
		const chatSession = new ChatSession(servers, llmClient);

		await chatSession.start();
	} catch (error) {
		console.error("Fatal error:", error);
		process.exit(1);
	}
}

main();
