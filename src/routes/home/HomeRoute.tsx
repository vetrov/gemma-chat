import { useState } from 'react'
import { ChatComposer } from '../../components/ChatComposer'
import { ChatSidebar } from '../../components/ChatSidebar'
import { MessageList } from '../../components/MessageList'
import { ModelSetup } from '../../components/ModelSetup'
import { useConversations } from '../../lib/useConversations'
import { useGemmaModel } from '../../lib/useGemmaModel'
import type { ChatMessage } from '../../types/chat'
import styles from './HomeRoute.module.css'

const CONTEXT_CHARACTER_BUDGET = 3_000

export function HomeRoute() {
  const chats = useConversations()
  const model = useGemmaModel()
  const [streamedResponse, setStreamedResponse] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const isGenerating = model.phase === 'generating'
  const isReady = model.phase === 'ready' || isGenerating
  const showChat = isReady && chats.activeConversation !== null

  async function sendMessage(content: string) {
    const conversation = chats.activeConversation
    if (!conversation || model.phase !== 'ready') {
      return
    }

    setIsSubmitting(true)
    setChatError(null)
    const userMessage = createMessage('user', content)
    try {
      await chats.appendMessage(conversation.id, userMessage)
    } catch (caughtError) {
      setChatError(getErrorMessage(caughtError))
      setIsSubmitting(false)
      return
    }

    setStreamedResponse('')
    let generatedText = ''

    try {
      await model.generate({
        messages: trimContext([...conversation.messages, userMessage]),
        onToken(text) {
          generatedText = text
          setStreamedResponse(text)
        },
      })
    } catch {
      // The model hook exposes generation failures in the chat UI.
    } finally {
      try {
        if (generatedText.trim()) {
          await chats.appendMessage(
            conversation.id,
            createMessage('assistant', generatedText.trim()),
          )
        }
      } catch (caughtError) {
        setChatError(getErrorMessage(caughtError))
      } finally {
        setStreamedResponse(null)
        setIsSubmitting(false)
      }
    }
  }

  return (
    <main className={styles.page}>
      <ChatSidebar
        conversations={chats.conversations}
        activeId={chats.activeConversation?.id ?? null}
        disabled={isGenerating || isSubmitting || chats.isLoading}
        onCreate={() => void chats.createConversation().catch(() => undefined)}
        onSelect={chats.selectConversation}
        onRename={chats.renameConversation}
        onDelete={(conversationId) =>
          void chats.deleteConversation(conversationId).catch(() => undefined)
        }
      />

      <section className={styles.workspace}>
        <header className={styles.header}>
          <div>
            <span className={`${styles.statusDot} ${isReady ? styles.online : ''}`} />
            <span>{model.statusText}</span>
          </div>
          {isReady && (
            <button
              type="button"
              onClick={() => void model.removeModel()}
              disabled={isGenerating || isSubmitting}
            >
              Remove model
            </button>
          )}
        </header>

        {chats.error ? (
          <div className={styles.storageError} role="alert">
            <p className={styles.storageEyebrow}>Local storage error</p>
            <h1>Conversation history is unavailable.</h1>
            <p>{chats.error}</p>
            <button type="button" onClick={() => window.location.reload()}>
              Reload app
            </button>
          </div>
        ) : showChat ? (
          <div className={styles.chatArea}>
            {(model.error || chatError) && (
              <p className={styles.inlineError}>{model.error ?? chatError}</p>
            )}
            <MessageList
              messages={chats.activeConversation?.messages ?? []}
              streamedResponse={streamedResponse}
            />
            <ChatComposer
              disabled={!isReady || isSubmitting || chats.isLoading}
              isGenerating={isGenerating}
              onSend={(content) => void sendMessage(content)}
              onStop={model.stopGeneration}
            />
          </div>
        ) : (
          <div className={styles.setupArea}>
            <ModelSetup
              phase={model.phase}
              progress={model.progress}
              statusText={model.statusText}
              error={model.error}
              onDownload={() => void model.downloadModel()}
              onCancel={() => void model.cancelDownload()}
            />
          </div>
        )}
      </section>
    </main>
  )
}

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: Date.now(),
  }
}

function trimContext(messages: ChatMessage[]): ChatMessage[] {
  const selected: ChatMessage[] = []
  let characterCount = 0

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (characterCount + message.content.length > CONTEXT_CHARACTER_BUDGET && selected.length > 0) {
      break
    }
    selected.unshift(message)
    characterCount += message.content.length
  }

  if (selected[0]?.role === 'assistant') {
    selected.shift()
  }
  return selected
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The message could not be saved.'
}
