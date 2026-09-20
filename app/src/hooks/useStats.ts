import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchStats, type UnitStats } from '@/api/publicApi'
import type { Unit } from '@/lib/units'

const REFRESH_MS = 5 * 60_000
const STALE_MS = 60_000

export function useStats(units: Unit[]) {
  const [data, setData] = useState<Record<number, UnitStats>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const lastRun = useRef(0)
  const ids = units.map((u) => u.publicId).join(',')

  const refresh = useCallback(async () => {
    const list = ids ? ids.split(',').map(Number) : []
    if (list.length === 0) return
    setLoading(true)
    lastRun.current = Date.now()
    const results = await Promise.allSettled(list.map((id) => fetchStats(id)))
    setData((prev) => {
      const next = { ...prev }
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') next[list[i]] = r.value
      })
      return next
    })
    setErrors(() => {
      const next: Record<number, string> = {}
      results.forEach((r, i) => {
        if (r.status === 'rejected') next[list[i]] = String(r.reason?.message ?? r.reason)
      })
      return next
    })
    setUpdatedAt(Date.now())
    setLoading(false)
  }, [ids])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), REFRESH_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRun.current > STALE_MS) void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [refresh])

  return { data, errors, updatedAt, loading, refresh }
}
