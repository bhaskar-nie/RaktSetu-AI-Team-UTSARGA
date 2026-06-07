import { getAwsConfig, awsNotConfigured } from './config'

async function loadSdk() {
  try {
    return await import('@aws-sdk/client-sns' as any)
  } catch {
    return null
  }
}

export async function sendSMS({
  phoneNumber,
  message,
}: {
  phoneNumber: string
  message: string
}) {
  const cfg = getAwsConfig()
  if (!cfg) return awsNotConfigured()
  if (!phoneNumber || !message) {
    return { success: false as const, error: 'phoneNumber and message are required' }
  }
  if (!phoneNumber.startsWith('+')) {
    return {
      success: false as const,
      error: 'Phone number must be in E.164 format (start with +, e.g. +91XXXXXXXXXX)',
    }
  }
  const sdk = await loadSdk()
  if (!sdk) {
    return { success: false as const, error: 'AWS SDK not installed. Run npm install to add @aws-sdk packages.' }
  }
  try {
    const client = new sdk.SNSClient(cfg)
    const result = await client.send(
      new sdk.PublishCommand({
        PhoneNumber: phoneNumber,
        Message: message,
      })
    )
    return {
      success: true as const,
      data: { messageId: result.MessageId || '' },
    }
  } catch (err: any) {
    return { success: false as const, error: err?.message || 'SNS publish failed' }
  }
}

export async function publishToTopic({
  message,
  subject,
}: {
  message: string
  subject?: string
}) {
  const cfg = getAwsConfig()
  if (!cfg) return awsNotConfigured()
  const topicArn = process.env.AWS_SNS_TOPIC_ARN || process.env.APP_AWS_SNS_TOPIC_ARN
  if (!topicArn) {
    return {
      success: false as const,
      error: 'AWS_SNS_TOPIC_ARN / APP_AWS_SNS_TOPIC_ARN is not set in .env.local',
    }
  }
  if (!message) {
    return { success: false as const, error: 'message is required' }
  }
  const sdk = await loadSdk()
  if (!sdk) {
    return { success: false as const, error: 'AWS SDK not installed. Run npm install to add @aws-sdk packages.' }
  }
  try {
    const client = new sdk.SNSClient(cfg)
    const result = await client.send(
      new sdk.PublishCommand({
        TopicArn: topicArn,
        Message: message,
        ...(subject ? { Subject: subject.slice(0, 100) } : {}),
      })
    )
    return {
      success: true as const,
      data: { messageId: result.MessageId || '', topicArn },
    }
  } catch (err: any) {
    return { success: false as const, error: err?.message || 'SNS topic publish failed' }
  }
}
