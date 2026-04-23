import { useMemo } from 'react'
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
      cover:
        'linear-gradient(135deg, rgba(16,24,40,0.10), rgba(16,24,40,0.04)), linear-gradient(135deg, #b6d8ff 0%, #e8f2ff 100%)',
      accent: 'bg-[#2f80ed]',
      soft: 'bg-[#eef5ff] text-[#2f80ed]',
      border: 'border-[#d8e7ff]',
    },
    {
      cover:
        'linear-gradient(135deg, rgba(16,24,40,0.08), rgba(16,24,40,0.03)), linear-gradient(135deg, #ffd7c6 0%, #fff1e9 100%)',
      accent: 'bg-[#f2994a]',
      soft: 'bg-[#fff3ea] text-[#f2994a]',
      border: 'border-[#ffe1cf]',
    },
    {
      cover:
        'linear-gradient(135deg, rgba(16,24,40,0.08), rgba(16,24,40,0.03)), linear-gradient(135deg, #c9f1de 0%, #eefbf4 100%)',
      accent: 'bg-[#27ae60]',
      soft: 'bg-[#edf9f1] text-[#27ae60]',
      border: 'border-[#d5f3e0]',
    },
    {
      cover:
        'linear-gradient(135deg, rgba(16,24,40,0.10), rgba(16,24,40,0.04)), linear-gradient(135deg, #e3d9ff 0%, #f4efff 100%)',
      accent: 'bg-[#6c63ff]',
      soft: 'bg-[#f1eeff] text-[#6c63ff]',
      border: 'border-[#e5deff]',
    },
  ]

  return tones[index % tones.length]
}

function getActivityScore(group) {
  const posts = Object.keys(group.posts || {}).length
  const members = Object.keys(group.members || {}).length
  return Math.min(98, 28 + posts * 9 + members * 3)
}

function getActivityLabel(group) {
  const score = getActivityScore(group)

  if (score >= 80) return 'Tres actif'
  if (score >= 60) return 'Bien lance'
  if (score >= 40) return 'En progression'
  return 'A relancer'
}

function getGroupTrackLabel(group) {
  const memberCount = Object.keys(group.members || {}).length || 0
  const postCount = Object.keys(group.posts || {}).length || 0

  if (postCount >= 10) return 'Groupe phare'
  if (memberCount >= 10) return 'Communaute en croissance'
  if (postCount >= 3) return 'Groupe en animation'
  return 'Groupe a suivre'
}

function buildPreviewMembers(group, index) {
  const palette = [
    'bg-[#ffe2d2] text-[#c25b22]',
    'bg-[#dff3e8] text-[#248a54]',
    'bg-[#e8ebff] text-[#4d56d5]',
    'bg-[#dff0ff] text-[#2571c7]',
    'bg-[#fff1cc] text-[#b17900]',
  ]

  return Array.from({ length: Math.min(4, Math.max(2, Object.keys(group.members || {}).length || 2)) }, (_, memberIndex) => ({
    id: `${group.id}-member-${memberIndex}`,
    label: getInitials(group.name.split(' ')[memberIndex] || group.name || 'G'),
    className: palette[(index + memberIndex) % palette.length],
  }))
}

function buildCoursePills(group, currentUserId) {
  const items = [group.adminId === currentUserId ? 'Admin' : 'Membre']

  if (Object.keys(group.posts || {}).length >= 6) items.push('Actif')
  if (Object.keys(group.members || {}).length >= 8) items.push('Populaire')

  return items.slice(0, 2)
}

function MiniStat({ label, value, toneClass }) {
  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_24px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className={`mt-2 text-xl font-bold tracking-tight text-slate-950 ${toneClass || ''}`}>{value}</p>
    </div>
  )
}

function GroupCard({ group, index, currentUserId, onOpen }) {
  const tone = getTone(index)
  const memberCount = Object.keys(group.members || {}).length || 0
  const postCount = Object.keys(group.posts || {}).length || 0
  const isAdmin = group.adminId === currentUserId
  const activityScore = getActivityScore(group)
  const previewMembers = buildPreviewMembers(group, index)
  const coursePills = buildCoursePills(group, currentUserId)
  const groupPhoto = group.coverUrl || group.cover || group.avatarUrl || group.avatar || ''
  const avatarPhoto = group.avatarUrl || group.avatar || ''
  const coverImage = groupPhoto
    ? `linear-gradient(180deg, rgba(15,23,42,0.06), rgba(15,23,42,0.12)), url(${groupPhoto})`
    : tone.cover

  return (
    <article className={`group overflow-hidden rounded-[30px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] shadow-[0_22px_60px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_75px_rgba(15,23,42,0.12)] ${tone.border}`}>
      <div className="relative h-52 overflow-hidden">
        <div
          className="netthex-dark-media-preserve absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.04]"
          style={{ backgroundImage: coverImage }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.10),rgba(15,23,42,0.62))]" />

        <div className="absolute left-5 top-5 flex flex-wrap items-center gap-2">
          {coursePills.map((pill) => (
            <span
              key={pill}
              className="inline-flex rounded-full border border-white/15 bg-white/12 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm"
            >
              {pill}
            </span>
          ))}
        </div>

        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[20px] text-sm font-bold tracking-[0.14em] text-white shadow-[0_16px_28px_rgba(15,23,42,0.20)] ${tone.accent}`}>
            {avatarPhoto ? (
              <img src={avatarPhoto} alt={group.name} className="h-full w-full object-cover" />
            ) : (
              <span>{getInitials(group.name)}</span>
            )}
          </div>

          <button
            type="button"
            onClick={onOpen}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            Ouvrir
          </button>
        </div>
      </div>

      <div className="px-5 pb-5 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {isAdmin ? 'Tu geres cet espace' : 'Dans ton cercle'}
            </p>
            <h2 className="mt-2 line-clamp-2 text-[24px] font-bold leading-7 tracking-tight text-slate-950">
              {group.name}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">{getGroupTrackLabel(group)}</p>
          </div>

          <span className={`inline-flex shrink-0 rounded-full px-3 py-2 text-xs font-semibold shadow-[0_8px_18px_rgba(15,23,42,0.06)] ${tone.soft}`}>
            Score {activityScore}
          </span>
        </div>

        <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-500">
          {group.description || 'Un espace collaboratif pret a accueillir plus de conversations, de ressources et de membres.'}
        </p>

        <div className="mt-5 rounded-[24px] border border-slate-100 bg-slate-50/80 px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Equipe visible</p>
              <div className="mt-3 flex items-center">
                {previewMembers.map((member, memberIndex) => (
                  <span
                    key={member.id}
                    className={`-ml-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold first:ml-0 ${member.className}`}
                    style={{ zIndex: previewMembers.length - memberIndex }}
                  >
                    {member.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Derniere maj</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{formatCompactDate(group.updatedAt || group.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <MiniStat label="Activite" value={getActivityLabel(group)} />
          <MiniStat label="Posts" value={postCount} />
          <MiniStat label="Membres" value={memberCount} />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            <span>Niveau d attention</span>
            <span>{activityScore}%</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${tone.accent}`} style={{ width: `${activityScore}%` }} />
          </div>
        </div>
      </div>
    </article>
  )
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
      <div className="h-52 animate-pulse bg-slate-100" />
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 animate-pulse rounded-[22px] bg-slate-200" />
          <div className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded-full bg-slate-100" />
            <div className="h-6 w-40 animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 animate-pulse rounded-full bg-slate-100" />
          <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-[20px] bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MyGroupsPage() {
  const navigate = useNavigate()
  const { groups, loading } = useGroups()
  const { currentUser } = useAuth()
  const currentUserId = currentUser?.uid || ''

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
    return [...joinedGroups].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0),
    )
  }, [joinedGroups])

  return (
    <div className="min-h-0 h-full overflow-y-auto overscroll-y-contain bg-[radial-gradient(circle_at_top_left,rgba(47,128,237,0.18),transparent_22%),radial-gradient(circle_at_top_right,rgba(242,153,74,0.12),transparent_26%),linear-gradient(180deg,#edf1f7_0%,#f7f3eb_100%)] px-3 py-4 text-slate-900 sm:px-5 lg:px-6">
      <main className="mx-auto flex min-h-full min-w-0 w-full max-w-[1480px]">
        <div className="flex-1 overflow-hidden rounded-[40px] border border-white/80 bg-[#fffdf8] p-3 shadow-[0_35px_120px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="overflow-hidden rounded-[34px] border border-white/80 bg-[#fcfbf7] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
              <section className="rounded-[30px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:px-6">
                {loading ? (
                  <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
                    {[0, 1, 2].map((item) => (
                      <SkeletonCard key={item} />
                    ))}
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-6 py-16 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-100 text-slate-400">
                      <Icon path="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9ZM7 9h10M7 13h6" className="h-7 w-7" />
                    </div>
                    <h3 className="mt-5 text-2xl font-bold text-slate-950">Aucun groupe dans cette vue</h3>
                    <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-500">
                      Aucun groupe a afficher pour le moment.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
                    {filteredGroups.map((group, index) => (
                      <GroupCard
                        key={group.id}
                        group={group}
                        index={index}
                        currentUserId={currentUserId}
                        onOpen={() => navigate(`/group/${group.slug}`)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
