import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtPct } from '@/lib/format'

type Props = {
  value: number | null
  muted?: boolean
  size?: 'sm' | 'md'
  className?: string
  label?: string
}

export function TrendBadge({ value, muted = false, size = 'md', className, label }: Props) {
  const has = value !== null && Number.isFinite(value)
  const dir = !has || muted ? 'neutral' : value! > 0.05 ? 'up' : value! < -0.05 ? 'down' : 'flat'
  const Icon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : null
  return (
    <span
      className={cn(
        'tabular inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
        size === 'md' ? 'px-2.5 py-1 text-[13px]' : 'px-2 py-0.5 text-[12px]',
        dir === 'up' && 'bg-up-bg text-up',
        dir === 'down' && 'bg-down-bg text-down',
        (dir === 'neutral' || dir === 'flat') && 'bg-slate-100 text-dim',
        className,
      )}
      title={muted ? 'мало заказов в базе, процент ненадёжен' : undefined}
    >
      {Icon ? <Icon size={size === 'md' ? 14 : 12} strokeWidth={2.2} aria-hidden /> : null}
      {label ?? (has ? fmtPct(value) : '—')}
    </span>
  )
}

export function Chip({ children, className, tone = 'gray' }: { children: React.ReactNode; className?: string; tone?: 'gray' | 'accent' | 'brand' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        tone === 'gray' && 'bg-slate-100 text-dim',
        tone === 'accent' && 'bg-accent-soft text-[#8A4A12]',
        tone === 'brand' && 'bg-brand-soft text-brand',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function LevelDot({ level, className }: { level: 'red' | 'yellow' | 'green' | 'gray'; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-2.5 shrink-0 rounded-full',
        level === 'red' && 'bg-red',
        level === 'yellow' && 'bg-amber',
        level === 'green' && 'bg-green',
        level === 'gray' && 'bg-slate-300',
        className,
      )}
    />
  )
}
