import express from 'express';
import crypto from 'crypto';
import os from 'os';
import { db } from '../firebase'; // Import Firestore

const router = express.Router();

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

// POST /api/mobile-sig/create — desktop creates a session
router.post('/create', async (req, res) => {
  try {
    const sessionId = crypto.randomUUID();
    await db.collection('mobileSessions').doc(sessionId).set({
      signature: null,
      createdAt: Date.now()
    });
    res.json({ sessionId, localIp: getLocalIp() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// GET /api/mobile-sig/:sessionId/poll — desktop polls for signature
router.get('/:sessionId/poll', async (req, res) => {
  try {
    const doc = await db.collection('mobileSessions').doc(req.params.sessionId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Session not found or expired' });
    
    const data = doc.data() as any;
    // Expire after 10 mins
    if (Date.now() - data.createdAt > 10 * 60 * 1000) {
      await doc.ref.delete();
      return res.status(404).json({ error: 'Session expired' });
    }
    
    res.json({ ready: !!data.signature, signature: data.signature });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to poll session' });
  }
});

// POST /api/mobile-sig/:sessionId/submit — mobile submits signature
router.post('/:sessionId/submit', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const doc = await db.collection('mobileSessions').doc(req.params.sessionId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Session not found or expired' });
    
    const data = doc.data() as any;
    if (Date.now() - data.createdAt > 10 * 60 * 1000) {
      await doc.ref.delete();
      return res.status(404).json({ error: 'Session expired' });
    }

    const { signature } = req.body;
    if (!signature || typeof signature !== 'string') {
      return res.status(400).json({ error: 'Missing signature data' });
    }

    await doc.ref.update({ signature });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit signature' });
  }
});

export default router;
