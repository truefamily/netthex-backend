import { createHash, randomUUID } from 'crypto'
import { buildUploadFolder, resolveUploadType } from '../config/uploadPolicy.js'

const sanitizeIdentifier = (value) =>
  String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')

const serializeCloudinaryParams = (params) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

export const buildCloudinarySignature = (params, apiSecret) => {
  const serializedParams = serializeCloudinaryParams(params)

  return createHash('sha1')
    .update(`${serializedParams}${apiSecret}`)
    .digest('hex')
}

export const buildCloudinaryPublicId = ({
  uploadType,
  userId,
  suffix = randomUUID(),
}) => {
  const resolvedUploadType = resolveUploadType(uploadType)
  const sanitizedUserId = sanitizeIdentifier(userId)
  const sanitizedSuffix = sanitizeIdentifier(suffix)

  if (!sanitizedUserId) {
    throw new Error('Identifiant utilisateur requis pour generer le public_id Cloudinary.')
  }

  if (!sanitizedSuffix) {
    throw new Error('Suffixe requis pour generer le public_id Cloudinary.')
  }

  return `${resolvedUploadType}-${sanitizedUserId}-${sanitizedSuffix}`
}

export const buildSignedUploadPayload = ({
  uploadType,
  userId,
  apiKey,
  apiSecret,
  timestamp = Math.floor(Date.now() / 1000),
  publicId,
}) => {
  const resolvedUploadType = resolveUploadType(uploadType)
  const effectivePublicId =
    publicId ||
    buildCloudinaryPublicId({
      uploadType: resolvedUploadType,
      userId,
    })
  const folder = buildUploadFolder(resolvedUploadType, userId)
  const signatureParams = {
    folder,
    public_id: effectivePublicId,
    timestamp,
  }

  return {
    uploadType: resolvedUploadType,
    apiKey,
    timestamp,
    folder,
    publicId: effectivePublicId,
    signature: buildCloudinarySignature(signatureParams, apiSecret),
  }
}
