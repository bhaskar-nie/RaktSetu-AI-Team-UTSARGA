import { getAwsConfig, awsNotConfigured } from './config'

async function loadSdk() {
  try {
    const s3 = await import('@aws-sdk/client-s3' as any)
    const pre = await import('@aws-sdk/s3-request-presigner' as any)
    return { s3, pre }
  } catch {
    return null
  }
}

async function getClient() {
  const cfg = getAwsConfig()
  if (!cfg) return null
  const sdk = await loadSdk()
  if (!sdk) return null
  return { client: new sdk.s3.S3Client(cfg), sdk }
}

function getBucket() {
  return process.env.AWS_S3_BUCKET || ''
}

function sdkMissing() {
  return { success: false as const, error: 'AWS SDK not installed. Run npm install to add @aws-sdk packages.' }
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string
) {
  const cfg = getAwsConfig()
  if (!cfg) return awsNotConfigured()
  const Bucket = getBucket()
  if (!Bucket) {
    return { success: false as const, error: 'AWS_S3_BUCKET is not set in .env.local' }
  }
  const ctx = await getClient()
  if (!ctx) return sdkMissing()
  try {
    await ctx.client.send(
      new ctx.sdk.s3.PutObjectCommand({
        Bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    )
    return { success: true as const, data: { key, bucket: Bucket } }
  } catch (err: any) {
    return { success: false as const, error: err?.message || 'S3 upload failed' }
  }
}

export async function getPresignedDownloadUrl(key: string, expiresInSeconds = 3600) {
  const cfg = getAwsConfig()
  if (!cfg) return awsNotConfigured()
  const Bucket = getBucket()
  if (!Bucket) {
    return { success: false as const, error: 'AWS_S3_BUCKET is not set in .env.local' }
  }
  const ctx = await getClient()
  if (!ctx) return sdkMissing()
  try {
    const url = await ctx.sdk.pre.getSignedUrl(
      ctx.client,
      new ctx.sdk.s3.GetObjectCommand({ Bucket, Key: key }),
      { expiresIn: expiresInSeconds }
    )
    return { success: true as const, data: { url } }
  } catch (err: any) {
    return { success: false as const, error: err?.message || 'Failed to sign URL' }
  }
}

export async function listFiles(prefix?: string) {
  const cfg = getAwsConfig()
  if (!cfg) return awsNotConfigured()
  const Bucket = getBucket()
  if (!Bucket) {
    return { success: false as const, error: 'AWS_S3_BUCKET is not set in .env.local' }
  }
  const ctx = await getClient()
  if (!ctx) return sdkMissing()
  try {
    const result = await ctx.client.send(
      new ctx.sdk.s3.ListObjectsV2Command({
        Bucket,
        Prefix: prefix && prefix.length > 0 ? prefix : undefined,
        MaxKeys: 200,
      })
    )
    const items = Array.isArray(result.Contents) ? result.Contents : []
    const files = items.map((item: any) => ({
      key: item.Key || '',
      size: item.Size || 0,
      lastModified: item.LastModified ? item.LastModified.toISOString() : '',
    }))
    return { success: true as const, data: { files } }
  } catch (err: any) {
    return { success: false as const, error: err?.message || 'Failed to list files' }
  }
}

export async function deleteFile(key: string) {
  const cfg = getAwsConfig()
  if (!cfg) return awsNotConfigured()
  const Bucket = getBucket()
  if (!Bucket) {
    return { success: false as const, error: 'AWS_S3_BUCKET is not set in .env.local' }
  }
  const ctx = await getClient()
  if (!ctx) return sdkMissing()
  try {
    await ctx.client.send(new ctx.sdk.s3.DeleteObjectCommand({ Bucket, Key: key }))
    return { success: true as const, data: { key } }
  } catch (err: any) {
    return { success: false as const, error: err?.message || 'Failed to delete file' }
  }
}
