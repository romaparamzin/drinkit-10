import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { boardUrl, type Unit } from '@/lib/units'
import { cn } from '@/lib/utils'
import { shortName } from './Summary'

export type BoardsMode = 'overview' | 'single'

type Props = {
  units: Unit[]
  mode: BoardsMode
  onMode: (m: BoardsMode) => void
  selectedId: number | null
  onSelect: (id: number) => void
}

const FRAME_W = 820
const FRAME_H = 960

export function Boards({ units, mode, onMode, selectedId, onSelect }: Props) {
  const selected = units.find((u) => u.publicId === selectedId) ?? units[0] ?? null

  return (
    <div className="px-4 pt-3">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink">Табло</h1>
          <p className="text-[13px] text-dim">табло мотивации Dodo IS, живое</p>
        </div>
        <div className="flex rounded-full bg-white p-0.5 text-[13px] font-medium border border-line">
          {(['overview', 'single'] as BoardsMode[]).map((m) => (
            <button key={m} type="button" onClick={() => onMode(m)} className={cn('rounded-full px-3 py-1.5', mode === m ? 'bg-brand text-white' : 'text-dim')}>
              {m === 'overview' ? 'Обзор' : 'Одна точка'}
            </button>
          ))}
        </div>
      </header>

      {mode === 'overview' ? (
        <div className="flex flex-col gap-3">
          {units.map((u) => (
            <BoardThumb
              key={u.publicId}
              unit={u}
              onOpen={() => {
                onSelect(u.publicId)
                onMode('single')
              }}
            />
          ))}
        </div>
      ) : selected ? (
        <div>
          <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
            {units.map((u) => (
              <button
                key={u.publicId}
                type="button"
                onClick={() => onSelect(u.publicId)}
                className={cn('shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium', u.publicId === selected.publicId ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink')}
              >
                {shortName(u.name)}
              </button>
            ))}
          </div>
          <Card className="overflow-hidden">
            <iframe
              key={selected.publicId}
              src={boardUrl(selected)}
              title={`Табло ${selected.name}`}
              className="block w-full border-0 bg-white"
              style={{ height: 'max(520px, calc(100dvh - 230px))' }}
              loading="eager"
            />
          </Card>
          <p className="mt-2 px-1 text-[12px] leading-4 text-dim">{selected.alias ?? selected.address ?? ''}. Внутри табло листается лента заказов.</p>
        </div>
      ) : (
        <p className="py-6 text-center text-[14px] text-dim">Нет точек.</p>
      )}
    </div>
  )
}

function BoardThumb({ unit, onOpen }: { unit: Unit; onOpen: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.4)
  const [visible, setVisible] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(el.clientWidth / FRAME_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) setVisible(en.isIntersecting)
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        <p className="truncate text-[14px] font-medium text-ink">
          {unit.name}
          {unit.alias ? <span className="font-normal text-dim"> · {unit.alias}</span> : null}
        </p>
        <button type="button" onClick={onOpen} aria-label={`Открыть табло ${unit.name}`} className="grid size-8 place-items-center rounded-full bg-slate-100 text-dim">
          <Maximize2 size={15} />
        </button>
      </div>
      <div ref={ref} className="relative w-full bg-[#F6F8FD]" style={{ aspectRatio: `${FRAME_W} / ${FRAME_H}` }}>
        {visible ? (
          <iframe
            src={boardUrl(unit)}
            title={`Табло ${unit.name}`}
            loading="lazy"
            className="pointer-events-none absolute top-0 left-0 border-0 bg-white"
            style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})`, transformOrigin: '0 0' }}
          />
        ) : null}
        <button type="button" onClick={onOpen} aria-label={`Открыть табло ${unit.name}`} className="absolute inset-0" />
      </div>
    </Card>
  )
}
