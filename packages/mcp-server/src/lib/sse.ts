import cors from "cors";
import express from "express";

const app = express();
const SSE_PORT = process.env.SSE_PORT || 3001;

app.use(cors());
app.use(express.json());

// Store active SSE connections by session ID
const sseConnections = new Map<
	string,
	{ res: express.Response; sessionId: string }
>();

// SSE endpoint for clients to connect
app.get("/sse/:sessionId", (req: express.Request, res: express.Response) => {
	const sessionId = req.params.sessionId;
	if (!sessionId) {
		res.status(400).send("Session ID required");
		return;
	}

	// Set SSE headers
	res.writeHead(200, {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Cache-Control",
	});

	// Send initial connection message
	res.write(`data: ${JSON.stringify({ type: "connected", sessionId })}\n\n`);

	// Store the connection
	sseConnections.set(sessionId, { res, sessionId });

	// Handle client disconnect
	req.on("close", () => {
		sseConnections.delete(sessionId);
		console.error(`SSE connection closed for session: ${sessionId}`);
	});

	console.error(`SSE connection established for session: ${sessionId}`);
});

/**
 * Sends a Server-Sent Event to a specific client session.
 *
 * Transmits structured event data to connected SSE clients identified by session ID.
 * Handles connection validation and error logging if the target session is not
 * actively connected. Events are sent as JSON-encoded data payloads.
 *
 * @param sessionId - Unique identifier for the target SSE session
 * @param event - Event data object to send (will be JSON serialized)
 * @private
 */
function sendSSEEvent(sessionId: string, event: Record<string, unknown>) {
	const connection = sseConnections.get(sessionId);
	if (connection) {
		try {
			connection.res.write(`data: ${JSON.stringify(event)}\n\n`);
		} catch (error) {
			console.error(`Failed to send SSE event to session ${sessionId}:`, error);
			sseConnections.delete(sessionId);
		}
	} else {
		console.warn(`No active SSE connection found for session ${sessionId}`);
	}
}

export { app, sendSSEEvent, SSE_PORT, sseConnections };
