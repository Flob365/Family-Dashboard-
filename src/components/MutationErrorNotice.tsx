interface MutationErrorNoticeProps {
  message: string
  onClose: () => void
  onRetry?: () => void
}

export function MutationErrorNotice({ message, onClose, onRetry }: MutationErrorNoticeProps) {
  return (
    <div className="mutation-error" role="alert">
      <span>{message}</span>
      <div>
        {onRetry === undefined ? null : (
          <button className="text-button" onClick={onRetry} type="button">
            Réessayer
          </button>
        )}
        <button className="text-button" onClick={onClose} type="button">
          Fermer
        </button>
      </div>
    </div>
  )
}
