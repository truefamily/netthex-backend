import { Link, useLocation } from 'react-router-dom'

function Icon({ path, className = 'h-6 w-6' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function BottomNav() {
  const location = useLocation()

  const navItems = [
    { 
      to: '/', 
      label: 'Accueil', 
      icon: 'M3 12h7V3H3v9Zm0 9h7v-7H3v7Zm11 0h7v-9h-7v9Zm0-18v7h7V3h-7Z',
      exact: true
    },
    { 
      to: '/mes-groupes', 
      label: 'Groupes', 
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
    { 
      to: '/user/profile', 
      label: 'Profil', 
      icon: 'M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0' 
    },
  ]

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 lg:hidden flex items-center justify-around bg-white border-t border-slate-200 px-2 py-2 safe-area-inset-bottom">
      {navItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={`
            flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all flex-1
            ${isActive(item.to, item.exact)
              ? 'text-sky-600 bg-sky-50'
              : 'text-slate-600 hover:text-slate-900'
            }
          `}
        >
          <Icon path={item.icon} className="h-6 w-6" />
          <span className="text-xs font-medium text-center line-clamp-1">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}
