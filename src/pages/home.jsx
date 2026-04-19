import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import GroupCard from '../components/GroupCard'
import { useGroups } from '../context/GroupContext'
import { useAuth } from '../context/AuthContext'
import { createGroup } from '../services/realtimeService'
import { uploadToCloudinary } from '../services/cloudinaryService'

function formatShortDate(value) {
  if (!value) return 'recent'

  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  })
}

function FeedIcon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function getRecencyScore(value) {
  if (!value) return 0
  const hoursAgo = Math.max(1, (Date.now() - new Date(value).getTime()) / 36e5)
  return 120 / Math.sqrt(hoursAgo)
}

function getForYouScore(post) {
  const recencyScore = getRecencyScore(post.createdAt)
  const groupReachScore = Math.min(post.memberCount || 0, 500) * 0.18
  const contentDepthScore = Math.min(post.content?.trim().length || 0, 280) * 0.12
  const visualBonus = post.imageUrl ? 18 : 0
  const discoveryBonus = post.groupName ? 12 : 0

  return recencyScore + groupReachScore + contentDepthScore + visualBonus + discoveryBonus
}

const fallbackPosts = [
  {
    id: 'demo-text-post',
    groupId: 'demo-group-text',
    groupName: 'Netthex Lounge',
    memberCount: 24,
    authorName: 'Equipe Netthex',
    createdAt: '2026-04-17T09:10:00.000Z',
    content:
      'Post de demonstration: tant que les groupes n ont pas encore publie, ce fil peut afficher du contenu fictif pour donner une vraie sensation de page d accueil.',
    mediaType: 'text',
  },
  {
    id: 'demo-image-post',
    groupId: 'demo-group-image',
    groupName: 'Creative Showcase',
    memberCount: 41,
    authorName: 'Studio Orbit',
    createdAt: '2026-04-17T08:25:00.000Z',
    content:
      'Exemple de post image: tu peux utiliser ce format pour presenter une maquette, un teaser produit ou une annonce visuelle.',
    mediaType: 'image',
    imageLabel: 'Apercu image de demonstration',
  },
  {
    id: 'demo-video-post',
    groupId: 'demo-group-video',
    groupName: 'Video Creators Hub',
    memberCount: 58,
    authorName: 'Motion Lab',
    createdAt: '2026-04-17T07:40:00.000Z',
    content:
      'Exemple de post video: parfait pour un reel, une bande annonce de produit ou une courte mise a jour d equipe.',
    mediaType: 'video',
    videoLabel: 'Lecture video de demonstration',
  },
]

const fallbackJoinedGroups = [
  {
    id: 'fallback-community-1',
    name: 'Builders Circle',
    slug: 'builders-circle',
    memberCount: 32,
    posts: { demo: true },
  },
  {
    id: 'fallback-community-2',
    name: 'Product Daily',
    slug: 'product-daily',
    memberCount: 18,
    posts: { demo: true },
  },
  {
    id: 'fallback-community-3',
    name: 'Creators House',
    slug: 'creators-house',
    memberCount: 27,
    posts: { demo: true },
  },
]

const fallbackSuggestedGroups = [
  {
    id: 'fallback-suggestion-1',
    name: 'Startup Stories',
    slug: 'startup-stories',
    memberCount: 45,
    posts: { demo1: true, demo2: true },
  },
  {
    id: 'fallback-suggestion-2',
    name: 'Design Motion',
    slug: 'design-motion',
    memberCount: 21,
    posts: { demo1: true },
  },
  {
    id: 'fallback-suggestion-3',
    name: 'Growth Talks',
    slug: 'growth-talks',
    memberCount: 38,
    posts: { demo1: true, demo2: true, demo3: true },
  },
]

const fallbackActiveFriends = [
  { id: 'fallback-friend-1', name: 'Lina Perez', handle: '@Design Motion', isOnline: true },
  { id: 'fallback-friend-2', name: 'Chris Ada', handle: '@Startup Stories', isOnline: true },
  { id: 'fallback-friend-3', name: 'Maya Jules', handle: '@Growth Talks', isOnline: true },
  { id: 'fallback-friend-4', name: 'Omar T.', handle: '@Netthex Lounge', isOnline: false },
  { id: 'fallback-friend-5', name: 'Sonia K.', handle: '@Creators House', isOnline: false },
]

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Impossible de lire ce fichier.'))
    reader.readAsDataURL(file)
  })

function EditGroupDialog({
  form,
  error,
  saving,
  onClose,
  onChange,
  onFileChange,
  onSubmit,
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[34px] border border-white/70 bg-white shadow-[0_36px_90px_rgba(15,23,42,0.16),0_10px_24px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.92)]">
        <div className="bg-gradient-to-b from-slate-100/90 to-white px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Modifier le groupe
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                Mets a jour le profil du groupe
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Change le nom, la description, la photo de profil et la couverture avec un rendu legerement en relief.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition hover:bg-slate-50"
            >
              Fermer
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-6 px-6 py-6 sm:px-8">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <div>
                <label htmlFor="edit-group-name" className="mb-2 block text-sm font-medium text-slate-700">
                  Nom du groupe
                </label>
                <input
                  id="edit-group-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => onChange('name', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <label htmlFor="edit-group-description" className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  id="edit-group-description"
                  rows={6}
                  value={form.description}
                  onChange={(e) => onChange('description', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100"
                />
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.85)]">
                <p className="mb-3 text-sm font-semibold text-slate-700">Apercu</p>
                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                  <div
                    className="h-32 bg-cover bg-center"
                    style={{
                      backgroundImage: form.coverUrl
                        ? `url(${form.coverUrl})`
                        : 'linear-gradient(135deg, #38bdf8, #6366f1)',
                    }}
                  />
                  <div className="relative px-4 pb-4 pt-10">
                    <div className="absolute left-4 top-[-28px] flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-[0_12px_25px_rgba(15,23,42,0.12)]">
                      {form.avatarUrl ? (
                        <img src={form.avatarUrl} alt="Avatar du groupe" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold text-slate-700">
                          {form.name?.charAt(0).toUpperCase() || 'G'}
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-slate-900">{form.name || 'Nom du groupe'}</p>
                    <p className="mt-1 line-clamp-3 text-sm text-slate-500">
                      {form.description || 'La description du groupe apparaitra ici.'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="edit-group-avatar" className="mb-2 block text-sm font-medium text-slate-700">
                  Photo de profil
                </label>
                <input
                  id="edit-group-avatar"
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileChange('avatarUrl', e.target.files?.[0])}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                />
              </div>

              <div>
                <label htmlFor="edit-group-cover" className="mb-2 block text-sm font-medium text-slate-700">
                  Image de couverture
                </label>
                <input
                  id="edit-group-cover"
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileChange('coverUrl', e.target.files?.[0])}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_18px_rgba(15,23,42,0.06)] transition hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function HomePostCard({ post, onEditGroup, isFresh = false }) {
  const [showMenu, setShowMenu] = useState(false)
  const reactions = (post.content?.length || 0) + (post.memberCount || 0)

  return (
    <article
      className={`overflow-hidden rounded-[30px] border bg-white transition-all duration-500 ${
        isFresh
          ? 'border-sky-300 shadow-[0_22px_60px_rgba(14,165,233,0.18)] ring-4 ring-sky-100'
          : 'border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.06)]'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 p-[2px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-sm font-bold text-slate-900">
              {post.authorName?.charAt(0).toUpperCase() || 'N'}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900">{post.authorName || 'Membre'}</p>
              <button
                type="button"
                className="rounded-full bg-[#eef6ff] px-2 py-1 text-[11px] font-semibold text-sky-600"
              >
                Follow
              </button>
            </div>
            <p className="text-xs text-slate-400">
              {formatShortDate(post.createdAt)}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu((current) => !current)}
            className="rounded-full px-2 py-1 text-lg leading-none text-slate-300 transition hover:bg-slate-100 hover:text-slate-700"
          >
            •••
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.14)]">
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false)
                  onEditGroup(post.groupId)
                }}
                className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Modifier
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            className="rounded-full bg-[#eef6ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-600"
          >
            {post.groupName}
          </button>
          {isFresh ? (
            <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">
              Nouveau
            </span>
          ) : (
            <span className="text-xs text-slate-300">•••</span>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
          {post.content || 'Aucun contenu textuel disponible pour cette publication.'}
        </p>
      </div>

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="Publication"
          className="max-h-[420px] w-full object-cover"
        />
      )}

      {!post.imageUrl && post.mediaType === 'image' && (
        <div className="m-5 mt-0 overflow-hidden rounded-[26px] border border-slate-200 bg-[linear-gradient(135deg,#38bdf8_0%,#6366f1_55%,#f472b6_100%)] p-6 text-white shadow-[0_16px_40px_rgba(59,130,246,0.18)]">
          <div className="flex h-[260px] items-end rounded-[22px] border border-white/20 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.38),transparent_30%),linear-gradient(160deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Image demo</p>
              <p className="mt-2 text-2xl font-bold">{post.imageLabel || 'Visuel de demonstration'}</p>
            </div>
          </div>
        </div>
      )}

      {!post.imageUrl && post.mediaType === 'video' && (
        <div className="m-5 mt-0 overflow-hidden rounded-[26px] border border-slate-200 bg-[#0f172a] p-4 text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
          <div className="relative flex h-[260px] items-center justify-center rounded-[22px] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.22),transparent_30%),linear-gradient(135deg,#0f172a,#111827,#1d4ed8)]">
            <div className="absolute inset-0 bg-[linear-gradient(transparent_94%,rgba(255,255,255,0.06)_94%),linear-gradient(90deg,transparent_94%,rgba(255,255,255,0.06)_94%)] bg-[length:100%_22px,22px_100%] opacity-30" />
            <button
              type="button"
              className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm"
            >
              <span className="ml-1 text-3xl">▶</span>
            </button>
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-sm text-white/80">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/60">Video demo</p>
                <p className="mt-2 text-lg font-semibold text-white">{post.videoLabel || 'Lecture video'}</p>
              </div>
              <span>00:28</span>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <button type="button" className="transition hover:text-slate-900">
              ♥ {reactions}
            </button>
            <button type="button" className="transition hover:text-slate-900">
              💬 {Math.max(3, Math.floor(reactions / 5))}
            </button>
            <button type="button" className="transition hover:text-slate-900">
              ↗ Partager
            </button>
          </div>
          <button type="button" className="text-sm text-slate-400 transition hover:text-slate-900">
            Enregistrer
          </button>
        </div>
      </div>
    </article>
  )
}

export default function Home() {
  const { groups, loading, updateGroupDetails } = useGroups()
  const { userData, currentUser } = useAuth()
  const navigate = useNavigate()
  const currentUserId = currentUser?.uid || ''

  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [groupAvatar, setGroupAvatar] = useState('')
  const [groupAvatarFile, setGroupAvatarFile] = useState(null)
  const [feedFilter, setFeedFilter] = useState('for-you')
  const [feedScope, setFeedScope] = useState('all')
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [createError, setCreateError] = useState('')
  const [editingGroupId, setEditingGroupId] = useState(null)
  const [editingGroupForm, setEditingGroupForm] = useState({
    name: '',
    description: '',
    avatarUrl: '',
    coverUrl: '',
  })
  const [editingGroupError, setEditingGroupError] = useState('')
  const [savingGroupEdit, setSavingGroupEdit] = useState(false)
  const [freshPostsNotice, setFreshPostsNotice] = useState(null)
  const [highlightedPostKeys, setHighlightedPostKeys] = useState([])
  const feedTopRef = useRef(null)
  const latestScopedPostRef = useRef(null)
  const feedNoticeTimeoutRef = useRef(null)

  const allGroups = useMemo(
    () => Object.entries(groups).map(([id, data]) => ({ id, ...data })),
    [groups],
  )

  const featuredGroups = useMemo(
    () =>
      [...allGroups]
        .sort((a, b) => (Object.keys(b.members || {}).length || 1) - (Object.keys(a.members || {}).length || 1))
        .slice(0, 6),
    [allGroups],
  )

  const suggestedGroups = useMemo(
    () =>
      [...allGroups]
        .sort((a, b) => {
          const postsA = a.posts ? Object.keys(a.posts).length : 0
          const postsB = b.posts ? Object.keys(b.posts).length : 0
          return postsB - postsA || (Object.keys(b.members || {}).length || 1) - (Object.keys(a.members || {}).length || 1)
        })
        .slice(0, 5),
    [allGroups],
  )

  const recentPosts = useMemo(
    () =>
      allGroups
        .flatMap((group) =>
          Object.entries(group.posts || {}).map(([postId, post]) => ({
            id: postId,
            groupId: group.id,
            groupSlug: group.slug,
            groupName: group.name,
            memberCount: Object.keys(group.members || {}).length || 1,
            ...post,
          })),
        )
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [allGroups],
  )

  const scopedPosts = useMemo(() => {
    if (feedScope !== 'joined' || !currentUserId) return recentPosts

    return recentPosts.filter((post) => {
      const sourceGroup = allGroups.find((group) => group.id === post.groupId)
      return sourceGroup && (sourceGroup.adminId === currentUserId || sourceGroup.members?.[currentUserId])
    })
  }, [allGroups, currentUserId, feedScope, recentPosts])

  const sourcePosts = scopedPosts
  const filteredPosts = searchTerm
    ? sourcePosts.filter((post) =>
        [post.groupName, post.authorName, post.content]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    : sourcePosts

  const feedPosts = useMemo(() => {
    const posts = [...filteredPosts]

    if (feedFilter === 'latest') {
      return posts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    }

    if (feedFilter === 'popular') {
      return posts.sort((a, b) => {
        const scoreA = (a.memberCount || 0) * 0.45 + (a.content?.length || 0) * 0.2 + (a.imageUrl ? 24 : 0)
        const scoreB = (b.memberCount || 0) * 0.45 + (b.content?.length || 0) * 0.2 + (b.imageUrl ? 24 : 0)
        return scoreB - scoreA
      })
    }

    return posts.sort((a, b) => getForYouScore(b) - getForYouScore(a))
  }, [filteredPosts, feedFilter])

  useEffect(() => {
    const latestRealPost = scopedPosts[0]

    if (!latestRealPost?.id) {
      latestScopedPostRef.current = null
      setFreshPostsNotice(null)
      setHighlightedPostKeys([])
      return
    }

    const latestSignature = `${latestRealPost.groupId}-${latestRealPost.id}-${latestRealPost.createdAt || ''}`
    const previous = latestScopedPostRef.current

    if (!previous) {
      latestScopedPostRef.current = {
        signature: latestSignature,
        createdAt: latestRealPost.createdAt || null,
      }
      return
    }

    const latestCreatedAt = new Date(latestRealPost.createdAt || 0).getTime()
    const previousCreatedAt = new Date(previous.createdAt || 0).getTime()

    if (latestSignature !== previous.signature && latestCreatedAt >= previousCreatedAt) {
      const freshPosts = scopedPosts.filter(
        (post) => new Date(post.createdAt || 0).getTime() > previousCreatedAt,
      )
      const newPostsCount = freshPosts.length

      setFreshPostsNotice({
        count: Math.max(1, newPostsCount),
        latestSignature,
      })
      setHighlightedPostKeys(freshPosts.map((post) => `${post.groupId}-${post.id}`))

      if (feedNoticeTimeoutRef.current) {
        window.clearTimeout(feedNoticeTimeoutRef.current)
      }

      feedNoticeTimeoutRef.current = window.setTimeout(() => {
        setFreshPostsNotice(null)
        setHighlightedPostKeys([])
      }, 9000)
    }

    latestScopedPostRef.current = {
      signature: latestSignature,
      createdAt: latestRealPost.createdAt || null,
    }
  }, [scopedPosts])

  useEffect(() => {
    return () => {
      if (feedNoticeTimeoutRef.current) {
        window.clearTimeout(feedNoticeTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const latestRealPost = scopedPosts[0]

    latestScopedPostRef.current = latestRealPost?.id
      ? {
          signature: `${latestRealPost.groupId}-${latestRealPost.id}-${latestRealPost.createdAt || ''}`,
          createdAt: latestRealPost.createdAt || null,
        }
      : null

    setFreshPostsNotice(null)
    setHighlightedPostKeys([])
  }, [currentUserId, feedScope, searchTerm])

  const handleRevealFreshPosts = () => {
    setFreshPostsNotice(null)
    setHighlightedPostKeys([])
    feedTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const totalGroups = allGroups.length
  const totalPosts = scopedPosts.length
  const totalMembers = allGroups.reduce((sum, group) => sum + (Object.keys(group.members || {}).length || 1), 0)
  const username = userData?.username || 'membre'
  const editingGroup = editingGroupId ? groups[editingGroupId] : null
  const visitedGroups = featuredGroups.slice(0, 3)
  const realJoinedGroups = useMemo(
    () =>
      allGroups
        .filter((group) => currentUserId && (group.adminId === currentUserId || group.members?.[currentUserId]))
        .sort((a, b) => (Object.keys(b.members || {}).length || 1) - (Object.keys(a.members || {}).length || 1))
        .slice(0, 3),
    [allGroups, currentUserId],
  )
  const joinedGroupsWithFallback = useMemo(() => {
    const used = new Set(realJoinedGroups.map((group) => group.id))
    const fillers = fallbackJoinedGroups.filter((group) => !used.has(group.id))
    return [...realJoinedGroups, ...fillers].slice(0, 3)
  }, [realJoinedGroups])
  const realSuggestedCommunities = useMemo(
    () =>
      suggestedGroups
        .filter((group) => !currentUserId || (group.adminId !== currentUserId && !group.members?.[currentUserId]))
        .slice(0, 3),
    [suggestedGroups, currentUserId],
  )
  const suggestedCommunities = useMemo(() => {
    const used = new Set(realSuggestedCommunities.map((group) => group.id))
    const fillers = fallbackSuggestedGroups.filter((group) => !used.has(group.id))
    return [...realSuggestedCommunities, ...fillers].slice(0, 3)
  }, [realSuggestedCommunities])
  const realActiveFriends = useMemo(() => {
    const seen = new Set()

    return feedPosts
      .filter((post) => {
        const key = post.authorId || `${post.groupId}-${post.authorName}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 5)
      .map((post, index) => ({
        id: post.authorId || `${post.groupId}-${post.authorName}`,
        name: post.authorName || 'Membre',
        handle: `@${post.groupName}`,
        isOnline: index < 3,
      }))
  }, [feedPosts])
  const activeFriends = useMemo(() => {
    const used = new Set(realActiveFriends.map((friend) => friend.id))
    const fillers = fallbackActiveFriends.filter((friend) => !used.has(friend.id))
    return [...realActiveFriends, ...fillers].slice(0, 5)
  }, [realActiveFriends])
  const realTrendingPosts = useMemo(
    () =>
      [...feedPosts]
        .sort((a, b) => getForYouScore(b) - getForYouScore(a))
        .slice(0, 3),
    [feedPosts],
  )
  const trendingPosts = useMemo(() => {
    const used = new Set(realTrendingPosts.map((post) => `${post.groupId}-${post.id}`))
    const fillers = fallbackPosts.filter((post) => !used.has(`${post.groupId}-${post.id}`))
    return [...realTrendingPosts, ...fillers].slice(0, 3)
  }, [realTrendingPosts])
  const leftMenuItems = [
    {
      key: 'home',
      label: 'Accueil',
      icon: 'M4 7h16M4 12h16M4 17h10',
      accent: feedScope === 'all' && feedFilter === 'for-you',
      meta: `${totalPosts} posts`,
      action: () => {
        setFeedScope('all')
        setFeedFilter('for-you')
        setSearchTerm('')
      },
    },
    {
      key: 'my-groups',
      label: 'Mes groupes',
      icon: 'M5 18h14M7 18V9l5-4l5 4v9M10 18v-4h4v4',
      accent: feedScope === 'joined',
      meta: `${joinedGroupsWithFallback.length} groupes`,
      action: () => {
        setFeedScope('joined')
        setFeedFilter('for-you')
      },
    },
    {
      key: 'latest',
      label: 'Derniers posts',
      icon: 'M12 8v5l3 3M12 3a9 9 0 1 1 0 18a9 9 0 0 1 0-18Z',
      accent: feedScope === 'all' && feedFilter === 'latest',
      meta: 'chrono',
      action: () => {
        setFeedScope('all')
        setFeedFilter('latest')
      },
    },
    {
      key: 'popular',
      label: 'Populaires',
      icon: 'M4 16l4-5l3 3l5-7l4 5',
      accent: feedScope === 'all' && feedFilter === 'popular',
      meta: 'top',
      action: () => {
        setFeedScope('all')
        setFeedFilter('popular')
      },
    },
    {
      key: 'create',
      label: 'Creer un groupe',
      icon: 'M12 5v14M5 12h14',
      accent: false,
      meta: 'new',
      action: () => {
        setCreateError('')
        setShowCreateModal(true)
      },
    },
    {
      key: 'profile',
      label: 'Mon profil',
      icon: 'M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
      accent: false,
      meta: 'view',
      action: () => navigate('/user/profile'),
    },
  ]
  const resetCreateGroupForm = () => {
    setGroupName('')
    setGroupDescription('')
    setGroupAvatar('')
    setGroupAvatarFile(null)
    setCreateError('')
  }

  const openEditGroupDialog = (groupId) => {
    const targetGroup = groups[groupId]
    if (!targetGroup) return

    setEditingGroupId(groupId)
    setEditingGroupError('')
    setEditingGroupForm({
      name: targetGroup.name || '',
      description: targetGroup.description || '',
      avatarUrl: targetGroup.avatarUrl || '',
      coverUrl: targetGroup.coverUrl || '',
    })
  }

  const closeEditGroupDialog = () => {
    setEditingGroupId(null)
    setEditingGroupError('')
    setSavingGroupEdit(false)
  }

  const handleEditGroupChange = (field, value) => {
    setEditingGroupForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleEditGroupFileChange = async (field, file) => {
    if (!file) return

    try {
      const dataUrl = await readFileAsDataUrl(file)
      handleEditGroupChange(field, dataUrl)
    } catch (error) {
      setEditingGroupError(error.message || 'Impossible de charger cette image.')
    }
  }

  const handleSaveGroupEdit = async (e) => {
    e.preventDefault()
    setEditingGroupError('')

    const normalizedName = editingGroupForm.name.trim()
    const normalizedDescription = editingGroupForm.description.trim()

    if (!editingGroupId) return

    if (normalizedName.length < 3) {
      setEditingGroupError('Le nom du groupe doit contenir au moins 3 caracteres.')
      return
    }

    if (normalizedDescription.length < 10) {
      setEditingGroupError('La description doit contenir au moins 10 caracteres.')
      return
    }

    setSavingGroupEdit(true)

    try {
      await updateGroupDetails(editingGroupId, {
        name: normalizedName,
        description: normalizedDescription,
        avatarUrl: editingGroupForm.avatarUrl,
        coverUrl: editingGroupForm.coverUrl,
      })
      closeEditGroupDialog()
    } catch (error) {
      setEditingGroupError(error.message || 'Impossible de modifier ce groupe pour le moment.')
      setSavingGroupEdit(false)
    }
  }

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    setCreateError('')

    const normalizedName = groupName.trim()
    const normalizedDescription = groupDescription.trim()

    if (!currentUserId) {
      setCreateError('Tu dois etre connecte pour creer un groupe.')
      return
    }

    if (normalizedName.length < 3) {
      setCreateError('Le nom du groupe doit contenir au moins 3 caracteres.')
      return
    }

    if (normalizedDescription.length < 10) {
      setCreateError('La description doit contenir au moins 10 caracteres.')
      return
    }

    setCreatingGroup(true)

    try {
      let avatarUrl = null
      if (groupAvatarFile) {
        avatarUrl = await uploadToCloudinary(groupAvatarFile, 'group')
      }

      const groupSlug = await createGroup({
        name: normalizedName,
        description: normalizedDescription,
        avatar: avatarUrl,
        adminId: currentUser.uid,
        adminName: userData?.username || currentUser.displayName || 'Administrateur',
      })

      resetCreateGroupForm()
      setShowCreateModal(false)
      navigate(`/group/${groupSlug}`)
    } catch (error) {
      setCreateError(error.message || 'Impossible de creer le groupe pour le moment.')
    } finally {
      setCreatingGroup(false)
    }
  }

  const handleGroupAvatarChange = (file) => {
    if (file && file.size > 5 * 1024 * 1024) {
      setCreateError('La photo ne doit pas dépasser 5MB.')
      return
    }

    if (file) {
      try {
        // Créer une préview locale
        const reader = new FileReader()
        reader.onload = () => {
          setGroupAvatar(reader.result)
        }
        reader.readAsDataURL(file)
        setGroupAvatarFile(file)
      } catch {
        setCreateError('Erreur lors de la lecture de la photo.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#eef3fb] text-slate-900">
      <Navbar />

      <div className="mx-auto max-w-[1460px] pl-0 pr-4 pt-0 pb-8 sm:pr-6 lg:pr-8">
        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_290px]">
          <aside className="space-y-0 xl:sticky xl:top-[58px] xl:self-start">
            <section className="border border-white/80 bg-white/80 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-sky-500 text-lg font-bold text-white">
                  {username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{username}</p>
                  <p className="text-sm text-slate-400">Community member</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-slate-900">{totalGroups}</p>
                  <p className="text-[11px] text-slate-400">Groups</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{totalMembers}</p>
                  <p className="text-[11px] text-slate-400">Following</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{totalPosts}</p>
                  <p className="text-[11px] text-slate-400">Posts</p>
                </div>
              </div>
            </section>

            <section className="border-x border-b border-white/80 bg-white/80 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm">
              <div className="space-y-1">
                {leftMenuItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={item.action}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                      item.accent
                        ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-[0_12px_25px_rgba(59,130,246,0.22)]'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <FeedIcon path={item.icon} />
                      <span>{item.label}</span>
                    </span>
                    <span className={`text-xs ${item.accent ? 'text-white/80' : 'text-slate-300'}`}>{item.meta}</span>
                  </button>
                ))}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Last visited</p>
                <div className="mt-4 space-y-3">
                  {visitedGroups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => navigate(`/group/${group.slug}`)}
                      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-slate-50"
                    >
                      {group.avatar ? (
                        <img
                          src={group.avatar}
                          alt={group.name}
                          className="h-11 w-11 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-400 text-sm font-bold text-white">
                          {group.name?.charAt(0).toUpperCase() || 'G'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{group.name}</p>
                        <p className="truncate text-xs text-slate-400">{Object.keys(group.members || {}).length || 1} membres</p>
                      </div>
                      <span className="text-xs text-rose-400">●</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </aside>

          <main className="min-w-0 space-y-6">
            <div ref={feedTopRef} />
            <section className="border border-white/80 bg-white px-5 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Home feed</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">Publications des groupes</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    La section du milieu affiche uniquement le feed des publications venant des groupes.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-[#f3f7fd] p-1">
                  {[
                    { id: 'for-you', label: 'For you' },
                    { id: 'latest', label: 'Latest' },
                    { id: 'popular', label: 'Popular' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFeedFilter(tab.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        feedFilter === tab.id
                          ? 'bg-white text-sky-600 shadow-[0_8px_20px_rgba(15,23,42,0.08)]'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-6">
              {freshPostsNotice && (
                <button
                  type="button"
                  onClick={handleRevealFreshPosts}
                  className="sticky top-[82px] z-20 mx-auto flex items-center gap-3 rounded-full border border-sky-200 bg-white px-5 py-3 text-sm font-semibold text-sky-700 shadow-[0_18px_40px_rgba(14,165,233,0.16)] transition hover:-translate-y-0.5 hover:bg-sky-50"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                    ↑
                  </span>
                  <span>
                    {freshPostsNotice.count > 1
                      ? `${freshPostsNotice.count} nouvelles publications`
                      : 'Nouvelle publication disponible'}
                  </span>
                  <span className="text-xs text-sky-500">Voir</span>
                </button>
              )}
              {loading ? (
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-72 animate-pulse rounded-[28px] border border-slate-200 bg-white"
                  />
                ))
              ) : feedPosts.length > 0 ? (
                feedPosts.slice(0, 8).map((post) => (
                  <HomePostCard
                    key={`${post.groupId}-${post.id}`}
                    post={post}
                    onEditGroup={openEditGroupDialog}
                    isFresh={highlightedPostKeys.includes(`${post.groupId}-${post.id}`)}
                  />
                ))
              ) : (
                <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-16 text-center">
                  <p className="text-5xl">📭</p>
                  <p className="mt-4 text-lg font-semibold text-slate-900">
                    {searchTerm ? 'Aucun contenu trouvé' : 'Ton feed est encore vide'}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    {searchTerm
                      ? 'Essaie un autre mot-cle ou ouvre un groupe plus actif.'
                      : 'Cree un groupe ou attends les premieres publications pour remplir ce fil.'}
                  </p>
                </div>
              )}
            </section>
          </main>

          <aside className="space-y-5 xl:sticky xl:top-[58px] xl:self-start">
            <section className="border border-white/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">My Community</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-500 transition hover:bg-rose-100"
                >
                  New
                </button>
              </div>

              <div className="space-y-4">
                {joinedGroupsWithFallback.length > 0 ? (
                  joinedGroupsWithFallback.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => navigate(`/group/${group.slug || group.id}`)}
                      className="flex w-full items-center gap-3 text-left"
                    >
                      {group.avatar ? (
                        <img
                          src={group.avatar}
                          alt={group.name}
                          className="h-11 w-11 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-sm font-bold text-white">
                          {group.name?.charAt(0).toUpperCase() || 'G'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{group.name}</p>
                        <p className="truncate text-xs text-slate-400">{Object.keys(group.members || {}).length || 1} membres • rejoint</p>
                      </div>
                      <span className="text-xs text-emerald-400">●</span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">Tu n as rejoint aucun groupe pour le moment.</p>
                )}
              </div>
            </section>

            <section className="border border-white/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <h2 className="text-sm font-semibold text-slate-900">Suggestions</h2>
              <div className="mt-4 space-y-4">
                {suggestedCommunities.length > 0 ? (
                  suggestedCommunities.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => navigate(`/group/${group.slug || group.id}`)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    {group.avatar ? (
                      <img
                        src={group.avatar}
                        alt={group.name}
                        className="h-11 w-11 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4f7fc] text-sm font-bold text-slate-700">
                        {group.name?.slice(0, 2).toUpperCase() || 'UI'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{group.name}</p>
                      <p className="truncate text-xs text-slate-400">
                        {(group.posts ? Object.keys(group.posts).length : 0)} posts • a decouvrir
                      </p>
                    </div>
                    <span className="text-xs text-rose-400">●</span>
                  </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">Aucune suggestion disponible pour le moment.</p>
                )}
              </div>
            </section>

            <section className="border border-white/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Active friends</h2>
                <span className="text-xs text-slate-400">{activeFriends.filter((friend) => friend.isOnline).length} online</span>
              </div>
              <div className="mt-4 space-y-4">
                {activeFriends.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-3">
                    <div className="relative">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-sky-500 text-sm font-bold text-white">
                        {friend.name?.charAt(0).toUpperCase() || 'A'}
                      </div>
                      {friend.isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{friend.name}</p>
                      <p className="truncate text-xs text-slate-400">{friend.handle}</p>
                    </div>
                    <button type="button" className="text-slate-300 transition hover:text-slate-500">
                      💬
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="border border-white/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <h2 className="text-sm font-semibold text-slate-900">Trending posts</h2>
              <div className="mt-4 space-y-4">
                {trendingPosts.length > 0 ? (
                  trendingPosts.map((post) => (
                    <button
                      key={`${post.groupId}-${post.id}`}
                      type="button"
                      onClick={() => navigate(`/group/${post.groupSlug || post.groupId}`)}
                      className="block w-full rounded-[22px] border border-slate-100 bg-[#f8fbff] px-4 py-4 text-left transition hover:border-sky-200 hover:bg-white"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                          {post.groupName}
                        </span>
                        <span className="text-xs text-slate-300">{formatShortDate(post.createdAt)}</span>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{post.content}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>{post.authorName || 'Membre'}</span>
                        <span>{Math.round(getForYouScore(post))} pts tendance</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">Aucun post tendance pour le moment.</p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-[32px] border border-white/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] overflow-hidden">
            <div className="grid lg:grid-cols-[1fr_1fr]">
              {/* Colonne gauche : Formulaire */}
              <div className="p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">
                      Nouveau groupe
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                      Cree une nouvelle communaute
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      resetCreateGroupForm()
                      setShowCreateModal(false)
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-50 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>

                {createError && (
                  <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {createError}
                  </div>
                )}

                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="group-name" className="block text-sm font-medium text-slate-700">
                      Nom du groupe
                    </label>
                    <input
                      id="group-name"
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Ex: Startups Lagos"
                      maxLength={60}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="group-description"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Description
                    </label>
                    <textarea
                      id="group-description"
                      value={groupDescription}
                      onChange={(e) => setGroupDescription(e.target.value)}
                      placeholder="Explique l'ambiance du groupe, le sujet et ce que les membres vont y trouver."
                      rows={3}
                      maxLength={240}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100"
                    />
                    <div className="flex justify-end text-xs text-slate-400">
                      {groupDescription.trim().length}/240
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="group-avatar"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Photo de profil
                    </label>
                    <div className="flex flex-col gap-3">
                      {groupAvatar && (
                        <div className="flex items-center gap-3">
                          <img
                            src={groupAvatar}
                            alt="Aperçu de la photo"
                            className="h-12 w-12 rounded-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setGroupAvatar('')
                              setGroupAvatarFile(null)
                            }}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900"
                          >
                            Supprimer
                          </button>
                        </div>
                      )}
                      <input
                        id="group-avatar"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleGroupAvatarChange(e.target.files?.[0])}
                        className="w-full cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-sky-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-sky-600 hover:border-slate-400"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        resetCreateGroupForm()
                        setShowCreateModal(false)
                      }}
                      className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={creatingGroup}
                      className="w-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creatingGroup ? 'Creation en cours...' : 'Creer le groupe'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Colonne droite : Aperçu */}
              <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-sky-50 to-white border-l border-slate-200 p-6 sm:p-8">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 mb-4">
                    Aperçu de ton groupe
                  </p>
                  
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-white text-2xl font-bold text-sky-600 shadow-[0_8px_16px_rgba(15,23,42,0.08)]">
                      {groupAvatar ? (
                        <img src={groupAvatar} alt={groupName} className="h-full w-full object-cover" />
                      ) : (
                        groupName.charAt(0).toUpperCase() || 'G'
                      )}
                    </div>

                    <div className="w-full text-center">
                      <h3 className="text-xl font-bold text-slate-900 line-clamp-2">
                        {groupName || 'Nom de ton groupe'}
                      </h3>
                      <p className="mt-2 text-sm text-slate-600 line-clamp-3">
                        {groupDescription || 'La description apparaîtra ici...'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl bg-white border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-2">INFOS</p>
                    <ul className="space-y-2 text-xs text-slate-600">
                      <li>✓ Groupe privé par défaut</li>
                      <li>✓ Tu peux gérer les membres</li>
                      <li>✓ Modération complète</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingGroup && (
        <EditGroupDialog
          form={editingGroupForm}
          error={editingGroupError}
          saving={savingGroupEdit}
          onClose={closeEditGroupDialog}
          onChange={handleEditGroupChange}
          onFileChange={handleEditGroupFileChange}
          onSubmit={handleSaveGroupEdit}
        />
      )}
    </div>
  )
}
