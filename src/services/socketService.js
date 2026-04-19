import { io } from 'socket.io-client'

let socket = null

export const initSocket = (userId) => {
  if (socket) return socket

  // URL du serveur socket.io (en développement: localhost:3001)
  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

  socket = io(socketUrl, {
    auth: {
      userId,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  })

  socket.on('connect', () => {
    console.log('✅ Connecté au serveur socket.io')
  })

  socket.on('disconnect', () => {
    console.log('❌ Déconnecté du serveur socket.io')
  })

  socket.on('error', (error) => {
    console.error('Erreur socket.io:', error)
  })

  return socket
}

export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket non initialisé. Appelez initSocket() d\'abord.')
  }
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Événements du chat
export const sendMessage = (groupId, message, authorId, authorName) => {
  const socket = getSocket()
  socket.emit('message:send', {
    groupId,
    content: message,
    authorId,
    authorName,
    timestamp: new Date().toISOString(),
  })
}

export const onMessageReceived = (callback) => {
  const socket = getSocket()
  socket.on('message:new', callback)
  return () => socket.off('message:new', callback)
}

export const onMessagesUpdate = (callback) => {
  const socket = getSocket()
  socket.on('messages:update', callback)
  return () => socket.off('messages:update', callback)
}

export const joinGroup = (groupId, userId) => {
  const socket = getSocket()
  socket.emit('group:join', { groupId, userId })
}

export const leaveGroup = (groupId, userId) => {
  const socket = getSocket()
  socket.emit('group:leave', { groupId, userId })
}

export const onGroupMembersUpdate = (callback) => {
  const socket = getSocket()
  socket.on('group:members', callback)
  return () => socket.off('group:members', callback)
}

export const onGroupMessagesCount = (callback) => {
  const socket = getSocket()
  socket.on('group:messages-count', callback)
  return () => socket.off('group:messages-count', callback)
}

export const onTyping = (callback) => {
  const socket = getSocket()
  socket.on('typing:update', callback)
  return () => socket.off('typing:update', callback)
}

export const sendTyping = (groupId, userId, userName, isTyping) => {
  const socket = getSocket()
  socket.emit('typing:send', {
    groupId,
    userId,
    userName,
    isTyping,
  })
}
