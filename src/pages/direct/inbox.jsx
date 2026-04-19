import { useEffect, useMemo, useState } from 'react'
import Navbar from '../../components/Navbar'
import { useAuth } from '../../context/AuthContext'
import { useGroups } from '../../context/GroupContext'
import {
  getDirectConversationsApi,
  getDirectMessagesApi,
  getGroupMessagesApi,
  sendDirectMessageApi,
  sendGroupMessageApi,
} from '../../services/apiService'
import {
  listenToUsers,
} from '../../services/realtimeService'

function InboxIcon({ path, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function formatConversationTime(value) {
  if (!value) return 'Aucun message'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Aucun message'

  const now = new Date()
  const isToday = now.toDateString() === date.toDateString()

  if (isToday) {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  })
}

function formatMessageTime(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function sortMessages(messages) {
  return Object.entries(messages || {})
    .map(([id, message]) => ({
      id,
      ...message,
    }))
    .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0))
}

function getInitial(value) {
  return value?.charAt(0).toUpperCase() || 'N'
}

function normalizeProfile(profile, fallback = {}) {
  return {
    uid: profile?.uid || fallback.uid || '',
    username: profile?.username || profile?.displayName || fallback.username || 'Utilisateur',
    email: profile?.email || fallback.email || '',
    avatar: profile?.avatar || fallback.avatar || '',
  }
}

export default function Inbox() {
  const { currentUser, userData } = useAuth()
  const { groups, loading: groupsLoading } = useGroups()
  const [activeTab, setActiveTab] = useState('private')
  const [search, setSearch] = useState('')
  const [selectedPrivateKey, setSelectedPrivateKey] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [directConversations, setDirectConversations] = useState({})
  const [usersDirectory, setUsersDirectory] = useState({})
  const [messages, setMessages] = useState([])
  const [messageDraft, setMessageDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [conversationsRefreshKey, setConversationsRefreshKey] = useState(0)
  const [messagesRefreshKey, setMessagesRefreshKey] = useState(0)

  const currentUserId = currentUser?.uid || ''
  const currentUserProfile = normalizeProfile(userData, {
    uid: currentUser?.uid,
    username: currentUser?.displayName,
    email: currentUser?.email,
  })

  useEffect(() => {
    if (!currentUserId) {
      setUsersDirectory({})
      setDirectConversations({})
      setSyncError('')
      return
    }

    const unsubscribeUsers = listenToUsers((snapshot) => {
      setUsersDirectory(snapshot.val() || {})
    })

    let isActive = true

    const loadDirectConversations = async () => {
      try {
        const response = await getDirectConversationsApi(currentUserId)

        if (!isActive) return

        setDirectConversations(
          Object.fromEntries(
            (response?.conversations || []).map((conversation) => [conversation.id, conversation]),
          ),
        )
        setSyncError('')
      } catch (error) {
        if (!isActive) return
        setSyncError(
          error.message || 'Impossible de synchroniser les conversations privees pour le moment.',
        )
      }
    }

    loadDirectConversations()
    const refreshInterval = window.setInterval(loadDirectConversations, 5000)

    return () => {
      isActive = false
      unsubscribeUsers()
      window.clearInterval(refreshInterval)
    }
  }, [conversationsRefreshKey, currentUserId])

  const groupEntries = useMemo(
    () => Object.entries(groups || {}).map(([id, group]) => ({ id, ...group })),
    [groups],
  )

  const joinedGroups = useMemo(
    () =>
      groupEntries.filter(
        (group) => group.adminId === currentUserId || Boolean(group.members?.[currentUserId]),
      ),
    [currentUserId, groupEntries],
  )

  const availableGroups = useMemo(
    () => (joinedGroups.length > 0 ? joinedGroups : groupEntries),
    [groupEntries, joinedGroups],
  )

  const groupConversations = useMemo(() => {
    return availableGroups
      .map((group) => {
        const groupMessages = sortMessages(group.messages)
        const lastMessage = groupMessages[groupMessages.length - 1]

        return {
          id: group.id,
          type: 'group',
          key: `group:${group.id}`,
          name: group.name,
          description: group.description,
          memberCount: Object.keys(group.members || {}).length || 0,
          lastMessage: lastMessage?.content || 'Commence la conversation dans ce groupe.',
          lastMessageAt: lastMessage?.timestamp || group.createdAt,
          lastAuthor: lastMessage?.authorName || group.adminName || 'Netthex',
          totalMessages: groupMessages.length,
          adminName: group.adminName || 'Administrateur',
        }
      })
      .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
  }, [availableGroups])

  const contactProfiles = useMemo(() => {
    return Object.entries(usersDirectory || {})
      .map(([uid, profile]) => normalizeProfile(profile, { uid }))
      .filter((profile) => profile.uid && profile.uid !== currentUserId)
      .sort((a, b) => a.username.localeCompare(b.username))
  }, [currentUserId, usersDirectory])

  const privateConversationItems = useMemo(() => {
    return Object.entries(directConversations || {})
      .map(([conversationId, conversation]) => {
        const participantIds = Object.keys(conversation.participants || {})
        const otherUserId = participantIds.find((participantId) => participantId !== currentUserId) || ''
        const otherProfile = normalizeProfile(
          conversation.participantProfiles?.[otherUserId],
          usersDirectory[otherUserId]
            ? {
                uid: otherUserId,
                ...usersDirectory[otherUserId],
              }
            : {
                uid: otherUserId,
              },
        )

        return {
          id: conversationId,
          key: `conversation:${conversationId}`,
          type: 'private-conversation',
          name: otherProfile.username,
          email: otherProfile.email,
          avatar: otherProfile.avatar,
          participantId: otherProfile.uid,
          participantProfile: otherProfile,
          description: otherProfile.email || 'Conversation privee',
          lastMessage: conversation.lastMessagePreview || 'Commencez votre conversation privee.',
          lastMessageAt:
            conversation.lastMessageAt || conversation.updatedAt || conversation.createdAt,
          lastAuthor:
            conversation.lastMessageAuthorId === currentUserId
              ? 'Vous'
              : otherProfile.username,
          totalMessages: Number(conversation.totalMessages || 0),
        }
      })
      .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
  }, [currentUserId, directConversations, usersDirectory])

  const contactedUserIds = useMemo(
    () => new Set(privateConversationItems.map((item) => item.participantId)),
    [privateConversationItems],
  )

  const contactStarterItems = useMemo(() => {
    return contactProfiles
      .filter((profile) => !contactedUserIds.has(profile.uid))
      .map((profile) => ({
        id: profile.uid,
        key: `contact:${profile.uid}`,
        type: 'private-contact',
        name: profile.username,
        email: profile.email,
        avatar: profile.avatar,
        participantId: profile.uid,
        participantProfile: profile,
        description: profile.email || 'Nouveau message prive',
        lastMessage: 'Demarrer une conversation privee.',
        lastMessageAt: null,
        lastAuthor: '',
        totalMessages: 0,
      }))
  }, [contactProfiles, contactedUserIds])

  const privateItems = useMemo(
    () => [...privateConversationItems, ...contactStarterItems],
    [contactStarterItems, privateConversationItems],
  )

  const filteredPrivateItems = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return privateItems

    return privateItems.filter(
      (item) =>
        item.name?.toLowerCase().includes(query) ||
        item.email?.toLowerCase().includes(query) ||
        item.lastMessage?.toLowerCase().includes(query),
    )
  }, [privateItems, search])

  const filteredGroupItems = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return groupConversations

    return groupConversations.filter(
      (conversation) =>
        conversation.name?.toLowerCase().includes(query) ||
        conversation.description?.toLowerCase().includes(query) ||
        conversation.lastAuthor?.toLowerCase().includes(query),
    )
  }, [groupConversations, search])

  useEffect(() => {
    if (!selectedPrivateKey && filteredPrivateItems.length > 0) {
      setSelectedPrivateKey(filteredPrivateItems[0].key)
      return
    }

    if (
      selectedPrivateKey &&
      filteredPrivateItems.length > 0 &&
      !filteredPrivateItems.some((item) => item.key === selectedPrivateKey)
    ) {
      setSelectedPrivateKey(filteredPrivateItems[0].key)
    }
  }, [filteredPrivateItems, selectedPrivateKey])

  useEffect(() => {
    if (!selectedGroupId && filteredGroupItems.length > 0) {
      setSelectedGroupId(filteredGroupItems[0].id)
      return
    }

    if (
      selectedGroupId &&
      filteredGroupItems.length > 0 &&
      !filteredGroupItems.some((item) => item.id === selectedGroupId)
    ) {
      setSelectedGroupId(filteredGroupItems[0].id)
    }
  }, [filteredGroupItems, selectedGroupId])

  const selectedPrivateItem =
    filteredPrivateItems.find((item) => item.key === selectedPrivateKey) ||
    privateItems.find((item) => item.key === selectedPrivateKey) ||
    null

  const selectedGroupItem =
    filteredGroupItems.find((item) => item.id === selectedGroupId) ||
    groupConversations.find((item) => item.id === selectedGroupId) ||
    null

  useEffect(() => {
    setMessageDraft('')
    setSyncError('')

    if (activeTab === 'private') {
      if (!selectedPrivateItem) {
        setMessages([])
        setMessagesLoading(false)
        return
      }

      if (selectedPrivateItem.type === 'private-contact') {
        setMessages([])
        setMessagesLoading(false)
        return
      }

      let isActive = true

      const loadDirectMessages = async () => {
        if (isActive) {
          setMessagesLoading(true)
        }

        try {
          const response = await getDirectMessagesApi(selectedPrivateItem.id)

          if (!isActive) return

          setMessages(response?.messages || [])
          setSyncError('')
        } catch (error) {
          if (!isActive) return
          setMessages([])
          setSyncError(error.message || 'Impossible de charger les messages prives.')
        } finally {
          if (isActive) {
            setMessagesLoading(false)
          }
        }
      }

      loadDirectMessages()
      const refreshInterval = window.setInterval(loadDirectMessages, 5000)

      return () => {
        isActive = false
        window.clearInterval(refreshInterval)
      }
    }

    if (!selectedGroupItem) {
      setMessages([])
      setMessagesLoading(false)
      return
    }

    let isActive = true

    const loadGroupMessages = async () => {
      if (isActive) {
        setMessagesLoading(true)
      }

      try {
        const response = await getGroupMessagesApi(selectedGroupItem.id)

        if (!isActive) return

        setMessages(response?.messages || [])
        setSyncError('')
      } catch (error) {
        if (!isActive) return
        setMessages([])
        setSyncError(error.message || 'Impossible de charger les messages du groupe.')
      } finally {
        if (isActive) {
          setMessagesLoading(false)
        }
      }
    }

    loadGroupMessages()
    const refreshInterval = window.setInterval(loadGroupMessages, 5000)

    return () => {
      isActive = false
      window.clearInterval(refreshInterval)
    }
  }, [activeTab, messagesRefreshKey, selectedGroupItem, selectedPrivateItem])

  const activeList = activeTab === 'private' ? filteredPrivateItems : filteredGroupItems
  const activeItem = activeTab === 'private' ? selectedPrivateItem : selectedGroupItem

  const handleSendMessage = async (event) => {
    event.preventDefault()

    if (!activeItem || !messageDraft.trim() || !currentUserId) {
      return
    }

    setSending(true)
    const trimmedMessage = messageDraft.trim()

    try {
      if (activeTab === 'private') {
        const result = await sendDirectMessageApi({
          conversationId:
            selectedPrivateItem?.type === 'private-conversation' ? selectedPrivateItem.id : '',
          senderId: currentUserId,
          senderProfile: currentUserProfile,
          recipientId: selectedPrivateItem?.participantId,
          recipientProfile: selectedPrivateItem?.participantProfile,
          content: trimmedMessage,
        })

        setDirectConversations((current) => {
          const existingConversation = current[result.conversationId] || {}

          return {
            ...current,
            [result.conversationId]: {
              ...existingConversation,
              id: result.conversationId,
              createdAt: existingConversation.createdAt || result.message.timestamp,
              updatedAt: result.message.timestamp,
              lastMessageAt: result.message.timestamp,
              lastMessagePreview: trimmedMessage,
              lastMessageAuthorId: currentUserId,
              totalMessages: Number(existingConversation.totalMessages || 0) + 1,
              participants: {
                ...(existingConversation.participants || {}),
                [currentUserId]: true,
                [selectedPrivateItem.participantId]: true,
              },
              participantProfiles: {
                ...(existingConversation.participantProfiles || {}),
                [currentUserId]: currentUserProfile,
                [selectedPrivateItem.participantId]: selectedPrivateItem.participantProfile,
              },
            },
          }
        })
        setMessages((current) => [...current, result.message])
        setSelectedPrivateKey(`conversation:${result.conversationId}`)
        setConversationsRefreshKey((value) => value + 1)
      } else {
        const createdMessage = await sendGroupMessageApi(selectedGroupItem.id, {
          authorId: currentUserId,
          authorName: currentUserProfile.username,
          content: trimmedMessage,
        })

        setMessages((current) => [...current, createdMessage])
      }

      setMessageDraft('')
      setMessagesRefreshKey((value) => value + 1)
    } catch (error) {
      console.error('Erreur lors de l envoi du message:', error)
      alert(error.message || 'Impossible d envoyer le message pour le moment.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <Navbar />

      <div className="w-full px-0 py-0">
        <div className="grid gap-0 xl:grid-cols-[360px_1fr]">
          <aside className="overflow-hidden rounded-none border border-slate-200 bg-white shadow-none">
            <div className="border-b border-slate-100 px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">Conversations</p>
                  <p className="text-sm text-slate-500">
                    {activeList.length} discussion{activeList.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4ff] text-sky-600">
                  <InboxIcon path="M4 7h16v10H4V7Zm0 0 8 6 8-6" className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 flex gap-2 rounded-full bg-slate-100 p-1">
                {[
                  { id: 'private', label: 'Prives' },
                  { id: 'groups', label: 'Groupes' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activeTab === tab.id
                        ? 'bg-white text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.08)]'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative mt-4">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                  <InboxIcon path="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.15 6.15a7.5 7.5 0 0 0 10.5 10.5Z" className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={
                    activeTab === 'private'
                      ? 'Rechercher un contact'
                      : 'Rechercher un groupe'
                  }
                  className="w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>
            </div>

            <div className="max-h-[720px] overflow-y-auto p-3">
              {activeTab === 'groups' && groupsLoading ? (
                <div className="px-3 py-10 text-center text-sm text-slate-400">
                  Chargement des conversations...
                </div>
              ) : activeList.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <InboxIcon path="M4 7h16v10H4V7Zm0 0 8 6 8-6" className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-700">
                    {activeTab === 'private'
                      ? 'Aucune conversation privee'
                      : 'Aucune conversation de groupe'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {activeTab === 'private'
                      ? 'Des que d autres utilisateurs existent dans la base, tu peux lancer un message prive sans le melanger aux groupes.'
                      : 'Rejoins un groupe ou commence un echange dans un groupe existant.'}
                  </p>
                </div>
              ) : (
                activeList.map((item) => {
                  const isActive =
                    activeTab === 'private'
                      ? item.key === selectedPrivateKey
                      : item.id === selectedGroupId

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        activeTab === 'private'
                          ? setSelectedPrivateKey(item.key)
                          : setSelectedGroupId(item.id)
                      }
                      className={`mb-2 w-full rounded-[24px] border px-4 py-4 text-left transition ${
                        isActive
                          ? 'border-sky-200 bg-[#eef5ff] shadow-[0_12px_30px_rgba(59,130,246,0.08)]'
                          : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0f172a,#334155,#64748b)] text-sm font-bold text-white">
                            {item.avatar ? (
                              <img src={item.avatar} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <span>{getInitial(item.name)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {item.name}
                              </p>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                {activeTab === 'private'
                                  ? item.type === 'private-contact'
                                    ? 'Nouveau'
                                    : 'Prive'
                                  : `${item.totalMessages} msg`}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-sm text-slate-500">
                              {item.lastAuthor ? `${item.lastAuthor}: ` : ''}
                              {item.lastMessage}
                            </p>
                          </div>
                        </div>

                        <span className="flex-shrink-0 text-xs font-medium text-slate-400">
                          {formatConversationTime(item.lastMessageAt)}
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          <section className="overflow-hidden rounded-none border border-slate-200 bg-white shadow-none">
            {activeItem ? (
              <>
                <div className="border-b border-slate-100 px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#dbeafe,#eff6ff)] text-lg font-bold text-slate-800">
                        {activeItem.avatar ? (
                          <img src={activeItem.avatar} alt={activeItem.name} className="h-full w-full object-cover" />
                        ) : (
                          <span>{getInitial(activeItem.name)}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xl font-bold text-slate-900">
                          {activeItem.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {activeTab === 'private'
                            ? activeItem.type === 'private-contact'
                              ? activeItem.email || 'Nouvelle conversation privee'
                              : `Conversation privee avec ${activeItem.name}`
                            : `${activeItem.memberCount} membres · Admin ${activeItem.adminName}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <div className="rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
                        {activeTab === 'private'
                          ? activeItem.type === 'private-contact'
                            ? 'Nouveau fil prive'
                            : 'Messages prives'
                          : `${activeItem.totalMessages} messages`}
                      </div>
                      <div className="rounded-full bg-[#eef5ff] px-3 py-2 text-sm font-medium text-sky-600">
                        {activeTab === 'private'
                          ? 'Flux prive distinct des groupes'
                          : `Derniere activite ${formatConversationTime(activeItem.lastMessageAt)}`}
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500">
                    {activeTab === 'private'
                      ? activeItem.type === 'private-contact'
                        ? 'Ce fil est totalement separe des discussions de groupe. Ton premier message va creer la conversation privee.'
                        : 'Cette conversation privee est stockee a part et ne se melange pas avec les messages de groupe.'
                      : activeItem.description}
                  </p>
                </div>

                <div className="flex min-h-[620px] flex-col">
                <div className="flex-1 space-y-4 overflow-y-auto bg-[#f8fbff] px-6 py-6">
                    {messagesLoading ? (
                      <div className="flex h-full min-h-[320px] items-center justify-center">
                        <div className="max-w-md text-center">
                          <p className="text-sm font-medium text-slate-500">
                            Chargement des messages...
                          </p>
                        </div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex h-full min-h-[320px] items-center justify-center">
                        <div className="max-w-md text-center">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-white text-slate-400 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                            <InboxIcon path="M4 7h16v10H4V7Zm0 0 8 6 8-6" className="h-7 w-7" />
                          </div>
                          <p className="mt-4 text-base font-semibold text-slate-800">
                            {activeTab === 'private'
                              ? 'Aucun message prive pour l instant'
                              : 'Aucun message pour l instant'}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            {activeTab === 'private'
                              ? 'Envoie le premier message. Cette discussion restera dans la section privee uniquement.'
                              : 'Lance la conversation dans ce groupe depuis cet onglet dedie aux groupes.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isCurrentUser = message.authorId === currentUserId

                        return (
                          <div
                            key={message.id}
                            className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                          >
                            <div
                              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                isCurrentUser
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-white text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)]'
                              }`}
                            >
                              {getInitial(message.authorName)}
                            </div>

                            <div className={`max-w-[78%] ${isCurrentUser ? 'text-right' : ''}`}>
                              <div
                                className={`mb-1 flex items-center gap-2 ${
                                  isCurrentUser ? 'justify-end' : ''
                                }`}
                              >
                                <span className="text-sm font-semibold text-slate-900">
                                  {message.authorName}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {formatMessageTime(message.timestamp)}
                                </span>
                              </div>

                              <div
                                className={`inline-block rounded-[22px] px-4 py-3 text-sm leading-6 ${
                                  isCurrentUser
                                    ? 'bg-slate-900 text-white'
                                    : 'border border-slate-200 bg-white text-slate-700'
                                }`}
                              >
                                {message.content}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}

                    {syncError && (
                      <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {syncError}
                      </div>
                    )}
                  </div>

                  <form
                    onSubmit={handleSendMessage}
                    className="border-t border-slate-100 bg-white px-6 py-5"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row">
                      <input
                        type="text"
                        value={messageDraft}
                        onChange={(event) => setMessageDraft(event.target.value)}
                        placeholder={
                          activeTab === 'private'
                            ? `Ecrire a ${activeItem.name}...`
                            : `Ecrire dans ${activeItem.name}...`
                        }
                        className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
                      />
                      <button
                        type="submit"
                        disabled={sending || !messageDraft.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <InboxIcon path="M6 12 3.75 3.75 20.25 12 3.75 20.25 6 12Zm0 0h8.25" className="h-4 w-4" />
                        {sending ? 'Envoi...' : 'Envoyer'}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex min-h-[620px] items-center justify-center px-6 py-12">
                <div className="max-w-md text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-100 text-slate-400">
                    <InboxIcon path="M4 7h16v10H4V7Zm0 0 8 6 8-6" className="h-7 w-7" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-slate-900">
                    Selectionne une conversation
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Choisis un fil dans l onglet actif pour lire l historique et envoyer un message.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
