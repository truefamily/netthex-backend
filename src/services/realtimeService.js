import { database } from './firebaseConfig'
import { ref, child, get, push, set, update, remove, onValue, off } from 'firebase/database'

const toRealtimeMessage = (error) => {
  if (error?.code === 'PERMISSION_DENIED' || error?.message?.includes('Permission denied')) {
    return "Acces refuse par Firebase. Verifie les regles de la base de donnees."
  }

  if (error?.message?.includes('contains undefined')) {
    return 'Des donnees invalides ont ete envoyees a Firebase.'
  }

  if (error?.message) {
    return error.message
  }

  return 'Une erreur est survenue lors de la communication avec la base de donnees.'
}

const removeUndefinedValues = (value) => {
  if (Array.isArray(value)) {
    return value.map(removeUndefinedValues)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, removeUndefinedValues(entryValue)]),
    )
  }

  return value
}

const sanitizeProfile = (profile, fallbackUid = '') => ({
  uid: profile?.uid || fallbackUid,
  username: profile?.username || profile?.displayName || 'Utilisateur',
  email: profile?.email || '',
  avatar: profile?.avatar || '',
})

export const buildDirectConversationId = (firstUserId, secondUserId) =>
  [firstUserId, secondUserId].sort().join('__')

// Générer un slug à partir du nom
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Enlever caractères spéciaux
    .replace(/\s+/g, '-') // Remplacer espaces par tirets
    .replace(/-+/g, '-') // Remplacer tirets multiples par un seul
    .slice(0, 50) // Limiter à 50 caractères
}

// Générer un slug unique
export const generateUniqueSlug = async (baseName, existingSlugs = {}) => {
  let slug = generateSlug(baseName)
  let counter = 1

  // Si le slug existe déjà, ajouter un numéro
  while (existingSlugs[slug]) {
    slug = `${generateSlug(baseName)}-${counter}`
    counter++
  }

  return slug
}

// Calculer le nombre de membres d'un groupe
export const calculateMemberCount = (group) => {
  return Object.keys(group?.members || {}).length
}

// Obtenir tous les groupes
export const getGroups = async () => {
  try {
    const dbRef = ref(database)
    const snapshot = await get(child(dbRef, 'groups'))
    if (snapshot.exists()) {
      return snapshot.val()
    }
    return {}
  } catch (error) {
    throw new Error(toRealtimeMessage(error))
  }
}

export const listenToGroups = (callback, onError) => {
  const groupsRef = ref(database, 'groups')
  onValue(groupsRef, callback, onError)
  return () => off(groupsRef)
}

// Chercher un groupe par slug
export const getGroupBySlug = async (slug) => {
  try {
    const allGroups = await getGroups()
    for (const [id, group] of Object.entries(allGroups || {})) {
      if (group.slug === slug) {
        return { id, ...group }
      }
    }
    return null
  } catch (error) {
    throw new Error(toRealtimeMessage(error))
  }
}

// Créer un nouveau groupe
export const createGroup = async (groupData) => {
  try {
    const normalizedName = groupData.name.trim()
    const normalizedDescription = groupData.description.trim()
    
    // Récupérer les slugs existants
    const allGroups = await getGroups()
    const existingSlugs = Object.values(allGroups || {}).reduce((acc, group) => {
      if (group.slug) acc[group.slug] = true
      return acc
    }, {})
    
    // Générer un slug unique
    const slug = await generateUniqueSlug(normalizedName, existingSlugs)
    
    const newGroupRef = push(ref(database, 'groups'))
    await set(newGroupRef, {
      ...groupData,
      name: normalizedName,
      description: normalizedDescription,
      slug,
      createdAt: new Date().toISOString(),
      members: { [groupData.adminId]: true },
      posts: {},
      discussion: {},
      messages: {},
    })
    return slug
  } catch (error) {
    throw new Error(toRealtimeMessage(error))
  }
}

export const updateGroup = async (groupId, updates) => {
  try {
    const groupRef = ref(database, `groups/${groupId}`)
    const snapshot = await get(groupRef)
    const currentGroup = snapshot.val() || {}
    const sanitizedUpdates = {
      ...updates,
      name: updates.name?.trim() ?? currentGroup.name,
      description: updates.description?.trim() ?? currentGroup.description,
      updatedAt: new Date().toISOString(),
    }

    const nextGroup = {
      ...currentGroup,
      ...sanitizedUpdates,
    }

    await set(groupRef, nextGroup)
    return nextGroup
  } catch (error) {
    throw new Error(toRealtimeMessage(error))
  }
}

// Rejoindre un groupe
export const joinGroup = async (groupId, userId) => {
  try {
    await set(ref(database, `groups/${groupId}/members/${userId}`), true)
  } catch (error) {
    throw new Error(toRealtimeMessage(error))
  }
}

export const listenToGroupInvitations = (groupId, callback) => {
  const invitationsRef = ref(database, `groups/${groupId}/pendingInvitations`)
  onValue(invitationsRef, callback)
  return () => off(invitationsRef)
}

export const saveGroupInvitations = async (groupId, invitations) => {
  try {
    await update(
      ref(database, `groups/${groupId}/pendingInvitations`),
      removeUndefinedValues(invitations),
    )
  } catch (error) {
    throw new Error(toRealtimeMessage(error))
  }
}

export const saveGroupInviteAccess = async (groupId, inviteAccess) => {
  try {
    await update(
      ref(database, `groups/${groupId}`),
      removeUndefinedValues({
        inviteAccess,
        updatedAt: new Date().toISOString(),
      }),
    )
  } catch (error) {
    throw new Error(toRealtimeMessage(error))
  }
}

// Écouter les messages en temps réel
export const listenToGroupMessages = (groupId, callback) => {
  const messagesRef = ref(database, `groups/${groupId}/messages`)
  onValue(messagesRef, callback)
  return () => off(messagesRef)
}

// Envoyer un message
export const sendGroupMessage = async (groupId, message) => {
  try {
    const newMessageRef = push(ref(database, `groups/${groupId}/messages`))
    await set(newMessageRef, removeUndefinedValues({
      ...message,
      timestamp: new Date().toISOString(),
    }))
    return newMessageRef.key
  } catch (error) {
    throw new Error(toRealtimeMessage(error))
  }
}

export const sendMessage = sendGroupMessage

export const listenToUsers = (callback) => {
  const usersRef = ref(database, 'users')
  onValue(usersRef, callback)
  return () => off(usersRef)
}

export const createOrGetDirectConversation = async (
  currentUserProfile,
  otherUserProfile,
) => {
  try {
    const currentProfile = sanitizeProfile(currentUserProfile, currentUserProfile?.uid)
    const otherProfile = sanitizeProfile(otherUserProfile, otherUserProfile?.uid)
    const conversationId = buildDirectConversationId(currentProfile.uid, otherProfile.uid)
    const conversationRef = ref(database, `directConversations/${conversationId}`)
    const snapshot = await get(conversationRef)
    const now = new Date().toISOString()

    const baseConversation = {
      id: conversationId,
      createdAt: snapshot.val()?.createdAt || now,
      updatedAt: now,
      lastMessageAt: snapshot.val()?.lastMessageAt || null,
      lastMessagePreview: snapshot.val()?.lastMessagePreview || '',
      lastMessageAuthorId: snapshot.val()?.lastMessageAuthorId || '',
      participants: {
        [currentProfile.uid]: true,
        [otherProfile.uid]: true,
      },
      participantProfiles: {
        [currentProfile.uid]: currentProfile,
        [otherProfile.uid]: otherProfile,
      },
    }

    await set(conversationRef, {
      ...(snapshot.val() || {}),
      ...baseConversation,
      participantProfiles: {
        ...(snapshot.val()?.participantProfiles || {}),
        [currentProfile.uid]: currentProfile,
        [otherProfile.uid]: otherProfile,
      },
    })

    return conversationId
  } catch (error) {
    throw new Error(toRealtimeMessage(error))
  }
}

export const listenToDirectConversations = (userId, callback) => {
  const conversationsRef = ref(database, 'directConversations')
  onValue(conversationsRef, (snapshot) => {
    const data = snapshot.val() || {}
    const filtered = Object.entries(data).reduce((accumulator, [conversationId, conversation]) => {
      if (conversation?.participants?.[userId]) {
        accumulator[conversationId] = conversation
      }
      return accumulator
    }, {})

    callback(filtered)
  })
  return () => off(conversationsRef)
}

export const listenToDirectMessages = (conversationId, callback) => {
  const messagesRef = ref(database, `directMessages/${conversationId}`)
  onValue(messagesRef, callback)
  return () => off(messagesRef)
}

export const sendDirectMessage = async ({
  conversationId,
  senderProfile,
  recipientProfile,
  content,
}) => {
  try {
    const trimmedContent = content.trim()
    const currentProfile = sanitizeProfile(senderProfile, senderProfile?.uid)
    const otherProfile = sanitizeProfile(recipientProfile, recipientProfile?.uid)
    const directConversationId =
      conversationId || buildDirectConversationId(currentProfile.uid, otherProfile.uid)
    const timestamp = new Date().toISOString()

    await createOrGetDirectConversation(currentProfile, otherProfile)

    const newMessageRef = push(ref(database, `directMessages/${directConversationId}`))
    await set(newMessageRef, removeUndefinedValues({
      authorId: currentProfile.uid,
      authorName: currentProfile.username,
      content: trimmedContent,
      timestamp,
    }))

    await update(ref(database, `directConversations/${directConversationId}`), {
      updatedAt: timestamp,
      lastMessageAt: timestamp,
      lastMessagePreview: trimmedContent,
      lastMessageAuthorId: currentProfile.uid,
    })

    return {
      conversationId: directConversationId,
      messageId: newMessageRef.key,
    }
  } catch (error) {
    throw new Error(toRealtimeMessage(error))
  }
}

// Créer un post
export const createPost = async (groupId, postData) => {
  try {
    const newPostRef = push(ref(database, `groups/${groupId}/posts`))
    await set(newPostRef, removeUndefinedValues({
      ...postData,
      createdAt: new Date().toISOString(),
    }))
    return newPostRef.key
  } catch (error) {
    throw new Error(toRealtimeMessage(error))
  }
}

export const deletePost = async (groupId, postId) => {
  try {
    await remove(ref(database, `groups/${groupId}/posts/${postId}`))
    await remove(ref(database, `groups/${groupId}/discussion/${postId}`))
  } catch (error) {
    throw new Error(toRealtimeMessage(error))
  }
}

export const likePost = async (groupId, postId, userId) => {
  try {
    const likeRef = ref(database, `groups/${groupId}/posts/${postId}/likes/${userId}`)
    await set(likeRef, true)
  } catch (error) {
    throw new Error(toRealtimeMessage(error))
  }
}

export const unlikePost = async (groupId, postId, userId) => {
  try {
    const likeRef = ref(database, `groups/${groupId}/posts/${postId}/likes/${userId}`)
    await remove(likeRef)
  } catch (error) {
    throw new Error(toRealtimeMessage(error))
  }
}

export const getPostLikes = async (groupId, postId) => {
  try {
    const likesRef = ref(database, `groups/${groupId}/posts/${postId}/likes`)
    const snapshot = await get(likesRef)
    if (snapshot.exists()) {
      return Object.keys(snapshot.val())
    }
    return []
  } catch (error) {
    throw new Error(toRealtimeMessage(error))
  }
}

export const listenToPostDiscussion = (groupId, postId, callback) => {
  const discussionRef = ref(database, `groups/${groupId}/discussion/${postId}`)
  onValue(discussionRef, callback)
  return () => off(discussionRef)
}

export const createPostDiscussion = async (groupId, postId, discussionData) => {
  try {
    const newDiscussionRef = push(ref(database, `groups/${groupId}/discussion/${postId}`))
    await set(newDiscussionRef, removeUndefinedValues({
      ...discussionData,
      createdAt: new Date().toISOString(),
    }))
    return newDiscussionRef.key
  } catch (error) {
    throw new Error(toRealtimeMessage(error))
  }
}
