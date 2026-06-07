import { getAwsConfig, awsNotConfigured } from './config'

async function loadSdk() {
  try {
    return await import('@aws-sdk/client-cloudwatch' as any)
  } catch {
    return null
  }
}

export async function putMetricData({
  namespace = 'RaktSetuAI',
  metrics,
}: {
  namespace?: string
  metrics: { name: string; value: number; unit?: string }[]
}) {
  const cfg = getAwsConfig()
  if (!cfg) return awsNotConfigured()
  if (!Array.isArray(metrics) || metrics.length === 0) {
    return { success: false as const, error: 'metrics array is required' }
  }
  const sdk = await loadSdk()
  if (!sdk) {
    return {
      success: false as const,
      error: 'AWS SDK not installed. Run npm install to add @aws-sdk packages.',
    }
  }
  try {
    const client = new sdk.CloudWatchClient(cfg)
    const ts = new Date()
    const metricData = metrics.map((m) => ({
      MetricName: m?.name || 'Unnamed',
      Value: Number(m?.value) || 0,
      Unit: m?.unit || 'Count',
      Timestamp: ts,
    }))
    await client.send(
      new sdk.PutMetricDataCommand({
        Namespace: namespace,
        MetricData: metricData,
      })
    )
    return {
      success: true as const,
      data: { count: metrics.length, namespace },
    }
  } catch (err: any) {
    return {
      success: false as const,
      error: err?.message || 'CloudWatch putMetricData failed',
    }
  }
}

export async function getMetricStatistics({
  namespace = 'RaktSetuAI',
  metricName,
  periodSeconds = 300,
  hoursAgo = 24,
}: {
  namespace?: string
  metricName: string
  periodSeconds?: number
  hoursAgo?: number
}) {
  const cfg = getAwsConfig()
  if (!cfg) return awsNotConfigured()
  if (!metricName) {
    return { success: false as const, error: 'metricName is required' }
  }
  const sdk = await loadSdk()
  if (!sdk) {
    return {
      success: false as const,
      error: 'AWS SDK not installed. Run npm install to add @aws-sdk packages.',
    }
  }
  try {
    const client = new sdk.CloudWatchClient(cfg)
    const end = new Date()
    const start = new Date(end.getTime() - hoursAgo * 3600 * 1000)
    const result = await client.send(
      new sdk.GetMetricStatisticsCommand({
        Namespace: namespace,
        MetricName: metricName,
        StartTime: start,
        EndTime: end,
        Period: periodSeconds,
        Statistics: ['Sum', 'Average', 'Maximum'],
      })
    )
    const points = Array.isArray(result?.Datapoints) ? result.Datapoints : []
    const sorted = points
      .map((p: any) => ({
        timestamp: p?.Timestamp ? new Date(p.Timestamp).toISOString() : '',
        sum: Number(p?.Sum) || 0,
        average: Number(p?.Average) || 0,
        maximum: Number(p?.Maximum) || 0,
      }))
      .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1))
    return {
      success: true as const,
      data: { datapoints: sorted },
    }
  } catch (err: any) {
    return {
      success: false as const,
      error: err?.message || 'CloudWatch getMetricStatistics failed',
    }
  }
}
