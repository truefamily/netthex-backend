import { useNotifications } from '../context/NotificationContext'

export default function NotificationToast() {
  const { toastNotification } = useNotifications()

  if (!toastNotification) return null

  const invitationStatusLabel =
    toastNotification.responseStatus === 'accepted'
      ? 'Invitation acceptee'
      : toastNotification.responseStatus === 'declined'
        ? 'Invitation refusee'
        : toastNotification.type === 'invitation'
          ? 'Invitation en attente'
          : ''

  const getIcon = () => {
    switch (toastNotification.type) {
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

  const getColor = () => {
    switch (toastNotification.type) {
      case 'invitation':
        return 'border-sky-200 bg-sky-50'
      case 'post':
        return 'border-blue-200 bg-blue-50'
      case 'message':
        return 'border-green-200 bg-green-50'
      case 'member':
        return 'border-purple-200 bg-purple-50'
      default:
        return 'border-slate-200 bg-white'
    }
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-[9999] max-w-md rounded-2xl border ${getColor()} shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-300 p-4`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{getIcon()}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 text-sm">{toastNotification.title}</h3>
          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{toastNotification.message}</p>
          {toastNotification.type === 'invitation' && toastNotification.invitationMessage && (
            <p className="mt-2 rounded-2xl border border-sky-100 bg-white/70 px-3 py-2 text-xs text-sky-900">
              {toastNotification.invitationMessage}
            </p>
          )}
          {invitationStatusLabel && (
            <span className="mt-2 inline-flex rounded-full border border-sky-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
              {invitationStatusLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
