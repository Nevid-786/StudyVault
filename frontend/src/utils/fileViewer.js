export const getViewerPath = (file) => {
  if (!file?.lid) return null

  const type = (file.type || file.file?.type || '').toLowerCase()
  const fileName = typeof file.name === 'string' ? file.name : ''
  const extension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : ''
  const lid = encodeURIComponent(file.lid)

  if (type === 'application/pdf' || extension === 'pdf') return `/pdf/${lid}`
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) {
    return `/image/${lid}`
  }
  if (type.includes('wordprocessingml') || ['doc', 'docx'].includes(extension)) return `/docx/${lid}`
  if (
    type.includes('presentationml')
    || type === 'application/vnd.ms-powerpoint'
    || ['ppt', 'pptx'].includes(extension)
  ) {
    return `/pptx/${lid}`
  }
  return null
}
