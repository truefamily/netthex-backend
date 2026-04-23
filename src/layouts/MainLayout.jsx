import { useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'

/**
 * Layout principal
 * - Navbar en haut
 */
export default function MainLayout({ children }) {
  const location = useLocation()
  const isInvitePage = location.pathname.startsWith('/invite/')

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden bg-slate-50 md:h-screen">
      {/* Navbar */}
      <Navbar />

      <div className="flex flex-1 min-h-0">
        <main
          className={`min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto pb-20 md:pb-0 ${
            isInvitePage ? 'md:overflow-y-auto' : 'md:overflow-hidden'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
