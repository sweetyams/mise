import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redis } from '@/lib/redis'

export async function GET() {
  const checks: Record<string, { status: string; latency?: number }> = {}

  // Database
  try {
    const start = Date.now()
    const supabase = createServiceClient()
    const { error } = await supabase.from('fingerprints').select('id').limit(1)
    checks.database = {
      status: error ? 'unhealthy' : 'healthy',
      latency: Date.now() - start,
    }
  } catch {
    checks.database = { status: 'unhealthy' }
  }

  // Redis
  try {
    const start = Date.now()
    await redis.ping()
    checks.redis = { status: 'healthy', latency: Date.now() - start }
  } catch {
    checks.redis = { status: 'unhealthy' }
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy')

  return NextResponse.json(
    { status: allHealthy ? 'healthy' : 'degraded', checks },
    { status: allHealthy ? 200 : 503 }
  )
}
