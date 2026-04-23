/**
 * Initialise le service worker pour la PWA
 * Permet à l'app de fonctionner offline et d'être installée comme app mobile
 */

const unregisterServiceWorkers = async () => {
  if (!('serviceWorker' in navigator)) {
    return
  }

  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map((registration) => registration.unregister()))
}

const clearNetthexCaches = async () => {
  if (!('caches' in window)) {
    return
  }

  const cacheNames = await caches.keys()
  const netthexCaches = cacheNames.filter((cacheName) => cacheName.startsWith('netthex-'))
  await Promise.all(netthexCaches.map((cacheName) => caches.delete(cacheName)))
}

export const initServiceWorker = () => {
  if (!('serviceWorker' in navigator)) {
    console.log('⚠️ Service Worker non supporté par ce navigateur')
    return
  }

  if (import.meta.env.DEV) {
    window.addEventListener('load', () => {
      Promise.all([unregisterServiceWorkers(), clearNetthexCaches()])
        .then(() => {
          console.log('🧹 Service worker et caches PWA désactivés en développement')
        })
        .catch((error) => {
          console.error('❌ Erreur nettoyage PWA en développement:', error)
        })
    })
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
