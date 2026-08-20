interface ErrorStateProps {
  onRetry?: () => void
}

export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <section className="state-message" role="alert">
      <p>Impossible d’afficher aujourd’hui.</p>
      {onRetry === undefined ? null : (
        <button className="secondary-button" onClick={onRetry} type="button">
          Réessayer
        </button>
      )}
    </section>
  )
}
