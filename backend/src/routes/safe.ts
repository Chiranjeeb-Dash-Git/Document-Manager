import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, bucket } from '../firebase';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

// Check if user has a PIN set
router.get('/has-pin', authMiddleware, async (req: any, res: any) => {
  try {
    const userRef = db.collection('users').doc(req.userId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userSnap.data();
    res.json({ hasPin: !!userData?.safePin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Setup PIN
router.post('/setup-pin', authMiddleware, async (req: any, res: any) => {
  try {
    const { pin } = req.body;
    if (!pin || pin.length !== 4) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    const userRef = db.collection('users').doc(req.userId);
    
    await userRef.update({
      safePin: hashedPin,
      updatedAt: new Date().toISOString()
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to set up PIN' });
  }
});

// Verify PIN
router.post('/verify-pin', authMiddleware, async (req: any, res: any) => {
  try {
    const { pin } = req.body;
    const userRef = db.collection('users').doc(req.userId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) return res.status(404).json({ error: 'User not found' });
    
    const userData = userSnap.data();
    if (!userData?.safePin) {
      return res.status(400).json({ error: 'No PIN is set up for this user' });
    }
    
    const isValid = await bcrypt.compare(pin, userData.safePin);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect PIN' });
    }
    
    res.json({ success: true, token: 'session-unlocked' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to verify PIN' });
  }
});

// Upload to Secure Folder
router.post('/upload', authMiddleware, upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `safe-${Date.now()}-${safeName}`;
    const fileRef = bucket.file(filename);

    await fileRef.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype }
    });
    
    const docData = {
      filename: req.file.originalname,
      filepath: filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      ownerId: req.userId,
      createdAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection('safeItems').add(docData);
    res.status(201).json({ id: docRef.id, ...docData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload safe item' });
  }
});

// Get all safe items
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const snapshot = await db.collection('safeItems')
      .where('ownerId', '==', req.userId)
      .get();
      
    const items = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data() as any;
      const protocol = req.protocol;
      const host = req.get('host') || 'localhost:5000';
      const localUrl = `${protocol}://${host}/uploads/${encodeURIComponent(data.filepath)}`;
      
      let fileUrl = localUrl;
      try {
        const fileRef = bucket.file(data.filepath);
        const [exists] = await fileRef.exists();
        if (exists) {
          const [url] = await fileRef.getSignedUrl({
            action: 'read',
            expires: Date.now() + 1000 * 60 * 60 * 24 // 24 hours
          });
          fileUrl = url;
        }
      } catch (err) {
        // Keep local URL fallback
      }
      return { id: doc.id, ...data, fileUrl };
    }));
    items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch safe items' });
  }
});

// Delete safe item
router.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const docRef = db.collection('safeItems').doc(req.params.id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) return res.status(404).json({ error: 'Item not found' });
    const document = docSnap.data() as any;
    
    if (document.ownerId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    // Delete the file from bucket or disk
    try {
      await bucket.file(document.filepath).delete();
    } catch (e) {
      const filePath = path.join(process.cwd(), 'uploads', document.filepath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete the DB record
    await docRef.delete();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete safe item' });
  }
});

export default router;
