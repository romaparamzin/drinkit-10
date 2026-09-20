import type { UnitStats } from '@/api/publicApi'
import type { Unit } from './units'
import { addDays, diffDays, unitNow } from './time'
import { rampSeries, type History } from '@/data/history'

export const T = {
  nowDrop: -25,
  minOrdersNow: 15,
  minutesOpenForNow: 180,
  youngWeeks: 8,
  muteOrders: 20,
  muteWeeks: 2,
  notTradingMinutes: 60,
  rampWeeks: 26,
}

export type Level = 'red' | 'yellow' | 'green' | 'gray'

export const LEVEL_ORDER: Record<Level, number> = { red: 0, yellow: 1, gray: 2, green: 3 }

export function pct(cur: number, base: number): number | null {
  if (!base || base <= 0) return null
  return ((cur - base) / base) * 100
}

export type Opening = {
  opensAt: number | null
  closesAt: number | null
  closedToday: boolean
  minutesSinceOpen: number | null
  isOpenNow: boolean
  nowSeconds: number
  todayIso: string
}

export function openingInfo(unit: Unit, at = new Date()): Opening {
  const now = unitNow(unit.timeZoneShift, at)
  const wt = unit.restaurantWeekWorkingTime?.find((w) => w.DayIndex === now.dayIndex)
  if (!wt) {
    return { opensAt: null, closesAt: null, closedToday: true, minutesSinceOpen: null, isOpenNow: false, nowSeconds: now.secondsOfDay, todayIso: now.iso }
  }
  const minutesSinceOpen = (now.secondsOfDay - wt.WorkingTimeStart) / 60
  const isOpenNow = now.secondsOfDay >= wt.WorkingTimeStart && now.secondsOfDay < wt.WorkingTimeEnd
  return { opensAt: wt.WorkingTimeStart, closesAt: wt.WorkingTimeEnd, closedToday: false, minutesSinceOpen, isOpenNow, nowSeconds: now.secondsOfDay, todayIso: now.iso }
}

export function ageWeeks(unit: Unit, todayIso: string): number | null {
  if (!unit.beginDateWork) return null
  const d = diffDays(unit.beginDateWork, todayIso)
  if (d < 0) return null
  return Math.floor(d / 7) + 1
}

export type Evaluation = {
  unit: Unit
  stats: UnitStats | null
  level: Level
  reasons: string[]
  opening: Opening
  ageWeeks: number | null
  young: boolean
  now: {
    value: number
    orders: number
    vsWeek: number | null
    vsWeekMuted: boolean
    baseWeek: number
    vsYesterday: number | null
    vsYesterdayMuted: boolean
    baseYesterday: number
    ready: boolean
  }
  yesterday: {
    date: string
    value: number
    orders: number
    avgCheck: number
  }
}

function twoWeeklyDeclines(h: History, unit: Unit, todayIso: string): boolean {
  const series = rampSeries(h, unit, todayIso).filter((p) => p.days >= 5)
  if (series.length < 3) return false
  const [a, b, c] = series.slice(-3)
  return c.avgRevenue < b.avgRevenue && b.avgRevenue < a.avgRevenue
}

export function evaluate(unit: Unit, stats: UnitStats | undefined, history: History, at = new Date()): Evaluation {
  const opening = openingInfo(unit, at)
  const todayIso = stats?.date ?? opening.todayIso
  const age = ageWeeks(unit, todayIso)
  const young = age !== null && age < T.youngWeeks
  const muteByAge = age !== null && age < T.muteWeeks

  if (!stats) {
    return {
      unit, stats: null, level: 'gray', reasons: ['нет данных от API'], opening, ageWeeks: age, young,
      now: { value: 0, orders: 0, vsWeek: null, vsWeekMuted: true, baseWeek: 0, vsYesterday: null, vsYesterdayMuted: true, baseYesterday: 0, ready: false },
      yesterday: { date: addDays(todayIso, -1), value: 0, orders: 0, avgCheck: 0 },
    }
  }

  const nowReady = !opening.closedToday && opening.minutesSinceOpen !== null && opening.minutesSinceOpen >= 0
  const vsWeek = pct(stats.today.revenue, stats.weekBeforeToThisTime.revenue)
  const vsYesterday = pct(stats.today.revenue, stats.yesterdayToThisTime.revenue)
  const vsWeekMuted = muteByAge || stats.weekBeforeToThisTime.orderCount < T.muteOrders
  const vsYesterdayMuted = muteByAge || stats.yesterdayToThisTime.orderCount < T.muteOrders

  const reasons: string[] = []
  let level: Level = 'green'
  const suppressDrops = young && !twoWeeklyDeclines(history, unit, todayIso)

  const notTrading =
    nowReady && opening.isOpenNow && (opening.minutesSinceOpen ?? 0) >= T.notTradingMinutes && stats.today.revenue === 0
  if (notTrading) {
    level = 'red'
    reasons.push('нет продаж после открытия')
  }

  if (
    !suppressDrops && vsWeek !== null && vsWeek <= T.nowDrop && nowReady &&
    (opening.minutesSinceOpen ?? 0) >= T.minutesOpenForNow && stats.weekBeforeToThisTime.orderCount >= T.minOrdersNow
  ) {
    if (level !== 'red') level = 'yellow'
    reasons.push(`сейчас ${Math.round(vsWeek)} % к прошлой неделе`)
  }

  return {
    unit, stats, level, reasons, opening, ageWeeks: age, young,
    now: {
      value: stats.today.revenue, orders: stats.today.orderCount,
      vsWeek, vsWeekMuted, baseWeek: stats.weekBeforeToThisTime.revenue,
      vsYesterday, vsYesterdayMuted, baseYesterday: stats.yesterdayToThisTime.revenue,
      ready: nowReady,
    },
    yesterday: { date: addDays(stats.date, -1), value: stats.yesterday.revenue, orders: stats.yesterday.orderCount, avgCheck: stats.yesterday.avgCheck },
  }
}

export function sortEvaluations(evals: Evaluation[]): Evaluation[] {
  return [...evals].sort((a, b) => {
    const l = LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]
    if (l !== 0) return l
    return b.yesterday.value - a.yesterday.value
  })
}
