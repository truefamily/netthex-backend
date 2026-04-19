// Service pour gérer les uploads vers Cloudinary
export const uploadToCloudinary = async (file, uploadType = 'group') => {
  if (!file) return null

  const uploadPresets = {
    user: import.meta.env.VITE_UPLOAD_USER,
    group: import.meta.env.VITE_UPLOAD_GROUP,
    post: import.meta.env.VITE_UPLOAD_POST,
  }

  const uploadPreset = uploadPresets[uploadType] || uploadPresets.group

  if (!uploadPreset) {
    throw new Error(`Upload preset not configured for type: ${uploadType}`)
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('cloud_name', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME)

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!response.ok) {
      throw new Error('Erreur lors du téléchargement de l\'image')
    }

    const data = await response.json()
    return data.secure_url
  } catch (error) {
    console.error('Erreur Cloudinary:', error)
    throw new Error('Impossible de télécharger l\'image. Vérifie ta configuration Cloudinary.')
  }
}
