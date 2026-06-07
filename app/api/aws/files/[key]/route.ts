import { NextResponse } from 'next/server'
import { authMiddleware } from 'lyzr-architect'
import { deleteFile } from '@/lib/aws/s3'

export const dynamic = 'force-dynamic'

export const DELETE = authMiddleware(async (_req, { params }: any) => {
  try {
    const rawKey = params?.key
    if (!rawKey) {
      return NextResponse.json(
        { success: false, error: 'key is required' },
        { status: 400 }
      )
    }
    const key = decodeURIComponent(rawKey)
    const result = await deleteFile(key)
    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }
    return NextResponse.json({ success: true, data: result.data })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Delete failed' },
      { status: 500 }
    )
  }
})
