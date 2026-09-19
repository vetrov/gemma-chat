import { useEffect, useRef, useState } from 'react'
import {
  appendMessage as persistMessage,
  createConversation as persistConversation,
  deleteConversation as removeConversation,
  listConversations,
  renameConversation as persistTitle,
} from './chatStorage'
import type { ChatMessage, Conversation } from '../types/chat'

const ACTIVE_CONVERSATION_KEY = 'gemma-chat-active-conversation'

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initializationStarted = useRef(false)
  const mutationQueue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    if (initializationStarted.current) {
      return
    }

    initializationStarted.current = true
    void initialize()

    async function initialize() {
      try {
        let storedConversations = await listConversations()
        if (storedConversations.length === 0) {
          storedConversations = [await persistConversation()]
        }

        const storedActiveId = readActiveConversationId()
        const nextActiveId =
          storedActiveId && storedConversations.some(({ id }) => id === storedActiveId)
            ? storedActiveId
            : storedConversations[0].id

        setConversations(storedConversations)
        selectConversation(nextActiveId)
      } catch (caughtError) {
        setError(getErrorMessage(caughtError))
      } finally {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (activeId) {
      persistActiveConversationId(activeId)
    }
  }, [activeId])

  const activeConversation = conversations.find(({ id }) => id === activeId) ?? null

  async function createConversation() {
    await queueMutation(async () => {
      const conversation = await persistConversation()
      setConversations((current) => [conversation, ...current])
      selectConversation(conversation.id)
    })
  }

  function selectConversation(conversationId: string) {
    setActiveId(conversationId)
  }

  async function appendMessage(conversationId: string, message: ChatMessage) {
    await queueMutation(async () => {
      const conversation = await persistMessage(conversationId, message)
      setConversations((current) => [
        conversation,
        ...current.filter(({ id }) => id !== conversationId),
      ])
    })
  }

  async function renameConversation(conversationId: string, title: string) {
    await queueMutation(async () => {
      const conversation = await persistTitle(conversationId, title)
      setConversations((current) =>
        current.map((item) => (item.id === conversationId ? conversation : item)),
      )
    })
  }

  async function deleteConversation(conversationId: string) {
    await queueMutation(async () => {
      await removeConversation(conversationId)
      let remaining = await listConversations()

      if (remaining.length === 0) {
        remaining = [await persistConversation()]
      }

      setConversations(remaining)
      setActiveId((currentActiveId) => {
        const nextActiveId =
          currentActiveId && remaining.some(({ id }) => id === currentActiveId)
            ? currentActiveId
            : remaining[0].id
        return nextActiveId
      })
    })
  }

  function queueMutation(operation: () => Promise<void>): Promise<void> {
    const pending = mutationQueue.current.then(operation)
    mutationQueue.current = pending.catch(() => undefined)
    return pending.catch((caughtError: unknown) => {
      setError(getErrorMessage(caughtError))
      throw caughtError
    })
  }

  return {
    conversations,
    activeConversation,
    isLoading,
    error,
    createConversation,
    selectConversation,
    appendMessage,
    renameConversation,
    deleteConversation,
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Conversation storage is unavailable.'
}

function readActiveConversationId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_CONVERSATION_KEY)
  } catch {
    return null
  }
}

function persistActiveConversationId(conversationId: string) {
  try {
    localStorage.setItem(ACTIVE_CONVERSATION_KEY, conversationId)
  } catch {
    // Chat history remains available even when preference storage is blocked.
  }
}
