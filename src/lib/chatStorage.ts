import { openDB, type DBSchema } from 'idb'
import type { ChatMessage, Conversation } from '../types/chat'

interface ChatDatabase extends DBSchema {
  conversations: {
    key: string
    value: Conversation
    indexes: { 'by-updated-at': number }
  }
}

const DATABASE_NAME = 'gemma-chat'
const DATABASE_VERSION = 1

const databasePromise = openDB<ChatDatabase>(DATABASE_NAME, DATABASE_VERSION, {
  upgrade(database) {
    const store = database.createObjectStore('conversations', { keyPath: 'id' })
    store.createIndex('by-updated-at', 'updatedAt')
  },
})

export async function listConversations(): Promise<Conversation[]> {
  const database = await databasePromise
  const conversations = await database.getAllFromIndex('conversations', 'by-updated-at')
  return conversations.reverse()
}

export async function createConversation(title = 'New chat'): Promise<Conversation> {
  const now = Date.now()
  const conversation: Conversation = {
    id: crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
  }

  const database = await databasePromise
  await database.put('conversations', conversation)
  return conversation
}

export async function appendMessage(
  conversationId: string,
  message: ChatMessage,
): Promise<Conversation> {
  const database = await databasePromise
  const transaction = database.transaction('conversations', 'readwrite')
  const conversation = await transaction.store.get(conversationId)

  if (!conversation) {
    throw new Error('Conversation not found')
  }

  const firstUserMessage =
    conversation.messages.length === 0 && message.role === 'user' ? message.content.trim() : null
  const updatedConversation: Conversation = {
    ...conversation,
    title: firstUserMessage ? createTitle(firstUserMessage) : conversation.title,
    updatedAt: message.createdAt,
    messages: [...conversation.messages, message],
  }

  await transaction.store.put(updatedConversation)
  await transaction.done
  return updatedConversation
}

export async function renameConversation(
  conversationId: string,
  title: string,
): Promise<Conversation> {
  const database = await databasePromise
  const transaction = database.transaction('conversations', 'readwrite')
  const conversation = await transaction.store.get(conversationId)

  if (!conversation) {
    throw new Error('Conversation not found')
  }

  const updatedConversation = {
    ...conversation,
    title: title.trim() || 'Untitled chat',
    updatedAt: Date.now(),
  }
  await transaction.store.put(updatedConversation)
  await transaction.done
  return updatedConversation
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const database = await databasePromise
  await database.delete('conversations', conversationId)
}

function createTitle(content: string): string {
  const firstLine = content.split('\n', 1)[0].trim()
  if (firstLine.length <= 42) {
    return firstLine
  }

  const shortened = firstLine.slice(0, 42)
  const lastWordBoundary = shortened.lastIndexOf(' ')
  return `${shortened.slice(0, lastWordBoundary > 0 ? lastWordBoundary : 42)}...`
}
