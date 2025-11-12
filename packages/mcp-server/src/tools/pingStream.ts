import * as z from "zod";
import { streamCommand } from "../lib/stream.js";

export const pingStreamTool = {
	name: "network-ping",
	definition: {
		title: "Network Ping Tool (Streaming)",
		description:
			"Send ICMP ECHO_REQUEST packets to network hosts with real-time streaming updates via SSE.",
		inputSchema: {
			host: z
				.string()
				.describe("The destination host name or IP address to ping (required)"),
			sessionId: z
				.string()
				.optional()
				.describe(
					"Unique session ID for SSE streaming connection (optional - will be auto-generated if not provided)",
				),
			count: z
				.number()
				.describe(
					"Stop after sending count ECHO_RESPONSE packets. If not specified, ping operates until interrupted",
				),
			packetSize: z
				.number()
				.optional()
				.describe(
					"Specify the number of data bytes to be sent. Default is 56, which translates into 64 ICMP data bytes",
				),
			ttl: z
				.number()
				.optional()
				.describe(
					"Set the IP Time To Live for outgoing packets. If not specified, uses net.inet.ip.ttl MIB variable",
				),
			timeout: z
				.number()
				.optional()
				.describe(
					"Specify a timeout in seconds before ping exits regardless of how many packets have been received",
				),
			waitTime: z
				.number()
				.optional()
				.describe(
					"Wait wait seconds between sending each packet. Default is to wait for one second between each packet",
				),
			waitTimeMs: z
				.number()
				.optional()
				.describe(
					"Time in milliseconds to wait for a reply for each packet sent",
				),
			sourceAddress: z
				.string()
				.optional()
				.describe(
					"Use the following IP address as the source address in outgoing packets",
				),
			interface: z
				.string()
				.optional()
				.describe(
					"Set source address to specified interface address. Argument may be numeric IP address or name of device",
				),
			pattern: z
				.string()
				.optional()
				.describe(
					"Specify up to 16 'pad' bytes to fill out the packet (hex format, e.g., 'ff' for all ones)",
				),
			tos: z.number().optional().describe("Use the specified type of service"),
			flowLabel: z
				.string()
				.optional()
				.describe(
					"Allocate and set 20 bit flow label on echo request packets (only with IPv6)",
				),
			preload: z
				.number()
				.optional()
				.describe(
					"Send that many packets as fast as possible before falling into normal mode of behavior",
				),
			sweepMinSize: z
				.number()
				.optional()
				.describe(
					"Specify the size of ICMP payload to start with when sending sweeping pings. Default is 0",
				),
			sweepMaxSize: z
				.number()
				.optional()
				.describe(
					"Specify the maximum size of ICMP payload when sending sweeping pings. Required for ping sweeps",
				),
			sweepIncrement: z
				.number()
				.optional()
				.describe(
					"Specify the number of bytes to increment the size of ICMP payload after each sweep. Default is 1",
				),
			audible: z
				.boolean()
				.optional()
				.describe(
					"Include a bell (ASCII 0x07) character in the output when any packet is received",
				),
			audibleOnLoss: z
				.boolean()
				.optional()
				.describe(
					"Output a bell character when no packet is received before the next packet is transmitted",
				),
			dontFragment: z
				.boolean()
				.optional()
				.describe("Set the Don't Fragment bit"),
			flood: z
				.boolean()
				.optional()
				.describe(
					"Flood ping. Outputs packets as fast as they come back or 100 times per second",
				),
			numericOnly: z
				.boolean()
				.optional()
				.describe(
					"Numeric output only. No attempt will be made to lookup symbolic names for host addresses",
				),
			quiet: z
				.boolean()
				.optional()
				.describe(
					"Quiet output. Nothing is displayed except summary lines at startup and when finished",
				),
			quiteErrors: z
				.boolean()
				.optional()
				.describe(
					"Somewhat quiet output. Don't display ICMP error messages that are in response to our query messages",
				),
			recordRoute: z
				.boolean()
				.optional()
				.describe(
					"Record route. Includes the RECORD_ROUTE option in the ECHO_REQUEST packet",
				),
			bypassRouting: z
				.boolean()
				.optional()
				.describe(
					"Bypass the normal routing tables and send directly to a host on an attached network",
				),
			verbose: z
				.boolean()
				.optional()
				.describe(
					"Verbose output. ICMP packets other than ECHO_RESPONSE that are received are listed",
				),
			suppressLoopback: z
				.boolean()
				.optional()
				.describe(
					"Suppress loopback of multicast packets. Only applies if destination is a multicast address",
				),
			useTimestamps: z
				.boolean()
				.optional()
				.describe("Use ICMP_MASKREQ or ICMP_TSTAMP instead of ICMP_ECHO"),
			ipv4Only: z.boolean().optional().describe("Use IPv4 only"),
			ipv6Only: z.boolean().optional().describe("Use IPv6 only"),
			adaptive: z
				.boolean()
				.optional()
				.describe(
					"Adaptive ping. Interpacket interval adapts to round-trip time, so that not more than one unanswered probe is present in the network",
				),
			broadcast: z
				.boolean()
				.optional()
				.describe("Allow pinging a broadcast address"),
			bindSource: z
				.boolean()
				.optional()
				.describe(
					"Do not allow ping to change source address of probes. The address is bound to one selected when ping starts",
				),
			timestamp: z
				.boolean()
				.optional()
				.describe(
					"Print timestamp (unix time + microseconds) before each line",
				),
			debug: z
				.boolean()
				.optional()
				.describe("Set the SO_DEBUG option on the socket being used"),
			oneReply: z
				.boolean()
				.optional()
				.describe("Exit successfully after receiving one reply packet"),
		},
	},
	/**
	 * Executes ping command with real-time streaming output via SSE.
	 *
	 * Runs the system ping utility with comprehensive networking options and streams
	 * live output to the client via Server-Sent Events. Supports various ping modes
	 * including flood ping, custom packet sizes, TTL settings, and interface binding.
	 * Requires user approval before execution.
	 *
	 * @param params - Ping command parameters
	 * @param params.host - Target host name or IP address to ping
	 * @param params.sessionId - SSE session ID for streaming (auto-generated if not provided)
	 * @param params.count - Number of ping packets to send
	 * @param params.packetSize - Size of ping packets in bytes
	 * @param params.ttl - Time-to-live for ping packets
	 * @param params.timeout - Timeout before ping exits
	 * @param params.waitTime - Seconds between ping packets
	 * @param params.sourceAddress - Source IP address for ping packets
	 * @param elicitationRequest - Function to request user approval for ping execution
	 * @returns Promise resolving to ping results with statistics and timing data
	 * @throws Error if user declines approval or ping command fails
	 */
	handler: async (
		{
			host,
			sessionId,
			count,
			packetSize,
			ttl,
			timeout,
			waitTime,
			waitTimeMs,
			sourceAddress,
			interface: iface,
			pattern,
			tos,
			flowLabel,
			preload,
			sweepMinSize,
			sweepMaxSize,
			sweepIncrement,
			audible,
			audibleOnLoss,
			dontFragment,
			flood,
			numericOnly,
			quiet,
			quiteErrors,
			recordRoute,
			bypassRouting,
			verbose,
			suppressLoopback,
			useTimestamps,
			ipv4Only,
			ipv6Only,
			adaptive,
			broadcast,
			bindSource,
			timestamp,
			debug,
			oneReply,
		}: Record<string, unknown>,
		elicitationRequest: (
			message: string,
			schema: object,
		) => Promise<{
			action: "accept" | "decline" | "cancel";
			content?: { approved?: boolean };
		}>,
	) => {
		// Build ping command arguments
		const args: string[] = [];

		// Add flags
		if (ipv4Only) args.push("-4");
		if (ipv6Only) args.push("-6");
		if (audible) args.push("-a");
		if (adaptive) args.push("-A");
		if (bindSource) args.push("-B");
		if (broadcast) args.push("-b");
		if (timestamp) args.push("-D");
		if (debug) args.push("-d");
		if (dontFragment) args.push("-F");
		if (flood) args.push("-f");
		if (numericOnly) args.push("-n");
		if (oneReply) args.push("-o");
		if (quiteErrors) args.push("-O");
		if (quiet) args.push("-q");
		if (recordRoute) args.push("-R");
		if (bypassRouting) args.push("-r");
		if (verbose) args.push("-v");
		if (suppressLoopback) args.push("-L");

		// Add options with values
		if (count) args.push("-c", (count as number).toString());
		if (sweepMaxSize) args.push("-G", (sweepMaxSize as number).toString());
		if (sweepMinSize) args.push("-g", (sweepMinSize as number).toString());
		if (sweepIncrement) args.push("-h", (sweepIncrement as number).toString());
		if (waitTime) args.push("-i", (waitTime as number).toString());
		if (flowLabel) args.push("-F", flowLabel as string);
		if (preload) args.push("-l", (preload as number).toString());
		if (useTimestamps) args.push("-M", "time");
		if (ttl) args.push("-m", (ttl as number).toString());
		if (pattern) args.push("-p", pattern as string);
		if (iface) args.push("-I", iface as string);
		if (sourceAddress) args.push("-S", sourceAddress as string);
		if (packetSize) args.push("-s", (packetSize as number).toString());
		if (timeout) args.push("-t", (timeout as number).toString());
		if (waitTimeMs) args.push("-W", (waitTimeMs as number).toString());
		if (tos) args.push("-Q", (tos as number).toString());

		// Add host
		args.push(host as string);

		// Generate sessionId if not provided
		let actualSessionId = sessionId as string;
		if (!actualSessionId) {
			actualSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		}

		// Build command string for display
		const commandString = `ping ${args.join(" ")}`;

		return streamCommand({
			tool: "ping",
			args,
			commandString,
			sessionId: actualSessionId,
			startEventType: "ping_start",
			outputEventType: "ping_output",
			completeEventType: "ping_complete",
			errorEventType: "ping_error",
			cancelledEventType: "ping_cancelled",
			elicitationRequest,
		});
	},
};
