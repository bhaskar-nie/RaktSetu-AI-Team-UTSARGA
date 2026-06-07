import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    region: process.env.AWS_REGION || null,
    credentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    s3_bucket: !!process.env.AWS_S3_BUCKET,
    ses_from: !!process.env.AWS_SES_FROM_EMAIL,
    bedrock_model: !!process.env.AWS_BEDROCK_MODEL_ID,
  })
}
