import { useEffect, useState } from 'react'

function getOnlineStatus() {
  return typeof navigator === 'undefined' || navigator.onLine
}

export function ConnectivityBanner() {
  const [isOnline, setIsOnline] = useState(getOnlineStatus)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="connectivity-banner" role="status">
      <strong>Hors ligne.</strong> Les dernières données restent consultables ; les modifications ne
      seront pas envoyées.
    </div>
  )
}
