import { getAwsConfig, awsNotConfigured } from './config'

async function loadSdk() {
  try {
    return await import('@aws-sdk/client-ses' as any)
  } catch {
    return null
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text?: string
}) {
  const cfg = getAwsConfig()
  if (!cfg) return awsNotConfigured()
  const from = process.env.AWS_SES_FROM_EMAIL || process.env.APP_AWS_SES_FROM_EMAIL
  if (!from) {
    return {
      success: false as const,
      error: 'AWS_SES_FROM_EMAIL / APP_AWS_SES_FROM_EMAIL is not set in .env.local',
    }
  }
  if (!to || !subject || !html) {
    return { success: false as const, error: 'to, subject, html are required' }
  }
  const sdk = await loadSdk()
  if (!sdk) {
    return { success: false as const, error: 'AWS SDK not installed. Run npm install to add @aws-sdk packages.' }
  }
  try {
    const client = new sdk.SESClient(cfg)
    const result = await client.send(
      new sdk.SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: html, Charset: 'UTF-8' },
            ...(text ? { Text: { Data: text, Charset: 'UTF-8' } } : {}),
          },
        },
      })
    )
    return {
      success: true as const,
      data: { messageId: result.MessageId || '' },
    }
  } catch (err: any) {
    return { success: false as const, error: err?.message || 'SES send failed' }
  }
}
