import { type FormEvent, useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { HouseholdMember } from '../../types/domain'
import { useAuth } from './AuthProvider'
import { capturePendingInvitation } from './pendingInvitation'

export function OnboardingPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [householdName, setHouseholdName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [owner, setOwner] = useState<HouseholdMember['owner']>('florian')
  const [token, setToken] = useState(() => capturePendingInvitation(location.search))
  const [createdHouseholdId, setCreatedHouseholdId] = useState<string | null>(null)
  const [invitedEmail, setInvitedEmail] = useState('')
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null)
  const [joinDisplayName, setJoinDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const hasInvitationParameter = new URLSearchParams(location.search).has('invitation')
  const invitedOwner: HouseholdMember['owner'] =
    (auth.householdOwner ?? owner) === 'florian' ? 'partner' : 'florian'

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (!params.has('invitation')) return
    params.delete('invitation')
    navigate(
      { pathname: location.pathname, search: params.size === 0 ? '' : `?${params.toString()}` },
      { replace: true },
    )
  }, [location.pathname, location.search, navigate])

  if (hasInvitationParameter) return <main className="auth-page" aria-label="Chargement" />
  if (auth.mode !== 'connected' || auth.user === null) return <Navigate replace to="/connexion" />
  if (auth.householdId !== null && createdHouseholdId === null) return <Navigate replace to="/" />

  async function create(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const newHouseholdId = await auth.createHousehold(householdName, displayName, owner)
      setCreatedHouseholdId(newHouseholdId)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La création du foyer a échoué.')
    } finally {
      setSubmitting(false)
    }
  }

  async function issueInvitation(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const invitationToken = await auth.issueInvitation(invitedEmail, invitedOwner)
      setInvitationUrl(
        `${window.location.origin}/bienvenue?invitation=${encodeURIComponent(invitationToken)}`,
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Cette invitation n’a pas pu être créée.')
    } finally {
      setSubmitting(false)
    }
  }

  async function join(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await auth.acceptInvitation(token.trim(), joinDisplayName)
      navigate('/', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Cette invitation ne peut pas être acceptée.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page auth-page--onboarding">
      <div className="onboarding-layout">
        <header className="onboarding-heading">
          <span className="wordmark">Maison</span>
          <h1>Bienvenue dans votre espace familial</h1>
          <p>Créez votre foyer ou rejoignez celui de votre partenaire avec son invitation.</p>
        </header>
        {error !== null ? <p className="auth-message auth-message--error" role="alert">{error}</p> : null}
        {createdHouseholdId === null ? <section className="auth-card" aria-labelledby="create-household-title">
          <h2 id="create-household-title">Créer un foyer</h2>
          <form className="auth-form" onSubmit={(event) => void create(event)}>
            <label>Nom du foyer<input onChange={(event) => setHouseholdName(event.target.value)} required value={householdName} /></label>
            <label>Votre prénom<input onChange={(event) => setDisplayName(event.target.value)} required value={displayName} /></label>
            <label>
              Votre repère
              <select onChange={(event) => setOwner(event.target.value as HouseholdMember['owner'])} value={owner}>
                <option value="florian">Florian</option>
                <option value="partner">Partenaire</option>
              </select>
            </label>
            <button className="auth-primary" disabled={submitting} type="submit">Créer mon foyer</button>
          </form>
        </section> : (
          <section className="auth-card" aria-labelledby="invite-household-title">
            <h2 id="invite-household-title">Inviter votre partenaire</h2>
            <p>La personne invitée devra s’inscrire ou se connecter avec exactement cette adresse e-mail.</p>
            <form className="auth-form" onSubmit={(event) => void issueInvitation(event)}>
              <label>Adresse e-mail invitée<input onChange={(event) => setInvitedEmail(event.target.value)} required type="email" value={invitedEmail} /></label>
              <label>
                Repère de la personne invitée
                <select disabled value={invitedOwner}>
                  <option value={invitedOwner}>{invitedOwner === 'partner' ? 'Partenaire' : 'Florian'}</option>
                </select>
              </label>
              <button className="auth-primary" disabled={submitting} type="submit">Créer le lien d’invitation</button>
            </form>
            {invitationUrl !== null ? (
              <div className="auth-form">
                <label>Lien à copier<input aria-label="Lien d’invitation" readOnly value={invitationUrl} /></label>
                <button className="auth-link" onClick={() => void navigator.clipboard?.writeText(invitationUrl)} type="button">Copier le lien</button>
              </div>
            ) : null}
            <button className="auth-link" onClick={() => navigate('/', { replace: true })} type="button">Accéder au foyer</button>
          </section>
        )}
        {createdHouseholdId === null ? <section className="auth-card" aria-labelledby="join-household-title">
          <h2 id="join-household-title">Rejoindre un foyer</h2>
          <form className="auth-form" onSubmit={(event) => void join(event)}>
            <label>Jeton d’invitation<input onChange={(event) => setToken(event.target.value)} required value={token} /></label>
            <label>Votre prénom<input onChange={(event) => setJoinDisplayName(event.target.value)} required value={joinDisplayName} /></label>
            <button className="auth-primary" disabled={submitting} type="submit">Accepter l’invitation</button>
          </form>
        </section> : null}
        <button className="auth-link" onClick={() => void auth.signOut()} type="button">Se déconnecter</button>
      </div>
    </main>
  )
}
