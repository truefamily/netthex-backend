const PROFILE_PHOTO_SETUP_KEY = 'netthex_profile_photo_pending'

export const isProfilePhotoSetupPending = () => {
  if (typeof window === 'undefined') {
    return false
  }

  return window.sessionStorage.getItem(PROFILE_PHOTO_SETUP_KEY) === 'true'
}

export const markProfilePhotoSetupPending = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(PROFILE_PHOTO_SETUP_KEY, 'true')
}

export const clearProfilePhotoSetupPending = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(PROFILE_PHOTO_SETUP_KEY)
}
