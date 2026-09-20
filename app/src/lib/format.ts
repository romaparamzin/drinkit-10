const nf0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

export const fmtInt = (v: number) => nf0.format(Math.round(v))
export const fmtRub = (v: number) => `${fmtInt(v)} ₽`
export const fmtRubShort = (v: number) => {
  const a = Math.abs(v)
  if (a >= 1_000_000) return `${(v / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн`
  if (a >= 10_000) return `${Math.round(v / 1000)} тыс.`
  return fmtInt(v)
}

export function fmtPct(p: number | null): string {
  if (p === null || !Number.isFinite(p)) return '—'
  const sign = p > 0 ? '+' : p < 0 ? '−' : ''
  const a = Math.abs(p)
  const digits = a >= 10 ? 0 : 1
  return `${sign}${a.toLocaleString('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: 0 })} %`
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

export const fmtOrders = (n: number) => `${fmtInt(n)} ${plural(n, 'заказ', 'заказа', 'заказов')}`

const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const WEEKDAYS_ACC = ['воскресенью', 'понедельнику', 'вторнику', 'среде', 'четвергу', 'пятнице', 'субботе']
const MONTHS_GEN = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

export function fmtDayShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return `${WEEKDAYS_SHORT[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS_GEN[d.getUTCMonth()]}`
}

export function fmtDayNum(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return `${d.getUTCDate()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function weekdayAccusative(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return WEEKDAYS_ACC[d.getUTCDay()]
}

export function fmtClock(secondsOfDay: number): string {
  const h = Math.floor(secondsOfDay / 3600)
  const m = Math.floor((secondsOfDay % 3600) / 60)
  return `${h}:${String(m).padStart(2, '0')}`
}
