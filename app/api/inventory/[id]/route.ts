import { NextResponse } from 'next/server'
import { authMiddleware } from 'lyzr-architect'
import getInventoryModel from '@/models/Inventory'

export const dynamic = 'force-dynamic'

export const PUT = authMiddleware(async (req, ctx: any) => {
  try {
    const id = ctx?.params?.id
    const body = await req.json()
    const Model = await getInventoryModel()
    const updated = await Model.findByIdAndUpdate(id, body, { new: true }).lean()
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: updated })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update' },
      { status: 500 }
    )
  }
})

export const DELETE = authMiddleware(async (_req, ctx: any) => {
  try {
    const id = ctx?.params?.id
    const Model = await getInventoryModel()
    const deleted = await Model.findByIdAndDelete(id).lean()
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: deleted })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete' },
      { status: 500 }
    )
  }
})
