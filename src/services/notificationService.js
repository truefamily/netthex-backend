import { ref, push, set, get, update } from 'firebase/database'
import { database as db } from './firebaseConfig'
import { auth } from './firebaseConfig'

/**
 * Créer une notification
 * @param {string} userId - ID de l'utilisateur destinataire
 * @param {object} notificationData - Données de la notification
 */
export const createNotification = async (userId, notificationData) => {
  try {
    const currentUser = auth.currentUser
    const notificationRef = push(ref(db, `notifications/${userId}`))
    await set(notificationRef, {
      ...notificationData,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.uid || null,
      read: false,
    })
    return notificationRef.key
  } catch (error) {
    throw new Error(`Erreur création notification: ${error.message}`)
  }
}

/**
 * Récupérer les notifications d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {number} limit - Nombre de notifications à récupérer
 */
export const getNotifications = async (userId, limit = 20) => {
  try {
    const notificationsRef = ref(db, `notifications/${userId}`)
    const snapshot = await get(notificationsRef)
    
    if (!snapshot.exists()) return {}
    
    const notifications = snapshot.val()
    // Trier par date décroissante et limiter
    const sorted = Object.entries(notifications)
      .sort(([, a], [, b]) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
    
    return Object.fromEntries(sorted)
  } catch (error) {
    throw new Error(`Erreur récupération notifications: ${error.message}`)
  }
}

/**
 * Récupérer les notifications non lues
 * @param {string} userId - ID de l'utilisateur
 */
export const getUnreadNotifications = async (userId) => {
  try {
    const notificationsRef = ref(db, `notifications/${userId}`)
    const snapshot = await get(notificationsRef)
    
    if (!snapshot.exists()) return {}
    
    const notifications = snapshot.val()
    const unread = Object.entries(notifications)
      .filter(([, notif]) => !notif.read)
      .reduce((acc, [id, notif]) => {
        acc[id] = notif
        return acc
      }, {})
    
    return unread
  } catch (error) {
    throw new Error(`Erreur récupération notifications: ${error.message}`)
  }
}

/**
 * Marquer une notification comme lue
 * @param {string} userId - ID de l'utilisateur
 * @param {string} notificationId - ID de la notification
 */
export const markNotificationAsRead = async (userId, notificationId) => {
  try {
    await update(ref(db, `notifications/${userId}/${notificationId}`), {
      read: true,
      readAt: new Date().toISOString(),
    })
  } catch (error) {
    throw new Error(`Erreur marquage notification: ${error.message}`)
  }
}

export const updateNotification = async (userId, notificationId, updates) => {
  try {
    await update(ref(db, `notifications/${userId}/${notificationId}`), updates)
  } catch (error) {
    throw new Error(`Erreur mise a jour notification: ${error.message}`)
  }
}

/**
 * Marquer toutes les notifications comme lues
 * @param {string} userId - ID de l'utilisateur
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const notificationsRef = ref(db, `notifications/${userId}`)
    const snapshot = await get(notificationsRef)
    
    if (!snapshot.exists()) return
    
    const updates = {}
    Object.keys(snapshot.val()).forEach(id => {
      updates[`notifications/${userId}/${id}/read`] = true
      updates[`notifications/${userId}/${id}/readAt`] = new Date().toISOString()
    })
    
    await update(ref(db), updates)
  } catch (error) {
    throw new Error(`Erreur marquage notifications: ${error.message}`)
  }
}

/**
 * Supprimer une notification
 * @param {string} userId - ID de l'utilisateur
 * @param {string} notificationId - ID de la notification
 */
export const deleteNotification = async (userId, notificationId) => {
  try {
    await set(ref(db, `notifications/${userId}/${notificationId}`), null)
  } catch (error) {
    throw new Error(`Erreur suppression notification: ${error.message}`)
  }
}

/**
 * Supprimer toutes les notifications
 * @param {string} userId - ID de l'utilisateur
 */
export const deleteAllNotifications = async (userId) => {
  try {
    await set(ref(db, `notifications/${userId}`), null)
  } catch (error) {
    throw new Error(`Erreur suppression notifications: ${error.message}`)
  }
}

/**
 * Créer une notification d'invitation
 * @param {string} userId - ID du destinataire
 * @param {object} invitationData - Données d'invitation
 */
export const sendInvitationNotification = async (userId, invitationData) => {
  return createNotification(userId, {
    type: 'invitation',
    title: `Invitation à rejoindre ${invitationData.groupName}`,
    message: `${invitationData.fromName} t'a invité à rejoindre "${invitationData.groupName}"`,
    invitationMessage: invitationData.invitationMessage || '',
    invitationCode: invitationData.invitationCode || '',
    invitationLink: invitationData.invitationLink || '',
    groupId: invitationData.groupId,
    groupName: invitationData.groupName,
    groupAvatar: invitationData.groupAvatar,
    groupSlug: invitationData.groupSlug,
    from: {
      userId: invitationData.fromId,
      name: invitationData.fromName,
      avatar: invitationData.fromAvatar,
    },
    action: 'accept_invite',
    actionLink: `/group/${invitationData.groupSlug}`,
  })
}

export const updateInvitationNotificationsStatus = async (
  userId,
  { groupId, invitationCode = '', responseStatus, respondedAt, readAt },
) => {
  try {
    const notificationsRef = ref(db, `notifications/${userId}`)
    const snapshot = await get(notificationsRef)

    if (!snapshot.exists()) {
      return 0
    }

    const notifications = snapshot.val() || {}
    const updates = {}
    let matchedCount = 0

    Object.entries(notifications).forEach(([notificationId, notification]) => {
      if (notification?.type !== 'invitation' || notification?.groupId !== groupId) {
        return
      }

      if (
        invitationCode &&
        notification?.invitationCode &&
        notification.invitationCode !== invitationCode
      ) {
        return
      }

      matchedCount += 1
      updates[`notifications/${userId}/${notificationId}/responseStatus`] = responseStatus
      updates[`notifications/${userId}/${notificationId}/respondedAt`] = respondedAt
      updates[`notifications/${userId}/${notificationId}/read`] = true
      updates[`notifications/${userId}/${notificationId}/readAt`] = readAt
    })

    if (matchedCount > 0) {
      await update(ref(db), updates)
    }

    return matchedCount
  } catch (error) {
    throw new Error(`Erreur mise a jour notifications invitation: ${error.message}`)
  }
}

/**
 * Créer une notification de nouveau post
 * @param {string} userId - ID du destinataire
 * @param {object} postData - Données du post
 */
export const sendNewPostNotification = async (userId, postData) => {
  const excerpt = postData.content?.trim()
    ? `${postData.content.trim().slice(0, 50)}...`
    : 'Nouvelle publication avec media'

  return createNotification(userId, {
    type: 'post',
    title: `Nouveau post dans ${postData.groupName}`,
    message: `${postData.authorName} a publie: "${excerpt}"`,
    groupId: postData.groupId,
    groupName: postData.groupName,
    groupSlug: postData.groupSlug,
    postId: postData.postId,
    from: {
      userId: postData.authorId,
      name: postData.authorName,
      avatar: postData.authorAvatar,
    },
    action: 'view_post',
    actionLink: `/group/${postData.groupSlug}`,
  })
}

/**
 * Créer une notification de nouveau message direct
 * @param {string} userId - ID du destinataire
 * @param {object} messageData - Données du message
 */
export const sendDirectMessageNotification = async (userId, messageData) => {
  const excerpt = messageData.content?.trim()
    ? messageData.content.trim().slice(0, 50)
    : 'Nouveau message'

  return createNotification(userId, {
    type: 'message',
    title: `Message de ${messageData.senderName}`,
    message: excerpt,
    senderId: messageData.senderId,
    senderName: messageData.senderName,
    senderAvatar: messageData.senderAvatar,
    conversationId: messageData.conversationId,
    from: {
      userId: messageData.senderId,
      name: messageData.senderName,
      avatar: messageData.senderAvatar,
    },
    action: 'open_chat',
    actionLink: `/messages?conversation=${messageData.conversationId}`,
  })
}

/**
 * Créer une notification de nouveau membre
 * @param {string} userId - ID du destinataire (admin)
 * @param {object} memberData - Données du nouveau membre
 */
export const sendNewMemberNotification = async (userId, memberData) => {
  return createNotification(userId, {
    type: 'member',
    title: `Nouveau membre dans ${memberData.groupName}`,
    message: `${memberData.memberName} a rejoint le groupe`,
    groupId: memberData.groupId,
    groupName: memberData.groupName,
    groupSlug: memberData.groupSlug,
    newMember: {
      userId: memberData.memberId,
      name: memberData.memberName,
      avatar: memberData.memberAvatar,
    },
    action: 'view_members',
    actionLink: `/group/${memberData.groupSlug}`,
  })
}
