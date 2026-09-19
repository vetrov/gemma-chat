import { useState, type FormEvent, type KeyboardEvent } from 'react'
import styles from './ChatComposer.module.css'

interface Props {
  disabled: boolean
  isGenerating: boolean
  onSend: (content: string) => void
  onStop: () => void
}

export function ChatComposer({ disabled, isGenerating, onSend, onStop }: Props) {
  const [content, setContent] = useState('')

  function submit(event?: FormEvent) {
    event?.preventDefault()
    const message = content.trim()
    if (!message || disabled || isGenerating) {
      return
    }
    setContent('')
    onSend(message)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className={styles.dock}>
      <form className={styles.composer} onSubmit={submit}>
        <textarea
          aria-label="Message Gemma"
          placeholder="Message Gemma..."
          rows={1}
          maxLength={3000}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isGenerating}
        />
        {isGenerating ? (
          <button className={styles.stopButton} type="button" onClick={onStop}>
            Stop
          </button>
        ) : (
          <button
            className={styles.sendButton}
            type="submit"
            disabled={disabled || !content.trim()}
          >
            Send
          </button>
        )}
      </form>
      <p>Gemma can make mistakes. Verify important information.</p>
    </div>
  )
}
