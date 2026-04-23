import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getUserData, onAuthChange, refreshCurrentUser as refreshSessionUser } from '../services/authService'
import SplashScreen from '../components/SplashScreen'
import { initializeAuthPersistence } from '../services/firebaseConfig'

const AuthContext = createContext()
const MINIMUM_SPLASH_MS = 350

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

  const refreshCurrentUser = useCallback(async () => {
    try {
      const refreshedUser = await refreshSessionUser()

      setCurrentUser(refreshedUser)

      if (refreshedUser?.uid) {
        await refreshUserData(refreshedUser.uid)
      } else {
        setUserData(null)
      }

      return refreshedUser
    } catch {
      setCurrentUser(null)
      setUserData(null)
      return null
    }
  }, [refreshUserData])

  useEffect(() => {
    let unsubscribe = () => {}
    let isMounted = true

    const initializeAuth = async () => {
      try {
        await initializeAuthPersistence()
      } catch {
        // Fall back to Firebase's built-in persistence handling if explicit setup fails.
      }

      if (!isMounted) {
        return
      }

      unsubscribe = onAuthChange(async (user) => {
        const minimumLoadingTime = new Promise((resolve) => {
          setTimeout(resolve, MINIMUM_SPLASH_MS)
        })

        await Promise.all([
          (async () => {
            if (!user) {
              setCurrentUser(null)
              setUserData(null)
              return
            }

            try {
              const refreshedUser = await refreshSessionUser()
              const activeUser = refreshedUser || user

              if (!activeUser?.uid) {
                setCurrentUser(null)
                setUserData(null)
                return
              }

              setCurrentUser(activeUser)
              await refreshUserData(activeUser.uid)
            } catch {
              setCurrentUser(null)
              setUserData(null)
            }
          })(),
          minimumLoadingTime,
        ])

        if (isMounted) {
          setLoading(false)
        }
      })
    }

    initializeAuth()

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [refreshUserData])

  const value = {
    currentUser,
    userData,
    loading,
    refreshUserData,
    refreshCurrentUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? <SplashScreen /> : children}
    </AuthContext.Provider>
  )
}
