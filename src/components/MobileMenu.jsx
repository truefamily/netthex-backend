import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logOut } from '../services/authService'
import { useState } from 'react'

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

export default function MobileMenu({ isOpen, onClose }) {
  const { userData, currentUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const navItems = [
    { 
      to: '/', 
      label: 'Accueil', 
      icon: 'M3 12h7V3H3v9Zm0 9h7v-7H3v7Zm11 0h7v-9h-7v9Zm0-18v7h7V3h-7Z',
      exact: true
    },
    { 
      to: '/mes-groupes', 
      label: 'Mes groupes', 
      icon: 'M4 6.5h16M6 4h12a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2Zm2 5h8M8 13h5' 
    },
    { 
      to: '/direct/inbox', 
      label: 'Messages', 
      icon: 'M4 7h16v10H4V7Zm0 0 8 6l8-6' 
    },
    { 
      to: '/notifications/invitations', 
      label: 'Invitations', 
      icon: 'M4 7h16M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 3 6 4 6-4' 
    },
  ]

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  const handleNavClick = () => {
    onClose()
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logOut()
      onClose()
      navigate('/auth')
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Menu Drawer */}
      <nav
        className={`
          fixed top-0 left-0 right-0 bottom-0 z-50 w-full max-w-xs bg-white 
          transition-transform duration-300 ease-in-out lg:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col
        `}
      >
        {/* Header avec close button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <span className="font-bold text-lg text-slate-900">Menu</span>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <Icon path="M18 6L6 18M6 6l12 12" className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={handleNavClick}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${isActive(item.to, item.exact)
                  ? 'bg-sky-100 text-sky-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
                }
              `}
            >
              <Icon path={item.icon} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Profil & Actions */}
        <div className="border-t border-slate-200 p-4 space-y-2">
          <Link
            to="/user/profile"
            onClick={handleNavClick}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all
              ${isActive('/user/profile')
                ? 'bg-sky-100 text-sky-700 font-semibold'
                : 'text-slate-700 hover:bg-slate-100'
              }
            `}
          >
            <Icon path="M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Mon profil</p>
              <p className="text-xs text-slate-500 truncate">{userData?.username || currentUser?.email}</p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon path="M19 12H5M12 19l-7-7 7-7" />
            <span className="text-sm font-medium">
              {isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
