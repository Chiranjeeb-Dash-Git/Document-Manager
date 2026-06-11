import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// In-memory session store: sessionId -> { signature: string | null, createdAt: number }
const sessions = new Map<string, { signature: string | null; createdAt: number }>();

// Lazy cleanup: remove expired sessions on access (works in serverless where setInterval doesn't)
function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > 10 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}

// Also run periodic cleanup if running as a long-lived server (not Vercel)
if (!process.env.VERCEL) {
  setInterval(cleanupSessions, 2 * 60 * 1000);
}

import os from 'os';

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// POST /api/mobile-sig/create — desktop creates a session, gets back an ID
router.post('/create', (req, res) => {
  cleanupSessions();
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { signature: null, createdAt: Date.now() });
  res.json({ sessionId, localIp: getLocalIp() });
});

// GET /api/mobile-sig/:sessionId/poll — desktop polls for signature
router.get('/:sessionId/poll', (req, res) => {
  cleanupSessions();
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });
  res.json({ ready: !!session.signature, signature: session.signature });
});

// POST /api/mobile-sig/:sessionId/submit — mobile submits signature
router.post('/:sessionId/submit', express.json({ limit: '50mb' }), (req, res) => {
  cleanupSessions();
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });
  const { signature } = req.body;
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ error: 'Missing signature data' });
  }
  session.signature = signature;
  res.json({ success: true });
});

export default router;
