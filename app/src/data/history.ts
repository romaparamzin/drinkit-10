import type { UnitStats } from '@/api/publicApi'
import type { Unit } from '@/lib/units'
import { addDays, diffDays, isoWeekMonday } from '@/lib/time'

export type DayRec = { revenue: number; orders: number; avgCheck: number }

export type History = {
  updatedAt: string | null
  days: Record<string, Record<string, DayRec>>
}

export const EMPTY_HISTORY: History = { updatedAt: null, days: {} }

export async function loadHistory(signal?: AbortSignal): Promise<History> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/daily.json`, { cache: 'no-store', signal })
    if (!res.ok) return EMPTY_HISTORY
    const json = (await res.json()) as Partial<History>
    return { updatedAt: json.updatedAt ?? null, days: json.days ?? {} }
  } catch {
    return EMPTY_HISTORY
  }
}

function toRec(b: { revenue: number; orderCount: number; avgCheck: number }): DayRec {
  return { revenue: b.revenue, orders: b.orderCount, avgCheck: b.avgCheck }
}

export function mergeLive(h: History, stats: UnitStats[]): History {
  const days: History['days'] = {}
  for (const [d, recs] of Object.entries(h.days)) days[d] = { ...recs }
  for (const s of stats) {
    const id = String(s.unitId)
    const y = addDays(s.date, -1)
    const w = addDays(s.date, -7)
    days[y] ??= {}
    days[w] ??= {}
    if (s.yesterday.orderCount > 0 || !days[y][id]) days[y][id] = toRec(s.yesterday)
    if (s.weekBefore.orderCount > 0 || !days[w][id]) days[w][id] = toRec(s.weekBefore)
  }
  return { updatedAt: h.updatedAt, days }
}

export function getRec(h: History, iso: string, publicId: number): DayRec | undefined {
  return h.days[iso]?.[String(publicId)]
}

export function lastNDays(h: History, publicId: number, endIso: string, n: number) {
  const out: { date: string; rec: DayRec | null }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(endIso, -i)
    out.push({ date, rec: getRec(h, date, publicId) ?? null })
  }
  return out
}

export function earliestDate(h: History): string | null {
  const keys = Object.keys(h.days).sort()
  return keys[0] ?? null
}

/** Дата первого запуска сборщика: самый ранний день истории это «сегодня минус 7» первого запуска. */
export function historyStart(earliest: string): string {
  return addDays(earliest, 7)
}

/** Сколько дней истории уже есть по точке. */
export function daysWithData(h: History, publicId: number): number {
  let n = 0
  for (const recs of Object.values(h.days)) {
    const r = recs[String(publicId)]
    if (r && r.orders > 0) n++
  }
  return n
}

export type WeekPoint = { weekIndex: number; from: string; avgRevenue: number; days: number }

export function rampSeries(h: History, unit: Unit, todayIso: string): WeekPoint[] {
  if (!unit.beginDateWork) return []
  const start = unit.beginDateWork
  const buckets = new Map<number, { sum: number; days: number }>()
  for (const [date, recs] of Object.entries(h.days)) {
    const rec = recs[String(unit.publicId)]
    if (!rec || rec.orders <= 0) continue
    if (date >= todayIso || date < start) continue
    const idx = Math.floor(diffDays(start, date) / 7) + 1
    const b = buckets.get(idx) ?? { sum: 0, days: 0 }
    b.sum += rec.revenue
    b.days += 1
    buckets.set(idx, b)
  }
  return [...buckets.entries()]
    .map(([weekIndex, b]) => ({
      weekIndex,
      from: addDays(start, (weekIndex - 1) * 7),
      avgRevenue: b.sum / b.days,
      days: b.days,
    }))
    .sort((a, b) => a.weekIndex - b.weekIndex)
}

export type WeekRow = { monday: string; sum: number; days: number; vsPrev: number | null }

export function calendarWeeks(h: History, publicId: number, todayIso: string, count = 4): WeekRow[] {
  const byWeek = new Map<string, { sum: number; days: number }>()
  for (const [date, recs] of Object.entries(h.days)) {
    const rec = recs[String(publicId)]
    if (!rec || rec.orders <= 0 || date >= todayIso) continue
    const monday = isoWeekMonday(date)
    const b = byWeek.get(monday) ?? { sum: 0, days: 0 }
    b.sum += rec.revenue
    b.days += 1
    byWeek.set(monday, b)
  }
  const rows = [...byWeek.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
  const out: WeekRow[] = []
  for (let i = 0; i < rows.length; i++) {
    const [monday, b] = rows[i]
    const prev = rows[i - 1]?.[1]
    const comparable = prev && prev.days === b.days
    out.push({ monday, sum: b.sum, days: b.days, vsPrev: comparable && prev.sum > 0 ? ((b.sum - prev.sum) / prev.sum) * 100 : null })
  }
  return out.slice(-count)
}
