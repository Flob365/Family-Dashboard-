const pendingInvitationKey = 'family-command-center.pending-invitation'
const pendingInvitationLifetimeMs = 30 * 60 * 1000

interface StoredInvitation {
  token: string
  expiresAt: number
}

function browserSessionStorage(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function capturePendingInvitation(search: string, now = Date.now()): string {
  const storage = browserSessionStorage()
  const tokenFromUrl = new URLSearchParams(search).get('invitation')?.trim() ?? ''

  if (tokenFromUrl.length > 0) {
    const stored: StoredInvitation = {
      token: tokenFromUrl,
      expiresAt: now + pendingInvitationLifetimeMs,
    }
    storage?.setItem(pendingInvitationKey, JSON.stringify(stored))
    return tokenFromUrl
  }

  const serialized = storage?.getItem(pendingInvitationKey)
  if (serialized === null || serialized === undefined) return ''

  try {
    const stored = JSON.parse(serialized) as Partial<StoredInvitation>
    if (
      typeof stored.token !== 'string'
      || stored.token.length === 0
      || typeof stored.expiresAt !== 'number'
      || stored.expiresAt <= now
    ) {
      storage?.removeItem(pendingInvitationKey)
      return ''
    }
    return stored.token
  } catch {
    storage?.removeItem(pendingInvitationKey)
    return ''
  }
}

export function clearPendingInvitation() {
  browserSessionStorage()?.removeItem(pendingInvitationKey)
}
