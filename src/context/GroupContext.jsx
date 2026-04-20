import React, { createContext, useContext, useState, useEffect } from 'react'
import { listenToGroups, updateGroup } from '../services/realtimeService'
import { mockGroups } from '../data/mockGroups'
import { useAuth } from './AuthContext'

const GroupContext = createContext()

export const useGroups = () => {
  const context = useContext(GroupContext)
  if (!context) {
    throw new Error('useGroups doit être utilisé dans un GroupProvider')
  }
  return context
}

export const GroupProvider = ({ children }) => {
  const { currentUser } = useAuth()
  const [groups, setGroups] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser?.uid) {
      setGroups({})
      setLoading(false)
      return undefined
    }

    setLoading(true)

    const unsubscribe = listenToGroups(
      (snapshot) => {
        const groupsData = snapshot.val()
        setGroups(groupsData && Object.keys(groupsData).length > 0 ? groupsData : mockGroups)
        setLoading(false)
      },
      (error) => {
        console.error('Erreur lors du chargement des groupes:', error)
        setGroups(mockGroups)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [currentUser?.uid])

  const updateGroupDetails = async (groupId, updates) => {
    const previousGroup = groups[groupId]
    if (!previousGroup) {
      throw new Error('Groupe introuvable.')
    }

    const nextGroup = {
      ...previousGroup,
      ...updates,
      name: updates.name?.trim() ?? previousGroup.name,
      description: updates.description?.trim() ?? previousGroup.description,
      updatedAt: new Date().toISOString(),
    }

    setGroups((current) => ({
      ...current,
      [groupId]: nextGroup,
    }))

    try {
      const persistedGroup = await updateGroup(groupId, updates)
      setGroups((current) => ({
        ...current,
        [groupId]: persistedGroup,
      }))
      return persistedGroup
    } catch (error) {
      if (error.message.includes('Acces refuse')) {
        return nextGroup
      }

      setGroups((current) => ({
        ...current,
        [groupId]: previousGroup,
      }))
      throw error
    }
  }

  const value = {
    groups,
    loading,
    updateGroupDetails,
  }

  return (
    <GroupContext.Provider value={value}>
      {children}
    </GroupContext.Provider>
  )
}
