import { getAwsConfig, awsNotConfigured } from './config'

async function loadSdk() {
  try {
    return await import('@aws-sdk/client-location' as any)
  } catch {
    return null
  }
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371 // km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function geocodeAddress({ text }: { text: string }) {
  const cfg = getAwsConfig()
  if (!cfg) return awsNotConfigured()
  if (!text || !text.trim()) {
    return { success: false as const, error: 'text is required' }
  }
  const indexName = process.env.AWS_LOCATION_PLACE_INDEX
  if (!indexName) {
    return {
      success: false as const,
      error:
        'AWS_LOCATION_PLACE_INDEX not configured. Create a Place Index in AWS Location console and add the name to .env.local.',
    }
  }
  const sdk = await loadSdk()
  if (!sdk) {
    return {
      success: false as const,
      error: 'AWS SDK not installed. Run npm install to add @aws-sdk packages.',
    }
  }
  try {
    const client = new sdk.LocationClient(cfg)
    const result = await client.send(
      new sdk.SearchPlaceIndexForTextCommand({
        IndexName: indexName,
        Text: text,
        MaxResults: 5,
      })
    )
    const results = Array.isArray(result?.Results)
      ? result.Results.map((r: any) => ({
          label: r?.Place?.Label || '',
          point: Array.isArray(r?.Place?.Geometry?.Point)
            ? r.Place.Geometry.Point
            : [0, 0],
          country: r?.Place?.Country || '',
          region: r?.Place?.Region || '',
        }))
      : []
    return { success: true as const, data: { results } }
  } catch (err: any) {
    return {
      success: false as const,
      error: err?.message || 'Location geocode failed',
    }
  }
}
