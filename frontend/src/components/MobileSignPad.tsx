import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, RotateCcw, Send } from 'lucide-react';

export default function MobileSignPad() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const lastPt = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas with ResizeObserver for full-area drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const initCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Use 1x resolution to keep canvas small and fast
      // This avoids huge data URLs on high-DPR phones
      canvas.width = rect.width;
      canvas.height = rect.height;

      const ctx = canvas.getContext('2d')!;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1e1e2e';
      ctx.lineWidth = 3;
    };

    const ro = new ResizeObserver(initCanvas);
    ro.observe(canvas);
    initCanvas();

    return () => ro.disconnect();
  }, []);

  const getPos = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const startDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (e.cancelable) e.preventDefault();
    const pos = getPos(e);
    lastPt.current = pos;
    isDrawingRef.current = true;
    setHasDrawn(true);
  }, [getPos]);

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (e.cancelable) e.preventDefault();
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas || !lastPt.current) return;

    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);

    ctx.beginPath();
    ctx.moveTo(lastPt.current.x, lastPt.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPt.current = pos;
  }, [getPos]);

  const stopDraw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (e.cancelable) e.preventDefault();
    isDrawingRef.current = false;
    lastPt.current = null;
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e1e2e';
    ctx.lineWidth = 3;
    setHasDrawn(false);
  };

  const getScaledDataUrl = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    // Export at max 600px wide to keep data URL small
    const MAX_W = 600;
    if (canvas.width <= MAX_W) {
      return canvas.toDataURL('image/png');
    }

    const scale = MAX_W / canvas.width;
    const offscreen = document.createElement('canvas');
    offscreen.width = MAX_W;
    offscreen.height = Math.round(canvas.height * scale);
    const octx = offscreen.getContext('2d')!;
    octx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);
    return offscreen.toDataURL('image/png');
  };

  const submitSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    setSubmitting(true);
    setError('');

    const dataUrl = getScaledDataUrl();
    // Use the same origin the page was loaded from (goes through Vite proxy)
    const submitUrl = `${window.location.origin}/api/mobile-sig/${sessionId}/submit`;

    try {
      const resp = await fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: dataUrl }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Server ${resp.status}: ${text}`);
      }
      setSubmitted(true);
    } catch (err: any) {
      console.error('Signature submit failed:', err);
      setError(`Failed to send: ${err.message || 'Network error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        padding: '2rem', gap: '1.5rem', textAlign: 'center'
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px rgba(34,197,94,0.4)'
        }}>
          <CheckCircle size={40} color="white" />
        </div>
        <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Signature Sent!</h1>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.95rem', maxWidth: 280 }}>
          Your signature has been sent to the desktop. You can close this tab now.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', flexShrink: 0
          }}>✍️</div>
          <div>
            <h1 style={{ color: '#fff', margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Draw Your Signature</h1>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.75rem' }}>Sign with your finger below</p>
          </div>
        </div>
      </div>

      {/* Canvas area */}
      <div style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{
          position: 'relative', background: '#fff', borderRadius: 16,
          flex: 1, minHeight: 300, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          border: '2px solid rgba(139,92,246,0.3)',
        }}>
          {/* Baseline guide */}
          <div style={{
            position: 'absolute', bottom: '30%', left: '5%', right: '5%',
            height: 1, background: 'rgba(139,92,246,0.2)', pointerEvents: 'none'
          }} />
          {!hasDrawn && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', pointerEvents: 'none',
              color: '#c4b5fd', fontSize: '1rem', fontWeight: 500, opacity: 0.6
            }}>
              Sign here with your finger
            </div>
          )}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              display: 'block', touchAction: 'none',
            }}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '0.75rem 1rem', color: '#fca5a5', fontSize: '0.85rem',
            wordBreak: 'break-all'
          }}>
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={clearCanvas}
            style={{
              flex: 1, padding: '0.9rem', borderRadius: 14, fontSize: '0.9rem', fontWeight: 600,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', cursor: 'pointer'
            }}
          >
            <RotateCcw size={16} /> Clear
          </button>
          <button
            onClick={submitSignature}
            disabled={!hasDrawn || submitting}
            style={{
              flex: 2, padding: '0.9rem', borderRadius: 14, fontSize: '0.95rem', fontWeight: 700,
              background: hasDrawn && !submitting
                ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                : 'rgba(255,255,255,0.06)',
              border: 'none', color: hasDrawn && !submitting ? '#fff' : '#4b5563',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', cursor: hasDrawn ? 'pointer' : 'not-allowed',
              boxShadow: hasDrawn && !submitting ? '0 4px 24px rgba(139,92,246,0.4)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <Send size={16} /> {submitting ? 'Sending…' : 'Use This Signature'}
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#475569', fontSize: '0.75rem', margin: 0, paddingBottom: '0.5rem' }}>
          Your signature will appear on the desktop automatically
        </p>
      </div>
    </div>
  );
}
