import { NextResponse } from 'next/server'
import { authMiddleware } from 'lyzr-architect'
import { detectIntent } from '@/lib/aws/comprehend'

export const dynamic = 'force-dynamic'

export const POST = authMiddleware(async (req) => {
  try {
    const body = await req.json()
    const text = String(body?.text || '').trim()
    const languageCode = body?.languageCode ? String(body.languageCode) : 'en'
    if (!text) {
      return NextResponse.json(
        { success: false, error: 'text is required' },
        { status: 400 }
      )
    }
    const result = await detectIntent({ text, languageCode })
    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }
    return NextResponse.json({ success: true, data: result.data })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Comprehend route failed' },
      { status: 500 }
    )
  }
})
