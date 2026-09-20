#!/usr/bin/env node
// Сборщик истории без сервера: раз в сутки забирает из публичного API Дринкит
// итоги "вчера" и "неделю назад" по всем кофейням подразделения и дописывает
// их в app/public/data/daily.json. Никаких секретов и авторизации не требует.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'app/public/data/daily.json')
const CONFIG = path.join(ROOT, 'app/src/config/units.json')
const BASE = 'https://publicapi.drinkit.dodois.io/ru/api/v1'
const DEPARTMENTS = [392]
const LOCALITY = 1
const KEEP_DAYS = 400
const CONCURRENCY = 4

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(p, tries = 3) {
  let last
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${BASE}/${p}`, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      last = e
      await sleep(1500 * (i + 1))
    }
  }
  throw new Error(`${p}: ${last?.message ?? last}`)
}

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const round2 = (v) => Math.round((v ?? 0) * 100) / 100
const toRec = (b) => ({ revenue: round2(b.revenue), orders: b.orderCount ?? 0, avgCheck: round2(b.avgCheck) })

async function mapLimit(items, limit, fn) {
  const out = []
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx])
      }
    }),
  )
  return out
}

async function main() {
  let data = { updatedAt: null, units: {}, days: {} }
  try {
    data = JSON.parse(await readFile(OUT, 'utf8'))
    data.units ??= {}
    data.days ??= {}
  } catch {
    /* первый запуск */
  }

  const config = JSON.parse(await readFile(CONFIG, 'utf8'))
  const byId = new Map()
  for (const u of config.units) byId.set(u.publicId, { id: u.publicId, name: u.name, alias: u.alias ?? null, departmentId: u.departmentId })

  try {
    const locality = await getJson(`GetUnitsByLocalityId/${LOCALITY}`)
    for (const u of locality) {
      if (u.Type !== 1 || !DEPARTMENTS.includes(u.DepartmentId)) continue
      if (!byId.has(u.Id)) byId.set(u.Id, { id: u.Id, name: u.Name, alias: null, departmentId: u.DepartmentId })
    }
  } catch (e) {
    console.warn('locality list unavailable, using config only:', e.message)
  }

  const units = [...byId.values()]
  let ok = 0
  const results = await mapLimit(units, CONCURRENCY, async (u) => {
    try {
      const s = await getJson(`OperationalStatisticsForTodayAndWeekBefore/${u.id}`)
      ok++
      return { u, s }
    } catch (e) {
      console.warn(`skip ${u.name}: ${e.message}`)
      return null
    }
  })

  for (const r of results) {
    if (!r) continue
    const { u, s } = r
    const date = String(s.date).slice(0, 10)
    const y = addDays(date, -1)
    const w = addDays(date, -7)
    data.days[y] ??= {}
    data.days[w] ??= {}
    const id = String(u.id)
    if ((s.yesterday?.orderCount ?? 0) > 0 || !data.days[y][id]) data.days[y][id] = toRec(s.yesterday)
    if ((s.weekBefore?.orderCount ?? 0) > 0 || !data.days[w][id]) data.days[w][id] = toRec(s.weekBefore)
    data.units[id] = { name: u.name, alias: u.alias, departmentId: u.departmentId }
  }

  const cutoff = addDays(new Date().toISOString().slice(0, 10), -KEEP_DAYS)
  data.days = Object.fromEntries(Object.entries(data.days).filter(([d]) => d >= cutoff).sort(([a], [b]) => (a < b ? -1 : 1)))
  data.updatedAt = new Date().toISOString()
  data.source = 'publicapi.drinkit.dodois.io; weekBefore = сегодня минус 7 дней'

  await mkdir(path.dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(data, null, 1) + '\n')
  console.log(`units: ${units.length}, fetched: ${ok}, days stored: ${Object.keys(data.days).length}, out: ${path.relative(ROOT, OUT)}`)
  if (ok === 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
