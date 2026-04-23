import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '../services/notificationService'
import { ref, onValue } from 'firebase/database'
import { database } from '../services/firebaseConfig'

const NotificationContext = createContext()

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications doit être utilisé dans un NotificationProvider')
  }
  return context
}

export function NotificationProvider({ children }) {
  const { currentUser } = useAuth()
  const currentUserId = currentUser?.uid || ''
  const canReadNotifications = Boolean(currentUser?.uid && currentUser?.emailVerified)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [toastNotification, setToastNotification] = useState(null)
  const hasLoadedNotificationsRef = useRef(false)
  const previousNotificationIdsRef = useRef(new Set())
  const toastTimeoutRef = useRef(null)

  // Écouter les notifications en temps réel
  useEffect(() => {
    if (!canReadNotifications) {
      setNotifications([])
      setUnreadCount(0)
      setToastNotification(null)
      hasLoadedNotificationsRef.current = false
      previousNotificationIdsRef.current = new Set()
      return
    }

    setLoading(true)

    try {
      const notificationsRef = ref(database, `notifications/${currentUserId}`)
      
      const unsubscribe = onValue(
        notificationsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val()
            const notificationsList = Object.entries(data)
              .map(([id, notif]) => ({
                id,
                ...notif,
              }))
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

            const currentIds = new Set(notificationsList.map((notif) => notif.id))
            const newestUnreadNotification = notificationsList.find(
              (notif) => !notif.read && !previousNotificationIdsRef.current.has(notif.id),
            )
            
            setNotifications(notificationsList)
            
            // Compter les non lues
            const unread = notificationsList.filter(n => !n.read).length
            setUnreadCount(unread)

            if (hasLoadedNotificationsRef.current && newestUnreadNotification) {
              if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current)
              }
              setToastNotification(newestUnreadNotification)
              toastTimeoutRef.current = setTimeout(() => {
                setToastNotification(null)
              }, 5000)
            }

            previousNotificationIdsRef.current = currentIds
            hasLoadedNotificationsRef.current = true
          } else {
            setNotifications([])
            setUnreadCount(0)
            previousNotificationIdsRef.current = new Set()
            hasLoadedNotificationsRef.current = true
          }
          setLoading(false)
        },
        (error) => {
          console.error('Erreur écoute notifications:', error)
          setLoading(false)
        }
      )

      return unsubscribe
    } catch (error) {
      console.error('Erreur initialisation notifications:', error)
      setLoading(false)
    }
  }, [canReadNotifications, currentUserId])

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  const handleMarkAsRead = useCallback(
    async (notificationId) => {
      if (!currentUserId) return
      try {
        await markNotificationAsRead(currentUserId, notificationId)
      } catch (error) {
        console.error('Erreur marquage notification:', error)
      }
    },
    [currentUserId]
  )

  const handleMarkAllAsRead = useCallback(async () => {
    if (!currentUserId) return
    try {
      await markAllNotificationsAsRead(currentUserId)
    } catch (error) {
      console.error('Erreur marquage notifications:', error)
    }
  }, [currentUserId])

  const handleDelete = useCallback(
    async (notificationId) => {
      if (!currentUserId) return
      try {
        await deleteNotification(currentUserId, notificationId)
      } catch (error) {
        console.error('Erreur suppression notification:', error)
      }
    },
    [currentUserId]
  )

  const handleDeleteAll = useCallback(async () => {
    if (!currentUserId) return
    try {
      await deleteAllNotifications(currentUserId)
    } catch (error) {
      console.error('Erreur suppression notifications:', error)
    }
  }, [currentUserId])

  const showToast = useCallback((notification) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    setToastNotification(notification)
    toastTimeoutRef.current = setTimeout(() => {
      setToastNotification(null)
    }, 5000)
  }, [])

  const value = {
    notifications,
    unreadCount,
    loading,
    toastNotification,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    delete: handleDelete,
    deleteAll: handleDeleteAll,
    showToast,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
