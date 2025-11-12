import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pingManPageResource = {
	name: "man-ping",
	resourceUri: "man://ping",
	definition: {
		title: "ping Manual Page",
		description: "Send ICMP ECHO_REQUEST packets to network hosts manual page",
		mimeType: "text/plain",
	},
	/**
	 * Serves the ping command manual page content.
	 *
	 * Retrieves and returns the complete manual page for the network ping utility
	 * from the local filesystem. This provides detailed documentation for the
	 * ping command parameters, options, and diagnostic capabilities that users
	 * can reference when performing network connectivity testing.
	 *
	 * @param uri - The MCP resource URI being requested (man://ping)
	 * @returns MCP resource response containing the ping manual page text
	 */
	handler: async (uri: { href: string }) => ({
		contents: [
			{
				uri: uri.href,
				text: fs.readFileSync(
					path.join(__dirname, "../man/linux/ping.txt"),
					"utf-8",
				),
			},
		],
	}),
};
