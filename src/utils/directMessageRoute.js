const DIRECT_MESSAGE_PATH = '/direct/t/message'
const TOKEN_LENGTH = 250
const TOKEN_HEADER_LENGTH = 4
const RANDOM_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

const encodeBase64 = (value) => {
  if (typeof btoa === 'function') {
    return btoa(value)
  }

  return globalThis.Buffer.from(value, 'utf8').toString('base64')
}

const decodeBase64 = (value) => {
  if (typeof atob === 'function') {
    return atob(value)
  }

  return globalThis.Buffer.from(value, 'base64').toString('utf8')
}

const toBase64Url = (value) =>
  encodeBase64(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')

const fromBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = `${normalized}${'='.repeat((4 - (normalized.length % 4 || 4)) % 4)}`
  return decodeBase64(padded)
}

const getChecksum = (value) =>
  Array.from(value || '').reduce((total, character) => total + character.charCodeAt(0), 0) % 9973

const getRandomString = (length) =>
  Array.from({ length }, () => RANDOM_ALPHABET[Math.floor(Math.random() * RANDOM_ALPHABET.length)]).join('')

export const encodeDirectMessageUserId = (userId) => {
  if (!userId) return ''

  const payload = JSON.stringify({
    u: userId,
    c: getChecksum(userId),
    v: 'netthex-direct-v1',
  })
  const encodedPayload = toBase64Url(payload)

  if (encodedPayload.length + TOKEN_HEADER_LENGTH > TOKEN_LENGTH) {
    throw new Error('Impossible de generer un identifiant de message valide.')
  }

  const filler = getRandomString(TOKEN_LENGTH - TOKEN_HEADER_LENGTH - encodedPayload.length)
  return `${String(encodedPayload.length).padStart(TOKEN_HEADER_LENGTH, '0')}${encodedPayload}${filler}`
}

export const decodeDirectMessageUserId = (token) => {
  if (!token || token.length < TOKEN_HEADER_LENGTH) return ''

  const payloadLength = Number.parseInt(token.slice(0, TOKEN_HEADER_LENGTH), 10)
  if (!Number.isFinite(payloadLength) || payloadLength <= 0) return ''

  try {
    const encodedPayload = token.slice(TOKEN_HEADER_LENGTH, TOKEN_HEADER_LENGTH + payloadLength)
    const parsed = JSON.parse(fromBase64Url(encodedPayload))

    if (parsed?.v !== 'netthex-direct-v1' || parsed?.c !== getChecksum(parsed?.u || '')) {
      return ''
    }

    return parsed?.u || ''
  } catch {
    return ''
  }
}

export const buildDirectMessagePath = (userId) => {
  if (!userId) return DIRECT_MESSAGE_PATH

  const params = new URLSearchParams({
    id: encodeDirectMessageUserId(userId),
  })

  return `${DIRECT_MESSAGE_PATH}?${params.toString()}`
}

export const directMessagePath = DIRECT_MESSAGE_PATH
