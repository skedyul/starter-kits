import { helloWorld } from './tools/hello-world'
import type { ToolHandler } from 'skedyul'

export type ToolRegistry = typeof registry
export type ToolName = keyof ToolRegistry

export const registry = {
  'hello-world': helloWorld,
} satisfies Record<string, ToolHandler<unknown, unknown>>

export type { ToolContext, ToolHandler } from 'skedyul'