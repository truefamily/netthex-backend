import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import admin from 'firebase-admin'

dotenv.config()

const allowedOrigins = new Set(
  [
    ...(process.env.CLIENT_URL || '')
      .split(',')
      .map((origin) => origin.trim()),
    'http://localhost:5173',
    'http://localhost:5174',
  ].filter(Boolean),
)

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true)
      return
    }

    callback(new Error('Origin non autorisee par CORS.'))
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true,
}

// Initialiser Express et Socket.io
const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: corsOptions,
})

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

// Initialiser Firebase Admin
if (!admin.apps.length) {
  try {
    // Essayer d'utiliser GOOGLE_APPLICATION_CREDENTIALS en premier
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    })
    console.log('✓ Firebase Admin initialisé avec service account')
  } catch (error) {
    console.error('⚠ Impossible d\'initialiser Firebase Admin:', error.message)
    console.error('Assurez-vous que GOOGLE_APPLICATION_CREDENTIALS est configuré')
    process.exit(1)
  }
}

const db = admin.database()

// Structure pour tracker les utilisateurs par groupe
const groupUsers = {} // { groupId: { userId: { socket.id, userName } } }
const typingUsers = {} // { groupId: { userId: { userName, timeout } } }

const buildDirectConversationId = (firstUserId, secondUserId) =>
  [firstUserId, secondUserId].sort().join('__')

const sanitizeInput = (input, maxLength = 500) => {
  if (typeof input !== 'string') return ''
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>"']/g, '') // Supprimer caractères potentiellement dangereux
}

const validateInput = (value, fieldName, maxLength = 500) => {
  if (!value || typeof value !== 'string') {
    throw new Error(`${fieldName} est requis et doit être une chaîne.`)
  }
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} ne peut pas être vide.`)
  }
  if (value.length > maxLength) {
    throw new Error(`${fieldName} dépasse la longueur maximale (${maxLength} caractères).`)
  }
}

const sanitizeProfile = (profile = {}, fallbackUid = '') => ({
  uid: profile.uid || fallbackUid,
  username: profile.username || profile.displayName || 'Utilisateur',
  email: profile.email || '',
  avatar: profile.avatar || '',
})

const mapMessages = (data) =>
  Object.entries(data || {})
    .map(([id, message]) => ({
      id,
      ...message,
    }))
    .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0))

const sendApiError = (res, status, message, details = undefined) =>
  res.status(status).json({
    error: message,
    ...(details ? { details } : {}),
  })

const getGroupSnapshot = (groupId) => db.ref(`groups/${groupId}`).once('value')
const getDirectConversationSnapshot = (conversationId) =>
  db.ref(`directConversations/${conversationId}`).once('value')
const getPostSnapshot = (groupId, postId) =>
  db.ref(`groups/${groupId}/posts/${postId}`).once('value')

const getBearerToken = (req) => {
  const authorization = req.headers.authorization || ''

  if (!authorization.startsWith('Bearer ')) {
    return ''
  }

  return authorization.slice('Bearer '.length).trim()
}

const authenticateRequest = async (req, res) => {
  const token = getBearerToken(req)

  if (!token) {
    sendApiError(res, 401, 'Token Firebase requis.')
    return null
  }

  try {
    return await admin.auth().verifyIdToken(token)
  } catch (error) {
    console.error('Erreur verification token Firebase:', error)
    sendApiError(res, 401, 'Token Firebase invalide ou expire.')
    return null
  }
}

const authorizeUserAccess = async (
  req,
  res,
  expectedUserId,
  message = 'Acces refuse a cette ressource.',
) => {
  const decodedToken = await authenticateRequest(req, res)

  if (!decodedToken) {
    return null
  }

  if (expectedUserId && decodedToken.uid !== expectedUserId) {
    sendApiError(res, 403, message)
    return null
  }

  return decodedToken
}

const isGroupMember = (group, userId) =>
  Boolean(group?.adminId === userId || group?.members?.[userId])

const isExpiredTimestamp = (value) => {
  if (!value) return false

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false

  return date.getTime() <= Date.now()
}

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token

  if (!token) {
    next(new Error('Token Firebase requis.'))
    return
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token)
    socket.data.userId = decodedToken.uid
    socket.data.userName = decodedToken.name || 'Utilisateur'
    next()
  } catch (error) {
    console.error('Erreur verification token Socket.io:', error)
    next(new Error('Token Firebase invalide ou expire.'))
  }
})



const cleanupExpiredInvitationArtifacts = async (groupId, group) => {
  const updates = {}
  let hasUpdates = false

  Object.entries(group?.pendingInvitations || {}).forEach(([userId, invitation]) => {
    if (isExpiredTimestamp(invitation?.expiresAt)) {
      updates[`groups/${groupId}/pendingInvitations/${userId}`] = null
      hasUpdates = true
    }
  })

  if (isExpiredTimestamp(group?.inviteAccess?.expiresAt)) {
    updates[`groups/${groupId}/inviteAccess`] = null
    hasUpdates = true
  }

  if (hasUpdates) {
    await db.ref().update(updates)
  }
}

const findGroupByInvitationCode = async (code) => {
  const snapshot = await db.ref('groups').once('value')
  const groups = snapshot.val() || {}

  for (const [groupId, group] of Object.entries(groups)) {
    if (isExpiredTimestamp(group?.inviteAccess?.expiresAt)) {
      await cleanupExpiredInvitationArtifacts(groupId, group)
      if (group?.inviteAccess?.code === code) {
        return {
          groupId,
          group,
          inviteAccess: {
            ...group.inviteAccess,
            expired: true,
          },
        }
      }
    }

    if (group?.inviteAccess?.code === code) {
      return { groupId, group, inviteAccess: group.inviteAccess }
    }

    const pendingEntry = Object.entries(group?.pendingInvitations || {}).find(
      ([, invitation]) => invitation?.code === code,
    )

    if (pendingEntry) {
      if (isExpiredTimestamp(pendingEntry[1]?.expiresAt)) {
        await cleanupExpiredInvitationArtifacts(groupId, group)
        return {
          groupId,
          group,
          matchedInvitation: pendingEntry[1] || null,
          inviteAccess: {
            code,
            expiresAt: pendingEntry[1]?.expiresAt || null,
            link: pendingEntry[1]?.link || '',
            message: pendingEntry[1]?.message || '',
            expired: true,
          },
        }
      }

      return {
        groupId,
        group,
        matchedInvitation: pendingEntry[1] || null,
        inviteAccess: {
          code,
          expiresAt: pendingEntry[1]?.expiresAt || null,
          link: pendingEntry[1]?.link || '',
          message: pendingEntry[1]?.message || '',
        },
      }
    }
  }

  return null
}

app.get('/api/messages/groups/:groupId', async (req, res) => {
  const { groupId } = req.params

  if (!groupId) {
    return sendApiError(res, 400, 'groupId requis.')
  }

  const decodedToken = await authenticateRequest(req, res)
  if (!decodedToken) return

  try {
    const groupSnapshot = await getGroupSnapshot(groupId)

    if (!groupSnapshot.exists()) {
      return sendApiError(res, 404, 'Groupe introuvable.')
    }

    const group = groupSnapshot.val() || {}

    if (!isGroupMember(group, decodedToken.uid)) {
      return sendApiError(res, 403, 'Acces refuse a ce groupe.')
    }

    return res.json({
      groupId,
      groupName: group.name || 'Groupe',
      messages: mapMessages(group.messages),
    })
  } catch (error) {
    console.error('Erreur GET /api/messages/groups/:groupId', error)
    return sendApiError(res, 500, 'Impossible de recuperer les messages du groupe.')
  }
})

app.post('/api/messages/groups/:groupId', async (req, res) => {
  const { groupId } = req.params
  const { authorId, authorName, content } = req.body || {}

  try {
    // Validation des entrées
    if (!groupId) {
      return sendApiError(res, 400, 'groupId requis.')
    }

    if (!authorId) {
      return sendApiError(res, 400, 'authorId est requis.')
    }

    validateInput(content, 'Contenu du message', 1000)
    const sanitizedContent = sanitizeInput(content, 1000)

    const decodedToken = await authenticateRequest(req, res)
    if (!decodedToken) return

    if (authorId !== decodedToken.uid) {
      return sendApiError(res, 403, 'authorId ne correspond pas a l utilisateur authentifie.')
    }

    const groupSnapshot = await getGroupSnapshot(groupId)

    if (!groupSnapshot.exists()) {
      return sendApiError(res, 404, 'Groupe introuvable.')
    }

    const group = groupSnapshot.val() || {}

    if (!isGroupMember(group, decodedToken.uid)) {
      return sendApiError(res, 403, 'Seuls les membres peuvent ecrire dans ce groupe.')
    }

    const timestamp = new Date().toISOString()
    const newMessageRef = db.ref(`groups/${groupId}/messages`).push()
    const message = {
      authorId: decodedToken.uid,
      authorName: sanitizeInput(authorName || decodedToken.name || 'Utilisateur', 100),
      content: sanitizedContent,
      timestamp,
    }

    await newMessageRef.set(message)

    const messagesCount = Object.keys(group.messages || {}).length + 1

    io.to(groupId).emit('message:new', {
      id: newMessageRef.key,
      groupId,
      ...message,
    })

    io.to(groupId).emit('group:messages-count', {
      groupId,
      count: messagesCount,
    })

    return res.status(201).json({
      id: newMessageRef.key,
      groupId,
      ...message,
    })
  } catch (error) {
    console.error('Erreur POST /api/messages/groups/:groupId', error)
    return sendApiError(res, 500, 'Impossible d envoyer le message de groupe.')
  }
})

app.get('/api/messages/direct/conversations/:userId', async (req, res) => {
  const { userId } = req.params

  if (!userId) {
    return sendApiError(res, 400, 'userId requis.')
  }

  const decodedToken = await authenticateRequest(req, res)
  if (!decodedToken) return

  if (userId !== decodedToken.uid) {
    return sendApiError(res, 403, 'Acces refuse a ces conversations privees.')
  }

  try {
    const snapshot = await db.ref('directConversations').once('value')
    const conversations = Object.entries(snapshot.val() || {})
      .filter(([, conversation]) => conversation?.participants?.[userId])
      .map(([id, conversation]) => ({
        id,
        ...conversation,
      }))
      .sort((a, b) => new Date(b.lastMessageAt || b.updatedAt || 0) - new Date(a.lastMessageAt || a.updatedAt || 0))

    return res.json({
      userId,
      conversations,
    })
  } catch (error) {
    console.error('Erreur GET /api/messages/direct/conversations/:userId', error)
    return sendApiError(res, 500, 'Impossible de recuperer les conversations privees.')
  }
})

app.get('/api/messages/direct/:conversationId', async (req, res) => {
  const { conversationId } = req.params

  if (!conversationId) {
    return sendApiError(res, 400, 'conversationId requis.')
  }

  const decodedToken = await authenticateRequest(req, res)
  if (!decodedToken) return

  try {
    const [conversationSnapshot, messagesSnapshot] = await Promise.all([
      getDirectConversationSnapshot(conversationId),
      db.ref(`directMessages/${conversationId}`).once('value'),
    ])

    if (!conversationSnapshot.exists()) {
      return sendApiError(res, 404, 'Conversation privee introuvable.')
    }

    const conversation = conversationSnapshot.val() || {}

    if (!conversation.participants?.[decodedToken.uid]) {
      return sendApiError(res, 403, 'Acces refuse a cette conversation privee.')
    }

    return res.json({
      conversation: {
        id: conversationId,
        ...conversation,
      },
      messages: mapMessages(messagesSnapshot.val()),
    })
  } catch (error) {
    console.error('Erreur GET /api/messages/direct/:conversationId', error)
    return sendApiError(res, 500, 'Impossible de recuperer les messages prives.')
  }
})

app.post('/api/messages/direct', async (req, res) => {
  const {
    conversationId,
    senderId,
    senderProfile,
    recipientId,
    recipientProfile,
    content,
  } = req.body || {}

  try {
    // Validation des entrées
    if (!senderId || !recipientId) {
      return sendApiError(res, 400, 'senderId et recipientId sont requis.')
    }

    validateInput(content, 'Contenu du message', 1000)
    const sanitizedContent = sanitizeInput(content, 1000)

    if (senderId === recipientId) {
      return sendApiError(res, 400, 'Une conversation privee requiert deux utilisateurs differents.')
    }

    const decodedToken = await authenticateRequest(req, res)
    if (!decodedToken) return

    if (senderId !== decodedToken.uid) {
      return sendApiError(res, 403, 'senderId ne correspond pas a l utilisateur authentifie.')
    }

    const directConversationId =
      conversationId || buildDirectConversationId(senderId, recipientId)
    const timestamp = new Date().toISOString()
    const currentSenderProfile = sanitizeProfile(senderProfile, senderId)
    const currentRecipientProfile = sanitizeProfile(recipientProfile, recipientId)
    const conversationRef = db.ref(`directConversations/${directConversationId}`)
    const existingConversationSnapshot = await conversationRef.once('value')
    const existingConversation = existingConversationSnapshot.val() || {}

    await conversationRef.set({
      ...existingConversation,
      id: directConversationId,
      createdAt: existingConversation.createdAt || timestamp,
      updatedAt: timestamp,
      lastMessageAt: timestamp,
      lastMessagePreview: sanitizedContent.substring(0, 100),
      lastMessageAuthorId: senderId,
      totalMessages: Number(existingConversation.totalMessages || 0) + 1,
      participants: {
        ...(existingConversation.participants || {}),
        [senderId]: true,
        [recipientId]: true,
      },
      participantProfiles: {
        ...(existingConversation.participantProfiles || {}),
        [senderId]: currentSenderProfile,
        [recipientId]: currentRecipientProfile,
      },
    })

    const newMessageRef = db.ref(`directMessages/${directConversationId}`).push()
    const message = {
      authorId: decodedToken.uid,
      authorName: sanitizeInput(currentSenderProfile.username || decodedToken.name || 'Utilisateur', 100),
      content: sanitizedContent,
      timestamp,
    }

    await newMessageRef.set(message)

    return res.status(201).json({
      conversationId: directConversationId,
      message: {
        id: newMessageRef.key,
        ...message,
      },
    })
  } catch (error) {
    console.error('Erreur POST /api/messages/direct', error)
    return sendApiError(res, 500, 'Impossible d envoyer le message prive.')
  }
})

app.get('/api/groups/:groupId/posts/:postId/discussion', async (req, res) => {
  const { groupId, postId } = req.params

  if (!groupId || !postId) {
    return sendApiError(res, 400, 'groupId et postId sont requis.')
  }

  const decodedToken = await authenticateRequest(req, res)
  if (!decodedToken) return

  try {
    const [groupSnapshot, postSnapshot, discussionSnapshot] = await Promise.all([
      getGroupSnapshot(groupId),
      getPostSnapshot(groupId, postId),
      db.ref(`groups/${groupId}/discussion/${postId}`).once('value'),
    ])

    if (!groupSnapshot.exists()) {
      return sendApiError(res, 404, 'Groupe introuvable.')
    }

    const group = groupSnapshot.val() || {}

    if (!isGroupMember(group, decodedToken.uid)) {
      return sendApiError(res, 403, 'Seuls les membres peuvent lire cette discussion.')
    }

    if (!postSnapshot.exists()) {
      return sendApiError(res, 404, 'Post introuvable.')
    }

    return res.json({
      groupId,
      postId,
      post: {
        id: postId,
        ...postSnapshot.val(),
      },
      discussion: mapMessages(discussionSnapshot.val()).map((entry) => ({
        ...entry,
        createdAt: entry.createdAt || entry.timestamp || null,
      })),
    })
  } catch (error) {
    console.error('Erreur GET /api/groups/:groupId/posts/:postId/discussion', error)
    return sendApiError(res, 500, 'Impossible de recuperer la discussion du post.')
  }
})

app.post('/api/groups/:groupId/posts/:postId/discussion', async (req, res) => {
  const { groupId, postId } = req.params
  const { authorId, authorName, content } = req.body || {}

  try {
    if (!groupId || !postId) {
      return sendApiError(res, 400, 'groupId et postId sont requis.')
    }

    if (!authorId) {
      return sendApiError(res, 400, 'authorId est requis.')
    }

    validateInput(content, 'Contenu de la discussion', 1000)
    const sanitizedContent = sanitizeInput(content, 1000)

    const decodedToken = await authenticateRequest(req, res)
    if (!decodedToken) return

    if (authorId !== decodedToken.uid) {
      return sendApiError(res, 403, 'authorId ne correspond pas a l utilisateur authentifie.')
    }

    const [groupSnapshot, postSnapshot] = await Promise.all([
      getGroupSnapshot(groupId),
      getPostSnapshot(groupId, postId),
    ])

    if (!groupSnapshot.exists()) {
      return sendApiError(res, 404, 'Groupe introuvable.')
    }

    const group = groupSnapshot.val() || {}

    if (!isGroupMember(group, decodedToken.uid)) {
      return sendApiError(res, 403, 'Seuls les membres peuvent participer a cette discussion.')
    }

    if (!postSnapshot.exists()) {
      return sendApiError(res, 404, 'Post introuvable.')
    }

    const createdAt = new Date().toISOString()
    const discussionRef = db.ref(`groups/${groupId}/discussion/${postId}`).push()
    const discussionEntry = {
      authorId: decodedToken.uid,
      authorName: sanitizeInput(authorName || decodedToken.name || 'Utilisateur', 100),
      content: sanitizedContent,
      createdAt,
    }

    await discussionRef.set(discussionEntry)

    return res.status(201).json({
      id: discussionRef.key,
      groupId,
      postId,
      ...discussionEntry,
    })
  } catch (error) {
    console.error('Erreur POST /api/groups/:groupId/posts/:postId/discussion', error)
    return sendApiError(res, 500, 'Impossible de publier la discussion du post.')
  }
})

app.post('/api/groups/:groupId/invitations/respond', async (req, res) => {
  const { groupId } = req.params
  const { decision } = req.body || {}

  if (!groupId) {
    return sendApiError(res, 400, 'groupId requis.')
  }

  if (!['accept', 'decline'].includes(decision)) {
    return sendApiError(res, 400, 'decision doit valoir accept ou decline.')
  }

  const decodedToken = await authenticateRequest(req, res)
  if (!decodedToken) return

  try {
    const invitationRef = db.ref(`groups/${groupId}/pendingInvitations/${decodedToken.uid}`)
    const [groupSnapshot, invitationSnapshot] = await Promise.all([
      getGroupSnapshot(groupId),
      invitationRef.once('value'),
    ])

    if (!groupSnapshot.exists()) {
      return sendApiError(res, 404, 'Groupe introuvable.')
    }

    if (!invitationSnapshot.exists()) {
      return sendApiError(res, 404, 'Invitation introuvable ou deja traitee.')
    }

    const group = groupSnapshot.val() || {}
    const invitation = invitationSnapshot.val() || {}

    if (isExpiredTimestamp(invitation.expiresAt)) {
      await invitationRef.set(null)
      return sendApiError(res, 410, 'Cette invitation a expire.')
    }

    const updates = {
      [`groups/${groupId}/pendingInvitations/${decodedToken.uid}`]: null,
    }

    if (decision === 'accept' && !isGroupMember(group, decodedToken.uid)) {
      updates[`groups/${groupId}/members/${decodedToken.uid}`] = true
    }

    await db.ref().update(updates)

    return res.json({
      success: true,
      groupId,
      decision,
      joined: decision === 'accept',
      groupSlug: group.slug || '',
      groupName: group.name || 'Groupe',
      adminId: group.adminId || '',
    })
  } catch (error) {
    console.error('Erreur POST /api/groups/:groupId/invitations/respond', error)
    return sendApiError(res, 500, "Impossible de traiter la reponse a l'invitation.")
  }
})

app.get('/api/invitations/:code', async (req, res) => {
  const { code } = req.params

  if (!code) {
    return sendApiError(res, 400, 'code requis.')
  }

  const decodedToken = await authenticateRequest(req, res)
  if (!decodedToken) return

  try {
    const result = await findGroupByInvitationCode(code)

    if (!result) {
      return sendApiError(res, 404, 'Invitation introuvable.')
    }

    const { groupId, group, inviteAccess, matchedInvitation } = result
    const expiresAt = inviteAccess?.expiresAt || null

    if (inviteAccess?.expired || isExpiredTimestamp(expiresAt)) {
      return sendApiError(res, 410, 'Cette invitation a expire.')
    }

    const userPendingInvitation = group?.pendingInvitations?.[decodedToken.uid] || null

    return res.json({
      code,
      groupId,
      group: {
        id: groupId,
        name: group.name || 'Groupe',
        slug: group.slug || '',
        description: group.description || '',
        avatar: group.avatar || '',
        adminId: group.adminId || '',
        adminName: group.adminName || 'Administrateur',
        memberCount: Object.keys(group.members || {}).length,
      },
      invitation: {
        code,
        expiresAt,
        link: inviteAccess?.link || '',
        message:
          userPendingInvitation?.message ||
          inviteAccess?.message ||
          matchedInvitation?.message ||
          '',
      },
      isMember: isGroupMember(group, decodedToken.uid),
      hasDirectInvite: Boolean(userPendingInvitation),
    })
  } catch (error) {
    console.error('Erreur GET /api/invitations/:code', error)
    return sendApiError(res, 500, "Impossible de recuperer cette invitation.")
  }
})

app.post('/api/invitations/:code/respond', async (req, res) => {
  const { code } = req.params
  const { decision } = req.body || {}

  if (!code) {
    return sendApiError(res, 400, 'code requis.')
  }

  if (!['accept', 'decline'].includes(decision)) {
    return sendApiError(res, 400, 'decision doit valoir accept ou decline.')
  }

  const decodedToken = await authenticateRequest(req, res)
  if (!decodedToken) return

  try {
    const result = await findGroupByInvitationCode(code)

    if (!result) {
      return sendApiError(res, 404, 'Invitation introuvable.')
    }

    const { groupId, group, inviteAccess } = result
    const expiresAt = inviteAccess?.expiresAt || null

    if (inviteAccess?.expired || isExpiredTimestamp(expiresAt)) {
      return sendApiError(res, 410, 'Cette invitation a expire.')
    }

    const updates = {}

    if (group?.pendingInvitations?.[decodedToken.uid]) {
      updates[`groups/${groupId}/pendingInvitations/${decodedToken.uid}`] = null
    }

    if (decision === 'accept' && !isGroupMember(group, decodedToken.uid)) {
      updates[`groups/${groupId}/members/${decodedToken.uid}`] = true
    }

    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates)
    }

    return res.json({
      success: true,
      code,
      groupId,
      decision,
      joined: decision === 'accept',
      groupSlug: group.slug || '',
      groupName: group.name || 'Groupe',
      adminId: group.adminId || '',
    })
  } catch (error) {
    console.error('Erreur POST /api/invitations/:code/respond', error)
    return sendApiError(res, 500, "Impossible de traiter cette invitation.")
  }
})

// Événements de connexion Socket.io
io.on('connection', (socket) => {
  const userId = socket.data.userId
  const defaultUserName = socket.data.userName || 'Utilisateur'

  console.log(`✅ Utilisateur connecté: ${userId} (Socket: ${socket.id})`)

  // Rejoindre un groupe
  socket.on('group:join', async (data = {}) => {
    const { groupId } = data

    if (!groupId) return

    try {
      const groupSnapshot = await getGroupSnapshot(groupId)

      if (!groupSnapshot.exists()) {
        socket.emit('error', { message: 'Groupe introuvable.' })
        return
      }

      const group = groupSnapshot.val() || {}

      if (!isGroupMember(group, userId)) {
        socket.emit('error', { message: 'Acces refuse a ce groupe.' })
        return
      }

      socket.join(groupId)

      if (!groupUsers[groupId]) {
        groupUsers[groupId] = {}
      }

      groupUsers[groupId][userId] = {
        socketId: socket.id,
        userName: data.userName || defaultUserName,
      }

      console.log(`👥 ${userId} a rejoint le groupe ${groupId}`)

      // Broadcaster aux autres utilisateurs du groupe
      io.to(groupId).emit('group:members', {
        groupId,
        onlineUsers: Object.entries(groupUsers[groupId] || {}).map(([id, user]) => ({
          userId: id,
          userName: user.userName,
        })),
      })
    } catch (error) {
      console.error('Erreur lors du group:join:', error)
      socket.emit('error', { message: 'Impossible de rejoindre ce groupe.' })
    }
  })

  // Quitter un groupe
  socket.on('group:leave', async (data = {}) => {
    const { groupId } = data

    if (!groupId || !groupUsers[groupId]) return

    delete groupUsers[groupId][userId]

    console.log(`👋 ${userId} a quitté le groupe ${groupId}`)

    // Broadcaster aux autres utilisateurs du groupe
    io.to(groupId).emit('group:members', {
      groupId,
      onlineUsers: Object.entries(groupUsers[groupId] || {}).map(([id, user]) => ({
        userId: id,
        userName: user.userName,
      })),
    })

    socket.leave(groupId)
  })

  // Recevoir et broadcaster un message
  socket.on('message:send', async (data = {}) => {
    const { groupId, content, authorName, timestamp } = data
    const trimmedContent = content?.trim()

    if (!groupId || !trimmedContent) {
      console.warn('⚠️ Données de message incomplètes')
      return
    }

    try {
      const groupSnapshot = await getGroupSnapshot(groupId)

      if (!groupSnapshot.exists()) {
        socket.emit('error', { message: 'Groupe introuvable.' })
        return
      }

      const group = groupSnapshot.val() || {}

      if (!isGroupMember(group, userId)) {
        socket.emit('error', { message: 'Acces refuse a ce groupe.' })
        return
      }

      // Créer un ID unique pour le message
      const safeTimestamp = timestamp || new Date().toISOString()
      const safeAuthorName =
        authorName ||
        groupUsers[groupId]?.[userId]?.userName ||
        defaultUserName
      const messageId = `${safeTimestamp}-${userId}`

      const newMessage = {
        id: messageId,
        groupId,
        content: trimmedContent,
        authorId: userId,
        authorName: safeAuthorName,
        timestamp: safeTimestamp,
      }

      console.log(
        `💬 Nouveau message dans ${groupId} de ${safeAuthorName}: ${trimmedContent.substring(0, 50)}...`,
      )

      // Broadcaster le message à tous les utilisateurs du groupe (en temps réel)
      io.to(groupId).emit('message:new', newMessage)

      // Récupérer le nombre total de messages dans le groupe (du serveur persistant)
      db.ref(`groups/${groupId}/messages`).once('value', (snapshot) => {
        const messagesCount = snapshot.val() ? Object.keys(snapshot.val()).length : 0

        // Envoyer le compte mis à jour
        io.to(groupId).emit('group:messages-count', {
          groupId,
          count: messagesCount + 1, // +1 pour le message qu'on vient d'ajouter
        })
      })
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error)
      socket.emit('error', { message: 'Erreur lors de l\'envoi du message' })
    }
  })

  // Gérer l'indicateur de saisie
  socket.on('typing:send', (data = {}) => {
    const { groupId, userName, isTyping } = data

    if (!groupId) return

    if (!typingUsers[groupId]) {
      typingUsers[groupId] = {}
    }

    if (isTyping) {
      // Arrêter le timeout précédent s'il existe
      if (typingUsers[groupId][userId]?.timeout) {
        clearTimeout(typingUsers[groupId][userId].timeout)
      }

      typingUsers[groupId][userId] = {
        userName: userName || groupUsers[groupId]?.[userId]?.userName || defaultUserName,
        timeout: setTimeout(() => {
          delete typingUsers[groupId][userId]
          io.to(groupId).emit('typing:update', {
            groupId,
            typingUsers: Object.entries(typingUsers[groupId] || {}).reduce((acc, [id, user]) => {
              acc[id] = user.userName
              return acc
            }, {}),
          })
        }, 3000), // Arrêter après 3 secondes d'inactivité
      }
    } else {
      // Arrêter la saisie
      if (typingUsers[groupId][userId]?.timeout) {
        clearTimeout(typingUsers[groupId][userId].timeout)
      }
      delete typingUsers[groupId][userId]
    }

    // Broadcaster l'état de saisie à tous
    io.to(groupId).emit('typing:update', {
      groupId,
      typingUsers: Object.entries(typingUsers[groupId] || {}).reduce((acc, [id, user]) => {
        acc[id] = user.userName
        return acc
      }, {}),
    })
  })

  // Déconnexion
  socket.on('disconnect', () => {
    console.log(`❌ Utilisateur déconnecté: ${userId} (Socket: ${socket.id})`)

    // Nettoyer les groupes
    Object.keys(groupUsers).forEach((groupId) => {
      if (groupUsers[groupId][userId]) {
        delete groupUsers[groupId][userId]

        // Broadcaster aux autres utilisateurs du groupe
        io.to(groupId).emit('group:members', {
          groupId,
          onlineUsers: Object.entries(groupUsers[groupId] || {}).map(([id, user]) => ({
            userId: id,
            userName: user.userName,
          })),
        })
      }
    })

    // Nettoyer les indicateurs de saisie
    Object.keys(typingUsers).forEach((groupId) => {
      if (typingUsers[groupId][userId]) {
        clearTimeout(typingUsers[groupId][userId].timeout)
        delete typingUsers[groupId][userId]

        io.to(groupId).emit('typing:update', {
          groupId,
          typingUsers: Object.entries(typingUsers[groupId] || {}).reduce((acc, [id, user]) => {
            acc[id] = user.userName
            return acc
          }, {}),
        })
      }
    })
  })
})

// ========== ROUTES LIKES ==========

/**
 * POST /api/groups/:groupId/posts/:postId/like
 * Liker un post
 */
app.post('/api/groups/:groupId/posts/:postId/like', async (req, res) => {
  const { groupId, postId } = req.params
  const { userId } = req.body || {}

  if (!groupId || !postId || !userId) {
    return sendApiError(res, 400, 'groupId, postId et userId sont requis.')
  }

  const decodedToken = await authenticateRequest(req, res)
  if (!decodedToken) return

  if (userId !== decodedToken.uid) {
    return sendApiError(res, 403, 'userId ne correspond pas a l utilisateur authentifie.')
  }

  try {
    // Vérifier que le groupe existe
    const groupSnapshot = await getGroupSnapshot(groupId)
    if (!groupSnapshot.exists()) {
      return sendApiError(res, 404, 'Groupe introuvable.')
    }

    // Vérifier que l'utilisateur est membre du groupe
    const group = groupSnapshot.val() || {}
    if (!isGroupMember(group, decodedToken.uid)) {
      return sendApiError(res, 403, 'Seuls les membres peuvent liker des posts.')
    }

    // Vérifier que le post existe
    const postSnapshot = await getPostSnapshot(groupId, postId)
    if (!postSnapshot.exists()) {
      return sendApiError(res, 404, 'Post introuvable.')
    }

    // Ajouter le like
    await db.ref(`groups/${groupId}/posts/${postId}/likes/${userId}`).set(true)

    // Récupérer le nombre total de likes
    const likesSnapshot = await db.ref(`groups/${groupId}/posts/${postId}/likes`).once('value')
    const likesCount = likesSnapshot.val() ? Object.keys(likesSnapshot.val()).length : 0

    return res.status(200).json({
      success: true,
      groupId,
      postId,
      userId,
      likesCount,
      message: 'Post liké avec succès.'
    })
  } catch (error) {
    console.error('Erreur POST /api/groups/:groupId/posts/:postId/like', error)
    return sendApiError(res, 500, 'Impossible de liker le post.')
  }
})

/**
 * DELETE /api/groups/:groupId/posts/:postId/like
 * Retirer un like d'un post
 */
app.delete('/api/groups/:groupId/posts/:postId/like', async (req, res) => {
  const { groupId, postId } = req.params
  const { userId } = req.body || {}

  if (!groupId || !postId || !userId) {
    return sendApiError(res, 400, 'groupId, postId et userId sont requis.')
  }

  const decodedToken = await authenticateRequest(req, res)
  if (!decodedToken) return

  if (userId !== decodedToken.uid) {
    return sendApiError(res, 403, 'userId ne correspond pas a l utilisateur authentifie.')
  }

  try {
    const groupSnapshot = await getGroupSnapshot(groupId)
    if (!groupSnapshot.exists()) {
      return sendApiError(res, 404, 'Groupe introuvable.')
    }

    const group = groupSnapshot.val() || {}
    if (!isGroupMember(group, decodedToken.uid)) {
      return sendApiError(res, 403, 'Seuls les membres peuvent retirer un like.')
    }

    const postSnapshot = await getPostSnapshot(groupId, postId)
    if (!postSnapshot.exists()) {
      return sendApiError(res, 404, 'Post introuvable.')
    }

    // Retirer le like
    await db.ref(`groups/${groupId}/posts/${postId}/likes/${userId}`).remove()

    // Récupérer le nombre total de likes
    const likesSnapshot = await db.ref(`groups/${groupId}/posts/${postId}/likes`).once('value')
    const likesCount = likesSnapshot.val() ? Object.keys(likesSnapshot.val()).length : 0

    return res.status(200).json({
      success: true,
      groupId,
      postId,
      userId,
      likesCount,
      message: 'Like retiré avec succès.'
    })
  } catch (error) {
    console.error('Erreur DELETE /api/groups/:groupId/posts/:postId/like', error)
    return sendApiError(res, 500, 'Impossible de retirer le like.')
  }
})

/**
 * GET /api/groups/:groupId/posts/:postId/likes
 * Récupérer les likes d'un post
 */
app.get('/api/groups/:groupId/posts/:postId/likes', async (req, res) => {
  const { groupId, postId } = req.params

  if (!groupId || !postId) {
    return sendApiError(res, 400, 'groupId et postId sont requis.')
  }

  const decodedToken = await authenticateRequest(req, res)
  if (!decodedToken) return

  try {
    // Vérifier que le groupe existe
    const groupSnapshot = await getGroupSnapshot(groupId)
    if (!groupSnapshot.exists()) {
      return sendApiError(res, 404, 'Groupe introuvable.')
    }

    const group = groupSnapshot.val() || {}
    if (!isGroupMember(group, decodedToken.uid)) {
      return sendApiError(res, 403, 'Seuls les membres peuvent consulter les likes.')
    }

    const postSnapshot = await getPostSnapshot(groupId, postId)
    if (!postSnapshot.exists()) {
      return sendApiError(res, 404, 'Post introuvable.')
    }

    // Récupérer les likes du post
    const likesSnapshot = await db.ref(`groups/${groupId}/posts/${postId}/likes`).once('value')
    const likes = likesSnapshot.val() || {}
    const likesList = Object.keys(likes)

    return res.status(200).json({
      groupId,
      postId,
      likes: likesList,
      likesCount: likesList.length
    })
  } catch (error) {
    console.error('Erreur GET /api/groups/:groupId/posts/:postId/likes', error)
    return sendApiError(res, 500, 'Impossible de récupérer les likes du post.')
  }
})

// ========== ROUTES NOTIFICATIONS ==========

/**
 * GET /api/notifications/:userId
 * Récupérer les notifications d'un utilisateur
 */
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const decodedToken = await authorizeUserAccess(
      req,
      res,
      userId,
      'Acces refuse a ces notifications.',
    )
    if (!decodedToken) return

    const parsedLimit = Number.parseInt(req.query.limit ?? '20', 10)
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20

    const snapshot = await db.ref(`notifications/${userId}`).get()

    if (!snapshot.exists()) {
      return res.json({ notifications: {} })
    }

    const notifications = snapshot.val()
    // Trier par date décroissante
    const sorted = Object.entries(notifications)
      .sort(([, a], [, b]) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)

    res.json({
      notifications: Object.fromEntries(sorted),
    })
  } catch (error) {
    console.error('Erreur GET notifications:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/notifications/:userId/unread
 * Récupérer le nombre de notifications non lues
 */
app.get('/api/notifications/:userId/unread', async (req, res) => {
  try {
    const { userId } = req.params
    const decodedToken = await authorizeUserAccess(
      req,
      res,
      userId,
      'Acces refuse a ces notifications.',
    )
    if (!decodedToken) return

    const snapshot = await db.ref(`notifications/${userId}`).get()

    if (!snapshot.exists()) {
      return res.json({ unreadCount: 0, notifications: {} })
    }

    const notifications = snapshot.val()
    const unread = Object.entries(notifications)
      .filter(([, notif]) => !notif.read)
      .reduce((acc, [id, notif]) => {
        acc[id] = notif
        return acc
      }, {})

    res.json({
      unreadCount: Object.keys(unread).length,
      notifications: unread,
    })
  } catch (error) {
    console.error('Erreur GET unread notifications:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/notifications/:userId
 * Créer une notification
 */
app.post('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const decodedToken = await authenticateRequest(req, res)
    if (!decodedToken) return

    const notificationData = req.body || {}
    const createdAt = new Date().toISOString()

    const newNotifRef = db.ref(`notifications/${userId}`).push()

    await newNotifRef.set({
      ...notificationData,
      createdAt,
      createdBy: decodedToken.uid,
      read: false,
    })

    res.status(201).json({
      id: newNotifRef.key,
      ...notificationData,
      createdAt,
      createdBy: decodedToken.uid,
      read: false,
    })
  } catch (error) {
    console.error('Erreur POST notification:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * PATCH /api/notifications/:userId/:notificationId/read
 * Marquer une notification comme lue
 */
app.patch('/api/notifications/:userId/:notificationId/read', async (req, res) => {
  try {
    const { userId, notificationId } = req.params
    const decodedToken = await authorizeUserAccess(
      req,
      res,
      userId,
      'Acces refuse a ces notifications.',
    )
    if (!decodedToken) return

    await db.ref(`notifications/${userId}/${notificationId}`).update({
      read: true,
      readAt: new Date().toISOString(),
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Erreur PATCH read notification:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * PATCH /api/notifications/:userId/read-all
 * Marquer toutes les notifications comme lues
 */
app.patch('/api/notifications/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params
    const decodedToken = await authorizeUserAccess(
      req,
      res,
      userId,
      'Acces refuse a ces notifications.',
    )
    if (!decodedToken) return

    const snapshot = await db.ref(`notifications/${userId}`).get()

    if (!snapshot.exists()) {
      return res.json({ success: true, updated: 0 })
    }

    const updates = {}
    Object.keys(snapshot.val()).forEach((id) => {
      updates[`notifications/${userId}/${id}/read`] = true
      updates[`notifications/${userId}/${id}/readAt`] = new Date().toISOString()
    })

    await db.ref().update(updates)

    res.json({ success: true, updated: Object.keys(updates).length / 2 })
  } catch (error) {
    console.error('Erreur PATCH read-all notifications:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * DELETE /api/notifications/:userId/:notificationId
 * Supprimer une notification
 */
app.delete('/api/notifications/:userId/:notificationId', async (req, res) => {
  try {
    const { userId, notificationId } = req.params
    const decodedToken = await authorizeUserAccess(
      req,
      res,
      userId,
      'Acces refuse a ces notifications.',
    )
    if (!decodedToken) return

    await db.ref(`notifications/${userId}/${notificationId}`).set(null)

    res.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE notification:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * DELETE /api/notifications/:userId
 * Supprimer toutes les notifications
 */
app.delete('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const decodedToken = await authorizeUserAccess(
      req,
      res,
      userId,
      'Acces refuse a ces notifications.',
    )
    if (!decodedToken) return

    await db.ref(`notifications/${userId}`).set(null)

    res.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE all notifications:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/', (req, res) => {
  res.send('🚀 Netthex backend is running');
});

app.get('/api', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Netthex API active 🚀'
  });
});

// Endpoint de santé
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Serveur Socket.io actif' })
})

// Démarrer le serveur
const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          🚀 SERVEUR SOCKET.IO DÉMARRÉ AVEC SUCCÈS         ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  📡 Adresse: http://localhost:${PORT}                           ║
║  🔗 CORS: http://localhost:5173                           ║
║  🗄️  Firebase: ${process.env.FIREBASE_DATABASE_URL || 'Non configuré'}  ║
║                                                            ║
║  Événements disponibles:                                  ║
║  ├─ message:send          → Envoyer un message            ║
║  ├─ group:join            → Rejoindre un groupe           ║
║  ├─ group:leave           → Quitter un groupe             ║
║  ├─ typing:send           → Envoyer indicateur saisie    ║
║  └─ message:new (écoute)  → Réception de message         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `)
})

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejection:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error)
})
