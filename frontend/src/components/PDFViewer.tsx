import { useState } from 'react';
import { Document as PdfDocument, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PDFViewerProps {
  fileUrl: string;
}

export default function PDFViewer({ fileUrl }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', background: '#fee2e2', borderRadius: '8px' }}>
        Failed to load PDF: {error.message}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <PdfDocument
        file={fileUrl}
        onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNumber(1); }}
        onLoadError={(err) => setError(err)}
        loading={
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            Loading PDF...
          </div>
        }
      >
        <Page
          pageNumber={pageNumber}
          renderTextLayer={true}
          renderAnnotationLayer={true}
          width={Math.min(window.innerWidth * 0.85, 800)}
        />
      </PdfDocument>

      {numPages && numPages > 1 && (
        <div className="cin-pdf-controls">
          <button
            onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
            disabled={pageNumber <= 1}
            className="cin-nav-btn"
          >
            ← Prev
          </button>
          <span className="cin-page-info">
            Page {pageNumber} of {numPages}
          </span>
          <button
            onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
            disabled={pageNumber >= numPages}
            className="cin-nav-btn"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
