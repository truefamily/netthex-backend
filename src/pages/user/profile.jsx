import Navbar from '../../components/Navbar'
import { useAuth } from '../../context/AuthContext'
import { logOut } from '../../services/authService'
import { useNavigate } from 'react-router-dom'

function ProfileIcon({ path, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function formatJoinDate(value) {
  if (!value) return 'Date indisponible'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Date indisponible'
  }

  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getMembershipDuration(value) {
  if (!value) return 'Nouveau membre'

  const joinedAt = new Date(value)

  if (Number.isNaN(joinedAt.getTime())) {
    return 'Nouveau membre'
  }

  const days = Math.max(1, Math.floor((Date.now() - joinedAt.getTime()) / 86400000))

  if (days < 30) return `${days} jour${days > 1 ? 's' : ''} sur Netthex`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months} mois sur Netthex`

  const years = Math.floor(months / 12)
  return `${years} an${years > 1 ? 's' : ''} sur Netthex`
}

function getProfileCompletion(profile) {
  const fields = [profile?.username, profile?.email, profile?.createdAt, profile?.avatar]
  const completed = fields.filter(Boolean).length
  return Math.round((completed / fields.length) * 100)
}

export default function Profile() {
  const { currentUser, userData } = useAuth()
  const navigate = useNavigate()

  const profile = {
    username: userData?.username || currentUser?.displayName || 'Membre Netthex',
    email: userData?.email || currentUser?.email || 'Adresse indisponible',
    createdAt: userData?.createdAt || currentUser?.metadata?.creationTime,
    avatar: userData?.avatar || currentUser?.photoURL || '',
    uid: userData?.uid || currentUser?.uid || '',
  }

  const initial = profile.username?.charAt(0).toUpperCase() || 'N'
  const joinedLabel = formatJoinDate(profile.createdAt)
  const membershipDuration = getMembershipDuration(profile.createdAt)
  const profileCompletion = getProfileCompletion(profile)
  const shortUid = profile.uid ? `${profile.uid.slice(0, 8)}...` : 'Non disponible'

  const handleLogout = async () => {
    try {
      await logOut()
      navigate('/auth')
    } catch (error) {
      console.error('Erreur de déconnexion:', error)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Mon espace
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Profil
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Une vue simple et propre de ton compte Netthex.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:bg-slate-50"
          >
            <ProfileIcon path="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" className="h-4 w-4" />
            Retour
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <div className="h-24 bg-[linear-gradient(135deg,#e0f2fe_0%,#dbeafe_48%,#eef2ff_100%)]" />
              <div className="px-6 pb-6">
                <div className="-mt-12 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[26px] border-4 border-white bg-[linear-gradient(135deg,#0f172a,#334155)] text-3xl font-bold text-white shadow-[0_12px_32px_rgba(15,23,42,0.16)]">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.username} className="h-full w-full object-cover" />
                  ) : (
                    <span>{initial}</span>
                  )}
                </div>

                <div className="mt-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Compte actif
                  </div>
                  <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
                    {profile.username}
                  </h2>
                  <p className="mt-1 break-all text-sm text-slate-500">{profile.email}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{membershipDuration}</p>
                </div>

                <div className="mt-6 grid gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Membre depuis
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{joinedLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      ID utilisateur
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{shortUid}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => navigate('/user/profile/photo')}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <ProfileIcon path="M4.5 8.25h2.379a1.5 1.5 0 0 0 1.155-.542l1.182-1.416A1.5 1.5 0 0 1 10.37 5.75h3.26a1.5 1.5 0 0 1 1.154.542l1.182 1.416a1.5 1.5 0 0 0 1.155.542H19.5A1.5 1.5 0 0 1 21 9.75v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.25v-7.5a1.5 1.5 0 0 1 1.5-1.5Zm7.5 1.5a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z" className="h-4 w-4" />
                    Modifier la photo
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <ProfileIcon path="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" className="h-4 w-4" />
                    Explorer
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                  >
                    <ProfileIcon path="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m-3-3h8.25m0 0-3-3m3 3-3 3" className="h-4 w-4" />
                    Deconnexion
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Etat du compte
              </p>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Authentification', value: currentUser ? 'Connecte' : 'Hors ligne' },
                  { label: 'Base profil', value: userData ? 'Synchronisee' : 'En attente' },
                  { label: 'Completion', value: `${profileCompletion}%` },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-500">{item.label}</span>
                    <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <main className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Informations
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">
                    Details du compte
                  </h3>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  Profil personnel
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    label: 'Nom affiche',
                    value: profile.username,
                    icon: 'M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
                  },
                  {
                    label: 'Adresse e-mail',
                    value: profile.email,
                    icon: 'M4 7h16v10H4V7Zm0 0 8 6 8-6',
                  },
                  {
                    label: 'Date d inscription',
                    value: joinedLabel,
                    icon: 'M8.25 3.75V6m7.5-2.25V6m-9 3h10.5M4.5 19.5h15a1.5 1.5 0 0 0 1.5-1.5V7.5A1.5 1.5 0 0 0 19.5 6h-15A1.5 1.5 0 0 0 3 7.5V18a1.5 1.5 0 0 0 1.5 1.5Z',
                  },
                  {
                    label: 'Identifiant',
                    value: shortUid,
                    icon: 'M3.75 7.5 12 3l8.25 4.5v9L12 21l-8.25-4.5v-9Z',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
                      <ProfileIcon path={item.icon} className="h-4 w-4" />
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 break-all text-base font-semibold text-slate-900">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Qualite du profil
                </p>
                <h3 className="mt-2 text-xl font-bold text-slate-900">
                  Profil a {profileCompletion}%
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  La base est bonne. Le compte est lisible, identifiable et pret a etre enrichi si tu ajoutes plus tard un avatar personnalise.
                </p>

                <div className="mt-5 h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full bg-[linear-gradient(90deg,#0f172a,#334155,#64748b)]"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    { label: 'Nom utilisateur renseigne', done: Boolean(profile.username) },
                    { label: 'Adresse e-mail disponible', done: Boolean(profile.email) },
                    { label: 'Date de creation connue', done: Boolean(profile.createdAt) },
                    { label: 'Avatar personnalise', done: Boolean(profile.avatar) },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${item.done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                        <ProfileIcon
                          path={item.done ? 'M5 12.5 9.5 17 19 7.5' : 'M12 8v4m0 4h.01'}
                          className="h-4 w-4"
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Resume
                </p>
                <div className="mt-5 grid gap-4">
                  {[
                    {
                      title: 'Compte actif',
                      text: 'La session est ouverte et le profil est accessible depuis la navigation principale.',
                    },
                    {
                      title: 'Identite claire',
                      text: 'Le nom, l e-mail et la date d inscription sont mis en avant sans surcharge visuelle.',
                    },
                    {
                      title: 'Structure plus calme',
                      text: 'La page adopte un ton plus produit que marketing, avec des cartes simples et un meilleur rythme.',
                    },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
