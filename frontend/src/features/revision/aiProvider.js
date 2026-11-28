export const RAG_PROVIDERS = {
  studyVault: 'studyVault',
  user: 'user',
}

const USER_API_KEY_STORAGE_KEY = 'studyVault.rag.userGeminiApiKey'

export const resolveRagProvider = (mode) => (
  typeof mode === 'string' && mode.trim().toLowerCase() === RAG_PROVIDERS.user
    ? RAG_PROVIDERS.user
    : RAG_PROVIDERS.studyVault
)

const getBrowserStorage = (name) => {
  const storage = globalThis[name]
  if (!storage) throw new Error(`${name} is unavailable in this browser.`)
  return storage
}

export const getRagProvider = () => resolveRagProvider(import.meta.env?.VITE_RAG_PROVIDER_MODE)

export const hasUserGeminiApiKey = () => Boolean(
  getBrowserStorage('sessionStorage').getItem(USER_API_KEY_STORAGE_KEY),
)

export const saveUserGeminiApiKey = (value) => {
  const apiKey = value.trim()
  if (!apiKey || apiKey.length > 1024) {
    throw new TypeError('Enter a valid Gemini API key (up to 1,024 characters).')
  }

  // Keep the secret only in this tab's session storage; it is excluded from backups and persistent settings.
  getBrowserStorage('sessionStorage').setItem(USER_API_KEY_STORAGE_KEY, apiKey)
}

export const getUserGeminiApiKey = () => (
  getBrowserStorage('sessionStorage').getItem(USER_API_KEY_STORAGE_KEY) || ''
)

export const clearUserGeminiApiKey = () => {
  getBrowserStorage('sessionStorage').removeItem(USER_API_KEY_STORAGE_KEY)
}
