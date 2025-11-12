/**
 * SSE (Server-Sent Events) connection management for streaming operations
 */

import * as terminalUI from "../ui/terminal.js";

// Import EventSource with any type to avoid type issues
const EventSource = require("eventsource");

export class SSEManager {
	private ssePort: number = 3001; // Default SSE port
	private activeSSEConnections: Map<string, any> = new Map();

	/**
	 * Initializes the SSE connection manager.
	 *
	 * Sets up the manager with default configuration and reads the SSE port
	 * from environment variables if specified.
	 */
	constructor() {
		// Get SSE port from environment if set
		const envPort = process.env.SSE_PORT;
		if (envPort) {
			this.ssePort = parseInt(envPort, 10);
		}
	}

	/**
	 * Generates a unique session identifier.
	 *
	 * Creates a session ID using timestamp and random string to ensure
	 * uniqueness across different sessions and prevent conflicts.
	 *
	 * @returns Unique session identifier string
	 * @private
	 */
	private generateSessionId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Generates a new unique session ID for SSE connections.
	 *
	 * Public interface for creating session IDs that will be used to
	 * establish Server-Sent Events connections for streaming tool output.
	 *
	 * @returns Unique session identifier for SSE connection
	 */
	generateNewSessionId(): string {
		return this.generateSessionId();
	}

	/**
	 * Establishes SSE connection for streaming tool output.
	 *
	 * Creates a new EventSource connection to the SSE server endpoint,
	 * sets up event handlers for connection lifecycle and data reception,
	 * and stores the connection for later management.
	 *
	 * @param sessionId - Unique identifier for this SSE session
	 * @returns Promise that resolves when connection is established
	 * @throws Error if connection fails to establish
	 */
	async connectToSSE(sessionId: string): Promise<void> {
		const sseUrl = `http://localhost:${this.ssePort}/sse/${sessionId}`;

		return new Promise((resolve, reject) => {
			try {
				const eventSource = new (EventSource as any)(sseUrl);

				eventSource.onopen = () => {
					terminalUI.displaySSEConnected(sessionId);
					resolve();
				};

				eventSource.onmessage = (event: any) => {
					try {
						const data = JSON.parse(event.data);
						this.handleSSEEvent(sessionId, data);
					} catch (error) {
						terminalUI.displaySSEParseError(sessionId, error);
					}
				};

				eventSource.onerror = (error: any) => {
					terminalUI.displaySSEConnectionError(sessionId, error);
					// Don't reject the promise on connection errors, just log them
				};

				this.activeSSEConnections.set(sessionId, eventSource);
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Processes incoming SSE events and updates terminal UI.
	 *
	 * Handles different types of streaming events from network tools,
	 * updates the terminal display accordingly, and manages connection
	 * lifecycle (closing connections when operations complete).
	 *
	 * @param sessionId - The session identifier for this event stream
	 * @param event - The SSE event object containing type and data
	 * @private
	 */
	private handleSSEEvent(
		sessionId: string,
		event: { type: string; [key: string]: unknown },
	): void {
		switch (event.type) {
			case "connected":
				terminalUI.displaySSEConnectionConfirmed(event.sessionId as string);
				break;
			case "traceroute_start":
				terminalUI.displayTracerouteStart(event.command as string);
				break;
			case "traceroute_output":
				terminalUI.displayStreamingOutput(event.output as string);
				break;
			case "traceroute_complete":
				terminalUI.displayTracerouteComplete();
				// Close the SSE connection
				{
					const eventSource = this.activeSSEConnections.get(sessionId);
					if (eventSource) {
						eventSource.close();
						this.activeSSEConnections.delete(sessionId);
					}
				}
				break;
			case "traceroute_error":
				terminalUI.displayTracerouteError(event.error as string);
				break;
			case "traceroute_cancelled":
				terminalUI.displayTracerouteCancelled();
				break;
			case "ping_start":
				terminalUI.displayPingStart(event.command as string);
				break;
			case "ping_output":
				terminalUI.displayStreamingOutput(event.output as string);
				break;
			case "ping_complete":
				terminalUI.displayPingComplete();
				// Close the SSE connection
				{
					const eventSource = this.activeSSEConnections.get(sessionId);
					if (eventSource) {
						eventSource.close();
						this.activeSSEConnections.delete(sessionId);
					}
				}
				break;
			case "ping_error":
				terminalUI.displayPingError(event.error as string);
				break;
			case "ping_cancelled":
				terminalUI.displayPingCancelled();
				break;
			default:
				console.log(`Unknown SSE event type: ${event.type}`);
		}
	}

	/**
	 * Closes a specific SSE connection.
	 *
	 * Terminates the Server-Sent Events connection for the given session
	 * and removes it from the active connections tracking.
	 *
	 * @param sessionId - The session identifier whose connection to close
	 */
	closeConnection(sessionId: string): void {
		const eventSource = this.activeSSEConnections.get(sessionId);
		if (eventSource) {
			eventSource.close();
			this.activeSSEConnections.delete(sessionId);
		}
	}

	/**
	 * Closes all active SSE connections.
	 *
	 * Performs cleanup by terminating all open Server-Sent Events connections
	 * and clearing the connections tracking map. Used during application shutdown.
	 *
	 * @returns Promise that resolves when all connections are closed
	 */
	async cleanup(): Promise<void> {
		// Close all active SSE connections
		for (const [sessionId, eventSource] of this.activeSSEConnections) {
			try {
				eventSource.close();
			} catch (error) {
				console.warn(`Warning closing SSE connection ${sessionId}:`, error);
			}
		}
		this.activeSSEConnections.clear();
	}
}

