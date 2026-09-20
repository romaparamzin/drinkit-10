import { useEffect, useState } from 'react'
import { EyeOff, MonitorSmartphone } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Card } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Chip, TrendBadge } from '@/components/ui/badge'
import { Bars } from '@/components/ui/bars'
import { calendarWeeks, earliestDate, historyStart, lastNDays, type History } from '@/data/history'
import { addDays } from '@/lib/time'
import { fmtDayNum, fmtDayShort, fmtOrders, fmtPct, fmtRub, weekdayAccusative } from '@/lib/format'
import type { Evaluation } from '@/lib/metrics'
import type { Unit } from '@/lib/units'
import { cn } from '@/lib/utils'

/** История по дням и неделям скрыта 20.09.2026 до накопления данных сборщиком; вернуть, переключив флаг. */
const SHOW_HISTORY = false

type Props = {
  evaluation: Evaluation | null
  history: History
  onClose: () => void
  onOpenBoard: (unit: Unit) => void
  onHide: (unit: Unit) => void
}

export function StoreDetail({ evaluation, history, onClose, onOpenBoard, onHide }: Props) {
  const [range, setRange] = useState<14 | 28>(14)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const e = evaluation
  const open = e !== null
  useEffect(() => setConfirmRemove(false), [e?.unit.publicId])

  let body: React.ReactNode = null
  if (e) {
    const u = e.unit
    const todayIso = e.stats?.date ?? e.opening.todayIso
    const bars = lastNDays(history, u.publicId, e.yesterday.date, range).map((d) => {
      const dow = new Date(`${d.date}T00:00:00Z`).getUTCDay()
      return { date: d.date, value: d.rec ? d.rec.revenue : null, highlight: d.date === e.yesterday.date, weekend: dow === 0 || dow === 6 }
    })
    const known = bars.filter((b) => b.value !== null).length
    const weeks = calendarWeeks(history, u.publicId, todayIso, 4)
    const from = earliestDate(history)

    body = (
      <div className="flex flex-col gap-3 pb-2">
        <p className="text-[13px] text-dim">
          {u.address ? `${u.address} · ` : ''}
          {u.beginDateWork ? `открыта ${fmtDayNum(u.beginDateWork)}.${u.beginDateWork.slice(0, 4)}` : ''}
          {e.ageWeeks !== null ? ` · неделя ${e.ageWeeks}` : ''}
        </p>

        {e.stats ? (
          <div className="flex flex-col gap-3">
            <StatCard
              label="Сейчас"
              value={fmtRub(e.now.value)}
              badge={e.now.ready ? <TrendBadge value={e.now.vsWeek} muted={e.now.vsWeekMuted} /> : <Chip>ещё закрыто</Chip>}
              caption={`к ${weekdayAccusative(todayIso)} неделю назад к этому часу · к вчера к этому часу ${fmtPct(e.now.vsYesterday)} · ${fmtOrders(e.now.orders)}`}
            />
            <StatCard
              label={`Вчера, ${fmtDayShort(e.yesterday.date)}`}
              value={fmtRub(e.yesterday.value)}
              right={<Chip>чек {fmtRub(e.yesterday.avgCheck)}</Chip>}
              caption={fmtOrders(e.yesterday.orders)}
            />
          </div>
        ) : (
          <Card className="p-4 text-[14px] text-dim">Нет данных от публичного API.</Card>
        )}

        {SHOW_HISTORY ? (
          <>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] text-dim">Выручка по дням</p>
            <div className="flex rounded-full bg-slate-100 p-0.5 text-[12px] font-medium">
              {[14, 28].map((n) => (
                <button key={n} type="button" onClick={() => setRange(n as 14 | 28)} className={cn('rounded-full px-3 py-1', range === n ? 'bg-white text-ink shadow-sm' : 'text-dim')}>
                  {n} дн.
                </button>
              ))}
            </div>
          </div>
          <Bars data={bars} />
          <p className="mt-2 text-[12px] leading-4 text-dim">
            {known < range ? `Есть данные за ${known} из ${range} дней. ` : ''}
            {from ? `Сборщик работает с ${fmtDayNum(historyStart(from))} и каждую ночь добавляет два дня: вчерашний и тот же день неделю назад, поэтому история заполняется постепенно и станет сплошной с ${fmtDayNum(from)} к ${fmtDayNum(addDays(historyStart(from), 7))}.` : 'История ещё не накоплена.'} Вчера подсвечено синим, выходные светлее.
          </p>
        </Card>

        <Card className="p-4">
          <p className="mb-2 text-[13px] text-dim">Недели, пн–вс</p>
          {weeks.length ? (
            <table className="w-full text-[13px]">
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.monday} className="border-t border-line first:border-t-0">
                    <td className="py-2 text-dim">с {fmtDayNum(w.monday)}</td>
                    <td className="tabular py-2 text-right font-medium text-ink">{fmtRub(w.sum)}</td>
                    <td className="py-2 pl-2 text-right text-dim">{w.days < 7 ? `${w.days} дн.` : ''}</td>
                    <td className="py-2 pl-2 text-right">
                      <TrendBadge value={w.vsPrev} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-[13px] text-dim">Появится, когда накопится хотя бы одна неделя.</p>
          )}
          <p className="mt-2 text-[12px] leading-4 text-dim">Процент считается только между неделями с одинаковым числом дней.</p>
        </Card>
          </>
        ) : null}

        <div className="mt-1 flex flex-col gap-2">
          <button type="button" onClick={() => onOpenBoard(u)} className="flex h-11 items-center justify-center gap-2 rounded-full bg-brand text-[15px] font-medium text-white active:opacity-90">
            <MonitorSmartphone size={18} /> Табло этой точки
          </button>
          {confirmRemove ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => onHide(u)} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-red text-[15px] font-medium text-white">
                Да, убрать с экрана
              </button>
              <button type="button" onClick={() => setConfirmRemove(false)} className="h-11 rounded-full border border-line bg-white px-5 text-[15px] font-medium text-dim">
                Нет
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmRemove(true)} className="flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-white text-[15px] font-medium text-down active:bg-slate-100">
              <EyeOff size={18} /> Убрать точку с экрана
            </button>
          )}
          <p className="px-1 text-[12px] leading-4 text-dim">Убранную точку можно вернуть через «Добавить» на экране «Точки».</p>
        </div>
        {e.stats ? (
          <p className="px-1 text-[12px] leading-4 text-dim">
            «Сейчас» сравнивается с {weekdayAccusative(todayIso)} неделю назад к этому же часу и с вчера к этому же часу.
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <Sheet open={open} onClose={onClose} title={e ? <span>{e.unit.name}{e.unit.alias ? <span className="font-normal text-dim"> · {e.unit.alias}</span> : null}</span> : null}>
      {body}
    </Sheet>
  )
}
