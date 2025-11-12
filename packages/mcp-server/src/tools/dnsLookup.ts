import * as z from "zod";
import { executeCommand } from "../lib/command.js";

export const dnsLookupTool = {
	name: "network-dnsLookup",
	definition: {
		title: "DNS Lookup Tool",
		description: "Perform DNS lookups using the dig command",
		inputSchema: {
			domain: z.string().describe("The domain name to query (required)"),
			type: z
				.string()
				.optional()
				.describe(
					"The resource record type to query (e.g., A, MX, NS, TXT, CNAME, PTR, SOA, SRV, TXT, AAAA). Defaults to A if not specified",
				),
			server: z
				.string()
				.optional()
				.describe(
					"The name or IP address of the name server to query. If not specified, uses system default",
				),
			class: z
				.string()
				.optional()
				.describe(
					"The query class (IN for Internet, CH for Chaos, HS for Hesiod). Defaults to IN",
				),
			port: z
				.number()
				.optional()
				.describe(
					"Send the query to a non-standard port number. Default is 53",
				),
			sourceAddress: z
				.string()
				.optional()
				.describe(
					"Set the source IP address of the query. Must be a valid address on one of the host's network interfaces",
				),
			reverseLookup: z
				.string()
				.optional()
				.describe(
					"Simplified reverse lookup - specify an IPv4 or IPv6 address to look up. When used, domain and type are ignored",
				),
			ipv4Only: z.boolean().optional().describe("Use IPv4 only"),
			ipv6Only: z.boolean().optional().describe("Use IPv6 only"),
			useTcp: z
				.boolean()
				.optional()
				.describe("Use TCP instead of UDP when querying name servers"),
			timeout: z
				.number()
				.optional()
				.describe(
					"Sets the timeout for a query in seconds. Default is 5 seconds",
				),
			retries: z
				.number()
				.optional()
				.describe(
					"Sets the number of times to retry UDP queries. Default is 2",
				),
			noRecursion: z
				.boolean()
				.optional()
				.describe("Set to true to disable recursion (RD bit set to false)"),
			dnssec: z
				.boolean()
				.optional()
				.describe(
					"Requests DNSSEC records be sent by setting the DNSSEC OK bit",
				),
			short: z
				.boolean()
				.optional()
				.describe("Provide a terse answer with only the answer section"),
			trace: z
				.boolean()
				.optional()
				.describe("Toggle tracing of the delegation path from root servers"),
			identify: z
				.boolean()
				.optional()
				.describe("Show the IP address and port of responding servers"),
			comments: z
				.boolean()
				.optional()
				.describe("Control display of comment lines in output"),
			stats: z.boolean().optional().describe("Display query statistics"),
			question: z
				.boolean()
				.optional()
				.describe("Display the question section of the query"),
			answer: z
				.boolean()
				.optional()
				.describe("Display the answer section of the reply"),
			authority: z
				.boolean()
				.optional()
				.describe("Display the authority section of the reply"),
			additional: z
				.boolean()
				.optional()
				.describe("Display the additional section of the reply"),
		},
	},
	/**
	 * Executes DNS lookup using the dig command.
	 *
	 * Performs DNS queries using the system's dig utility with comprehensive options
	 * for record types, servers, timeouts, and output formatting. Supports both
	 * forward and reverse DNS lookups with user approval via elicitation.
	 *
	 * @param params - DNS lookup parameters including domain, type, server, etc.
	 * @param params.domain - The domain name to query (required for forward lookups)
	 * @param params.type - DNS record type (A, MX, NS, TXT, CNAME, PTR, etc.)
	 * @param params.server - DNS server to query (@server format)
	 * @param params.reverseLookup - IP address for reverse lookup (-x option)
	 * @param params.timeout - Query timeout in seconds
	 * @param params.retries - Number of retry attempts
	 * @param elicitationRequest - Function to request user approval for the operation
	 * @returns Promise resolving to DNS query results in JSON format
	 * @throws Error if user declines approval or command execution fails
	 */
	handler: async (
		{
			domain,
			type,
			server,
			class: queryClass,
			port,
			sourceAddress,
			reverseLookup,
			ipv4Only,
			ipv6Only,
			useTcp,
			timeout,
			retries,
			noRecursion,
			dnssec,
			short,
			trace,
			identify,
			comments,
			stats,
			question,
			answer,
			authority,
			additional,
		}: Record<string, unknown>,
		elicitationRequest: (
			message: string,
			schema: object,
		) => Promise<{ action: "accept" | "decline" | "cancel"; content?: { approved?: boolean } }>,
	) => {
		// Build dig command arguments
		const args: string[] = [];

		// Handle reverse lookup (-x option)
		if (reverseLookup) {
			args.push("-x", reverseLookup as string);
		} else {
			// Regular lookup
			if (server) args.push(`@${server}`);
			if (sourceAddress) args.push("-b", sourceAddress as string);
			if (queryClass) args.push("-c", queryClass as string);
			if (port) args.push("-p", (port as number).toString());
			if (ipv4Only) args.push("-4");
			if (ipv6Only) args.push("-6");
			if (useTcp) args.push("+tcp");
			if (timeout) args.push(`+time=${timeout}`);
			if (retries !== undefined) args.push(`+retry=${retries}`);
			if (noRecursion) args.push("+norecurse");
			if (dnssec) args.push("+dnssec");
			if (short) args.push("+short");
			if (trace) args.push("+trace");
			if (identify) args.push("+identify");
			if (comments === false) args.push("+nocomments");
			if (stats === false) args.push("+nostats");
			if (question === false) args.push("+noquestion");
			if (answer === false) args.push("+noanswer");
			if (authority === false) args.push("+noauthority");
			if (additional === false) args.push("+noadditional");
			if (type) args.push("-t", type as string);
			args.push(domain as string);
		}

		// Build command string for display
		const commandString = `dig ${args.join(" ")}`;

		return executeCommand({
			tool: "dig",
			args,
			commandString,
			elicitationRequest,
		});
	},
};

