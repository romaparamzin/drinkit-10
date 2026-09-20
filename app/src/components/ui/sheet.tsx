import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

type Props = {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  full?: boolean
}

export function Sheet({ open, onClose, title, children, full = false }: Props) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="backdrop"
          className="fixed inset-0 z-30 flex items-end justify-center bg-ink/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="flex w-full max-w-[560px] flex-col rounded-t-3xl bg-ice"
            style={{ maxHeight: full ? '96dvh' : '90dvh' }}
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
              <div className="mx-auto h-1 w-10 rounded-full bg-slate-300 absolute left-1/2 top-2 -translate-x-1/2" aria-hidden />
              <div className="min-w-0 pt-2 text-[16px] font-semibold text-ink">{title}</div>
              <button type="button" onClick={onClose} aria-label="Закрыть" className="mt-2 grid size-9 shrink-0 place-items-center rounded-full bg-white text-dim border border-line">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
