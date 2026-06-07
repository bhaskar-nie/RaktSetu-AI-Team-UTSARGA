import { NextResponse } from 'next/server'
import { authMiddleware } from 'lyzr-architect'
import { translateText } from '@/lib/aws/translate'

export const dynamic = 'force-dynamic'

export const POST = authMiddleware(async (req) => {
  try {
    const body = await req.json()
    const text = String(body?.text || '').trim()
    const sourceLang = body?.sourceLang ? String(body.sourceLang) : 'auto'
    const targetLang = String(body?.targetLang || '').trim()
    if (!text) {
      return NextResponse.json(
        { success: false, error: 'text is required' },
        { status: 400 }
      )
    }
    if (!targetLang) {
      return NextResponse.json(
        { success: false, error: 'targetLang is required' },
        { status: 400 }
      )
    }
    const result = await translateText({ text, sourceLang, targetLang })
    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }
    return NextResponse.json({ success: true, data: result.data })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Translate route failed' },
      { status: 500 }
    )
  }
})
