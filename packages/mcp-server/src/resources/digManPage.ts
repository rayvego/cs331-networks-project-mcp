import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const digManPageResource = {
	name: "man-dig",
	resourceUri: "man://dig",
	definition: {
		title: "dig Manual Page",
		description: "DNS lookup utility manual page",
		mimeType: "text/plain",
	},
	/**
	 * Serves the dig command manual page content.
	 *
	 * Retrieves and returns the complete manual page for the DNS lookup utility
	 * from the local filesystem. This provides comprehensive documentation for
	 * the dig command options, usage, and behavior that users can reference
	 * when working with DNS queries.
	 *
	 * @param uri - The MCP resource URI being requested (man://dig)
	 * @returns MCP resource response containing the dig manual page text
	 */
	handler: async (uri: { href: string }) => ({
		contents: [
			{
				uri: uri.href,
				text: fs.readFileSync(
					path.join(__dirname, "../man/linux/dig.txt"),
					"utf-8",
				),
			},
		],
	}),
};
