import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db } from '../firebase';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `safe-${Date.now()}-${safeName}`);
  },
});
const upload = multer({ storage });

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
    
    const docData = {
      filename: req.file.originalname,
      filepath: req.file.filename,
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
      
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

    // Delete the file from disk
    const filePath = path.join(process.cwd(), 'uploads', document.filepath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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
