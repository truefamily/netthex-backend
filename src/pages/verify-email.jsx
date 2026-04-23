import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { consumeAuthNotice, logOut, resendVerificationEmail } from '../services/authService'

function NetthexLogo({ className = '' }) {
  return (
    <svg
      viewBox="0 0 256 256"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M90 90c0-27 5-44 10-44 4 0 7 5 10 10 5 9 13 18 30 18h23c38 0 57 18 57 58v37c0 30-3 45-23 58v-93c0-22-11-32-35-32h-52c-19 0-27-9-27-28V90Z"
        fill="currentColor"
      />
      <path
        d="M110 190c0 11-6 23-15 31-7 6-13 10-19 12-3 1-5-1-5-4V130c0-8 17-19 32-24 4-2 7 0 7 4v80Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function VerifyEmail() {
  const { currentUser, refreshCurrentUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [resending, setResending] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    const notice = consumeAuthNotice()

    if (notice) {
      setSuccessMessage(notice)
    }
  }, [])

  const pendingRedirectPath = (() => {
    const from = location.state?.from
    if (!from?.pathname || from.pathname === '/auth' || from.pathname === '/auth/verify-email') {
      return ''
    }

    return `${from.pathname}${from.search || ''}${from.hash || ''}`
  })()

  const handleRefreshVerification = async () => {
    setError('')
    setSuccessMessage('')
    setRefreshing(true)

    try {
      const refreshedUser = await refreshCurrentUser()

      if (!refreshedUser?.emailVerified) {
        setError('L adresse e-mail n est pas encore verifiee. Ouvre le lien recu puis reessaie.')
        return
      }

      navigate(pendingRedirectPath || '/', { replace: true })
    } catch (err) {
      setError(err.message || 'Impossible de verifier le statut de ton compte.')
    } finally {
      setRefreshing(false)
    }
  }

  const handleResendEmail = async () => {
    setError('')
    setSuccessMessage('')
    setResending(true)

    try {
      const result = await resendVerificationEmail()

      if (result.alreadyVerified) {
        navigate(pendingRedirectPath || '/', { replace: true })
        return
      }

      setSuccessMessage('Un nouvel e-mail de verification vient d etre envoye.')
    } catch (err) {
      setError(err.message || "Impossible d envoyer un nouvel e-mail de verification.")
    } finally {
      setResending(false)
    }
  }

  const handleLogOut = async () => {
    setError('')
    setSuccessMessage('')
    setLoggingOut(true)

    try {
      await logOut()
      navigate('/auth', { replace: true })
    } catch (err) {
      setError(err.message || 'Impossible de se deconnecter pour le moment.')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eef3fb] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-sky-200/20 blur-3xl" />
        <div className="absolute left-[12%] top-[18%] h-40 w-40 rounded-full border border-sky-100/30" />
        <div className="absolute bottom-[12%] right-[12%] h-52 w-52 rounded-full border border-sky-200/20" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center justify-center">
        <section className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-10">
          <div className="mb-8 flex items-center gap-4">
            <NetthexLogo className="h-14 w-14 shrink-0 text-slate-900" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
                Verification requise
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                Verifie ton adresse e-mail
              </h1>
            </div>
          </div>

          <p className="text-base leading-7 text-slate-600">
            Ton compte a bien ete cree, mais l acces a l application reste bloque tant que ton
            adresse n est pas verifiee.
          </p>
          <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Adresse concernee: <span className="font-semibold text-slate-900">{currentUser?.email || 'inconnue'}</span>
          </p>

          {error && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleRefreshVerification}
              disabled={refreshing}
              className="flex h-12 items-center justify-center rounded-xl bg-sky-500 px-4 font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? 'Verification...' : 'J ai verifie mon e-mail'}
            </button>
            <button
              type="button"
              onClick={handleResendEmail}
              disabled={resending}
              className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resending ? 'Envoi...' : 'Renvoyer l e-mail'}
            </button>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-sky-50/60 p-5 text-sm leading-6 text-slate-600">
            Apres validation du lien, reviens ici puis utilise le bouton de verification pour
            rafraichir ta session.
          </div>

          <button
            type="button"
            onClick={handleLogOut}
            disabled={loggingOut}
            className="mt-6 text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? 'Deconnexion...' : 'Se deconnecter'}
          </button>
        </section>
      </div>
    </div>
  )
}
