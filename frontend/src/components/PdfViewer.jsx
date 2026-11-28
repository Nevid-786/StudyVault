
import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure the worker in the same file as Document and Page
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export const PDFViewer = ({ pdfFile, file, initialPage = 1, onProgressChange }) => {
  const documentFile = pdfFile || file
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [scrollMode, setScrollMode] = useState(false);
  const [scrollDirection, setScrollDirection] = useState('vertical');
  const scrollContainerRef = useRef(null);
  const pageElements = useRef(new Map());

  useEffect(() => {
    if (numPages) onProgressChange?.({ pageNumber, pageCount: numPages });
  }, [numPages, onProgressChange, pageNumber]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (scrollMode || event.altKey || event.ctrlKey || event.metaKey) return;
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))
      ) return;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        setPageNumber((page) => Math.max(1, page - 1));
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        setPageNumber((page) => Math.min(numPages ?? page, page + 1));
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages, scrollMode]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(Math.min(Math.max(1, initialPage), numPages));
  }

  function goToPreviousPage() {
    const targetPage = Math.max(1, pageNumber - 1);
    setPageNumber(targetPage);
    if (scrollMode) scrollToPage(targetPage);
  }

  function changeZoom(amount) {
    setScale((currentScale) =>
      Math.min(2, Math.max(0.5, Number((currentScale + amount).toFixed(2)))),
    );
  }

  function changeRotation(amount) {
    setRotation((currentRotation) => (currentRotation + amount + 360) % 360);
  }

  function goToNextPage() {
    const targetPage = Math.min(numPages ?? pageNumber, pageNumber + 1);
    setPageNumber(targetPage);
    if (scrollMode) scrollToPage(targetPage);
  }

  function scrollToPage(targetPage) {
    pageElements.current.get(targetPage)?.scrollIntoView({
      behavior: 'smooth',
      block: scrollDirection === 'vertical' ? 'start' : 'nearest',
      inline: scrollDirection === 'horizontal' ? 'start' : 'nearest',
    });
  }

  function updatePageNumberFromScroll() {
    const container = scrollContainerRef.current;
    if (!container || !scrollMode) return;

    const bounds = container.getBoundingClientRect();
    const center = scrollDirection === 'vertical'
      ? bounds.top + bounds.height / 2
      : bounds.left + bounds.width / 2;
    let closestPage = pageNumber;
    let closestDistance = Infinity;

    for (const [page, element] of pageElements.current) {
      const pageBounds = element.getBoundingClientRect();
      const pageCenter = scrollDirection === 'vertical'
        ? pageBounds.top + pageBounds.height / 2
        : pageBounds.left + pageBounds.width / 2;
      const distance = Math.abs(center - pageCenter);
      if (distance < closestDistance) {
        closestPage = page;
        closestDistance = distance;
      }
    }

    setPageNumber((currentPage) => currentPage === closestPage ? currentPage : closestPage);
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#303030] text-white">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-black/30 bg-[#242424] px-4 shadow-md">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
          <span aria-hidden="true" className="text-lg">▤</span>
          <span>PDF Viewer</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={goToPreviousPage}
            disabled={pageNumber <= 1}
            aria-label="Previous page"
            className="rounded px-2 py-1.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹
          </button>
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="rounded bg-black/30 px-2.5 py-1">{pageNumber}</span>
            <span className="text-gray-300">of {numPages ?? '--'}</span>
          </span>
          <button
            type="button"
            onClick={goToNextPage}
            disabled={!numPages || pageNumber >= numPages}
            aria-label="Next page"
            className="rounded px-2 py-1.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => setScrollMode((enabled) => !enabled)}
            aria-pressed={scrollMode}
            className="whitespace-nowrap rounded px-2.5 py-1.5 hover:bg-white/10"
          >
            {scrollMode ? 'Page mode' : 'Scroll mode'}
          </button>
          {scrollMode && (
            <label className="flex items-center gap-1.5 whitespace-nowrap text-gray-300">
              <span>Direction</span>
              <select
                value={scrollDirection}
                onChange={(event) => setScrollDirection(event.target.value)}
                aria-label="Scroll direction"
                className="rounded border border-white/15 bg-[#303030] px-2 py-1.5 text-white"
              >
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
              </select>
            </label>
          )}
        </div>

        <div className="flex items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => changeRotation(-90)}
            aria-label="Rotate counterclockwise"
            className="rounded px-2.5 py-1.5 hover:bg-white/10"
          >
            ↶
          </button>
          <button
            type="button"
            onClick={() => changeRotation(90)}
            aria-label="Rotate clockwise"
            className="rounded px-2.5 py-1.5 hover:bg-white/10"
          >
            ↷
          </button>
          <button
            type="button"
            onClick={() => changeZoom(-0.1)}
            disabled={scale <= 0.5}
            aria-label="Zoom out"
            className="rounded px-2.5 py-1.5 hover:bg-white/10 disabled:opacity-40"
          >
            −
          </button>
          <span className="min-w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={() => changeZoom(0.1)}
            disabled={scale >= 2}
            aria-label="Zoom in"
            className="rounded px-2.5 py-1.5 hover:bg-white/10 disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={updatePageNumberFromScroll}
        className="flex-1 overflow-auto px-4 py-6"
      >
        <Document
          file={documentFile}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<p className="text-center text-gray-300">Loading PDF...</p>}
          error={<p className="text-center text-red-300">Failed to load PDF.</p>}
          className={
            scrollMode
              ? scrollDirection === 'vertical'
                ? 'flex min-w-full flex-col items-center'
                : 'flex w-max min-w-full flex-row items-start gap-6'
              : 'flex justify-center'
          }
        >
          {scrollMode
            ? Array.from({ length: numPages || 0 }, (_, index) => (
                <div
                  key={`page_${index + 1}`}
                  ref={(element) => {
                    if (element) pageElements.current.set(index + 1, element);
                    else pageElements.current.delete(index + 1);
                  }}
                  className={
                    scrollDirection === 'vertical'
                      ? 'mb-6 max-w-full shadow-xl'
                      : 'shrink-0 shadow-xl'
                  }
                >
                  <Page pageNumber={index + 1} scale={scale} rotate={rotation} />
                </div>
              ))
            : <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                className="max-w-full shadow-xl"
              />}
        </Document>
      </div>
    </div>
  );
}


