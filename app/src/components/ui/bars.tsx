import { fmtDayNum, fmtRub, fmtRubShort } from '@/lib/format'

export type Bar = { date: string; value: number | null; highlight?: boolean; weekend?: boolean }

export function Bars({ data, height = 120 }: { data: Bar[]; height?: number }) {
  const values = data.map((d) => d.value ?? 0)
  const max = Math.max(1, ...values)
  const n = data.length
  const gap = n > 20 ? 2 : 4
  const w = 100
  const bw = (w - gap * (n - 1)) / n
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" width="100%" height={height} role="img" aria-label="Выручка по дням">
        {data.map((d, i) => {
          const h = d.value ? Math.max(1.5, (d.value / max) * (height - 4)) : 1.5
          const x = i * (bw + gap)
          const fill = d.value === null ? '#E3E8F2' : d.highlight ? '#334CDB' : d.weekend ? '#9FB0F0' : '#C9D1E3'
          return (
            <rect key={d.date} x={x} y={height - h} width={bw} height={h} rx={1} fill={fill}>
              <title>{`${fmtDayNum(d.date)}: ${d.value === null ? 'нет данных' : fmtRub(d.value)}`}</title>
            </rect>
          )
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-dim">
        <span>{data[0] ? fmtDayNum(data[0].date) : ''}</span>
        <span>макс. {fmtRubShort(max)}</span>
        <span>{data[n - 1] ? fmtDayNum(data[n - 1].date) : ''}</span>
      </div>
    </div>
  )
}
