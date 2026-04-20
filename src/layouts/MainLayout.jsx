import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'

/**
 * Layout principal responsif
 * - Sidebar sur desktop (lg+)
 * - Bottom nav sur mobile (< lg)
 * - Navbar en haut sur tous les écrans
 */
export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <Navbar />

      <div className="flex flex-1">
        {/* Sidebar (Desktop only) */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 w-full overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Bottom Navigation (Mobile only) */}
      <BottomNav />
    </div>
  )
}
