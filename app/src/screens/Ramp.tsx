import { Card } from '@/components/ui/card'
import { Chip, TrendBadge } from '@/components/ui/badge'
import { historyStart, rampSeries, type History } from '@/data/history'
import { fmtDayNum, fmtRub, fmtRubShort } from '@/lib/format'
import { pct, type Evaluation } from '@/lib/metrics'
import { addDays } from '@/lib/time'
import { shortName } from './Summary'

const COLORS = ['#334CDB', '#E8842C', '#1D9E75', '#D85A30', '#7F77DD', '#0F6E56', '#993556', '#BA7517', '#185FA5', '#639922']

type Props = {
  evals: Evaluation[]
  history: History
  todayIso: string
  historyFrom: string | null
  onSelect: (e: Evaluation) => void
}

export function Ramp({ evals, history, todayIso, historyFrom, onSelect }: Props) {
  const young = evals
    .filter((e) => e.ageWeeks !== null && e.ageWeeks <= 26)
    .sort((a, b) => (a.ageWeeks ?? 0) - (b.ageWeeks ?? 0))

  const series = young.map((e, i) => ({ e, color: COLORS[i % COLORS.length], points: rampSeries(history, e.unit, todayIso) }))
  const allPoints = series.flatMap((s) => s.points)
  const daysCount = Object.keys(history.days).filter((d) => d < todayIso).length
  const maxWeek = Math.max(4, ...series.map((s) => s.e.ageWeeks ?? 0))
  const maxY = Math.max(1, ...allPoints.map((p) => p.avgRevenue))
  const W = 100
  const H = 56
  const x = (week: number) => ((week - 1) / Math.max(1, maxWeek - 1)) * (W - 4) + 2
  const y = (v: number) => H - 3 - (v / maxY) * (H - 8)

  return (
    <div className="px-4 pt-3">
      <header className="mb-3">
        <h1 className="text-[20px] font-semibold tracking-tight text-ink">Разгон</h1>
        <p className="text-[13px] text-dim">точки младше полугода, выровнены по неделе с открытия</p>
      </header>

      <Card className="p-4">
        {allPoints.length >= 2 ? (
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="200" preserveAspectRatio="none" role="img" aria-label="Средняя дневная выручка по неделям с открытия">
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1={0} x2={W} y1={y(maxY * f)} y2={y(maxY * f)} stroke="#E3E8F2" strokeWidth={0.4} />
            ))}
            {series.map((s) =>
              s.points.length ? (
                <g key={s.e.unit.publicId}>
                  <polyline fill="none" stroke={s.color} strokeWidth={1.1} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" points={s.points.map((p) => `${x(p.weekIndex)},${y(p.avgRevenue)}`).join(' ')} />
                  {s.points.map((p) => (
                    <circle key={p.weekIndex} cx={x(p.weekIndex)} cy={y(p.avgRevenue)} r={1.4} fill={s.color}>
                      <title>{`${s.e.unit.name}, неделя ${p.weekIndex}: ${fmtRub(p.avgRevenue)} в день (${p.days} дн.)`}</title>
                    </circle>
                  ))}
                </g>
              ) : null,
            )}
          </svg>
        ) : (
          <div className="grid h-[160px] place-items-center text-center text-[13px] text-dim">
            Кривые появятся по мере накопления истории.
            <br />
            {historyFrom ? `Сейчас есть данные с ${fmtDayNum(historyFrom)}.` : 'Данных пока нет.'}
          </div>
        )}
        <div className="mt-1 flex justify-between text-[11px] text-dim">
          <span>неделя 1</span>
          <span>макс. {fmtRubShort(maxY)} в день</span>
          <span>неделя {maxWeek}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
          {series.map((s) => (
            <span key={s.e.unit.publicId} className="inline-flex items-center gap-1.5 text-[12px] text-ink">
              <span className="inline-block size-2 rounded-full" style={{ background: s.color }} aria-hidden />
              {shortName(s.e.unit.name)}
              <span className="text-dim">нед. {s.e.ageWeeks}</span>
            </span>
          ))}
        </div>
      </Card>

      <div className="mt-3 flex flex-col gap-2">
        {series.map((s) => {
          const last = s.points.at(-1) ?? null
          const prev = s.points.length >= 2 ? s.points[s.points.length - 2] : null
          const vs = last && prev && prev.weekIndex === last.weekIndex - 1 ? pct(last.avgRevenue, prev.avgRevenue) : null
          return (
            <Card key={s.e.unit.publicId} className="flex items-center gap-3 p-3.5 active:bg-slate-50" role="button" tabIndex={0} onClick={() => onSelect(s.e)}>
              <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">
                  {s.e.unit.name}
                  {s.e.unit.alias ? <span className="font-normal text-dim"> · {s.e.unit.alias}</span> : null}
                </p>
                <p className="text-[12px] text-dim">
                  {last ? `нед. ${last.weekIndex}: ${fmtRub(last.avgRevenue)} в день` : 'нет истории'}
                  {s.e.unit.beginDateWork ? ` · открыта ${fmtDayNum(s.e.unit.beginDateWork)}` : ''}
                </p>
              </div>
              <Chip tone={s.e.young ? 'accent' : 'gray'}>нед. {s.e.ageWeeks}</Chip>
              <TrendBadge value={vs} size="sm" />
            </Card>
          )
        })}
        {series.length === 0 ? <p className="px-1 py-6 text-center text-[14px] text-dim">Молодых точек нет.</p> : null}
      </div>
      <Card className="mt-3 p-4">
        <p className="text-[13px] font-medium text-ink">Как это считается</p>
        <p className="mt-1 text-[12px] leading-4 text-dim">
          Точка на графике это средняя выручка за день внутри одной недели после открытия: сумма выручки известных дней недели, делённая на их число. Неделя 1 это первые семь дней работы. Выручка берётся из публичного API Дринкит, это суммы по чекам с НДС.
        </p>
        <p className="mt-2 text-[12px] leading-4 text-dim">
          {historyFrom
            ? `Публичный API не отдаёт прошлое, поэтому историю копит сборщик: он работает с ${fmtDayNum(historyStart(historyFrom))} и каждую ночь добавляет два дня, вчерашний и тот же день недели неделю назад. Сейчас есть ${daysCount} ${daysCount === 1 ? 'день' : daysCount < 5 ? 'дня' : 'дней'}, сплошная история с ${fmtDayNum(historyFrom)} накопится к ${fmtDayNum(addDays(historyStart(historyFrom), 7))}, дальше по одному новому дню в сутки. Прошлое до ${fmtDayNum(historyFrom)} восстановить можно только через Dodo IS API.`
            : 'Публичный API не отдаёт прошлое, историю копит сборщик, данных пока нет.'}
        </p>
      </Card>
    </div>
  )
}
