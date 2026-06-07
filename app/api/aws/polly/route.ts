import { NextResponse } from 'next/server'
import { authMiddleware } from 'lyzr-architect'
import { synthesizeSpeech } from '@/lib/aws/polly'

export const dynamic = 'force-dynamic'

export const POST = authMiddleware(async (req) => {
  try {
    const body = await req.json()
    const text = String(body?.text || '').trim()
    const language = body?.language ? String(body.language) : 'en'
    if (!text) {
      return NextResponse.json(
        { success: false, error: 'text is required' },
        { status: 400 }
      )
    }
    if (text.length > 3000) {
      return NextResponse.json(
        { success: false, error: 'text must be 3000 characters or less (Polly limit)' },
        { status: 400 }
      )
    }
    const result = await synthesizeSpeech({ text, language })
    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }
    return NextResponse.json({ success: true, data: result.data })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Polly route failed' },
      { status: 500 }
    )
  }
})
