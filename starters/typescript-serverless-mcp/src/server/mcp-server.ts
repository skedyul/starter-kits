#!/usr/bin/env node

// MCP Server entrypoint for the AWS Lambda (serverless) runtime.
// This is a TypeScript implementation adapted for Lambda with API Gateway integration.

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { registry, type ToolName } from '../registry'

// ----- Lambda Event Types -----

interface APIGatewayProxyEvent {
  body: string | null
  headers: Record<string, string>
  httpMethod: string
  path: string
  queryStringParameters: Record<string, string> | null
  requestContext: {
    requestId: string
  }
}

interface APIGatewayProxyResult {
  statusCode: number
  headers?: Record<string, string>
  body: string
}

// ----- Request counting -----

let requestCount = 0

function incrementRequestCount() {
  requestCount += 1
}

// ----- Environment setup -----

// Merge baked-in env (MCP_ENV_JSON) with runtime env (MCP_ENV)
const bakedEnv = process.env.MCP_ENV_JSON
  ? JSON.parse(process.env.MCP_ENV_JSON)
  : {}
const runtimeEnv = process.env.MCP_ENV ? JSON.parse(process.env.MCP_ENV) : {}
const env = { ...bakedEnv, ...runtimeEnv }
Object.assign(process.env, env)

// ----- MCP Server Setup -----

// Build MCP tool metadata from registry
const tools = Object.keys(registry).map((name) => ({
  name,
  description: `Function: ${name}`,
  inputSchema: {
    type: 'object',
    properties: {
      inputs: {
        type: 'object',
        description: 'Input parameters for the function',
      },
    },
    required: ['inputs'],
  },
}))

const server = new Server(
  {
    name: 'serverless-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
)

async function callTool(
  nameRaw: unknown,
  argsRaw: unknown,
): Promise<{
  content: { type: 'text'; text: string }[]
  isError?: boolean
}> {
  const toolName = String(nameRaw) as ToolName

  if (!registry[toolName]) {
    throw new Error(`Tool "${toolName}" not found in registry`)
  }

  const fn = registry[toolName]
  if (typeof fn !== 'function') {
    throw new Error(`Registry entry "${toolName}" is not a function`)
  }

  incrementRequestCount()

  const args = (argsRaw ??
    {}) as {
    env?: Record<string, string | undefined>
    inputs?: Record<string, unknown>
  }

  // Extract env from request arguments (just-in-time env that overrides container env)
  const requestEnv = args.env ?? {}
  const originalEnv = { ...process.env }
  Object.assign(process.env, requestEnv)

  try {
    const inputs = args.inputs ?? {}

    const functionResult = await Promise.resolve(
      fn({
        input: inputs,
        context: { env: process.env },
      } as never),
    )

    process.env = originalEnv

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(functionResult),
        },
      ],
    }
  } catch (error) {
    process.env = originalEnv
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error:
              error instanceof Error ? error.message : String(error ?? ''),
          }),
        },
      ],
      isError: true,
    }
  }
}

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  }
})

// Handle tool call request
server.setRequestHandler(CallToolRequestSchema, async (request) =>
  callTool(request.params.name, request.params.arguments),
)

// ----- Lambda Handler -----

function createResponse(
  statusCode: number,
  body: unknown,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(body),
  }
}

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const path = event.path
    const method = event.httpMethod

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return createResponse(200, { message: 'OK' })
    }

    // Health endpoint
    if (path === '/health' && method === 'GET') {
      return createResponse(200, {
        status: 'running',
        requests: requestCount,
        runtime: 'lambda',
        tools: tools.map((t) => t.name),
      })
    }

    // MCP endpoint - handle JSON-RPC requests
    if (path === '/mcp' && method === 'POST') {
      let body: any

      try {
        body = event.body ? JSON.parse(event.body) : {}
      } catch {
        return createResponse(400, {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: 'Parse error',
          },
        })
      }

      try {
        const { jsonrpc, id, method: rpcMethod, params } = body

        if (jsonrpc !== '2.0') {
          return createResponse(400, {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32600,
              message: 'Invalid Request',
            },
          })
        }

        let result: unknown

        if (rpcMethod === 'tools/list') {
          result = { tools }
        } else if (rpcMethod === 'tools/call') {
          result = await callTool(params?.name, params?.arguments)
        } else {
          return createResponse(200, {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method not found: ${rpcMethod}`,
            },
          })
        }

        return createResponse(200, {
          jsonrpc: '2.0',
          id,
          result,
        })
      } catch (err) {
        return createResponse(500, {
          jsonrpc: '2.0',
          id: body?.id ?? null,
          error: {
            code: -32603,
            message: err instanceof Error ? err.message : String(err ?? ''),
          },
        })
      }
    }

    // 404 for other routes
    return createResponse(404, {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32601,
        message: 'Not Found',
      },
    })
  } catch (err) {
    return createResponse(500, {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: err instanceof Error ? err.message : String(err ?? ''),
      },
    })
  }
}

// eslint-disable-next-line no-console
console.log(
  `MCP Server loaded with ${tools.length} tools: ${tools
    .map((t) => t.name)
    .join(', ')}`,
)

