import { getAwsConfig, awsNotConfigured } from './config'

async function loadPolly() {
  try {
    return await import('@aws-sdk/client-polly' as any)
  } catch {
    return null
  }
}
async function loadS3() {
  try {
    return await import('@aws-sdk/client-s3' as any)
  } catch {
    return null
  }
}
async function loadPresigner() {
  try {
    return await import('@aws-sdk/s3-request-presigner' as any)
  } catch {
    return null
  }
}

const VOICE_MAP: Record<string, string> = {
  english: 'Joanna',
  en: 'Joanna',
  hindi: 'Aditi',
  hi: 'Aditi',
  tamil: 'Raveena',
  ta: 'Raveena',
  telugu: 'Raveena',
  te: 'Raveena',
  bengali: 'Raveena',
  bn: 'Raveena',
  kannada: 'Raveena',
  kn: 'Raveena',
  marathi: 'Aditi',
  mr: 'Aditi',
}

function mapVoice(language: string, override?: string): string {
  if (override && override.trim()) return override
  const key = (language || 'english').toLowerCase().trim()
  return VOICE_MAP[key] || 'Joanna'
}

function mapLangCode(language: string): string {
  const k = (language || '').toLowerCase().trim()
  if (k === 'hindi' || k === 'hi') return 'hi-IN'
  return 'en-US'
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  if (!stream) return Buffer.from([])
  if (typeof stream.transformToByteArray === 'function') {
    const bytes = await stream.transformToByteArray()
    return Buffer.from(bytes)
  }
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', (e: any) => reject(e))
  })
}

export async function synthesizeSpeech({
  text,
  language = 'en',
  voiceId,
}: {
  text: string
  language?: string
  voiceId?: string
}) {
  const cfg = getAwsConfig()
  if (!cfg) return awsNotConfigured()
  if (!text || !text.trim()) {
    return { success: false as const, error: 'text is required' }
  }
  const bucket = process.env.AWS_S3_BUCKET || process.env.APP_AWS_S3_BUCKET
  if (!bucket) {
    return {
      success: false as const,
      error: 'AWS_S3_BUCKET / APP_AWS_S3_BUCKET not configured in .env.local',
    }
  }
  const pollySdk = await loadPolly()
  const s3Sdk = await loadS3()
  const presignSdk = await loadPresigner()
  if (!pollySdk || !s3Sdk || !presignSdk) {
    return {
      success: false as const,
      error: 'Required AWS SDKs not installed (polly, s3, s3-request-presigner).',
    }
  }
  try {
    const mappedVoice = mapVoice(language, voiceId)
    const langCode = mapLangCode(language)
    const polly = new pollySdk.PollyClient(cfg)
    const result = await polly.send(
      new pollySdk.SynthesizeSpeechCommand({
        OutputFormat: 'mp3',
        Text: text,
        VoiceId: mappedVoice,
        Engine: 'standard',
        LanguageCode: langCode,
      })
    )
    const audioBuf = await streamToBuffer(result?.AudioStream)
    if (!audioBuf.length) {
      return { success: false as const, error: 'Polly returned empty audio' }
    }
    const key = `polly-tts/${Date.now()}.mp3`
    const s3 = new s3Sdk.S3Client(cfg)
    await s3.send(
      new s3Sdk.PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: audioBuf,
        ContentType: 'audio/mpeg',
      })
    )
    const audioUrl = await presignSdk.getSignedUrl(
      s3,
      new s3Sdk.GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 3600 }
    )
    return {
      success: true as const,
      data: {
        audioUrl,
        key,
        voiceId: mappedVoice,
        language: langCode,
      },
    }
  } catch (err: any) {
    return {
      success: false as const,
      error: err?.message || 'Polly synthesis failed',
    }
  }
}
