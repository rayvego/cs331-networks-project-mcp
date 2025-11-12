import { spawn } from "child_process";
import { sendSSEEvent } from "./sse.js";

export interface StreamCommandExecutionOptions {
	tool: string;
	args: string[];
	commandString: string;
	sessionId: string;
	startEventType: string;
	outputEventType: string;
	completeEventType: string;
	errorEventType: string;
	cancelledEventType: string;
	elicitationRequest: (
		message: string,
		schema: object,
	) => Promise<{
		action: "accept" | "decline" | "cancel";
		content?: { approved?: boolean };
	}>;
}

/**
 * Executes a system command with real-time streaming output via Server-Sent Events.
 *
 * Runs long-running system commands with live output streaming to clients through
 * SSE connections. Implements user approval workflow, pipes command output through
 * 'jc' for JSON parsing, and sends structured events for command lifecycle
 * (start, output, completion, errors). Automatically manages SSE connection
 * lifecycle and cleanup.
 *
 * @param options - Streaming command execution configuration
 * @param options.tool - Name/path of the command to execute
 * @param options.args - Array of command-line arguments
 * @param options.commandString - Human-readable command string for approval
 * @param options.sessionId - Unique SSE session identifier for streaming
 * @param options.startEventType - SSE event type for command start notification
 * @param options.outputEventType - SSE event type for live output streaming
 * @param options.completeEventType - SSE event type for command completion
 * @param options.errorEventType - SSE event type for command errors
 * @param options.cancelledEventType - SSE event type for user cancellation
 * @param options.elicitationRequest - Function to request user approval
 * @returns Promise resolving to final command results with structured output
 * @throws Error if user declines approval or command execution fails
 */
export async function streamCommand(
	options: StreamCommandExecutionOptions,
): Promise<{
	content: Array<{ type: string; text: string }>;
	isError?: boolean;
}> {
	const {
		tool,
		args,
		commandString,
		sessionId,
		startEventType,
		outputEventType,
		completeEventType,
		errorEventType,
		cancelledEventType,
		elicitationRequest,
	} = options;

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
			// Send initial status via SSE
			sendSSEEvent(sessionId, {
				type: startEventType,
				command: commandString,
				timestamp: new Date().toISOString(),
			});

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
					const output = data.toString();
					commandStdout += output;

					// Send raw output via SSE for immediate display
					sendSSEEvent(sessionId, {
						type: outputEventType,
						output: output,
						timestamp: new Date().toISOString(),
					});
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
						sendSSEEvent(sessionId, {
							type: completeEventType,
							timestamp: new Date().toISOString(),
						});

						// Accept exit codes: 0 for success, 2 for ping (no responses but transmission successful)
						const acceptableCodes = tool === "ping" ? [0, 2] : [0];
						if (acceptableCodes.includes(commandCode ?? -1) && jcCode === 0) {
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
						} else if (
							acceptableCodes.includes(commandCode ?? -1) &&
							jcCode !== 0
						) {
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
					sendSSEEvent(sessionId, {
						type: errorEventType,
						error: error.message,
						timestamp: new Date().toISOString(),
					});
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
			sendSSEEvent(sessionId, {
				type: cancelledEventType,
				timestamp: new Date().toISOString(),
			});
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
		sendSSEEvent(sessionId, {
			type: errorEventType,
			error: error instanceof Error ? error.message : String(error),
			timestamp: new Date().toISOString(),
		});
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

