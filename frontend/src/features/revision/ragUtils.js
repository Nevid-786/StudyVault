export const chunkText = (text, chunkSize = 1400, overlap = 180) => {
  const normalizedText = text.replace(/\s+/g, ' ').trim()
  if (!normalizedText) return []

  const chunks = []
  let start = 0

  while (start < normalizedText.length) {
    let end = Math.min(start + chunkSize, normalizedText.length)

    if (end < normalizedText.length) {
      const boundary = normalizedText.lastIndexOf(' ', end)
      if (boundary > start + chunkSize * 0.6) end = boundary
    }

    const chunk = normalizedText.slice(start, end).trim()
    if (chunk) chunks.push(chunk)
    if (end >= normalizedText.length) break

    start = Math.max(start + 1, end - overlap)
  }

  return chunks
}

export const chunkMaterialText = ({ text, pages }) => (
  Array.isArray(pages) && pages.length > 0
    ? pages.flatMap(({ pageNumber, text: pageText }) =>
      chunkText(pageText).map((chunk) => ({ text: chunk, page: pageNumber })))
    : chunkText(text).map((chunk) => ({ text: chunk, page: null }))
)

export const mergeConversationContext = (previousMessages, retrievedChunks) => {
  const previousAssistant = [...previousMessages].reverse().find((message) => (
    message.role === 'model' && Array.isArray(message.context)
  ))
  const previousContext = previousAssistant?.context.slice(-4) ?? []
  const combined = [...previousContext, ...retrievedChunks.slice(0, 4)]
  const seen = new Set()

  return combined.filter((chunk) => {
    const key = chunk.id || JSON.stringify([chunk.title, chunk.location, chunk.page, chunk.text])
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 8)
}

export const cosineSimilarity = (left, right) => {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || left.length === 0) {
    return 0
  }

  let dotProduct = 0
  let leftMagnitude = 0
  let rightMagnitude = 0

  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index]
    leftMagnitude += left[index] ** 2
    rightMagnitude += right[index] ** 2
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return 0
  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude))
}
