import { NextResponse } from 'next/server'
import { authMiddleware } from 'lyzr-architect'
import { geocodeAddress, haversineDistance } from '@/lib/aws/location'

export const dynamic = 'force-dynamic'

export const POST = authMiddleware(async (req) => {
  try {
    const body = await req.json()
    const action = String(body?.action || '').trim()
    if (action === 'geocode') {
      const text = String(body?.text || '').trim()
      if (!text) {
        return NextResponse.json(
          { success: false, error: 'text is required for geocode' },
          { status: 400 }
        )
      }
      const result = await geocodeAddress({ text })
      if (!result.success) {
        return NextResponse.json(result, { status: 500 })
      }
      return NextResponse.json({ success: true, data: result.data })
    }
    if (action === 'distance') {
      const lat1 = Number(body?.lat1)
      const lng1 = Number(body?.lng1)
      const lat2 = Number(body?.lat2)
      const lng2 = Number(body?.lng2)
      if (
        !Number.isFinite(lat1) ||
        !Number.isFinite(lng1) ||
        !Number.isFinite(lat2) ||
        !Number.isFinite(lng2)
      ) {
        return NextResponse.json(
          { success: false, error: 'lat1, lng1, lat2, lng2 must all be finite numbers' },
          { status: 400 }
        )
      }
      const km = haversineDistance(lat1, lng1, lat2, lng2)
      return NextResponse.json({ success: true, data: { km } })
    }
    return NextResponse.json(
      { success: false, error: 'action must be "geocode" or "distance"' },
      { status: 400 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Location route failed' },
      { status: 500 }
    )
  }
})
