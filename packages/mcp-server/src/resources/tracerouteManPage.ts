import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const tracerouteManPageResource = {
	name: "man-traceroute",
	resourceUri: "man://traceroute",
	definition: {
		title: "traceroute Manual Page",
		description: "Trace the route packets take to a network host manual page",
		mimeType: "text/plain",
	},
	/**
	 * Serves the traceroute command manual page content.
	 *
	 * Retrieves and returns the complete manual page for the network traceroute utility
	 * from the local filesystem. This provides comprehensive documentation for the
	 * traceroute command options, routing algorithms, and network path tracing
	 * capabilities that users can reference when analyzing network routes.
	 *
	 * @param uri - The MCP resource URI being requested (man://traceroute)
	 * @returns MCP resource response containing the traceroute manual page text
	 */
	handler: async (uri: { href: string }) => ({
		contents: [
			{
				uri: uri.href,
				text: fs.readFileSync(
					path.join(__dirname, "../man/linux/traceroute.txt"),
					"utf-8",
				),
			},
		],
	}),
};

