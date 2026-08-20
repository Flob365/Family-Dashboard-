import type { ReactNode } from 'react'
import { useModalFocus } from './useModalFocus'

interface ConfirmDialogProps {
  children: ReactNode
  confirmLabel: string
  label: string
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({ children, confirmLabel, label, onCancel, onConfirm }: ConfirmDialogProps) {
  const { containerRef, handleKeyDown } = useModalFocus<HTMLDivElement>(onCancel)

  return (
    <div
      aria-label={label}
      aria-modal="true"
      className="confirmation"
      onKeyDown={handleKeyDown}
      ref={containerRef}
      role="alertdialog"
    >
      <p>{children}</p>
      <div>
        <button className="secondary-button" data-autofocus onClick={onCancel} type="button">
          Annuler
        </button>
        <button className="danger-button" onClick={() => void onConfirm()} type="button">
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}
