import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGroups } from '../context/GroupContext'
import { useAuth } from '../context/AuthContext'

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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

function getInitials(name) {
  if (!name) return 'NG'

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function getTone(index) {
  const tones = [
    {
      banner: 'from-[#0a66c2] to-[#378fe9]',
      chip: 'bg-sky-100 text-sky-700',
      strong: 'bg-sky-600',
    },
    {
      banner: 'from-[#1d2226] to-[#4b5563]',
      chip: 'bg-slate-100 text-slate-700',
      strong: 'bg-slate-700',
    },
    {
      banner: 'from-[#057642] to-[#159f6b]',
      chip: 'bg-emerald-100 text-emerald-700',
      strong: 'bg-emerald-600',
    },
    {
      banner: 'from-[#5b5bd6] to-[#7c7cf4]',
      chip: 'bg-indigo-100 text-indigo-700',
      strong: 'bg-indigo-600',
    },
  ]

  return tones[index % tones.length]
}

function getActivityScore(group) {
  const posts = Object.keys(group.posts || {}).length
  const members = Object.keys(group.members || {}).length
  return Math.min(96, 22 + posts * 12 + members * 3)
}

function getActivityLabel(group) {
  const posts = Object.keys(group.posts || {}).length
  const members = Object.keys(group.members || {}).length

  if (posts >= 10 || members >= 18) return 'Forte activite'
  if (posts >= 4 || members >= 8) return 'Bonne dynamique'
  if (posts >= 1 || members >= 3) return 'En progression'
  return 'A activer'
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-300/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
      <div className="h-20 animate-pulse bg-slate-100" />
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200" />
            <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 animate-pulse rounded-full bg-slate-100" />
          <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MyGroupsPage() {
  const navigate = useNavigate()
  const { groups, loading } = useGroups()
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
    const query = search.trim().toLowerCase()

    return joinedGroups
      .filter((group) => {
        if (filter === 'admin') return group.adminId === currentUserId
        if (filter === 'member') return group.adminId !== currentUserId
        return true
      })
      .filter((group) => {
        if (!query) return true
        return [group.name, group.description, group.slug]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query))
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
  }, [currentUserId, filter, joinedGroups, search])

  const adminGroups = joinedGroups.filter((group) => group.adminId === currentUserId).length
  const memberGroups = joinedGroups.length - adminGroups
  const totalPosts = joinedGroups.reduce((sum, group) => sum + Object.keys(group.posts || {}).length, 0)
  const totalMembers = joinedGroups.reduce((sum, group) => sum + Object.keys(group.members || {}).length, 0)
  const averageScore = joinedGroups.length
    ? Math.round(joinedGroups.reduce((sum, group) => sum + getActivityScore(group), 0) / joinedGroups.length)
    : 0
  const username = userData?.username || currentUser?.displayName || 'membre'

  const topGroups = useMemo(
    () =>
      [...joinedGroups]
        .sort((a, b) => getActivityScore(b) - getActivityScore(a))
        .slice(0, 4),
    [joinedGroups],
  )

  const filterItems = [
    { id: 'all', label: 'Tous', count: joinedGroups.length },
    { id: 'admin', label: 'Admin', count: adminGroups },
    { id: 'member', label: 'Membre', count: memberGroups },
  ]

  return (
    <div className="min-h-screen bg-[#f3f2ef] text-slate-900">
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-2xl border border-slate-300/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
            <div className="h-24 bg-[linear-gradient(135deg,#0a66c2_0%,#378fe9_50%,#70b5f9_100%)]" />
            <div className="px-5 pb-5 sm:px-6">
              <div className="-mt-8 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-slate-950 text-base font-semibold tracking-[0.16em] text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
                {getInitials(username)}
              </div>

              <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-sm font-medium text-sky-700">Vos groupes</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    Un espace plus pro pour suivre vos communautes.
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                    Retrouvez les groupes que vous administrez ou suivez, filtrez les espaces actifs et ouvrez rapidement les communautés qui demandent votre attention.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Retour a l accueil
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-medium text-slate-500">Groupes suivis</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{joinedGroups.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-medium text-slate-500">Posts visibles</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{totalPosts}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-medium text-slate-500">Score moyen</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{averageScore}</p>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-300/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
              <p className="text-xs font-medium text-slate-500">Profil</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{username}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {adminGroups > 0
                  ? `Vous administrez ${adminGroups} groupe${adminGroups > 1 ? 's' : ''} et participez a ${memberGroups}.`
                  : `Vous participez actuellement a ${memberGroups} groupe${memberGroups > 1 ? 's' : ''}.`}
              </p>

              <div className="mt-5 grid gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-500">Audience totale</span>
                    <span className="text-base font-semibold text-slate-950">{totalMembers}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-500">Administrateur</span>
                    <span className="text-base font-semibold text-slate-950">{adminGroups}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-500">Membre</span>
                    <span className="text-base font-semibold text-slate-950">{memberGroups}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-300/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
              <p className="text-xs font-medium text-slate-500">Repere</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">Ordre de lecture</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Commencez par les groupes admin, puis passez aux groupes membres. Cette logique rend la page plus proche d un tableau de bord professionnel.
              </p>
            </section>
          </aside>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-300/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {filterItems.map((item) => {
                    const isActive = filter === item.id

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFilter(item.id)}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                          isActive
                            ? 'bg-[#0a66c2] text-white'
                            : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {item.count}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="w-full lg:max-w-md">
                  <label htmlFor="my-groups-search" className="sr-only">
                    Chercher un groupe
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                      <Icon path="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15a7.5 7.5 0 0 1 0 15Z" className="h-4 w-4" />
                    </span>
                    <input
                      id="my-groups-search"
                      type="text"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Rechercher un groupe"
                      className="w-full rounded-full border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4">
                {[0, 1, 2, 3].map((item) => (
                  <SkeletonCard key={item} />
                ))}
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[18px] bg-slate-100 text-slate-500">
                  <Icon path="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9ZM7 9h10M7 13h6" className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-slate-950">Aucun groupe dans cette vue</h3>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
                  Ajustez le filtre ou la recherche pour retrouver plus facilement vos groupes.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGroups.map((group, index) => {
                  const tone = getTone(index)
                  const memberCount = Object.keys(group.members || {}).length || 0
                  const postCount = Object.keys(group.posts || {}).length || 0
                  const isAdmin = group.adminId === currentUserId
                  const score = getActivityScore(group)
                  const activity = getActivityLabel(group)

                  return (
                    <article
                      key={group.id}
                      className="overflow-hidden rounded-2xl border border-slate-300/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition hover:shadow-[0_10px_28px_rgba(15,23,42,0.06)]"
                    >
                      <div className={`h-16 bg-gradient-to-r ${tone.banner}`} />

                      <div className="p-5">
                        <div className="-mt-10 flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-white ${tone.strong} text-sm font-semibold tracking-[0.14em] text-white shadow-[0_8px_18px_rgba(15,23,42,0.14)]`}>
                                {getInitials(group.name)}
                              </div>
                              <div className="min-w-0 pt-8">
                                <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${tone.chip}`}>
                                  {isAdmin ? 'Administrateur' : 'Membre'}
                                </span>
                                <h2 className="mt-2 truncate text-xl font-semibold text-slate-950">
                                  {group.name}
                                </h2>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => navigate(`/group/${group.slug}`)}
                            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                          >
                            Ouvrir
                          </button>
                        </div>

                        <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-500">
                          {group.description || 'Ce groupe n a pas encore de description detaillee.'}
                        </p>

                        <div className="mt-5 grid gap-3 sm:grid-cols-[1.1fr_0.9fr_0.9fr_1fr]">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-xs font-medium text-slate-500">Activite</p>
                            <p className="mt-2 text-base font-semibold text-slate-950">{activity}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-xs font-medium text-slate-500">Membres</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-950">{memberCount}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-xs font-medium text-slate-500">Posts</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-950">{postCount}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-xs font-medium text-slate-500">Mise a jour</p>
                            <p className="mt-2 text-sm font-semibold text-slate-950">{formatCompactDate(group.updatedAt || group.createdAt)}</p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-medium text-slate-500">Performance estimee</p>
                              <p className="mt-2 text-sm font-semibold text-slate-950">Score d activite {score}</p>
                            </div>
                            <span className="text-2xl font-semibold text-slate-950">{score}</span>
                          </div>
                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div className={`h-full rounded-full ${tone.strong}`} style={{ width: `${score}%` }} />
                          </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                              /{group.slug || 'sans-slug'}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone.chip}`}>
                              {isAdmin ? 'Vous administrez ce groupe' : 'Vous suivez ce groupe'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => navigate(`/group/${group.slug}`)}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 transition hover:text-sky-700"
                          >
                            Voir le detail
                            <Icon path="M5 12h14M13 5l7 7-7 7" className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-300/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
              <p className="text-xs font-medium text-slate-500">A suivre</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">Groupes prioritaires</h2>

              <div className="mt-4 space-y-3">
                {topGroups.length === 0 ? (
                  <p className="text-sm leading-6 text-slate-500">
                    Aucun groupe prioritaire a afficher pour le moment.
                  </p>
                ) : (
                  topGroups.map((group, index) => {
                    const tone = getTone(index)

                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => navigate(`/group/${group.slug}`)}
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-white"
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone.strong} text-xs font-semibold tracking-[0.14em] text-white`}>
                          {getInitials(group.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-950">{group.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {getActivityLabel(group)} · {Object.keys(group.posts || {}).length} posts
                          </p>
                        </div>
                        <Icon path="M9 5l7 7-7 7" className="h-4 w-4 shrink-0 text-slate-400" />
                      </button>
                    )
                  })
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-300/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
              <p className="text-xs font-medium text-slate-500">Conseil</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">Mode de lecture</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Commencez par les groupes admin puis passez aux groupes membres. Cette logique garde la page claire et proche d un dashboard reseau pro.
              </p>
            </section>
          </aside>
        </section>
      </main>
    </div>
  )
}
