# 🚀 Skedyul MCP Starter Kits

Production-ready starter templates for building [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) servers with TypeScript. Deploy serverless functions or dedicated containers with full type safety, testing, and Docker support.

## 📦 Available Starters

| Starter | Runtime | Description | Use Case |
|---------|---------|-------------|----------|
| [**typescript-dedicated-mcp**](./starters/typescript-dedicated-mcp) | Node.js 22 (Dedicated) | Long-running HTTP server with health checks and TTL management | Always-on services, high-traffic APIs, stateful operations |
| [**typescript-serverless-mcp**](./starters/typescript-serverless-mcp) | Node.js 22 (AWS Lambda) | Serverless Lambda handler with API Gateway integration | On-demand workloads, cost-sensitive apps, auto-scaling |

## ✨ Features

- ✅ **Full TypeScript support** with strict type checking
- ✅ **Production-ready Dockerfiles** optimized for each runtime
- ✅ **Comprehensive test suites** using Node.js native test runner
- ✅ **MCP SDK integration** with JSON-RPC 2.0 support
- ✅ **Environment variable management** (baked-in + runtime)
- ✅ **Example tools** demonstrating inputs, env vars, and outputs
- ✅ **Health endpoints** for monitoring and orchestration
- ✅ **CORS support** (serverless) and TTL management (dedicated)

## 🏁 Quick Start

### 1. Choose Your Runtime

Pick the starter that matches your deployment model:

- **Dedicated Server** → Use when you need a long-running process, WebSocket support, or persistent connections
- **Serverless Lambda** → Use when you want automatic scaling, pay-per-use pricing, or event-driven architecture

### 2. Clone and Install

```bash
# Clone the starter you want
cd starters/typescript-dedicated-mcp
# or
cd starters/typescript-serverless-mcp

# Install dependencies
npm install
```

### 3. Build and Test Locally

```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Build Docker image
docker build -t my-mcp-server:latest .

# Run locally (Dedicated)
docker run -p 3000:3000 my-mcp-server:latest

# Run locally (Serverless)
docker run -p 9000:8080 my-mcp-server:latest
```

### 4. Deploy to Skedyul

**⚠️ Deployment requires a [Skedyul](https://skedyul.com) account.**

Once you have an account, use the Skedyul CLI or dashboard to deploy your MCP server:

```bash
# Install Skedyul CLI (if not already installed)
npm install -g @skedyul/cli

# Login to your account
skedyul login

# Deploy your MCP server
skedyul deploy
```

Skedyul will automatically:
- Copy the starter template into your app directory
- Inject your custom tools under `src/tools/**`
- Build the Docker image with your configuration
- Deploy to your chosen runtime (dedicated or serverless)

## 🛠️ Building Your Own Tools

Both starters include an example `hello-world` tool. Here's how to add your own:

### 1. Create a new tool file

```typescript
// src/tools/my-tool.ts
import type { ToolHandler } from '../registry'

export interface MyToolInput {
  query: string
  limit?: number
}

export interface MyToolOutput {
  results: string[]
  count: number
}

export const myTool: ToolHandler<MyToolInput, MyToolOutput> = async ({
  input,
  context,
}) => {
  const query = input.query
  const limit = input.limit ?? 10
  
  // Your tool logic here
  const results = await performSearch(query, limit)
  
  return {
    results,
    count: results.length,
  }
}
```

### 2. Register it in the registry

```typescript
// src/registry.ts
import { helloWorld } from './tools/hello-world'
import { myTool } from './tools/my-tool'

export const registry = {
  'hello-world': helloWorld,
  'my-tool': myTool,
}
```

### 3. Test your tool

```javascript
// tests/my-tool.test.js
const test = require('node:test')
const assert = require('node:assert/strict')
const { registry } = require('../dist/registry.js')

test('my-tool returns search results', async () => {
  const fn = registry['my-tool']
  
  const result = await fn({
    input: { query: 'test', limit: 5 },
    context: { env: {} },
  })
  
  assert.ok(Array.isArray(result.results))
  assert.equal(typeof result.count, 'number')
})
```

## 🧪 Testing

Both starters include comprehensive test coverage:

```bash
# Run all tests
npm test

# Tests include:
# - Tool unit tests (inputs, outputs, env handling)
# - Handler integration tests (HTTP/Lambda)
# - Error handling and edge cases
# - JSON-RPC 2.0 compliance
```

## 📖 MCP Protocol Support

All starters implement the [Model Context Protocol](https://modelcontextprotocol.io/) specification:

- **JSON-RPC 2.0** transport
- **`tools/list`** method for tool discovery
- **`tools/call`** method for tool execution
- **Typed schemas** for inputs and outputs
- **Error handling** with standard error codes

## 🔧 Environment Variables

### Baked-in Environment (Build-time)

Set during Docker build for immutable configuration:

```bash
docker build \
  --build-arg MCP_ENV_JSON='{"API_KEY":"secret","ENV":"production"}' \
  -t my-mcp-server .
```

### Runtime Environment (Request-time)

Override on a per-container basis:

```bash
# Dedicated
docker run -e MCP_ENV='{"ENV":"staging"}' my-mcp-server

# Serverless
docker run -e MCP_ENV='{"ENV":"staging"}' my-mcp-server
```

### Just-in-time Environment (Request-level)

Override per-request in tool calls:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "my-tool",
    "arguments": {
      "inputs": { "query": "test" },
      "env": { "ENV": "development" }
    }
  }
}
```

## 📊 Architecture Comparison

| Feature | Dedicated Server | Serverless Lambda |
|---------|------------------|-------------------|
| **Cold Start** | No (always running) | Yes (~1-2s first request) |
| **Cost Model** | Fixed (always billed) | Pay per invocation |
| **Scaling** | Manual/fixed | Automatic |
| **State** | Can maintain state | Stateless |
| **WebSockets** | ✅ Supported | ❌ Not supported |
| **Max Duration** | Unlimited | 15 minutes (Lambda limit) |
| **Base Image** | `gcr.io/distroless/nodejs22` | `public.ecr.aws/lambda/nodejs:22` |
| **Best For** | APIs, WebSockets, long tasks | Event-driven, variable load |

## 🔗 Resources

- [Skedyul Documentation](https://docs.skedyul.com)
- [Model Context Protocol Spec](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Node.js 22 Documentation](https://nodejs.org/docs/latest-v22.x/api/)

## 📝 License

See individual starter directories for license information.

## 🤝 Contributing

Contributions are welcome! Please open an issue or PR with your improvements.

---

**Need help?** Join our [Discord community](https://discord.gg/skedyul) or check the [documentation](https://docs.skedyul.com).
