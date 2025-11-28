import { server } from 'skedyul'
import type { DedicatedServerInstance } from 'skedyul'
import { registry } from '../registry'

const skedyulServer = server.create(
  {
    computeLayer: 'dedicated',
    metadata: {
      name: 'typescript-dedicated-mcp-starter',
      version: '1.0.0',
    },
  },
  registry,
)

const dedicatedServer = skedyulServer as DedicatedServerInstance

dedicatedServer.listen().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start MCP server', error)
})
