import assert from 'node:assert/strict'
import test from 'node:test'
import { extractMaterialText } from './documentExtraction.js'
import { chunkText, cosineSimilarity } from './ragUtils.js'

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

test('cosineSimilarity ranks identical and orthogonal vectors correctly', () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1)
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0)
  assert.equal(cosineSimilarity([1], [1, 0]), 0)
})
