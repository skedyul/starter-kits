#!/usr/bin/env node

// MCP Server entrypoint for the dedicated Node.js 22 runtime.
// This is a TypeScript port of the production MCP server, simplified to use
// a static registry defined in `src/registry.ts`.

import http from 'http'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { registry, type ToolName } from '../registry'

// ----- Request counting & TTL (adapted from endpoint.js) -----

let requestCount = 0
let lastRequestTime = Date.now()
const maxRequests = process.env.MCP_MAX_REQUESTS
  ? Number.parseInt(process.env.MCP_MAX_REQUESTS, 10)
  : null
const ttlExtendSeconds = process.env.MCP_TTL_EXTEND
  ? Number.parseInt(process.env.MCP_TTL_EXTEND, 10)
  : 3600

function extendTTL() {
  lastRequestTime = Date.now()
}

function incrementRequestCount() {
  requestCount += 1
  extendTTL()
}

function getHealthStatus() {
  const requestsRemaining =
    maxRequests !== null ? Math.max(0, maxRequests - requestCount) : null

  return {
    status: 'running',
    requests: requestCount,
    maxRequests,
    requestsRemaining,
    lastRequestTime,
    ttlExtendSeconds,
  }
}

function shouldShutdown() {
  if (maxRequests !== null && requestCount >= maxRequests) {
    return true
  }
  return false
}

// ----- Main initialization -----
;(async () => {
  // Merge baked-in env (MCP_ENV_JSON) and runtime env (MCP_ENV) like production
  const bakedEnv = process.env.MCP_ENV_JSON
    ? JSON.parse(process.env.MCP_ENV_JSON)
    : {}
  const runtimeEnv = process.env.MCP_ENV ? JSON.parse(process.env.MCP_ENV) : {}
  const env = { ...bakedEnv, ...runtimeEnv }
  Object.assign(process.env, env)

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
      name: 'dynamic-mcp-server',
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

    // Increment request count & check for shutdown
    incrementRequestCount()
    if (shouldShutdown()) {
      // eslint-disable-next-line no-console
      console.log('Max requests reached, shutting down...')
      setTimeout(() => process.exit(0), 1000)
    }

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

  // Handle tool call request (MCP transport path, if used)
  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    callTool(request.params.name, request.params.arguments),
  )

  // ----- HTTP server (health + MCP JSON-RPC) -----

  const port = Number.parseInt(process.env.PORT ?? '3000', 10)

  function parseJSONBody(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk.toString()
      })
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {})
        } catch (err) {
          reject(err)
        }
      })
      req.on('error', reject)
    })
  }

  function sendJSON(
    res: http.ServerResponse,
    statusCode: number,
    data: unknown,
  ) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  }

  const httpServer = http.createServer(async (req, res) => {
    try {
      const url = new URL(
        req.url || '/',
        `http://${req.headers.host || 'localhost'}`,
      )
      const pathname = url.pathname

      // Health endpoint
      if (pathname === '/health' && req.method === 'GET') {
        sendJSON(res, 200, getHealthStatus())
        return
      }

      // MCP endpoint - handle JSON-RPC requests
      if (pathname === '/mcp' && req.method === 'POST') {
        let body: any
        try {
          body = (await parseJSONBody(req)) as any
        } catch {
          sendJSON(res, 400, {
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32700,
              message: 'Parse error',
            },
          })
          return
        }

        try {
          const { jsonrpc, id, method, params } = body

          if (jsonrpc !== '2.0') {
            sendJSON(res, 400, {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32600,
                message: 'Invalid Request',
              },
            })
            return
          }

          let result: unknown

          if (method === 'tools/list') {
            result = { tools }
          } else if (method === 'tools/call') {
            result = await callTool(params?.name, params?.arguments)
          } else {
            sendJSON(res, 200, {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32601,
                message: `Method not found: ${method}`,
              },
            })
            return
          }

          sendJSON(res, 200, {
            jsonrpc: '2.0',
            id,
            result,
          })
        } catch (err) {
          sendJSON(res, 500, {
            jsonrpc: '2.0',
            id: body?.id ?? null,
            error: {
              code: -32603,
              message: err instanceof Error ? err.message : String(err ?? ''),
            },
          })
        }
        return
      }

      // 404 for other routes
      sendJSON(res, 404, {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32601,
          message: 'Not Found',
        },
      })
    } catch (err) {
      sendJSON(res, 500, {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: err instanceof Error ? err.message : String(err ?? ''),
        },
      })
    }
  })

  httpServer.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`MCP Server running on port ${port}`)
    // eslint-disable-next-line no-console
    console.log(
      `Registry loaded with ${tools.length} tools: ${tools
        .map((t) => t.name)
        .join(', ')}`,
    )
  })
})()
