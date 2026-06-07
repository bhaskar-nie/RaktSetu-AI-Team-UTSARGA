import { NextResponse } from 'next/server'
import { authMiddleware } from 'lyzr-architect'
import { listFiles, getPresignedDownloadUrl } from '@/lib/aws/s3'

export const dynamic = 'force-dynamic'

export const GET = authMiddleware(async (req) => {
  try {
    const { searchParams } = new URL(req.url)
    const prefix = searchParams.get('prefix') || undefined

    const result = await listFiles(prefix)
    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }
    const filesList = Array.isArray(result.data?.files) ? result.data.files : []
    const enriched = await Promise.all(
      filesList.map(async (f) => {
        const signed = await getPresignedDownloadUrl(f.key)
        return {
          ...f,
          presignedUrl: signed.success ? signed.data.url : '',
        }
      })
    )
    return NextResponse.json({ success: true, data: { files: enriched } })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'List failed' },
      { status: 500 }
    )
  }
})
