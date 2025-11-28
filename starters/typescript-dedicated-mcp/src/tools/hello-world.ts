import type { ToolContext, ToolHandler } from 'skedyul'

export interface HelloWorldInput {
  name?: string
}

export interface HelloWorldOutput {
  message: string
}

const RATE_PER_CHARACTER = 0.75

// Example tool demonstrating inputs, environment variables, and billing.
export const helloWorld: ToolHandler<HelloWorldInput, HelloWorldOutput> = async ({
  input,
  context,
}) => {
  const name = input.name?.trim() || 'world'
  const environmentName = context.env.SKEDYUL_ENV ?? 'local'
  const characters = name.length
  const credits = characters * RATE_PER_CHARACTER

  const prefix =
    context.mode === 'estimate'
      ? 'Estimate-ready greeting'
      : 'Dedicated hello'

  return {
    output: {
      message: `${prefix}, ${name}!`,
    },
    billing: {
      credits,
    },
  }
}


