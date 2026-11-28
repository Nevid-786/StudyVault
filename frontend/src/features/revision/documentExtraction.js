const MAX_FILE_BYTES = 25 * 1024 * 1024
const MAX_EXTRACTED_CHARACTERS = 250_000

const getExtension = (name = '') => name.split('.').pop()?.toLowerCase() || ''

const normalizeText = (text) => text
  .split(String.fromCharCode(0)).join('')
  .replace(/\r\n?/g, '\n')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

const extractPdf = async (file) => {
  const [pdfjsLib, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default
  const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer() })
  try {
    const pdfDocument = await loadingTask.promise
    if (pdfDocument.numPages > 250) {
      throw new Error('PDF exceeds the 250-page indexing limit.')
    }

    const pages = []
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber)
      const content = await page.getTextContent()
      pages.push({
        pageNumber,
        text: content.items.map((item) => ('str' in item ? item.str : '')).join(' '),
      })
      page.cleanup()
    }

    return pages
  } finally {
    await loadingTask.destroy()
  }
}

const extractPptx = async (file) => {
  const { unzipSync } = await import('fflate')
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()))
  const slideNames = Object.keys(archive)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((left, right) => {
      const leftNumber = Number(left.match(/slide(\d+)/)?.[1] || 0)
      const rightNumber = Number(right.match(/slide(\d+)/)?.[1] || 0)
      return leftNumber - rightNumber
    })

  if (slideNames.length === 0) {
    throw new Error('No readable slides were found in this presentation.')
  }

  return slideNames.map((name) => {
    const xml = new DOMParser().parseFromString(
      new TextDecoder().decode(archive[name]),
      'application/xml',
    )
    if (xml.querySelector('parsererror')) {
      throw new Error('A presentation slide could not be read.')
    }
    return Array.from(xml.getElementsByTagNameNS('*', 't'))
      .map((node) => node.textContent)
      .filter(Boolean)
      .join(' ')
  }).join('\n\n')
}

const extractImage = async (file) => {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')

  try {
    const result = await worker.recognize(file)
    return result.data.text
  } finally {
    await worker.terminate()
  }
}

export const extractMaterialDocument = async (file, fileName = file?.name || '') => {
  if (!(file instanceof Blob)) {
    throw new TypeError('The selected material has no readable file data.')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('File exceeds the 25 MB indexing limit.')
  }

  const extension = getExtension(fileName)
  let text
  let pages = null

  if (extension === 'pdf' || file.type === 'application/pdf') {
    pages = await extractPdf(file)
    text = pages.map((page) => page.text).join('\n\n')
  } else if (extension === 'docx') {
    const mammothModule = await import('mammoth/mammoth.browser.js')
    const mammoth = mammothModule.default || mammothModule
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    text = result.value
  } else if (extension === 'pptx') {
    text = await extractPptx(file)
  } else if (['txt', 'md', 'csv'].includes(extension) || file.type.startsWith('text/')) {
    text = await file.text()
  } else if (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
    text = await extractImage(file)
  } else if (['doc', 'ppt'].includes(extension)) {
    throw new Error(`Legacy .${extension} files are not supported. Save the file as .${extension}x and retry.`)
  } else {
    throw new Error('Unsupported file type. Use PDF, DOCX, PPTX, TXT, Markdown, CSV, or an image.')
  }

  const normalizedText = normalizeText(text)
  if (!normalizedText) {
    throw new Error('No selectable text was found in this file.')
  }
  if (normalizedText.length > MAX_EXTRACTED_CHARACTERS) {
    throw new Error('Extracted text exceeds the 250,000-character per-file limit.')
  }

  return {
    text: normalizedText,
    pages: pages
      ?.map(({ pageNumber, text: pageText }) => ({
        pageNumber,
        text: normalizeText(pageText),
      }))
      .filter((page) => page.text) ?? null,
  }
}

export const extractMaterialText = async (file, fileName = file?.name || '') => (
  (await extractMaterialDocument(file, fileName)).text
)
