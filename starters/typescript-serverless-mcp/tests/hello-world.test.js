const test = require('node:test')
const assert = require('node:assert/strict')

// Import the compiled registry (built to dist/)
const { registry } = require('../dist/registry.js')

test('hello-world uses SKEDYUL_ENV and input name', async () => {
  const fn = registry['hello-world']
  assert.equal(typeof fn, 'function')

  const result = await fn({
    input: { name: 'Tester' },
    context: {
      env: {
        SKEDYUL_ENV: 'TEST',
      },
    },
  })

  assert.equal(result.environmentName, 'TEST')
  assert.ok(
    typeof result.message === 'string' && result.message.includes('Tester'),
  )
  assert.ok(result.message.includes('serverless MCP starter'))
})

test('hello-world defaults to "world" when name is empty', async () => {
  const fn = registry['hello-world']
  
  const result = await fn({
    input: {},
    context: {
      env: {
        SKEDYUL_ENV: 'TEST',
      },
    },
  })

  assert.ok(result.message.includes('world'))
})

test('hello-world defaults to "local" environment when SKEDYUL_ENV not set', async () => {
  const fn = registry['hello-world']
  
  const result = await fn({
    input: { name: 'Tester' },
    context: {
      env: {},
    },
  })

  assert.equal(result.environmentName, 'local')
})

