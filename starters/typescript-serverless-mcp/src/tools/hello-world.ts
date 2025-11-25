import type { ToolContext, ToolHandler } from '../registry'

export interface HelloWorldInput {
  name?: string
}

export interface HelloWorldOutput {
  message: string
  environmentName: string
}

// Example tool demonstrating use of inputs and environment variables.
// It reads an optional "name" from input and a "SKEDYUL_ENV" from env.
export const helloWorld: ToolHandler<HelloWorldInput, HelloWorldOutput> = async ({
  input,
  context,
}: {
  input: HelloWorldInput
  context: ToolContext
}) => {
  const name = input.name?.trim() || 'world'
  const environmentName = context.env.SKEDYUL_ENV ?? 'local'

  return {
    message: `Hello, ${name}! This response is coming from the serverless MCP starter.`,
    environmentName,
  }
}


