/**
 * Tool information and formatting
 */

export class ToolInfo {
	/**
	 * Creates a new ToolInfo instance.
	 *
	 * Wraps MCP tool information with additional formatting capabilities
	 * for consistent presentation to users and LLMs.
	 *
	 * @param name - The tool's unique identifier name
	 * @param description - Human-readable description of the tool's function
	 * @param inputSchema - JSON schema defining the tool's input parameters
	 */
	constructor(
		public name: string,
		public description: string,
		public inputSchema: Record<string, unknown>,
	) {}

	/**
	 * Formats tool information for LLM consumption.
	 *
	 * Converts the tool's schema and metadata into a structured text format
	 * that LLMs can understand when deciding which tools to use. Includes
	 * parameter names, descriptions, and required flags.
	 *
	 * @returns Formatted string describing the tool for LLM use
	 */
	formatForLLM(): string {
		const argsDesc: string[] = [];
		if (this.inputSchema?.properties) {
			for (const [paramName, paramInfo] of Object.entries(
				this.inputSchema.properties,
			)) {
				const info = paramInfo as Record<string, unknown>;
				let argDesc = `- ${paramName}: ${(info.description as string) || "No description"}`;
				const required = this.inputSchema.required as string[] | undefined;
				if (required?.includes(paramName)) {
					argDesc += " (required)";
				}
				argsDesc.push(argDesc);
			}
		}

		return `
Tool: ${this.name}
Description: ${this.description}
Arguments:
${argsDesc.join("\n")}
`;
	}
}
