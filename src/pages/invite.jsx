import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getInvitationByCodeApi, respondToInvitationCodeApi } from '../services/apiService'
import {
  sendNewMemberNotification,
  updateInvitationNotificationsStatus,
} from '../services/notificationService'

function Icon({ path, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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

function getGroupInitial(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || 'N'
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 py-4 last:border-b-0 last:pb-0 first:pt-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="max-w-[15rem] text-right text-sm font-semibold leading-6 text-slate-900">{value}</p>
    </div>
  )
}

function StatusBadge({ tone, children }) {
  const tones = {
    sky: 'border border-sky-200/20 bg-sky-300/10 text-sky-100',
    emerald: 'border border-emerald-200/20 bg-emerald-300/10 text-emerald-100',
    slate: 'border border-white/10 bg-white/10 text-white/80',
  }

  return (
    <span className={`inline-flex rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${tones[tone] || tones.sky}`}>
      {children}
    </span>
  )
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

  const group = invitationData?.group
  const invitation = invitationData?.invitation
  const memberCount = group?.memberCount ?? 0
  const groupInitial = getGroupInitial(group?.name)
  const accessLabel = invitationData?.hasDirectInvite ? 'Invitation personnelle' : 'Code partage'

  const stateMeta = invitationData?.isMember
    ? {
        tone: 'emerald',
        badge: 'Acces deja actif',
        title: 'Tu fais deja partie de cet espace.',
        description: 'L invitation est encore visible ici, mais ton acces au groupe est deja ouvert.',
      }
    : invitationData?.declined
      ? {
          tone: 'slate',
          badge: 'Invitation refusee',
          title: 'Cette invitation a ete archivee.',
          description: 'Aucune action supplementaire n est attendue de ta part.',
        }
      : {
          tone: 'sky',
          badge: 'Invitation privee',
          title: 'Une invitation soigneusement preparee t attend.',
          description: 'Tu peux rejoindre le groupe immediatement ou prendre un moment pour verifier les details avant de decider.',
        }

  return (
    <div className="relative min-h-full overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#eef3fb_44%,#e9eef8_100%)] text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[7%] top-24 h-44 w-44 rounded-full border border-sky-200/40" />
        <div className="absolute right-[8%] top-16 h-72 w-72 rounded-full bg-sky-200/20 blur-3xl" />
        <div className="absolute bottom-8 left-1/3 h-60 w-60 rounded-full bg-slate-200/30 blur-3xl" />
      </div>

      <main className="relative mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {loading ? (
          <section className="overflow-hidden rounded-[40px] border border-white/70 bg-white/80 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_360px]">
              <div className="rounded-[34px] bg-slate-950 px-6 py-8 text-white sm:px-8 sm:py-10">
                <div className="h-6 w-36 rounded-full bg-white/10" />
                <div className="mt-6 h-14 w-3/4 rounded-3xl bg-white/10" />
                <div className="mt-4 h-5 w-full rounded-full bg-white/10" />
                <div className="mt-3 h-5 w-2/3 rounded-full bg-white/10" />
                <div className="mt-10 grid gap-3 sm:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-24 rounded-[24px] border border-white/10 bg-white/5" />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="h-64 rounded-[30px] border border-slate-200 bg-white/85" />
                <div className="h-48 rounded-[30px] border border-slate-200 bg-white/85" />
              </div>
            </div>
          </section>
        ) : error ? (
          <section className="mx-auto max-w-3xl overflow-hidden rounded-[40px] border border-white/70 bg-white/85 p-8 text-center shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-rose-50 text-rose-500 shadow-[0_18px_36px_rgba(244,63,94,0.12)]">
              <Icon path="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" className="h-9 w-9" />
            </div>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-500">Invitation indisponible</p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Ce lien n est plus disponible.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">{error}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Retour a l accueil
              </button>
              <button
                type="button"
                onClick={() => navigate('/notifications/invitations')}
                className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Voir mes invitations
              </button>
            </div>
          </section>
        ) : group ? (
          <section className="overflow-hidden rounded-[40px] border border-white/70 bg-white/72 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_380px]">
              <div className="space-y-5">
                <div className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(150deg,#020617_0%,#0f172a_38%,#155e75_100%)] text-white shadow-[0_28px_70px_rgba(2,6,23,0.24)]">
                  <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-sky-300/16 blur-3xl" />
                  <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-white/5 blur-2xl" />

                  <div className="relative grid gap-0 xl:grid-cols-[minmax(0,1fr)_240px]">
                    <div className="px-6 py-7 sm:px-8 sm:py-9">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-sm">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-base font-bold text-slate-950">
                            {groupInitial}
                          </span>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200/80">Netthex</p>
                            <p className="text-sm font-semibold text-white">{accessLabel}</p>
                          </div>
                        </div>

                        <StatusBadge tone={stateMeta.tone}>{stateMeta.badge}</StatusBadge>
                      </div>

                      <div className="mt-12 max-w-3xl">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200/85">Invitation a rejoindre</p>
                        <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] text-white sm:text-5xl lg:text-[4rem]">
                          {group.name}
                        </h1>
                        <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
                          {group.description || 'Un espace de discussion, de partage et de publications t attend avec une interface claire et un acces direct au groupe.'}
                        </p>
                      </div>

                      <div className="mt-12 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Membres</p>
                          <p className="mt-2 text-2xl font-bold text-white">{memberCount}</p>
                        </div>
                        <div className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Acces</p>
                          <p className="mt-2 text-lg font-bold text-white">{invitationData.hasDirectInvite ? 'Prive' : 'Partage'}</p>
                        </div>
                        <div className="rounded-[24px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Statut</p>
                          <p className="mt-2 text-lg font-bold text-white">
                            {invitationData.isMember ? 'Deja membre' : invitationData.declined ? 'Archivee' : 'En attente'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/10 px-6 py-7 xl:border-l xl:border-t-0 xl:px-5 xl:py-9">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Essentiel</p>
                      <div className="mt-6 space-y-6">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Expire le</p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-white/90">
                            {formatExpiration(invitation?.expiresAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Admin</p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-white/90">
                            {group.adminName || 'Administrateur'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Acces</p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-white/90">{accessLabel}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="rounded-[34px] border border-slate-200 bg-white px-6 py-7 shadow-[0_18px_48px_rgba(15,23,42,0.06)] sm:px-8 sm:py-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-2xl">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-500">Decision</p>
                        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                          {stateMeta.title}
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                          {stateMeta.description}
                        </p>
                      </div>
                    </div>

                    {invitation?.message ? (
                      <div className="mt-8 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8fc_100%)] px-5 py-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Message personnel</p>
                        <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-700 sm:text-base">
                          “{invitation.message}”
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-8 grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-2">
                      <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Ce qui se passe ensuite</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Si tu acceptes, tu es redirige directement vers le groupe.
                        </p>
                      </div>
                      <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">A noter</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Tu peux quitter cette page sans agir et revenir plus tard si le lien reste actif.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[34px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7fafc_100%)] px-6 py-7 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Action</p>
                    <div className="mt-5 space-y-3">
                      {invitationData.isMember ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/group/${group.slug}`)}
                          className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Ouvrir le groupe
                        </button>
                      ) : invitationData.declined ? (
                        <>
                          <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            Retour a l accueil
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/notifications/invitations')}
                            className="w-full rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Voir mes invitations
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDecision('accept')}
                            disabled={responding}
                            className="w-full rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {responding ? 'Traitement...' : 'Accepter et rejoindre'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecision('decline')}
                            disabled={responding}
                            className="w-full rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Refuser
                          </button>
                        </>
                      )}
                    </div>

                    <div className="mt-6 rounded-[24px] bg-slate-50 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Confiance</p>
                      <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                        <p className="flex items-start gap-2">
                          <Icon path="M5 13.5 9 17.5 19 7.5" className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                          Invitation reliee a un groupe existant.
                        </p>
                        <p className="flex items-start gap-2">
                          <Icon path="M12 6v6l4 2" className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                          Expiration controlee cote serveur.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
                <div className="rounded-[34px] border border-slate-200 bg-white px-6 py-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Code invitation</p>
                  <p className="mt-4 break-all text-2xl font-bold tracking-[0.08em] text-slate-900">{invitationData.code}</p>
                  <div className="mt-6">
                    <DetailRow label="Expire le" value={formatExpiration(invitation?.expiresAt)} />
                    <DetailRow label="Type" value={accessLabel} />
                    <DetailRow label="Admin" value={group.adminName || 'Administrateur'} />
                  </div>
                </div>

                <div className="rounded-[34px] border border-slate-200 bg-white px-6 py-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Apercu</p>
                  <div className="mt-5 rounded-[28px] bg-[linear-gradient(180deg,#f8fbff_0%,#f2f6fb_100%)] px-5 py-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-slate-900 text-lg font-bold text-white">
                        {groupInitial}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold text-slate-900">{group.name}</p>
                        <p className="text-sm text-slate-500">{memberCount} membre{memberCount > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <p className="mt-5 text-sm leading-7 text-slate-600">
                      {group.description || 'Aucune description detaillee n a ete renseignee pour ce groupe.'}
                    </p>
                  </div>

                  <div className="mt-5 rounded-[28px] border border-slate-200 bg-white px-5 py-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Note</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      Cette invitation peut etre utilisee maintenant ou simplement consultee pour verifier l espace avant de prendre une decision.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}
