import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ExternalLink, Maximize2 } from 'lucide-react'
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
const FRAME_H = 1010

export function Boards({ units, mode, onMode, selectedId, onSelect }: Props) {
  const selected = units.find((u) => u.publicId === selectedId) ?? units[0] ?? null

  return (
    <div className="px-4 pt-3">
      <header className="mb-3">
        <h1 className="text-[20px] font-semibold tracking-tight text-ink">Табло</h1>
        <p className="text-[13px] text-dim">табло мотивации Dodo IS, живое</p>
        <div className="mt-3 grid grid-cols-2 rounded-full border border-line bg-white p-0.5 text-[13px] font-medium" role="tablist" aria-label="Режим табло">
          {(['overview', 'single'] as BoardsMode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => onMode(m)}
              className={cn('h-9 rounded-full whitespace-nowrap', mode === m ? 'bg-brand text-white' : 'text-dim')}
            >
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
          <p className="px-1 pt-1 text-[12px] leading-4 text-dim">Табло загружается несколько секунд: сайт Dodo проверяет браузер. Тап по мини-табло открывает его целиком.</p>
        </div>
      ) : selected ? (
        <div>
          <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
            {units.map((u) => (
              <button
                key={u.publicId}
                type="button"
                onClick={() => onSelect(u.publicId)}
                className={cn('h-9 shrink-0 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap', u.publicId === selected.publicId ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink')}
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
              style={{ height: 'clamp(480px, calc(100dvh - 300px), 760px)' }}
              loading="eager"
            />
          </Card>
          <div className="mt-2 flex items-center justify-between gap-3 px-1">
            <p className="text-[12px] leading-4 text-dim">{selected.alias ?? selected.address ?? ''}. Внутри табло листается лента заказов.</p>
            <a
              href={boardUrl(selected)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-line bg-white px-3 text-[12px] font-medium whitespace-nowrap text-brand"
            >
              <ExternalLink size={14} /> В браузере
            </a>
          </div>
          <p className="mt-2 px-1 text-[12px] leading-4 text-dim">Если табло остаётся пустым дольше минуты, откройте его кнопкой «В браузере».</p>
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
        for (const en of entries) if (en.isIntersecting) setVisible(true)
      },
      { rootMargin: '400px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Card className="overflow-hidden">
      <div className="flex h-12 items-center justify-between gap-2 px-4">
        <p className="truncate text-[14px] font-medium text-ink">
          {unit.name}
          {unit.alias ? <span className="font-normal text-dim"> · {unit.alias}</span> : null}
        </p>
        <button type="button" onClick={onOpen} aria-label={`Открыть табло ${unit.name}`} className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-dim">
          <Maximize2 size={15} />
        </button>
      </div>
      <div ref={ref} className="relative w-full overflow-hidden bg-[#F6F8FD]" style={{ aspectRatio: `${FRAME_W} / ${FRAME_H}` }}>
        {visible ? (
          <iframe
            src={boardUrl(unit)}
            title={`Табло ${unit.name}`}
            loading="lazy"
            scrolling="no"
            className="pointer-events-none absolute top-0 left-0 max-w-none border-0 bg-white"
            style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})`, transformOrigin: '0 0' }}
          />
        ) : null}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-14" style={{ background: 'linear-gradient(to bottom, rgba(246,248,253,0), #F6F8FD)' }} />
        <button type="button" onClick={onOpen} aria-label={`Открыть табло ${unit.name}`} className="absolute inset-0" />
      </div>
    </Card>
  )
}
