import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { app, SSE_PORT } from "./lib/sse.js";
import { mcpServer } from "./server.js";

/**
 * Main entry point for the MCP Server.
 *
 * Initializes and starts both the MCP stdio server for tool and prompt handling,
 * and the SSE (Server-Sent Events) server for real-time streaming output.
 * The server provides network diagnostic tools (ping, traceroute, DNS lookup)
 * and manages streaming connections for long-running operations.
 *
 * @returns Promise that resolves when server initialization is complete
 * @throws Error if server startup fails
 */
async function main() {
	// Start SSE server
	app.listen(SSE_PORT, () => {
		console.error(`SSE server listening on port ${SSE_PORT}`);
	});

	// Start MCP server
	const transport = new StdioServerTransport();
	await mcpServer.connect(transport);
}

main().catch((error) => {
	console.error("Fatal error in main():", error);
	process.exit(1);
});
