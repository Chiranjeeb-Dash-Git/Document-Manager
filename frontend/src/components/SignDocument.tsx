import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document as PdfDocument, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import api from '../api';
import { DndContext, useDraggable } from '@dnd-kit/core';
import '../fonts.css';
import { FileSignature, CheckCircle, Upload, Type, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import heic2any from 'heic2any';
import { motion } from 'framer-motion';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PDF_DISPLAY_WIDTH = 760;
const FONT_SIZE_PT = 32;

const FONT_FAMILY_MAP: Record<string, string> = {
  'Dancing Script': "'Local Dancing Script', cursive",
  'Caveat': "'Local Caveat', cursive",
  'Pacifico': "'Local Pacifico', cursive",
  'Great Vibes': "'Local Great Vibes', cursive",
  'Sacramento': "'Local Sacramento', cursive",
  'Satisfy': "'Local Satisfy', cursive",
};

const COLOR_MAP: Record<string, string> = {
  black: '#000000',
  blue: '#1d4ed8',
  red: '#b91c1c',
};

// ─── Draggable Text Signature ──────────────────────────────────────────────
interface TextDragProps {
  id: string;
  left: number;
  top: number;
  text: string;
  font: string;
  color: string;
  fontSizePx: number;
  rotation: number;
  sigRef: React.RefObject<HTMLDivElement | null>;
}

function DraggableTextSignature({ id, left, top, text, font, color, fontSizePx, rotation, sigRef }: TextDragProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const finalTransform = [
    transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : '',
    `rotate(${rotation || 0}deg)`
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={setNodeRef}
      style={{ position: 'absolute', left, top, cursor: 'grab', transform: finalTransform }}
      {...listeners}
      {...attributes}
      className="outline-dashed outline-2 outline-indigo-500 outline-offset-4 z-50"
    >
      <div
        ref={sigRef}
        style={{
          fontFamily: FONT_FAMILY_MAP[font] || FONT_FAMILY_MAP['Dancing Script'],
          fontSize: fontSizePx,
          lineHeight: 1,
          color: COLOR_MAP[color] || '#000000',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          padding: '4px',
          margin: '-4px',
        }}
      >
        {text}
      </div>
    </div>
  );
}

// ─── Draggable Image Signature ─────────────────────────────────────────────
interface ImageDragProps {
  id: string;
  left: number;
  top: number;
  imgSrc: string;
  displayWidth: number;
  displayHeight: number;
  rotation: number;
  sigRef: React.RefObject<HTMLDivElement | null>;
}

function DraggableImageSignature({ id, left, top, imgSrc, displayWidth, displayHeight, rotation, sigRef }: ImageDragProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const finalTransform = [
    transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : '',
    `rotate(${rotation || 0}deg)`
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={setNodeRef}
      style={{ position: 'absolute', left, top, cursor: 'grab', transform: finalTransform }}
      {...listeners}
      {...attributes}
      className="outline-dashed outline-2 outline-indigo-500 outline-offset-4 z-50"
    >
      <div ref={sigRef}>
        <img
          src={imgSrc}
          alt="Uploaded signature"
          style={{
            width: displayWidth,
            height: displayHeight,
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}

// ─── Helper: convert any image file to a transparent PNG data URL ───────────
function processSignatureImage(file: File): Promise<{ dataUrl: string; naturalW: number; naturalH: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        const maxDim = 800;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          const scale = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;

        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        let hasTransparency = false;
        for (let i = 3; i < data.length; i += 16) {
          if (data[i] < 250) {
            hasTransparency = true;
            break;
          }
        }

        if (!hasTransparency) {
          let sumL = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            sumL += 0.299 * r + 0.587 * g + 0.114 * b;
          }
          const avgL = sumL / (data.length / 4);
          const threshold = avgL * 0.8;
          const inkDarkness = avgL * 0.3;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            if (lum > threshold) {
              data[i + 3] = 0; 
            } else {
              let alpha = 255 * (1 - Math.max(0, lum - inkDarkness) / (threshold - inkDarkness));
              data[i + 3] = Math.max(0, Math.min(255, alpha));
              data[i] = Math.max(0, r - 50);
              data[i + 1] = Math.max(0, g - 50);
              data[i + 2] = Math.max(0, b - 50);
            }
          }
          ctx.putImageData(imageData, 0, 0);
        }

        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          naturalW: w,
          naturalH: h,
        });
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function SignDocument() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);

  const [mode, setMode] = useState<'type' | 'upload'>('upload');

  const [sigPos, setSigPos] = useState({ x: 80, y: 80 });
  const [signatureText, setSignatureText] = useState('Your Signature');
  const [selectedFont, setSelectedFont] = useState('Dancing Script');
  const [selectedColor, setSelectedColor] = useState('blue');

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadDisplayW, setUploadDisplayW] = useState(200);
  const [uploadDisplayH, setUploadDisplayH] = useState(80);
  const [sigScale, setSigScale] = useState(1);
  const [sigRotate, setSigRotate] = useState(0);

  const [pdfW, setPdfW] = useState(595);
  const [pdfH, setPdfH] = useState(842);

  const sigRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scale = PDF_DISPLAY_WIDTH / pdfW;
  const fontSizePx = FONT_SIZE_PT * scale;

  const fontOptions = [
    { value: 'Dancing Script', label: 'Dancing Script' },
    { value: 'Great Vibes', label: 'Great Vibes' },
    { value: 'Sacramento', label: 'Sacramento' },
    { value: 'Satisfy', label: 'Satisfy' },
    { value: 'Caveat', label: 'Caveat' },
    { value: 'Pacifico', label: 'Pacifico' },
  ];

  useEffect(() => {
    api.get(`/documents/${id}`)
      .then(r => setDoc(r.data))
      .catch(console.error);
  }, [id]);

  const onPageLoadSuccess = (page: any) => {
    setPdfW(page.originalWidth);
    setPdfH(page.originalHeight);
    setSigPos({ x: 40, y: 40 });
  };

  const handleDragEnd = (event: any) => {
    setSigPos(prev => ({
      x: prev.x + event.delta.x,
      y: prev.y + event.delta.y,
    }));
  };

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);
    if (!isHeic && !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPG, PNG, WebP, or HEIC image.');
      return;
    }

    try {
      setError('');
      let processableFile = file;
      if (isHeic) {
        const blob = await heic2any({ blob: file, toType: 'image/png', quality: 1 }) as Blob;
        processableFile = new File([blob], file.name.replace(/\.heic$/i, '.png'), { type: 'image/png' });
      }
      const { dataUrl, naturalW, naturalH } = await processSignatureImage(processableFile);
      setUploadedImage(dataUrl);

      const maxDisplayW = 250;
      const aspect = naturalW / naturalH;
      const w = Math.min(naturalW, maxDisplayW);
      const h = w / aspect;
      setUploadDisplayW(w);
      setUploadDisplayH(h);
      setSigScale(1);
    } catch {
      setError('Failed to process image. Please try another file.');
    }
  }, []);

  const scaledDisplayW = uploadDisplayW * sigScale;
  const scaledDisplayH = uploadDisplayH * sigScale;

  const submitSignature = async () => {
    if (mode === 'type' && !signatureText.trim()) {
      setError('Please enter signature text.');
      return;
    }
    if (mode === 'upload' && !uploadedImage) {
      setError('Please upload a signature image.');
      return;
    }

    setError('');
    setSigning(true);

    try {
      let signatureImageData: string;
      let imgW: number;
      let imgH: number;

      if (mode === 'type') {
        if (!sigRef.current) return;
        signatureImageData = await toPng(sigRef.current, {
          pixelRatio: 3,
          skipAutoScale: true,
        });
        const rect = sigRef.current.getBoundingClientRect();
        imgW = rect.width;
        imgH = rect.height;
      } else {
        signatureImageData = uploadedImage!;
        imgW = scaledDisplayW;
        imgH = scaledDisplayH;
      }

      const pdfImageWidth = imgW / scale;
      const pdfImageHeight = imgH / scale;
      const pdfX = sigPos.x / scale;
      const screenBottomY = sigPos.y + imgH;
      const pdfY = pdfH - (screenBottomY / scale);

      await api.post(`/documents/${id}/sign`, {
        x: Math.max(0, pdfX),
        y: Math.max(0, pdfY),
        width: pdfImageWidth,
        height: pdfImageHeight,
        rotation: mode === 'type' ? 0 : sigRotate,
        pageNum: pageNumber,
        signatureImage: signatureImageData,
      });

      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Failed to sign. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  const canSubmit = mode === 'type' ? signatureText.trim().length > 0 : !!uploadedImage;

  if (!doc) return (
    <div className="flex items-center justify-center h-[calc(100vh-120px)]">
      <div className="text-slate-400 animate-pulse">Loading document…</div>
    </div>
  );

  return (
    <motion.div 
      className="signing-workspace signing-workspace-private"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* ─── Left Sidebar ───────────────────────────────────────────── */}
      <div className="signing-sidebar w-80 bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 p-6 flex flex-col gap-5 overflow-y-auto">
        <div>
          <h2 className="text-xl font-bold text-white">Sign Document</h2>
          <p className="text-xs text-slate-400 mt-1 truncate" title={doc.filename}>{doc.filename}</p>
        </div>

        {/* ─── TABS HEADER ─── */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setMode('upload')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              mode === 'upload' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSignature className="w-4 h-4" /> Signature
          </button>
          <button
            onClick={() => setMode('type')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              mode === 'type' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Type className="w-4 h-4" /> Type
          </button>
        </div>

        {/* ─── TYPE MODE ─── */}
        {mode === 'type' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">Signature Text</label>
              <input
                type="text"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                placeholder="Your full name…"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">Handwriting Style</label>
              <div className="grid grid-cols-2 gap-2">
                {fontOptions.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setSelectedFont(f.value)}
                    className={`px-3 py-2 rounded-xl border text-left transition-all ${
                      selectedFont === f.value
                        ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                        : 'border-slate-700 hover:border-slate-500 bg-slate-800/30 text-slate-300'
                    }`}
                  >
                    <span style={{ fontFamily: FONT_FAMILY_MAP[f.value], fontSize: '15px' }}>
                      {f.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Preview</p>
              <div
                style={{
                  fontFamily: FONT_FAMILY_MAP[selectedFont],
                  fontSize: '28px',
                  color: COLOR_MAP[selectedColor],
                  lineHeight: 1.4,
                  minHeight: '44px',
                }}
                className="text-center overflow-hidden bg-white/90 rounded-lg py-2"
              >
                {signatureText || 'Your Signature'}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Ink Color</label>
              <div className="flex gap-4 items-center">
                {[['black', '#000000', 'Black'], ['blue', '#1d4ed8', 'Blue'], ['red', '#b91c1c', 'Red']].map(([c, hex, label]) => (
                  <button key={c} onClick={() => setSelectedColor(c)} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        selectedColor === c ? 'scale-110 border-indigo-400 shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'border-slate-600 hover:scale-105'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                    <span className={`text-xs ${selectedColor === c ? 'text-indigo-400 font-medium' : 'text-slate-400'}`}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── UPLOAD MODE ─── */}
        {mode === 'upload' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-2">
            {!uploadedImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-[1.5px] border-dashed border-indigo-500/40 bg-indigo-500/5 rounded-xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-indigo-500/10 transition-colors h-56 group"
              >
                <button className="px-6 py-2.5 border border-indigo-400 text-indigo-400 font-semibold text-sm rounded-lg group-hover:bg-indigo-500/10 transition-colors">
                  Upload signature
                </button>
                <div className="text-center mt-2">
                  <p className="text-slate-400 text-sm font-light">or drop file here</p>
                  <p className="text-xs text-slate-500 mt-4 font-light">Accepted: PNG, JPG, HEIC</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                  <button
                    onClick={() => {
                      setUploadedImage(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors border border-red-500/20"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                  <p className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">Uploaded Signature</p>
                  <div className="flex justify-center bg-white/90 rounded-lg p-2">
                    <img
                      src={uploadedImage}
                      alt="Signature preview"
                      className="max-h-20 object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Size
                    <span className="text-xs text-slate-500 font-normal ml-2">({Math.round(sigScale * 100)}%)</span>
                  </label>
                  <input
                    type="range"
                    min="0.3"
                    max="3"
                    step="0.05"
                    value={sigScale}
                    onChange={(e) => setSigScale(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Small</span>
                    <span>Large</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Rotation
                    <span className="text-xs text-slate-500 font-normal ml-2">({sigRotate}°)</span>
                  </label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="5"
                    value={sigRotate}
                    onChange={(e) => setSigRotate(parseInt(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>-180°</span>
                    <span>0°</span>
                    <span>+180°</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setUploadedImage(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    setTimeout(() => fileInputRef.current?.click(), 100);
                  }}
                  className="w-full py-2.5 text-sm font-medium text-slate-300 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" /> Replace Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            )}
          </motion.div>
        )}

        <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20 text-xs text-indigo-200 mt-2">
          <p className="flex items-center gap-1.5 font-semibold mb-2 text-indigo-300 text-sm">
            <CheckCircle className="w-4 h-4" /> How to sign
          </p>
          <ul className="list-disc pl-5 space-y-1 text-indigo-200/80">
            {mode === 'type' ? (
              <>
                <li>Type your name above</li>
                <li>Pick a handwriting style &amp; color</li>
              </>
            ) : (
              <>
                <li>Upload your signature image</li>
                <li>Adjust size with the slider</li>
              </>
            )}
            <li>Drag the overlay to the exact spot</li>
            <li>Click Finish &amp; Sign</li>
          </ul>
        </div>

        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        <label className="flex items-start gap-2 cursor-pointer group mt-2">
          <input
            type="checkbox"
            checked={isAgreed}
            onChange={(e) => setIsAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
          />
          <span className="text-xs text-slate-300 group-hover:text-slate-200 transition-colors">
            I agree to use electronic records and signatures and I validate and approve this document.
          </span>
        </label>

        <button
          onClick={submitSignature}
          disabled={signing || !canSubmit || !isAgreed}
          className="mt-auto py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-all shadow-[0_4px_20px_rgba(79,70,229,0.3)] disabled:shadow-none flex items-center justify-center gap-2"
        >
          <FileSignature className="w-5 h-5" />
          {signing ? 'Processing…' : 'Finish & Sign'}
        </button>
      </div>

      {/* ─── PDF Viewer ─────────────────────────────────────────────── */}
      <div className="signing-pdf-panel flex-1 flex flex-col min-w-0 bg-slate-900/50 rounded-2xl border border-slate-800 shadow-inner relative overflow-hidden">
        
        {/* PDF Canvas Area */}
        <div className="signing-pdf-scroll">
          <DndContext onDragEnd={handleDragEnd}>
            <div style={{ position: 'relative', width: PDF_DISPLAY_WIDTH, height: Math.ceil(pdfH * scale), flexShrink: 0 }} className="signing-pdf-page shadow-2xl bg-white rounded-md ring-1 ring-slate-800">
              <PdfDocument
                file={`http://localhost:5000/uploads/${encodeURIComponent(doc.filepath)}`}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              >
                <Page
                  pageNumber={pageNumber}
                  width={PDF_DISPLAY_WIDTH}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onLoadSuccess={onPageLoadSuccess}
                />
              </PdfDocument>

              {mode === 'type' ? (
                <DraggableTextSignature
                  id="sig-1"
                  left={sigPos.x}
                  top={sigPos.y}
                  text={signatureText}
                  font={selectedFont}
                  color={selectedColor}
                  fontSizePx={fontSizePx}
                  rotation={sigRotate}
                  sigRef={sigRef}
                />
              ) : uploadedImage ? (
                <DraggableImageSignature
                  id="sig-1"
                  left={sigPos.x}
                  top={sigPos.y}
                  imgSrc={uploadedImage}
                  displayWidth={scaledDisplayW}
                  displayHeight={scaledDisplayH}
                  rotation={sigRotate}
                  sigRef={sigRef}
                />
              ) : null}
            </div>
          </DndContext>
        </div>

        {/* Pagination Controls */}
        {numPages && numPages > 1 && (
          <div className="flex items-center justify-center gap-4 bg-slate-800 border-t border-slate-700 px-5 py-3">
            <button
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              className="w-8 h-8 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white font-bold transition-colors"
            >‹</button>
            <span className="text-sm text-slate-300 font-medium">Page <span className="text-white">{pageNumber}</span> of {numPages}</span>
            <button
              onClick={() => setPageNumber(p => Math.min(numPages!, p + 1))}
              disabled={pageNumber >= numPages}
              className="w-8 h-8 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white font-bold transition-colors"
            >›</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
