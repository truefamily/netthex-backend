import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { updateUserAvatar } from '../../services/authService'
import { uploadToCloudinary } from '../../services/cloudinaryService'
import {
  clearProfilePhotoSetupPending,
  isProfilePhotoSetupPending,
} from '../../utils/profilePhotoSetup'

const MAX_FILE_SIZE = 5 * 1024 * 1024

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Impossible de lire ce fichier.'))
    reader.readAsDataURL(file)
  })

function CameraIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4.5 8.25h2.379a1.5 1.5 0 0 0 1.155-.542l1.182-1.416A1.5 1.5 0 0 1 10.37 5.75h3.26a1.5 1.5 0 0 1 1.154.542l1.182 1.416a1.5 1.5 0 0 0 1.155.542H19.5A1.5 1.5 0 0 1 21 9.75v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.25v-7.5a1.5 1.5 0 0 1 1.5-1.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.75 13.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ProfilePhotoSetup() {
  const { currentUser, userData, refreshUserData } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [preview, setPreview] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isPendingSetup = isProfilePhotoSetupPending()
  const defaultPreview = userData?.avatar || currentUser?.photoURL || ''
  const activePreview = preview || defaultPreview
  const redirectPath = (() => {
    const from = location.state?.from
    if (!from?.pathname || from.pathname === '/user/profile/photo' || from.pathname === '/auth') {
      return ''
    }

    return `${from.pathname}${from.search || ''}${from.hash || ''}`
  })()

  const handleFileChange = async (file) => {
    if (!file) {
      return
    }

    setError('')

    if (!file.type.startsWith('image/')) {
      setError('Choisis une image valide.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('La photo ne doit pas depasser 5 Mo.')
      return
    }

    try {
      const nextPreview = await readFileAsDataUrl(file)
      setPreview(nextPreview)
      setSelectedFile(file)
      setFileName(file.name)
    } catch (readError) {
      setError(readError.message || 'Impossible de charger cette image.')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!activePreview) {
      setError('Ajoute une photo de profil pour continuer.')
      return
    }

    setSaving(true)
    setError('')

    try {
      let avatarUrl = activePreview
      
      // Si un nouveau fichier a été sélectionné, l'uploader vers Cloudinary
      if (selectedFile) {
        avatarUrl = await uploadToCloudinary(selectedFile, 'user')
      }
      
      await updateUserAvatar(avatarUrl)
      await refreshUserData(currentUser?.uid)
      clearProfilePhotoSetupPending()
      navigate(isPendingSetup ? redirectPath || '/' : '/user/profile', { replace: true })
    } catch (saveError) {
      setError(saveError.message || "Impossible d'enregistrer la photo.")
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = () => {
    clearProfilePhotoSetupPending()
    navigate(redirectPath || '/', { replace: true })
  }

  const username = userData?.username || currentUser?.displayName || 'Membre Netthex'
  const initial = username.charAt(0).toUpperCase() || 'N'

  return (
    <div className="min-h-screen bg-[#eef3fb] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="flex flex-col justify-between border-b border-slate-200 p-8 lg:border-b-0 lg:border-r lg:p-10 bg-gradient-to-br from-sky-50 to-white">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">
                {isPendingSetup ? 'Etape suivante' : 'Photo de profil'}
              </p>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Ajoute une photo pour personnaliser ton compte.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
                Ton avatar sera visible dans ton profil, tes conversations et les espaces ou tu participes.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              {[
                'Ton compte reste identifiable dans les discussions.',
                'La photo est sauvegardee juste apres l inscription.',
                'Tu pourras la remplacer plus tard si besoin.',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="p-8 lg:p-10">
            <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6">
              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <div className="flex flex-col items-center rounded-[28px] border border-slate-200 bg-slate-50 px-6 py-8 text-center">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-[30px] border border-slate-200 bg-sky-50 text-4xl font-bold text-slate-900 shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
                  {activePreview ? (
                    <img src={activePreview} alt={username} className="h-full w-full object-cover" />
                  ) : (
                    <span>{initial}</span>
                  )}
                </div>

                <h2 className="mt-5 text-2xl font-bold text-slate-900">{username}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {fileName ? `Fichier selectionne : ${fileName}` : 'Choisis une image pour voir l apercu ici.'}
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="profile-photo"
                  className="block text-sm font-medium text-slate-700"
                >
                  Importer une photo
                </label>
                <label
                  htmlFor="profile-photo"
                  className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 transition hover:border-sky-300 hover:bg-sky-50"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                      <CameraIcon />
                    </span>
                    <span>Selectionner une image depuis ton appareil</span>
                  </span>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                    JPG, PNG
                  </span>
                </label>
                <input
                  id="profile-photo"
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleFileChange(event.target.files?.[0])}
                  className="sr-only"
                />
                <p className="text-xs text-slate-500">Format image uniquement, taille maximale 5 Mo.</p>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                {isPendingSetup && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Plus tard
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer la photo'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
