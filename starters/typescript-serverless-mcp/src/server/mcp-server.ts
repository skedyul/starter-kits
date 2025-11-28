import { server } from 'skedyul'
import type { ServerlessServerInstance } from 'skedyul'
import { registry } from '../registry'

const skedyulServer = server.create(
  {
    computeLayer: 'serverless',
    metadata: {
      name: 'typescript-serverless-mcp-starter',
      version: '1.0.0',
    },
  },
  registry,
)

const serverless = skedyulServer as ServerlessServerInstance

export const handler = serverless.handler
