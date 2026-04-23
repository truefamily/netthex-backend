export const buildProfilePath = (userId) => {
  if (!userId) return '/user/profile'

  const params = new URLSearchParams({ id: userId })
  return `/user/profile?${params.toString()}`
}
