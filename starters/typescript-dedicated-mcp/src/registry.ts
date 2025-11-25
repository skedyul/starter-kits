import { helloWorld } from './tools/hello-world'

export interface ToolContext {
  // Limited view of process.env to avoid requiring @types/node
  env: Record<string, string | undefined>
}

export interface ToolParams<Input, Output> {
  input: Input
  context: ToolContext
}

export type ToolHandler<Input, Output> = (
  params: ToolParams<Input, Output>,
) => Promise<Output> | Output

export const registry = {
  'hello-world': helloWorld,
}

export type ToolRegistry = typeof registry
export type ToolName = keyof ToolRegistry


