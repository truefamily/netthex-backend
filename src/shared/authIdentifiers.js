export const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

export const normalizeUsername = (username) =>
  String(username || '')
    .trim()
    .replace(/\s+/g, ' ')

export const normalizeUsernameLookup = (username) =>
  normalizeUsername(username).toLowerCase()

export const isEmailLike = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
