import defaults from '@/config/units.json'
import type { PublicUnitInfo, WorkingTime } from '@/api/publicApi'

export type Unit = {
  name: string
  alias: string | null
  publicId: number
  uuid: string
  uuidDashed: string
  departmentId: number
  organizationName?: string | null
  address?: string | null
  beginDateWork?: string | null
  timeZoneShift: number
  restaurantWeekWorkingTime?: WorkingTime[] | null
}

export const DEPARTMENT_IDS = [392]
export const DEPARTMENT_NAME = 'Москва 10'
export const COUNTRY_NUMERIC = 643
export const LOCALITY_ID = 1

type RawUnit = Omit<Unit, 'timeZoneShift'> & { timeZoneShift?: number | null }

export const DEFAULT_UNITS: Unit[] = (defaults as { units: RawUnit[] }).units.map((u) => ({
  name: u.name,
  alias: u.alias ?? null,
  publicId: u.publicId,
  uuid: u.uuid.toLowerCase(),
  uuidDashed: dashUuid(u.uuid),
  departmentId: u.departmentId,
  organizationName: u.organizationName ?? null,
  address: u.address ?? null,
  beginDateWork: u.beginDateWork ?? null,
  timeZoneShift: u.timeZoneShift ?? 3,
  restaurantWeekWorkingTime: u.restaurantWeekWorkingTime ?? null,
}))

export function dashUuid(uuid: string): string {
  const s = uuid.replace(/-/g, '').toLowerCase()
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`
}

export function boardUrl(unit: Unit): string {
  return `https://motivationboard.drinkit.dodois.io/#/board/${COUNTRY_NUMERIC}/${unit.uuidDashed}`
}

export function unitFromInfo(info: PublicUnitInfo): Unit {
  return {
    name: info.Name,
    alias: info.Alias ?? null,
    publicId: info.Id,
    uuid: info.UUId.toLowerCase(),
    uuidDashed: dashUuid(info.UUId),
    departmentId: info.DepartmentId,
    organizationName: info.OrganizationName ?? null,
    address: info.Address ?? null,
    beginDateWork: info.BeginDateWork ? info.BeginDateWork.slice(0, 10) : null,
    timeZoneShift: typeof info.TimeZoneShift === 'number' ? info.TimeZoneShift : 3,
    restaurantWeekWorkingTime: info.RestaurantWeekWorkingTime ?? null,
  }
}

export function unitLabel(unit: Unit): string {
  return unit.alias ? `${unit.name} · ${unit.alias}` : unit.name
}

const KEY = 'drinkit10.units.v1'

export type Stored = { added: Unit[]; hidden: number[] }

export function loadStored(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { added: [], hidden: [] }
    const parsed = JSON.parse(raw) as Partial<Stored>
    return { added: parsed.added ?? [], hidden: parsed.hidden ?? [] }
  } catch {
    return { added: [], hidden: [] }
  }
}

export function saveStored(s: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable, keep in memory */
  }
}

export function idsFromHash(): number[] | null {
  const m = /(?:^|[#&])units=([0-9,]+)/.exec(window.location.hash)
  if (!m) return null
  return m[1].split(',').map(Number).filter((n) => Number.isFinite(n) && n > 0)
}

export function clearHash() {
  if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search)
}

export function shareLink(ids: number[]): string {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#units=${ids.join(',')}`
}
