import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function PostCard({
  post,
  theme = 'light',
  canDelete = false,
  onDelete,
  discussionCount = 0,
  onOpenDiscussion,
  isLiked = false,
  likesCount = 0,
  onLike,
  groupId,
}) {
  const { currentUser } = useAuth()
  const [isLiking, setIsLiking] = useState(false)

  if (!post) return null

  const isLight = theme === 'light'

  const handleLikeClick = async () => {
    if (!currentUser || !groupId || isLiking) return
    if (typeof onLike !== 'function') return

    setIsLiking(true)
    try {
      await onLike(!isLiked)
    } finally {
      setIsLiking(false)
    }
  }

  const styles = isLight
    ? {
        wrapper:
          'overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]',
        header: 'flex items-start gap-4 border-b border-slate-200 px-6 py-5',
        avatar:
          'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-sm font-bold text-white',
        author: 'font-semibold text-slate-900',
        time: 'text-xs text-slate-400',
        badge: 'rounded-full bg-[#eef5ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-600',
        body: 'space-y-4 px-6 py-5',
        content: 'whitespace-pre-wrap leading-7 text-slate-700',
        image: 'max-h-96 w-full rounded-2xl border border-slate-200 object-cover',
        footer: 'flex gap-6 border-t border-slate-200 px-6 py-4 text-sm text-slate-500',
        action: 'flex items-center gap-2 transition hover:text-sky-600',
        deleteButton:
          'rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50',
      }
    : {
        wrapper:
          'overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50 shadow-md transition-all hover:border-slate-600 hover:shadow-lg',
        header: 'flex items-start gap-4 border-b border-slate-700 p-6',
        avatar:
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white',
        author: 'font-semibold text-slate-100',
        time: 'text-xs text-slate-500',
        badge: 'rounded-full bg-slate-700 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300',
        body: 'space-y-4 p-6',
        content: 'whitespace-pre-wrap leading-relaxed text-slate-200',
        image: 'max-h-96 w-full rounded-lg border border-slate-700 object-cover',
        footer: 'flex gap-6 border-t border-slate-700 px-6 py-4 text-sm',
        action: 'flex items-center gap-2 text-slate-400 transition hover:text-blue-400',
        deleteButton:
          'rounded-full border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10',
      }

  const authorRoleLabel = post.authorRole === 'admin' ? 'Admin' : 'Membre'

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.avatar}>{post.authorName?.charAt(0).toUpperCase() || 'U'}</div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={styles.author}>{post.authorName}</h3>
            <span className={styles.badge}>{authorRoleLabel}</span>
          </div>
          <p className={styles.time}>
            {new Date(post.createdAt).toLocaleString('fr-FR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        {canDelete && onDelete && (
          <button type="button" onClick={onDelete} className={styles.deleteButton}>
            Supprimer
          </button>
        )}
      </div>

      <div className={styles.body}>
        <p className={styles.content}>{post.content}</p>

        {post.imageUrl && <img src={post.imageUrl} alt="Post content" className={styles.image} />}
      </div>

      <div className={styles.footer}>
        <button 
          type="button"
          onClick={handleLikeClick}
          disabled={isLiking}
          className={`${styles.action} ${isLiked ? 'text-sky-500' : ''} ${isLiking ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
        >
          <span className="text-lg">{isLiked ? '❤️' : '🤍'}</span>
          <span className="text-xs">{likesCount > 0 ? `${likesCount}` : 'J\'aime'}</span>
        </button>
        <button type="button" onClick={onOpenDiscussion} className={styles.action}>
          <span className="text-lg">💬</span>
          <span className="text-xs">Discussion{discussionCount > 0 ? ` (${discussionCount})` : ''}</span>
        </button>
        <button className={styles.action}>
          <span className="text-lg">🔗</span>
          <span className="text-xs">Partager</span>
        </button>
      </div>
    </div>
  )
}
