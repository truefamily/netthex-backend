import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { joinGroup } from '../services/realtimeService'
import { useState } from 'react'

export default function GroupCard({ id, name, description, memberCount, postCount = 0, avatar }) {
  const { userData } = useAuth()
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)

  const handleJoin = async (e) => {
    e.preventDefault()
    try {
      setJoining(true)
      await joinGroup(id, userData.uid)
      setJoined(true)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setJoining(false)
    }
  }

  const colors = [
    'from-blue-600 to-cyan-600',
    'from-purple-600 to-pink-600',
    'from-green-600 to-emerald-600',
    'from-orange-600 to-red-600',
    'from-indigo-600 to-blue-600',
    'from-rose-600 to-pink-600',
  ]

  const randomColor = colors[id.charCodeAt(0) % colors.length]

  return (
    <Link to={`/group/${id}`}>
      <div className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_28px_60px_rgba(15,23,42,0.10)]">
        {avatar ? (
          <div className="h-28 overflow-hidden bg-slate-200">
            <img src={avatar} alt={name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className={`h-28 bg-gradient-to-br ${randomColor} opacity-90 transition group-hover:opacity-100`}></div>
        )}

        <div className="flex flex-1 flex-col p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Communaute
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 transition group-hover:text-sky-600">
                {name}
              </h2>
            </div>

            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
              {postCount} post{postCount > 1 ? 's' : ''}
            </div>
          </div>

          <p className="mb-6 line-clamp-3 flex-1 text-sm text-slate-500">
            {description || 'Aucune description disponible pour ce groupe pour le moment.'}
          </p>

          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-[#f8faff] p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Membres</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{memberCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-[#f8faff] p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Activite</p>
              <p className="mt-1 text-lg font-bold text-sky-600">
                {postCount > 0 ? 'Active' : 'Calme'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-sm text-slate-500">
              <span className="font-semibold text-slate-900">{memberCount}</span> membres
            </span>
            {joined ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-600">
                ✓ Rejoint
              </span>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="rounded-full bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-2 text-xs font-semibold text-white transition hover:brightness-105 active:scale-95 disabled:opacity-50"
              >
                {joining ? 'Chargement...' : 'Rejoindre'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
