import { useRef, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGroups } from '../context/GroupContext'
import NotificationBell from './NotificationBell'
import MobileMenu from './MobileMenu'

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

export default function Navbar() {
  const { groups } = useGroups()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const searchRef = useRef(null)

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
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      {/* Navbar Desktop & Mobile */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between h-16 px-4 md:px-6 lg:ml-64 gap-4">
          {/* Left: Hamburger (Mobile) / Logo (Desktop) */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Hamburger Button - Mobile only */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Ouvrir le menu"
            >
              <Icon path={isMobileMenuOpen ? 'M18 6L6 18M6 6l12 12' : 'M4 7h16M4 12h16M4 17h16'} className="h-6 w-6" />
            </button>

            {/* Logo - Desktop only */}
            <div className="hidden lg:flex items-center gap-3">
              <NetthexMark />
              <span className="text-lg font-bold text-slate-900">Netthex</span>
            </div>
          </div>

          {/* Center: Recherche (visible sur md+) */}
          <div ref={searchRef} className="hidden md:flex flex-1 max-w-md relative">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Chercher un groupe..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowResults(e.target.value.trim().length > 0)
                }}
                onFocus={() => setShowResults(searchQuery.trim().length > 0)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
              <Icon path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.5 5.5a7.5 7.5 0 0010.5 10.5Z" className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />

              {/* Dropdown résultats */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSearchSelect(result)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-b-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{result.name}</p>
                        <p className="text-xs text-slate-500 truncate">{result.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showResults && searchResults.length === 0 && searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center z-50">
                  <p className="text-sm text-slate-500">Aucun groupe trouvé</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Notifications */}
          <div className="flex items-center justify-end flex-shrink-0">
            <NotificationBell />
          </div>
        </div>

        {/* Recherche Mobile (visible uniquement sur mobile et sous la navbar) */}
        <div className="md:hidden px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div ref={searchRef} className="relative">
            <input
              type="text"
              placeholder="Chercher un groupe..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowResults(e.target.value.trim().length > 0)
              }}
              onFocus={() => setShowResults(searchQuery.trim().length > 0)}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
            <Icon path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.5 5.5a7.5 7.5 0 0010.5 10.5Z" className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />

            {/* Dropdown résultats mobile */}
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50 max-h-96">
                {searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSearchSelect(result)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-b-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{result.name}</p>
                        <p className="text-xs text-slate-500 truncate">{result.description}</p>
                      </div>
                    </button>
                  ))
                ) : searchQuery.trim() ? (
                  <div className="p-4 text-center">
                    <p className="text-sm text-slate-500">Aucun groupe trouvé</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </>
  )
}
