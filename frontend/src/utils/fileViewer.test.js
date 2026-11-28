import assert from 'node:assert/strict'
import test from 'node:test'
import { getViewerPath } from './fileViewer.js'

test('viewer routing uses the saved file type and safely encodes its ID', () => {
  assert.equal(getViewerPath({ lid: 'file id', type: 'application/pdf' }), '/pdf/file%20id')
  assert.equal(getViewerPath({ lid: 'image-1', name: 'diagram.webp' }), '/image/image-1')
  assert.equal(
    getViewerPath({ lid: 'doc-1', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    '/docx/doc-1',
  )
  assert.equal(getViewerPath({ lid: 'slides-1', name: 'lecture.ppt' }), '/pptx/slides-1')
})

test('viewer routing leaves unsupported files and records without IDs unopened', () => {
  assert.equal(getViewerPath({ lid: 'archive-1', name: 'archive.zip' }), null)
  assert.equal(getViewerPath({ name: 'notes.pdf' }), null)
})
