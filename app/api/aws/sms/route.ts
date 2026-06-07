import { NextResponse } from 'next/server'
import { authMiddleware } from 'lyzr-architect'
import { sendSMS, publishToTopic } from '@/lib/aws/sns'

export const dynamic = 'force-dynamic'

export const POST = authMiddleware(async (req) => {
  try {
    const body = await req.json()
    const mode = String(body?.mode || 'direct').trim()
    const message = String(body?.message || '').trim()

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'message is required' },
        { status: 400 }
      )
    }

    if (mode === 'topic') {
      const subject = body?.subject ? String(body.subject) : undefined
      const result = await publishToTopic({ message, subject })
      if (!result.success) {
        return NextResponse.json(result, { status: 500 })
      }
      return NextResponse.json({ success: true, data: result.data })
    }

    const phoneNumber = String(body?.phoneNumber || '').trim()
    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'phoneNumber is required for direct SMS' },
        { status: 400 }
      )
    }
    const result = await sendSMS({ phoneNumber, message })
    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }
    return NextResponse.json({ success: true, data: result.data })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'SMS send failed' },
      { status: 500 }
    )
  }
})
