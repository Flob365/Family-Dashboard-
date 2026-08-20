interface EmptyStateProps {
  title: string
}

export function EmptyState({ title }: EmptyStateProps) {
  return (
    <section className="state-message" aria-labelledby="empty-state-title">
      <h1 id="empty-state-title">{title}</h1>
    </section>
  )
}
