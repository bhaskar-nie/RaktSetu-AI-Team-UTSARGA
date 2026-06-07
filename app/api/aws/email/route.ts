import { NextResponse } from 'next/server'
import { authMiddleware } from 'lyzr-architect'
import { sendEmail } from '@/lib/aws/ses'

export const dynamic = 'force-dynamic'

export const POST = authMiddleware(async (req) => {
  try {
    const body = await req.json()
    const to = String(body?.to || '').trim()
    const subject = String(body?.subject || '').trim()
    const html = String(body?.html || '').trim()
    const text = body?.text ? String(body.text) : undefined

    if (!to || !subject || !html) {
      return NextResponse.json(
        { success: false, error: 'to, subject, html are required' },
        { status: 400 }
      )
    }
    const result = await sendEmail({ to, subject, html, text })
    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }
    return NextResponse.json({ success: true, data: result.data })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Email send failed' },
      { status: 500 }
    )
  }
})
