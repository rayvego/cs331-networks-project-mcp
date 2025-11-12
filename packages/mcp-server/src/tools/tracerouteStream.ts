import * as z from "zod";
import { streamCommand } from "../lib/stream.js";

export const tracerouteStreamTool = {
	name: "network-traceroute",
	definition: {
		title: "Network Traceroute Tool (Streaming)",
		description:
			"Trace the route packets take to a network host with real-time streaming updates via SSE",
		inputSchema: {
			host: z
				.string()
				.describe(
					"The destination host name or IP address to trace the route to (required)",
				),
			sessionId: z
				.string()
				.optional()
				.describe(
					"Unique session ID for SSE streaming connection (optional - will be auto-generated if not provided)",
				),
			packetSize: z
				.number()
				.optional()
				.describe(
					"The size of the probe packets in bytes. Default is 40 bytes",
				),
			firstTtl: z
				.number()
				.optional()
				.describe(
					"Set the initial time-to-live used in the first outgoing probe packet. Default is 1",
				),
			maxTtl: z
				.number()
				.optional()
				.describe(
					"Set the max time-to-live (max number of hops) used in outgoing probe packets. Default is net.inet.ip.ttl hops",
				),
			interface: z
				.string()
				.optional()
				.describe(
					"Specify a network interface to obtain the source IP address for outgoing probe packets",
				),
			sourceAddress: z
				.string()
				.optional()
				.describe(
					"Use the following IP address as the source address in outgoing probe packets",
				),
			port: z
				.number()
				.optional()
				.describe(
					"Protocol specific. For UDP and TCP, sets the base port number used in probes. Default is 33434",
				),
			queries: z
				.number()
				.optional()
				.describe(
					"Set the number of probes per TTL to nqueries. Default is 3 probes",
				),
			waitTime: z
				.number()
				.optional()
				.describe(
					"Set the time (in seconds) to wait for a response to a probe. Default is 5 seconds",
				),
			pauseMsecs: z
				.number()
				.optional()
				.describe(
					"Set the time (in milliseconds) to pause between probes. Default is 0",
				),
			protocol: z
				.string()
				.optional()
				.describe(
					"Use raw packet of specified protocol for tracerouting. Default protocol is 253 (rfc3692)",
				),
			ipv4Only: z.boolean().optional().describe("Explicitly force IPv4 tracerouting"),
			ipv6Only: z.boolean().optional().describe("Explicitly force IPv6 tracerouting"),
			flowLabel: z
				.string()
				.optional()
				.describe("Use specified flow_label for IPv6 packets"),
			tos: z
				.number()
				.optional()
				.describe(
					"Set the type-of-service in probe packets. Value must be decimal integer in range 0-255",
				),
			gateway: z
				.string()
				.optional()
				.describe("Specify a loose source route gateway (maximum 8)"),
			asLookup: z
				.boolean()
				.optional()
				.describe("Turn on AS# lookups for each hop encountered"),
			debugSocket: z
				.boolean()
				.optional()
				.describe("Enable socket level debugging"),
			dontFragment: z
				.boolean()
				.optional()
				.describe("Set the 'don't fragment' bit"),
			ecnDetect: z
				.boolean()
				.optional()
				.describe(
					"Detect ECN bleaching. Set the IPTOS_ECN_ECT1 bit and report if that value has been bleached or mangled",
				),
			firewallEvasion: z
				.boolean()
				.optional()
				.describe(
					"Firewall evasion mode. Use fixed destination ports for UDP and TCP probes",
				),
			icmpEcho: z
				.boolean()
				.optional()
				.describe("Use ICMP ECHO instead of UDP datagrams"),
			noNameResolution: z
				.boolean()
				.optional()
				.describe("Print hop addresses numerically rather than symbolically"),
			verbose: z
				.boolean()
				.optional()
				.describe(
					"Verbose output. Received ICMP packets other than TIME_EXCEEDED and UNREACHABLEs are listed",
				),
			quiet: z
				.boolean()
				.optional()
				.describe("Quiet output. Don't print probing packets"),
			bypassRouting: z
				.boolean()
				.optional()
				.describe(
					"Bypass the normal routing tables and send directly to a host on an attached network",
				),
			summary: z
				.boolean()
				.optional()
				.describe(
					"Print a summary of how many probes were not answered for each hop",
				),
			tcpChecksum: z.boolean().optional().describe("Toggle IP checksums"),
			extensions: z
				.boolean()
				.optional()
				.describe("Show ICMP extensions (rfc4884)"),
			mtuDiscovery: z
				.boolean()
				.optional()
				.describe("Discover MTU along the path being traced. Implies dontFragment and single probe per hop"),
			sourcePort: z
				.number()
				.optional()
				.describe("Choose the source port to use"),
		},
	},
	/**
	 * Executes traceroute command with real-time streaming output via SSE.
	 *
	 * Runs the system traceroute utility to trace network paths with comprehensive
	 * routing options and streams live hop-by-hop results to the client via
	 * Server-Sent Events. Supports custom packet sizes, TTL ranges, interface
	 * binding, and various traceroute algorithms.
	 *
	 * @param params - Traceroute command parameters
	 * @param params.host - Target host name or IP address to trace route to
	 * @param params.sessionId - SSE session ID for streaming (auto-generated if not provided)
	 * @param params.packetSize - Size of probe packets in bytes
	 * @param params.firstTtl - Initial time-to-live for first probe
	 * @param params.maxTtl - Maximum time-to-live (maximum hops)
	 * @param params.interface - Network interface to use for probes
	 * @param params.sourceAddress - Source IP address for probe packets
	 * @param elicitationRequest - Function to request user approval for traceroute execution
	 * @returns Promise resolving to traceroute results with hop information and timing
	 * @throws Error if user declines approval or traceroute command fails
	 */
	handler: async (
		{
			host,
			sessionId,
			packetSize,
			firstTtl,
			maxTtl,
			interface: iface,
			sourceAddress,
			port,
			queries,
			waitTime,
			pauseMsecs,
			protocol,
			tos,
			gateway,
			asLookup,
			debugSocket,
			dontFragment,
			ecnDetect,
			firewallEvasion,
			icmpEcho,
			noNameResolution,
			verbose,
			quiet,
			bypassRouting,
			summary,
			tcpChecksum,
			extensions,
			mtuDiscovery,
			sourcePort,
			ipv4Only,
			ipv6Only,
			flowLabel,
		}: Record<string, unknown>,
		elicitationRequest: (
			message: string,
			schema: object,
		) => Promise<{
			action: "accept" | "decline" | "cancel";
			content?: { approved?: boolean };
		}>,
	) => {
		// Build traceroute command arguments
		const args: string[] = [];

		// Add flags
		if (ipv4Only) args.push("-4");
		if (ipv6Only) args.push("-6");
		if (asLookup) args.push("-A");
		if (debugSocket) args.push("-d");
		if (extensions) args.push("-e");
		if (dontFragment) args.push("-F");
		if (icmpEcho) args.push("-I");
		if (mtuDiscovery) args.push("--mtu");
		if (noNameResolution) args.push("-n");
		if (bypassRouting) args.push("-r");
		if (verbose) args.push("-v");
		if (summary) args.push("-S");

		// Add options with values
		if (firstTtl) args.push("-f", (firstTtl as number).toString());
		if (gateway) args.push("-g", gateway as string);
		if (iface) args.push("-i", iface as string);
		if (firstTtl) args.push("-M", (firstTtl as number).toString());
		if (maxTtl) args.push("-m", (maxTtl as number).toString());
		if (protocol) args.push("-P", protocol as string);
		if (port) args.push("-p", (port as number).toString());
		if (queries) args.push("-q", (queries as number).toString());
		if (sourceAddress) args.push("-s", sourceAddress as string);
		if (tos) args.push("-t", (tos as number).toString());
		if (waitTime) args.push("-w", (waitTime as number).toString());
		if (pauseMsecs) args.push("-z", (pauseMsecs as number).toString());
		if (flowLabel) args.push("-l", flowLabel as string);
		if (sourcePort) args.push("--sport", (sourcePort as number).toString());

		// Add host and optional packet size
		args.push(host as string);
		if (packetSize) args.push((packetSize as number).toString());

		// Generate sessionId if not provided
		let actualSessionId = sessionId as string;
		if (!actualSessionId) {
			actualSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		}

		// Build command string for display
		const commandString = `traceroute ${args.join(" ")}`;

		return streamCommand({
			tool: "traceroute",
			args,
			commandString,
			sessionId: actualSessionId,
			startEventType: "traceroute_start",
			outputEventType: "traceroute_output",
			completeEventType: "traceroute_complete",
			errorEventType: "traceroute_error",
			cancelledEventType: "traceroute_cancelled",
			elicitationRequest,
		});
	},
};
