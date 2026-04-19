import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  initSocket, 
  getSocket,
  sendMessage as sendSocketMessage,
  onMessageReceived,
  joinGroup,
  leaveGroup,
  onTyping,
  sendTyping,
} from '../services/socketService'
import { listenToGroupMessages, sendMessage as sendFirebaseMessage } from '../services/realtimeService'

export default function ChatBox({ groupId, theme = 'dark' }) {
  const { currentUser, userData } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [typingUsers, setTypingUsers] = useState({})
  const [isConnected, setIsConnected] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const messagesSetRef = useRef(new Set()) // Tracker les IDs pour éviter les doublons

  const isLight = theme === 'light'

  const styles = isLight
    ? {
        wrapper: 'flex h-[640px] flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]',
        messages: 'flex-1 space-y-4 overflow-y-auto bg-[#fbfcfe] p-6',
        empty: 'text-slate-400',
        currentBubble: 'bg-sky-500 text-white',
        otherBubble: 'bg-white text-slate-700 border border-slate-200',
        currentAvatar: 'bg-sky-500 text-white',
        otherAvatar: 'bg-slate-200 text-slate-700',
        author: 'text-slate-900',
        time: 'text-slate-400',
        form: 'flex gap-3 border-t border-slate-200 bg-white p-4',
        input:
          'flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-200/40',
        button:
          'rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:bg-slate-300',
      }
    : {
        wrapper: 'flex h-[600px] flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50',
        messages: 'flex-1 space-y-4 overflow-y-auto p-6',
        empty: 'text-slate-500',
        currentBubble: 'bg-blue-600 text-white',
        otherBubble: 'bg-slate-700 text-slate-200',
        currentAvatar: 'bg-blue-600 text-white',
        otherAvatar: 'bg-slate-700 text-white',
        author: 'text-slate-200',
        time: 'text-slate-500',
        form: 'flex gap-2 border-t border-slate-700 bg-slate-800/30 p-4 backdrop-blur-sm',
        input:
          'flex-1 rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500',
        button:
          'rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:bg-slate-600',
      }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Charger les messages historiques depuis Firebase
  useEffect(() => {
    if (!groupId) return

    const unsubscribeFirebase = listenToGroupMessages(groupId, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const messagesArray = Object.entries(data)
          .map(([id, msg]) => ({
            id,
            ...msg,
          }))
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

        // Mettre à jour les messages et tracker les IDs
        setMessages(messagesArray)
        messagesArray.forEach((msg) => messagesSetRef.current.add(msg.id))
      } else {
        setMessages([])
      }
      setLoading(false)
    })

    return unsubscribeFirebase
  }, [groupId])

  // Initialiser la connexion socket.io pour les nouveaux messages
  useEffect(() => {
    if (!currentUser?.uid || loading) return

    try {
      const socket = initSocket(currentUser.uid)
      setIsConnected(true)
      joinGroup(groupId, currentUser.uid)

      return () => {
        leaveGroup(groupId, currentUser.uid)
      }
    } catch (error) {
      console.error('Erreur socket.io:', error)
    }
  }, [currentUser?.uid, groupId, loading])

  // Écouter les nouveaux messages via Socket.io (temps réel)
  useEffect(() => {
    if (!isConnected) return

    const unsubscribe = onMessageReceived((message) => {
      // Éviter les doublons
      if (!messagesSetRef.current.has(message.id)) {
        messagesSetRef.current.add(message.id)
        setMessages((prev) => [...prev, message])
      }
    })

    return unsubscribe
  }, [isConnected])

  // Écouter les indicateurs de saisie
  useEffect(() => {
    if (!isConnected) return

    const unsubscribe = onTyping((data) => {
      const { userId, userName, isTyping } = data
      if (isTyping && userId !== currentUser?.uid) {
        setTypingUsers((prev) => ({
          ...prev,
          [userId]: userName,
        }))
        // Auto-effacer après 3 secondes
        setTimeout(() => {
          setTypingUsers((prev) => {
            const updated = { ...prev }
            delete updated[userId]
            return updated
          })
        }, 3000)
      } else {
        setTypingUsers((prev) => {
          const updated = { ...prev }
          delete updated[userId]
          return updated
        })
      }
    })

    return unsubscribe
  }, [isConnected, currentUser?.uid])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser?.uid) return

    try {
      // Envoyer à Firebase (persistance)
      await sendFirebaseMessage(groupId, {
        authorId: currentUser.uid,
        authorName: userData?.username || 'Utilisateur',
        content: newMessage,
      })

      // Envoyer via Socket.io (temps réel à tous)
      sendSocketMessage(
        groupId,
        newMessage,
        currentUser.uid,
        userData?.username || 'Utilisateur'
      )

      setNewMessage('')

      // Arrêter d'afficher l'indicateur de saisie
      sendTyping(groupId, currentUser.uid, userData?.username, false)
    } catch (error) {
      console.error('Erreur:', error)
      alert('❌ Erreur lors de l\'envoi du message')
    }
  }

  const handleInputChange = (e) => {
    setNewMessage(e.target.value)

    // Envoyer l'indicateur de saisie
    if (currentUser?.uid) {
      sendTyping(groupId, currentUser.uid, userData?.username, true)

      // Arrêter après 1 seconde d'inactivité
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(groupId, currentUser.uid, userData?.username, false)
      }, 1000)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.messages}>
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className={`${styles.empty} mb-2`}>Connexion au chat...</p>
              <div className="flex justify-center gap-1">
                <div className="h-2 w-2 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className={`${styles.empty} text-center`}>
              Aucun message. Soyez le premier a parler !
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isCurrentUser = msg.authorId === currentUser?.uid

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isCurrentUser ? styles.currentAvatar : styles.otherAvatar
                    }`}
                  >
                    {msg.authorName?.charAt(0).toUpperCase() || 'N'}
                  </div>

                  <div className={`max-w-[78%] ${isCurrentUser ? 'text-right' : ''}`}>
                    <div
                      className={`mb-1 flex items-baseline gap-2 ${
                        isCurrentUser ? 'justify-end' : ''
                      }`}
                    >
                      <span className={`text-sm font-semibold ${styles.author}`}>
                        {msg.authorName}
                      </span>
                      <span className={`text-xs ${styles.time}`}>
                        {new Date(msg.timestamp).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div
                      className={`inline-block rounded-[20px] px-4 py-3 text-sm leading-6 ${
                        isCurrentUser ? styles.currentBubble : styles.otherBubble
                      }`}
                    >
                      <p className="break-words">{msg.content}</p>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Indicateur de saisie */}
            {Object.keys(typingUsers).length > 0 && (
              <div className="flex gap-3 text-sm text-slate-500">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200" />
                <div className="flex items-center gap-1 rounded-[20px] bg-slate-100 px-4 py-2">
                  <span className="font-semibold">{Object.values(typingUsers).join(', ')}</span>
                  <span>écrit</span>
                  <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form onSubmit={handleSendMessage} className={styles.form}>
        <input
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Ecrivez votre message..."
          className={styles.input}
        />
        <button 
          type="submit" 
          className={styles.button}
          disabled={!isConnected || !newMessage.trim()}
        >
          ✓
        </button>
      </form>
    </div>
  )
}
