import { auth } from './firebaseConfig'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SOCKET_URL ||
  'http://localhost:3001'
).replace(/\/$/, '')

const buildApiUrl = (path) => `${API_BASE_URL}${path}`

const getAuthHeaders = async () => {
  const currentUser = auth.currentUser

  if (!currentUser) {
    throw new Error('Connexion requise pour acceder a cette ressource.')
  }

  const token = await currentUser.getIdToken()

  return {
    Authorization: `Bearer ${token}`,
  }
}

const apiRequest = async (path, options = {}) => {
  const { body, headers = {}, ...restOptions } = options
  const authHeaders = await getAuthHeaders()
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

  if (!response.ok) {
    throw new Error(data?.error || 'Une erreur est survenue avec l API.')
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
