import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
import { useInvitationResponse } from '../hooks/useInvitationResponse'

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    delete: deleteNotification,
    deleteAll,
  } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const { processingInvitationId, handleInvitationResponse } = useInvitationResponse()

  // Fermer le dropdown au clic en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'invitation':
        return '📮'
      case 'post':
        return '📝'
      case 'message':
        return '💬'
      case 'member':
        return '👤'
      default:
        return '🔔'
    }
  }

  const getInvitationStatusChip = (notif) => {
    if (notif.responseStatus === 'accepted') {
      return {
        label: 'Invitation acceptee',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      }
    }

    if (notif.responseStatus === 'declined') {
      return {
        label: 'Invitation refusee',
        className: 'bg-slate-100 text-slate-600 border border-slate-200',
      }
    }

    return {
      label: 'En attente',
      className: 'bg-amber-50 text-amber-700 border border-amber-200',
    }
  }

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markAsRead(notif.id)
    }

    if (notif.type === 'invitation' && notif.responseStatus === 'declined') {
      return
    }

    if (notif.actionLink) {
      navigate(notif.actionLink)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton cloche */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-sky-600 transition duration-200"
        title="Notifications"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 z-[80] mt-2 flex max-h-[500px] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Notifications</h3>
              <p className="mt-1 text-xs text-slate-500">
                {loading ? 'Chargement...' : `${notifications.length} notification${notifications.length > 1 ? 's' : ''}`}
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              {unreadCount} nouvelle{unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="border-b border-slate-100 px-4 py-2">
            <button
              type="button"
              onClick={() => {
                navigate('/notifications/invitations')
                setIsOpen(false)
              }}
              className="text-xs font-semibold text-sky-600 transition hover:text-sky-700"
            >
              Voir les invitations
            </button>
          </div>

          {/* Liste des notifications */}
          {loading ? (
            <div className="flex items-center justify-center px-4 py-12 text-sm text-slate-500">
              Chargement des notifications...
            </div>
          ) : notifications.length > 0 ? (
            <div className="flex-1 overflow-y-auto">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`border-b border-slate-100 p-4 hover:bg-slate-50 transition cursor-pointer ${
                    notif.read ? 'opacity-60' : 'bg-sky-50/30'
                  }`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">
                      {getNotificationIcon(notif.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-slate-900 truncate">
                        {notif.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {notif.message}
                      </p>
                      {notif.type === 'invitation' && notif.invitationMessage && (
                        <p className="mt-2 rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                          {notif.invitationMessage}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(notif.createdAt).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {notif.type === 'invitation' && (
                        <div className="mt-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getInvitationStatusChip(notif).className}`}
                          >
                            {getInvitationStatusChip(notif).label}
                          </span>
                        </div>
                      )}
                      {notif.type === 'invitation' && (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleInvitationResponse(notif, 'accept', {
                                onAccepted: () => {
                                  if (notif.actionLink) {
                                    window.location.assign(notif.actionLink)
                                  }
                                },
                                onComplete: () => setIsOpen(false),
                              })
                            }}
                            disabled={processingInvitationId === notif.id || Boolean(notif.responseStatus)}
                            className="rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {processingInvitationId === notif.id ? 'Traitement...' : 'Accepter'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleInvitationResponse(notif, 'decline', {
                                onComplete: () => setIsOpen(false),
                              })
                            }}
                            disabled={processingInvitationId === notif.id || Boolean(notif.responseStatus)}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Refuser
                          </button>
                        </div>
                      )}
                    </div>
                    {!notif.read && (
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-sky-600" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNotification(notif.id)
                      }}
                      className="text-slate-400 hover:text-red-600 transition text-sm"
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 px-4">
              <div className="text-center">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-sm text-slate-500">Aucune notification</p>
              </div>
            </div>
          )}

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="grid grid-cols-2 gap-2 border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Tout marquer lu
              </button>
              <button
                type="button"
                onClick={() => deleteAll()}
                className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                Tout supprimer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
