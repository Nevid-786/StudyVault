import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { createBrowserGeminiClient } from './geminiApiClient.js'
import {
  clearUserGeminiApiKey,
  getRagProvider,
  hasUserGeminiApiKey,
  RAG_PROVIDERS,
  resolveRagProvider,
  saveUserGeminiApiKey,
} from './aiProvider.js'

const originalFetch = globalThis.fetch
const originalSessionStorage = globalThis.sessionStorage

const createStorage = () => {
  const entries = new Map()
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: (key) => entries.delete(key),
  }
}

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalSessionStorage === undefined) delete globalThis.sessionStorage
  else globalThis.sessionStorage = originalSessionStorage
})

test('user Gemini embedding calls send the key in a header without browser cookies', async () => {
  const apiKey = 'test-secret-key'
  let capturedRequest
  globalThis.fetch = async (url, options) => {
    capturedRequest = { url, options }
    return {
      ok: true,
      json: async () => ({ embeddings: [{ values: [0.25, 0.75] }] }),
    }
  }

  const client = createBrowserGeminiClient(apiKey)
  const embeddings = await client.createEmbeddings(['study note'], 'RETRIEVAL_DOCUMENT')

  assert.deepEqual(embeddings, [[0.25, 0.75]])
  assert.equal(capturedRequest.options.headers['x-goog-api-key'], apiKey)
  assert.equal(capturedRequest.options.credentials, 'omit')
  assert.equal(capturedRequest.url.includes(apiKey), false)
  assert.equal(capturedRequest.options.body.includes(apiKey), false)
})

test('user Gemini chat calls send the question directly to Google', async () => {
  const apiKey = 'test-secret-key'
  let capturedRequest
  globalThis.fetch = async (url, options) => {
    capturedRequest = { url, options }
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'A concise answer.' }] } }],
      }),
    }
  }

  const client = createBrowserGeminiClient(apiKey)
  const answer = await client.createReply({
    mode: 'general',
    question: 'Explain spaced repetition.',
    history: [],
    context: [],
  })

  assert.equal(answer, 'A concise answer.')
  assert.match(capturedRequest.url, /^https:\/\/generativelanguage\.googleapis\.com\//)
  assert.equal(capturedRequest.options.headers['x-goog-api-key'], apiKey)
  assert.equal(capturedRequest.options.credentials, 'omit')
})

test('provider mode is deployment-controlled and user keys are session-only', () => {
  globalThis.sessionStorage = createStorage()

  assert.equal(resolveRagProvider('studyVault'), RAG_PROVIDERS.studyVault)
  assert.equal(resolveRagProvider('user'), RAG_PROVIDERS.user)
  assert.equal(resolveRagProvider('invalid'), RAG_PROVIDERS.studyVault)
  assert.equal(getRagProvider(), RAG_PROVIDERS.studyVault)
  saveUserGeminiApiKey('  test-secret-key  ')

  assert.equal(hasUserGeminiApiKey(), true)

  clearUserGeminiApiKey()
  assert.equal(hasUserGeminiApiKey(), false)
})

test('user Gemini client rejects missing keys before making a request', () => {
  assert.throws(() => createBrowserGeminiClient(''), /Save your Gemini API key/)
})
