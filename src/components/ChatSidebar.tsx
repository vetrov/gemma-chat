import { useState } from 'react'
import type { Conversation } from '../types/chat'
import styles from './ChatSidebar.module.css'

interface Props {
  conversations: Conversation[]
  activeId: string | null
  disabled: boolean
  onCreate: () => void
  onSelect: (conversationId: string) => void
  onRename: (conversationId: string, title: string) => Promise<void>
  onDelete: (conversationId: string) => void
}

export function ChatSidebar({
  conversations,
  activeId,
  disabled,
  onCreate,
  onSelect,
  onRename,
  onDelete,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')

  function startRenaming(conversation: Conversation) {
    setEditingId(conversation.id)
    setTitle(conversation.title)
  }

  async function saveTitle() {
    if (!editingId) {
      return
    }
    try {
      await onRename(editingId, title)
      setEditingId(null)
    } catch {
      // The parent route displays storage failures.
    }
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>G</span>
        <div>
          <strong>Gemma</strong>
          <span>Local chat</span>
        </div>
      </div>

      <button className={styles.newButton} type="button" onClick={onCreate} disabled={disabled}>
        <span aria-hidden="true">+</span> New conversation
      </button>

      <p className={styles.sectionLabel}>Conversations</p>
      <nav className={styles.chatList} aria-label="Conversations">
        {conversations.map((conversation) => (
          <div
            className={`${styles.chatItem} ${conversation.id === activeId ? styles.active : ''}`}
            key={conversation.id}
          >
            {editingId === conversation.id ? (
              <form
                className={styles.renameForm}
                onSubmit={(event) => {
                  event.preventDefault()
                  void saveTitle()
                }}
              >
                <input
                  aria-label="Conversation title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  autoFocus
                />
                <button type="submit">Save</button>
              </form>
            ) : (
              <>
                <button
                  className={styles.selectButton}
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  disabled={disabled}
                >
                  <span>{conversation.title}</span>
                  <time dateTime={new Date(conversation.updatedAt).toISOString()}>
                    {new Intl.DateTimeFormat(undefined, {
                      month: 'short',
                      day: 'numeric',
                    }).format(conversation.updatedAt)}
                  </time>
                </button>
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    onClick={() => startRenaming(conversation)}
                    disabled={disabled}
                    aria-label={`Rename ${conversation.title}`}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(conversation.id)}
                    disabled={disabled}
                    aria-label={`Delete ${conversation.title}`}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </nav>

      <p className={styles.privacy}>Messages and model data stay in this browser.</p>
    </aside>
  )
}
