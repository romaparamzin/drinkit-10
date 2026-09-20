import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, fetchStats, type ApiErrorKind, type UnitStats } from '@/api/publicApi'
import type { Unit } from '@/lib/units'

const REFRESH_MS = 5 * 60_000
const STALE_MS = 45_000
const REQUEST_TIMEOUT_MS = 15_000
const RETRY_DELAYS_MS = [3_000, 8_000, 20_000, 45_000]

export function useStats(units: Unit[]) {
  const [data, setData] = useState<Record<number, UnitStats>>({})
  const [errors, setErrors] = useState<Record<number, ApiErrorKind>>({})
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const lastRun = useRef(0)
  const inFlight = useRef(false)
  const retryTimer = useRef<number | null>(null)
  const retryCount = useRef(0)
  const ids = units.map((u) => u.publicId).join(',')

  const clearRetry = () => {
    if (retryTimer.current !== null) {
      window.clearTimeout(retryTimer.current)
      retryTimer.current = null
    }
  }

  const refresh = useCallback(async () => {
    const list = ids ? ids.split(',').map(Number) : []
    if (list.length === 0 || inFlight.current) return
    inFlight.current = true
    clearRetry()
    setLoading(true)
    lastRun.current = Date.now()
    setAttempt((n) => n + 1)

    const results = await Promise.allSettled(list.map((id) => fetchStats(id, AbortSignal.timeout(REQUEST_TIMEOUT_MS))))

    const failed: Record<number, ApiErrorKind> = {}
    setData((prev) => {
      const next = { ...prev }
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') next[list[i]] = r.value
      })
      return next
    })
    results.forEach((r, i) => {
      if (r.status === 'rejected') failed[list[i]] = r.reason instanceof ApiError ? r.reason.kind : 'network'
    })
    setErrors(failed)
    setUpdatedAt(Date.now())
    setLoading(false)
    inFlight.current = false

    const failures = Object.keys(failed).length
    if (failures > 0 && retryCount.current < RETRY_DELAYS_MS.length) {
      const delay = RETRY_DELAYS_MS[retryCount.current]
      retryCount.current += 1
      retryTimer.current = window.setTimeout(() => void refresh(), delay)
    } else if (failures === 0) {
      retryCount.current = 0
    }
  }, [ids])

  useEffect(() => {
    retryCount.current = 0
    void refresh()
    const timer = window.setInterval(() => void refresh(), REFRESH_MS)
    const onWake = () => {
      if (document.visibilityState !== 'visible') return
      retryCount.current = 0
      if (Date.now() - lastRun.current > STALE_MS) void refresh()
    }
    const onOnline = () => {
      retryCount.current = 0
      void refresh()
    }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    window.addEventListener('pageshow', onWake)
    window.addEventListener('online', onOnline)
    return () => {
      window.clearInterval(timer)
      clearRetry()
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
      window.removeEventListener('pageshow', onWake)
      window.removeEventListener('online', onOnline)
    }
  }, [refresh])

  const failedCount = Object.keys(errors).length
  const kinds = Object.values(errors)
  const dominantKind: ApiErrorKind | null = kinds.length
    ? (['blocked', 'not-json', 'timeout', 'network', 'http'] as ApiErrorKind[]).find((k) => kinds.filter((x) => x === k).length * 2 >= kinds.length) ?? kinds[0]
    : null
  return { data, errors, failedCount, dominantKind, updatedAt, loading, attempt, refresh }
}
