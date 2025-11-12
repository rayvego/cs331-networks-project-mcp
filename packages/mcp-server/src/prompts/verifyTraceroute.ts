import * as z from "zod";

export const verifyTraceroutePrompt = {
	name: "network/verifyTraceroute",
	definition: {
		title: "Verify Traceroute with Ping",
		description:
			"Guide an LLM to verify traceroute results by pinging each hop",
		argsSchema: {
			host: z
				.string()
				.describe(
					"The destination host name or IP address to trace and verify (required)",
				),
		},
	},
	/**
	 * Generates a structured workflow for traceroute verification using ping.
	 *
	 * Creates a comprehensive prompt that guides an LLM through systematic network
	 * diagnostics: execute traceroute, extract all hop IP addresses, ping each hop
	 * individually, and generate comparative analysis of routing vs. connectivity.
	 * Ensures complete coverage by requiring ping of every single hop in sequence.
	 *
	 * This prompt enables automated verification of network paths, identifying
	 * routing issues, packet loss, and latency problems at each network hop.
	 * Critical for network troubleshooting and performance analysis.
	 *
	 * @param params - Prompt arguments
	 * @param params.host - Target host name or IP address for traceroute verification
	 * @returns MCP prompt response with systematic verification workflow for the LLM
	 */
	handler: async ({ host }: Record<string, unknown>) => ({
		messages: [
			{
				role: "user",
				content: {
					type: "text",
					text: `You are a network diagnostics assistant performing a traceroute verification workflow. Follow these steps EXACTLY:

STEP 1: Execute traceroute
|- Call the network-traceroute tool with host: "${host}"
|- Wait for the complete result

STEP 2: Process ALL hops from the traceroute result
|- Look at the JSON result and find the "hops" array
|- Count the TOTAL number of hops in the array
|- You MUST ping EVERY SINGLE hop - do not skip any

STEP 3: Ping each hop ONE BY ONE
|- For EACH hop in the hops array (from first to last):
  * Extract the "ip" field from that hop
  * If the ip is present and not null, call network-ping tool with:
    - host: <the ip address>
    - count: 3
  * Wait for the ping result before moving to the next hop
  * If a hop has no IP (shows as * * *), note it and move to the next hop
|- Continue this process until you have pinged ALL hops in the array

STEP 4: Create a comprehensive summary
|- Create a table comparing each hop:
  * Hop number
  * IP address
  * Traceroute RTT (from the traceroute result)
  * Ping average RTT (from the ping statistics)
  * Difference and any notable issues
|- Highlight any significant RTT differences (>20ms variance)
|- Note any packet loss or unreachable hops

CRITICAL OUTPUT RULES:
|- You MUST process ALL hops - do not stop after 3 hops or any arbitrary number
|- Ping each hop INDIVIDUALLY and ONE AT A TIME
|- Do not summarize or skip hops
|- If there are 15 hops, you must ping all 15
|- If there are 30 hops, you must ping all 30
|- DO NOT output any explanatory text or commentary
|- ONLY output JSON tool calls - no other text
|- Execute all commands sequentially without intermediate explanations

Host to verify: ${host}`,
				},
			},
		],
	}),
};
