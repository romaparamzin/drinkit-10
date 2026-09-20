import { useEffect, useMemo, useState } from 'react'
import { Link2, Search } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Card } from '@/components/ui/card'
import { Chip } from '@/components/ui/badge'
import { fetchLocalityUnits, fetchUnitInfo, type PublicUnitBrief } from '@/api/publicApi'
import { DEPARTMENT_IDS, DEPARTMENT_NAME, LOCALITY_ID, unitFromInfo, type Unit } from '@/lib/units'

type Props = {
  open: boolean
  onClose: () => void
  visibleIds: number[]
  hidden: Unit[]
  onAdd: (unit: Unit) => void
  onUnhide: (id: number) => void
  onShare: () => Promise<boolean>
}

export function AddUnit({ open, onClose, visibleIds, hidden, onAdd, onUnhide, onShare }: Props) {
  const [all, setAll] = useState<PublicUnitBrief[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const [shared, setShared] = useState<null | 'ok' | 'fail'>(null)

  useEffect(() => {
    if (!open || all) return
    const ctrl = new AbortController()
    fetchLocalityUnits(LOCALITY_ID, ctrl.signal)
      .then((list) => setAll(list.filter((u) => u.Type === 1)))
      .catch((e) => setError(String(e.message ?? e)))
    return () => ctrl.abort()
  }, [open, all])

  const visible = useMemo(() => new Set(visibleIds), [visibleIds])
  const hiddenIds = useMemo(() => new Set(hidden.map((h) => h.publicId)), [hidden])

  const department = useMemo(
    () => (all ?? []).filter((u) => DEPARTMENT_IDS.includes(u.DepartmentId) && !visible.has(u.Id) && !hiddenIds.has(u.Id)).sort(byName),
    [all, visible, hiddenIds],
  )

  const found = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2 || !all) return []
    return all
      .filter((u) => !visible.has(u.Id) && !hiddenIds.has(u.Id))
      .filter((u) => u.Name.toLowerCase().includes(q) || (u.AddressText ?? '').toLowerCase().includes(q))
      .sort(byName)
      .slice(0, 20)
  }, [query, all, visible, hiddenIds])

  async function add(id: number) {
    setBusy(id)
    try {
      const info = await fetchUnitInfo(id)
      onAdd(unitFromInfo(info))
    } catch (e) {
      setError(String((e as Error).message ?? e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Кофейни">
      <div className="flex flex-col gap-3 pb-2">
        <label className="flex h-11 items-center gap-2 rounded-full border border-line bg-white px-4">
          <Search size={18} className="text-dim" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по всем кофейням Москвы"
            className="h-full w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-dim"
            inputMode="search"
          />
        </label>

        {error ? <p className="text-[13px] text-down">{error}</p> : null}

        {query.trim().length >= 2 ? (
          <Section title="Найдено">
            {found.length ? found.map((u) => <Row key={u.Id} u={u} busy={busy === u.Id} onAdd={() => add(u.Id)} />) : <Empty>Ничего не нашлось.</Empty>}
          </Section>
        ) : null}

        <Section title={`Подразделение ${DEPARTMENT_NAME}, ещё не на экране`}>
          {all === null && !error ? <Empty>Загружаю список…</Empty> : null}
          {all !== null && department.length === 0 ? <Empty>Все точки подразделения уже на экране.</Empty> : null}
          {department.map((u) => (
            <Row key={u.Id} u={u} busy={busy === u.Id} onAdd={() => add(u.Id)} />
          ))}
        </Section>

        {hidden.length ? (
          <Section title="Скрытые">
            {hidden.map((h) => (
              <div key={h.publicId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">{h.name}</p>
                  <p className="truncate text-[12px] text-dim">{h.alias ?? h.address ?? ''}</p>
                </div>
                <button type="button" onClick={() => onUnhide(h.publicId)} className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-brand">
                  Вернуть
                </button>
              </div>
            ))}
          </Section>
        ) : null}

        <button
          type="button"
          onClick={async () => setShared((await onShare()) ? 'ok' : 'fail')}
          className="flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-white text-[15px] font-medium text-brand active:bg-slate-100"
        >
          <Link2 size={18} /> {shared === 'ok' ? 'Ссылка скопирована' : shared === 'fail' ? 'Не удалось скопировать' : 'Ссылка на этот набор точек'}
        </button>
        <p className="px-1 text-[12px] leading-4 text-dim">Набор точек хранится в этом браузере. Ссылка открывает тот же набор у партнёра. История сборщика есть у всех точек подразделения {DEPARTMENT_NAME}; у точек из других подразделений будут только живые цифры.</p>
      </div>
    </Sheet>
  )
}

function byName(a: PublicUnitBrief, b: PublicUnitBrief) {
  return a.Name.localeCompare(b.Name, 'ru', { numeric: true })
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-1 text-[12px] font-medium tracking-wide text-dim uppercase">{title}</p>
      <Card className="divide-y divide-line">{children}</Card>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-3 text-[13px] text-dim">{children}</p>
}

function Row({ u, busy, onAdd }: { u: PublicUnitBrief; busy: boolean; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate text-[14px] font-medium text-ink">
          {u.Name}
          {u.State !== 1 ? <Chip>ещё не открыта</Chip> : null}
        </p>
        <p className="truncate text-[12px] text-dim">{u.AddressText?.trim() || u.Address || ''}</p>
      </div>
      <button type="button" disabled={busy} onClick={onAdd} className="shrink-0 rounded-full bg-brand px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50">
        {busy ? '…' : 'Добавить'}
      </button>
    </div>
  )
}
