const MEGABYTE = 1024 * 1024

export const DEFAULT_UPLOAD_TYPE = 'group'

export const UPLOAD_POLICIES = Object.freeze({
  user: Object.freeze({
    folder: 'users',
    maxBytes: 5 * MEGABYTE,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    label: 'image utilisateur',
  }),
  group: Object.freeze({
    folder: 'groups',
    maxBytes: 5 * MEGABYTE,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    label: 'image de groupe',
  }),
  post: Object.freeze({
    folder: 'posts',
    maxBytes: 8 * MEGABYTE,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    label: 'image de publication',
  }),
})

const formatMimeTypes = (mimeTypes) =>
  mimeTypes
    .map((mimeType) => mimeType.replace('image/', '').toUpperCase())
    .join(', ')

export const resolveUploadType = (uploadType = DEFAULT_UPLOAD_TYPE) => {
  const normalizedType = String(uploadType || DEFAULT_UPLOAD_TYPE)
    .trim()
    .toLowerCase()

  if (!UPLOAD_POLICIES[normalizedType]) {
    throw new Error(`Type d'upload non supporte: ${uploadType}`)
  }

  return normalizedType
}

export const getUploadPolicy = (uploadType = DEFAULT_UPLOAD_TYPE) =>
  UPLOAD_POLICIES[resolveUploadType(uploadType)]

export const formatMaxBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 Mo'
  }

  const megabytes = bytes / MEGABYTE

  return Number.isInteger(megabytes) ? `${megabytes} Mo` : `${megabytes.toFixed(1)} Mo`
}

export const buildUploadFolder = (uploadType, userId) => {
  const policy = getUploadPolicy(uploadType)
  const sanitizedUserId = String(userId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')

  if (!sanitizedUserId) {
    throw new Error('Identifiant utilisateur requis pour construire le dossier d upload.')
  }

  return `netthex/${policy.folder}/${sanitizedUserId}`
}

export const validateImageUploadFile = (file, uploadType = DEFAULT_UPLOAD_TYPE) => {
  const policy = getUploadPolicy(uploadType)

  if (!file) {
    throw new Error('Aucun fichier fourni.')
  }

  if (!policy.allowedMimeTypes.includes(file.type)) {
    throw new Error(
      `Format invalide pour ${policy.label}. Formats acceptes: ${formatMimeTypes(policy.allowedMimeTypes)}.`,
    )
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new Error('Fichier invalide.')
  }

  if (file.size > policy.maxBytes) {
    throw new Error(
      `Le fichier depasse la taille maximale autorisee (${formatMaxBytes(policy.maxBytes)}).`,
    )
  }

  return policy
}
