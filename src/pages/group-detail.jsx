import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ChatBox from '../components/ChatBox'
import PostCard from '../components/PostCard'
import { useGroups } from '../context/GroupContext'
import { useAuth } from '../context/AuthContext'
import {
  createPostDiscussionApi,
  getPostDiscussionApi,
} from '../services/apiService'
import { initSocket, onGroupMessagesCount, leaveGroup } from '../services/socketService'
import {
  createPost,
  deletePost,
  getGroupBySlug,
  likePost,
  listenToGroupInvitations,
  saveGroupInviteAccess,
  listenToUsers,
  unlikePost,
  getPostLikes,
  saveGroupInvitations,
} from '../services/realtimeService'
import { sendInvitationNotification } from '../services/notificationService'

function formatFullDate(value) {
  if (!value) return 'Date inconnue'

  return new Date(value).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatShortDate(value) {
  if (!value) return 'recent'

  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  })
}

function isInvitationExpired(value) {
  if (!value) return false

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false

  return date.getTime() <= Date.now()
}

function createDemoImageDataUrl(label, startColor, endColor) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#bg)" rx="48" />
      <circle cx="940" cy="180" r="120" fill="rgba(255,255,255,0.16)" />
      <circle cx="280" cy="620" r="170" fill="rgba(255,255,255,0.12)" />
      <text x="80" y="160" fill="white" font-family="Arial, sans-serif" font-size="42" opacity="0.7">Netthex Demo</text>
      <text x="80" y="420" fill="white" font-family="Arial, sans-serif" font-size="76" font-weight="700">${label}</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Impossible de lire ce fichier.'))
    reader.readAsDataURL(file)
  })

function normalizeUserProfile(profile, fallback = {}) {
  return {
    id: profile?.uid || fallback.id || '',
    uid: profile?.uid || fallback.id || '',
    name: profile?.username || profile?.displayName || fallback.name || 'Utilisateur',
    email: profile?.email || fallback.email || '',
    avatar: profile?.avatar || fallback.avatar || '',
    status: fallback.status || 'Utilisateur Netthex',
  }
}

export default function GroupDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { groups, loading: groupsLoading, updateGroupDetails } = useGroups()
  const { currentUser, userData } = useAuth()
  const [groupId, setGroupId] = useState(null)
  const [group, setGroup] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [notificationsMuted, setNotificationsMuted] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [memberOnlineStatus, setMemberOnlineStatus] = useState({})
  const [inviteSearch, setInviteSearch] = useState('')
  const [selectedInvitees, setSelectedInvitees] = useState([])
  const [invitationCode, setInvitationCode] = useState('')
  const [invitationLink, setInvitationLink] = useState('')
  const [pendingInvitations, setPendingInvitations] = useState({})
  const [inviteMessage, setInviteMessage] = useState('')
  const [savingInvitations, setSavingInvitations] = useState(false)
  const [usersDirectory, setUsersDirectory] = useState({})
  const [totalMessages, setTotalMessages] = useState(0)
  const [showCreatePostModal, setShowCreatePostModal] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [postImage, setPostImage] = useState('')
  const [postImageName, setPostImageName] = useState('')
  const [postError, setPostError] = useState('')
  const [savingPost, setSavingPost] = useState(false)
  const [selectedPostForDiscussion, setSelectedPostForDiscussion] = useState(null)
  const [postDiscussionEntries, setPostDiscussionEntries] = useState([])
  const [discussionDraft, setDiscussionDraft] = useState('')
  const [discussionError, setDiscussionError] = useState('')
  const [savingDiscussion, setSavingDiscussion] = useState(false)
  const [likes, setLikes] = useState({}) // { postId: [userId1, userId2, ...] }
  const menuRef = useRef(null)
  const currentUserId = currentUser?.uid || ''

  // Générer code d'invitation unique
  const generateInvitationCode = () => {
    const code = `${groupId.slice(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
    const link = `${window.location.origin}/invite/${code}`
    return { code, link }
  }

  useEffect(() => {
    if (!showInviteModal || !currentUserId) {
      return undefined
    }

    const unsubscribeUsers = listenToUsers((snapshot) => {
      setUsersDirectory(snapshot.val() || {})
    })

    return () => unsubscribeUsers()
  }, [currentUserId, showInviteModal])

  useEffect(() => {
    if (!groupId) return undefined

    const unsubscribeInvitations = listenToGroupInvitations(groupId, (snapshot) => {
      setPendingInvitations(snapshot.val() || {})
    })

    return () => unsubscribeInvitations()
  }, [groupId])

  const activePendingInvitations = useMemo(
    () =>
      Object.entries(pendingInvitations || {}).reduce((accumulator, [id, invitation]) => {
        if (!isInvitationExpired(invitation?.expiresAt)) {
          accumulator[id] = invitation
        }
        return accumulator
      }, {}),
    [pendingInvitations],
  )

  const activeInviteAccess = useMemo(() => {
    if (!group?.inviteAccess || isInvitationExpired(group.inviteAccess.expiresAt)) {
      return null
    }

    return group.inviteAccess
  }, [group?.inviteAccess])

  useEffect(() => {
    if (!groupId || !currentUserId || group?.adminId !== currentUserId) {
      return
    }

    const expiredInvitationIds = Object.entries(pendingInvitations || {})
      .filter(([, invitation]) => isInvitationExpired(invitation?.expiresAt))
      .map(([id]) => id)

    if (expiredInvitationIds.length === 0 && !isInvitationExpired(group?.inviteAccess?.expiresAt)) {
      return
    }

    const cleanupExpiredData = async () => {
      try {
        if (expiredInvitationIds.length > 0) {
          const expiredUpdates = expiredInvitationIds.reduce((accumulator, id) => {
            accumulator[id] = null
            return accumulator
          }, {})
          await saveGroupInvitations(groupId, expiredUpdates)
        }

        if (isInvitationExpired(group?.inviteAccess?.expiresAt)) {
          await saveGroupInviteAccess(groupId, null)
        }
      } catch (error) {
        console.warn('Impossible de nettoyer les invitations expirees du groupe:', error)
      }
    }

    cleanupExpiredData()
  }, [currentUserId, group?.adminId, group?.inviteAccess?.expiresAt, groupId, pendingInvitations])

  const inviteableContacts = useMemo(() => {
    const excludedIds = new Set([
      currentUserId,
      group?.adminId,
      ...Object.keys(group?.members || {}),
      ...selectedInvitees.map((invitee) => invitee.id),
      ...Object.keys(activePendingInvitations || {}),
    ].filter(Boolean))

    return Object.entries(usersDirectory || {})
      .map(([uid, profile]) =>
        normalizeUserProfile(
          { uid, ...profile },
          {
            id: uid,
            status: profile?.email ? `Disponible via ${profile.email}` : 'Utilisateur Netthex',
          },
        ),
      )
      .filter((profile) => profile.id && !excludedIds.has(profile.id))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [activePendingInvitations, currentUserId, group?.adminId, group?.members, selectedInvitees, usersDirectory])

  // Filtrer les contacts et exclure les membres existants
  const filteredContacts = useMemo(() => {
    const query = inviteSearch.trim().toLowerCase()
    if (!query) return []

    return inviteableContacts.filter((contact) =>
      [contact.name, contact.email, contact.status]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    )
  }, [inviteSearch, inviteableContacts])

  // Générer le lien et message au monter la modale
  useEffect(() => {
    if (!showInviteModal || !group) {
      return
    }

    const { code: freshCode, link: freshLink } = generateInvitationCode()
    const code = activeInviteAccess?.code || freshCode
    const link = activeInviteAccess?.link || freshLink
    const message =
      activeInviteAccess?.message || `🎉 Rejoins ${group.name}! \n\n${link}\n\nCode: ${code}\n\n(Valable 30 jours)`

    setInvitationCode(code)
    setInvitationLink(link)
    setInviteMessage(message)
  }, [activeInviteAccess, group, showInviteModal])

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    alert(`✅ ${label} copié!`)
  }

  const shareToSocial = (platform) => {
    const text = encodeURIComponent(`Rejoins ${group.name}! ${invitationLink}`)
    const urls = {
      whatsapp: `https://wa.me/?text=${text}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(invitationLink)}`,
    }
    if (urls[platform]) {
      window.open(urls[platform], '_blank')
    }
  }

  const handleToggleInvitee = (contact) => {
    setSelectedInvitees((prev) => {
      const exists = prev.find((inv) => inv.id === contact.id)
      if (exists) {
        return prev.filter((inv) => inv.id !== contact.id)
      }
      return [...prev, { ...contact, invitedAt: new Date().toISOString(), status: 'pending' }]
    })
  }

  const handleSendInvitations = async () => {
    if (selectedInvitees.length === 0) {
      alert('⚠️ Sélectionnez au moins un contact')
      return
    }

    if (!currentUserId || !groupId || !group) {
      alert('❌ Groupe ou utilisateur introuvable')
      return
    }

    try {
      setSavingInvitations(true)

      const inviterName =
        userData?.username ||
        userData?.displayName ||
        currentUser.displayName ||
        currentUser.email?.split('@')[0] ||
        'Utilisateur'

      const invitedAt = new Date().toISOString()
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const invitationMessage = inviteMessage.trim()
      const invitationsPayload = selectedInvitees.reduce((acc, invitee) => {
        acc[invitee.id] = {
          name: invitee.name,
          email: invitee.email,
          avatar: invitee.avatar,
          invitedAt,
          status: 'pending',
          code: invitationCode,
          link: invitationLink,
          message: invitationMessage,
          expiresAt,
          groupId,
          groupName: group.name || 'Groupe',
          groupSlug: group.slug || slug,
          groupAvatar: group.avatar || '',
          invitedBy: {
            userId: currentUser.uid,
            name: inviterName,
            avatar: userData?.avatar || currentUser.photoURL || '',
          },
        }
        return acc
      }, {})

      await Promise.all([
        saveGroupInvitations(groupId, invitationsPayload),
        saveGroupInviteAccess(groupId, {
          code: invitationCode,
          link: invitationLink,
          message: invitationMessage,
          expiresAt,
          createdAt: invitedAt,
          createdBy: {
            userId: currentUser.uid,
            name: inviterName,
          },
        }),
      ])

      const notificationResults = await Promise.allSettled(
        selectedInvitees.map((invitee) =>
          sendInvitationNotification(invitee.id, {
            groupId,
            groupName: group.name || 'Groupe',
            groupAvatar: group.avatar || '',
            groupSlug: group.slug || slug,
            invitationMessage,
            invitationCode,
            invitationLink,
            fromId: currentUser.uid,
            fromName: inviterName,
            fromAvatar: userData?.avatar || currentUser.photoURL || '',
          }),
        ),
      )

      const sentNotificationsCount = notificationResults.filter(
        (result) => result.status === 'fulfilled',
      ).length

      setSelectedInvitees([])
      setInviteSearch('')
      setShowInviteModal(false)

      if (sentNotificationsCount === selectedInvitees.length) {
        alert(
          `✅ ${selectedInvitees.length} invitation(s) envoyée(s) et notifiées avec succès.`,
        )
      } else {
        alert(
          `⚠️ ${selectedInvitees.length} invitation(s) enregistrée(s), mais seulement ${sentNotificationsCount} notification(s) ont pu être envoyées.`,
        )
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('❌ Erreur lors de l\'envoi des invitations')
    } finally {
      setSavingInvitations(false)
    }
  }

  useEffect(() => {
    const loadGroup = async () => {
      if (!slug) return

      // D'abord, chercher dans le contexte
      const foundGroup = Object.entries(groups).find(([_, g]) => g?.slug === slug)
      if (foundGroup) {
        const [id, groupData] = foundGroup
        setGroupId(id)
        setGroup(groupData || null)
        if (groupData) {
          setTotalMessages(Object.keys(groupData?.messages || {}).length)
        }
      } else if (!groupsLoading) {
        // Si pas trouvé et groupsLoading terminé, chercher directement via API
        try {
          const foundGroupData = await getGroupBySlug(slug)
          if (foundGroupData) {
            setGroupId(foundGroupData.id)
            setGroup(foundGroupData)
            if (foundGroupData) {
              setTotalMessages(Object.keys(foundGroupData?.messages || {}).length)
            }
          } else {
            setGroup(null)
            setGroupId(null)
          }
        } catch (error) {
          console.error('Erreur lors du chargement du groupe:', error)
          setGroup(null)
          setGroupId(null)
        }
      }
    }

    loadGroup()
  }, [slug, groups, groupsLoading])

  // Générer les statuts en ligne persistants
  useEffect(() => {
    if (group) {
      const allMemberIds = new Set()
      
      if (group.adminId) allMemberIds.add(group.adminId)
      Object.keys(group.members || {}).forEach(id => allMemberIds.add(id))
      
      setMemberOnlineStatus(prev => {
        const updated = { ...prev }
        allMemberIds.forEach(id => {
          if (!updated.hasOwnProperty(id)) {
            updated[id] = Math.random() > 0.4 // Plus de probabilité d'être en ligne
          }
        })
        return updated
      })
    }
  }, [group?.adminId, group?.members])

  // Écouter les mises à jour du nombre de messages en temps réel via Socket.io
  useEffect(() => {
    if (!groupId || !currentUser?.uid) return

    try {
      const socket = initSocket(currentUser.uid)
      
      const unsubscribe = onGroupMessagesCount((data) => {
        if (data.groupId === groupId) {
          setTotalMessages(data.count)
        }
      })

      return unsubscribe
    } catch (error) {
      console.error('Erreur socket.io:', error)
    }
  }, [groupId, currentUser?.uid])

  // Fermer le menu au clic en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const colors = [
    'from-sky-400 via-blue-500 to-indigo-600',
    'from-fuchsia-400 via-pink-500 to-rose-500',
    'from-emerald-400 via-teal-500 to-cyan-500',
    'from-amber-400 via-orange-500 to-red-500',
    'from-violet-400 via-purple-500 to-indigo-600',
    'from-cyan-400 via-sky-500 to-blue-600',
  ]

  const gradientColor = colors[groupId?.charCodeAt(0) % colors.length] || colors[0]

  const fallbackGroupPosts = useMemo(() => {
    if (!group || Object.keys(group.posts || {}).length > 0) return []

    const groupName = group.name || 'Communaute'
    const adminName = group.adminName || 'Administrateur'

    return [
      {
        id: `${groupId}-demo-post-1`,
        authorId: `${groupId}-demo-admin`,
        authorName: adminName,
        authorRole: 'admin',
        content: `Bienvenue dans ${groupName}. Ce post fictif sert a montrer a quoi ressemble le feed avant les premieres vraies publications du groupe.`,
        createdAt: '2026-04-17T09:30:00.000Z',
      },
      {
        id: `${groupId}-demo-post-2`,
        authorId: `${groupId}-demo-member`,
        authorName: 'Membre test',
        authorRole: 'member',
        content: `Voici un exemple de publication pour lancer la conversation dans ${groupName}. Tu peux l utiliser comme inspiration pour ton premier vrai post.`,
        createdAt: '2026-04-17T08:45:00.000Z',
      },
      {
        id: `${groupId}-demo-post-3`,
        authorId: `${groupId}-demo-visual`,
        authorName: 'Studio demo',
        authorRole: 'member',
        content: `Exemple de post avec visuel pour illustrer la bibliotheque media du groupe et rendre la page plus vivante des le depart.`,
        createdAt: '2026-04-17T07:10:00.000Z',
        imageUrl: createDemoImageDataUrl(groupName, '#38bdf8', '#4f46e5'),
      },
    ]
  }, [group, groupId])

  const basePosts = useMemo(() => {
    if (!group) return []

    const storedPosts = Object.entries(group.posts || {})
      .map(([id, post]) => ({
        id,
        ...post,
        authorRole: post.authorRole || (post.authorId === group.adminId ? 'admin' : 'member'),
      }))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

    return storedPosts.length > 0 ? storedPosts : fallbackGroupPosts
  }, [fallbackGroupPosts, group])

  const posts = useMemo(() => {
    let allPosts = [...basePosts]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      allPosts = allPosts.filter(
        (post) =>
          post.content?.toLowerCase().includes(query) ||
          post.authorName?.toLowerCase().includes(query)
      )
    }

    return allPosts
  }, [basePosts, searchQuery])

  // Charger les likes des posts une fois la liste des posts calculee
  useEffect(() => {
    if (!groupId || posts.length === 0) {
      setLikes({})
      return
    }

    const loadLikes = async () => {
      try {
        const likesData = {}
        for (const post of posts) {
          if (post.id) {
            const postLikes = await getPostLikes(groupId, post.id)
            likesData[post.id] = postLikes
          }
        }
        setLikes(likesData)
      } catch (error) {
        console.error('Erreur chargement likes:', error)
      }
    }

    loadLikes()
  }, [groupId, posts])

  const mediaPosts = useMemo(
    () => posts.filter((post) => post.imageUrl),
    [posts],
  )
  const rawPosts = useMemo(() => basePosts, [basePosts])
  const rawMessages = useMemo(
    () =>
      Object.entries(group?.messages || {})
        .map(([id, message]) => ({ id, ...message }))
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)),
    [group],
  )
  const discussionCounts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(group?.discussion || {}).map(([postId, discussion]) => [
          postId,
          Object.keys(discussion || {}).length,
        ]),
      ),
    [group],
  )

  const members = useMemo(() => {
    if (!group) return []

    const map = new Map()

    if (group.adminId) {
      map.set(group.adminId, {
        id: group.adminId,
        name: group.adminName || 'Administrateur',
        role: 'Admin',
        isOnline: memberOnlineStatus[group.adminId] !== undefined ? memberOnlineStatus[group.adminId] : Math.random() > 0.5,
      })
    }

    Object.keys(group.members || {}).forEach((memberId, index) => {
      if (!map.has(memberId)) {
        map.set(memberId, {
          id: memberId,
          name: `Membre ${index + 1}`,
          role: 'Membre',
          isOnline: memberOnlineStatus[memberId] !== undefined ? memberOnlineStatus[memberId] : Math.random() > 0.3,
        })
      }
    })

    posts.forEach((post) => {
      if (post.authorId && !map.has(post.authorId)) {
        map.set(post.authorId, {
          id: post.authorId,
          name: post.authorName || 'Membre',
          role: 'Contributeur',
          isOnline: memberOnlineStatus[post.authorId] !== undefined ? memberOnlineStatus[post.authorId] : Math.random() > 0.6,
        })
      }
    })

    Object.values(group.messages || {}).forEach((message) => {
      if (message.authorId && !map.has(message.authorId)) {
        map.set(message.authorId, {
          id: message.authorId,
          name: message.authorName || 'Membre',
          role: 'Actif',
          isOnline: memberOnlineStatus[message.authorId] !== undefined ? memberOnlineStatus[message.authorId] : Math.random() > 0.4,
        })
      }
    })

    return Array.from(map.values()).slice(0, 8)
  }, [group, posts, memberOnlineStatus])

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members
    const query = searchQuery.toLowerCase()
    return members.filter((member) =>
      [member.name, member.role].filter(Boolean).some((value) => value.toLowerCase().includes(query))
    )
  }, [members, searchQuery])
  const pendingInviteEntries = useMemo(
    () =>
      Object.entries(activePendingInvitations)
        .map(([id, invitation]) => ({ id, ...invitation }))
        .sort((a, b) => new Date(b.invitedAt || 0) - new Date(a.invitedAt || 0)),
    [activePendingInvitations],
  )
  const recentActivity = useMemo(() => {
    const postActivity = rawPosts.slice(0, 3).map((post) => ({
      id: `post-${post.id}`,
      title: `${post.authorName || 'Membre'} a publie`,
      detail: post.content || 'Nouvelle publication dans le groupe.',
      date: post.createdAt,
      type: 'post',
    }))
    const messageActivity = rawMessages.slice(0, 3).map((message) => ({
      id: `message-${message.id}`,
      title: `${message.authorName || 'Membre'} a envoye un message`,
      detail: message.content || 'Nouveau message dans la discussion.',
      date: message.timestamp,
      type: 'message',
    }))

    return [...postActivity, ...messageActivity]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 5)
  }, [rawMessages, rawPosts])

  // Compter les liens partagés dans les messages
  const sharedLinksCount = useMemo(() => {
    if (!group?.messages) return 0
    return Object.values(group.messages || {}).filter((msg) =>
      msg.content?.includes('http://') || msg.content?.includes('https://')
    ).length
  }, [group])

  const storyMembers = useMemo(() => members.slice(0, 6), [members])
  const quickContacts = useMemo(() => members.slice(0, 5), [members])
  const joinRequests = useMemo(
    () =>
      inviteableContacts.slice(0, 2).map((contact, index) => ({
        ...contact,
        note: index === 0 ? 'souhaite rejoindre la conversation' : 'veut acceder au feed prive',
      })),
    [inviteableContacts]
  )
  const suggestions = useMemo(() => inviteableContacts.slice(2, 7), [inviteableContacts])
  const onlineMembers = useMemo(() => members.filter((member) => member.isOnline).slice(0, 4), [members])
  const groupLocation = group?.createdAt ? `Lance le ${formatFullDate(group.createdAt)}` : 'Communaute Netthex'
  const leftNavItems = [
    { id: 'overview', label: 'Apercu', info: 'Vue rapide' },
    { id: 'posts', label: 'Publications', info: `${posts.length} posts` },
    { id: 'chat', label: 'Discussion', info: `${totalMessages} messages` },
    { id: 'members', label: 'Membres', info: `${members.length} visibles` },
    { id: 'media', label: 'Medias', info: `${mediaPosts.length} images` },
    { id: 'about', label: 'A propos', info: 'Infos du groupe' },
  ]
  const centerViewMeta = {
    overview: {
      badge: 'Resume utile',
      title: 'Vue d ensemble du groupe',
      description: 'Une synthese rapide du groupe avec ses stats, ses derniers posts, ses membres actifs et ses medias.',
    },
    posts: {
      badge: 'Contenu social',
      title: 'Publications du groupe',
      description: 'Le fil social du groupe avec les posts, visuels et prises de parole des membres.',
    },
    chat: {
      badge: 'Conversation',
      title: 'Discussion du groupe',
      description: 'La conversation en direct pour echanger, coordonner et suivre les messages recents.',
    },
    members: {
      badge: 'Annuaire',
      title: 'Membres du groupe',
      description: 'L annuaire des membres pour retrouver les profils, roles et disponibilites rapidement.',
    },
    media: {
      badge: 'Bibliotheque',
      title: 'Bibliotheque media',
      description: 'Les images et contenus visuels partages dans le groupe, regroupes dans une seule galerie.',
    },
    about: {
      badge: 'Fiche groupe',
      title: 'Informations du groupe',
      description: 'La fiche de reference du groupe avec sa description, son admin, sa date de creation et ses indicateurs utiles.',
    },
  }
  const activeView = centerViewMeta[activeTab] || centerViewMeta.overview

  const isAdmin = currentUser?.uid === group?.adminId
  const isMember = currentUser?.uid && (group?.adminId === currentUser.uid || group?.members?.[currentUser.uid])
  const canManagePost = (post) => {
    if (!currentUser?.uid || !post) return false
    return isAdmin || post.authorId === currentUser.uid
  }

  // Handlers
  const handleJoinGroup = async () => {
    if (!currentUser) {
      navigate('/auth')
      return
    }
    
    try {
      await updateGroupDetails(groupId, {
        members: {
          ...group.members,
          [currentUser.uid]: true,
        },
      })
      alert('✅ Vous avez rejoint le groupe!')
    } catch (error) {
      console.error('Erreur:', error)
      alert('❌ Erreur lors de la connexion au groupe')
    }
  }

  const handleLeaveGroup = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir quitter ce groupe?')) return
    
    try {
      // 1. Supprimer de Firebase
      const newMembers = { ...group.members }
      delete newMembers[currentUser.uid]
      
      await updateGroupDetails(groupId, {
        members: newMembers,
      })

      // 2. Notifier via Socket.io que l'utilisateur quitte
      try {
        leaveGroup(groupId, currentUser.uid)
      } catch (socketError) {
        console.warn('Erreur Socket.io:', socketError)
      }

      // 3. Nettoyer l'état local
      setMemberOnlineStatus(prev => {
        const updated = { ...prev }
        delete updated[currentUser.uid]
        return updated
      })

      // 4. Rediriger vers l'accueil
      navigate('/')
      alert('✅ Vous avez quitté le groupe. Vos messages restent visibles dans l\'historique.')
    } catch (error) {
      console.error('Erreur:', error)
      alert('❌ Erreur lors de la suppression du groupe')
    }
  }

  const handleReportGroup = async () => {
    if (!reportReason.trim()) {
      alert('⚠️ Veuillez entrer une raison')
      return
    }

    try {
      console.log(`Signalement du groupe ${groupId}: ${reportReason}`)
      alert('✅ Merci! Le groupe a été signalé. Notre équipe l\'examinera.')
      setShowReportModal(false)
      setReportReason('')
    } catch (error) {
      console.error('Erreur:', error)
      alert('❌ Erreur lors du signalement')
    }
  }

  const handleStartCall = (type) => {
    alert(`📞 ${type === 'voice' ? 'Appel audio' : 'Appel vidéo'} - Fonctionnalité en développement`)
  }

  const handleStartPrivateChat = (member) => {
    setSelectedMemberForChat(member)
    alert(`💬 Discussion avec ${member.name} - Fonctionnalité en développement`)
  }

  const resetCreatePostForm = () => {
    setPostContent('')
    setPostImage('')
    setPostImageName('')
    setPostError('')
    setSavingPost(false)
  }

  const handleOpenCreatePostModal = () => {
    if (!currentUser) {
      navigate('/auth')
      return
    }

    if (!isMember) {
      alert('🔒 Seuls les membres du groupe peuvent publier.')
      return
    }

    setPostError('')
    setShowCreatePostModal(true)
  }

  const handlePostImageChange = async (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      setPostImage('')
      setPostImageName('')
      return
    }

    if (!file.type.startsWith('image/')) {
      setPostError('Ajoute une image valide pour illustrer le post.')
      event.target.value = ''
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setPostImage(dataUrl)
      setPostImageName(file.name)
      setPostError('')
    } catch (error) {
      console.error('Erreur lecture image:', error)
      setPostError(error.message || 'Impossible de charger cette image.')
    } finally {
      event.target.value = ''
    }
  }

  const handleCreatePost = async (event) => {
    event.preventDefault()

    if (!currentUser) {
      navigate('/auth')
      return
    }

    if (!isMember) {
      setPostError('Seuls les membres du groupe peuvent publier.')
      return
    }

    const normalizedContent = postContent.trim()
    if (!normalizedContent && !postImage) {
      setPostError('Ajoute un texte ou une image avant de publier.')
      return
    }

    setSavingPost(true)
    setPostError('')

    const createdAt = new Date().toISOString()
    const draftPost = {
      authorId: currentUser.uid,
      authorName:
        userData?.displayName ||
        currentUser.displayName ||
        userData?.username ||
        currentUser.email?.split('@')[0] ||
        'Membre',
      authorRole: isAdmin ? 'admin' : 'member',
      content: normalizedContent,
      imageUrl: postImage || undefined,
      createdAt,
    }

    try {
      const postId = await createPost(groupId, draftPost)

      setGroup((current) => {
        if (!current) return current

        return {
          ...current,
          posts: {
            ...(current.posts || {}),
            [postId]: draftPost,
          },
        }
      })

      resetCreatePostForm()
      setShowCreatePostModal(false)
      setSearchQuery('')
      setActiveTab('posts')
    } catch (error) {
      console.error('Erreur creation post:', error)
      setPostError(error.message || 'Impossible de publier ce post pour le moment.')
    } finally {
      setSavingPost(false)
    }
  }

  const handleDeletePost = async (postId) => {
    if (!groupId || !postId) return

    const targetPost = posts.find((post) => post.id === postId)

    if (!targetPost || !canManagePost(targetPost)) {
      alert('🔒 Vous ne pouvez pas supprimer ce post.')
      return
    }

    const confirmDelete = window.confirm('Supprimer cette publication ?')
    if (!confirmDelete) return

    try {
      await deletePost(groupId, postId)

      setGroup((current) => {
        if (!current) return current

        const nextPosts = { ...(current.posts || {}) }
        delete nextPosts[postId]

        return {
          ...current,
          posts: nextPosts,
        }
      })
    } catch (error) {
      console.error('Erreur suppression post:', error)
      alert(error.message || 'Impossible de supprimer ce post pour le moment.')
    }
  }

  const handleLikePost = async (postId, shouldLike) => {
    if (!groupId || !postId || !currentUser?.uid) return

    try {
      if (shouldLike) {
        await likePost(groupId, postId, currentUser.uid)
      } else {
        await unlikePost(groupId, postId, currentUser.uid)
      }

      // Mettre à jour l'état des likes
      setLikes((prevLikes) => {
        const postLikes = prevLikes[postId] || []
        if (shouldLike) {
          return {
            ...prevLikes,
            [postId]: [...postLikes, currentUser.uid],
          }
        } else {
          return {
            ...prevLikes,
            [postId]: postLikes.filter((uid) => uid !== currentUser.uid),
          }
        }
      })
    } catch (error) {
      console.error('Erreur like post:', error)
      alert(error.message || 'Impossible de liker ce post pour le moment.')
    }
  }

  useEffect(() => {
    if (!selectedPostForDiscussion?.id) {
      return
    }

    let isActive = true

    const loadDiscussion = async () => {
      try {
        const response = await getPostDiscussionApi(groupId, selectedPostForDiscussion.id)

        if (!isActive) return

        setPostDiscussionEntries(response?.discussion || [])
        setDiscussionError('')
      } catch (error) {
        if (!isActive) return

        setPostDiscussionEntries([])
        setDiscussionError(
          error.message || 'Impossible de charger la discussion de ce post pour le moment.',
        )
      }
    }

    loadDiscussion()
    const refreshInterval = window.setInterval(loadDiscussion, 5000)

    return () => {
      isActive = false
      window.clearInterval(refreshInterval)
    }
  }, [groupId, selectedPostForDiscussion])

  const handleOpenPostDiscussion = (post) => {
    setSelectedPostForDiscussion(post)
    setDiscussionDraft('')
    setDiscussionError('')
  }

  const handleClosePostDiscussion = () => {
    setSelectedPostForDiscussion(null)
    setPostDiscussionEntries([])
    setDiscussionDraft('')
    setDiscussionError('')
    setSavingDiscussion(false)
  }

  const handleCreatePostDiscussion = async (event) => {
    event.preventDefault()

    if (!currentUser) {
      navigate('/auth')
      return
    }

    if (!isMember || !selectedPostForDiscussion?.id) {
      setDiscussionError('Seuls les membres du groupe peuvent participer a cette discussion.')
      return
    }

    const normalizedDiscussion = discussionDraft.trim()

    if (!normalizedDiscussion) {
      setDiscussionError('Ajoute un message avant de participer a la discussion.')
      return
    }

    setSavingDiscussion(true)
    setDiscussionError('')

    const createdAt = new Date().toISOString()
    const draftDiscussion = {
      authorId: currentUser.uid,
      authorName:
        userData?.displayName ||
        currentUser.displayName ||
        userData?.username ||
        currentUser.email?.split('@')[0] ||
        'Membre',
      content: normalizedDiscussion,
      createdAt,
    }

    try {
      const createdDiscussion = await createPostDiscussionApi(
        groupId,
        selectedPostForDiscussion.id,
        draftDiscussion,
      )

      setPostDiscussionEntries((current) => [...current, createdDiscussion])
      setGroup((current) => {
        if (!current) return current

        return {
          ...current,
          discussion: {
            ...(current.discussion || {}),
            [selectedPostForDiscussion.id]: {
              ...(current.discussion?.[selectedPostForDiscussion.id] || {}),
              [createdDiscussion.id]: {
                ...draftDiscussion,
                createdAt: createdDiscussion.createdAt || draftDiscussion.createdAt,
              },
            },
          },
        }
      })

      setDiscussionDraft('')
    } catch (error) {
      console.error('Erreur discussion post:', error)
      setDiscussionError(error.message || 'Impossible de publier cette discussion pour le moment.')
    } finally {
      setSavingDiscussion(false)
    }
  }

  if (groupsLoading) {
    return (
      <div className="min-h-screen bg-[#eef2f7]">
        <Navbar />
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-[32px] border border-slate-200 bg-white px-8 py-10 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="mb-4 text-4xl">⏳</div>
            <p className="text-slate-500">Chargement du groupe...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-[#eef2f7]">
        <Navbar />
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-[32px] border border-slate-200 bg-white px-8 py-10 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="mb-4 text-4xl">😅</div>
            <p className="text-slate-500">Groupe non trouvé</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#eef2f7] text-slate-900">
      <Navbar />

      <div className="w-full px-0 pt-0 pb-8">
        <div className="overflow-hidden border border-white/70 bg-[#fcfcfe] shadow-[0_35px_120px_rgba(15,23,42,0.10)]">
          <div className="grid xl:h-[calc(100vh-58px)] xl:grid-cols-[290px_minmax(0,1fr)_310px]">
            <aside className="border-b border-slate-200/80 bg-[#f8f9fd] p-6 xl:overflow-y-auto xl:border-b-0 xl:border-r">
              <div className="flex flex-col items-center text-center">
                {group.avatar ? (
                  <img
                    src={group.avatar}
                    alt={group.name}
                    className="h-20 w-20 rounded-full object-cover shadow-[0_18px_40px_rgba(14,165,233,0.25)]"
                  />
                ) : (
                  <div className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${gradientColor} text-3xl font-bold text-white shadow-[0_18px_40px_rgba(14,165,233,0.25)]`}>
                    {group.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <h2 className="mt-4 text-xl font-bold text-slate-900">{group.name}</h2>
                <p className="mt-1 text-sm text-slate-400">{groupLocation}</p>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-slate-900">{posts.length}</p>
                  <p className="text-[11px] text-slate-400">Posts</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{Object.keys(group.members || {}).length || members.length || 1}</p>
                  <p className="text-[11px] text-slate-400">Membres</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{totalMessages}</p>
                  <p className="text-[11px] text-slate-400">Chats</p>
                </div>
              </div>

              <div className="mt-8 space-y-1 border-t border-dashed border-slate-200 pt-6">
                {leftNavItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
                      activeTab === item.id
                        ? 'bg-white text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.08)]'
                        : 'text-slate-500 hover:bg-white/80 hover:text-slate-900'
                    }`}
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-slate-400">{item.info}</span>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={isMember ? handleLeaveGroup : handleJoinGroup}
                  className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isMember ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-sky-600 text-white hover:bg-sky-700'
                  }`}
                >
                  {isMember ? 'Quitter le groupe' : 'Rejoindre le groupe'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Inviter des membres
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(true)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Parametres du groupe
                  </button>
                )}
              </div>

              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Contacts</h3>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(true)}
                    className="text-xs font-semibold text-sky-600 transition hover:text-sky-700"
                  >
                    Voir tout
                  </button>
                </div>

                <div className="space-y-3">
                  {quickContacts.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleStartPrivateChat(member)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-3 text-left shadow-[0_8px_28px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5"
                    >
                      <div className="relative">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500 text-sm font-bold text-white">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        {member.isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{member.name}</p>
                        <p className="text-xs text-slate-400">{member.role}</p>
                      </div>
                      <span className="text-xs text-slate-300">{formatShortDate(group.createdAt)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <section className="min-w-0 border-b border-slate-200/80 bg-white xl:overflow-y-auto xl:border-b-0 xl:border-r">
              <div className="border-b border-slate-200/80 px-5 py-6 sm:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative max-w-xl flex-1">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-300">⌕</span>
                    <input
                      type="text"
                      placeholder={
                        activeTab === 'posts'
                          ? 'Chercher dans les publications...'
                          : activeTab === 'chat'
                            ? 'Chercher dans la discussion...'
                            : activeTab === 'members'
                              ? 'Chercher un membre...'
                              : activeTab === 'media'
                                ? 'Chercher dans les medias...'
                                : 'Chercher dans le groupe...'
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-full border border-slate-200 bg-[#fafbff] px-5 py-3 pl-11 text-sm text-slate-900 placeholder-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-300 transition hover:text-slate-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenCreatePostModal}
                      disabled={!isMember}
                      title={isMember ? 'Creer un post' : 'Seuls les membres du groupe peuvent publier'}
                      className={`rounded-full px-5 py-3 text-sm font-semibold text-white transition ${
                        isMember
                          ? 'bg-gradient-to-r from-fuchsia-500 to-sky-500 shadow-[0_18px_35px_rgba(168,85,247,0.24)] hover:brightness-105'
                          : 'cursor-not-allowed bg-slate-300 shadow-none'
                      }`}
                    >
                      + Create new post
                    </button>
                    <div className="relative" ref={menuRef}>
                      <button
                        type="button"
                        onClick={() => setShowMenu(!showMenu)}
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                      >
                        •••
                      </button>
                      {showMenu && (
                        <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
                          {isMember && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowMenu(false)
                                setNotificationsMuted(!notificationsMuted)
                                alert(notificationsMuted ? '🔔 Notifications activées' : '🔕 Notifications désactivées')
                              }}
                              className="block w-full rounded-2xl px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                            >
                              {notificationsMuted ? '🔔 Activer les notifications' : '🔕 Mute les notifications'}
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowMenu(false)
                                setShowSettingsModal(true)
                              }}
                              className="block w-full rounded-2xl px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                            >
                              ⚙️ Paramètres du groupe
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setShowMenu(false)
                              setShowReportModal(true)
                            }}
                            className="block w-full rounded-2xl px-4 py-3 text-left text-sm text-red-600 transition hover:bg-red-50"
                          >
                            🚨 Signaler le groupe
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowMenu(false)
                              if (isMember) {
                                handleLeaveGroup()
                              } else {
                                handleJoinGroup()
                              }
                            }}
                            className={`block w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
                              isMember ? 'text-red-600 hover:bg-red-50' : 'text-sky-600 hover:bg-sky-50'
                            }`}
                          >
                            {isMember ? '❌ Quitter le groupe' : '👥 Rejoindre le groupe'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-[30px] border border-slate-200 bg-[#fbfcff] p-5 shadow-[0_14px_35px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">{activeView.badge}</p>
                      <h3 className="mt-3 text-2xl font-bold text-slate-900">{activeView.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-500">{activeView.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                        {Object.keys(group.members || {}).length || members.length || 1} membres
                      </span>
                      <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                        {posts.length} posts
                      </span>
                      <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                        {totalMessages} messages
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {leftNavItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          activeTab === item.id
                            ? 'bg-sky-600 text-white shadow-[0_10px_24px_rgba(14,165,233,0.22)]'
                            : 'bg-white text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[#fcfdff] px-5 py-6 sm:px-8">
                {!isMember ? (
                  <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                    <p className="text-5xl">🔒</p>
                    <p className="mt-4 text-lg font-semibold text-slate-900">Vous ne faites pas partie de ce groupe</p>
                    <p className="mt-2 text-sm text-slate-400">
                      Rejoignez le groupe pour accéder au contenu et participer aux conversations.
                    </p>
                    <button
                      type="button"
                      onClick={handleJoinGroup}
                      className="mt-6 rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
                    >
                      👥 Rejoindre maintenant
                    </button>
                  </div>
                ) : activeTab === 'overview' ? (
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                    <div className="space-y-5">
                      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                        {group.avatar && (
                          <div className="mb-6 flex justify-center">
                            <img
                              src={group.avatar}
                              alt={group.name}
                              className="h-32 w-32 rounded-full object-cover shadow-[0_18px_40px_rgba(14,165,233,0.25)]"
                            />
                          </div>
                        )}
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Resume</p>
                        <h2 className="mt-3 text-2xl font-bold text-slate-900">{group.name}</h2>
                        <p className="mt-3 text-sm leading-7 text-slate-500">{group.description}</p>
                        <div className="mt-6 grid grid-cols-3 gap-3">
                          <div className="rounded-2xl bg-[#f4f7fc] p-4 text-center">
                            <p className="text-xl font-bold text-slate-900">{Object.keys(group.members || {}).length || members.length || 1}</p>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Membres</p>
                          </div>
                          <div className="rounded-2xl bg-[#f4f7fc] p-4 text-center">
                            <p className="text-xl font-bold text-slate-900">{posts.length}</p>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Posts</p>
                          </div>
                          <div className="rounded-2xl bg-[#f4f7fc] p-4 text-center">
                            <p className="text-xl font-bold text-slate-900">{totalMessages}</p>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Messages</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-slate-900">Publications recentes</h3>
                          <button
                            type="button"
                            onClick={() => setActiveTab('posts')}
                            className="text-sm font-semibold text-sky-600 transition hover:text-sky-700"
                          >
                            Voir tout
                          </button>
                        </div>
                        <div className="mt-4 space-y-4">
                          {posts.slice(0, 2).length > 0 ? (
                            posts.slice(0, 2).map((post) => (
                              <PostCard
                                key={post.id}
                                post={post}
                                theme="light"
                                canDelete={canManagePost(post)}
                                onDelete={() => handleDeletePost(post.id)}
                                discussionCount={discussionCounts[post.id] || 0}
                                onOpenDiscussion={() => handleOpenPostDiscussion(post)}
                                isLiked={(likes[post.id] || []).includes(currentUser?.uid)}
                                likesCount={(likes[post.id] || []).length}
                                onLike={(shouldLike) => handleLikePost(post.id, shouldLike)}
                                groupId={groupId}
                              />
                            ))
                          ) : (
                            <p className="text-sm text-slate-400">Aucune publication recente pour le moment.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-slate-900">Membres actifs</h3>
                          <button
                            type="button"
                            onClick={() => setActiveTab('members')}
                            className="text-sm font-semibold text-sky-600 transition hover:text-sky-700"
                          >
                            Tous
                          </button>
                        </div>
                        <div className="mt-4 space-y-3">
                          {members.slice(0, 5).map((member) => (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => setSelectedMember(member)}
                              className="flex w-full items-center gap-3 rounded-2xl bg-[#f8fbff] px-4 py-3 text-left transition hover:bg-slate-50"
                            >
                              <div className="relative">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-sm font-bold text-white">
                                  {member.name.charAt(0).toUpperCase()}
                                </div>
                                {member.isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-slate-900">{member.name}</p>
                                <p className="text-xs text-slate-400">{member.role}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-slate-900">Medias partages</h3>
                          <button
                            type="button"
                            onClick={() => setActiveTab('media')}
                            className="text-sm font-semibold text-sky-600 transition hover:text-sky-700"
                          >
                            Galerie
                          </button>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          {mediaPosts.slice(0, 4).length > 0 ? (
                            mediaPosts.slice(0, 4).map((post) => (
                              <img
                                key={post.id}
                                src={post.imageUrl}
                                alt={post.authorName || 'Media'}
                                className="h-28 w-full rounded-2xl object-cover"
                              />
                            ))
                          ) : (
                            <p className="col-span-2 text-sm text-slate-400">Aucun media partage pour le moment.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'posts' ? (
                  posts.length > 0 ? (
                    <div className="space-y-5">
                      {posts.map((post) => (
                        <PostCard
                          key={post.id}
                          post={post}
                          theme="light"
                          canDelete={canManagePost(post)}
                          onDelete={() => handleDeletePost(post.id)}
                          discussionCount={discussionCounts[post.id] || 0}
                          onOpenDiscussion={() => handleOpenPostDiscussion(post)}
                          isLiked={(likes[post.id] || []).includes(currentUser?.uid)}
                          likesCount={(likes[post.id] || []).length}
                          onLike={(shouldLike) => handleLikePost(post.id, shouldLike)}
                          groupId={groupId}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                      <p className="text-5xl">{searchQuery ? '🔍' : '📭'}</p>
                      <p className="mt-4 text-lg font-semibold text-slate-900">
                        {searchQuery ? 'Aucun résultat trouvé' : 'Aucune publication pour le moment'}
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        {searchQuery ? 'Essayez une autre recherche' : 'Les nouvelles publications du groupe apparaitront ici.'}
                      </p>
                    </div>
                  )
                ) : activeTab === 'members' ? (
                  filteredMembers.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {filteredMembers.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => setSelectedMember(member)}
                          className="flex items-center gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-5 text-left shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition hover:border-sky-200"
                        >
                          <div className="relative">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-lg font-bold text-white">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            {member.isOnline && <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-400" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-lg font-bold text-slate-900">{member.name}</p>
                            <p className="mt-1 text-sm text-slate-400">{member.role}</p>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-500">
                              {member.isOnline ? 'En ligne' : 'Hors ligne'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                      <p className="text-5xl">👥</p>
                      <p className="mt-4 text-lg font-semibold text-slate-900">Aucun membre trouvé</p>
                    </div>
                  )
                ) : activeTab === 'media' ? (
                  mediaPosts.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {mediaPosts.map((post) => (
                        <div key={post.id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                          <img src={post.imageUrl} alt={post.authorName || 'Media'} className="h-52 w-full object-cover" />
                          <div className="p-4">
                            <p className="font-semibold text-slate-900">{post.authorName || 'Membre'}</p>
                            <p className="mt-1 text-sm text-slate-400">{formatShortDate(post.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                      <p className="text-5xl">🖼️</p>
                      <p className="mt-4 text-lg font-semibold text-slate-900">Aucun media disponible</p>
                    </div>
                  )
                ) : activeTab === 'about' ? (
                  <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">A propos du groupe</p>
                    <h2 className="mt-3 text-3xl font-bold text-slate-900">{group.name}</h2>
                    <p className="mt-4 text-sm leading-7 text-slate-500">{group.description}</p>
                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl bg-[#f4f7fc] p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Creation</p>
                        <p className="mt-2 text-lg font-bold text-slate-900">{formatFullDate(group.createdAt)}</p>
                      </div>
                      <div className="rounded-2xl bg-[#f4f7fc] p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Administrateur</p>
                        <p className="mt-2 text-lg font-bold text-slate-900">{group.adminName || group.adminId}</p>
                      </div>
                      <div className="rounded-2xl bg-[#f4f7fc] p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Liens partages</p>
                        <p className="mt-2 text-lg font-bold text-slate-900">{sharedLinksCount}</p>
                      </div>
                      <div className="rounded-2xl bg-[#f4f7fc] p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Membres visibles</p>
                        <p className="mt-2 text-lg font-bold text-slate-900">{members.length}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[30px] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                    <ChatBox groupId={groupId} theme="light" />
                  </div>
                )}
              </div>
            </section>

            <aside className="bg-[#f8f9fd] p-6 xl:overflow-y-auto">
              <div className="bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Membres en ligne</h3>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-600">
                    {onlineMembers.length}
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  {(onlineMembers.length > 0 ? onlineMembers : members.slice(0, 4)).map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedMember(member)}
                      className="flex w-full items-center gap-3 text-left"
                    >
                      <div className="relative">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${gradientColor} text-sm font-bold text-white`}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{member.name}</p>
                        <p className="text-xs text-slate-400">{member.role}</p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-500">online</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Invitations en attente</h3>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(true)}
                    className="text-xs font-semibold text-sky-600 transition hover:text-sky-700"
                  >
                    Inviter
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {pendingInviteEntries.length > 0 ? (
                    pendingInviteEntries.map((invite) => (
                      <div key={invite.id} className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-sm font-bold text-white">
                          {invite.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-900">{invite.name}</p>
                          <p className="text-xs text-slate-400">Envoye le {formatShortDate(invite.invitedAt)}</p>
                        </div>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-600">
                          pending
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-[#f8fbff] px-4 py-5 text-sm text-slate-400">
                      Aucune invitation en attente pour le moment.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Raccourcis admin</h3>
                  <span className="text-xs text-slate-400">{isAdmin ? 'admin' : 'membre'}</span>
                </div>

                <div className="mt-4 space-y-3">
                  {isAdmin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowSettingsModal(true)}
                        className="flex w-full items-center justify-between rounded-2xl bg-[#f8fbff] px-4 py-3 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                      >
                        <span>Modifier le groupe</span>
                        <span className="text-slate-300">›</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowInviteModal(true)}
                        className="flex w-full items-center justify-between rounded-2xl bg-[#f8fbff] px-4 py-3 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                      >
                        <span>Inviter des membres</span>
                        <span className="text-slate-300">›</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('members')}
                        className="flex w-full items-center justify-between rounded-2xl bg-[#f8fbff] px-4 py-3 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                      >
                        <span>Gerer les membres</span>
                        <span className="text-slate-300">›</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotificationsMuted((value) => !value)}
                        className="flex w-full items-center justify-between rounded-2xl bg-[#f8fbff] px-4 py-3 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                      >
                        <span>{notificationsMuted ? 'Activer les notifications' : 'Couper les notifications'}</span>
                        <span className="text-slate-300">›</span>
                      </button>
                    </>
                  ) : (
                    <div className="rounded-2xl bg-[#f8fbff] px-4 py-5 text-sm text-slate-400">
                      Ce bloc affiche les raccourcis de moderation quand tu es administrateur du groupe.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Activite recente</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('posts')}
                    className="text-xs font-semibold text-sky-600 transition hover:text-sky-700"
                  >
                    Voir le feed
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((item) => (
                      <div key={item.id} className="flex items-start gap-3">
                        <div className={`mt-1 h-2.5 w-2.5 rounded-full ${item.type === 'post' ? 'bg-sky-500' : 'bg-emerald-500'}`} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900">{item.title}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.detail}</p>
                          <p className="mt-2 text-xs text-slate-400">{formatShortDate(item.date)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-[#f8fbff] px-4 py-5 text-sm text-slate-400">
                      Aucune activite recente pour le moment.
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Modale profil membre */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 p-6">
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold text-slate-900">Profil membre</h2>
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="text-slate-400 transition hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="text-center">
                <div className="relative mx-auto h-20 w-20">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-2xl font-bold text-white">
                    {selectedMember.name.charAt(0).toUpperCase()}
                  </div>
                  {selectedMember.isOnline && (
                    <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-2 border-white bg-green-500" />
                  )}
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{selectedMember.name}</h3>
                <p className="text-sm text-slate-400">
                  {selectedMember.role}
                  {selectedMember.isOnline && ' • En ligne'}
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Rôle</p>
                  <p className="mt-2 font-semibold text-slate-900">{selectedMember.role}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Statut</p>
                  <p className="mt-2 flex items-center gap-2 font-semibold text-slate-900">
                    <span className={`h-2 w-2 rounded-full ${selectedMember.isOnline ? 'bg-green-500' : 'bg-slate-300'}`} />
                    {selectedMember.isOnline ? 'En ligne' : 'Hors ligne'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleStartPrivateChat(selectedMember)}
                  className="flex-1 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  💬 Message privé
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  👤 Voir le profil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreatePostModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="flex min-h-full items-start justify-center py-4 sm:items-center">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Publication</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">Creer un post dans {group.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">Seuls les membres du groupe peuvent publier dans ce feed.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetCreatePostForm()
                    setShowCreatePostModal(false)
                  }}
                  className="text-slate-400 transition hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleCreatePost} className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
              {/* Colonne gauche: Formulaire */}
              <div className="flex min-h-0 flex-col p-6 sm:p-8">
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="rounded-[28px] border border-slate-200 bg-[#fbfcff] p-5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradientColor} text-sm font-bold text-white`}>
                        {(userData?.displayName || currentUser?.displayName || currentUser?.email || 'M').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {userData?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Membre'}
                        </p>
                        <p className="truncate text-sm text-slate-400">Publication dans {group.name}</p>
                      </div>
                    </div>

                    <textarea
                      value={postContent}
                      onChange={(event) => setPostContent(event.target.value)}
                      placeholder="Partage une mise a jour, une annonce ou une idee avec le groupe..."
                      rows={4}
                      className="mt-5 w-full resize-none border-0 bg-transparent text-sm leading-7 text-slate-700 placeholder-slate-400 outline-none"
                    />

                    {postImage && (
                      <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                        <img src={postImage} alt="Apercu du post" className="max-h-[40vh] w-full object-cover" />
                        <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-slate-500">
                          <span className="truncate">{postImageName || 'Image ajoutee'}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setPostImage('')
                              setPostImageName('')
                            }}
                            className="flex-shrink-0 font-semibold text-red-500 transition hover:text-red-600"
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <label className="mt-4 inline-flex cursor-pointer items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    <span>Ajouter une image</span>
                    <input type="file" accept="image/*" onChange={handlePostImageChange} className="hidden" />
                  </label>

                  {postError && (
                    <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {postError}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex items-center gap-3 border-t border-slate-100 bg-white pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      resetCreatePostForm()
                      setShowCreatePostModal(false)
                    }}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={savingPost}
                    className={`rounded-full px-5 py-2.5 text-sm font-semibold text-white transition ${
                      savingPost ? 'cursor-wait bg-slate-400' : 'bg-sky-600 hover:bg-sky-700'
                    }`}
                  >
                    {savingPost ? 'Publication...' : 'Publier maintenant'}
                  </button>
                </div>
              </div>

              {/* Colonne droite: Aperçu */}
              <div className="hidden min-h-0 lg:flex lg:flex-col lg:overflow-y-auto lg:border-l lg:border-slate-200 lg:bg-gradient-to-br lg:from-sky-50 lg:to-white lg:p-6 lg:sm:p-8">
                <div className="m-auto w-full max-w-sm space-y-4">
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Aperçu du post</h3>
                  
                  <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${gradientColor} text-xs font-bold text-white flex-shrink-0`}>
                          {(userData?.displayName || currentUser?.displayName || currentUser?.email || 'M').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {userData?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Membre'}
                          </p>
                          <p className="text-xs text-slate-500">à l'instant</p>
                        </div>
                      </div>

                      {postContent && (
                        <p className="text-sm leading-6 text-slate-700 break-words">
                          {postContent}
                        </p>
                      )}

                      {postImage && (
                        <div className="overflow-hidden rounded-[16px]">
                          <img src={postImage} alt="Apercu" className="w-full h-auto max-h-48 object-cover" />
                        </div>
                      )}

                      {!postContent && !postImage && (
                        <p className="text-sm text-slate-400 italic">Ton contenu apparaîtra ici...</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
          </div>
        </div>
      )}

      {selectedPostForDiscussion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500">
                    Discussion du post
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {selectedPostForDiscussion.authorName}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {selectedPostForDiscussion.content || 'Post media'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClosePostDiscussion}
                  className="text-slate-400 transition hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#f8fbff] px-6 py-6">
              {postDiscussionEntries.length > 0 ? (
                <div className="space-y-4">
                  {postDiscussionEntries.map((entry) => {
                    const isCurrentUser = entry.authorId === currentUser?.uid

                    return (
                      <div
                        key={entry.id}
                        className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                      >
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isCurrentUser
                              ? 'bg-slate-900 text-white'
                              : 'bg-white text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)]'
                          }`}
                        >
                          {entry.authorName?.charAt(0).toUpperCase() || 'N'}
                        </div>

                        <div className={`max-w-[80%] ${isCurrentUser ? 'text-right' : ''}`}>
                          <div className={`mb-1 flex items-center gap-2 ${isCurrentUser ? 'justify-end' : ''}`}>
                            <span className="text-sm font-semibold text-slate-900">{entry.authorName}</span>
                            <span className="text-xs text-slate-400">
                              {formatShortDate(entry.createdAt)}
                            </span>
                          </div>
                          <div
                            className={`inline-block rounded-[22px] px-4 py-3 text-sm leading-6 ${
                              isCurrentUser
                                ? 'bg-slate-900 text-white'
                                : 'border border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            {entry.content}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex min-h-[260px] items-center justify-center">
                  <div className="max-w-md text-center">
                    <p className="text-lg font-semibold text-slate-900">Aucune discussion pour le moment</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Les membres du groupe peuvent tous lire cette discussion et y participer.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleCreatePostDiscussion} className="border-t border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={discussionDraft}
                  onChange={(event) => setDiscussionDraft(event.target.value)}
                  placeholder="Ecris dans la discussion de ce post..."
                  className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
                <button
                  type="submit"
                  disabled={savingDiscussion || !discussionDraft.trim()}
                  className="rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {savingDiscussion ? 'Envoi...' : 'Publier'}
                </button>
              </div>

              {discussionError && (
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {discussionError}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Modale Inviter */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 border-b border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">👥 Inviter des personnes</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false)
                    setSelectedInvitees([])
                    setInviteSearch('')
                  }}
                  className="text-slate-400 transition hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Section Lien d'invitation */}
              <div className="mb-8 rounded-[24px] bg-gradient-to-br from-sky-50 to-blue-50 p-6 border border-sky-200">
                <h3 className="mb-4 text-sm font-bold text-slate-900">🔗 Lien d'invitation</h3>
                
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-sky-300 bg-white px-4 py-3">
                  <input
                    type="text"
                    readOnly
                    value={invitationLink}
                    className="flex-1 bg-transparent text-sm text-slate-700 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(invitationLink, 'Lien')}
                    className="flex-shrink-0 rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-700"
                  >
                    📋 Copier
                  </button>
                </div>

                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-sky-300 bg-white px-4 py-3">
                  <input
                    type="text"
                    readOnly
                    value={invitationCode}
                    className="flex-1 bg-transparent font-mono text-sm font-bold text-slate-700 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(invitationCode, 'Code')}
                    className="flex-shrink-0 rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-700"
                  >
                    📋 Copier
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(invitationLink, 'Lien complet')}
                    className="rounded-2xl border border-sky-300 bg-white px-3 py-2 text-xs font-semibold text-sky-600 transition hover:bg-sky-50"
                  >
                    📋 Copier
                  </button>
                  <button
                    type="button"
                    onClick={() => shareToSocial('whatsapp')}
                    className="rounded-2xl border border-green-300 bg-white px-3 py-2 text-xs font-semibold text-green-600 transition hover:bg-green-50"
                  >
                    💬 WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => shareToSocial('twitter')}
                    className="rounded-2xl border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                  >
                    𝕏 Twitter
                  </button>
                  <button
                    type="button"
                    onClick={() => shareToSocial('facebook')}
                    className="rounded-2xl border border-blue-400 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    f Facebook
                  </button>
                </div>

                <p className="mt-4 text-xs text-slate-500">⏰ Lien valable 30 jours • Code réutilisable</p>
              </div>

              {/* Section Recherche */}
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-bold text-slate-900">🔍 Chercher des contacts</h3>
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Taper un nom ou un email..."
                    value={inviteSearch}
                    onChange={(e) => setInviteSearch(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <p className="mb-3 text-xs text-slate-500">
                  Recherche dans la base `users` et exclut automatiquement les membres du groupe, toi-meme et les invitations deja en attente.
                </p>

                {/* Contacts filtrés */}
                {inviteSearch && (
                  <div className="mb-4 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
                    {filteredContacts.length > 0 ? (
                      <div className="space-y-2">
                        {filteredContacts.map((contact) => {
                          const isSelected = selectedInvitees.some((inv) => inv.id === contact.id)
                          return (
                            <div
                              key={contact.id}
                              onClick={() => handleToggleInvitee(contact)}
                              className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition ${
                                isSelected
                                  ? 'border-sky-500 bg-sky-50'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              {contact.avatar ? (
                                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white">
                                  <img src={contact.avatar} alt={contact.name} className="h-full w-full object-cover" />
                                </div>
                              ) : (
                                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold text-white ${
                                  isSelected ? 'bg-sky-600' : 'bg-slate-400'
                                }`}>
                                  {contact.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="truncate font-semibold text-slate-900">{contact.name}</p>
                                {contact.email && (
                                  <p className="truncate text-xs text-slate-500">{contact.email}</p>
                                )}
                                <p className="text-xs text-slate-400">{contact.status}</p>
                              </div>
                              <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'border-sky-600 bg-sky-600'
                                  : 'border-slate-300'
                              }`}>
                                {isSelected && <span className="text-white text-xs">✓</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="py-4 text-center text-sm text-slate-500">
                        {inviteableContacts.length === 0
                          ? 'Aucun contact invitable trouve dans la base pour ce groupe.'
                          : 'Aucun contact ne correspond a cette recherche.'}
                      </p>
                    )}
                  </div>
                )}

                {/* Contacts sélectionnés */}
                {selectedInvitees.length > 0 && (
                  <div className="mb-4">
                    <h4 className="mb-2 text-xs font-bold text-slate-700">
                      ✅ {selectedInvitees.length} contact{selectedInvitees.length > 1 ? 's' : ''} sélectionné{selectedInvitees.length > 1 ? 's' : ''}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedInvitees.map((invitee) => (
                        <div
                          key={invitee.id}
                          className="flex items-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-3 py-1"
                        >
                          <span className="text-sm font-semibold text-sky-700">{invitee.name}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedInvitees((prev) => prev.filter((inv) => inv.id !== invitee.id))}
                            className="text-sky-600 hover:text-sky-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section Message */}
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-bold text-slate-900">💬 Message d'invitation</h3>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={5}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <p className="mt-2 text-xs text-slate-400">Le lien d'invitation est inclus automatiquement</p>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false)
                    setSelectedInvitees([])
                    setInviteSearch('')
                  }}
                  disabled={savingInvitations}
                  className="flex-1 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSendInvitations}
                  disabled={savingInvitations || selectedInvitees.length === 0}
                  className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold text-white transition ${
                    savingInvitations || selectedInvitees.length === 0
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-sky-600 hover:bg-sky-700'
                  }`}
                >
                  {savingInvitations
                    ? 'Envoi en cours...'
                    : `🚀 Envoyer ${selectedInvitees.length > 0 ? `(${selectedInvitees.length})` : ''}`}
                </button>
              </div>

              {/* Invitations en attente */}
              {pendingInviteEntries.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <h3 className="mb-3 text-sm font-bold text-slate-900">⏳ Invitations en attente</h3>
                  <div className="space-y-2">
                    {pendingInviteEntries.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <div>
                          <p className="font-semibold text-slate-900">{inv.name}</p>
                          <p className="text-xs text-slate-400">Invité le {new Date(inv.invitedAt).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                          En attente
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale Signaler */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">🚨 Signaler le groupe</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowReportModal(false)
                    setReportReason('')
                  }}
                  className="text-slate-400 transition hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Raison du signalement
                </label>
                <select className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500">
                  <option>Contenu offensant</option>
                  <option>Spam</option>
                  <option>Harcèlement</option>
                  <option>Contenu inapproprié</option>
                  <option>Autre</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Détails (optionnel)
                </label>
                <textarea
                  placeholder="Décrivez le problème..."
                  rows={4}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowReportModal(false)
                    setReportReason('')
                  }}
                  className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleReportGroup}
                  className="flex-1 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  🚨 Signaler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale Paramètres du groupe */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">⚙️ Paramètres du groupe</h2>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="text-slate-400 transition hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Nom du groupe
                </label>
                <input
                  type="text"
                  defaultValue={group.name}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-900 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Description
                </label>
                <textarea
                  defaultValue={group.description}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="mb-6 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Groupe privé</p>
                  <p className="text-xs text-slate-400">Seuls les invités peuvent rejoindre</p>
                </div>
                <div className="flex h-7 w-12 items-center rounded-full border border-slate-200 bg-white p-1">
                  <div className="h-5 w-5 rounded-full bg-slate-300" />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert('✅ Paramètres sauvegardés!')
                    setShowSettingsModal(false)
                  }}
                  className="flex-1 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  💾 Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
