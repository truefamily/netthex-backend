import { useRef, useEffect, useState, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useGroups } from '../context/GroupContext'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { buildProfilePath } from '../utils/profileRoute'
import { logOut } from '../services/authService'
import NotificationBell from './NotificationBell'

function Icon({ path, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NetthexMark() {
  return (
    <svg
      viewBox="0 0 256 256"
      aria-hidden="true"
      className="h-8 w-8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M90 90c0-27 5-44 10-44 4 0 7 5 10 10 5 9 13 18 30 18h23c38 0 57 18 57 58v37c0 30-3 45-23 58v-93c0-22-11-32-35-32h-52c-19 0-27-9-27-28V90Z"
        fill="#0f172a"
      />
      <path
        d="M110 190c0 11-6 23-15 31-7 6-13 10-19 12-3 1-5-1-5-4V130c0-8 17-19 32-24 4-2 7 0 7 4v80Z"
        fill="#0f172a"
      />
    </svg>
  )
}

function getInitial(value) {
  return value?.charAt(0)?.toUpperCase() || 'P'
}

function getStoredPreference(key, fallback) {
  if (typeof window === 'undefined') return fallback

  const value = window.localStorage.getItem(key)
  return value || fallback
}

function ProfileOptionsItem({ iconPath, title, subtitle, onClick, isDanger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[18px] px-1 py-1.5 text-left transition hover:bg-slate-50"
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          isDanger ? 'bg-[#f4f6fb] text-slate-900' : 'bg-[#eef2f7] text-slate-900'
        }`}
      >
        <Icon path={iconPath} className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-slate-950">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {subtitle}
          </span>
        ) : null}
      </span>

      <Icon path="M9 6l6 6-6 6" className="h-4 w-4 shrink-0 text-slate-400" />
    </button>
  )
}

function HelpSupportItem({ iconPath, title, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-[18px] px-1 py-2 text-left transition hover:bg-slate-50"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-950">
        <Icon path={iconPath} className="h-5 w-5" />
      </span>
      <span className="text-[15px] font-medium text-slate-950">{title}</span>
    </button>
  )
}

function SettingsSection({ icon, title, description, children }) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-950">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-slate-950">{title}</h3>
          {description ? (
            <p className="mt-0.5 max-w-[17rem] text-[13px] leading-5 text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1 pl-[3.5rem]">{children}</div>
    </section>
  )
}

function SettingsOption({ label, description, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start justify-between gap-4 rounded-2xl px-2 py-2 text-left transition hover:bg-slate-50"
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-slate-950">{label}</span>
        {description ? (
          <span className="mt-0.5 block max-w-[15.5rem] text-[13px] leading-5 text-slate-500">{description}</span>
        ) : null}
      </span>

      <span
        className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
          selected ? 'border-slate-950' : 'border-slate-400'
        }`}
        aria-hidden="true"
      >
        {selected ? <span className="h-3 w-3 rounded-full bg-slate-950" /> : null}
      </span>
    </button>
  )
}

function SettingsLinkItem({ icon, title, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[18px] px-1 py-2 text-left transition hover:bg-slate-50"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-950">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-[15px] font-medium text-slate-950">{title}</span>
      <Icon path="M9 6l6 6-6 6" className="h-5 w-5 shrink-0 text-slate-500" />
    </button>
  )
}

export default function Navbar() {
  const { groups } = useGroups()
  const { userData, currentUser } = useAuth()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [showDesktopResults, setShowDesktopResults] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileOptionsOpen, setIsProfileOptionsOpen] = useState(false)
  const [isHelpSupportOpen, setIsHelpSupportOpen] = useState(false)
  const [isDisplayAccessibilityOpen, setIsDisplayAccessibilityOpen] = useState(false)
  const [darkModePreference, setDarkModePreference] = useState(() =>
    getStoredPreference('netthex-dark-mode', 'off'),
  )
  const [compactModePreference, setCompactModePreference] = useState(() =>
    getStoredPreference('netthex-compact-mode', 'off'),
  )
  const [isSigningOut, setIsSigningOut] = useState(false)
  const desktopSearchRef = useRef(null)
  const mobileSearchInputRef = useRef(null)
  const avatar = userData?.avatar || currentUser?.photoURL || ''
  const profileLabel = userData?.username || currentUser?.email || 'Mon profil'
  const profileInitial = getInitial(profileLabel)
  const profilePath = buildProfilePath(currentUser?.uid || userData?.uid)
  const isGroupDetailRoute = location.pathname.startsWith('/group/')

  const navItems = [
    { to: '/', label: 'Accueil', exact: true },
    { to: '/mes-groupes', label: 'Mes groupes' },
    { to: '/direct/inbox', label: 'Messages' },
    { to: '/notifications/invitations', label: 'Invitations' },
  ]

  const bottomNavItems = [
    {
      to: '/direct/inbox',
      label: 'Messages',
      path: 'M8 10h.01M12 10h.01M16 10h.01M5 6h14a2 2 0 012 2v7a2 2 0 01-2 2H9l-4 3v-3H5a2 2 0 01-2-2V8a2 2 0 012-2Z',
    },
    {
      to: '/mes-groupes',
      label: 'Groupes',
      path: 'M17 20h5V10L12 3 2 10v10h5m10 0v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6m10 0H7',
    },
    {
      to: '/notifications/invitations',
      label: 'Notif',
      path: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
      badge: unreadCount,
    },
    {
      to: profilePath,
      label: 'Profil',
      avatar: true,
    },
  ]

  const menuItems = [
    { to: '/', label: 'Accueil', exact: true },
    { to: '/mes-groupes', label: 'Mes groupes' },
    { to: '/direct/inbox', label: 'Messages' },
    { to: '/notifications/invitations', label: 'Notifications' },
    { to: profilePath, label: 'Profil' },
  ]

  const helpSupportItems = [
    {
      title: "Pages d'aide",
      iconPath: 'M12 18h.01M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4',
    },
    {
      title: 'Statut du compte',
      iconPath:
        'M15 20v-1.5A3.5 3.5 0 0 0 11.5 15H8a3.5 3.5 0 0 0-3.5 3.5V20M9.75 10a3.25 3.25 0 1 0 0-6.5a3.25 3.25 0 0 0 0 6.5Zm6.25 7.75 1.5 1.5 3-3',
    },
    {
      title: 'Espace Assistance',
      iconPath: 'M4 7h16v10H4zM4 8l8 5 8-5',
    },
    {
      title: 'Signaler un probleme',
      iconPath: 'M12 8v5m0 3h.01M8 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',
    },
  ]

  const darkModeOptions = [
    { value: 'off', label: 'Desactive' },
    { value: 'on', label: 'Active' },
    {
      value: 'auto',
      label: 'Automatique',
      description: "Nous ajustons l'affichage automatiquement en fonction des parametres systeme de votre appareil.",
    },
  ]

  const compactModeOptions = [
    { value: 'off', label: 'Desactive' },
    { value: 'on', label: 'Active' },
  ]

  // Logique de recherche globale
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []

    const query = searchQuery.trim().toLowerCase()
    const results = []

    // Convertir l'objet des groupes en array et chercher
    const groupsArray = Array.isArray(groups) ? groups : Object.values(groups || {})

    const groupMatches = groupsArray
      .filter((group) =>
        [group?.name, group?.description]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query)),
      )
      .slice(0, 5)

    results.push(...groupMatches.map(group => ({
      type: 'group',
      id: group.id,
      name: group.name,
      description: group.description,
      avatar: group.avatar,
      slug: group.slug,
    })))

    return results
  }, [searchQuery, groups])

  // Fermer le dropdown quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(e.target)) {
        setShowDesktopResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setShowDesktopResults(false)
    setIsMobileMenuOpen(false)
    setIsMobileSearchOpen(false)
    setIsProfileOptionsOpen(false)
    setIsHelpSupportOpen(false)
    setIsDisplayAccessibilityOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isMobileSearchOpen) return undefined

    const focusInput = window.requestAnimationFrame(() => {
      mobileSearchInputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(focusInput)
  }, [isMobileSearchOpen])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow

    if (
      isMobileMenuOpen ||
      isMobileSearchOpen ||
      isProfileOptionsOpen ||
      isHelpSupportOpen ||
      isDisplayAccessibilityOpen
    ) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = previousOverflow
    }

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [
    isMobileMenuOpen,
    isMobileSearchOpen,
    isProfileOptionsOpen,
    isHelpSupportOpen,
    isDisplayAccessibilityOpen,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const root = document.documentElement
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      const useDarkTheme =
        darkModePreference === 'on' || (darkModePreference === 'auto' && Boolean(mediaQuery?.matches))

      root.classList.toggle('netthex-dark-ui', useDarkTheme)
    }

    window.localStorage.setItem('netthex-dark-mode', darkModePreference)
    applyTheme()

    if (darkModePreference !== 'auto' || !mediaQuery) {
      return undefined
    }

    const handleChange = () => applyTheme()
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [darkModePreference])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    const compactEnabled = compactModePreference === 'on'

    window.localStorage.setItem('netthex-compact-mode', compactModePreference)
    root.classList.toggle('netthex-compact-ui', compactEnabled)
  }, [compactModePreference])

  const handleSearchSelect = (result) => {
    if (result.type === 'group') {
      navigate(`/group/${result.slug}`)
    }
    setSearchQuery('')
    setShowDesktopResults(false)
    setIsMobileSearchOpen(false)
    setIsMobileMenuOpen(false)
  }

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.to
    return location.pathname.startsWith(item.to)
  }

  const openMobileSearch = () => {
    setIsMobileMenuOpen(false)
    setIsMobileSearchOpen(true)
  }

  const openProfileOptions = () => {
    setShowDesktopResults(false)
    setIsHelpSupportOpen(false)
    setIsDisplayAccessibilityOpen(false)
    setIsProfileOptionsOpen(true)
  }

  const closeProfileOptions = () => {
    if (isSigningOut) return
    setIsProfileOptionsOpen(false)
  }

  const openHelpSupport = () => {
    setShowDesktopResults(false)
    setIsMobileMenuOpen(false)
    setIsProfileOptionsOpen(false)
    setIsDisplayAccessibilityOpen(false)
    setIsHelpSupportOpen(true)
  }

  const closeHelpSupport = () => {
    setIsHelpSupportOpen(false)
  }

  const openDisplayAccessibility = () => {
    setShowDesktopResults(false)
    setIsMobileMenuOpen(false)
    setIsProfileOptionsOpen(false)
    setIsHelpSupportOpen(false)
    setIsDisplayAccessibilityOpen(true)
  }

  const closeDisplayAccessibility = () => {
    setIsDisplayAccessibilityOpen(false)
  }

  const handleProfileNavigation = (to) => {
    setIsProfileOptionsOpen(false)
    navigate(to)
  }

  const handleSignOut = async () => {
    if (isSigningOut) return

    setIsSigningOut(true)

    try {
      await logOut()
      setIsProfileOptionsOpen(false)
      setIsMobileMenuOpen(false)
      navigate('/auth', { replace: true })
    } finally {
      setIsSigningOut(false)
    }
  }

  const toggleMobileMenu = () => {
    if (isGroupDetailRoute) {
      window.dispatchEvent(new CustomEvent('netthex:toggle-group-detail-menu'))
      return
    }

    setIsMobileSearchOpen(false)
    setIsMobileMenuOpen((current) => !current)
  }

  const renderSearchResults = (className) => {
    if (!searchQuery.trim()) return null

    if (searchResults.length > 0) {
      return (
        <div className={className}>
          {searchResults.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleSearchSelect(result)}
              className="w-full border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{result.name}</p>
                <p className="truncate text-xs text-slate-500">{result.description}</p>
              </div>
            </button>
          ))}
        </div>
      )
    }

    return (
      <div className={className}>
        <p className="px-4 py-4 text-center text-sm text-slate-500">Aucun groupe trouve</p>
      </div>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="hidden h-16 items-center justify-between gap-4 px-6 md:flex">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3">
              <NetthexMark />
              <span className="text-lg font-bold text-slate-900">Netthex</span>
            </Link>

            <nav className="flex items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive(item)
                      ? 'bg-sky-100 text-sky-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div ref={desktopSearchRef} className="relative max-w-md flex-1">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Chercher un groupe..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowDesktopResults(e.target.value.trim().length > 0)
                }}
                onFocus={() => setShowDesktopResults(searchQuery.trim().length > 0)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
              <Icon
                path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.5 5.5a7.5 7.5 0 0010.5 10.5Z"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />

              {showDesktopResults &&
                renderSearchResults(
                  'absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg',
                )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <NotificationBell />
            <div
              className={`flex items-center gap-3 rounded-full border px-2 py-1.5 transition ${
                location.pathname.startsWith('/user/profile')
                  ? 'border-sky-200 bg-sky-50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Link to={profilePath} className="flex items-center gap-3" title={profileLabel}>
                {avatar ? (
                  <img
                    src={avatar}
                    alt={profileLabel}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {profileInitial}
                  </div>
                )}
                <span className="text-sm font-medium text-slate-700">Profil</span>
              </Link>
              <button
                type="button"
                onClick={openProfileOptions}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-800"
                aria-label="Ouvrir les options du profil"
              >
                <Icon path="M6 9l6 6 6-6" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex h-16 items-center justify-between px-4 md:hidden">
          <Link to="/" className="flex items-center gap-3">
            <NetthexMark />
            <span className="text-base font-bold text-slate-900">Netthex</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openMobileSearch}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              aria-label="Ouvrir la recherche"
            >
              <Icon path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.5 5.5a7.5 7.5 0 0010.5 10.5Z" className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={toggleMobileMenu}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              aria-label="Ouvrir le menu"
            >
              <Icon path="M4 7h16M4 12h16M4 17h16" className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500" />
              )}
            </button>
          </div>
        </div>
      </header>

      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-950/35 backdrop-blur-sm md:hidden">
          <div className="h-full p-0 sm:p-3">
            <div className="min-h-dvh overflow-hidden bg-white sm:min-h-0 sm:rounded-[28px] sm:border sm:border-slate-200 sm:shadow-2xl">
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <div className="relative flex-1">
                  <input
                    ref={mobileSearchInputRef}
                    type="text"
                    placeholder="Chercher un groupe..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-900 placeholder-slate-500 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                  <Icon
                    path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.5 5.5a7.5 7.5 0 0010.5 10.5Z"
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen(false)}
                  className="rounded-full px-2 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  Fermer
                </button>
              </div>

              <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto">
                {searchQuery.trim() ? (
                  renderSearchResults('divide-y divide-slate-100')
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">
                    Commencez a taper pour trouver un groupe.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[65] bg-slate-950/35 backdrop-blur-sm md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0"
            aria-label="Fermer le menu"
          />

          <aside className="absolute right-0 top-0 h-full w-full overflow-y-auto bg-white shadow-2xl sm:w-[min(22rem,88vw)] sm:border-l sm:border-slate-200">
            <div className="border-b border-slate-100 px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={profileLabel}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {profileInitial}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{profileLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">Raccourcis du compte et navigation</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-full px-2 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Fermer le menu"
                >
                  <Icon path="M6 18 18 6M6 6l12 12" className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="px-3 py-4">
              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isActive(item)
                        ? 'bg-sky-50 text-sky-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.to === '/notifications/invitations' && unreadCount > 0 && (
                      <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>

              <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-4">
                <button
                  type="button"
                  onClick={openHelpSupport}
                  className="mb-4 flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-900">
                      <Icon path="M12 17h.01M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4" className="h-5 w-5" />
                    </span>
                    <span>Aide et assistance</span>
                  </span>
                  <Icon path="M9 6l6 6-6 6" className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={openDisplayAccessibility}
                  className="mb-4 flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-900">
                      <Icon path="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" className="h-5 w-5" />
                    </span>
                    <span>Affichage et accessibilite</span>
                  </span>
                  <Icon path="M9 6l6 6-6 6" className="h-4 w-4 text-slate-400" />
                </button>

                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Mobile
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Utilisez la barre du bas pour les actions rapides et la recherche en haut pour trouver un groupe sans charger la navigation desktop.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {isProfileOptionsOpen && (
        <div className="fixed inset-0 z-[75] hidden bg-slate-950/35 backdrop-blur-sm md:flex md:items-start md:justify-end">
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeProfileOptions}
            aria-label="Fermer les options du profil"
          />

          <section className="relative z-10 mt-20 mr-6 w-full max-w-[360px] rounded-[28px] border border-white/80 bg-white px-4 py-4 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:px-5 sm:py-5">
            <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex min-w-0 items-center gap-3">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={profileLabel}
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {profileInitial}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{profileLabel}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Options du profil</p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeProfileOptions}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fermer les options du profil"
              >
                <Icon path="M6 18 18 6M6 6l12 12" className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              <ProfileOptionsItem
                title="Mon profil"
                iconPath="M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0"
                onClick={() => handleProfileNavigation(profilePath)}
              />
              <ProfileOptionsItem
                title="Aide et assistance"
                iconPath="M12 17h.01M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4"
                onClick={openHelpSupport}
              />
              <ProfileOptionsItem
                title="Affichage et accessibilite"
                iconPath="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"
                onClick={openDisplayAccessibility}
              />
              <ProfileOptionsItem
                title="Donner votre avis"
                subtitle="CTRL B"
                iconPath="M7 10.5h10M7 7.5h6M5.25 4.75h13.5c.967 0 1.75.783 1.75 1.75v8c0 .967-.783 1.75-1.75 1.75H11l-4.75 3v-3H5.25A1.75 1.75 0 0 1 3.5 14.5v-8c0-.967.783-1.75 1.75-1.75Z"
                onClick={closeProfileOptions}
              />
              <ProfileOptionsItem
                title={isSigningOut ? 'Deconnexion...' : 'Se deconnecter'}
                iconPath="M14.25 7.5V5.75c0-.69-.56-1.25-1.25-1.25h-7.25c-.69 0-1.25.56-1.25 1.25v12.5c0 .69.56 1.25 1.25 1.25H13c.69 0 1.25-.56 1.25-1.25V16.5M10 12h10m0 0-2.75-2.75M20 12l-2.75 2.75"
                onClick={handleSignOut}
                isDanger
              />
            </div>
          </section>
        </div>
      )}

      {isHelpSupportOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/35 backdrop-blur-sm md:flex md:items-start md:justify-end">
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeHelpSupport}
            aria-label="Fermer l'aide et l'assistance"
          />

          <section className="relative z-10 flex min-h-dvh w-full flex-col bg-white md:mt-20 md:mr-6 md:min-h-0 md:max-w-[356px] md:rounded-[28px] md:border md:border-white/80 md:px-5 md:py-5 md:shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 md:px-0 md:py-0 md:pb-4">
              <button
                type="button"
                onClick={closeHelpSupport}
                className="rounded-full p-2 text-slate-700 transition hover:bg-slate-100"
                aria-label="Retour"
              >
                <Icon path="M15 18l-6-6 6-6" className="h-5 w-5" />
              </button>
              <h2 className="text-[17px] font-semibold text-slate-950">Aide et assistance</h2>
            </div>

            <div className="space-y-2 px-4 py-5 md:px-0 md:py-4">
              {helpSupportItems.map((item) => (
                <HelpSupportItem
                  key={item.title}
                  title={item.title}
                  iconPath={item.iconPath}
                  onClick={() => {}}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {isDisplayAccessibilityOpen && (
        <div className="fixed inset-0 z-[85] bg-slate-950/35 backdrop-blur-sm md:flex md:items-start md:justify-end">
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeDisplayAccessibility}
            aria-label="Fermer les preferences d'affichage et d'accessibilite"
          />

          <section className="relative z-10 flex min-h-dvh w-full flex-col bg-white md:mt-20 md:mr-6 md:min-h-0 md:max-h-[min(84vh,760px)] md:max-w-[356px] md:overflow-hidden md:rounded-[28px] md:border md:border-white/80 md:px-5 md:py-5 md:shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 md:px-0 md:py-0 md:pb-4">
              <button
                type="button"
                onClick={closeDisplayAccessibility}
                className="rounded-full border border-sky-500 p-2 text-slate-700 transition hover:bg-slate-100"
                aria-label="Retour"
              >
                <Icon path="M15 18l-6-6 6-6" className="h-5 w-5" />
              </button>
              <h2 className="max-w-[15rem] text-[17px] font-semibold leading-7 text-slate-950">
                Affichage et accessibilite
              </h2>
            </div>

            <div className="space-y-7 overflow-y-auto px-4 py-5 md:px-0 md:py-4">
              <SettingsSection
                icon={<Icon path="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" className="h-5 w-5" />}
                title="Mode sombre"
                description="Ajustez l'apparence pour reduire les reflets et reposer vos yeux."
              >
                {darkModeOptions.map((option) => (
                  <SettingsOption
                    key={option.value}
                    label={option.label}
                    description={option.description}
                    selected={darkModePreference === option.value}
                    onClick={() => setDarkModePreference(option.value)}
                  />
                ))}
              </SettingsSection>

              <SettingsSection
                icon={<span className="text-[13px] font-bold tracking-[-0.04em]">Aa</span>}
                title="Mode compact"
                description="Diminuez la taille de police pour afficher plus d'elements sur l'ecran."
              >
                {compactModeOptions.map((option) => (
                  <SettingsOption
                    key={option.value}
                    label={option.label}
                    selected={compactModePreference === option.value}
                    onClick={() => setCompactModePreference(option.value)}
                  />
                ))}
              </SettingsSection>

              <div className="space-y-2">
                <SettingsLinkItem
                  title="Clavier"
                  icon={<Icon path="M4 8h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Zm2 3h.01M9 11h.01M12 11h.01M15 11h.01M18 11h.01M6 14h8" className="h-5 w-5" />}
                  onClick={() => {}}
                />
                <SettingsLinkItem
                  title="Parametres d'accessibilite"
                  icon={<Icon path="M12 4a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3Zm7 5h-4.5l-1.25-2h-2.5L9.5 9H5a1 1 0 1 0 0 2h4l1.25 2l-1.5 7a1 1 0 1 0 1.96.4L12 15l1.29 5.4a1 1 0 1 0 1.96-.4l-1.5-7L15 11h4a1 1 0 1 0 0-2Z" className="h-5 w-5" />}
                  onClick={() => {}}
                />
              </div>
            </div>
          </section>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="grid h-16 grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
          {bottomNavItems.map((item) => {
            const active = isActive(item)

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium transition ${
                  active ? 'text-sky-700' : 'text-slate-500'
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                    active ? 'bg-sky-100 text-sky-700' : 'bg-transparent'
                  }`}
                >
                  {item.avatar ? (
                    avatar ? (
                      <img
                        src={avatar}
                        alt={profileLabel}
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
                        {profileInitial}
                      </span>
                    )
                  ) : (
                    <Icon path={item.path} className="h-5 w-5" />
                  )}
                </span>
                <span>{item.label}</span>

                {item.badge > 0 && (
                  <span className="absolute right-5 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
