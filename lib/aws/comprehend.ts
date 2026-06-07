import { getAwsConfig, awsNotConfigured } from './config'

async function loadSdk() {
  try {
    return await import('@aws-sdk/client-comprehend' as any)
  } catch {
    return null
  }
}

type Intent = 'confirm' | 'decline' | 'reschedule' | 'question' | 'unknown'

function classifyIntent(text: string, sentiment: string): Intent {
  const t = (text || '').toString()
  if (/yes|confirm|will be there|on my way|coming|ok\b|sure|done|absolutely/i.test(t)) return 'confirm'
  if (/no\b|can't|cannot|won't|unable|busy|sick/i.test(t)) return 'decline'
  if (/reschedule|postpone|later|tomorrow|next|delay|move/i.test(t)) return 'reschedule'
  if (/\?|what|when|where|how|why|which|can you/i.test(t)) return 'question'
  const s = (sentiment || '').toUpperCase()
  if (s === 'POSITIVE') return 'confirm'
  if (s === 'NEGATIVE') return 'decline'
  return 'unknown'
}

export async function detectIntent({
  text,
  languageCode = 'en',
}: {
  text: string
  languageCode?: string
}) {
  const cfg = getAwsConfig()
  if (!cfg) return awsNotConfigured()
  if (!text || !text.trim()) {
    return { success: false as const, error: 'text is required' }
  }
  const sdk = await loadSdk()
  if (!sdk) {
    return {
      success: false as const,
      error: 'AWS SDK not installed. Run npm install to add @aws-sdk packages.',
    }
  }
  try {
    const client = new sdk.ComprehendClient(cfg)
    const [sentRes, kpRes] = await Promise.all([
      client.send(
        new sdk.DetectSentimentCommand({
          Text: text,
          LanguageCode: languageCode || 'en',
        })
      ),
      client.send(
        new sdk.DetectKeyPhrasesCommand({
          Text: text,
          LanguageCode: languageCode || 'en',
        })
      ),
    ])
    const sentiment = sentRes?.Sentiment || 'NEUTRAL'
    const sentimentScores = sentRes?.SentimentScore || {}
    const phrases: string[] = Array.isArray(kpRes?.KeyPhrases)
      ? kpRes.KeyPhrases.map((p: any) => String(p?.Text || '')).filter(Boolean)
      : []
    const intent = classifyIntent(text, sentiment)
    return {
      success: true as const,
      data: {
        intent,
        sentiment,
        sentimentScores,
        keyPhrases: phrases,
      },
    }
  } catch (err: any) {
    return {
      success: false as const,
      error: err?.message || 'Comprehend detect failed',
    }
  }
}
