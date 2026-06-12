import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { API_BASE } from '../api';
import { Document as PdfDocument, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import '../fonts.css';
import { DndContext, useDraggable } from '@dnd-kit/core';
import { FileSignature, CheckCircle, Upload, Type, X, Smartphone } from 'lucide-react';
import { toPng } from 'html-to-image';
import heic2any from 'heic2any';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

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
export default function PublicDocumentSign() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<any>(null);
  const [signerName, setSignerName] = useState('');
  const [signerPhone, setSignerPhone] = useState('');
  const [signerAddress, setSignerAddress] = useState('');
  const [signerGovtId, setSignerGovtId] = useState('');
  const [signerGovtIdImage, setSignerGovtIdImage] = useState<{name: string, data: string} | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);

  const [mode, setMode] = useState<'type' | 'upload' | 'mobile'>('upload');

  const [sigPos, setSigPos] = useState({ x: 80, y: 80 });
  const [signatureText, setSignatureText] = useState('Your Signature');
  const [selectedFont, setSelectedFont] = useState('Dancing Script');
  const [selectedColor, setSelectedColor] = useState('blue');

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadDisplayW, setUploadDisplayW] = useState(200);
  const [uploadDisplayH, setUploadDisplayH] = useState(80);
  const [sigScale, setSigScale] = useState(1);
  const [sigRotate, setSigRotate] = useState(0);

  // Mobile QR session state
  const [mobileSessionId, setMobileSessionId] = useState<string | null>(null);
  const [mobileUrl, setMobileUrl] = useState<string | null>(null);
  const [mobilePolling, setMobilePolling] = useState(false);
  const [mobileReceived, setMobileReceived] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [pdfW, setPdfW] = useState(595);
  const [pdfH, setPdfH] = useState(842);

  const sigRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scale = PDF_DISPLAY_WIDTH / pdfW;
  const fontSizePx = FONT_SIZE_PT * scale;

  // Start mobile session when mobile tab is selected
  const startMobileSession = async () => {
    if (mobileSessionId) return; // Already started
    try {
      const resp = await api.post(`/mobile-sig/create`);
      const { sessionId, localIp } = resp.data;
      setMobileSessionId(sessionId);
      const origin = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `http://${localIp}:${window.location.port || '5173'}` 
        : window.location.origin;
      const url = `${origin}/mobile-sign/${sessionId}`;
      setMobileUrl(url);
      setMobilePolling(true);
      setMobileReceived(false);
    } catch (e) {
      console.error('Failed to create mobile session', e);
    }
  };

  // Poll the relay session for a submitted signature
  useEffect(() => {
    if (!mobilePolling || !mobileSessionId) return;
    pollIntervalRef.current = setInterval(async () => {
      try {
        const resp = await api.get(`/mobile-sig/${mobileSessionId}/poll`);
        const data = resp.data;
        if (data.ready && data.signature) {
          clearInterval(pollIntervalRef.current!);
          setMobilePolling(false);
          setMobileReceived(true);
          setUploadedImage(data.signature);
          // Auto-detect dimensions
          const img = new Image();
          img.onload = () => {
            const maxW = 250;
            const aspect = img.naturalWidth / img.naturalHeight;
            const w = Math.min(img.naturalWidth, maxW);
            setUploadDisplayW(w);
            setUploadDisplayH(w / aspect);
            setSigScale(1);
          };
          img.src = data.signature;
          setMode('upload'); // Switch to upload mode to show the received signature on canvas
        }
      } catch (e) { /* ignore */ }
    }, 2500);
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [mobilePolling, mobileSessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  const fontOptions = [
    { value: 'Dancing Script', label: 'Dancing Script' },
    { value: 'Great Vibes', label: 'Great Vibes' },
    { value: 'Sacramento', label: 'Sacramento' },
    { value: 'Satisfy', label: 'Satisfy' },
    { value: 'Caveat', label: 'Caveat' },
    { value: 'Pacifico', label: 'Pacifico' },
  ];

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await api.get(`/public/document/${token}`);
        setDoc(res.data);
      } catch (err) {
        console.error(err);
        setError('Invalid or expired document link.');
      }
    };
    if (token) fetchDoc();
  }, [token]);

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
    if (!signerName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!signerPhone.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    if (!signerAddress.trim()) {
      setError('Please enter your address.');
      return;
    }
    if (!signerGovtId.trim()) {
      setError('Please enter your Govt ID Number.');
      return;
    }
    if (!signerGovtIdImage) {
      setError('Please upload a photo of your Govt ID.');
      return;
    }

    setError('');
    setSigning(true);

    try {
      let signatureImageData: string | null = null;
      let pdfX = 0, pdfY = 0, pdfImageWidth = 0, pdfImageHeight = 0;

      const hasTypedSig = mode === 'type' && signatureText.trim().length > 0;
      const hasUploadedSig = mode === 'upload' && !!uploadedImage;

      if (hasTypedSig && sigRef.current) {
        signatureImageData = await toPng(sigRef.current, {
          pixelRatio: 3,
          skipAutoScale: true,
        });
        const rect = sigRef.current.getBoundingClientRect();
        const imgW = rect.width;
        const imgH = rect.height;
        pdfImageWidth = imgW / scale;
        pdfImageHeight = imgH / scale;
        pdfX = sigPos.x / scale;
        const screenBottomY = sigPos.y + imgH;
        pdfY = pdfH - (screenBottomY / scale);
      } else if (hasUploadedSig) {
        signatureImageData = uploadedImage!;
        const imgW = scaledDisplayW;
        const imgH = scaledDisplayH;
        pdfImageWidth = imgW / scale;
        pdfImageHeight = imgH / scale;
        pdfX = sigPos.x / scale;
        const screenBottomY = sigPos.y + imgH;
        pdfY = pdfH - (screenBottomY / scale);
      }

      await api.post(`/public/document/${token}/sign`, {
        x: Math.max(0, pdfX),
        y: Math.max(0, pdfY),
        width: pdfImageWidth,
        height: pdfImageHeight,
        rotation: mode === 'type' ? 0 : sigRotate,
        pageNum: pageNumber,
        signatureImage: signatureImageData,
        signerName: signerName.trim(),
        signerPhone: signerPhone.trim(),
        signerAddress: signerAddress.trim(),
        signerGovtId: signerGovtId.trim(),
        signerGovtIdImage: signerGovtIdImage?.data,
      });

      alert('Thank you! Your details have been recorded successfully.');
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Failed to submit. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  const canSubmit = signerName.trim().length > 0 && signerPhone.trim().length > 0 && signerAddress.trim().length > 0 && signerGovtId.trim().length > 0 && signerGovtIdImage !== null;

  if (!doc) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="text-slate-400 animate-pulse">Loading document…</div>
    </div>
  );

  return (
    <div className="signing-public-page bg-slate-950">
      <motion.div 
        className="signing-workspace signing-workspace-public"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* ─── Left Sidebar ───────────────────────────────────────────── */}
        <div className="signing-sidebar w-[340px] bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 p-6 flex flex-col gap-5 overflow-y-auto">
          <div>
            <h2 className="text-xl font-bold text-white">Sign Document</h2>
            <p className="text-xs text-slate-400 mt-1 truncate" title={doc.filename}>{doc.filename}</p>
          </div>

          <div className="space-y-4">
            {/* Signer name */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">Your Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                placeholder="Enter your full name…"
              />
            </div>

            {/* Signer phone */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">Phone Number <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={signerPhone}
                onChange={(e) => setSignerPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                placeholder="Enter your phone number…"
              />
            </div>

            {/* Signer address */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">Address <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={signerAddress}
                onChange={(e) => setSignerAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                placeholder="Enter your address…"
              />
            </div>

            {/* Signer govt id */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">Govt ID Number <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={signerGovtId}
                onChange={(e) => setSignerGovtId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
                placeholder="e.g. Passport, SSN, etc."
              />
              
              {signerGovtId.trim().length > 0 && (
                <div className="mt-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                  <label className="block text-xs font-medium text-slate-300 mb-2">Upload Govt ID Photo (JPG/PDF) <span className="text-red-400">*</span></label>
                  {!signerGovtIdImage ? (
                    <label className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-slate-600 rounded-lg hover:bg-slate-700/50 cursor-pointer transition-colors text-slate-400 text-sm">
                      <Upload className="w-4 h-4" /> Upload ID Document
                      <input 
                        type="file" 
                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            setError('Govt ID photo must be less than 5MB');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            setSignerGovtIdImage({ name: file.name, data: reader.result as string });
                            setError('');
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-lg">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileSignature className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <span className="text-xs text-indigo-200 truncate">{signerGovtIdImage.name}</span>
                      </div>
                      <button 
                        onClick={() => setSignerGovtIdImage(null)}
                        className="text-slate-400 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">Add a Signature <span className="text-slate-500 font-normal">(Optional)</span></label>
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
            <button
              onClick={() => { setMode('mobile'); startMobileSession(); }}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                mode === 'mobile' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4" /> Mobile
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

          {/* ─── MOBILE MODE ─── */}
          {mode === 'mobile' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-5 pt-2">
              {mobileReceived ? (
                <div className="w-full flex flex-col items-center gap-4">
                  <div style={{
                    width: 60, height: 60, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 30px rgba(34,197,94,0.35)'
                  }}>
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-green-400 font-semibold text-sm text-center">Signature received from mobile!</p>
                  <div className="bg-white/90 rounded-xl p-3 w-full flex justify-center">
                    {uploadedImage && <img src={uploadedImage} alt="Mobile signature" className="max-h-20 object-contain" />}
                  </div>
                  <p className="text-slate-400 text-xs text-center">Drag it into position on the document, then click Finish & Sign.</p>
                </div>
              ) : mobileUrl ? (
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="bg-white p-4 rounded-2xl shadow-[0_0_40px_rgba(139,92,246,0.25)] border-2 border-indigo-500/30">
                    <QRCodeSVG
                      value={mobileUrl}
                      size={180}
                      bgColor="#ffffff"
                      fgColor="#1e1b4b"
                      level="M"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-200">Scan with your phone</p>
                    <p className="text-xs text-slate-400 text-center max-w-[210px]">
                      Open the camera app and point it at this QR code to draw your signature on your mobile device.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-xs text-slate-500">or copy link</span>
                    <div className="flex-1 h-px bg-slate-800" />
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(mobileUrl); }}
                    className="w-full py-2.5 text-xs text-slate-400 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors truncate px-3"
                  >
                    📋 {mobileUrl}
                  </button>
                  <div className="flex items-center gap-2 text-indigo-400 text-xs">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    Waiting for mobile signature…
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
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
              ) : mode === 'mobile' ? (
                <>
                  <li>Scan the QR code with your phone</li>
                  <li>Draw your signature on the touch screen</li>
                  <li>Tap &quot;Use This Signature&quot; on mobile</li>
                </>
              ) : (
                <>
                  <li>Upload your signature image</li>
                  <li>Adjust size with the slider</li>
                </>
              )}
              <li>Drag the overlay to the exact spot</li>
              <li>Click Submit Details</li>
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
            {signing ? 'Processing…' : 'Submit Details'}
          </button>
        </div>

        {/* ─── PDF Viewer ─────────────────────────────────────────────── */}
        <div className="signing-pdf-panel flex-1 flex flex-col min-w-0 bg-slate-900/50 rounded-2xl border border-slate-800 shadow-inner relative overflow-hidden">
          
          {/* PDF Canvas Area */}
          <div className="signing-pdf-scroll">
            <DndContext onDragEnd={handleDragEnd}>
              <div style={{ position: 'relative', width: PDF_DISPLAY_WIDTH, height: Math.ceil(pdfH * scale), flexShrink: 0 }} className="signing-pdf-page shadow-2xl bg-white rounded-md ring-1 ring-slate-800">
                <PdfDocument
                  file={`${API_BASE}/uploads/${encodeURIComponent(doc.filepath)}`}
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
    </div>
  );
}
