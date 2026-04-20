/**
 * Initialise le service worker pour la PWA
 * Permet à l'app de fonctionner offline et d'être installée comme app mobile
 */

export const initServiceWorker = () => {
  if (!('serviceWorker' in navigator)) {
    console.log('⚠️ Service Worker non supporté par ce navigateur')
    return
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker enregistré:', registration)
      })
      .catch((error) => {
        console.error('❌ Erreur Service Worker:', error)
      })
  })
}

/**
 * Vérifie si l'app peut être installée comme PWA
 * Retourne true si l'événement deferredPrompt est disponible
 */
export const isPWAInstallable = () => {
  return window.deferredPrompt !== undefined
}

/**
 * Gère l'installation de la PWA
 */
export const promptPWAInstall = async () => {
  if (!window.deferredPrompt) {
    console.log('⚠️ Installation non disponible')
    return false
  }

  try {
    window.deferredPrompt.prompt()
    const { outcome } = await window.deferredPrompt.userChoice
    console.log(`L'utilisateur a répondu: ${outcome}`)
    window.deferredPrompt = null
    return outcome === 'accepted'
  } catch (error) {
    console.error('Erreur lors de l\'installation:', error)
    return false
  }
}

// Capte l'événement beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.deferredPrompt = e
  console.log('💾 PWA prête à être installée')
})
