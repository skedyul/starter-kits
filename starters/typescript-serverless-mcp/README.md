# TypeScript Serverless MCP Starter (Node.js 22 Lambda)

This starter is a TypeScript template for building a **serverless** MCP server targeting the `public.ecr.aws/lambda/nodejs:22` runtime.

## Structure

- `tsconfig.json` – TypeScript configuration.
- `src/registry.ts` – central registry mapping tool IDs to implementations.
- `src/tools/hello-world.ts` – example tool showing how to:
  - accept typed inputs (`name?: string`)
  - read environment variables (`SKEDYUL_ENV`)
  - return a typed result.
- `src/server/mcp-server.ts` – MCP server entrypoint (replace with your own implementation).
- `Dockerfile` – builds TS → JS (`dist/**`) and produces a Lambda-compatible Node 22 image.
- `template.yaml` – AWS SAM template for local testing and deployment.
- `samconfig.toml` – SAM CLI configuration file.

## Hello world tool

The `hello-world` tool demonstrates using input + env:

- Input: `{ name?: string }`
- Env: `SKEDYUL_ENV` (falls back to `"local"` if not set)
- Output: `{ message: string; environmentName: string }`

## Commands

```bash
npm install
npm run build
npm start
npm test   # runs Node.js native test runner against tests/**/*.test.js
```

In Skedyul, the build system will:

1. Copy this starter into your app directory.
2. Inject your own tools / logic under `src/tools/**`.
3. Build the image using the provided `Dockerfile`.

## Building and Testing

### Build Docker Image

```bash
docker build -t typescript-serverless-mcp-starter .
```

To include environment variables at build time:

```bash
docker build \
  --build-arg MCP_ENV_JSON='{"SKEDYUL_ENV":"production"}' \
  -t typescript-serverless-mcp-starter .
```

### Test the Registry

For local testing, you can use AWS SAM CLI or test the handler directly. Here's a simple test using a Node.js script:

```bash
# Build the project first
npm run build

# Test using the included test suite
npm test
```

### AWS SAM Setup

This starter kit includes AWS SAM configuration for local testing and deployment.

**Prerequisites:**
- [Install AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Docker must be running

**1. Build the Docker Image:**
```bash
docker build -t typescript-serverless-mcp-starter:latest .
```

**2. Start Local API with SAM:**
```bash
sam local start-api --docker-network bridge
```

This will:
- Start a local API Gateway on `http://localhost:3000`
- Use the Docker image you built
- Handle all MCP endpoints (`/mcp`, `/health`, `/estimate`)

**3. Alternative: Build and Start in One Command:**
```bash
sam build && sam local start-api
```

**4. Test with SAM Local Invoke (for individual function testing):**
```bash
# Test the health endpoint
sam local invoke McpServerFunction -e events/health-event.json

# Test listing tools
sam local invoke McpServerFunction -e events/mcp-list-event.json

# Test calling the hello-world tool
sam local invoke McpServerFunction -e events/mcp-call-event.json
```


Once the server is running (via SAM or deployed), test the registry with:

**1. Health Check:**
```bash
curl -X GET http://localhost:3000/health
```

**2. List Available Tools:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

**3. Call the hello-world Tool:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "hello-world",
      "arguments": {
        "inputs": {
          "name": "World"
        }
      }
    }
  }'
```

**4. Call hello-world with Custom Name:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "hello-world",
      "arguments": {
        "inputs": {
          "name": "Alice"
        }
      }
    }
  }'
```


