import assert from 'node:assert/strict'
import test from 'node:test'
import { extractMaterialText } from './documentExtraction.js'
import { loadRevisionChat, saveRevisionChat } from './chatStorage.js'
import {
  chunkMaterialText,
  chunkText,
  cosineSimilarity,
  mergeConversationContext,
} from './ragUtils.js'

test('extractMaterialText reads plain-text study files', async () => {
  const file = new Blob(['Unit 1\n\nPhotosynthesis basics'], { type: 'text/plain' })

  assert.equal(await extractMaterialText(file, 'biology-notes.txt'), 'Unit 1\n\nPhotosynthesis basics')
})

test('extractMaterialText clearly rejects legacy Word documents', async () => {
  const file = new Blob(['legacy document'], { type: 'application/msword' })

  await assert.rejects(
    extractMaterialText(file, 'notes.doc'),
    /Legacy \.doc files are not supported/,
  )
})

test('chunkText returns no chunks for empty input', () => {
  assert.deepEqual(chunkText(' \n '), [])
})

test('chunkText preserves overlapping passages within the configured size', () => {
  const chunks = chunkText('biology '.repeat(100), 100, 20)

  assert.ok(chunks.length > 1)
  assert.ok(chunks.every((chunk) => chunk.length <= 100))
  assert.equal(chunks[0].slice(-20), chunks[1].slice(0, 20))
})

test('chunkMaterialText keeps PDF page numbers with their passages', () => {
  const chunks = chunkMaterialText({
    text: 'First page text\n\nSecond page text',
    pages: [
      { pageNumber: 1, text: 'First page text' },
      { pageNumber: 2, text: 'Second page text' },
    ],
  })

  assert.deepEqual(chunks, [
    { text: 'First page text', page: 1 },
    { text: 'Second page text', page: 2 },
  ])
})

test('mergeConversationContext carries recent source chunks into follow-up turns', () => {
  const previousContext = Array.from({ length: 5 }, (_, index) => ({
    id: `previous-${index + 1}`,
  }))
  const retrievedChunks = [
    previousContext[4],
    ...Array.from({ length: 4 }, (_, index) => ({ id: `current-${index + 1}` })),
  ]
  const messages = [{ role: 'model', context: previousContext }]

  assert.deepEqual(
    mergeConversationContext(messages, retrievedChunks).map((chunk) => chunk.id),
    ['previous-2', 'previous-3', 'previous-4', 'previous-5', 'current-1', 'current-2', 'current-3'],
  )
})

test('revision chat survives reload and stores only the latest source context', () => {
  const entries = new Map()
  const storage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  }
  const chat = {
    study: [
      { role: 'user', text: 'What is ANN?' },
      {
        role: 'model',
        text: 'An artificial neural network.',
        sources: [{ ids: ['S1'], title: 'Notes.pdf', page: 4 }],
        context: [{ id: 'chunk-1', title: 'Notes.pdf', text: 'ANN notes', embedding: [0.1, 0.2] }],
      },
    ],
    general: [
      { role: 'user', text: 'Explain it simply.' },
      { role: 'model', text: 'It is a computing model.' },
    ],
  }

  saveRevisionChat('user-1', chat, storage)

  const restored = loadRevisionChat('user-1', storage)
  assert.equal(restored.study[0].text, 'What is ANN?')
  assert.equal(restored.study[1].sources[0].page, 4)
  assert.equal(restored.study[1].context[0].text, 'ANN notes')
  assert.equal('embedding' in restored.study[1].context[0], false)
  assert.deepEqual(restored.general, chat.general)
  assert.equal(loadRevisionChat('user-2', storage), null)
})

test('revision chat reports corrupt saved history instead of silently replacing it', () => {
  const storage = {
    getItem: () => '{',
    setItem: () => {},
  }

  assert.throws(
    () => loadRevisionChat('user-1', storage),
    /Saved revision chat is unreadable/,
  )
})

test('cosineSimilarity ranks identical and orthogonal vectors correctly', () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1)
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0)
  assert.equal(cosineSimilarity([1], [1, 0]), 0)
})
