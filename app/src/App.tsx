import { useCallback, useEffect, useMemo, useState } from 'react'
import { LayoutDashboard, MonitorSmartphone, Store } from 'lucide-react'
import { BottomNav, type NavItem } from '@/components/ui/bottom-nav'
import { Summary, type StoresFilter } from '@/screens/Summary'
import { Stores } from '@/screens/Stores'
import { StoreDetail } from '@/screens/StoreDetail'
import { Boards, type BoardsMode } from '@/screens/Boards'
import { AddUnit } from '@/screens/AddUnit'
import { useStats } from '@/hooks/useStats'
import { EMPTY_HISTORY, earliestDate, loadHistory, mergeLive, type History } from '@/data/history'
import { evaluate, sortEvaluations } from '@/lib/metrics'
import { fetchUnitInfo } from '@/api/publicApi'
import { DEFAULT_UNITS, clearHash, idsFromHash, loadStored, saveStored, shareLink, unitFromInfo, type Stored, type Unit } from '@/lib/units'

const TABS: NavItem[] = [
  { label: 'Сводка', icon: LayoutDashboard },
  { label: 'Точки', icon: Store },
  { label: 'Табло', icon: MonitorSmartphone },
]

export default function App() {
  const [tab, setTab] = useState(0)
  const [stored, setStored] = useState<Stored>(() => loadStored())
  const [history, setHistory] = useState<History>(EMPTY_HISTORY)
  const [tick, setTick] = useState(0)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [storesFilter, setStoresFilter] = useState<StoresFilter>(null)
  const [boardsMode, setBoardsMode] = useState<BoardsMode>('overview')
  const [boardId, setBoardId] = useState<number | null>(null)

  const known = useMemo(() => {
    const map = new Map<number, Unit>()
    for (const u of DEFAULT_UNITS) map.set(u.publicId, u)
    for (const u of stored.added) map.set(u.publicId, u)
    return map
  }, [stored.added])

  const units = useMemo(
    () => [...known.values()].filter((u) => !stored.hidden.includes(u.publicId)).sort((a, b) => a.name.localeCompare(b.name, 'ru', { numeric: true })),
    [known, stored.hidden],
  )
  const hiddenUnits = useMemo(() => [...known.values()].filter((u) => stored.hidden.includes(u.publicId)), [known, stored.hidden])

  useEffect(() => saveStored(stored), [stored])

  useEffect(() => {
    const ctrl = new AbortController()
    void loadHistory(ctrl.signal).then(setHistory)
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    const ids = idsFromHash()
    if (!ids || ids.length === 0) return
    clearHash()
    const knownIds = new Set(known.keys())
    const missing = ids.filter((id) => !knownIds.has(id))
    void Promise.allSettled(missing.map((id) => fetchUnitInfo(id))).then((results) => {
      const added = results.flatMap((r) => (r.status === 'fulfilled' ? [unitFromInfo(r.value)] : []))
      setStored((s) => {
        const all = new Set([...knownIds, ...added.map((u) => u.publicId)])
        const hidden = [...all].filter((id) => !ids.includes(id))
        const addedMap = new Map(s.added.map((u) => [u.publicId, u]))
        for (const u of added) addedMap.set(u.publicId, u)
        return { added: [...addedMap.values()], hidden }
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  const stats = useStats(units)

  const merged = useMemo(() => mergeLive(history, Object.values(stats.data)), [history, stats.data])

  const evals = useMemo(() => {
    void tick
    return sortEvaluations(units.map((u) => evaluate(u, stats.data[u.publicId], merged)))
  }, [units, stats.data, merged, tick])

  const historyFrom = earliestDate(history)
  const detail = detailId !== null ? (evals.find((e) => e.unit.publicId === detailId) ?? null) : null

  const addUnit = useCallback((u: Unit) => {
    setStored((s) => ({ added: [...s.added.filter((x) => x.publicId !== u.publicId), u], hidden: s.hidden.filter((id) => id !== u.publicId) }))
  }, [])
  const hideUnit = useCallback((u: Unit) => {
    setStored((s) => ({ ...s, hidden: [...new Set([...s.hidden, u.publicId])] }))
    setDetailId(null)
  }, [])
  const unhide = useCallback((id: number) => setStored((s) => ({ ...s, hidden: s.hidden.filter((x) => x !== id) })), [])

  const share = useCallback(async () => {
    const link = shareLink(units.map((u) => u.publicId))
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Дринкит · Москва 10', url: link })
        return true
      }
      await navigator.clipboard.writeText(link)
      return true
    } catch {
      return false
    }
  }, [units])

  const openBoard = (u: Unit) => {
    setDetailId(null)
    setBoardId(u.publicId)
    setBoardsMode('single')
    setTab(2)
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[560px] safe-bottom safe-top">
      {tab === 0 ? (
        <Summary
          evals={evals}
          updatedAt={stats.updatedAt}
          loading={stats.loading}
          failedCount={stats.failedCount}
          onRefresh={() => void stats.refresh()}
          historyFrom={historyFrom}
          onShowStores={(f) => {
            setStoresFilter(f)
            setTab(1)
          }}
        />
      ) : null}
      {tab === 1 ? <Stores evals={evals} filter={storesFilter} onClearFilter={() => setStoresFilter(null)} onSelect={(e) => setDetailId(e.unit.publicId)} onAdd={() => setAddOpen(true)} /> : null}
      {tab === 2 ? <Boards units={units} mode={boardsMode} onMode={setBoardsMode} selectedId={boardId} onSelect={setBoardId} /> : null}

      <BottomNav items={TABS} activeIndex={tab} onChange={setTab} />

      <StoreDetail evaluation={detail} history={merged} onClose={() => setDetailId(null)} onOpenBoard={openBoard} onHide={hideUnit} />
      <AddUnit open={addOpen} onClose={() => setAddOpen(false)} units={units} hidden={hiddenUnits} onAdd={addUnit} onHide={hideUnit} onUnhide={unhide} onShare={share} />
    </div>
  )
}
