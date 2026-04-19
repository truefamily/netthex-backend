import { useState } from 'react'
import { signUp, logIn } from '../services/authService'
import { useLocation, useNavigate } from 'react-router-dom'
import { markProfilePhotoSetupPending } from '../utils/profilePhotoSetup'

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

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const pendingRedirectPath = (() => {
    const from = location.state?.from
    if (!from?.pathname || from.pathname === '/auth') {
      return ''
    }

    return `${from.pathname}${from.search || ''}${from.hash || ''}`
  })()

  const validateForm = () => {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedUsername = username.trim()

    if (!normalizedEmail) {
      return 'Adresse e-mail requise.'
    }

    if (!password) {
      return 'Mot de passe requis.'
    }

    if (!isLogin) {
      if (normalizedUsername.length < 3) {
        return "Le nom d'utilisateur doit contenir au moins 3 caracteres."
      }

      if (password.length < 6) {
        return 'Le mot de passe doit contenir au moins 6 caracteres.'
      }
    }

    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      if (isLogin) {
        await logIn(email, password, { rememberMe })
        navigate(pendingRedirectPath || '/', { replace: true })
      } else {
        await signUp(email, password, username, { rememberMe })
        markProfilePhotoSetupPending()
        navigate('/user/profile/photo', {
          replace: true,
          state: pendingRedirectPath ? { from: location.state?.from } : undefined,
        })
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-10 text-slate-900 bg-[#eef3fb] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-sky-200/20 blur-3xl" />
        <div className="absolute left-[10%] top-[18%] h-40 w-40 rounded-full border border-sky-100/30" />
        <div className="absolute bottom-[12%] right-[12%] h-52 w-52 rounded-full border border-sky-200/20" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden p-10 lg:flex lg:flex-col lg:justify-between bg-gradient-to-br from-sky-50 to-white border-r border-slate-200">
            <div>
              <div className="mb-8 inline-flex items-center gap-4">
                <NetthexLogo className="h-14 w-14 shrink-0 text-slate-900" />
                <span className="text-sm font-semibold tracking-[0.2em] text-sky-600 uppercase">
                  Netthex
                </span>
              </div>

              <h1 className="max-w-md text-left text-4xl font-extrabold leading-tight text-slate-900">
                Rejoins tes groupes dans une interface claire, moderne et rapide.
              </h1>
              <p className="mt-5 max-w-md text-left text-base leading-7 text-slate-600">
                Connecte-toi pour retrouver tes conversations, tes groupes favoris et ton espace personnel au meme endroit.
              </p>
            </div>

            <div className="grid gap-4 text-left text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                Connexion securisee et acces rapide a ton espace personnel
              </div>
              <div className="rounded-2xl border border-white/10 bg-transparent p-4">
                Acces direct aux groupes, posts et discussions en temps reel
              </div>
            </div>
          </section>

          <section className="bg-transparent p-6 sm:p-8 lg:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-10 lg:hidden">
                <div className="mb-5 flex items-center gap-3">
                  <NetthexLogo className="h-12 w-12 shrink-0 text-slate-900" />
                  <span className="text-sm font-semibold tracking-[0.22em] text-sky-600 uppercase">
                    Netthex
                  </span>
                </div>
              </div>

              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">
                  {isLogin ? 'Bienvenue' : 'Creation de compte'}
                </p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
                  {isLogin ? 'Connexion a votre espace' : 'Cree ton compte Netthex'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {isLogin
                    ? 'Entre tes informations pour acceder a tes groupes et discussions.'
                    : 'Renseigne quelques details pour commencer a explorer la plateforme.'}
                </p>
              </div>

              {error && (
                <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <div className="space-y-2">
                    <label htmlFor="username" className="block text-sm font-medium text-slate-700">
                      Nom d'utilisateur
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Entre ton nom d'utilisateur"
                      autoComplete="username"
                      minLength={3}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                    Adresse e-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    required
                    autoComplete="email"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Mot de passe
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Saisis ton mot de passe"
                    required
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    minLength={6}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <div className="flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  {isLogin ? (
                    <label htmlFor="remember" className="flex items-center gap-3 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        id="remember"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-200 bg-slate-50 accent-sky-500"
                      />
                      <span>Se souvenir de moi</span>
                    </label>
                  ) : (
                    <p className="text-sm text-slate-600">
                      En continuant, tu acceptes les conditions d'utilisation.
                    </p>
                  )}

                  {isLogin && (
                    <a
                      href="#"
                      className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
                    >
                      Mot de passe oublie ?
                    </a>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-sky-500 font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Chargement...' : isLogin ? 'Se connecter' : 'Creer mon compte'}
                </button>
              </form>

              <div className="mt-8 flex items-center gap-3 text-sm text-slate-500">
                <div className="h-px flex-1 bg-slate-200" />
                  <span>{isLogin ? "Pas encore de compte ?" : 'Deja inscrit ?'}</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                  setPassword('')
                }}
                className="mt-5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {isLogin ? 'Creer un compte' : 'Revenir a la connexion'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
