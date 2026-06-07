import { NextResponse } from 'next/server'
import { authMiddleware } from 'lyzr-architect'
import { uploadFile, getPresignedDownloadUrl } from '@/lib/aws/s3'

export const dynamic = 'force-dynamic'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export const POST = authMiddleware(async (req) => {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const prefix = (formData.get('prefix') as string) || 'uploads'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Max 10MB allowed.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const safeName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
    const key = `${prefix}/${Date.now()}-${safeName}`
    const contentType = file.type || 'application/octet-stream'

    const upResult = await uploadFile(key, buffer, contentType)
    if (!upResult.success) {
      return NextResponse.json(upResult, { status: 500 })
    }
    const urlResult = await getPresignedDownloadUrl(key)
    const url = urlResult.success ? urlResult.data.url : ''

    return NextResponse.json({ success: true, data: { key, url } })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Upload failed' },
      { status: 500 }
    )
  }
})
