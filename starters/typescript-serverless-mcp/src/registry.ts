import { helloWorld } from './tools/hello-world'
import type { ToolHandler, ToolRegistry } from 'skedyul'

export const registry: ToolRegistry = {
  'hello-world': helloWorld as ToolHandler<unknown, unknown>,
}

export type ToolName = keyof typeof registry

export type { ToolContext, ToolHandler } from 'skedyul'