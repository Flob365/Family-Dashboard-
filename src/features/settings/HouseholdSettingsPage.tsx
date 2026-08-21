import { type FormEvent, useState } from 'react'
import { Copy, Link2, Share2, UserPlus } from 'lucide-react'
import type { HouseholdMember } from '../../types/domain'
import { useAuth } from '../auth/AuthProvider'

export function HouseholdSettingsPage() {
  const auth = useAuth()
  const [invitedEmail, setInvitedEmail] = useState('')
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deliveryMessage, setDeliveryMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const invitedOwner: HouseholdMember['owner'] =
    auth.householdOwner === 'partner' ? 'florian' : 'partner'

  async function createInvitation(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setInvitationUrl(null)
    try {
      const token = await auth.issueInvitation(invitedEmail, invitedOwner)
      setInvitationUrl(
        `${window.location.origin}/bienvenue?invitation=${encodeURIComponent(token)}`,
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Cette invitation n’a pas pu être créée.')
    } finally {
      setSubmitting(false)
    }
  }

  async function copyInvitation() {
    if (invitationUrl === null) return
    try {
      if (navigator.clipboard === undefined) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(invitationUrl)
      setDeliveryMessage('Lien copié. Vous pouvez maintenant l’envoyer à votre femme.')
    } catch {
      setError('Impossible de copier automatiquement le lien. Sélectionnez-le pour le copier.')
    }
  }

  async function shareInvitation() {
    if (invitationUrl === null || navigator.share === undefined) return
    try {
      await navigator.share({
        title: 'Invitation Maison',
        text: 'Rejoins notre foyer dans Maison.',
        url: invitationUrl,
      })
      setDeliveryMessage('Invitation partagée.')
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setError('Le partage n’a pas pu être ouvert. Vous pouvez copier le lien à la place.')
    }
  }

  return (
    <section aria-labelledby="household-settings-title" className="module-page settings-page">
      <header className="module-page__header">
        <div>
          <h1 id="household-settings-title">Paramètres du foyer</h1>
          <p>Gérez les personnes qui partagent votre quotidien.</p>
        </div>
      </header>

      <section aria-labelledby="invite-partner-title" className="settings-card">
        <div className="settings-card__icon"><UserPlus aria-hidden="true" /></div>
        <div className="settings-card__content">
          <h2 id="invite-partner-title">Inviter votre partenaire</h2>
          <p>
            Créez un lien privé pour que votre femme rejoigne ce foyer avec son propre compte.
          </p>

          {auth.mode === 'demo' ? (
            <p className="settings-notice" role="status">
              Connectez-vous avec un compte réel pour envoyer une invitation.
            </p>
          ) : (
            <form className="settings-form" onSubmit={(event) => void createInvitation(event)}>
              <label className="form-field">
                Adresse e-mail de votre partenaire
                <input
                  autoComplete="email"
                  onChange={(event) => setInvitedEmail(event.target.value)}
                  placeholder="prenom@exemple.fr"
                  required
                  type="email"
                  value={invitedEmail}
                />
              </label>
              <p className="settings-help">Le lien sera valable 7 jours et utilisable une seule fois.</p>
              {error === null ? null : <p className="auth-message auth-message--error" role="alert">{error}</p>}
              <button className="primary-action" disabled={submitting} type="submit">
                <Link2 aria-hidden="true" />
                Créer le lien d’invitation
              </button>
            </form>
          )}

          {invitationUrl === null ? null : (
            <div className="invitation-result" role="status">
              <strong>Invitation prête</strong>
              <label className="form-field">
                Lien d’invitation
                <input aria-label="Lien d’invitation" readOnly value={invitationUrl} />
              </label>
              <div className="invitation-actions">
                <button className="secondary-button" onClick={() => void copyInvitation()} type="button">
                  <Copy aria-hidden="true" />
                  Copier le lien
                </button>
                {navigator.share === undefined ? null : (
                  <button className="primary-button" onClick={() => void shareInvitation()} type="button">
                    <Share2 aria-hidden="true" />
                    Partager le lien
                  </button>
                )}
              </div>
              {deliveryMessage === null ? null : <p>{deliveryMessage}</p>}
            </div>
          )}
        </div>
      </section>
    </section>
  )
}
