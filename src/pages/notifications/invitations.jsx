import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import { useNotifications } from '../../context/NotificationContext'
import { useInvitationResponse } from '../../hooks/useInvitationResponse'

function formatDate(value) {
  if (!value) return 'Date inconnue'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date inconnue'

  return date.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusMeta(notification) {
  if (notification.responseStatus === 'accepted') {
    return {
      label: 'Invitation acceptee',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }
  }

  if (notification.responseStatus === 'declined') {
    return {
      label: 'Invitation refusee',
      className: 'border-slate-200 bg-slate-100 text-slate-600',
    }
  }

  return {
    label: 'En attente',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  }
}

export default function InvitationsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const {
    notifications,
    loading,
    markAsRead,
    delete: deleteNotification,
  } = useNotifications()
  const { processingInvitationId, handleInvitationResponse } = useInvitationResponse()

  const invitationNotifications = useMemo(
    () =>
      notifications
        .filter((notification) => notification.type === 'invitation')
        .sort((a, b) => {
          const score = (notif) => (notif.responseStatus ? 1 : 0)
          return score(a) - score(b) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        }),
    [notifications],
  )

  const visibleInvitations = useMemo(() => {
    if (filter === 'pending') {
      return invitationNotifications.filter((notification) => !notification.responseStatus)
    }

    if (filter === 'answered') {
      return invitationNotifications.filter((notification) => Boolean(notification.responseStatus))
    }

    return invitationNotifications
  }, [filter, invitationNotifications])

  const pendingCount = invitationNotifications.filter((notification) => !notification.responseStatus).length
  const answeredCount = invitationNotifications.length - pendingCount

  return (
    <div className="min-h-screen bg-[#eef2f7]">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.20),_transparent_28%),linear-gradient(135deg,#ffffff_0%,#f8fbff_38%,#eef6ff_100%)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10">
          <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-sky-300/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-40 w-40 rounded-full bg-indigo-200/20 blur-3xl" />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-500">
                Centre invitations
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Invitations de groupe
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Une vue plus claire pour trier ce qui attend une reponse, retrouver le message perso de l expediteur et garder une trace des invitations deja traitees.
              </p>
            </div>

            <div className="grid min-w-[260px] grid-cols-3 gap-3">
              <div className="rounded-[28px] border border-sky-100 bg-white/90 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-600">En attente</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{pendingCount}</p>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-white/80 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Traitees</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{answeredCount}</p>
              </div>
              <div className="rounded-[28px] border border-indigo-100 bg-white/80 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-500">Total</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{invitationNotifications.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Toutes' },
              { id: 'pending', label: 'En attente' },
              { id: 'answered', label: 'Traitees' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === item.id
                    ? 'bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]'
                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-[32px] border border-slate-200 bg-white px-6 py-16 text-center shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <p className="text-sm text-slate-500">Chargement des invitations...</p>
            </div>
          ) : visibleInvitations.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <p className="text-5xl">📭</p>
              <p className="mt-4 text-lg font-semibold text-slate-900">Aucune invitation dans cette vue</p>
              <p className="mt-2 text-sm text-slate-500">
                Change le filtre ou attends une nouvelle invitation de groupe.
              </p>
            </div>
          ) : (
            visibleInvitations.map((notification) => {
              const statusMeta = getStatusMeta(notification)
              const isProcessing = processingInvitationId === notification.id

              return (
                <article
                  key={notification.id}
                  className={`overflow-hidden rounded-[34px] border bg-white shadow-[0_18px_46px_rgba(15,23,42,0.06)] transition ${
                    notification.read ? 'border-slate-200' : 'border-sky-200 shadow-[0_18px_50px_rgba(14,165,233,0.10)]'
                  }`}
                >
                  <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_62%,#eef6ff_100%)] p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-base font-bold text-white">
                            {(notification.from?.name || notification.groupName || 'I').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h2 className="truncate text-lg font-bold text-slate-900">{notification.title}</h2>
                            <p className="text-sm text-slate-500">
                              De {notification.from?.name || 'Un membre'} • {formatDate(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.read && <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                            {notification.groupName || 'Groupe Netthex'}
                          </span>
                          {notification.from?.name && (
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                              Invite par {notification.from.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                      <div className="min-w-0">
                        <p className="text-sm leading-7 text-slate-700">{notification.message}</p>

                        {notification.invitationMessage && (
                          <div className="mt-4 rounded-[24px] border border-sky-100 bg-sky-50 px-4 py-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600">
                              Message perso
                            </p>
                            <p className="mt-2 text-sm leading-7 text-sky-950">{notification.invitationMessage}</p>
                          </div>
                        )}
                      </div>

                      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Actions rapides
                        </p>
                        <div className="mt-4 flex flex-col gap-3">
                          {!notification.read && (
                            <button
                              type="button"
                              onClick={() => markAsRead(notification.id)}
                              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Marquer comme lue
                            </button>
                          )}

                          {!notification.responseStatus && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handleInvitationResponse(notification, 'accept', {
                                    onAccepted: () => {
                                      if (notification.actionLink) {
                                        navigate(notification.actionLink)
                                      }
                                    },
                                  })
                                }
                                disabled={isProcessing}
                                className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                {isProcessing ? 'Traitement...' : 'Accepter'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleInvitationResponse(notification, 'decline')}
                                disabled={isProcessing}
                                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Refuser
                              </button>
                            </>
                          )}

                          {notification.responseStatus === 'accepted' && notification.actionLink && (
                            <button
                              type="button"
                              onClick={() => navigate(notification.actionLink)}
                              className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                            >
                              Ouvrir le groupe
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => deleteNotification(notification.id)}
                            className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </section>
      </main>
    </div>
  )
}
