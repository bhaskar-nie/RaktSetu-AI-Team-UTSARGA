export function getAwsConfig() {
  const region = process.env.AWS_REGION || 'us-east-1'
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  if (!accessKeyId || !secretAccessKey) return null
  return { region, credentials: { accessKeyId, secretAccessKey } }
}

export function awsNotConfigured() {
  return {
    success: false as const,
    error:
      'AWS not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION in .env.local',
  }
}
