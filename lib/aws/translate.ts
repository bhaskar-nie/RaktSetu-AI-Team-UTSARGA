import { getAwsConfig, awsNotConfigured } from './config'

async function loadSdk() {
  try {
    return await import('@aws-sdk/client-translate' as any)
  } catch {
    return null
  }
}

export async function translateText({
  text,
  sourceLang = 'auto',
  targetLang,
}: {
  text: string
  sourceLang?: string
  targetLang: string
}) {
  const cfg = getAwsConfig()
  if (!cfg) return awsNotConfigured()
  if (!text || !text.trim()) {
    return { success: false as const, error: 'text is required' }
  }
  if (!targetLang) {
    return { success: false as const, error: 'targetLang is required' }
  }
  const sdk = await loadSdk()
  if (!sdk) {
    return {
      success: false as const,
      error: 'AWS SDK not installed. Run npm install to add @aws-sdk packages.',
    }
  }
  try {
    const client = new sdk.TranslateClient(cfg)
    const result = await client.send(
      new sdk.TranslateTextCommand({
        Text: text,
        SourceLanguageCode: sourceLang || 'auto',
        TargetLanguageCode: targetLang,
      })
    )
    return {
      success: true as const,
      data: {
        translatedText: result?.TranslatedText || '',
        sourceLang: result?.SourceLanguageCode || sourceLang,
        targetLang,
      },
    }
  } catch (err: any) {
    return {
      success: false as const,
      error: err?.message || 'Translate failed',
    }
  }
}
