import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Upload, FileText, Download, Trash2, ShieldCheck, X, Eye, Film, Music } from 'lucide-react';
import api, { API_BASE } from '../api';

interface SafeItem {
  id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  createdAt: string;
}

export default function SafeFolder() {
  const [pinState, setPinState] = useState<'checking' | 'setup' | 'enter' | 'unlocked'>('checking');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [items, setItems] = useState<SafeItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [viewingFile, setViewingFile] = useState<{url: string, type: string, filename?: string} | null>(null);
  const [textContent, setTextContent] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkPinStatus();
  }, []);

  const checkPinStatus = async () => {
    try {
      const res = await api.get('/safe/has-pin');
      if (res.data.hasPin) {
        setPinState('enter');
      } else {
        setPinState('setup');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to check PIN status');
      setPinState('setup'); // Fallback to setup if there's an error so the screen isn't completely blank
    }
  };

  const fetchItems = async () => {
    try {
      const res = await api.get('/safe');
      setItems(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    try {
      if (pinState === 'setup') {
        await api.post('/safe/setup-pin', { pin });
        setPinState('unlocked');
        fetchItems();
      } else if (pinState === 'enter') {
        await api.post('/safe/verify-pin', { pin });
        setPinState('unlocked');
        fetchItems();
      }
      setPin('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid PIN');
      setPin('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);
    
    setUploading(true);
    try {
      await api.post('/safe/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchItems();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/safe/${id}`);
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (item: SafeItem) => {
    try {
      const url = `${API_BASE}/uploads/${item.filepath}`;
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = item.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  const renderPinScreen = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        style={{
          background: 'linear-gradient(145deg, rgba(10, 5, 25, 0.9), rgba(5, 2, 15, 0.95))',
          padding: '3rem 2rem',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 30px 60px rgba(0,0,0,0.8), 0 0 40px rgba(190, 18, 60, 0.15)',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)',
          width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(190, 18, 60, 0.4) 0%, transparent 70%)',
          pointerEvents: 'none', opacity: 0.5
        }} />
        
        <div style={{
          width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, #be123c, #881337)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
          boxShadow: '0 0 20px rgba(190, 18, 60, 0.4)'
        }}>
          {pinState === 'setup' ? <ShieldCheck color="white" size={32} /> : <Lock color="white" size={32} />}
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#f1f5f9' }}>
          {pinState === 'setup' ? 'Set Up Secure Vault' : 'Unlock Secure Vault'}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '2rem' }}>
          {pinState === 'setup' ? 'Create a 4-digit PIN to protect your private files.' : 'Enter your 4-digit PIN to access your files.'}
        </p>

        <form onSubmit={handlePinSubmit}>
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="••••"
            style={{
              width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
              color: 'white', fontSize: '2rem', textAlign: 'center', letterSpacing: '0.5em',
              marginBottom: '1rem', outline: 'none', transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'rgba(190, 18, 60, 0.6)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            autoFocus
          />
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ color: '#f87171', fontSize: '0.9rem', marginBottom: '1rem' }}>
                {error}
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="submit"
            disabled={pin.length !== 4}
            style={{
              width: '100%', padding: '1rem', borderRadius: '12px',
              background: pin.length === 4 ? 'linear-gradient(135deg, #be123c, #9f1239)' : 'rgba(255,255,255,0.05)',
              color: pin.length === 4 ? 'white' : 'rgba(255,255,255,0.3)',
              border: 'none', fontWeight: 600, fontSize: '1.05rem', cursor: pin.length === 4 ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s', boxShadow: pin.length === 4 ? '0 10px 25px rgba(190,18,60,0.3)' : 'none'
            }}
          >
            {pinState === 'setup' ? 'Set PIN' : 'Unlock'}
          </button>
        </form>
      </motion.div>
    </div>
  );

  const renderGallery = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '0 1rem' }}>
      <div className="safe-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 className="safe-title" style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem', background: 'linear-gradient(135deg, #fff, #fb7185)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Secure Vault
          </h1>
          <p style={{ color: '#94a3b8', margin: 0 }}>Your private files and photos</p>
        </div>
        
        <div className="safe-header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            onClick={() => setPinState('enter')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            <Lock size={16} /> Lock Vault
          </button>
          
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #be123c, #9f1239)', borderRadius: '10px',
            color: 'white', fontWeight: 600, cursor: 'pointer', boxShadow: '0 10px 20px rgba(190,18,60,0.2)',
            transition: 'transform 0.2s'
          }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <Upload size={18} />
            {uploading ? 'Uploading...' : 'Upload File'}
            <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} ref={fileInputRef} />
          </label>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1.5rem',
        paddingBottom: '3rem'
      }}>
        <AnimatePresence>
          {items.map((item, i) => {
            const isImage = item.mimetype.startsWith('image/');
            const isVideo = item.mimetype.startsWith('video/');
            const isAudio = item.mimetype.startsWith('audio/');
            const isPdf = item.mimetype === 'application/pdf';
            const fileUrl = `${API_BASE}/uploads/${item.filepath}`;

            // Text file extensions that browsers can display as plain text
            const textExts = ['.txt', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts', '.md', '.log', '.yml', '.yaml', '.ini', '.cfg', '.env', '.sh', '.bat', '.py', '.java', '.c', '.cpp', '.h', '.rb', '.go', '.rs', '.sql', '.rtf'];
            const ext = '.' + item.filename.split('.').pop()?.toLowerCase();
            const isText = item.mimetype.startsWith('text/') || textExts.includes(ext);
            const isOffice = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp'].includes(ext);

            // Determine viewer type
            const getViewerType = () => {
              if (isImage) return 'image';
              if (isVideo) return 'video';
              if (isAudio) return 'audio';
              if (isPdf) return 'pdf';
              if (isText) return 'text';
              if (isOffice) return 'office';
              return 'office'; // fallback: show download card for unknown types
            };

            // Thumbnail icon for non-image files
            const getThumbnailIcon = () => {
              if (isVideo) return <Film size={48} color="rgba(139, 92, 246, 0.6)" />;
              if (isAudio) return <Music size={48} color="rgba(59, 130, 246, 0.6)" />;
              if (isPdf) return <FileText size={48} color="rgba(239, 68, 68, 0.5)" />;
              return <FileText size={48} color="rgba(148, 163, 184, 0.5)" />;
            };
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                style={{
                  background: 'rgba(10, 5, 25, 0.6)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  transition: 'border-color 0.3s, transform 0.3s',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(190, 18, 60, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div 
                  style={{ height: '160px', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                  onClick={() => {
                    const vType = getViewerType();
                    setViewingFile({ url: fileUrl, type: vType, filename: item.filename });
                    if (vType === 'text') {
                      fetch(fileUrl).then(r => r.text()).then(t => setTextContent(t)).catch(() => setTextContent('Failed to load file content.'));
                    }
                  }}
                >
                  {isImage ? (
                    <img src={fileUrl} alt={item.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : isVideo ? (
                    <video src={fileUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                  ) : (
                    getThumbnailIcon()
                  )}
                  {/* Hover overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(190, 18, 60, 0.1)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                       className="hover-overlay">
                    <span style={{ color: 'white', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '6px' }}><Eye size={16} /> Preview</span>
                  </div>
                </div>
                
                <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.filename}>
                    {item.filename}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button onClick={(e) => { e.stopPropagation(); handleDownload(item); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}>
                      <Download size={14} /> Download
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'} onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {items.length === 0 && !uploading && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <ShieldCheck size={48} color="rgba(190, 18, 60, 0.5)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#e2e8f0', margin: '0 0 0.5rem' }}>Your Vault is Empty</h3>
            <p style={{ color: '#94a3b8', margin: 0 }}>Upload private documents and photos to keep them secure.</p>
          </div>
        )}
      </div>

      {/* File Lightbox */}
      <AnimatePresence>
        {viewingFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 10000,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
            }}
            onClick={() => setViewingFile(null)}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setViewingFile(null); }}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', zIndex: 50 }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <X size={24} />
            </button>
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              style={{ width: '100%', height: '100%', maxWidth: '1200px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
            >
              {viewingFile.type === 'image' ? (
                <img src={viewingFile.url} alt="Vault Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()} />
              ) : viewingFile.type === 'video' ? (
                <video src={viewingFile.url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()} />
              ) : viewingFile.type === 'audio' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(59,130,246,0.3)' }}>
                    <Music size={56} color="white" />
                  </div>
                  <audio src={viewingFile.url} controls autoPlay style={{ width: '400px', maxWidth: '90vw' }} />
                </div>
              ) : viewingFile.type === 'pdf' ? (
                <iframe src={viewingFile.url} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', background: 'white', pointerEvents: 'auto' }} title="PDF Preview" onClick={(e) => e.stopPropagation()} />
              ) : viewingFile.type === 'text' ? (
                <div style={{ width: '100%', height: '100%', maxWidth: '900px', background: '#1e1e2e', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'auto', pointerEvents: 'auto', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <FileText size={16} color="#94a3b8" />
                    <span style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 600 }}>{viewingFile.filename}</span>
                  </div>
                  <pre style={{ margin: 0, padding: '20px', color: '#cbd5e1', fontSize: '0.85rem', fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1, overflow: 'auto' }}>{textContent}</pre>
                </div>
              ) : (
                /* Office docs & unsupported formats: beautiful download card */
                <div style={{ pointerEvents: 'auto', textAlign: 'center', maxWidth: '420px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ background: 'linear-gradient(145deg, rgba(15, 10, 30, 0.95), rgba(10, 5, 20, 0.98))', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', padding: '3rem 2rem', boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 10px 30px rgba(59,130,246,0.3)' }}>
                      <FileText size={40} color="white" />
                    </div>
                    <h3 style={{ color: '#f1f5f9', fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem', wordBreak: 'break-word' }}>{viewingFile.filename}</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 2rem' }}>This file type cannot be previewed in the browser.<br/>Download it to view with the appropriate application.</p>
                    <a
                      href={viewingFile.url}
                      download={viewingFile.filename}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.8rem 2rem', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white', borderRadius: '12px', fontWeight: 600, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 10px 25px rgba(59,130,246,0.3)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                      onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(59,130,246,0.4)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(59,130,246,0.3)'; }}
                    >
                      <Download size={18} /> Download File
                    </a>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <div className="cin-container" style={{ paddingTop: '2rem' }}>
      {pinState === 'checking' ? null : pinState === 'unlocked' ? renderGallery() : renderPinScreen()}
    </div>
  );
}
