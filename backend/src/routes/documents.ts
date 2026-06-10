import express from 'express';
import multer from 'multer';
import path from 'path';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';
import { db } from '../firebase';
import crypto from 'crypto';

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
    cb(null, `${Date.now()}-${safeName}`);
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

router.post('/upload', authMiddleware, upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const docData = {
      filename: req.file.originalname,
      filepath: req.file.filename,
      status: 'Pending',
      ownerId: req.userId,
      isPublic: false,
      publicToken: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const docRef = await db.collection('documents').add(docData);
    
    res.status(201).json({ id: docRef.id, ...docData });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const snapshot = await db.collection('documents')
      .where('ownerId', '==', req.userId)
      .get();
      
    const documents = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data() as any;
      // Fetch signatures
      const sigSnapshot = await db.collection('signatureHistory')
        .where('documentId', '==', doc.id)
        .get();
      const signatures = sigSnapshot.docs.map(s => {
        const sigData = s.data();
        return {
          id: s.id,
          signerName: sigData.signerName,
          signerIp: sigData.signerIp,
          action: sigData.action,
          createdAt: sigData.createdAt,
          // Exclude base64 image to prevent huge payload
        };
      });
      return { id: doc.id, ...data, signatures };
    }));
    
    documents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(documents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.get('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const docRef = db.collection('documents').doc(req.params.id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) return res.status(404).json({ error: 'Document not found' });
    
    const data = docSnap.data();
    
    // Fetch signatures
    const sigSnapshot = await db.collection('signatureHistory')
      .where('documentId', '==', docRef.id)
      .get();
    const signatures = sigSnapshot.docs.map(s => ({ id: s.id, ...s.data() }));
    
    res.json({ id: docRef.id, ...data, signatures });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/:id/sign', authMiddleware, async (req: any, res: any) => {
  try {
    const docRef = db.collection('documents').doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Document not found' });
    const document = docSnap.data() as any;

    const pdfPath = path.join(process.cwd(), 'uploads', document.filepath);
    const existingPdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    const { x, y, width, height, pageNum, signatureImage, rotation } = req.body;

    const page = pdfDoc.getPages()[pageNum - 1];

    if (signatureImage) {
      const isJpeg = signatureImage.startsWith('data:image/jpeg') || signatureImage.startsWith('data:image/jpg');
      const base64Data = signatureImage.replace(/^data:image\/\w+;base64,/, '');
      const imageBytes = Buffer.from(base64Data, 'base64');
      
      const embeddedImage = isJpeg 
        ? await pdfDoc.embedJpg(imageBytes)
        : await pdfDoc.embedPng(imageBytes);

      page.drawImage(embeddedImage, {
        x: Number(x),
        y: Number(y),
        width: Number(width),
        height: Number(height),
        rotate: rotation ? degrees(Number(rotation)) : undefined,
      });

      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(pdfPath, pdfBytes);
    }

    await docRef.update({
      status: 'Signed',
      updatedAt: new Date().toISOString()
    });

    await db.collection('signatureHistory').add({
      documentId: docRef.id,
      signerIp: req.ip || 'Unknown',
      signerName: req.userId,
      action: 'Signed',
      signatureImageBase64: signatureImage || null,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, message: 'Document signed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const docRef = db.collection('documents').doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Document not found' });
    const document = docSnap.data() as any;
    
    if (document.ownerId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    // Delete signature history first
    const sigs = await db.collection('signatureHistory').where('documentId', '==', docRef.id).get();
    const batch = db.batch();
    sigs.docs.forEach(sig => batch.delete(sig.ref));
    
    // Delete requests
    const reqs = await db.collection('signatureRequests').where('documentId', '==', docRef.id).get();
    reqs.docs.forEach(r => batch.delete(r.ref));
    
    await batch.commit();

    // Delete the DB record
    await docRef.delete();

    // Delete the file from disk
    const filePath = path.join(process.cwd(), 'uploads', document.filepath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Create signature requests for multiple people
router.post('/:id/requests', authMiddleware, async (req: any, res: any) => {
  try {
    const { emails } = req.body;
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of emails' });
    }

    const docRef = db.collection('documents').doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Document not found' });
    const document = docSnap.data() as any;
    
    if (document.ownerId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    // Create a request for each email
    const requests = [];
    for (const email of emails) {
      const token = crypto.randomUUID();
      const reqData = {
        documentId: docRef.id,
        email,
        token,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const reqRef = await db.collection('signatureRequests').add(reqData);
      requests.push({ id: reqRef.id, ...reqData });
    }

    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      for (const r of requests) {
        const signLink = `http://localhost:5173/sign/public/${r.token}`;
        const msg = {
          to: r.email,
          from: process.env.EMAIL_USER || 'chiranjeeb.email@gmail.com',
          templateId: process.env.SENDGRID_TEMPLATE_ID || 'd-c64d13a1757d41ea92a31ca769b27d61',
          dynamicTemplateData: {
            signLink: signLink,
            filename: document.filename
          }
        };
        try {
          await sgMail.send(msg);
          console.log(`Email successfully sent to ${r.email} via SendGrid Template`);
        } catch (error: any) {
          console.error('Failed to send email to', r.email);
        }
      }
    } else {
      console.warn('SENDGRID_API_KEY not configured. Emails were not sent.');
    }

    res.status(201).json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create signature requests' });
  }
});

// Get signature requests for a document
router.get('/:id/requests', authMiddleware, async (req: any, res: any) => {
  try {
    const docRef = db.collection('documents').doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Document not found' });
    const document = docSnap.data() as any;
    if (document.ownerId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    const reqsSnap = await db.collection('signatureRequests')
      .where('documentId', '==', docRef.id)
      .get();
      
    const requests = reqsSnap.docs.map(r => ({ id: r.id, ...r.data() }));
    requests.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch signature requests' });
  }
});

// Generate a public link for anyone to sign
router.post('/:id/public-link', authMiddleware, async (req: any, res: any) => {
  try {
    const docRef = db.collection('documents').doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Document not found' });
    const document = docSnap.data() as any;
    if (document.ownerId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    let token = document.publicToken;
    if (!token) {
      token = crypto.randomUUID();
      await docRef.update({
        isPublic: true,
        publicToken: token,
        updatedAt: new Date().toISOString()
      });
    }

    res.json({ publicToken: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate public link' });
  }
});

// Generate a public link for anyone to view the signed document
router.post('/:id/public-view-link', authMiddleware, async (req: any, res: any) => {
  try {
    const docRef = db.collection('documents').doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Document not found' });
    const document = docSnap.data() as any;
    if (document.ownerId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    let token = document.publicViewToken;
    if (!token) {
      token = crypto.randomUUID();
      await docRef.update({
        hasPublicView: true,
        publicViewToken: token,
        updatedAt: new Date().toISOString()
      });
    }

    res.json({ publicViewToken: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate public view link' });
  }
});

export default router;
