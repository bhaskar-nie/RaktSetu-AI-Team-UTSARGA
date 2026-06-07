import { getAwsConfig, awsNotConfigured } from './config'

async function loadSdk() {
  try {
    return await import('@aws-sdk/client-bedrock-runtime' as any)
  } catch {
    return null
  }
}

export async function invokeClaude({
  prompt,
  maxTokens = 2000,
  temperature = 0.2,
}: {
  prompt: string
  maxTokens?: number
  temperature?: number
}) {
  const cfg = getAwsConfig()
  if (!cfg) return awsNotConfigured()
  const modelId =
    process.env.AWS_BEDROCK_MODEL_ID ||
    'anthropic.claude-3-5-sonnet-20241022-v2:0'
  if (!prompt) {
    return { success: false as const, error: 'prompt is required' }
  }
  const sdk = await loadSdk()
  if (!sdk) {
    return { success: false as const, error: 'AWS SDK not installed. Run npm install to add @aws-sdk packages.' }
  }
  try {
    const client = new sdk.BedrockRuntimeClient(cfg)
    const body = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: prompt }],
        },
      ],
    }
    const result = await client.send(
      new sdk.InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(body),
      })
    )
    const raw = new TextDecoder().decode(result.body)
    let parsed: any = {}
    try {
      parsed = JSON.parse(raw)
    } catch {
      return {
        success: false as const,
        error: 'Failed to parse Bedrock response',
      }
    }
    const text =
      Array.isArray(parsed?.content) && parsed.content[0]?.text
        ? parsed.content[0].text
        : ''
    return { success: true as const, data: { text, raw: parsed } }
  } catch (err: any) {
    return { success: false as const, error: err?.message || 'Bedrock invoke failed' }
  }
}
