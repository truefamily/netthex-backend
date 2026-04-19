import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGroups } from '../context/GroupContext'
import { logOut } from '../services/authService'
import NotificationBell from './NotificationBell'
import { useState, useMemo, useRef, useEffect } from 'react'

function Icon({ path, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NetthexMark() {
  return (
    <svg
      viewBox="0 0 256 256"
      aria-hidden="true"
      className="h-9 w-9"
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

export default function Navbar() {
  const { userData } = useAuth()
  const { groups } = useGroups()
  const navigate = useNavigate()
  const location = useLocation()
  const [showMenu, setShowMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef(null)

  const navItems = [
    { to: '/', label: 'Accueil', icon: 'M3 12h7V3H3v9Zm0 9h7v-7H3v7Zm11 0h7v-9h-7v9Zm0-18v7h7V3h-7Z' },
    { to: '/mes-groupes', label: 'Mes groupes', icon: 'M4 6.5h16M6 4h12a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2Zm2 5h8M8 13h5' },
    { to: '/direct/inbox', label: 'Messages', icon: 'M4 7h16v10H4V7Zm0 0 8 6l8-6' },
    { to: '/notifications/invitations', label: 'Invitations', icon: 'M4 7h16M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 3 6 4 6-4' },
    { to: '/user/profile', label: 'Profil', icon: 'M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0' },
  ]

  // Logique de recherche globale
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    
    const query = searchQuery.trim().toLowerCase()
    const results = []
    
    // Convertir l'objet des groupes en array et chercher
    const groupsArray = Array.isArray(groups) ? groups : Object.values(groups || {})
    
    const groupMatches = groupsArray.filter(group =>
      group.name.toLowerCase().includes(query) ||
      (group.description && group.description.toLowerCase().includes(query))
    ).slice(0, 5)
    
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
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchSelect = (result) => {
    if (result.type === 'group') {
      navigate(`/group/${result.slug}`)
    }
    setSearchQuery('')
    setShowResults(false)
  }

  const handleLogout = async () => {
    try {
      await logOut()
      navigate('/auth')
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full px-0 py-0">
      <div className="w-full">
        <div className="relative overflow-visible border border-white/80 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
          <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-5">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9f2ff] shadow-[0_8px_16px_rgba(15,23,42,0.04)]">
                  <NetthexMark />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Netthex
                  </p>
                </div>
              </Link>
            </div>

            <div className="hidden lg:flex flex-1 justify-center px-4">
              <div className="relative w-full max-w-sm" ref={searchRef}>
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-300">⌕</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowResults(true)
                  }}
                  onFocus={() => setShowResults(true)}
                  placeholder="Chercher des groupes..."
                  className="w-full rounded-full border border-slate-200 bg-[#f8faff] py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
                
                {showResults && searchQuery.trim() && (
                  <div className="absolute left-0 right-0 top-full z-[70] mt-3 max-h-[min(24rem,calc(100vh-7rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/5">
                    {searchResults.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {searchResults.map((result) => (
                          <button
                            key={`${result.type}-${result.id}`}
                            onClick={() => handleSearchSelect(result)}
                            className="w-full px-4 py-3 text-left transition hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-3">
                              {result.avatar ? (
                                <img
                                  src={result.avatar}
                                  alt={result.name}
                                  className="h-10 w-10 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-sky-50 text-sm font-bold text-sky-600">
                                  {result.name.charAt(0)}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{result.name}</p>
                                {result.description && (
                                  <p className="text-xs text-slate-500 line-clamp-1">{result.description}</p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-slate-500">
                        Aucun groupe trouvé
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-1.5">
              {navItems.map((item) => {
                const isActive =
                  item.to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.to)

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-[#eaf3ff] text-sky-600'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon path={item.icon} className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>

            <div className="flex items-center gap-2">
              {/* Bouton de notifications */}
              <div className="hidden sm:block">
                <NotificationBell />
              </div>

              {userData && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition hover:bg-slate-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-xs font-bold text-white">
                      {userData.username?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden text-sm font-semibold text-slate-900 sm:block">{userData.username}</span>
                    <span className="text-xs text-slate-400">▼</span>
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_50px_rgba(15,23,42,0.12)]">
                      <Link
                        to="/mes-groupes"
                        className="block border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        onClick={() => setShowMenu(false)}
                      >
                        Mes groupes
                      </Link>
                      <Link
                        to="/notifications/invitations"
                        className="block border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        onClick={() => setShowMenu(false)}
                      >
                        Invitations
                      </Link>
                      <Link
                        to="/user/profile"
                        className="block border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        onClick={() => setShowMenu(false)}
                      >
                        Mon profil
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout()
                          setShowMenu(false)
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-rose-500 transition hover:bg-rose-50"
                      >
                        Deconnexion
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
