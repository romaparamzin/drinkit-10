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

export type ApiErrorKind = 'network' | 'timeout' | 'blocked' | 'http' | 'not-json'

export class ApiError extends Error {
  kind: ApiErrorKind
  status: number | null
  constructor(kind: ApiErrorKind, message: string, status: number | null = null) {
    super(message)
    this.kind = kind
    this.status = status
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${PUBLIC_API}/${path}`, { headers: { Accept: 'application/json' }, cache: 'no-store', signal })
  } catch (e) {
    const name = (e as Error)?.name
    if (name === 'TimeoutError' || name === 'AbortError') throw new ApiError('timeout', `${path}: нет ответа за отведённое время`)
    throw new ApiError('network', `${path}: ${(e as Error)?.message ?? 'сетевая ошибка'}`)
  }
  if (res.status === 403 || res.status === 429 || res.status === 503) {
    throw new ApiError('blocked', `${path}: HTTP ${res.status}`, res.status)
  }
  if (!res.ok) throw new ApiError('http', `${path}: HTTP ${res.status}`, res.status)
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError('not-json', `${path}: вместо данных пришла страница`, res.status)
  }
}

export const API_CHECK_URL = `${PUBLIC_API}/FinancialMetrics`

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
