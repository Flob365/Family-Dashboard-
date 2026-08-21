import { type FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function SignInPage() {
  const auth = useAuth()
  const [intent, setIntent] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (auth.mode === 'demo') return <Navigate replace to="/" />
  if (auth.mode === 'connected' && auth.user !== null && !auth.isPasswordRecovery) {
    return <Navigate replace to={auth.householdId === null ? '/bienvenue' : '/'} />
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await auth.updatePassword(password)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le mot de passe n’a pas pu être modifié.')
    } finally {
      setSubmitting(false)
    }
  }

  if (auth.isPasswordRecovery) {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-labelledby="password-recovery-title">
          <span className="wordmark">Maison</span>
          <h1 id="password-recovery-title">Choisir un nouveau mot de passe</h1>
          <p>Utilisez au moins 8 caractères.</p>
          <form className="auth-form" onSubmit={(event) => void updatePassword(event)}>
            <label>
              Nouveau mot de passe
              <input
                autoComplete="new-password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            {error !== null ? <p className="auth-message auth-message--error" role="alert">{error}</p> : null}
            <button className="auth-primary" disabled={submitting} type="submit">
              Enregistrer le mot de passe
            </button>
          </form>
        </section>
      </main>
    )
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      if (intent === 'signin') await auth.signIn(email, password)
      else {
        const result = await auth.signUp(email, password)
        if (result.confirmationRequired) {
          setMessage('Consultez votre e-mail pour confirmer votre compte, puis revenez vous connecter.')
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La connexion a échoué.')
    } finally {
      setSubmitting(false)
    }
  }

  async function resetPassword() {
    if (email.trim().length === 0) {
      setError('Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await auth.requestPasswordReset(email)
      setMessage('Un lien de réinitialisation vient de vous être envoyé.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La demande a échoué.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <span className="wordmark">Maison</span>
        <h1 id="auth-title">{intent === 'signin' ? 'Connexion' : 'Créer un compte'}</h1>
        <p>Retrouvez le quotidien partagé de votre foyer.</p>

        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label>
            Adresse e-mail
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Mot de passe
            <input
              autoComplete={intent === 'signin' ? 'current-password' : 'new-password'}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error !== null ? <p className="auth-message auth-message--error" role="alert">{error}</p> : null}
          {message !== null ? <p className="auth-message" role="status">{message}</p> : null}
          <button className="auth-primary" disabled={submitting} type="submit">
            {intent === 'signin' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        {intent === 'signin' ? (
          <button className="auth-link" disabled={submitting} onClick={() => void resetPassword()} type="button">
            Mot de passe oublié ?
          </button>
        ) : null}
        <button
          className="auth-link"
          onClick={() => {
            setError(null)
            setMessage(null)
            setIntent((current) => (current === 'signin' ? 'signup' : 'signin'))
          }}
          type="button"
        >
          {intent === 'signin' ? 'Créer un compte' : 'J’ai déjà un compte'}
        </button>
        <button className="auth-demo" onClick={auth.startDemo} type="button">
          Découvrir en mode démo
        </button>
      </section>
    </main>
  )
}
