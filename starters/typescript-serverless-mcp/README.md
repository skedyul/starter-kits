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


