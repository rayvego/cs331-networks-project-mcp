import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

// Import tools
import { dnsLookupTool } from "./tools/dnsLookup.js";
import { geoIPLookupTool } from "./tools/geoIPLookup.js";
import { pingStreamTool } from "./tools/pingStream.js";
import { tracerouteStreamTool } from "./tools/tracerouteStream.js";

// Import prompts
import { detailedTraceroutePrompt } from "./prompts/detailedTraceroute.js";
import { verifyTraceroutePrompt } from "./prompts/verifyTraceroute.js";

// Import resources
import { digManPageResource } from "./resources/digManPage.js";
import { pingManPageResource } from "./resources/pingManPage.js";
import { tracerouteManPageResource } from "./resources/tracerouteManPage.js";

// Create and configure MCP server
const mcpServer = new McpServer({
	name: "network-diagnostics",
	version: "1.0.0",
	capabilities: {
		resources: {
			listChanged: true,
		},
		tools: {
			listChanged: true,
		},
		prompts: {
			listChanged: true,
		},
		elicitation: {},
	},
});

// Register all tools
const tools = [
	dnsLookupTool,
	geoIPLookupTool,
	pingStreamTool,
	tracerouteStreamTool,
];

for (const tool of tools) {
	mcpServer.registerTool(tool.name, tool.definition, async (params) => {
		// Create the elicitation request function that will be passed to handlers
		const elicitationRequest = async (
			message: string,
			schema: object,
		): Promise<{ action: "accept" | "decline" | "cancel"; content?: { approved?: boolean } }> => {
			const response = await mcpServer.server.request(
				{
					method: "elicitation/create",
					params: {
						message,
						requestedSchema: schema,
					},
				},
				z.object({
					action: z.enum(["accept", "decline", "cancel"]),
					content: z
						.object({
							approved: z.boolean().optional(),
						})
						.optional(),
				}),
			);
			return response;
		};

		return tool.handler(params, elicitationRequest);
	});
}

// Register all prompts
const prompts = [verifyTraceroutePrompt, detailedTraceroutePrompt];

for (const prompt of prompts) {
	mcpServer.registerPrompt(prompt.name, prompt.definition, prompt.handler);
}

// Register all resources
const resources = [
	digManPageResource,
	pingManPageResource,
	tracerouteManPageResource,
];

for (const resource of resources) {
	mcpServer.registerResource(
		resource.name,
		resource.resourceUri,
		resource.definition,
		resource.handler,
	);
}

export { mcpServer };

