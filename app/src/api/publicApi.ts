export const PUBLIC_API = 'https://publicapi.drinkit.dodois.io/ru/api/v1'

export type Block = {
  stationaryRevenue: number
  stationaryOrderCount: number
  deliveryRevenue: number
  deliveryOrderCount: number
  revenue: number
  orderCount: number
  avgCheck: number
}

export type UnitStats = {
  unitId: number
  date: string
  today: Block
  weekBefore: Block
  yesterdayToThisTime: Block
  yesterday: Block
  weekBeforeToThisTime: Block
  fetchedAt: number
}

export type WorkingTime = {
  DayIndex: number
  DayAlias: string
  WorkingTimeStart: number
  WorkingTimeEnd: number
}

export type PublicUnitBrief = {
  Id: number
  UUId: string
  Name: string
  DepartmentId: number
  Type: number
  State: number
  Address: string | null
  AddressText: string | null
}

export type PublicUnitInfo = PublicUnitBrief & {
  Alias: string | null
  OrganizationName: string | null
  OrganizationUUId: string | null
  Square: number | null
  BeginDateWork: string | null
  TimeZoneShift: number
  RestaurantWeekWorkingTime: WorkingTime[] | null
  IsTemporarilyClosed?: boolean
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${PUBLIC_API}/${path}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  })
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return (await res.json()) as T
}

export async function fetchStats(publicId: number, signal?: AbortSignal): Promise<UnitStats> {
  const raw = await getJson<Omit<UnitStats, 'fetchedAt'>>(
    `OperationalStatisticsForTodayAndWeekBefore/${publicId}`,
    signal,
  )
  return { ...raw, date: raw.date.slice(0, 10), fetchedAt: Date.now() }
}

export function fetchUnitInfo(publicId: number, signal?: AbortSignal) {
  return getJson<PublicUnitInfo>(`unitinfo/${publicId}`, signal)
}

export function fetchLocalityUnits(localityId = 1, signal?: AbortSignal) {
  return getJson<PublicUnitBrief[]>(`GetUnitsByLocalityId/${localityId}`, signal)
}

export type Locality = { Id: number; UUId: string; Name: string; TranslitAlias: string }

export function fetchLocalities(signal?: AbortSignal) {
  return getJson<Locality[]>('GetLocalities', signal)
}
