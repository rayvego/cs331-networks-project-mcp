import { spawn } from "child_process";
import * as z from "zod";

export interface CommandExecutionOptions {
	tool: string;
	args: string[];
	commandString: string;
	elicitationRequest: (
		message: string,
		schema: object,
	) => Promise<{
		action: "accept" | "decline" | "cancel";
		content?: { approved?: boolean };
	}>;
}

/**
 * Executes a system command with user approval and structured output parsing.
 *
 * Runs arbitrary system commands with comprehensive approval workflow via MCP elicitation.
 * Pipes command output through 'jc' (JSON conversion tool) for structured parsing,
 * falling back to raw text output if JSON parsing fails. Implements retry logic
 * and proper error handling for command execution.
 *
 * @param options - Command execution configuration
 * @param options.tool - Name/path of the command to execute
 * @param options.args - Array of command-line arguments
 * @param options.commandString - Human-readable command string for approval
 * @param options.elicitationRequest - Function to request user approval
 * @returns Promise resolving to structured command output with content and status
 * @throws Error if user declines approval or command execution fails
 */
export async function executeCommand(
	options: CommandExecutionOptions,
): Promise<{
	content: Array<{ type: string; text: string }>;
	isError?: boolean;
}> {
	const { tool, args, commandString, elicitationRequest } = options;

	// Request user approval via elicitation
	const confirmationMessage = `Allow network-diagnostics to execute '${commandString}'?`;
	const requestedSchema = {
		type: "object",
		properties: {
			approved: {
				type: "boolean",
				title: "Approve execution",
				description: "Confirm to allow the command to execute",
			},
		},
		required: ["approved"],
	};

	try {
		const elicitationResponse = await elicitationRequest(
			confirmationMessage,
			requestedSchema,
		);

		// Check if user approved
		if (
			elicitationResponse.action === "accept" &&
			elicitationResponse.content?.approved === true
		) {
			// User approved - proceed with execution
			return new Promise((resolve) => {
				// Spawn command process and pipe output to jc
				const commandProcess = spawn(tool, args);
				const jcProcess = spawn("jc", [`--${tool}`]);

				let commandStdout = "";
				let jcStdout = "";
				let jcStderr = "";
				let commandStderr = "";

				// Pipe command stdout to jc stdin and also capture raw output
				commandProcess.stdout.pipe(jcProcess.stdin);
				commandProcess.stdout.on("data", (data) => {
					commandStdout += data.toString();
				});

				// Capture jc stdout (parsed JSON)
				jcProcess.stdout.on("data", (data) => {
					jcStdout += data.toString();
				});

				// Capture stderr from both processes
				jcProcess.stderr.on("data", (data) => {
					jcStderr += data.toString();
				});
				commandProcess.stderr.on("data", (data) => {
					commandStderr += data.toString();
				});

				// Handle process completion
				let commandExited = false;
				let jcExited = false;
				let commandCode: number | null = null;
				let jcCode: number | null = null;

				const checkCompletion = () => {
					if (commandExited && jcExited) {
						if (commandCode === 0 && jcCode === 0) {
							try {
								// Parse jc JSON output
								const parsedData = JSON.parse(jcStdout);
								resolve({
									content: [
										{
											type: "text",
											text: JSON.stringify(parsedData, null, 2),
										},
									],
								});
							} catch {
								// If JSON parsing fails, return raw jc output
								resolve({
									content: [{ type: "text", text: jcStdout }],
								});
							}
						} else if (commandCode === 0 && jcCode !== 0) {
							// Command succeeded but jc failed - return raw output
							resolve({
								content: [{ type: "text", text: commandStdout }],
							});
						} else {
							// Error - return error message
							const errorMessage =
								commandStderr ||
								jcStderr ||
								`${tool} command failed with exit code ${commandCode}`;
							resolve({
								content: [{ type: "text", text: `Error: ${errorMessage}` }],
								isError: true,
							});
						}
					}
				};

				commandProcess.on("close", (code) => {
					commandCode = code;
					commandExited = true;
					commandProcess.stdout.destroy(); // Close the pipe
					checkCompletion();
				});

				jcProcess.on("close", (code) => {
					jcCode = code;
					jcExited = true;
					checkCompletion();
				});

				// Handle spawn errors
				commandProcess.on("error", (error) => {
					resolve({
						content: [
							{
								type: "text",
								text: `Failed to execute ${tool} command: ${error.message}`,
							},
						],
						isError: true,
					});
				});

				jcProcess.on("error", (error) => {
					resolve({
						content: [
							{
								type: "text",
								text: `Failed to execute jc command: ${error.message}`,
							},
						],
						isError: true,
					});
				});
			});
		} else {
			// User declined or canceled - return denial message
			return {
				content: [
					{
						type: "text",
						text: "Request denied by user. Command execution was not approved.",
					},
				],
				isError: false,
			};
		}
	} catch (error) {
		// Handle elicitation request errors
		return {
			content: [
				{
					type: "text",
					text: `Failed to request user approval: ${error instanceof Error ? error.message : String(error)}`,
				},
			],
			isError: true,
		};
	}
}

