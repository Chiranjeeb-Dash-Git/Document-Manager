import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api, { API_BASE } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, CheckCircle, Clock, ShieldCheck, User, MapPin,
  Phone, Hash, X, Download, ChevronRight, Eye, Fingerprint, Calendar
} from 'lucide-react';
import { Document as PdfDocument, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

/* ── Signer ID Card Modal ────────────────────────────────────────── */
function SignerIDCard({ signer, onClose, onViewMedia }: {
  signer: any;
  onClose: () => void;
  onViewMedia: (src: string) => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <motion.div
        className="relative w-full max-w-md z-10"
        initial={{ scale: 0.85, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.85, y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ID Card */}
        <div className="rounded-3xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] border border-slate-700/60">
          {/* Card Header - gradient banner */}
          <div className="relative h-28 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-40" />
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900/90 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors backdrop-blur-sm"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute top-4 left-5 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-white/80" />
              <span className="text-white/90 text-xs font-semibold tracking-widest uppercase">Verified Signer</span>
            </div>
          </div>

          {/* Card Body */}
          <div className="bg-slate-900 px-6 pb-6 pt-0 -mt-8 relative">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold shadow-xl border-[3px] border-slate-900 mb-4">
              {(signer.signerName || '?')[0]?.toUpperCase()}
            </div>

            <h3 className="text-xl font-bold text-white mb-0.5 tracking-tight">{signer.signerName || 'Unknown'}</h3>
            <div className="flex items-center gap-1.5 mb-5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="w-3 h-3" /> {signer.action}
              </span>
            </div>

            {/* Details Grid */}
            <div className="space-y-3.5 mb-6">
              <DetailRow icon={<Phone className="w-4 h-4" />} label="Phone" value={signer.signerPhone} />
              <DetailRow icon={<MapPin className="w-4 h-4" />} label="Address" value={signer.signerAddress} />
              <DetailRow icon={<Hash className="w-4 h-4" />} label="Govt ID" value={signer.signerGovtId} mono />
              <DetailRow icon={<Calendar className="w-4 h-4" />} label="Signed On" value={new Date(signer.createdAt).toLocaleString()} />
              <DetailRow icon={<Fingerprint className="w-4 h-4" />} label="IP Address" value={signer.signerIp} mono />
            </div>

            {/* Photos Row */}
            {(signer.signatureImageBase64 || signer.signerGovtIdImageBase64) && (
              <div className="pt-4 border-t border-slate-800/80 flex gap-4">
                {signer.signatureImageBase64 && (
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 font-bold">Signature</p>
                    <button
                      onClick={() => onViewMedia(signer.signatureImageBase64)}
                      className="w-full bg-white rounded-xl p-3 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-zoom-in border border-slate-200"
                    >
                      <img src={signer.signatureImageBase64} alt="Signature" className="max-h-12 mx-auto object-contain" />
                    </button>
                  </div>
                )}
                {signer.signerGovtIdImageBase64 && (
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 font-bold">Govt ID</p>
                    <button
                      onClick={() => onViewMedia(signer.signerGovtIdImageBase64)}
                      className="w-full bg-slate-800 rounded-xl p-2 hover:bg-slate-700 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-zoom-in border border-slate-700"
                    >
                      <img src={signer.signerGovtIdImageBase64} alt="Govt ID" className="max-h-14 mx-auto object-contain rounded-md" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DetailRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase text-slate-500 tracking-wider font-semibold leading-none mb-1">{label}</p>
        <p className={`text-sm text-slate-200 truncate ${mono ? 'font-mono text-indigo-300 text-xs' : ''}`}>{value || '-'}</p>
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────── */
export default function PublicDocumentView() {
  const { token } = useParams<{ token: string }>();
  const [docData, setDocData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfZoomed, setPdfZoomed] = useState(false);
  const [selectedSigner, setSelectedSigner] = useState<any>(null);
  const [viewingMedia, setViewingMedia] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await api.get(`/public/document/${token}/view`);
        setDocData(res.data);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.error || 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [token]);

  /* Loading screen */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent"
        />
        <span className="text-slate-400 text-sm tracking-widest uppercase animate-pulse">Loading Document…</span>
      </div>
    );
  }

  /* Error screen */
  if (error || !docData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 px-4">
        <ShieldCheck className="w-16 h-16 text-slate-700 mb-4" />
        <h2 className="text-xl text-slate-300 font-semibold mb-2">Access Denied</h2>
        <p className="text-slate-500 text-center max-w-md">{error || 'Invalid or expired document link.'}</p>
      </div>
    );
  }

  const fileUrl = `${API_BASE}/uploads/${encodeURIComponent(docData.filepath)}`;
  const sigCount = docData.signatures?.length || 0;

  return (
    <div className="min-h-screen bg-slate-950 font-sans">

      {/* ─── Top Navigation Bar ─── */}
      <motion.header
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="sticky top-0 z-50 bg-slate-900/70 backdrop-blur-xl border-b border-slate-800/60"
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">{docData.filename}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${docData.status === 'Signed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {docData.status === 'Signed' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {docData.status}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] text-slate-500">{sigCount} Signer{sigCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          <a
            href={fileUrl}
            download={docData.filename}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Download className="w-4 h-4" /> Download PDF
          </a>
        </div>
      </motion.header>

      {/* ─── Main Content ─── */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

        {/* ── Section 1: Document Preview Card ── */}
        <motion.section
          className="lg:col-span-7"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-200">Document Preview</h2>
          </div>

          <div
            onClick={() => setPdfZoomed(true)}
            className="relative group cursor-pointer bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-xl hover:border-indigo-500/30 hover:shadow-indigo-500/5 transition-all duration-300 overflow-hidden max-h-[500px]"
          >
            {/* Gradient fade at bottom to indicate more content */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent z-10 pointer-events-none rounded-b-2xl" />

            {/* Clickable overlay */}
            <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 rounded-2xl">
              <div className="flex items-center gap-2 px-5 py-2.5 bg-white/15 backdrop-blur-sm rounded-full text-white text-sm font-semibold border border-white/20 shadow-xl">
                <Eye className="w-4 h-4" /> Click to View Full Document
              </div>
            </div>

            <div className="flex justify-center">
              <div className="bg-white rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-800 w-full max-w-[600px]">
                <PdfDocument
                  file={fileUrl}
                  onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                >
                  <Page
                    pageNumber={1}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    width={600}
                    className="[&>canvas]:!max-w-full [&>canvas]:!h-auto"
                  />
                </PdfDocument>
              </div>
            </div>

            {numPages && numPages > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-xs text-slate-400 bg-slate-800/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-700/50">
                {numPages} pages total
              </div>
            )}
          </div>
        </motion.section>

        {/* ── Section 2: Signers List ── */}
        <motion.section
          className="lg:col-span-5"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-200">Signers</h2>
              <span className="ml-1 text-xs font-bold bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20">{sigCount}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5" /> Audit Trail
            </div>
          </div>

          {sigCount > 0 ? (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {docData.signatures.map((sig: any, idx: number) => (
                <motion.button
                  key={sig.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(0.2 + idx * 0.06, 1.5) }}
                  onClick={() => setSelectedSigner(sig)}
                  className="w-full group flex items-center gap-4 px-5 py-4 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/30 rounded-2xl transition-all duration-200 text-left cursor-pointer"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/80 to-blue-500/80 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md group-hover:shadow-indigo-500/20 transition-shadow">
                    {(sig.signerName || '?')[0]?.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors truncate">{sig.signerName || 'Unknown Signer'}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{new Date(sig.createdAt).toLocaleString()}</p>
                  </div>

                  {/* Badge + Arrow */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                      <CheckCircle className="w-3 h-3" /> Signed
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center justify-center py-16 px-4 bg-slate-900/30 border border-slate-800/50 rounded-2xl border-dashed"
            >
              <Clock className="w-10 h-10 text-slate-700 mb-3" />
              <h3 className="text-slate-400 font-medium mb-1">Awaiting Signatures</h3>
              <p className="text-slate-600 text-sm text-center max-w-xs">This document has no signatures yet. They will appear here once submitted.</p>
            </motion.div>
          )}
        </motion.section>
      </main>

      {/* ─── PDF Full-Screen Zoom Modal ─── */}
      <AnimatePresence>
        {pdfZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md overflow-y-auto"
            onClick={() => setPdfZoomed(false)}
          >
            {/* Close bar */}
            <div className="sticky top-0 z-[100] flex items-center justify-between px-6 py-3 bg-slate-900/80 border-b border-slate-800/60 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
                <FileText className="w-4 h-4 text-indigo-400" /> {docData.filename}
                {numPages && <span className="text-slate-500 text-xs">({numPages} page{numPages > 1 ? 's' : ''})</span>}
              </div>
              <button onClick={() => setPdfZoomed(false)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable PDF */}
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="p-6 sm:p-10 flex justify-center min-h-screen"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-800 w-full max-w-[800px] h-fit">
                <PdfDocument file={fileUrl}>
                  {Array.from(new Array(numPages || 0), (_, index) => (
                    <div key={`zoom_page_${index + 1}`} className="border-b border-slate-200 last:border-b-0">
                      <Page
                        pageNumber={index + 1}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        width={800}
                        className="[&>canvas]:!max-w-full [&>canvas]:!h-auto flex justify-center"
                      />
                    </div>
                  ))}
                </PdfDocument>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Signer ID Card Modal ─── */}
      <AnimatePresence>
        {selectedSigner && (
          <SignerIDCard
            signer={selectedSigner}
            onClose={() => setSelectedSigner(null)}
            onViewMedia={(src) => { setSelectedSigner(null); setTimeout(() => setViewingMedia(src), 200); }}
          />
        )}
      </AnimatePresence>

      {/* ─── Image/PDF Lightbox ─── */}
      <AnimatePresence>
        {viewingMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-8"
            onClick={() => setViewingMedia(null)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setViewingMedia(null); }}
              className="absolute top-6 right-6 p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors z-50 border border-slate-700 shadow-xl"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 30 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              className="w-full h-full max-w-5xl flex items-center justify-center"
            >
              {viewingMedia.startsWith('data:application/pdf') ? (
                <iframe
                  src={viewingMedia}
                  className="w-full h-full border-none rounded-2xl bg-white shadow-2xl ring-1 ring-slate-800"
                  title="PDF Preview"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img
                  src={viewingMedia}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-slate-800 bg-white/5"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
