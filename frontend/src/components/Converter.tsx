import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Image as ImageIcon, CheckCircle, AlertCircle, RefreshCw, Download, Camera } from 'lucide-react';
import api from '../api';
import PassportPhoto from './PassportPhoto';

const DOC_FORMATS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'];
const IMG_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif'];

type Tab = 'document' | 'image' | 'passport';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'document', label: 'Document Converter', icon: <FileText className="w-4 h-4" /> },
  { id: 'image',    label: 'Image Converter',    icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'passport', label: 'Passport Photo',      icon: <Camera className="w-4 h-4" /> },
];

export default function Converter() {
  const [activeTab, setActiveTab] = useState<Tab>('document');
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState<string>('pdf');
  const [targetImageFormat, setTargetImageFormat] = useState<string>('jpg');
  const [imageQuality, setImageQuality] = useState<string>('90');
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<{ url: string, filename: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setFile(null);
    setResult(null);
    setError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    setConverting(true);
    setError(null);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      if (activeTab === 'image') {
        formData.append('targetFormat', targetImageFormat);
        formData.append('quality', imageQuality);
        const res = await api.post('/convert/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setResult(res.data);
      } else {
        formData.append('targetFormat', targetFormat);
        const res = await api.post('/convert/document', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setResult(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Conversion failed. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="cin-container">
      {/* Header */}
      <div className="cin-dash-header">
        <div>
          <h1 className="cin-dash-title">File Converter</h1>
          <p className="cin-dash-desc">Convert documents, images, and generate professional passport photos.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {TABS.map(tab => (
          <motion.button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? 'text-white shadow-lg'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            style={activeTab === tab.id ? {
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              boxShadow: '0 6px 20px rgba(124,58,237,0.35)'
            } : {}}
          >
            {tab.icon}
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Passport Photo tab — full width */}
      <AnimatePresence mode="wait">
        {activeTab === 'passport' && (
          <motion.div
            key="passport"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
          >
            <PassportPhoto />
          </motion.div>
        )}

        {/* Document / Image Converter */}
        {(activeTab === 'document' || activeTab === 'image') && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="cin-auth-card"
            style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}
          >
            <h2 style={{ color: 'white', marginTop: 0, marginBottom: '1.5rem', fontSize: '1.4rem' }}>
              {activeTab === 'document' ? 'Convert Document' : 'Convert Image'}
            </h2>

            {error && (
              <div className="cin-error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <AlertCircle className="w-5 h-5" />{error}
              </div>
            )}

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed rgba(139, 92, 246, 0.3)',
                borderRadius: '16px',
                padding: '3rem 2rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: file ? 'rgba(139, 92, 246, 0.05)' : 'rgba(15, 23, 42, 0.4)',
                transition: 'all 0.2s',
                marginBottom: '1.5rem',
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                accept={activeTab === 'document'
                  ? DOC_FORMATS.map(f => `.${f}`).join(',')
                  : IMG_FORMATS.map(f => `.${f}`).join(',')}
              />
              {file ? (
                <div>
                  <CheckCircle className="w-12 h-12" style={{ color: '#34d399', margin: '0 auto 1rem' }} />
                  <div style={{ color: 'white', fontWeight: 600, fontSize: '1.1rem' }}>{file.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.4rem' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12" style={{ color: '#8b5cf6', margin: '0 auto 1rem' }} />
                  <div style={{ color: 'white', fontWeight: 600, fontSize: '1.1rem' }}>Click to upload file</div>
                  <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.4rem' }}>
                    {activeTab === 'document' ? 'PDF, DOC, DOCX, XLS, XLSX' : 'PNG, WEBP, HEIC, GIF'}
                  </div>
                </div>
              )}
            </div>

            {/* Format Options */}
            {activeTab === 'document' ? (
              <div className="cin-form" style={{ marginBottom: '1.5rem' }}>
                <label>Convert To</label>
                <select value={targetFormat} onChange={(e) => setTargetFormat(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(15,23,42,0.5)', color: 'white', fontSize: '0.95rem', outline: 'none' }}>
                  <option value="pdf">PDF Document (.pdf)</option>
                  <option value="docx">Word Document (.docx)</option>
                  <option value="doc">Word Document (.doc)</option>
                </select>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, marginTop: '-0.5rem' }}>
                  Requires a free CloudConvert API key set in backend/.env
                </p>
              </div>
            ) : (
              <div className="cin-form" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label>Convert To</label>
                  <select value={targetImageFormat} onChange={(e) => setTargetImageFormat(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(15,23,42,0.5)', color: 'white', fontSize: '0.95rem', outline: 'none' }}>
                    <option value="jpg">JPEG (.jpg)</option>
                    <option value="webp">WebP (.webp)</option>
                    <option value="png">PNG (.png)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>Quality</label>
                  <select value={imageQuality} onChange={(e) => setImageQuality(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(15,23,42,0.5)', color: 'white', fontSize: '0.95rem', outline: 'none' }}>
                    <option value="90">High Quality (90%)</option>
                    <option value="60">Medium (60%)</option>
                    <option value="30">Small File (30%)</option>
                    <option value="10">Ultra Compressed (10%)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Result */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="cin-doc-row"
                  style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  <div className="cin-doc-info">
                    <div className="cin-doc-icon signed"><CheckCircle /></div>
                    <div>
                      <div className="cin-doc-name">Conversion Complete!</div>
                      <div className="cin-doc-meta" style={{ color: '#34d399' }}>{result.filename}</div>
                    </div>
                  </div>
                  <a href={result.url} target="_blank" rel="noreferrer" className="cin-action-btn download" style={{ textDecoration: 'none' }}>
                    <Download className="w-4 h-4" /> Download
                  </a>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              className="cin-submit-btn"
              onClick={handleConvert}
              disabled={!file || converting}
              style={{ opacity: (!file || converting) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {converting ? (
                <><RefreshCw className="w-5 h-5" style={{ animation: 'spin 1s linear infinite' }} />Converting...</>
              ) : 'Convert File'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
