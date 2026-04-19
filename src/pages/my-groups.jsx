import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useGroups } from '../context/GroupContext'
import { useAuth } from '../context/AuthContext'

function formatCompactDate(value) {
  if (!value) return 'Date inconnue'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date inconnue'

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getGroupTone(index) {
  const tones = [
    'from-sky-500 via-cyan-400 to-emerald-300',
    'from-fuchsia-500 via-rose-400 to-amber-300',
    'from-indigo-500 via-violet-400 to-sky-300',
    'from-emerald-500 via-teal-400 to-cyan-300',
  ]

  return tones[index % tones.length]
}

export default function MyGroupsPage() {
  const navigate = useNavigate()
  const { groups } = useGroups()
  const { currentUser, userData } = useAuth()
  const currentUserId = currentUser?.uid || ''
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const allGroups = useMemo(
    () => Object.entries(groups || {}).map(([id, group]) => ({ id, ...group })),
    [groups],
  )

  const joinedGroups = useMemo(
    () =>
      allGroups.filter(
        (group) => currentUserId && (group.adminId === currentUserId || Boolean(group.members?.[currentUserId])),
      ),
    [allGroups, currentUserId],
  )

  const filteredGroups = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase()

    return joinedGroups
      .filter((group) => {
        if (filter === 'admin') return group.adminId === currentUserId
        if (filter === 'member') return group.adminId !== currentUserId
        return true
      })
      .filter((group) => {
        if (!normalizedQuery) return true
        return [group.name, group.description, group.slug]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery))
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
  }, [currentUserId, filter, joinedGroups, search])

  const totalPosts = joinedGroups.reduce((sum, group) => sum + Object.keys(group.posts || {}).length, 0)
  const adminGroups = joinedGroups.filter((group) => group.adminId === currentUserId).length
  const memberGroups = joinedGroups.length - adminGroups
  const username = userData?.username || currentUser?.displayName || 'membre'

  return (
    <div className="min-h-screen bg-[#eef2f7]">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_32%),linear-gradient(135deg,#0f172a_0%,#11263f_45%,#0a7ea4_100%)] p-6 text-white shadow-[0_30px_80px_rgba(15,23,42,0.16)] sm:p-8 lg:p-10">
          <div className="absolute -right-16 top-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/80">
                Espace personnel
              </p>
              <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                Mes groupes
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200/90 sm:text-base">
                Retrouve tous les groupes que tu animes ou que tu suis, filtre-les rapidement et replonge dans les espaces les plus actifs.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90">
                  Connecte en tant que <span className="font-semibold text-white">{username}</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Explorer le feed
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/70">Groupes</p>
                <p className="mt-3 text-3xl font-bold text-white">{joinedGroups.length}</p>
                <p className="mt-1 text-sm text-slate-200/80">Tous tes espaces suivis</p>
              </div>
              <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/70">Publications</p>
                <p className="mt-3 text-3xl font-bold text-white">{totalPosts}</p>
                <p className="mt-1 text-sm text-slate-200/80">Posts visibles dans tes groupes</p>
              </div>
              <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100/70">Role</p>
                <p className="mt-3 text-3xl font-bold text-white">{adminGroups}</p>
                <p className="mt-1 text-sm text-slate-200/80">{memberGroups} en tant que membre</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[34px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'Tous' },
                { id: 'admin', label: 'J administre' },
                { id: 'member', label: 'Je participe' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    filter === item.id
                      ? 'bg-slate-900 text-white shadow-[0_12px_25px_rgba(15,23,42,0.14)]'
                      : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="w-full max-w-xl">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Chercher un groupe par nom, description ou slug..."
                className="w-full rounded-full border border-slate-200 bg-[#f8fbff] px-5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </div>
          </div>
        </section>

        <section className="mt-6">
          {filteredGroups.length === 0 ? (
            <div className="rounded-[34px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <p className="text-5xl">🪐</p>
              <p className="mt-4 text-xl font-bold text-slate-900">Aucun groupe dans cette vue</p>
              <p className="mt-2 text-sm text-slate-500">
                Essaie un autre filtre ou rejoins de nouveaux groupes depuis l accueil.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {filteredGroups.map((group, index) => {
                const memberCount = Object.keys(group.members || {}).length || 0
                const postCount = Object.keys(group.posts || {}).length || 0
                const isAdmin = group.adminId === currentUserId

                return (
                  <article
                    key={group.id}
                    className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
                  >
                    <div className={`relative h-40 bg-gradient-to-br ${getGroupTone(index)}`}>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.36),_transparent_28%)]" />
                      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                        <div className="flex items-end justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
                              {isAdmin ? 'Admin' : 'Membre'}
                            </p>
                            <h2 className="mt-2 truncate text-2xl font-bold">{group.name}</h2>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/group/${group.slug}`)}
                            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                          >
                            Ouvrir
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                        {group.description || 'Ce groupe n a pas encore de description detaillee.'}
                      </p>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Membres</p>
                          <p className="mt-2 text-2xl font-bold text-slate-900">{memberCount}</p>
                        </div>
                        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Posts</p>
                          <p className="mt-2 text-2xl font-bold text-slate-900">{postCount}</p>
                        </div>
                        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Mise a jour</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {formatCompactDate(group.updatedAt || group.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                            /{group.slug || 'sans-slug'}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isAdmin ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'
                          }`}>
                            {isAdmin ? 'Tu administres ce groupe' : 'Tu suis ce groupe'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => navigate(`/group/${group.slug}`)}
                          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Voir le groupe
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
