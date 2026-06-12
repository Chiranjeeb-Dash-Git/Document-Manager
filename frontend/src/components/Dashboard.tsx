import React, { useState, useEffect, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api, { API_BASE } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, Clock, ChevronRight, Eye, Trash2, Download, X, AlertTriangle, Users, Copy, Link2, Mail, Send } from 'lucide-react';

const PDFViewer = lazy(() => import('./PDFViewer'));

interface Document {
  id: string;
  filename: string;
  filepath: string;
  status: string;
  createdAt: string;
  signatures: any[];
  fileUrl?: string;
}

// removed variants

export default function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // PDF Viewer modal
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);

  // Delete confirmation modal
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Manage Signers modal
  const [managingDoc, setManagingDoc] = useState<Document | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [emailsText, setEmailsText] = useState('');
  const [sendingRequests, setSendingRequests] = useState(false);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatingViewLink, setGeneratingViewLink] = useState<string | null>(null);

  // Signatures History modal
  const [viewingSignaturesDoc, setViewingSignaturesDoc] = useState<Document | null>(null);
  
  // Signature/Govt ID Lightbox
  const [viewingMedia, setViewingMedia] = useState<string | null>(null);

  // Email sending state
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [emailFeedback, setEmailFeedback] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const fetchDocuments = async (pageNum = 1, append = false) => {
    try {
      const res = await api.get(`/documents?page=${pageNum}&limit=10`);
      if (Array.isArray(res.data)) {
        // Fallback for old API just in case
        setDocuments(res.data);
        setHasMore(false);
      } else {
        const newDocs = res.data.documents;
        setDocuments(prev => append ? [...prev, ...newDocs] : newDocs);
        setHasMore(pageNum < res.data.totalPages);
        setPage(pageNum);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDocuments(1, false);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchDocuments(1, false);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDoc) return;
    setDeleting(true);
    try {
      await api.delete(`/documents/${deletingDoc.id}`);
      setDocuments(prev => prev.filter(d => d.id !== deletingDoc.id));
      setDeletingDoc(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const openViewer = (doc: Document) => {
    setViewingDoc(doc);
  };

  const closeViewer = () => setViewingDoc(null);

  const openManager = async (doc: Document) => {
    setManagingDoc(doc);
    setEmailsText('');
    setPublicLink(null);
    try {
      const res = await api.get(`/documents/${doc.id}/requests`);
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const closeManager = () => {
    setManagingDoc(null);
    setPublicLink(null);
  };

  const sendRequests = async () => {
    if (!managingDoc) return;
    const emails = emailsText.split(',').map(e => e.trim()).filter(e => e);
    if (emails.length === 0) return;
    
    setSendingRequests(true);
    try {
      await api.post(`/documents/${managingDoc.id}/requests`, { emails });
      setEmailsText('');
      const res = await api.get(`/documents/${managingDoc.id}/requests`);
      setRequests(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to send requests');
    } finally {
      setSendingRequests(false);
    }
  };

  const sendEmailToSigner = async (requestId: string, docId: string) => {
    setSendingEmailId(requestId);
    setEmailFeedback(null);
    try {
      const res = await api.post(`/documents/${docId}/requests/${requestId}/send-email`);
      setEmailFeedback({ id: requestId, success: true, message: res.data.message || 'Email sent!' });
      // Refresh the requests list to update emailSent status
      const updated = await api.get(`/documents/${docId}/requests`);
      setRequests(updated.data);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error || 'Failed to send email';
      setEmailFeedback({ id: requestId, success: false, message: msg });
    } finally {
      setSendingEmailId(null);
      setTimeout(() => setEmailFeedback(null), 4000);
    }
  };

  const generatePublicLink = async () => {
    if (!managingDoc) return;
    setGeneratingLink(true);
    try {
      const res = await api.post(`/documents/${managingDoc.id}/public-link`);
      setPublicLink(`http://localhost:5173/doc/${res.data.publicToken}`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate public link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const generatePublicViewLink = async (doc: Document) => {
    setGeneratingViewLink(doc.id);
    try {
      const res = await api.post(`/documents/${doc.id}/public-view-link`);
      const link = `http://localhost:5173/view/${res.data.publicViewToken}`;
      navigator.clipboard.writeText(link);
      alert(`Public view link copied to clipboard!\n${link}`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate public view link');
    } finally {
      setGeneratingViewLink(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <motion.div
        className="cin-dash-header"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="cin-dash-title">Your Documents</h1>
          <p className="cin-dash-desc">Manage and sign your PDF files securely.</p>
        </div>
        <label className="cin-upload-btn" style={{ cursor: 'pointer' }}>
          <Upload className="w-5 h-5" />
          {uploading ? 'Uploading...' : 'Upload PDF'}
          <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
        </label>
      </motion.div>

      {/* Document List */}
      <div className="cin-doc-list">
        {documents.length === 0 ? (
          <motion.div
            className="cin-doc-empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="cin-doc-empty-icon">
              <FileText />
            </div>
            <h3>No documents yet</h3>
            <p>Upload a PDF to get started with digital signatures.</p>
          </motion.div>
        ) : (
          <div>
            {documents.map((doc, index) => (
              <motion.div
                key={doc.id}
                className="cin-doc-row"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Left: icon + info */}
                <div className="cin-doc-info">
                  <div className={`cin-doc-icon ${doc.status === 'Signed' ? 'signed' : 'pending'}`}>
                    <FileText />
                  </div>
                  <div>
                    <div className="cin-doc-name">{doc.filename}</div>
                    <div className="cin-doc-meta">
                      <span className="cin-doc-meta-status">
                        {doc.status === 'Signed'
                          ? <CheckCircle className="w-3.5 h-3.5" style={{ color: '#34d399', display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                          : <Clock className="w-3.5 h-3.5" style={{ color: '#fbbf24', display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />}
                        <span className={`cin-doc-status ${doc.status === 'Signed' ? 'signed' : 'pending'}`}>
                          {doc.status}
                        </span>
                      </span>
                      <span className="cin-doc-dot">•</span>
                      <span className="cin-doc-date">{new Date(doc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                {/* Right: actions */}
                <div className="cin-doc-actions">
                  <button onClick={() => openViewer(doc)} className="cin-action-btn view">
                    <Eye className="w-4 h-4" /> View PDF
                  </button>

                  <button 
                    onClick={() => generatePublicViewLink(doc)} 
                    disabled={generatingViewLink === doc.id}
                    className="cin-action-btn copy-link"
                    style={{ borderColor: '#6366f1', color: '#818cf8' }}
                  >
                    <Copy className="w-4 h-4" /> {generatingViewLink === doc.id ? 'Generating...' : 'Share View Link'}
                  </button>

                  {doc.signatures && doc.signatures.length > 0 && (
                    <button 
                      onClick={async () => {
                        try {
                          const res = await api.get(`/documents/${doc.id}`);
                          setViewingSignaturesDoc(res.data);
                        } catch (err) {
                          console.error(err);
                        }
                      }} 
                      className="cin-action-btn signatures"
                    >
                      <Users className="w-4 h-4" /> Signatures ({doc.signatures.length})
                    </button>
                  )}

                  {doc.status === 'Signed' && (
                    <a
                      href={`${API_BASE}/uploads/${encodeURIComponent(doc.filepath)}`}
                      download={doc.filename}
                      className="cin-action-btn download"
                    >
                      <Download className="w-4 h-4" /> Download
                    </a>
                  )}

                  {doc.status !== 'Signed' && (
                    <>
                      <button onClick={() => openManager(doc)} className="cin-action-btn signers">
                        <Users className="w-4 h-4" /> Signers
                      </button>
                      <Link to={`/sign/${doc.id}`} className="cin-action-btn sign-now">
                        Sign Now <ChevronRight className="w-4 h-4" />
                      </Link>
                    </>
                  )}

                  <button onClick={() => setDeletingDoc(doc)} className="cin-action-btn delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {hasMore && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button 
              className="cin-action-btn"
              style={{ background: '#334155', border: '1px solid #475569', color: '#e2e8f0', padding: '12px 24px' }}
              onClick={() => fetchDocuments(page + 1, true)}
            >
              Load More
            </button>
          </div>
        )}
      </div>

      {createPortal(
        <>
          {/* ── PDF Viewer Modal ── */}
          <AnimatePresence>
        {viewingDoc && (
          <div className="cin-modal-overlay">
            <motion.div
              className="cin-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeViewer}
            />
            <motion.div
              className="cin-modal cin-pdf-viewer"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="cin-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className={`cin-doc-icon ${viewingDoc.status === 'Signed' ? 'signed' : 'pending'}`} style={{ width: 36, height: 36, borderRadius: 10 }}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="cin-modal-title" style={{ fontSize: '0.9rem' }}>{viewingDoc.filename}</div>
                    <div className={`cin-doc-status ${viewingDoc.status === 'Signed' ? 'signed' : 'pending'}`} style={{ fontSize: '0.75rem' }}>{viewingDoc.status}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    href={`${API_BASE}/uploads/${encodeURIComponent(viewingDoc.filepath)}`}
                    download={viewingDoc.filename}
                    className="cin-action-btn download"
                  >
                    <Download className="w-4 h-4" /> Download
                  </a>
                  <button onClick={closeViewer} className="cin-modal-close">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="cin-pdf-canvas">
                <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading PDF Viewer...</div>}>
                  <PDFViewer fileUrl={`${API_BASE}/uploads/${encodeURIComponent(viewingDoc.filepath)}`} />
                </Suspense>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deletingDoc && (
          <div className="cin-modal-overlay">
            <motion.div
              className="cin-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setDeletingDoc(null)}
            />
            <motion.div
              className="cin-modal cin-delete-modal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25 }}
            >
              <div className="cin-delete-icon">
                <AlertTriangle />
              </div>
              <div className="cin-delete-title">Delete Document?</div>
              <p className="cin-delete-desc">
                <strong>"{deletingDoc.filename}"</strong> will be permanently deleted and cannot be recovered.
              </p>
              <div className="cin-delete-actions">
                <button onClick={() => setDeletingDoc(null)} disabled={deleting} className="cin-btn-cancel">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting} className="cin-btn-delete">
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Signature History Modal ── */}
      <AnimatePresence>
        {viewingSignaturesDoc && (
          <div className="cin-modal-overlay">
            <motion.div
              className="cin-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingSignaturesDoc(null)}
            />
            <motion.div
              className="cin-modal"
              style={{ width: '100%', maxWidth: 960, padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                <div>
                  <div className="cin-modal-title" style={{ fontSize: '1.2rem' }}>Signature Details</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>{viewingSignaturesDoc.filename}</div>
                </div>
                <button onClick={() => setViewingSignaturesDoc(null)} className="cin-modal-close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {viewingSignaturesDoc.signatures && viewingSignaturesDoc.signatures.length > 0 ? (
                <div className="cin-sig-table-wrap">
                  <table className="cin-sig-table">
                    <thead>
                      <tr>
                        <th>Signer Name</th>
                        <th>Phone</th>
                        <th>Address</th>
                        <th>Govt ID</th>
                        <th>Govt ID Photo</th>
                        <th>Signature Photo</th>
                        <th>Action</th>
                        <th>Date</th>
                        <th>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingSignaturesDoc.signatures.map((sig: any) => (
                        <tr key={sig.id}>
                          <td style={{ color: '#e2e8f0', fontWeight: 500 }}>{sig.signerName || '-'}</td>
                          <td>{sig.signerPhone || '-'}</td>
                          <td>{sig.signerAddress || '-'}</td>
                          <td>{sig.signerGovtId || '-'}</td>
                          <td>
                            {sig.signerGovtIdImageBase64 ? (
                              <button onClick={() => setViewingMedia(sig.signerGovtIdImageBase64)} className="bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity">
                                <img src={sig.signerGovtIdImageBase64} alt="Govt ID" className="cin-sig-photo" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #334155' }} />
                              </button>
                            ) : (
                              <span style={{ color: '#475569', fontStyle: 'italic', fontSize: '0.75rem' }}>No photo</span>
                            )}
                          </td>
                          <td>
                            {sig.signatureImageBase64 ? (
                              <button onClick={() => setViewingMedia(sig.signatureImageBase64)} className="bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity">
                                <img src={sig.signatureImageBase64} alt="Signature" className="cin-sig-photo" style={{ cursor: 'pointer' }} />
                              </button>
                            ) : (
                              <span style={{ color: '#475569', fontStyle: 'italic', fontSize: '0.75rem' }}>No photo</span>
                            )}
                          </td>
                          <td>
                            <span className="cin-sig-badge">{sig.action}</span>
                          </td>
                          <td>{new Date(sig.createdAt).toLocaleString()}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569' }}>{sig.signerIp || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#475569', padding: '2rem 0', fontStyle: 'italic' }}>No signatures found.</p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Manage Signers Modal ── */}
      <AnimatePresence>
        {managingDoc && (
          <div className="cin-modal-overlay">
            <motion.div
              className="cin-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeManager}
            />
            <motion.div
              className="cin-modal cin-signers-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <div className="cin-modal-header">
                <span className="cin-modal-title">Share Document for Signatures</span>
                <button onClick={closeManager} className="cin-modal-close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="cin-modal-body">
                {/* ── Option 1: Public Link ── */}
                <div className="cin-section public">
                  <div className="cin-section-title">
                    <Link2 className="w-5 h-5" style={{ color: '#34d399' }} />
                    Public Link — Anyone Can Sign
                  </div>
                  <p className="cin-section-desc">
                    Generate a single link. Anyone who opens it can sign the document directly — no account needed.
                  </p>
                  {publicLink ? (
                    <div className="cin-link-input">
                      <input type="text" readOnly value={publicLink} />
                      <button
                        onClick={() => { navigator.clipboard.writeText(publicLink); alert('Public link copied!'); }}
                        className="cin-btn-copy"
                      >
                        <Copy className="w-4 h-4" /> Copy
                      </button>
                    </div>
                  ) : (
                    <button onClick={generatePublicLink} disabled={generatingLink} className="cin-btn-generate">
                      <Link2 className="w-4 h-4" />
                      {generatingLink ? 'Generating...' : 'Generate Public Link'}
                    </button>
                  )}
                </div>

                {/* ── Option 2: Individual tracking ── */}
                <div className="cin-section individual">
                  <div className="cin-section-title">
                    <Users className="w-5 h-5" style={{ color: '#60a5fa' }} />
                    Track Individual Signers
                  </div>
                  <p className="cin-section-desc">
                    Add names/emails below to generate <strong>individual tracking links</strong>. You then share each link manually (via WhatsApp, email, etc.) and track who has signed.
                  </p>

                  <div className="cin-email-row">
                    <input
                      type="text"
                      value={emailsText}
                      onChange={e => setEmailsText(e.target.value)}
                      placeholder="e.g. john@example.com, jane@example.com"
                      className="cin-email-input"
                    />
                    <button onClick={sendRequests} disabled={sendingRequests || !emailsText} className="cin-btn-add">
                      {sendingRequests ? 'Adding...' : '+ Add'}
                    </button>
                  </div>

                  <div className="cin-signer-list">
                    <div className="cin-signer-list-header">Signers &amp; Links</div>
                    <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                      {requests.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#475569', padding: '1rem', fontStyle: 'italic', fontSize: '0.85rem' }}>No individual signers added yet.</p>
                      ) : (
                        requests.map(req => (
                          <div key={req.id} className="cin-signer-item" style={{ flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <div>
                                <div className="cin-signer-email">{req.email}</div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '3px' }}>
                                  <span className={`cin-signer-status ${req.status === 'Signed' ? 'signed' : 'pending-status'}`}>
                                    {req.status === 'Signed' ? '✓ Signed' : '⏳ Pending'}
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: req.emailSent ? '#34d399' : '#f97316', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <Mail className="w-3 h-3" />
                                    {req.emailSent ? 'Email sent' : 'Not emailed'}
                                  </span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                                {req.status !== 'Signed' && (
                                  <>
                                    <button
                                      onClick={() => sendEmailToSigner(req.id, managingDoc!.id)}
                                      disabled={sendingEmailId === req.id}
                                      className="cin-btn-copy-link"
                                      style={{ borderColor: '#8b5cf6', color: '#a78bfa', gap: '4px' }}
                                      title={req.emailSent ? 'Resend email' : 'Send signing link via email'}
                                    >
                                      <Send className="w-3.5 h-3.5" />
                                      {sendingEmailId === req.id ? 'Sending...' : req.emailSent ? 'Resend' : 'Send Email'}
                                    </button>
                                    <button
                                      onClick={() => { navigator.clipboard.writeText(`http://localhost:5173/sign/public/${req.token}`); alert(`Link for ${req.email} copied!`); }}
                                      className="cin-btn-copy-link"
                                    >
                                      <Copy className="w-3.5 h-3.5" /> Copy Link
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            {emailFeedback && emailFeedback.id === req.id && (
                              <div style={{
                                fontSize: '0.75rem',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                width: '100%',
                                background: emailFeedback.success ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                                border: `1px solid ${emailFeedback.success ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                color: emailFeedback.success ? '#34d399' : '#f87171',
                              }}>
                                {emailFeedback.message}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {requests.length > 0 && (
                    <p className="cin-signer-tip">
                      💡 Copy each person's link and share via WhatsApp, SMS, or email.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal for viewing Signatures/Govt IDs */}
      <AnimatePresence>
        {viewingMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 10000,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
            }}
            onClick={() => setViewingMedia(null)}
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setViewingMedia(null); }}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', zIndex: 50 }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <X className="w-6 h-6" />
            </button>
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              style={{ width: '100%', height: '100%', maxWidth: '1200px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
            >
              {viewingMedia.startsWith('data:application/pdf') ? (
                <iframe src={viewingMedia} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', background: 'white', pointerEvents: 'auto' }} title="PDF Preview" onClick={(e) => e.stopPropagation()} />
              ) : (
                <img src={viewingMedia} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
}
