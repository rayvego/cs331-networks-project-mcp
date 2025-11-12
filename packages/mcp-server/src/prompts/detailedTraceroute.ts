import * as z from "zod";

export const detailedTraceroutePrompt = {
	name: "network/detailedTraceroute",
	definition: {
		title: "Detailed Geographic Traceroute",
		description:
			"Enriches traceroute output with reverse DNS lookups and geographic/ownership information for each hop.",
		argsSchema: {
			host: z
				.string()
				.describe(
					"The destination host name or IP address to trace with geographic enrichment (required)",
				),
		},
	},
	/**
	 * Generates a structured workflow for detailed geographic traceroute analysis.
	 *
	 * Creates a comprehensive prompt that guides an LLM through a multi-step process:
	 * 1. Execute traceroute to get network path
	 * 2. Extract IP addresses from each hop
	 * 3. Perform reverse DNS lookup for each IP
	 * 4. Get geographic/ISP information for each IP
	 * 5. Synthesize results into a detailed report
	 *
	 * This prompt enables automated network path analysis with geographic enrichment,
	 * providing insights into routing, ISPs, and geographic distribution of network hops.
	 *
	 * @param params - Prompt arguments
	 * @param params.host - Target host name or IP address for traceroute analysis
	 * @returns MCP prompt response with structured workflow instructions for the LLM
	 */
	handler: async ({ host }: Record<string, unknown>) => ({
		messages: [
			{
				role: "user",
				content: {
					type: "text",
					text: `You are a network analysis assistant. The user wants a detailed traceroute including geographic and ownership information.

First, call the network-traceroute tool with the host provided by the user.

When you receive the traceroute result, iterate through the hops array. For each hop, extract the ip address.

For each ip address you extracted:

a. Call the network-geoiplookup tool with the IP address.

b. Call the network-dnsLookup tool using the reverseLookup parameter with the IP address as its value.

After you have collected all the results, synthesize a final report. The report should be a list where each item represents a hop and includes: the hop number, IP address, RTT, the reverse DNS name (from dnsLookup), and the city, country, and ISP/owner (from geoiplookup).

Host to analyze: ${host}`,
				},
			},
		],
	}),
};

