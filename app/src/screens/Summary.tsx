import { RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Chip, LevelDot, TrendBadge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { fmtDayShort, fmtOrders, fmtPct, fmtRub, weekdayAccusative } from '@/lib/format'
import { pct, type Evaluation, type Level } from '@/lib/metrics'
import { unitNow } from '@/lib/time'
import { DEPARTMENT_NAME } from '@/lib/units'
import { cn } from '@/lib/utils'

export type StoresFilter = Level | 'ramp' | null

type Props = {
  evals: Evaluation[]
  updatedAt: number | null
  loading: boolean
  onRefresh: () => void
  onShowStores: (filter: StoresFilter) => void
  historyFrom: string | null
}

export const shortName = (name: string) => name.replace(/^Москва\s+/u, '')

export function Summary({ evals, updatedAt, loading, onRefresh, onShowStores, historyFrom }: Props) {
  const withStats = evals.filter((e) => e.stats)
  const todayIso = withStats[0]?.stats?.date ?? unitNow(3).iso
  const yDate = withStats[0]?.yesterday.date ?? unitNow(3).iso

  const nowSum = withStats.reduce((s, e) => s + e.now.value, 0)
  const baseWeek = withStats.reduce((s, e) => s + e.now.baseWeek, 0)
  const baseY = withStats.reduce((s, e) => s + e.now.baseYesterday, 0)
  const nowOrdersBase = withStats.reduce((s, e) => s + (e.stats?.weekBeforeToThisTime.orderCount ?? 0), 0)
  const vsWeek = pct(nowSum, baseWeek)
  const vsY = pct(nowSum, baseY)

  const ySum = withStats.reduce((s, e) => s + e.yesterday.value, 0)
  const yOrders = withStats.reduce((s, e) => s + e.yesterday.orders, 0)
  const avgCheck = yOrders ? ySum / yOrders : 0

  const reds = evals.filter((e) => e.level === 'red')
  const yellows = evals.filter((e) => e.level === 'yellow')
  const grays = evals.filter((e) => e.level === 'gray')
  const greens = evals.filter((e) => e.level === 'green')
  const ramp = evals.filter((e) => e.ageWeeks !== null && e.ageWeeks <= 26).sort((a, b) => (a.ageWeeks ?? 0) - (b.ageWeeks ?? 0))

  const updatedLabel = updatedAt ? new Date(updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div className="px-4 pt-3">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink">Дринкит · {DEPARTMENT_NAME}</h1>
          <p className="text-[13px] text-dim">{fmtDayShort(todayIso)} · {evals.length} {evals.length === 1 ? 'точка' : evals.length < 5 ? 'точки' : 'точек'}</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Обновить"
          className="grid size-10 place-items-center rounded-full border border-line bg-white text-dim active:bg-slate-100"
        >
          <RefreshCw size={18} className={cn(loading && 'animate-spin')} />
        </button>
      </header>

      <div className="flex flex-col gap-3">
        <StatCard
          label={`Сейчас, ${updatedLabel}`}
          value={withStats.length ? fmtRub(nowSum) : '—'}
          badge={<TrendBadge value={vsWeek} muted={nowOrdersBase < 20} />}
          caption={
            withStats.length
              ? `к ${weekdayAccusative(todayIso)} неделю назад к этому часу · к вчера к этому часу ${fmtPct(vsY)}`
              : 'нет связи с публичным API'
          }
        />

        <StatCard
          label={`Вчера, ${fmtDayShort(yDate)}`}
          value={withStats.length ? fmtRub(ySum) : '—'}
          right={withStats.length ? <Chip>чек {fmtRub(avgCheck)}</Chip> : null}
          caption={withStats.length ? `${fmtOrders(yOrders)} по ${withStats.length} ${withStats.length === 1 ? 'точке' : 'точкам'}` : undefined}
        />

        <Card className="divide-y divide-line">
          <StatusRow level="red" title="Внимание" onClick={() => onShowStores('red')} value={reds.length ? reds.map((e) => shortName(e.unit.name)).join(', ') : 'никого'} />
          <StatusRow level="yellow" title="Присмотреться" onClick={() => onShowStores('yellow')} value={yellows.length ? yellows.map((e) => shortName(e.unit.name)).join(', ') : 'никого'} />
          <StatusRow
            tone="accent"
            title="Разгон"
            onClick={() => onShowStores('ramp')}
            value={ramp.length ? ramp.map((e) => `${shortName(e.unit.name)} нед. ${e.ageWeeks}`).join(' · ') : 'нет молодых точек'}
          />
          <StatusRow level="green" title="В норме" onClick={() => onShowStores('green')} value={`${greens.length} ${greens.length === 1 ? 'точка' : greens.length < 5 ? 'точки' : 'точек'}${grays.length ? ` · без данных ${grays.length}` : ''}`} />
        </Card>

        <p className="px-1 text-[12px] leading-4 text-dim">
          Данные публичного API Дринкит, обновляются каждые 5 минут. История для «Разгона» и графиков по дням копится раз в сутки{historyFrom ? ` с ${fmtDayShort(historyFrom)}` : ''}.
        </p>
      </div>
    </div>
  )
}

function StatusRow({ level, tone, title, value, onClick }: { level?: Level; tone?: 'accent'; title: string; value: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50 first:rounded-t-2xl last:rounded-b-2xl">
      {level ? <LevelDot level={level} /> : <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-full bg-accent" />}
      <span className={cn('w-[112px] shrink-0 text-[14px]', tone === 'accent' ? 'text-ink' : 'text-ink')}>{title}</span>
      <span className="line-clamp-2 min-w-0 flex-1 text-right text-[14px] leading-5 font-medium text-ink">{value}</span>
    </button>
  )
}
