/**
 * Terminal UI module - Handles all user input and output operations
 * Decouples the application logic from terminal UI concerns
 */

interface UserApprovalResponse {
	action: "accept" | "decline" | "cancel";
	data?: Record<string, unknown>;
}

/**
 * Prompts user for input with schema validation and approval workflow.
 *
 * This function implements the MCP elicitation protocol by requesting user approval
 * before proceeding with potentially sensitive operations. It presents a confirmation
 * dialog and validates the response against the provided schema.
 *
 * @param message - The message to display to the user explaining what approval is needed
 * @param schema - JSON schema defining the structure of expected user input
 * @returns Promise resolving to user response containing action and optional data
 */
export async function getInputFromUser(
	message: string,
	schema: Record<string, unknown>,
): Promise<UserApprovalResponse> {
	console.log(`\n🔔 Elicitation Request: ${message}`);

	const response = prompt("Approve? (y/N): ");

	if (!response) {
		return { action: "cancel" };
	}

	const trimmed = response.trim().toLowerCase();

	if (trimmed === "y" || trimmed === "yes") {
		// For simple approval, return the schema structure with empty/default values
		const data: Record<string, unknown> = {};
		if (schema.properties && typeof schema.properties === "object") {
			for (const [key, value] of Object.entries(schema.properties)) {
				const propSchema = value as Record<string, unknown>;
				// Set default values based on type
				if (propSchema.type === "boolean") {
					data[key] = true;
				} else if (propSchema.type === "string") {
					data[key] = "";
				} else if (
					propSchema.type === "number" ||
					propSchema.type === "integer"
				) {
					data[key] = 0;
				}
			}
		}
		return { action: "accept", data };
	}

	if (trimmed === "n" || trimmed === "no") {
		return { action: "decline" };
	}

	return { action: "cancel" };
}

/**
 * Displays the application welcome banner and usage instructions.
 *
 * Shows the MCP Terminal Client branding, explains available commands,
 * and provides guidance for users on how to interact with the system.
 *
 * @returns void
 */
export function displayWelcomeMessage(): void {
	console.log("\n🤖 MCP Terminal Client");
	console.log("Type 'quit' or 'exit' to exit");
	console.log("Type '/prompts' to list available prompts");
	console.log("Type '/promptName' to use a prompt");
	console.log("Type '@resources' to list available resources");
	console.log("Type '@resourceName' to read a resource\n");
}

/**
 * Prompts the user for text input with a custom message.
 *
 * Displays a prompt to the user and waits for their input. This is a basic
 * synchronous input function using the Node.js prompt.
 *
 * @param message - The message to display as the prompt
 * @returns The user's input as a string, or null if input fails
 */
export function promptForInput(message: string): string | null {
	return prompt(message);
}

/**
 * Displays the LLM assistant's response to the user.
 *
 * Formats and outputs the AI assistant's response with appropriate visual styling
 * to distinguish it from user input and system messages.
 *
 * @param response - The text response from the LLM assistant
 * @returns void
 */
export function displayAssistantResponse(response: string): void {
	console.log(`\n🤖 Assistant: ${response}`);
}

/**
 * Displays the final response after tool execution completes.
 *
 * Shows the conclusive response from the LLM after all tool operations have finished,
 * providing the user with the complete analysis or results.
 *
 * @param response - The final text response from the LLM
 * @returns void
 */
export function displayFinalResponse(response: string): void {
	console.log(`\n✨ Final response: ${response}`);
}

/**
 * Displays formatted tool execution results.
 *
 * Outputs the results of tool execution in a structured format, typically
 * showing JSON data or command output from network diagnostic tools.
 *
 * @param result - The tool execution result to display
 * @returns void
 */
export function displayToolResult(result: string): void {
	console.log(`\n🔧 Tool result:\n${result}`);
}

/**
 * Displays error messages with appropriate formatting.
 *
 * Shows error conditions to the user with clear visual indicators and formatting
 * to distinguish errors from normal output.
 *
 * @param message - The error message to display
 * @returns void
 */
export function displayError(message: string): void {
	console.error(`\n❌ Error: ${message}\n`);
}

/**
 * Displays informational messages to the user.
 *
 * Shows general information, status updates, or notifications that don't
 * fall into error or success categories.
 *
 * @param message - The informational message to display
 * @returns void
 */
export function displayInfo(message: string): void {
	console.log(`\n${message}\n`);
}

/**
 * Displays success messages with appropriate formatting.
 *
 * Shows successful operations or positive outcomes to the user with
 * clear visual indicators of success.
 *
 * @param message - The success message to display
 * @returns void
 */
export function displaySuccess(message: string): void {
	console.log(`\n✅ ${message}\n`);
}

/**
 * Displays header information when reading a resource.
 *
 * Shows metadata about the resource being accessed, including name, URI,
 * description, and MIME type to provide context to the user.
 *
 * @param name - The display name of the resource
 * @param uri - The unique URI identifier of the resource
 * @param description - Optional description of the resource content
 * @param mimeType - Optional MIME type indicating the resource format
 * @returns void
 */
export function displayResourceHeader(
	name: string,
	uri: string,
	description?: string,
	mimeType?: string,
): void {
	console.log(`\n📄 Reading resource: ${name}`);
	if (description) {
		console.log(`   ${description}`);
	}
	console.log(`   URI: ${uri}`);
	console.log(`   MIME type: ${mimeType || "text/plain"}\n`);
}

/**
 * Displays a message indicating resource content is being fetched.
 *
 * Shows loading/progress indication while waiting for resource data to be retrieved
 * from the MCP server.
 *
 * @returns void
 */
export function displayFetchingResource(): void {
	console.log("🔄 Fetching resource content...\n");
}

/**
 * Displays a visual separator line.
 *
 * Creates a horizontal line using Unicode characters to visually separate
 * different sections of output in the terminal.
 *
 * @returns void
 */
export function displaySeparator(): void {
	console.log("─".repeat(80));
}

/**
 * Prompts user to attach resource content to chat context.
 *
 * Asks the user if they want to include the resource content in their ongoing
 * conversation with the LLM assistant for enhanced context.
 *
 * @returns boolean indicating whether user chose to attach the resource
 */
export function askAttachResource(): boolean {
	const attach = prompt("📎 Attach this resource to chat context? (y/N): ");
	return !!(
		attach &&
		(attach.trim().toLowerCase() === "y" ||
			attach.trim().toLowerCase() === "yes")
	);
}

/**
 * Displays confirmation that resource was attached to chat context.
 *
 * Informs the user that the resource content has been successfully added to their
 * conversation context and is now available for the LLM assistant to reference.
 *
 * @returns void
 */
export function displayResourceAttached(): void {
	console.log(
		"✅ Resource attached to chat context. You can now ask questions about it.\n",
	);
}

/**
 * Displays notification that resource was not attached to context.
 *
 * Informs the user that they chose not to include the resource content in their
 * ongoing conversation with the LLM assistant.
 *
 * @returns void
 */
export function displayResourceNotAttached(): void {
	console.log("ℹ️  Resource not attached to context.\n");
}

/**
 * Displays header for the available prompts list.
 *
 * Shows a formatted header indicating that the following output will be
 * a list of MCP prompts available from connected servers.
 *
 * @returns void
 */
export function displayPromptsHeader(): void {
	console.log("\n📋 Available prompts:");
}

/**
 * Displays header for the available resources list.
 *
 * Shows a formatted header indicating that the following output will be
 * a list of MCP resources available from connected servers.
 *
 * @returns void
 */
export function displayResourcesHeader(): void {
	console.log("\n📚 Available resources:");
}

/**
 * Displays an individual prompt item in the prompts list.
 *
 * Shows a single prompt entry with its command syntax and description
 * for users to understand how to invoke the prompt.
 *
 * @param name - The name identifier of the prompt
 * @param description - Optional description of what the prompt does
 * @returns void
 */
export function displayPromptItem(name: string, description?: string): void {
	console.log(`  /${name} - ${description || "No description"}`);
}

/**
 * Displays an individual resource item in the resources list.
 *
 * Shows a single resource entry with its access syntax, description,
 * URI, and MIME type for users to understand how to access the resource.
 *
 * @param name - The display name of the resource
 * @param description - Optional description of the resource content
 * @param uri - Optional URI identifier of the resource
 * @param mimeType - Optional MIME type indicating the resource format
 * @returns void
 */
export function displayResourceItem(
	name: string,
	description?: string,
	uri?: string,
	mimeType?: string,
): void {
	console.log(`  @${name} - ${description || "No description"}`);
	if (uri) {
		console.log(`    URI: ${uri}`);
	}
	if (mimeType) {
		console.log(`    Type: ${mimeType}`);
	}
}

/**
 * Displays application exit message.
 *
 * Shows a farewell message when the user chooses to quit the application,
 * providing a clean termination experience.
 *
 * @returns void
 */
export function displayExit(): void {
	console.log("\n👋 Exiting...");
}

/**
 * Displays message when no items are found in a list.
 *
 * Shows appropriate messaging when a list operation (prompts or resources)
 * returns empty results from all connected MCP servers.
 *
 * @param type - The type of items being listed ("prompts" or "resources")
 * @returns void
 */
export function displayEmptyList(type: string): void {
	console.log(`  No ${type} available`);
}

/**
 * Displays error message when a requested item is not found.
 *
 * Shows an error when a user attempts to access a prompt or resource
 * that doesn't exist on any of the connected MCP servers.
 *
 * @param type - The type of item that was not found ("Prompt" or "Resource")
 * @param name - The name of the item that was requested
 * @returns void
 */
export function displayNotFound(type: string, name: string): void {
	console.log(
		`\n❌ ${type} '${name}' not found. Use the appropriate command to see available ${type}s.\n`,
	);
}

/**
 * Displays notification that a prompt workflow has started.
 *
 * Indicates to the user that a structured prompt execution process has begun,
 * which will involve multiple steps including tool calls and LLM responses.
 *
 * @returns void
 */
export function displayPromptWorkflowStarted(): void {
	console.log("\n🤖 Starting prompt workflow...\n");
}

/**
 * Displays information about the prompt being used.
 *
 * Shows the name and description of the MCP prompt that is currently being
 * executed, helping users understand what workflow is running.
 *
 * @param name - The name identifier of the prompt being executed
 * @param description - Optional description of what the prompt does
 * @returns void
 */
export function displayUsingPrompt(name: string, description?: string): void {
	console.log(`\n📝 Using prompt: ${name}`);
	if (description) {
		console.log(`   ${description}`);
	}
}

/**
 * Displays message while fetching prompt instructions.
 *
 * Shows loading indication while retrieving the structured prompt content
 * and arguments from the MCP server.
 *
 * @returns void
 */
export function displayFetchingPromptInstructions(): void {
	console.log("\n🔄 Fetching prompt instructions...");
}

/**
 * Displays header for argument collection phase.
 *
 * Indicates to the user that they will now be prompted to provide
 * required and optional arguments for the prompt execution.
 *
 * @returns void
 */
export function displayCollectingArguments(): void {
	console.log("\nPlease provide the following arguments:");
}

/**
 * Displays error when a required argument is missing.
 *
 * Shows an error message when a user fails to provide a mandatory argument
 * for prompt execution, causing the operation to abort.
 *
 * @param argName - The name of the required argument that was not provided
 * @returns void
 */
export function displayArgumentRequired(argName: string): void {
	console.log(`\n❌ Required argument '${argName}' not provided. Aborting.\n`);
}

/**
 * Displays error message for resource reading failures.
 *
 * Shows detailed error information when attempting to read a resource
 * from an MCP server fails.
 *
 * @param message - The error message describing what went wrong
 * @returns void
 */
export function displayResourceError(message: string): void {
	console.log(`\n❌ Error reading resource: ${message}\n`);
}

/**
 * Displays error message for prompt execution failures.
 *
 * Shows detailed error information when attempting to execute an MCP prompt
 * fails during any phase of the workflow.
 *
 * @param message - The error message describing what went wrong
 * @returns void
 */
export function displayPromptError(message: string): void {
	console.log(`\n❌ Error executing prompt: ${message}\n`);
}

/**
 * Displays message when resource has no content.
 *
 * Shows notification when a resource exists but contains no readable content,
 * which may indicate an empty file or formatting issue.
 *
 * @returns void
 */
export function displayNoContent(): void {
	console.log("❌ No content returned from resource.\n");
}

/**
 * Prompts user to input a value for a prompt argument.
 *
 * Displays a formatted prompt asking the user to provide a value for a specific
 * argument, indicating whether it's required or optional.
 *
 * @param argName - The name of the argument being requested
 * @param description - Description of what the argument is for
 * @param isRequired - Whether the argument must be provided
 * @returns The user's input value or null if cancelled
 */
export function promptForArgument(
	argName: string,
	description: string,
	isRequired: boolean,
): string | null {
	const requiredLabel = isRequired ? " (required)" : " (optional)";
	return prompt(`  ${argName}${requiredLabel} - ${description}: `);
}

/**
 * Displays notification when a tool execution begins.
 *
 * Shows which network diagnostic tool is being executed, providing
 * transparency about what operation is currently running.
 *
 * @param toolName - The name of the tool being executed
 * @returns void
 */
export function displayToolExecution(toolName: string): void {
	console.log(`Executing tool: ${toolName}`);
}

/**
 * Displays the arguments being passed to a tool.
 *
 * Shows the complete set of arguments that will be sent to a tool,
 * useful for debugging and understanding tool invocations.
 *
 * @param args - The arguments object being passed to the tool
 * @returns void
 */
export function displayToolArguments(args: Record<string, unknown>): void {
	console.log(`With arguments:`, args);
}

/**
 * Displays notification when traceroute execution starts.
 *
 * Shows the traceroute command that is being executed, indicating
 * the beginning of a network path tracing operation.
 *
 * @param command - The full traceroute command being executed
 * @returns void
 */
export function displayTracerouteStart(command: string): void {
	console.log(`\n🔄 Starting traceroute: ${command}`);
}

/**
 * Displays real-time streaming output from tools.
 *
 * Outputs live data from streaming tools like traceroute and ping,
 * providing immediate feedback as the operations progress.
 *
 * @param output - The streaming output chunk to display
 * @returns void
 */
export function displayStreamingOutput(output: string): void {
	process.stdout.write(output);
}

/**
 * Displays notification when traceroute completes successfully.
 *
 * Indicates that the traceroute operation has finished and all hops
 * have been traced successfully.
 *
 * @returns void
 */
export function displayTracerouteComplete(): void {
	console.log(`\n✅ Traceroute completed`);
}

/**
 * Displays error message for traceroute failures.
 *
 * Shows error information when a traceroute operation encounters
 * problems during execution.
 *
 * @param error - The error message describing what went wrong
 * @returns void
 */
export function displayTracerouteError(error: string): void {
	console.log(`\n❌ Traceroute error: ${error}`);
}

/**
 * Displays notification when traceroute is cancelled.
 *
 * Indicates that the user or system cancelled the traceroute operation
 * before it could complete.
 *
 * @returns void
 */
export function displayTracerouteCancelled(): void {
	console.log(`\n🚫 Traceroute cancelled by user`);
}

/**
 * Displays notification when ping execution starts.
 *
 * Shows the ping command that is being executed, indicating
 * the beginning of a network connectivity test operation.
 *
 * @param command - The full ping command being executed
 * @returns void
 */
export function displayPingStart(command: string): void {
	console.log(`\n🔄 Starting ping: ${command}`);
}

/**
 * Displays notification when ping completes successfully.
 *
 * Indicates that the ping operation has finished and connectivity
 * testing is complete.
 *
 * @returns void
 */
export function displayPingComplete(): void {
	console.log(`\n✅ Ping completed`);
}

/**
 * Displays error message for ping failures.
 *
 * Shows error information when a ping operation encounters
 * problems during execution.
 *
 * @param error - The error message describing what went wrong
 * @returns void
 */
export function displayPingError(error: string): void {
	console.log(`\n❌ Ping error: ${error}`);
}

/**
 * Displays notification when ping is cancelled.
 *
 * Indicates that the user or system cancelled the ping operation
 * before it could complete.
 *
 * @returns void
 */
export function displayPingCancelled(): void {
	console.log(`\n🚫 Ping cancelled by user`);
}

/**
 * Displays notification when SSE connection is established.
 *
 * Indicates that a Server-Sent Events connection has been successfully
 * established for streaming tool output.
 *
 * @param sessionId - The unique identifier for the SSE session
 * @returns void
 */
export function displaySSEConnected(sessionId: string): void {
	console.log(`SSE connection established for session: ${sessionId}`);
}

/**
 * Displays warning when SSE event parsing fails.
 *
 * Shows error information when received SSE events cannot be parsed,
 * which may indicate protocol issues or malformed data.
 *
 * @param sessionId - The session identifier where parsing failed
 * @param error - The error that occurred during parsing
 * @returns void
 */
export function displaySSEParseError(sessionId: string, error: unknown): void {
	console.warn(`Failed to parse SSE event for session ${sessionId}:`, error);
}

/**
 * Displays error when SSE connection fails.
 *
 * Shows error information when attempting to establish or maintain
 * a Server-Sent Events connection fails.
 *
 * @param sessionId - The session identifier for the failed connection
 * @param error - The error that occurred during connection
 * @returns void
 */
export function displaySSEConnectionError(
	sessionId: string,
	error: unknown,
): void {
	console.error(`SSE connection error for session ${sessionId}:`, error);
}

/**
 * Displays confirmation of SSE connection establishment.
 *
 * Indicates that the SSE connection handshake has completed successfully
 * and streaming can begin.
 *
 * @param sessionId - The session identifier for the confirmed connection
 * @returns void
 */
export function displaySSEConnectionConfirmed(sessionId: string): void {
	console.log(`SSE connection confirmed for session: ${sessionId}`);
}

/**
 * Displays an empty line for visual spacing.
 *
 * Outputs a blank line to improve readability and separate different
 * sections of terminal output.
 *
 * @returns void
 */
export function displayEmptyLine(): void {
	console.log();
}
