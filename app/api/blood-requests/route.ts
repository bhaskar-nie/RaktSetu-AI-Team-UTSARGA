import { NextResponse } from 'next/server'
import { authMiddleware, getCurrentUserId } from 'lyzr-architect'
import getBloodRequestModel from '@/models/BloodRequest'

export const dynamic = 'force-dynamic'

export const GET = authMiddleware(async () => {
  try {
    const Model = await getBloodRequestModel()
    const items = await Model.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ success: true, data: items })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch blood requests' },
      { status: 500 }
    )
  }
})

export const POST = authMiddleware(async (req) => {
  try {
    const body = await req.json()
    const Model = await getBloodRequestModel()
    const created = await Model.create({
      ...body,
      owner_user_id: getCurrentUserId(),
    })
    return NextResponse.json({ success: true, data: created })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create blood request' },
      { status: 500 }
    )
  }
})
