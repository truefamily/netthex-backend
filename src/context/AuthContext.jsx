import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { onAuthChange } from '../services/authService'
import { getUserData } from '../services/authService'
import SplashScreen from '../components/SplashScreen'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUserData = useCallback(async (uid) => {
    if (!uid) {
      setUserData(null)
      return null
    }

    try {
      const data = await getUserData(uid)
      setUserData(data)
      return data
    } catch {
      setUserData(null)
      return null
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      // Créer une promesse qui se résout après 3 secondes minimum
      const minimumLoadingTime = new Promise((resolve) => {
        setTimeout(resolve, 3000)
      })

      // Attendre que la vérification d'auth ET les 3 secondes soient écoulées
      await Promise.all([
        (async () => {
          if (user) {
            setCurrentUser(user)
            await refreshUserData(user.uid)
          } else {
            setCurrentUser(null)
            setUserData(null)
          }
        })(),
        minimumLoadingTime,
      ])

      setLoading(false)
    })

    return unsubscribe
  }, [refreshUserData])

  const value = {
    currentUser,
    userData,
    loading,
    refreshUserData,
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? <SplashScreen /> : children}
    </AuthContext.Provider>
  )
}
