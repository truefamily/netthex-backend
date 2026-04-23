import { auth } from './firebaseConfig'

const getApiBaseUrl = () => {
  const configuredBaseUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_SOCKET_URL ||
    'http://localhost:3001'

  if (typeof window === 'undefined') {
    return configuredBaseUrl.replace(/\/$/, '')
  }

  try {
    const parsedUrl = new URL(configuredBaseUrl)
    const currentHostname = window.location.hostname
    const usesLoopbackHost =
      parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1'
    const currentIsRemoteHost =
      currentHostname &&
      currentHostname !== 'localhost' &&
      currentHostname !== '127.0.0.1'

    if (usesLoopbackHost && currentIsRemoteHost) {
      parsedUrl.hostname = currentHostname
    }

    return parsedUrl.toString().replace(/\/$/, '')
  } catch {
    return configuredBaseUrl.replace(/\/$/, '')
  }
}

const buildApiUrl = (path) => `${getApiBaseUrl()}${path}`

const createApiError = (message, status, data = null) => {
  const error = new Error(message)
  error.status = status
  error.data = data
  error.isAuthError = status === 401
  return error
}

const getAuthHeaders = async (forceRefresh = false) => {
  const currentUser = auth.currentUser

  if (!currentUser) {
    throw new Error('Connexion requise pour acceder a cette ressource.')
  }

  const token = await currentUser.getIdToken(forceRefresh)

  return {
    Authorization: `Bearer ${token}`,
  }
}

const performRequest = async (path, options = {}, forceRefreshToken = false) => {
  const { body, headers = {}, ...restOptions } = options
  const authHeaders = await getAuthHeaders(forceRefreshToken)
  const response = await fetch(buildApiUrl(path), {
    ...restOptions,
    headers: {
      ...authHeaders,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const data = await response.json().catch(() => null)

  return { response, data }
}

const apiRequest = async (path, options = {}) => {
  let result = await performRequest(path, options)

  if (result.response.status === 401 && auth.currentUser) {
    result = await performRequest(path, options, true)
  }

  const { response, data } = result

  if (!response.ok) {
    throw createApiError(data?.error || 'Une erreur est survenue avec l API.', response.status, data)
  }

  return data
}

const publicApiRequest = async (path, options = {}) => {
  const { body, headers = {}, ...restOptions } = options
  const response = await fetch(buildApiUrl(path), {
    ...restOptions,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw createApiError(data?.error || 'Une erreur est survenue avec l API.', response.status, data)
  }

  return data
}

export const getGroupMessagesApi = async (groupId) =>
  apiRequest(`/api/messages/groups/${groupId}`)

export const sendGroupMessageApi = async (groupId, payload) =>
  apiRequest(`/api/messages/groups/${groupId}`, {
    method: 'POST',
    body: payload,
  })

export const getDirectConversationsApi = async (userId) =>
  apiRequest(`/api/messages/direct/conversations/${userId}`)

export const getDirectMessagesApi = async (conversationId) =>
  apiRequest(`/api/messages/direct/${conversationId}`)

export const sendDirectMessageApi = async (payload) =>
  apiRequest('/api/messages/direct', {
    method: 'POST',
    body: payload,
  })

export const getPostDiscussionApi = async (groupId, postId) =>
  apiRequest(`/api/groups/${groupId}/posts/${postId}/discussion`)

export const createPostDiscussionApi = async (groupId, postId, payload) =>
  apiRequest(`/api/groups/${groupId}/posts/${postId}/discussion`, {
    method: 'POST',
    body: payload,
  })

export const respondToGroupInvitationApi = async (groupId, payload) =>
  apiRequest(`/api/groups/${groupId}/invitations/respond`, {
    method: 'POST',
    body: payload,
  })

export const getInvitationByCodeApi = async (code) =>
  apiRequest(`/api/invitations/${encodeURIComponent(code)}`)

export const respondToInvitationCodeApi = async (code, payload) =>
  apiRequest(`/api/invitations/${encodeURIComponent(code)}/respond`, {
    method: 'POST',
    body: payload,
  })

export const createUploadSignatureApi = async (payload) =>
  apiRequest('/api/uploads/sign', {
    method: 'POST',
    body: payload,
  })

export const resolveLoginIdentifierApi = async (payload) =>
  publicApiRequest('/api/auth/resolve-login', {
    method: 'POST',
    body: payload,
  })

export const checkUsernameAvailabilityApi = async (payload) =>
  publicApiRequest('/api/auth/check-username', {
    method: 'POST',
    body: payload,
  })
