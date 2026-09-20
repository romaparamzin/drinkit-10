import { Plus, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Chip, LevelDot, TrendBadge } from '@/components/ui/badge'
import { fmtClock, fmtOrders, fmtRub } from '@/lib/format'
import type { Evaluation } from '@/lib/metrics'
import type { StoresFilter } from './Summary'
import { cn } from '@/lib/utils'

type Props = {
  evals: Evaluation[]
  filter: StoresFilter
  onClearFilter: () => void
  onSelect: (e: Evaluation) => void
  onAdd: () => void
}

const FILTER_LABEL: Record<Exclude<StoresFilter, null>, string> = {
  red: 'внимание',
  yellow: 'присмотреться',
  green: 'в норме',
  gray: 'без данных',
  ramp: 'разгон',
}

export function Stores({ evals, filter, onClearFilter, onSelect, onAdd }: Props) {
  const list = evals.filter((e) => {
    if (!filter) return true
    if (filter === 'ramp') return e.ageWeeks !== null && e.ageWeeks <= 26
    return e.level === filter
  })

  return (
    <div className="px-4 pt-3">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink">Точки</h1>
          <p className="text-[13px] text-dim">кому нужно внимание, сверху</p>
        </div>
        <button type="button" onClick={onAdd} className="flex h-10 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[14px] font-medium text-brand active:bg-slate-100">
          <Plus size={18} /> Добавить
        </button>
      </header>

      {filter ? (
        <button type="button" onClick={onClearFilter} className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-medium text-brand">
          фильтр: {FILTER_LABEL[filter]} <X size={14} />
        </button>
      ) : null}

      <div className="flex flex-col gap-3">
        {list.map((e) => (
          <StoreCard key={e.unit.publicId} e={e} onClick={() => onSelect(e)} />
        ))}
        {list.length === 0 ? <p className="px-1 py-6 text-center text-[14px] text-dim">Ничего не попало под фильтр.</p> : null}
      </div>
    </div>
  )
}

export function StoreCard({ e, onClick }: { e: Evaluation; onClick: () => void }) {
  const young = e.ageWeeks !== null && e.ageWeeks <= 26
  return (
    <Card
      className={cn(
        'w-full p-4 text-left active:bg-slate-50',
        e.level === 'red' && 'border-[#F0997B]',
        e.level === 'yellow' && 'border-[#FAC775]',
      )}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') onClick()
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <LevelDot level={e.level} />
          <span className="truncate text-[15px] font-medium text-ink">
            {e.unit.name}
            {e.unit.alias ? <span className="font-normal text-dim"> · {e.unit.alias}</span> : null}
          </span>
        </div>
        {young ? <Chip tone={e.young ? 'accent' : 'gray'}>нед. {e.ageWeeks}</Chip> : null}
      </div>

      {e.stats ? (
        <>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="tabular text-[13px] text-dim">
              вчера <span className="ml-1 text-[18px] font-semibold text-ink">{fmtRub(e.yesterday.value)}</span>
            </span>
            <Chip>чек {fmtRub(e.yesterday.avgCheck)}</Chip>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="tabular text-[13px] text-dim">
              сейчас <span className="ml-1 text-[15px] font-semibold text-ink">{fmtRub(e.now.value)}</span>
            </span>
            {e.opening.closedToday ? (
              <Chip>сегодня закрыто</Chip>
            ) : !e.now.ready && e.opening.opensAt !== null ? (
              <Chip>откроется в {fmtClock(e.opening.opensAt)}</Chip>
            ) : (
              <TrendBadge value={e.now.vsWeek} muted={e.now.vsWeekMuted} size="sm" />
            )}
          </div>
          <p className="mt-2 text-[12px] leading-4 text-dim">
            {fmtOrders(e.yesterday.orders)} вчера · сейчас {fmtOrders(e.now.orders)}
            {e.reasons.length ? <span className="text-down"> · {e.reasons.join(' · ')}</span> : null}
          </p>
        </>
      ) : (
        <p className="mt-2 text-[13px] text-dim">Нет данных от публичного API.</p>
      )}
    </Card>
  )
}
