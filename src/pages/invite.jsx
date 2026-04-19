import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { getInvitationByCodeApi, respondToInvitationCodeApi } from '../services/apiService'
import {
  sendNewMemberNotification,
  updateInvitationNotificationsStatus,
} from '../services/notificationService'

function formatExpiration(value) {
  if (!value) return 'Expiration non definie'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Expiration non definie'

  return date.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function InvitePage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { currentUser, userData } = useAuth()
  const [invitationData, setInvitationData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [responding, setResponding] = useState(false)

  useEffect(() => {
    let isActive = true

    const loadInvitation = async () => {
      if (!code) {
        setError('Code invitation introuvable.')
        setLoading(false)
        return
      }

      try {
        const response = await getInvitationByCodeApi(code)

        if (!isActive) return

        setInvitationData(response)
        setError('')
      } catch (loadError) {
        if (!isActive) return
        setInvitationData(null)
        setError(loadError.message || "Impossible de charger cette invitation.")
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadInvitation()

    return () => {
      isActive = false
    }
  }, [code])

  const handleDecision = async (decision) => {
    if (!code || !invitationData?.group || responding) {
      return
    }

    try {
      setResponding(true)
      const respondedAt = new Date().toISOString()
      const response = await respondToInvitationCodeApi(code, { decision })
      await updateInvitationNotificationsStatus(currentUser?.uid, {
        groupId: invitationData.group.id,
        invitationCode: code,
        responseStatus: decision === 'accept' ? 'accepted' : 'declined',
        respondedAt,
        readAt: respondedAt,
      })

      if (decision === 'accept') {
        const memberName =
          userData?.username ||
          userData?.displayName ||
          currentUser?.displayName ||
          currentUser?.email?.split('@')[0] ||
          'Utilisateur'
        const memberAvatar = userData?.avatar || currentUser?.photoURL || ''

        if (response?.adminId && response.adminId !== currentUser?.uid) {
          try {
            await sendNewMemberNotification(response.adminId, {
              groupId: invitationData.group.id,
              groupName: response.groupName || invitationData.group.name,
              groupSlug: response.groupSlug || invitationData.group.slug,
              memberId: currentUser?.uid,
              memberName,
              memberAvatar,
            })
          } catch (notificationError) {
            console.warn('Notification admin non envoyee:', notificationError)
          }
        }

        navigate(`/group/${response.groupSlug || invitationData.group.slug}`)
        return
      }

      setInvitationData((current) =>
        current
          ? {
              ...current,
              declined: true,
            }
          : current,
      )
    } catch (responseError) {
      setError(responseError.message || "Impossible de traiter cette invitation.")
    } finally {
      setResponding(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#eef2f7]">
      <Navbar />

      <main className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative w-full overflow-hidden rounded-[38px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_26%),linear-gradient(135deg,#ffffff_0%,#f8fbff_52%,#edf6ff_100%)] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.10)] sm:p-8 lg:p-10">
          <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-sky-300/20 blur-3xl" />
          <div className="absolute bottom-0 left-12 h-40 w-40 rounded-full bg-indigo-200/20 blur-3xl" />

          {loading ? (
            <div className="relative rounded-[32px] border border-slate-200 bg-white px-6 py-20 text-center">
              <p className="text-sm text-slate-500">Chargement de l invitation...</p>
            </div>
          ) : error ? (
            <div className="relative rounded-[32px] border border-rose-200 bg-white px-6 py-16 text-center shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <p className="text-5xl">⚠️</p>
              <p className="mt-4 text-xl font-bold text-slate-900">Invitation indisponible</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">{error}</p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-6 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Retour a l accueil
              </button>
            </div>
          ) : invitationData?.group ? (
            <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
              <div className="rounded-[34px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-500">
                  Invitation privee
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Rejoindre {invitationData.group.name}
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                  {invitationData.group.description || 'Ce groupe t attend avec un espace de discussion, des publications et des membres actifs.'}
                </p>

                {invitationData.invitation?.message && (
                  <div className="mt-6 rounded-[28px] border border-sky-100 bg-sky-50 px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600">
                      Message d invitation
                    </p>
                    <p className="mt-3 text-sm leading-7 text-sky-950">
                      {invitationData.invitation.message}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  {invitationData.isMember ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/group/${invitationData.group.slug}`)}
                      className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Ouvrir le groupe
                    </button>
                  ) : invitationData.declined ? (
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Retour a l accueil
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDecision('accept')}
                        disabled={responding}
                        className="rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {responding ? 'Traitement...' : 'Accepter et rejoindre'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision('decline')}
                        disabled={responding}
                        className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Refuser
                      </button>
                    </>
                  )}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-[32px] border border-slate-200 bg-slate-900 p-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200/70">
                    Code
                  </p>
                  <p className="mt-3 break-all text-lg font-bold">{invitationData.code}</p>
                  <p className="mt-4 text-sm text-slate-300">
                    Expire le {formatExpiration(invitationData.invitation?.expiresAt)}
                  </p>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Apercu rapide
                  </p>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Admin</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {invitationData.group.adminName || 'Administrateur'}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Membres</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {invitationData.group.memberCount}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Acces</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {invitationData.hasDirectInvite ? 'Invitation directe detectee' : 'Acces via code partage'}
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}
