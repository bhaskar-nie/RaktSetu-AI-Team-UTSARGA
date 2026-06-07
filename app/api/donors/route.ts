import { NextResponse } from 'next/server'
import { authMiddleware, getCurrentUserId } from 'lyzr-architect'
import getDonorModel from '@/models/Donor'

export const dynamic = 'force-dynamic'

export const GET = authMiddleware(async () => {
  try {
    const Model = await getDonorModel()
    const items = await Model.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ success: true, data: items })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch donors' },
      { status: 500 }
    )
  }
})

export const POST = authMiddleware(async (req) => {
  try {
    const body = await req.json()
    const Model = await getDonorModel()
    const created = await Model.create({
      ...body,
      owner_user_id: getCurrentUserId(),
    })
    return NextResponse.json({ success: true, data: created })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create donor' },
      { status: 500 }
    )
  }
})
