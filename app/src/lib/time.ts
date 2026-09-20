export type LocalNow = {
  iso: string
  secondsOfDay: number
  dayIndex: number
  date: Date
}

export function unitNow(timeZoneShift: number, at: Date = new Date()): LocalNow {
  const shifted = new Date(at.getTime() + timeZoneShift * 3_600_000)
  const iso = shifted.toISOString().slice(0, 10)
  const secondsOfDay = shifted.getUTCHours() * 3600 + shifted.getUTCMinutes() * 60 + shifted.getUTCSeconds()
  const dayIndex = (shifted.getUTCDay() + 6) % 7
  return { iso, secondsOfDay, dayIndex, date: shifted }
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function diffDays(fromIso: string, toIso: string): number {
  const a = Date.UTC(+fromIso.slice(0, 4), +fromIso.slice(5, 7) - 1, +fromIso.slice(8, 10))
  const b = Date.UTC(+toIso.slice(0, 4), +toIso.slice(5, 7) - 1, +toIso.slice(8, 10))
  return Math.round((b - a) / 86_400_000)
}

export function isoWeekMonday(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  const shift = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - shift)
  return d.toISOString().slice(0, 10)
}

export function clockLabel(date: Date): string {
  return `${date.getUTCHours()}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}
