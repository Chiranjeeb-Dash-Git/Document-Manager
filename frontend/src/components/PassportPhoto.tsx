import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Download, RefreshCw, CheckCircle, Camera,
  ChevronDown, Printer, ZoomIn, ZoomOut, RotateCcw,
  Sliders, Globe, AlertCircle, Sparkles
} from 'lucide-react';
import { removeBackground } from '@imgly/background-removal';

// ─── Passport Size Presets (width x height in mm) ──────────────────────────
const PASSPORT_SIZES: Record<string, { label: string; w: number; h: number; flag: string; dpi: number }> = {
  india:     { label: 'India',           w: 35, h: 45, flag: '🇮🇳', dpi: 300 },
  usa:       { label: 'USA',             w: 51, h: 51, flag: '🇺🇸', dpi: 300 },
  uk:        { label: 'UK',              w: 35, h: 45, flag: '🇬🇧', dpi: 300 },
  europe:    { label: 'Europe (ICAO)',   w: 35, h: 45, flag: '🇪🇺', dpi: 300 },
  canada:    { label: 'Canada',          w: 50, h: 70, flag: '🇨🇦', dpi: 300 },
  australia: { label: 'Australia',       w: 35, h: 45, flag: '🇦🇺', dpi: 300 },
  uae:       { label: 'UAE',             w: 40, h: 60, flag: '🇦🇪', dpi: 300 },
  schengen:  { label: 'Schengen Visa',   w: 35, h: 45, flag: '🌍', dpi: 300 },
  china:     { label: 'China',           w: 33, h: 48, flag: '🇨🇳', dpi: 300 },
  japan:     { label: 'Japan',           w: 35, h: 45, flag: '🇯🇵', dpi: 300 },
  id35x35:   { label: 'ID Card 35×35',   w: 35, h: 35, flag: '🪪', dpi: 300 },
  id25x35:   { label: 'ID Card 25×35',   w: 25, h: 35, flag: '🪪', dpi: 300 },
};

// ─── Background Color Presets ───────────────────────────────────────────────
const BG_COLORS = [
  { label: 'White',        hex: '#FFFFFF' },
  { label: 'Light Blue',   hex: '#C8D8F0' },
  { label: 'Sky Blue',     hex: '#87CEEB' },
  { label: 'Pale Blue',    hex: '#B0C4DE' },
  { label: 'Off-White',    hex: '#F5F0E8' },
  { label: 'Light Grey',   hex: '#E8E8E8' },
  { label: 'Cream',        hex: '#FFFDD0' },
  { label: 'Red (China)',  hex: '#CC0000' },
  { label: 'Dark Blue',    hex: '#003087' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
const mmToPx = (mm: number, dpi: number) => Math.round((mm / 25.4) * dpi);

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// ─── Compose transparent PNG onto colored background and resize ──────────────
function composePassportPhoto(
  transparentImg: HTMLImageElement,
  sizeKey: string,
  bgHex: string,
  brightness: number,
  contrast: number
): { dataUrl: string; canvas: HTMLCanvasElement } {
  const size = PASSPORT_SIZES[sizeKey];
  const outW = mmToPx(size.w, size.dpi);
  const outH = mmToPx(size.h, size.dpi);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;

  // Fill background
  const { r, g, b } = hexToRgb(bgHex);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, outW, outH);

  // Scale source (transparent PNG) to cover output, keeping aspect ratio, centered
  const srcAR = transparentImg.naturalWidth / transparentImg.naturalHeight;
  const outAR = outW / outH;
  let drawW: number, drawH: number, drawX: number, drawY: number;

  if (srcAR > outAR) {
    drawH = outH;
    drawW = outH * srcAR;
    drawX = (outW - drawW) / 2;
    drawY = 0;
  } else {
    drawW = outW;
    drawH = outW / srcAR;
    drawX = 0;
    drawY = (outH - drawH) / 2;
  }

  // Apply brightness/contrast via CSS filter on offscreen canvas
  const offscreen = document.createElement('canvas');
  offscreen.width = transparentImg.naturalWidth;
  offscreen.height = transparentImg.naturalHeight;
  const offCtx = offscreen.getContext('2d')!;
  offCtx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
  offCtx.drawImage(transparentImg, 0, 0);

  ctx.drawImage(offscreen, drawX, drawY, drawW, drawH);

  return { dataUrl: canvas.toDataURL('image/jpeg', 0.97), canvas };
}

// ─── Build 4×6 print sheet ──────────────────────────────────────────────────
function buildPrintSheet(photoCanvas: HTMLCanvasElement, sizeKey: string) {
  const size = PASSPORT_SIZES[sizeKey];
  const outW = photoCanvas.width;
  const outH = photoCanvas.height;

  const sheetW = Math.round(6 * size.dpi);
  const sheetH = Math.round(4 * size.dpi);
  const gutter = Math.round(0.08 * size.dpi);

  const cols = Math.max(1, Math.floor((sheetW + gutter) / (outW + gutter)));
  const rows = Math.max(1, Math.floor((sheetH + gutter) / (outH + gutter)));
  const count = cols * rows;

  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = sheetW;
  sheetCanvas.height = sheetH;
  const sheetCtx = sheetCanvas.getContext('2d')!;
  sheetCtx.fillStyle = '#ffffff';
  sheetCtx.fillRect(0, 0, sheetW, sheetH);

  const totalW = cols * outW + (cols - 1) * gutter;
  const totalH = rows * outH + (rows - 1) * gutter;
  const startX = Math.floor((sheetW - totalW) / 2);
  const startY = Math.floor((sheetH - totalH) / 2);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = startX + col * (outW + gutter);
      const py = startY + row * (outH + gutter);
      sheetCtx.drawImage(photoCanvas, px, py, outW, outH);
    }
  }

  // Dashed cut guides
  sheetCtx.strokeStyle = 'rgba(0,0,0,0.2)';
  sheetCtx.setLineDash([8, 8]);
  sheetCtx.lineWidth = 2;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = startX + col * (outW + gutter);
      const py = startY + row * (outH + gutter);
      sheetCtx.strokeRect(px, py, outW, outH);
    }
  }

  return { url: sheetCanvas.toDataURL('image/jpeg', 0.95), count };
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function PassportPhoto() {
  // Upload / source state
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [transparentPngUrl, setTransparentPngUrl] = useState<string | null>(null); // after BG removal
  const [transparentImg, setTransparentImg] = useState<HTMLImageElement | null>(null);
  const [originalImg, setOriginalImg] = useState<HTMLImageElement | null>(null);

  // Processing flags
  const [removingBg, setRemovingBg] = useState(false);
  const [composing, setComposing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [skippedAI, setSkippedAI] = useState(false);

  // Passport settings
  const [selectedSize, setSelectedSize] = useState('india');
  const [bgColor, setBgColor] = useState('#C8D8F0');
  const [customBg, setCustomBg] = useState('#C8D8F0');
  const [useCustomBg, setUseCustomBg] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Result state
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [printSheet, setPrintSheet] = useState<{ url: string; count: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const effectiveBg = useCustomBg ? customBg : bgColor;
  const size = PASSPORT_SIZES[selectedSize];

  // ── STEP 1: Upload ────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Please upload an image file.'); return; }
    setOriginalFile(f);
    setTransparentPngUrl(null);
    setTransparentImg(null);
    setOriginalImg(null);
    setProcessedUrl(null);
    setPrintSheet(null);
    setError(null);
    setProgress(0);
    setSkippedAI(false);
    
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    
    const img = new Image();
    img.onload = () => setOriginalImg(img);
    img.src = url;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect({ target: { files: e.dataTransfer.files } } as any);
  };

  // ── STEP 2: Remove Background (ML – runs once) ────────────────────────────
  const runBackgroundRemoval = useCallback(async () => {
    if (!originalFile) return;
    setRemovingBg(true);
    setError(null);
    setProgress(0);

    try {
      const blob = await removeBackground(originalFile, {
        progress: (_key: string, current: number, total: number) => {
          setProgress(total > 0 ? Math.round((current / total) * 100) : 0);
        },
        model: 'isnet_quint8', // balanced speed vs quality
      });

      const url = URL.createObjectURL(blob);
      setTransparentPngUrl(url);

      // Load it as an Image element for compositing
      const img = new Image();
      img.onload = () => setTransparentImg(img);
      img.src = url;
    } catch (err) {
      console.error(err);
      setError('Background removal failed. Try a clearer photo with good lighting.');
    } finally {
      setRemovingBg(false);
    }
  }, [originalFile]);

  // ── STEP 3: Live Compose (instant, on every setting change) ───────────────
  // ── STEP 3: Live Compose (instant, on every setting change) ───────────────
  useEffect(() => {
    const sourceImg = skippedAI ? originalImg : transparentImg;
    if (!sourceImg) return;

    // Use a small timeout to debounce rapid slider changes
    const timer = setTimeout(() => {
      setComposing(true);
      try {
        const { dataUrl, canvas } = composePassportPhoto(
          sourceImg, selectedSize, effectiveBg, brightness, contrast
        );
        setProcessedUrl(dataUrl);
        const sheet = buildPrintSheet(canvas, selectedSize);
        setPrintSheet(sheet);
      } catch (e) {
        console.error('Error during live composition:', e);
      } finally {
        setComposing(false);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [transparentImg, originalImg, skippedAI, selectedSize, effectiveBg, brightness, contrast]);

  // ── Download helpers ──────────────────────────────────────────────────────
  const downloadSingle = () => {
    if (!processedUrl) return;
    const a = document.createElement('a');
    a.href = processedUrl;
    a.download = `passport_photo_${selectedSize}_${size.w}x${size.h}mm.jpg`;
    a.click();
  };

  const downloadSheet = () => {
    if (!printSheet) return;
    const a = document.createElement('a');
    a.href = printSheet.url;
    a.download = `passport_print_sheet_${selectedSize}.jpg`;
    a.click();
  };

  const reset = () => {
    setOriginalFile(null);
    setPreviewUrl(null);
    setTransparentPngUrl(null);
    setTransparentImg(null);
    setOriginalImg(null);
    setProcessedUrl(null);
    setPrintSheet(null);
    setError(null);
    setProgress(0);
    setZoom(1);
    setSkippedAI(false);
  };

  const bgRemoved = !!transparentImg || skippedAI;

  return (
    <div className="space-y-6">

      {/* Info banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20 rounded-2xl p-4 flex items-start gap-3"
      >
        <Sparkles className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-violet-300 text-sm font-semibold mb-1">AI-Powered Background Removal</p>
          <p className="text-violet-200/60 text-xs leading-relaxed">
            Upload a photo → Click <strong>Remove Background</strong> (runs once, ~5–10 sec) → then change size, color, brightness instantly in live preview with no re-processing.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* ─── Left Panel: Controls ─────────────────────────────── */}
        <div className="xl:col-span-4 space-y-4">

          {/* Upload Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
              originalFile
                ? 'border-violet-500/40 bg-violet-500/5'
                : 'border-slate-700 hover:border-violet-500/50 bg-slate-900/40 hover:bg-violet-500/5'
            }`}
          >
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            {originalFile ? (
              <div className="space-y-1">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-white font-semibold text-sm truncate px-2">{originalFile.name}</p>
                <p className="text-slate-500 text-xs">{(originalFile.size / 1024).toFixed(0)} KB · click to change</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6 text-violet-400" />
                </div>
                <p className="text-white font-semibold text-sm">Drop photo here</p>
                <p className="text-slate-500 text-xs">JPG, PNG, WEBP, HEIC</p>
              </div>
            )}
          </motion.div>

          {/* Remove Background Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            onClick={runBackgroundRemoval}
            disabled={!originalFile || removingBg || bgRemoved}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm transition-all duration-200 flex items-center justify-center gap-3 disabled:cursor-not-allowed"
            style={{
              background: bgRemoved
                ? 'rgba(16,185,129,0.2)'
                : (!originalFile || removingBg)
                  ? 'rgba(109,40,217,0.3)'
                  : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              boxShadow: (!originalFile || removingBg || bgRemoved) ? 'none' : '0 8px 30px rgba(124,58,237,0.4)',
            }}
          >
            {bgRemoved ? (
              <><CheckCircle className="w-4 h-4 text-emerald-400" /> <span className="text-emerald-300">Background Removed ✓</span></>
            ) : removingBg ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Removing… {progress > 0 ? `${progress}%` : ''}</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Remove Background (AI)</>
            )}
          </motion.button>

          {/* Skip AI Button */}
          {!bgRemoved && originalFile && !removingBg && (
            <motion.button
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => setSkippedAI(true)}
              className="w-full py-3 rounded-2xl font-semibold text-slate-300 text-sm transition-all duration-200 border border-slate-700 bg-slate-800/50 hover:bg-slate-700 hover:text-white"
            >
              Use Original (Skip AI)
            </motion.button>
          )}

          {/* Progress bar */}
          {removingBg && (
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}

          {bgRemoved && (
            <button onClick={reset} className="w-full py-2 rounded-xl text-xs text-slate-500 hover:text-slate-300 border border-slate-800 hover:border-slate-700 transition-all">
              ↺ Start over with a new photo
            </button>
          )}

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </motion.div>
          )}

          {/* ── Passport Size ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5 text-violet-400" /> Passport Size
            </div>
            <div className="relative">
              <button
                onClick={() => setShowSizeDropdown(!showSizeDropdown)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-800 border border-slate-700 hover:border-violet-500/40 rounded-xl text-white text-sm transition-all"
              >
                <span>{size.flag} {size.label} — {size.w}×{size.h}mm</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showSizeDropdown ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showSizeDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    className="absolute z-50 top-full mt-1 left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl max-h-56 overflow-y-auto"
                  >
                    {Object.entries(PASSPORT_SIZES).map(([key, s]) => (
                      <button
                        key={key}
                        onClick={() => { setSelectedSize(key); setShowSizeDropdown(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left ${
                          key === selectedSize ? 'bg-violet-600/20 text-violet-300' : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span>{s.flag} {s.label}</span>
                        <span className="text-slate-500 text-xs">{s.w}×{s.h}mm</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className="text-[11px] text-slate-600">
              {mmToPx(size.w, size.dpi)} × {mmToPx(size.h, size.dpi)} px · {size.dpi} DPI print-ready
            </p>
          </motion.div>

          {/* ── Background Color ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-violet-400 flex-shrink-0" style={{ background: effectiveBg }} />
              Background Color
            </div>
            <div className="flex flex-wrap gap-2">
              {BG_COLORS.map(c => (
                <button
                  key={c.hex}
                  title={c.label}
                  onClick={() => { setBgColor(c.hex); setUseCustomBg(false); }}
                  className={`w-8 h-8 rounded-xl border-2 transition-all hover:scale-110 flex-shrink-0 ${
                    !useCustomBg && bgColor === c.hex
                      ? 'border-violet-500 scale-110 shadow-lg shadow-violet-500/30'
                      : 'border-slate-700'
                  }`}
                  style={{ background: c.hex }}
                />
              ))}
              {/* Custom color swatch */}
              <label title="Custom Color" className={`relative w-8 h-8 rounded-xl border-2 transition-all hover:scale-110 flex-shrink-0 cursor-pointer overflow-hidden ${
                useCustomBg ? 'border-violet-500 scale-110 shadow-lg shadow-violet-500/30' : 'border-slate-700'
              }`} style={{ background: 'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)' }}>
                <input type="color" value={customBg} onChange={(e) => { setCustomBg(e.target.value); setUseCustomBg(true); }} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </label>
            </div>
            {useCustomBg && (
              <p className="text-[11px] font-mono text-violet-400">{customBg}</p>
            )}
          </motion.div>

          {/* ── Adjustments ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5 text-violet-400" /> Adjustments
            </div>
            {[
              { label: 'Brightness', value: brightness, set: setBrightness, min: 60, max: 150, unit: '%' },
              { label: 'Contrast',   value: contrast,   set: setContrast,   min: 60, max: 150, unit: '%' },
            ].map(({ label, value, set, min, max, unit }) => (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{label}</span>
                  <span className="text-xs font-mono text-violet-400">{value}{unit}</span>
                </div>
                <input
                  type="range" min={min} max={max} value={value}
                  onChange={(e) => set(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full accent-violet-500 cursor-pointer"
                />
              </div>
            ))}
          </motion.div>
        </div>

        {/* ─── Right Panel: Preview ─────────────────────────────── */}
        <div className="xl:col-span-8 space-y-5">

          {/* Preview Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Original */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Original</span>
              </div>
              <div className="flex items-center justify-center p-3 min-h-[180px]"
                style={{ background: 'repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 0 0 / 14px 14px' }}>
                {previewUrl
                  ? <img src={previewUrl} alt="Original" className="max-h-[160px] max-w-full object-contain rounded-lg" />
                  : <div className="text-slate-700 text-center space-y-1"><Upload className="w-8 h-8 mx-auto opacity-30" /><p className="text-xs">No photo</p></div>
                }
              </div>
            </div>

            {/* Background Removed / Skipped */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {skippedAI ? 'AI Skipped' : 'BG Removed'}
                </span>
              </div>
              <div className="flex items-center justify-center p-3 min-h-[180px]"
                style={{ background: 'repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 0 0 / 14px 14px' }}>
                <AnimatePresence mode="wait">
                  {removingBg ? (
                    <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-2">
                      <RefreshCw className="w-8 h-8 text-violet-400 mx-auto animate-spin" />
                      <p className="text-slate-400 text-xs">AI processing…</p>
                      {progress > 0 && <p className="text-violet-400 text-xs font-mono">{progress}%</p>}
                    </motion.div>
                  ) : transparentPngUrl ? (
                    <motion.img
                      key="done"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={transparentPngUrl}
                      alt="BG removed"
                      className="max-h-[160px] max-w-full object-contain rounded-lg"
                    />
                  ) : skippedAI && previewUrl ? (
                    <motion.img
                      key="skipped"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={previewUrl}
                      alt="Original preserved"
                      className="max-h-[160px] max-w-full object-contain rounded-lg opacity-70"
                    />
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-1 text-slate-700">
                      <Sparkles className="w-8 h-8 mx-auto opacity-30" />
                      <p className="text-xs">After AI removal</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Final Passport Photo */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {size.flag} {size.w}×{size.h}mm
                </span>
                {composing && <RefreshCw className="w-3 h-3 text-violet-400 animate-spin" />}
              </div>
              <div className="flex flex-col items-center justify-center p-3 min-h-[180px] gap-3"
                style={{ background: processedUrl ? (skippedAI ? '#ffffff18' : effectiveBg + '18') : 'repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 0 0 / 14px 14px' }}>
                <AnimatePresence mode="wait">
                  {processedUrl ? (
                    <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-2">
                      <img
                        src={processedUrl}
                        alt="Passport photo"
                        className="max-h-[140px] max-w-full object-contain rounded-lg shadow-2xl"
                        style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.2s' }}
                      />
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.15))} className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"><ZoomOut className="w-3 h-3 text-slate-400" /></button>
                        <span className="text-[10px] text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(2, z + 0.15))} className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"><ZoomIn className="w-3 h-3 text-slate-400" /></button>
                        <button onClick={() => setZoom(1)} className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"><RotateCcw className="w-3 h-3 text-slate-400" /></button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="empty2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-1 text-slate-700">
                      <Camera className="w-8 h-8 mx-auto opacity-30" />
                      <p className="text-xs">Ready after AI step</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Download Section */}
          <AnimatePresence>
            {processedUrl && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-300 font-semibold text-sm">Ready to download!</span>
                  <span className="text-slate-500 text-xs ml-auto">
                    {mmToPx(size.w, size.dpi)} × {mmToPx(size.h, size.dpi)} px · {size.dpi} DPI · JPEG
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={downloadSingle}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 6px 20px rgba(124,58,237,0.35)' }}
                  >
                    <Download className="w-4 h-4" />
                    Download Single Photo
                  </button>
                  {printSheet && (
                    <button
                      onClick={downloadSheet}
                      className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 6px 20px rgba(14,165,233,0.35)' }}
                    >
                      <Printer className="w-4 h-4" />
                      Print Sheet ({printSheet.count} photos · 4×6 in)
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500">
                  💡 Print sheet is sized for standard 4×6 inch photo paper with dashed cut-guides.
                  Take the print sheet file to any photo lab or home printer.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Country Quick Reference */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4"
          >
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Reference — All Country Sizes</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(PASSPORT_SIZES).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => setSelectedSize(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all text-left ${
                    key === selectedSize
                      ? 'bg-violet-600/20 border border-violet-500/30 text-violet-300'
                      : 'bg-slate-800/40 border border-slate-800 text-slate-500 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-base leading-none">{s.flag}</span>
                  <div className="min-w-0">
                    <p className="font-semibold truncate leading-tight">{s.label}</p>
                    <p className="text-[10px] text-slate-600">{s.w}×{s.h}mm</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
