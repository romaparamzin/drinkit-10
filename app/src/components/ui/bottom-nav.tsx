import { motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NavItem = { label: string; icon: LucideIcon }

type Props = {
  items: NavItem[]
  activeIndex: number
  onChange: (index: number) => void
  className?: string
}

const LABEL_WIDTH = 64

export function BottomNav({ items, activeIndex, onChange, className }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+10px)]">
      <motion.nav
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        role="navigation"
        aria-label="Разделы"
        className={cn(
          'pointer-events-auto flex h-[56px] items-center gap-1 rounded-full border border-line bg-white/95 p-1.5 shadow-[0_8px_24px_rgba(22,23,29,0.10)] backdrop-blur',
          className,
        )}
      >
        {items.map((item, idx) => {
          const Icon = item.icon
          const active = idx === activeIndex
          return (
            <motion.button
              key={item.label}
              whileTap={{ scale: 0.96 }}
              type="button"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              onClick={() => onChange(idx)}
              className={cn(
                'relative flex h-11 min-w-[44px] items-center rounded-full px-3 transition-colors duration-200',
                active ? 'bg-brand text-white' : 'text-dim active:bg-slate-100',
              )}
            >
              <Icon size={21} strokeWidth={2} aria-hidden />
              <motion.div
                initial={false}
                animate={{ width: active ? LABEL_WIDTH : 0, opacity: active ? 1 : 0, marginLeft: active ? 8 : 0 }}
                transition={{ width: { type: 'spring', stiffness: 350, damping: 32 }, opacity: { duration: 0.18 }, marginLeft: { duration: 0.18 } }}
                className="flex items-center overflow-hidden"
              >
                <span className="text-[13px] font-medium whitespace-nowrap select-none">{item.label}</span>
              </motion.div>
            </motion.button>
          )
        })}
      </motion.nav>
    </div>
  )
}
