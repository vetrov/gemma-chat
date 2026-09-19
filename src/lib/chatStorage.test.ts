import { afterEach, describe, expect, it } from 'vitest'
import {
  appendMessage,
  createConversation,
  deleteConversation,
  listConversations,
  renameConversation,
} from './chatStorage'

const createdConversationIds: string[] = []

afterEach(async () => {
  await Promise.all(createdConversationIds.splice(0).map(deleteConversation))
})

describe('chatStorage', () => {
  it('persists messages and derives a title from the first prompt', async () => {
    const conversation = await createConversation()
    createdConversationIds.push(conversation.id)

    const updated = await appendMessage(conversation.id, {
      id: crypto.randomUUID(),
      role: 'user',
      content: 'Explain why the sky appears blue during the day',
      createdAt: Date.now(),
    })

    expect(updated.title).toBe('Explain why the sky appears blue during...')
    expect(updated.messages).toHaveLength(1)
    await expect(listConversations()).resolves.toContainEqual(updated)
  })

  it('renames and deletes independent conversations', async () => {
    const first = await createConversation('First')
    const second = await createConversation('Second')
    createdConversationIds.push(first.id, second.id)

    const renamed = await renameConversation(first.id, 'Research notes')
    expect(renamed.title).toBe('Research notes')

    await deleteConversation(second.id)
    createdConversationIds.splice(createdConversationIds.indexOf(second.id), 1)

    const stored = await listConversations()
    expect(stored.some(({ id }) => id === first.id)).toBe(true)
    expect(stored.some(({ id }) => id === second.id)).toBe(false)
  })
})
