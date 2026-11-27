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
