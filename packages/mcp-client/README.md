# MCP Terminal Client

A TypeScript-based terminal client for the Model Context Protocol (MCP) that integrates with LLM providers to provide interactive tool execution.

## Features

- 🔧 **Multiple MCP Server Support**: Connect to multiple MCP servers simultaneously
- 🤖 **LLM Integration**: Uses Groq's LLaMA 3.3 70B model for natural language understanding
- 🔄 **Automatic Tool Execution**: Automatically executes tools based on user queries
- 📊 **Progress Tracking**: Supports progress tracking for long-running operations
- 🔁 **Retry Mechanism**: Built-in retry logic for robust tool execution
- 💬 **Conversational Interface**: Natural chat-based interaction

## Prerequisites

- [Bun](https://bun.sh) runtime
- Groq API key (get one at [console.groq.com](https://console.groq.com))
- MCP server(s) to connect to

## Installation

1. Install dependencies:
```bash
bun install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Add your Groq API key to `.env`:
```
GROQ_API_KEY=your_api_key_here
```

## Configuration

Configure your MCP servers in `servers_config.json`:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {
        "OPTIONAL_ENV_VAR": "value"
      }
    }
  }
}
```

## Usage

Run the client:

```bash
bun start
```

Or in development mode with auto-reload:

```bash
bun run dev
```

### Example Interaction

```
You: What is the IP address of google.com?

🤖 Assistant: {"tool": "dig", "arguments": {"domain": "google.com"}}

Executing dig...
Tool execution result: {...}

✨ Final response: The IP address of google.com is 142.250.80.46
```

Type `quit` or `exit` to exit the client.

## Architecture

The client consists of several key classes:

- **Configuration**: Manages environment variables and server configuration
- **Server**: Handles MCP server connections and tool execution
- **ToolInfo**: Represents tool metadata and formatting
- **LLMClient**: Manages communication with the LLM provider
- **ChatSession**: Orchestrates the interaction between user, LLM, and tools

## Error Handling

- Automatic retry mechanism for failed tool executions
- Graceful server cleanup on errors
- Detailed error logging for debugging

## License

MIT

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.1. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
