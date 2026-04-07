import { Redis } from '@upstash/redis'

// In-memory fallback for local dev when Upstash isn't configured
const memoryStore = new Map<string, { value: string; expiresAt: number | null }>()

class MemoryRedis {
  async get<T>(key: string): Promise<T | null> {
    const entry = memoryStore.get(key)
    if (!entry) return null
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      memoryStore.delete(key)
      return null
    }
    return JSON.parse(entry.value) as T
  }

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<void> {
    const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : null
    memoryStore.set(key, { value: JSON.stringify(value), expiresAt })
  }

  async del(key: string): Promise<void> {
    memoryStore.delete(key)
  }

  async ping(): Promise<string> {
    return 'PONG'
  }
}

function createRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (url && token) {
    return new Redis({ url, token })
  }

  console.warn('[MISE] Upstash not configured — using in-memory Redis fallback')
  return new MemoryRedis() as unknown as Redis
}

export const redis = createRedisClient()
