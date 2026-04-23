import { getRequiredClientEnv } from '../config/clientEnv'
import { validateImageUploadFile } from '../config/uploadPolicy'
import { createUploadSignatureApi } from './apiService'

export const uploadToCloudinary = async (file, uploadType = 'group') => {
  if (!file) {
    return null
  }

  validateImageUploadFile(file, uploadType)
  const signedUpload = await createUploadSignatureApi({ uploadType })
  const cloudName =
    signedUpload.cloudName || getRequiredClientEnv('VITE_CLOUDINARY_CLOUD_NAME')
  const apiKey =
    signedUpload.apiKey || getRequiredClientEnv('VITE_CLOUDINARY_API_KEY')

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', apiKey)
  formData.append('timestamp', String(signedUpload.timestamp))
  formData.append('folder', signedUpload.folder)
  formData.append('public_id', signedUpload.publicId)
  formData.append('signature', signedUpload.signature)

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error?.message || "Erreur lors de l'upload de l'image.")
    }

    const data = await response.json()
    return data.secure_url
  } catch (error) {
    console.error('Erreur Cloudinary:', error)
    throw new Error(
      error instanceof Error && error.message
        ? error.message
        : "Impossible de televerser l'image. Verifie la configuration Cloudinary.",
    )
  }
}
