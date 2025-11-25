const test = require('node:test')
const assert = require('node:assert/strict')

// Import the compiled Lambda handler (built to dist/)
const { handler } = require('../dist/server/mcp-server.js')

// Helper to create API Gateway event
function createAPIGatewayEvent(options = {}) {
  return {
    httpMethod: options.method || 'GET',
    path: options.path || '/',
    headers: options.headers || {},
    body: options.body || null,
    queryStringParameters: options.queryStringParameters || null,
    requestContext: {
      requestId: options.requestId || 'test-request-id',
    },
  }
}

test('health endpoint returns 200 with status', async () => {
  const event = createAPIGatewayEvent({
    method: 'GET',
    path: '/health',
  })

  const response = await handler(event)

  assert.equal(response.statusCode, 200)
  assert.ok(response.headers['Content-Type'].includes('application/json'))
  
  const body = JSON.parse(response.body)
  assert.equal(body.status, 'running')
  assert.equal(body.runtime, 'lambda')
  assert.ok(Array.isArray(body.tools))
})

test('CORS preflight returns 200', async () => {
  const event = createAPIGatewayEvent({
    method: 'OPTIONS',
    path: '/mcp',
  })

  const response = await handler(event)

  assert.equal(response.statusCode, 200)
  assert.ok(response.headers['Access-Control-Allow-Origin'])
  assert.ok(response.headers['Access-Control-Allow-Methods'])
})

test('tools/list returns available tools', async () => {
  const event = createAPIGatewayEvent({
    method: 'POST',
    path: '/mcp',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    }),
  })

  const response = await handler(event)

  assert.equal(response.statusCode, 200)
  
  const body = JSON.parse(response.body)
  assert.equal(body.jsonrpc, '2.0')
  assert.equal(body.id, 1)
  assert.ok(body.result)
  assert.ok(Array.isArray(body.result.tools))
  assert.ok(body.result.tools.some(tool => tool.name === 'hello-world'))
})

test('tools/call executes hello-world tool', async () => {
  const event = createAPIGatewayEvent({
    method: 'POST',
    path: '/mcp',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'hello-world',
        arguments: {
          inputs: {
            name: 'TestUser',
          },
        },
      },
    }),
  })

  const response = await handler(event)

  assert.equal(response.statusCode, 200)
  
  const body = JSON.parse(response.body)
  assert.equal(body.jsonrpc, '2.0')
  assert.equal(body.id, 2)
  assert.ok(body.result)
  assert.ok(Array.isArray(body.result.content))
  
  const resultText = JSON.parse(body.result.content[0].text)
  assert.ok(resultText.message.includes('TestUser'))
})

test('tools/call with custom env overrides environment', async () => {
  const event = createAPIGatewayEvent({
    method: 'POST',
    path: '/mcp',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'hello-world',
        arguments: {
          inputs: {
            name: 'EnvTest',
          },
          env: {
            SKEDYUL_ENV: 'custom-environment',
          },
        },
      },
    }),
  })

  const response = await handler(event)

  assert.equal(response.statusCode, 200)
  
  const body = JSON.parse(response.body)
  const resultText = JSON.parse(body.result.content[0].text)
  assert.equal(resultText.environmentName, 'custom-environment')
})

test('invalid JSON-RPC version returns error', async () => {
  const event = createAPIGatewayEvent({
    method: 'POST',
    path: '/mcp',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '1.0',
      id: 4,
      method: 'tools/list',
    }),
  })

  const response = await handler(event)

  assert.equal(response.statusCode, 400)
  
  const body = JSON.parse(response.body)
  assert.ok(body.error)
  assert.equal(body.error.code, -32600)
})

test('invalid tool name returns error', async () => {
  const event = createAPIGatewayEvent({
    method: 'POST',
    path: '/mcp',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'nonexistent-tool',
        arguments: {},
      },
    }),
  })

  const response = await handler(event)

  assert.equal(response.statusCode, 500)
  
  const body = JSON.parse(response.body)
  assert.ok(body.error)
  assert.ok(body.error.message.includes('not found'))
})

test('unknown method returns method not found error', async () => {
  const event = createAPIGatewayEvent({
    method: 'POST',
    path: '/mcp',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 6,
      method: 'unknown/method',
      params: {},
    }),
  })

  const response = await handler(event)

  assert.equal(response.statusCode, 200)
  
  const body = JSON.parse(response.body)
  assert.ok(body.error)
  assert.equal(body.error.code, -32601)
})

test('invalid path returns 404', async () => {
  const event = createAPIGatewayEvent({
    method: 'GET',
    path: '/invalid',
  })

  const response = await handler(event)

  assert.equal(response.statusCode, 404)
})

test('malformed JSON returns parse error', async () => {
  const event = createAPIGatewayEvent({
    method: 'POST',
    path: '/mcp',
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid json}',
  })

  const response = await handler(event)

  assert.equal(response.statusCode, 400)
  
  const body = JSON.parse(response.body)
  assert.ok(body.error)
  assert.equal(body.error.code, -32700)
})

