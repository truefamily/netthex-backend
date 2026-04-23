import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useGroups } from '../../context/GroupContext'
import { useNotifications } from '../../context/NotificationContext'
import { uploadToCloudinary } from '../../services/cloudinaryService'
import { updateUserProfileDetails } from '../../services/authService'
import { listenToUsers } from '../../services/realtimeService'
import { buildDirectMessagePath } from '../../utils/directMessageRoute'
import { buildProfilePath } from '../../utils/profileRoute'

function Icon({ path, className = 'h-5 w-5' }) {
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

function formatDate(value, options = {}) {
  if (!value) return 'Non disponible'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Non disponible'

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  })
}

function formatDateTime(value) {
  if (!value) return 'Date non disponible'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date non disponible'

  return date.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInitials(name) {
  if (!name) return 'NX'

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function getProfileCompletion(profile) {
  const fields = [
    profile?.username,
    profile?.email,
    profile?.createdAt,
    profile?.avatar,
    profile?.coverPhoto,
    profile?.birthDate,
    profile?.origin,
    profile?.location,
  ]
  return Math.round((fields.filter(Boolean).length / fields.length) * 100)
}

function toDateInputValue(value) {
  if (!value) return ''

  if (typeof value === 'string') {
    const isoDateMatch = value.match(/^\d{4}-\d{2}-\d{2}/)
    if (isoDateMatch) return isoDateMatch[0]
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Impossible de lire ce fichier.'))
    reader.readAsDataURL(file)
  })

function getMembershipDuration(value) {
  if (!value) return 'Nouveau membre'

  const joinedAt = new Date(value)
  if (Number.isNaN(joinedAt.getTime())) return 'Nouveau membre'

  const days = Math.max(1, Math.floor((Date.now() - joinedAt.getTime()) / 86400000))
  if (days < 30) return `${days} jour${days > 1 ? 's' : ''} sur Netthex`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months} mois sur Netthex`

  const years = Math.floor(months / 12)
  return `${years} an${years > 1 ? 's' : ''} sur Netthex`
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-2 py-4 text-xs font-semibold transition sm:px-4 ${
        active
          ? 'border-[#0f172a] text-slate-950'
          : 'border-transparent text-slate-400 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  )
}

function InfoCard({ title, children }) {
  return (
    <section className="rounded-[24px] border border-[#eef1f7] bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.04)] sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="border-b border-[#f1f3f8] py-3 last:border-b-0 last:pb-0 first:pt-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-medium leading-6 text-slate-700">{value}</p>
    </div>
  )
}

function MetricPill({ icon, label }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-[#f4f6fb] px-3 py-2 text-[11px] font-semibold text-slate-600">
      <Icon path={icon} className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
  )
}

function GroupCard({ group, onOpen }) {
  const postCount = Object.keys(group.posts || {}).length
  const memberCount = group.memberCount || Object.keys(group.members || {}).length || 1

  return (
    <article className="rounded-[24px] border border-[#edf1f7] bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-slate-900">{group.name}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{group.description || 'Aucune description.'}</p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-xl bg-[#3458ff] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2749ef]"
        >
          Ouvrir
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <MetricPill icon="M12 5v14M5 12h14" label={`${postCount} post${postCount > 1 ? 's' : ''}`} />
        <MetricPill icon="M16 14a4 4 0 1 0-8 0M6 18a6 6 0 0 1 12 0" label={`${memberCount} membres`} />
        <MetricPill icon="M12 8v4l2.5 2.5M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0Z" label={formatDate(group.updatedAt || group.createdAt)} />
      </div>
    </article>
  )
}

function NotificationCard({ notification }) {
  return (
    <article className="rounded-[24px] border border-[#edf1f7] bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-semibold text-slate-900">
              {notification.title || notification.type || 'Notification'}
            </p>
            {!notification.read ? <span className="h-2.5 w-2.5 rounded-full bg-[#3458ff]" /> : null}
          </div>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
            {formatDateTime(notification.createdAt)}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        {notification.message || 'Aucun message disponible pour cette notification.'}
      </p>
    </article>
  )
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#dce3ef] bg-white px-6 py-10 text-center shadow-[0_18px_40px_rgba(15,23,42,0.03)]">
      <p className="text-base font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </div>
  )
}

function EditProfileDialog({
  form,
  error,
  saving,
  onClose,
  onChange,
  onFileChange,
  onSubmit,
}) {
  const coverPreview = form.coverPhoto
    ? `url(${form.coverPhoto})`
    : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 38%, #4f46e5 72%, #7c3aed 100%)'

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-slate-950/60 px-3 py-6 backdrop-blur-sm sm:items-center sm:px-6">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Fermer la modale de profil" />

      <section className="relative z-10 flex max-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[34px] border border-white/70 bg-white shadow-[0_36px_90px_rgba(15,23,42,0.16),0_10px_24px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] sm:max-h-[calc(100vh-4rem)]">
        <div className="bg-gradient-to-b from-slate-100/90 to-white px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Modifier le profil
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                Mets a jour tes informations
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Change ton nom, ta photo de profil, ta couverture, ta date de naissance et tes villes.
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

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <div className="space-y-6">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <div>
                <label htmlFor="edit-profile-name" className="mb-2 block text-sm font-medium text-slate-700">
                  Nom complet
                </label>
                <input
                  id="edit-profile-name"
                  type="text"
                  value={form.username}
                  onChange={(e) => onChange('username', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-profile-birthdate" className="mb-2 block text-sm font-medium text-slate-700">
                    Date de naissance
                  </label>
                  <input
                    id="edit-profile-birthdate"
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => onChange('birthDate', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label htmlFor="edit-profile-origin" className="mb-2 block text-sm font-medium text-slate-700">
                    Ville d'origine
                  </label>
                  <input
                    id="edit-profile-origin"
                    type="text"
                    value={form.origin}
                    onChange={(e) => onChange('origin', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-profile-location" className="mb-2 block text-sm font-medium text-slate-700">
                  Ville actuelle
                </label>
                <input
                  id="edit-profile-location"
                  type="text"
                  value={form.location}
                  onChange={(e) => onChange('location', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <label htmlFor="edit-profile-avatar" className="mb-2 block text-sm font-medium text-slate-700">
                  Photo de profil
                </label>
                <input
                  id="edit-profile-avatar"
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileChange('avatar', e.target.files?.[0])}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                />
              </div>

              <div>
                <label htmlFor="edit-profile-cover" className="mb-2 block text-sm font-medium text-slate-700">
                  Photo de couverture
                </label>
                <input
                  id="edit-profile-cover"
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileChange('coverPhoto', e.target.files?.[0])}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                />
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.85)]">
                <p className="mb-3 text-sm font-semibold text-slate-700">Apercu</p>
                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                  <div className="netthex-dark-media-preserve h-36 bg-cover bg-center" style={{ backgroundImage: coverPreview }} />
                  <div className="relative px-4 pb-4 pt-12">
                    <div className="absolute left-4 top-[-32px] flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-[0_12px_25px_rgba(15,23,42,0.12)]">
                      {form.avatar ? (
                        <img src={form.avatar} alt={form.username || 'Photo de profil'} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xl font-extrabold text-slate-700">
                          {getInitials(form.username)}
                        </span>
                      )}
                    </div>

                    <p className="text-lg font-bold text-slate-900">{form.username || 'Ton nom apparaitra ici'}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {form.location || 'Ville actuelle non renseignee'}
                      {form.origin ? ` . Origine: ${form.origin}` : ''}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {form.birthDate ? `Ne(e) le ${formatDate(form.birthDate)}` : 'Date de naissance non renseignee'}
                    </p>
                  </div>
                </div>
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
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
          </div>
        </form>
      </section>
    </div>
  )
}

export default function Profile() {
  const { currentUser, userData, refreshUserData } = useAuth()
  const { groups } = useGroups()
  const { notifications, unreadCount, loading: notificationsLoading } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('details')
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [editProfileError, setEditProfileError] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [usersDirectory, setUsersDirectory] = useState({})
  const [editProfileForm, setEditProfileForm] = useState({
    username: '',
    avatar: '',
    coverPhoto: '',
    birthDate: '',
    origin: '',
    location: '',
  })
  const requestedProfileId = searchParams.get('id') || ''
  const currentUserId = currentUser?.uid || userData?.uid || ''
  const viewedUserId = requestedProfileId || currentUserId
  const isOwnProfile = !viewedUserId || viewedUserId === currentUserId

  useEffect(() => {
    const unsubscribeUsers = listenToUsers((snapshot) => {
      setUsersDirectory(snapshot.val() || {})
    })

    return () => unsubscribeUsers()
  }, [])

  const viewedUserProfile = !isOwnProfile && viewedUserId
    ? usersDirectory[viewedUserId] || null
    : null

  const profile = {
    username:
      (isOwnProfile ? userData?.username : viewedUserProfile?.username) ||
      (isOwnProfile ? currentUser?.displayName : viewedUserProfile?.displayName) ||
      'Membre Netthex',
    email:
      (isOwnProfile ? userData?.email : viewedUserProfile?.email) ||
      (isOwnProfile ? currentUser?.email : '') ||
      'Adresse non disponible',
    createdAt:
      (isOwnProfile ? userData?.createdAt : viewedUserProfile?.createdAt) ||
      (isOwnProfile ? currentUser?.metadata?.creationTime : ''),
    avatar: (isOwnProfile ? userData?.avatar : viewedUserProfile?.avatar) || (isOwnProfile ? currentUser?.photoURL : '') || '',
    coverPhoto: (isOwnProfile ? userData?.coverPhoto : viewedUserProfile?.coverPhoto) || '',
    uid: viewedUserId || '',
    birthDate: (isOwnProfile ? userData?.birthDate : viewedUserProfile?.birthDate) || '',
    location: (isOwnProfile ? userData?.location : viewedUserProfile?.location) || '',
    origin: (isOwnProfile ? userData?.origin : viewedUserProfile?.origin) || '',
  }

  const profileCompletion = getProfileCompletion(profile)
  const joinedLabel = formatDate(profile.createdAt, { month: 'long' })
  const membershipDuration = getMembershipDuration(profile.createdAt)
  const allGroups = useMemo(
    () => Object.entries(groups || {}).map(([id, value]) => ({ id, ...value })),
    [groups],
  )
  const joinedGroups = useMemo(
    () =>
      allGroups
        .filter((group) => {
          const currentUserId = profile.uid
          return currentUserId && (group.adminId === currentUserId || group.members?.[currentUserId])
        })
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)),
    [allGroups, profile.uid],
  )
  const sharedGroups = useMemo(
    () =>
      allGroups
        .filter((group) => {
          if (!currentUserId || !profile.uid || currentUserId === profile.uid) return false

          const currentUserInGroup = group.adminId === currentUserId || group.members?.[currentUserId]
          const profileUserInGroup = group.adminId === profile.uid || group.members?.[profile.uid]

          return Boolean(currentUserInGroup && profileUserInGroup)
        })
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)),
    [allGroups, currentUserId, profile.uid],
  )
  const canStartPrivateChat = !isOwnProfile && sharedGroups.length > 0
  const sharedGroupsBadgeLabel =
    sharedGroups.length === 1
      ? '1 groupe en commun'
      : `${sharedGroups.length} groupes en commun`
  const profileTabs = isOwnProfile
    ? [
        { id: 'details', label: 'Details' },
        { id: 'activity', label: 'Activity' },
        { id: 'notifications', label: `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
      ]
    : [
        { id: 'details', label: 'Details' },
        { id: 'activity', label: 'Activity' },
      ]

  useEffect(() => {
    const expectedPath = buildProfilePath(currentUser?.uid || userData?.uid)

    if (!currentUser?.uid || location.pathname !== '/user/profile' || requestedProfileId) {
      return
    }

    navigate(expectedPath, { replace: true })
  }, [currentUser?.uid, location.pathname, navigate, requestedProfileId, userData?.uid])

  useEffect(() => {
    if (activeTab === 'notifications' && !isOwnProfile) {
      setActiveTab('details')
    }
  }, [activeTab, isOwnProfile])

  const coverImage = profile.coverPhoto || profile.avatar
  const coverStyle = coverImage
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(15,23,42,0.16), rgba(37,99,235,0.22) 45%, rgba(99,102,241,0.18)), url(${coverImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        backgroundImage:
          'radial-gradient(circle_at_top_left,rgba(255,255,255,0.30),transparent 26%), radial-gradient(circle_at_80%_20%,rgba(125,211,252,0.26),transparent 22%), linear-gradient(115deg,#1d4ed8 0%,#2563eb 32%,#4f46e5 66%,#7c3aed 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }

  const handleOpenEditProfile = () => {
    setEditProfileError('')
    setAvatarFile(null)
    setCoverFile(null)
    setEditProfileForm({
      username: profile.username,
      avatar: profile.avatar,
      coverPhoto: profile.coverPhoto,
      birthDate: toDateInputValue(profile.birthDate),
      origin: profile.origin,
      location: profile.location,
    })
    setIsEditProfileOpen(true)
  }

  const handleCloseEditProfile = () => {
    if (isSavingProfile) return

    setIsEditProfileOpen(false)
    setEditProfileError('')
    setAvatarFile(null)
    setCoverFile(null)
  }

  const handleEditProfileChange = (field, value) => {
    setEditProfileForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleEditProfileFileChange = async (field, file) => {
    if (!file) return

    try {
      const dataUrl = await readFileAsDataUrl(file)

      if (field === 'avatar') {
        setAvatarFile(file)
      }

      if (field === 'coverPhoto') {
        setCoverFile(file)
      }

      handleEditProfileChange(field, dataUrl)
    } catch (error) {
      setEditProfileError(error.message || 'Impossible de charger cette image.')
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setEditProfileError('')

    const normalizedUsername = editProfileForm.username.trim()
    const normalizedOrigin = editProfileForm.origin.trim()
    const normalizedLocation = editProfileForm.location.trim()

    if (!currentUser?.uid) {
      setEditProfileError('Tu dois etre connecte pour modifier le profil.')
      return
    }

    if (normalizedUsername.length < 2) {
      setEditProfileError('Le nom doit contenir au moins 2 caracteres.')
      return
    }

    setIsSavingProfile(true)

    try {
      let avatarUrl = profile.avatar
      let coverPhotoUrl = profile.coverPhoto

      if (avatarFile) {
        avatarUrl = await uploadToCloudinary(avatarFile, 'user')
      }

      if (coverFile) {
        coverPhotoUrl = await uploadToCloudinary(coverFile, 'user')
      }

      await updateUserProfileDetails({
        username: normalizedUsername,
        avatar: avatarUrl,
        coverPhoto: coverPhotoUrl,
        birthDate: editProfileForm.birthDate || '',
        origin: normalizedOrigin,
        location: normalizedLocation,
      })

      await refreshUserData(currentUser.uid)
      setIsEditProfileOpen(false)
      setEditProfileError('')
      setAvatarFile(null)
      setCoverFile(null)
    } catch (error) {
      setEditProfileError(error.message || 'Impossible de modifier le profil pour le moment.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const renderTabContent = () => {
    if (activeTab === 'activity') {
      if (!joinedGroups.length) {
        return (
          <EmptyState
            title="Aucun groupe pour le moment"
            text={
              isOwnProfile
                ? 'Quand tu rejoindras ou creeras des groupes, ils apparaitront ici.'
                : 'Les groupes de ce profil apparaitront ici des qu il en rejoindra.'
            }
          />
        )
      }

      return (
        <div className="space-y-4">
          {joinedGroups.map((group) => (
            <GroupCard key={group.id} group={group} onOpen={() => navigate(`/group/${group.slug}`)} />
          ))}
        </div>
      )
    }

    if (activeTab === 'notifications') {
      if (notificationsLoading) {
        return (
          <EmptyState
            title="Chargement des notifications"
            text="Un instant, on recupere les notifications de ton compte."
          />
        )
      }

      if (!notifications.length) {
        return (
          <EmptyState
            title="Aucune notification"
            text="Les nouvelles activites de ton compte apparaitront ici."
          />
        )
      }

      return (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <NotificationCard key={notification.id} notification={notification} />
          ))}
        </div>
      )
    }

    return (
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <InfoCard title="Informations utilisateur">
            <div className="space-y-1">
              <InfoRow label="Nom" value={profile.username} />
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Membre depuis" value={joinedLabel} />
              <InfoRow label="Statut" value={membershipDuration} />
              {!isOwnProfile ? (
                <InfoRow
                  label="Relation"
                  value={
                    sharedGroups.length > 0
                      ? sharedGroups.length === 1
                        ? `Vous partagez le groupe ${sharedGroups[0].name}.`
                        : `Vous partagez ${sharedGroups.length} groupes.`
                      : 'Aucun groupe partage.'
                  }
                />
              ) : null}
            </div>
          </InfoCard>
        </div>

        <div className="space-y-4">
          <InfoCard title="Profil">
            <div className="space-y-1">
              <InfoRow label="Date de naissance" value={formatDate(profile.birthDate)} />
              <InfoRow label="Ville actuelle" value={profile.location || 'Non disponible'} />
              <InfoRow label="Origine" value={profile.origin || 'Non disponible'} />
              <InfoRow label="Completion" value={`${profileCompletion}%`} />
            </div>
          </InfoCard>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full overflow-y-auto bg-[#e9edf6] px-3 py-6 text-slate-900 sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1230px] rounded-[18px] border border-white/70 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
        <section>
          <div className="netthex-dark-media-preserve relative h-[170px] overflow-hidden sm:h-[210px] lg:h-[240px]" style={coverStyle}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_32%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(15,23,42,0.26))]" />
            <div className="absolute -left-8 bottom-0 h-24 w-28 rounded-tr-[42px] bg-[linear-gradient(135deg,rgba(251,146,60,0.92),rgba(251,146,60,0.26))] blur-[1px] sm:h-32 sm:w-40" />
            <div className="absolute right-[-8%] top-[-18%] h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.28),transparent_65%)] blur-2xl sm:h-48 sm:w-48" />

            <div className="absolute right-4 top-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap justify-end gap-2 sm:right-6 sm:top-6">
              {isOwnProfile ? (
                <button
                  type="button"
                  onClick={handleOpenEditProfile}
                  className="rounded-full bg-white/92 px-4 py-2 text-[11px] font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.14)] backdrop-blur transition hover:bg-white"
                >
                  Modifier profil
                </button>
              ) : null}
              {!isOwnProfile && canStartPrivateChat ? (
                <span className="inline-flex items-center rounded-full bg-white/92 px-4 py-2 text-[11px] font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.14)] backdrop-blur">
                  {sharedGroupsBadgeLabel}
                </span>
              ) : null}
              {!isOwnProfile && canStartPrivateChat ? (
                <button
                  type="button"
                  onClick={() => navigate(buildDirectMessagePath(profile.uid))}
                  className="rounded-full bg-slate-900/92 px-4 py-2 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] backdrop-blur transition hover:bg-slate-900"
                >
                  Ecrire en prive
                </button>
              ) : null}
            </div>
          </div>

          <div className="px-4 pb-0 sm:px-6 lg:px-8">
            <div className="-mt-7 flex flex-col gap-5 lg:-mt-11">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-[4px] border-white bg-[linear-gradient(135deg,#8f7bff_0%,#5a6dff_100%)] shadow-[0_14px_30px_rgba(79,70,255,0.16)] sm:h-24 sm:w-24">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.username} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xl font-extrabold text-white">{getInitials(profile.username)}</span>
                      )}
                    </div>

                    <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#2f6efb] text-white shadow-[0_8px_18px_rgba(47,110,251,0.28)]">
                      <Icon path="M9 12.75 11.25 15 15 9.75" className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="pt-8 sm:pt-10">
                    <h1 className="text-[24px] font-bold tracking-tight text-slate-950 sm:text-[30px]">
                      {profile.username}
                    </h1>
                    <p className="mt-2 max-w-[640px] text-[12px] leading-6 text-slate-400">
                      {isOwnProfile
                        ? 'Espace personnel Netthex avec tes informations de compte, tes groupes et tes notifications.'
                        : canStartPrivateChat
                          ? `Profil Netthex. Vous partagez ${sharedGroups.length} groupe${sharedGroups.length > 1 ? 's' : ''}.`
                          : 'Profil Netthex visible en lecture seule.'}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <MetricPill icon="M3.75 6.75h16.5v13.5H3.75V6.75Zm3-3v3m10.5-3v3M7.5 11.25h9" label={joinedLabel} />
                      <MetricPill icon="M16 14a4 4 0 1 0-8 0M6 18a6 6 0 0 1 12 0" label={`${joinedGroups.length} groupe${joinedGroups.length > 1 ? 's' : ''}`} />
                      {isOwnProfile ? (
                        <MetricPill icon="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" label={`${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`} />
                      ) : (
                        <MetricPill icon="M8 7h8M6 12h12M9 17h6" label={`${sharedGroups.length} groupe${sharedGroups.length > 1 ? 's' : ''} partage${sharedGroups.length > 1 ? 's' : ''}`} />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 border-b border-[#edf1f7]">
                {profileTabs.map((tab) => (
                  <TabButton
                    key={tab.id}
                    label={tab.label}
                    active={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-b-[18px] bg-[#f7f9fd] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          {renderTabContent()}
        </section>
      </div>

      {isEditProfileOpen ? (
        <EditProfileDialog
          form={editProfileForm}
          error={editProfileError}
          saving={isSavingProfile}
          onClose={handleCloseEditProfile}
          onChange={handleEditProfileChange}
          onFileChange={handleEditProfileFileChange}
          onSubmit={handleSaveProfile}
        />
      ) : null}
    </div>
  )
}
