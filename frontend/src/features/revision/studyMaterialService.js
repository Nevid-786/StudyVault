import { api } from '../../hooks/axiosHook.js'
import localDB from '../../config/indexdb.js'
import GoogleDriveService from '../../services/googleDrive.js'
import { extractMaterialText } from './documentExtraction.js'
import { chunkText } from './ragUtils.js'
import { findRelevantChunks, getIndexChunks, replaceIndexChunks } from './ragIndex.js'
import {
  getRagProvider,
  getUserGeminiApiKey,
  RAG_PROVIDERS,
} from './aiProvider.js'
import { createBrowserGeminiClient } from './geminiApiClient.js'

const EMBEDDING_BATCH_SIZE = 24
const MAX_DOCUMENTS = 200
const MAX_INDEX_CHUNKS = 4000

const createLocalDocument = (file) => ({
  id: `local-${file.id}`,
  lid: file.lid,
  name: file.name,
  file: file.file,
  mimeType: file.type || file.file?.type || '',
  source: 'This device',
  location: [file.semester, file.subject, file.unit].filter(Boolean).join(' / '),
})

const createDriveDocument = (file, blob) => ({
  id: `drive-${file.id}`,
  name: file.name,
  file: blob,
  mimeType: file.mimeType || blob.type,
  source: 'Google Drive',
  location: [
    file.appProperties?.semester,
    file.appProperties?.subject,
    file.appProperties?.unit,
  ].filter(Boolean).join(' / '),
})

const getStudyDocuments = async ({ accessToken, folderId }) => {
  const localFiles = await localDB.getallfile()
  const documents = localFiles
    .filter((file) => file.file instanceof Blob)
    .map(createLocalDocument)

  if (!accessToken || !folderId) {
    throw new Error('Connect Google Drive before indexing materials from both sources.')
  }

  const localIds = new Set(localFiles.map((file) => file.lid).filter(Boolean))
  const driveFiles = await GoogleDriveService.getAllDriveItems(accessToken, folderId)
  const uniqueDriveFiles = driveFiles.filter((file) => (
    file.mimeType !== 'application/vnd.google-apps.folder' &&
    !(file.appProperties?.lid && localIds.has(file.appProperties.lid))
  ))

  if (documents.length + uniqueDriveFiles.length > MAX_DOCUMENTS) {
    throw new Error(`Index up to ${MAX_DOCUMENTS} files at a time.`)
  }

  for (const [index, file] of uniqueDriveFiles.entries()) {
    const blob = await GoogleDriveService.downloadFile(file.id, accessToken, undefined, file.mimeType)
    documents.push(createDriveDocument(file, blob))
    if (index + 1 < uniqueDriveFiles.length) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  return documents
}

const createStudyAiClient = () => {
  const provider = getRagProvider()
  if (provider === RAG_PROVIDERS.user) {
    const apiKey = getUserGeminiApiKey()
    if (!apiKey) {
      throw new Error('Your Gemini API key is selected but not saved in this tab. Add it in Storage & Sync settings.')
    }
    return createBrowserGeminiClient(apiKey)
  }

  return {
    async createEmbeddings(texts, taskType) {
      const response = await api.post('/ai/embeddings', { texts, taskType })
      if (!Array.isArray(response.data.embeddings) || response.data.embeddings.length !== texts.length) {
        throw new Error('The embedding service returned an invalid response.')
      }
      return response.data.embeddings
    },
    async createReply(request) {
      const { data } = await api.post('/ai/chat', request)
      return data.answer
    },
  }
}

export const indexStudyMaterials = async ({ userId, accessToken, folderId, onProgress }) => {
  // Capture the selected provider once so all batches in an index use the same Gemini account.
  const aiClient = createStudyAiClient()
  const documents = await getStudyDocuments({ accessToken, folderId })
  if (documents.length === 0) {
    throw new Error('No saved materials were found. Add files to a subject or unit first.')
  }

  const chunksToSave = []
  const skipped = []
  let processedDocuments = 0
  let totalChunks = 0

  for (const [documentIndex, document] of documents.entries()) {
    let text
    try {
      text = await extractMaterialText(document.file, document.name)
    } catch (error) {
      skipped.push({ name: document.name, reason: error.message })
      continue
    }

    const textChunks = chunkText(text)
    if (totalChunks + textChunks.length > MAX_INDEX_CHUNKS) {
      skipped.push({ name: document.name, reason: 'Adding this file would exceed the 4,000-chunk index limit.' })
      continue
    }

    for (let offset = 0; offset < textChunks.length; offset += EMBEDDING_BATCH_SIZE) {
      const batch = textChunks.slice(offset, offset + EMBEDDING_BATCH_SIZE)
      const embeddingTexts = batch.map((chunk) =>
        `title: ${document.name} | ${document.location || 'Study material'}\ntext: ${chunk}`)
      const embeddings = await aiClient.createEmbeddings(embeddingTexts, 'RETRIEVAL_DOCUMENT')

      batch.forEach((chunk, index) => {
        chunksToSave.push({
          id: `${document.id}-${offset + index}`,
          documentId: document.id,
          title: document.name,
          source: document.source,
          location: document.location,
          text: chunk,
          embedding: embeddings[index],
        })
      })
      totalChunks += batch.length
    }

    processedDocuments += 1
    onProgress?.({
      current: documentIndex + 1,
      total: documents.length,
      name: document.name,
    })
  }

  if (chunksToSave.length === 0) {
    const reasons = skipped.slice(0, 3).map(({ name, reason }) => `${name}: ${reason}`).join(' ')
    throw new Error(reasons || 'No readable text was found in the selected materials.')
  }

  await replaceIndexChunks(userId, chunksToSave)
  return { documentsIndexed: processedDocuments, chunkCount: chunksToSave.length, skipped }
}

export const getStudyIndex = (userId) => getIndexChunks(userId)

export const retrieveStudyContext = async (userId, question) => {
  const aiClient = createStudyAiClient()
  const chunks = await getIndexChunks(userId)
  if (chunks.length === 0) {
    throw new Error('Index study materials before asking a study question.')
  }

  const embeddings = await aiClient.createEmbeddings([question], 'QUESTION_ANSWERING')
  const embedding = embeddings[0]
  if (!Array.isArray(embedding)) {
    throw new Error('The query embedding response was invalid.')
  }

  return findRelevantChunks(chunks, embedding)
}

export const createAiReply = async ({ mode, question, history, context }) => {
  const aiClient = createStudyAiClient()
  return aiClient.createReply({ mode, question, history, context })
}
