import type { ReactNode } from 'react'
import { useModalFocus } from './useModalFocus'

interface ModalSheetProps {
  children: ReactNode
  labelId: string
  onClose: () => void
}

export function ModalSheet({ children, labelId, onClose }: ModalSheetProps) {
  const { containerRef, handleKeyDown } = useModalFocus<HTMLElement>(onClose)

  return (
    <section
      aria-labelledby={labelId}
      aria-modal="true"
      className="module-form"
      onKeyDown={handleKeyDown}
      ref={containerRef}
      role="dialog"
    >
      {children}
    </section>
  )
}
