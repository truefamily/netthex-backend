import { useEffect, useState } from 'react'
import { isPWAInstallable, promptPWAInstall } from '../utils/pwaSetup'

/**
 * Composant pour afficher un bouton d'installation PWA
 * Apparaît seulement si l'app peut être installée
 */
export default function InstallPWAButton() {
  const [isInstallable, setIsInstallable] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return isPWAInstallable()
  })
  const [isInstalled] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.matchMedia('(display-mode: standalone)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || isInstalled) {
      return undefined
    }

    const checkInstallability = () => {
      setIsInstallable(isPWAInstallable())
    }

    checkInstallability()
    window.addEventListener('beforeinstallprompt', checkInstallability)

    return () => {
      window.removeEventListener('beforeinstallprompt', checkInstallability)
    }
  }, [isInstalled])

  if (isInstalled || !isInstallable) {
    return null
  }

  const handleInstall = async () => {
    const success = await promptPWAInstall()
    if (success) {
      setIsInstallable(false)
    }
  }

  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:shadow-xl hover:from-sky-600 hover:to-cyan-600"
      title="Installer Netthex sur votre appareil"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Installer l'app
    </button>
  )
}
