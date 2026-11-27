import { cosineSimilarity } from './ragUtils.js'

const DATABASE_PREFIX = 'studyVaultRag'
const STORE_NAME = 'chunks'

const openIndex = (userId) => new Promise((resolve, reject) => {
  if (!userId) {
    reject(new Error('Sign in before using the study-material index.'))
    return
  }

  const request = indexedDB.open(`${DATABASE_PREFIX}-${userId}`, 1)
  request.onupgradeneeded = () => {
    const database = request.result
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error || new Error('Unable to open the local RAG index.'))
  request.onblocked = () => reject(new Error('Close other StudyVault tabs to update the local RAG index.'))
})

export const getIndexChunks = async (userId) => {
  const database = await openIndex(userId)

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error('Unable to read the local RAG index.'))
      transaction.onerror = () => reject(transaction.error || new Error('Unable to read the local RAG index.'))
    })
  } finally {
    database.close()
  }
}

export const replaceIndexChunks = async (userId, chunks) => {
  const database = await openIndex(userId)

  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      store.clear()
      chunks.forEach((chunk) => store.put(chunk))
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error || new Error('Unable to save the local RAG index.'))
      transaction.onabort = () => reject(transaction.error || new Error('Saving the local RAG index was aborted.'))
    })
  } finally {
    database.close()
  }
}

export const findRelevantChunks = (chunks, embedding, count = 6) => chunks
  .map((chunk) => ({ ...chunk, score: cosineSimilarity(embedding, chunk.embedding) }))
  .filter((chunk) => Number.isFinite(chunk.score))
  .sort((left, right) => right.score - left.score)
  .slice(0, count)
