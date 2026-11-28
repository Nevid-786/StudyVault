const CHAT_MODES = ['study', 'general']
const STORAGE_PREFIX = 'studyVaultRevisionChat'

const getStorageKey = (userId) => {
  if (typeof userId !== 'string' || !userId) {
    throw new TypeError('A signed-in user is required to save revision chat.')
  }

  return `${STORAGE_PREFIX}:${encodeURIComponent(userId)}`
}

const isValidMessage = (message) => (
  message &&
  ['user', 'model'].includes(message.role) &&
  typeof message.text === 'string' &&
  (message.sources === undefined || Array.isArray(message.sources)) &&
  (message.context === undefined || Array.isArray(message.context))
)

const isValidChat = (chat) => (
  chat &&
  typeof chat === 'object' &&
  CHAT_MODES.every((mode) =>
    Array.isArray(chat[mode]) && chat[mode].every(isValidMessage))
)

export const loadRevisionChat = (userId, storage = globalThis.localStorage) => {
  const saved = storage.getItem(getStorageKey(userId))
  if (saved === null) return null

  let chat
  try {
    chat = JSON.parse(saved)
  } catch {
    throw new Error('Saved revision chat is unreadable. Clear the chat to start a new one.')
  }

  if (!isValidChat(chat)) {
    throw new Error('Saved revision chat has an invalid format. Clear the chat to start a new one.')
  }

  return chat
}

export const saveRevisionChat = (userId, chat, storage = globalThis.localStorage) => {
  if (!isValidChat(chat)) {
    throw new TypeError('Revision chat has an invalid format and cannot be saved.')
  }

  const persistedChat = Object.fromEntries(CHAT_MODES.map((mode) => {
    const messages = chat[mode]
    const lastContextMessage = [...messages].reverse().find((message) => (
      message.role === 'model' && Array.isArray(message.context)
    ))

    return [mode, messages.map((message) => {
      const { context, ...savedMessage } = message
      if (message !== lastContextMessage || !context) return savedMessage

      return {
        ...savedMessage,
        context: context.map((chunk) => ({
          id: chunk.id,
          documentId: chunk.documentId,
          title: chunk.title,
          source: chunk.source,
          location: chunk.location,
          page: chunk.page,
          text: chunk.text,
        })),
      }
    })]
  }))

  storage.setItem(getStorageKey(userId), JSON.stringify(persistedChat))
}
