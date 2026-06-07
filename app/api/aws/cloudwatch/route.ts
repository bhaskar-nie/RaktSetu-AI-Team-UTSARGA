import { NextResponse } from 'next/server'
import { authMiddleware } from 'lyzr-architect'
import { putMetricData, getMetricStatistics } from '@/lib/aws/cloudwatch'
import getDonorModel from '@/models/Donor'
import getPatientModel from '@/models/Patient'
import getBridgeModel from '@/models/Bridge'
import getInventoryModel from '@/models/Inventory'
import getBloodRequestModel from '@/models/BloodRequest'

export const dynamic = 'force-dynamic'

async function snapshotCounts() {
  const [Donor, Patient, Bridge, Inventory, BloodRequest] = await Promise.all([
    getDonorModel(),
    getPatientModel(),
    getBridgeModel(),
    getInventoryModel(),
    getBloodRequestModel(),
  ])
  const [donors, patients, bridges, inventory, pendingRequests] = await Promise.all([
    Donor.countDocuments({}),
    Patient.countDocuments({}),
    Bridge.countDocuments({}),
    Inventory.countDocuments({}),
    BloodRequest.countDocuments({ status: 'pending' }),
  ])
  return { donors, patients, bridges, inventory, pendingRequests }
}

export const POST = authMiddleware(async (req) => {
  try {
    const body = await req.json()
    const metrics = Array.isArray(body?.metrics) ? body.metrics : []
    if (metrics.length === 0) {
      return NextResponse.json(
        { success: false, error: 'metrics array is required' },
        { status: 400 }
      )
    }
    const result = await putMetricData({ metrics })
    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }
    return NextResponse.json({ success: true, data: result.data })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'CloudWatch POST failed' },
      { status: 500 }
    )
  }
})

export const GET = authMiddleware(async (req) => {
  try {
    const url = new URL(req.url)
    const metric = url.searchParams.get('metric') || ''
    const hoursRaw = url.searchParams.get('hours') || '24'
    const hours = Math.max(1, Math.min(720, Number(hoursRaw) || 24))

    if (metric) {
      const result = await getMetricStatistics({
        metricName: metric,
        hoursAgo: hours,
      })
      if (!result.success) {
        return NextResponse.json(result, { status: 500 })
      }
      return NextResponse.json({ success: true, data: result.data })
    }

    // No metric specified: push snapshot of MongoDB counts
    let counts
    try {
      counts = await snapshotCounts()
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: 'Failed to read counts from DB: ' + (err?.message || 'unknown') },
        { status: 500 }
      )
    }
    const pushResult = await putMetricData({
      metrics: [
        { name: 'TotalDonors', value: counts.donors },
        { name: 'TotalPatients', value: counts.patients },
        { name: 'TotalBridges', value: counts.bridges },
        { name: 'PendingRequests', value: counts.pendingRequests },
        { name: 'InventoryItems', value: counts.inventory },
      ],
    })
    if (!pushResult.success) {
      return NextResponse.json(pushResult, { status: 500 })
    }
    return NextResponse.json({
      success: true,
      data: {
        pushed: 5,
        counts,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'CloudWatch GET failed' },
      { status: 500 }
    )
  }
})
