import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useGroups } from '../context/GroupContext'
import {
  sendNewMemberNotification,
  updateInvitationNotificationsStatus,
} from '../services/notificationService'
import { respondToGroupInvitationApi } from '../services/apiService'

export function useInvitationResponse() {
  const { currentUser, userData } = useAuth()
  const { groups } = useGroups()
  const [processingInvitationId, setProcessingInvitationId] = useState('')

  const handleInvitationResponse = async (notif, decision, options = {}) => {
    const { onAccepted, onDeclined, onComplete } = options

    if (!currentUser?.uid || !notif?.groupId || !notif?.id || processingInvitationId) {
      return null
    }

    setProcessingInvitationId(notif.id)

    try {
      const targetGroup = groups?.[notif.groupId]
      const respondedAt = new Date().toISOString()
      const response = await respondToGroupInvitationApi(notif.groupId, {
        decision,
      })

      await updateInvitationNotificationsStatus(currentUser.uid, {
        groupId: notif.groupId,
        invitationCode: notif.invitationCode || '',
        responseStatus: decision === 'accept' ? 'accepted' : 'declined',
        respondedAt,
        readAt: respondedAt,
      })

      if (decision === 'accept') {
        const groupName = targetGroup?.name || response?.groupName || notif.groupName || 'Groupe'
        const groupSlug = targetGroup?.slug || response?.groupSlug || notif.groupSlug || ''
        const memberName =
          userData?.username ||
          userData?.displayName ||
          currentUser.displayName ||
          currentUser.email?.split('@')[0] ||
          'Utilisateur'
        const memberAvatar = userData?.avatar || currentUser.photoURL || ''
        const adminId = targetGroup?.adminId || response?.adminId || ''

        if (adminId && adminId !== currentUser.uid) {
          try {
            await sendNewMemberNotification(adminId, {
              groupId: notif.groupId,
              groupName,
              groupSlug,
              memberId: currentUser.uid,
              memberName,
              memberAvatar,
            })
          } catch (notificationError) {
            console.warn('Notification admin non envoyee:', notificationError)
          }
        }

        if (typeof onAccepted === 'function') {
          onAccepted(response)
        }
      } else if (typeof onDeclined === 'function') {
        onDeclined(response)
      }

      if (typeof onComplete === 'function') {
        onComplete(response)
      }

      return response
    } catch (error) {
      console.error(`Erreur reponse invitation (${decision}):`, error)
      alert(
        decision === 'accept'
          ? "Impossible d'accepter cette invitation pour le moment."
          : "Impossible de refuser cette invitation pour le moment.",
      )
      return null
    } finally {
      setProcessingInvitationId('')
    }
  }

  return {
    processingInvitationId,
    handleInvitationResponse,
  }
}
