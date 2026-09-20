import type { ReactNode } from 'react'
import { Card, CardLabel, CardValue } from './card'
import { cn } from '@/lib/utils'

type Props = {
  label: ReactNode
  value: ReactNode
  badge?: ReactNode
  caption?: ReactNode
  right?: ReactNode
  className?: string
  children?: ReactNode
  onClick?: () => void
}

export function StatCard({ label, value, badge, caption, right, className, children, onClick }: Props) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Card className={cn('p-4', onClick && 'w-full text-left active:bg-slate-50', className)}>
      <Tag onClick={onClick} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <CardLabel>{label}</CardLabel>
          {right}
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <CardValue>{value}</CardValue>
          {badge}
        </div>
        {caption ? <p className="mt-1.5 text-[12px] leading-4 text-dim">{caption}</p> : null}
        {children}
      </Tag>
    </Card>
  )
}
