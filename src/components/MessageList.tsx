import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../types/chat'
import styles from './MessageList.module.css'

interface Props {
  messages: ChatMessage[]
  streamedResponse: string | null
}

export function MessageList({ messages, streamedResponse }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: streamedResponse ? 'instant' : 'smooth' })
  }, [messages, streamedResponse])

  if (messages.length === 0 && streamedResponse === null) {
    return (
      <div className={styles.empty}>
        <p className={styles.eyebrow}>Ready on this device</p>
        <h1>What are you thinking about?</h1>
        <p>Ask a question, explore an idea, or start drafting. Gemma answers locally.</p>
      </div>
    )
  }

  return (
    <div className={styles.list} aria-live="polite">
      {messages.map((message) => (
        <article className={styles.message} data-role={message.role} key={message.id}>
          <span className={styles.role}>{message.role === 'user' ? 'You' : 'Gemma'}</span>
          <p>{message.content}</p>
        </article>
      ))}
      {streamedResponse !== null && (
        <article className={styles.message} data-role="assistant">
          <span className={styles.role}>Gemma</span>
          <p>
            {streamedResponse}
            <span className={styles.cursor} aria-hidden="true" />
          </p>
        </article>
      )}
      <div ref={endRef} />
    </div>
  )
}
