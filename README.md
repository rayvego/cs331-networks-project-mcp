# Networks Project MCP

A comprehensive Model Context Protocol (MCP) implementation for network diagnostics. This monorepo consists of an MCP server providing network diagnostic tools and an MCP client that integrates with AI language models to enable intelligent, conversational network analysis.

## 📋 Project Overview

**Networks Project MCP** is a distributed system that combines:
- **MCP Server**: Provides network diagnostic tools (DNS lookup, ping, traceroute, GeoIP lookup)
- **MCP Client**: Connects to the server and integrates with AI models for intelligent tool execution
- **Model Context Protocol**: Enables seamless communication between AI models and external tools

The project demonstrates how to build a practical application using the Model Context Protocol, allowing AI models to execute real-world network diagnostic commands and provide meaningful analysis.

## 📦 Project Structure

```
networks-project-mcp/
├── package.json                 # Monorepo workspace configuration
├── packages/
│   ├── mcp-server/             # Network diagnostics MCP server
│   │   ├── src/
│   │   │   ├── index.ts         # Server entry point
│   │   │   ├── server.ts        # MCP server configuration
│   │   │   ├── lib/             # Core libraries
│   │   │   │   ├── command.ts   # Command execution utilities
│   │   │   │   ├── sse.ts       # Server-Sent Events setup
│   │   │   │   └── stream.ts    # Stream utilities
│   │   │   ├── tools/           # Network diagnostic tools
│   │   │   │   ├── dnsLookup.ts
│   │   │   │   ├── geoIPLookup.ts
│   │   │   │   ├── pingStream.ts
│   │   │   │   └── tracerouteStream.ts
│   │   │   ├── prompts/         # AI prompt templates
│   │   │   │   ├── detailedTraceroute.ts
│   │   │   │   └── verifyTraceroute.ts
│   │   │   ├── resources/       # Documentation resources
│   │   │   │   ├── digManPage.ts
│   │   │   │   ├── pingManPage.ts
│   │   │   │   └── tracerouteManPage.ts
│   │   │   └── man/             # Man page files
│   │   ├── docker-compose.yml   # Docker composition for server
│   │   ├── Dockerfile           # Docker configuration
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── mcp-client/              # Interactive MCP client
│       ├── src/
│       │   ├── index.ts         # Client entry point
│       │   ├── core/            # Core client modules
│       │   │   ├── config.ts     # Configuration management
│       │   │   ├── llmClient.ts  # LLM integration
│       │   │   ├── mcpServer.ts  # MCP server connection
│       │   │   └── toolInfo.ts   # Tool metadata
│       │   ├── session/          # Session management
│       │   │   ├── chatSession.ts # Chat session orchestration
│       │   │   └── sseManager.ts  # SSE stream management
│       │   └── ui/               # User interface
│       │       └── terminal.ts   # Terminal UI
│       ├── servers_config.json  # MCP server configuration
│       ├── tsconfig.json
│       └── package.json
│
└── README.md                    # This file
```

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime (v1.2+)
- [Node.js](https://nodejs.org) 16+ (for MCP SDK compatibility)
- [Google Generative AI API key](https://console.cloud.google.com) (for the client)
- macOS (currently the man pages are for macOS; Linux/Windows support coming soon)

### Installation

1. **Clone and navigate to the project**:
   ```bash
   cd /Users/rayvego/code/courage/networks-project-mcp
   ```

2. **Install dependencies and build**:
   ```bash
   bun install
   bun run build
   ```

3. **Configure the client** (in `packages/mcp-client`):
   ```bash
   cp .env.example .env
   ```
   Then add your Google Generative AI API key:
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```

### Running the Project

**Option 1: Quick Start (All-in-One)**
```bash
bun run start
```
This command:
- Installs all dependencies
- Builds both server and client
- Starts the MCP client in interactive mode

**Option 2: Development Mode**
```bash
# Terminal 1: Start the MCP server
cd packages/mcp-server
bun run dev

# Terminal 2: Start the MCP client
cd packages/mcp-client
bun run dev
```

**Option 3: Docker**
```bash
# Build and run the MCP server with Docker
cd packages/mcp-server
docker-compose up
```

## 🛠️ Components

### MCP Server (`packages/mcp-server`)

A Model Context Protocol server that exposes network diagnostic tools to AI models and MCP clients.

#### Available Tools

1. **DNS Lookup (`dnsLookup`)**
   - Performs DNS queries using the `dig` command
   - Returns DNS records for a given domain
   - Supports custom query types (A, AAAA, MX, NS, TXT, etc.)

2. **GeoIP Lookup (`geoIPLookup`)**
   - Retrieves geographic location information for IP addresses
   - Returns country, city, coordinates, and ISP details
   - Uses the geoiplookup.io API

3. **Ping Stream (`pingStream`)**
   - Real-time ping execution with streaming output
   - Tracks latency, packet loss, and response times
   - Uses Server-Sent Events (SSE) for live updates

4. **Traceroute Stream (`tracerouteStream`)**
   - Real-time traceroute execution with streaming output
   - Shows network path to destination hosts
   - Includes hop-by-hop analysis

#### Built-in Prompts

1. **Verify Traceroute** - Guides analysis of traceroute results
2. **Detailed Traceroute** - Provides comprehensive traceroute analysis

#### Resources

- Man pages for `dig`, `ping`, and `traceroute` commands
- Accessible via the MCP resource protocol

#### Architecture

- **Command Execution** (`lib/command.ts`): Executes system commands with proper error handling
- **Streaming** (`lib/stream.ts`): Manages real-time command output streaming
- **SSE Server** (`lib/sse.ts`): Provides Server-Sent Events for streaming results

### MCP Client (`packages/mcp-client`)

An interactive terminal client that connects to MCP servers and uses an AI model to intelligently execute tools.

#### Key Features

- 🤖 **LLM Integration**: Uses Google's Gemini AI model for natural language understanding
- 🔧 **Multiple Server Support**: Can connect to multiple MCP servers simultaneously
- 🔄 **Automatic Tool Execution**: LLM determines which tools to use based on user queries
- 📊 **Progress Tracking**: Visual feedback for long-running operations
- 🔁 **Retry Mechanism**: Built-in retry logic for robust execution
- 💬 **Conversational Interface**: Natural chat-based interaction

#### Architecture

- **Configuration** (`core/config.ts`): Manages environment variables and settings
- **LLM Client** (`core/llmClient.ts`): Handles communication with the AI model
- **MCP Server Connection** (`core/mcpServer.ts`): Manages connections to MCP servers
- **Tool Info** (`core/toolInfo.ts`): Caches and formats tool metadata
- **Chat Session** (`session/chatSession.ts`): Orchestrates user input, LLM calls, and tool execution
- **SSE Manager** (`session/sseManager.ts`): Manages streaming responses from tools
- **Terminal UI** (`ui/terminal.ts`): Provides user-friendly terminal interface

#### Usage Example

```bash
$ bun run start

🔗 Connected to network-diagnostics MCP server
📡 Available tools: dnsLookup, geoIPLookup, pingStream, tracerouteStream

You: What's the IP address of github.com and where is it located?

🤖 Executing tools...
├─ dnsLookup for github.com
└─ geoIPLookup for 20.200.245.247

✨ Response:
GitHub.com resolves to 20.200.245.247. This IP address is located in 
Ashburn, Virginia, United States, and is hosted by Microsoft Corporation.

You: 
```

## 📝 Configuration

### Server Configuration (`packages/mcp-client/servers_config.json`)

```json
{
  "mcpServers": {
    "network-diagnostics": {
      "command": "bun",
      "args": [
        "/Users/rayvego/code/courage/networks-project-mcp/packages/mcp-server/dist/index.js"
      ]
    }
  }
}
```

Modify this file to add additional MCP servers or change how the server is launched.

### Environment Variables

Create a `.env` file in `packages/mcp-client` with:

```
GOOGLE_API_KEY=your_api_key_here
```

## 🏗️ Development

### Building

```bash
# Build entire project
bun run build

# Build only the server
cd packages/mcp-server && bun run build

# Build only the client
cd packages/mcp-client && bun run build
```

### Development Mode

```bash
# Server (with auto-reload)
cd packages/mcp-server && bun run dev

# Client (with auto-reload)
cd packages/mcp-client && bun run dev
```

### Project Scripts

| Command | Description |
|---------|-------------|
| `bun run build` | Build both server and client |
| `bun run start` | Install, build, and start the client |

## 🔌 API Details

### MCP Server Endpoints

The MCP server provides:

1. **Stdio Transport** - Standard input/output for MCP communication
2. **HTTP/SSE Server** - Runs on a configurable port for streaming tool outputs

### Tool Definitions

Each tool follows the MCP Tool Definition schema with:
- `name`: Unique identifier
- `description`: Human-readable description
- `inputSchema`: Zod-validated input parameters
- `handler`: Async function that executes the tool

Example tool structure:
```typescript
{
  name: "dnsLookup",
  definition: {
    description: "Perform DNS queries...",
    inputSchema: {
      type: "object",
      properties: { /* ... */ }
    }
  },
  handler: async (params, elicitationRequest) => { /* ... */ }
}
```

## 🐳 Docker Support

The MCP server can be containerized for deployment:

```bash
cd packages/mcp-server
docker build -t network-diagnostics-mcp .
docker run -p 3000:3000 network-diagnostics-mcp
```

Or use docker-compose:
```bash
docker-compose up
```

## 🧪 Testing

Currently, the project focuses on functionality testing through manual runs. To test:

1. Start the server
2. Run the client
3. Issue network diagnostic queries

Example queries to test:
- "What's the IP address of google.com?"
- "Trace the route to amazon.com"
- "Ping example.com 5 times"
- "Where is the IP address 8.8.8.8 located?"

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- [ ] Add unit and integration tests
- [ ] Support for Linux and Windows man pages
- [ ] Additional network diagnostic tools (nslookup, whois, etc.)
- [ ] Web-based UI
- [ ] Caching for repeated queries
- [ ] Performance optimizations for streaming
- [ ] Additional LLM provider support

## 🐛 Troubleshooting

### Server Won't Start
- Check that port 3000 is not in use
- Verify Bun is installed: `bun --version`
- Check that the MCP SDK is properly installed

### Client Can't Connect
- Ensure the server is running
- Check `servers_config.json` has correct server path
- Verify API key is set in `.env`

### No LLM Responses
- Verify `GOOGLE_API_KEY` is set correctly
- Check internet connectivity
- Verify API quota hasn't been exceeded

### Streaming Issues
- Ensure the SSE server port is not blocked
- Check firewall settings
- Verify network connectivity

## 📚 Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [Bun Documentation](https://bun.sh/docs)
- [Google Generative AI API](https://ai.google.dev)
- [MCP SDK for TypeScript](https://github.com/modelcontextprotocol/typescript-sdk)

## 📄 License

MIT

## 🎓 Context

This project is part of CS331 Networks course work, demonstrating practical application of network diagnostic tools through an AI-integrated interface.

---

**Last Updated**: November 2025
**Version**: 1.0.0
