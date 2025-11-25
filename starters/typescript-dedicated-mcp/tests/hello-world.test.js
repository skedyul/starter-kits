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
})


