import express from 'express';
import multer from 'multer';
import path from 'path';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { db, bucket } from '../firebase';
import crypto from 'crypto';

// Helper: send email via SendGrid or Nodemailer fallback
async function sendSigningEmail(toEmail: string, signLink: string, filename: string): Promise<boolean> {
  // Try SendGrid first
  if (process.env.SENDGRID_API_KEY) {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      if (process.env.SENDGRID_TEMPLATE_ID) {
        await sgMail.send({
          to: toEmail,
          from: process.env.EMAIL_USER || 'noreply@example.com',
          templateId: process.env.SENDGRID_TEMPLATE_ID,
          dynamicTemplateData: { signLink, filename },
        });
      } else {
        await sgMail.send({
          to: toEmail,
          from: process.env.EMAIL_USER || 'noreply@example.com',
          subject: `You've been requested to sign: ${filename}`,
          html: buildEmailHtml(signLink, filename),
        });
      }
      console.log(`Email sent to ${toEmail} via SendGrid`);
      return true;
    } catch (err: any) {
      console.error(`SendGrid failed for ${toEmail}:`, err?.response?.body || err.message);
    }
  }

  // Fallback: Nodemailer with Gmail App Password
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
      await transporter.sendMail({
        from: `"Document Manager" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `You've been requested to sign: ${filename}`,
        html: buildEmailHtml(signLink, filename),
      });
      console.log(`Email sent to ${toEmail} via Nodemailer`);
      return true;
    } catch (err: any) {
      console.error(`Nodemailer failed for ${toEmail}:`, err.message);
    }
  }

  console.warn(`No email provider succeeded for ${toEmail}`);
  return false;
}

function buildEmailHtml(signLink: string, filename: string): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #0f172a; border-radius: 16px; color: #e2e8f0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #a78bfa; margin: 0; font-size: 22px;">📝 Signature Requested</h1>
      </div>
      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">You have been asked to sign the document:</p>
      <div style="background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.25); border-radius: 10px; padding: 14px 18px; margin: 16px 0; text-align: center;">
        <strong style="color: #e2e8f0; font-size: 16px;">${filename}</strong>
      </div>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${signLink}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #8b5cf6, #6366f1); color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; letter-spacing: 0.3px;">Open &amp; Sign Document</a>
      </div>
      <p style="font-size: 13px; color: #64748b; text-align: center;">If the button doesn't work, copy and paste this link:<br/>
        <a href="${signLink}" style="color: #818cf8; word-break: break-all;">${signLink}</a>
      </p>
    </div>
  `;
}

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for production
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

router.post('/upload', authMiddleware, upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${Date.now()}-${safeName}`;
    const fileRef = bucket.file(filename);

    await fileRef.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype }
    });

    const docData = {
      filename: req.file.originalname,
      filepath: filename,
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
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const snapshot = await db.collection('documents')
      .where('ownerId', '==', req.userId)
      .get();
      
    // Sort in memory to avoid requiring a composite index right now
    const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
    allDocs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Pagination slice
    const startIndex = (page - 1) * limit;
    const paginatedDocs = allDocs.slice(startIndex, startIndex + limit);
      
    const documents = await Promise.all(paginatedDocs.map(async doc => {
      // Build full local URL as fallback for files uploaded before cloud storage migration
      const protocol = req.protocol;
      const host = req.get('host') || 'localhost:5000';
      const localUrl = `${protocol}://${host}/uploads/${encodeURIComponent(doc.filepath)}`;
      
      let fileUrl = localUrl;
      try {
        const fileRef = bucket.file(doc.filepath);
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

      // Fetch signatures only for the paginated docs (limits N+1 queries)
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
      return { ...doc, signatures, fileUrl };
    }));
    
    res.json({
      documents,
      total: allDocs.length,
      page,
      totalPages: Math.ceil(allDocs.length / limit)
    });
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
    
    const data = docSnap.data() as any;
    
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
    
    // Fetch signatures
    const sigSnapshot = await db.collection('signatureHistory')
      .where('documentId', '==', docRef.id)
      .get();
    const signatures = sigSnapshot.docs.map(s => ({ id: s.id, ...s.data() }));
    
    res.json({ id: docRef.id, ...data, signatures, fileUrl });
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

    let existingPdfBytes: Buffer;
    const fileRef = bucket.file(document.filepath);
    const [exists] = await fileRef.exists();
    if (exists) {
      const [buffer] = await fileRef.download();
      existingPdfBytes = buffer;
    } else {
      const pdfPath = path.join(process.cwd(), 'uploads', document.filepath);
      existingPdfBytes = fs.readFileSync(pdfPath);
    }

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
      
      if (exists) {
        await fileRef.save(pdfBytes, { metadata: { contentType: 'application/pdf' }});
      } else {
        const pdfPath = path.join(process.cwd(), 'uploads', document.filepath);
        fs.writeFileSync(pdfPath, pdfBytes);
      }
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

    // Delete the file from bucket or disk
    try {
      await bucket.file(document.filepath).delete();
    } catch (e) {
      const filePath = path.join(process.cwd(), 'uploads', document.filepath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

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
      const reqData: any = {
        documentId: docRef.id,
        email,
        token,
        status: 'Pending',
        emailSent: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const reqRef = await db.collection('signatureRequests').add(reqData);

      // Attempt to send email
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const signLink = `${frontendUrl}/sign/public/${token}`;
      const sent = await sendSigningEmail(email, signLink, document.filename);
      if (sent) {
        reqData.emailSent = true;
        await reqRef.update({ emailSent: true });
      }

      requests.push({ id: reqRef.id, ...reqData });
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

// Send (or resend) email for a specific signer request
router.post('/:id/requests/:requestId/send-email', authMiddleware, async (req: any, res: any) => {
  try {
    const docRef = db.collection('documents').doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Document not found' });
    const document = docSnap.data() as any;
    if (document.ownerId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    const reqRef = db.collection('signatureRequests').doc(req.params.requestId);
    const reqSnap = await reqRef.get();
    if (!reqSnap.exists) return res.status(404).json({ error: 'Request not found' });
    const reqData = reqSnap.data() as any;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const signLink = `${frontendUrl}/sign/public/${reqData.token}`;
    const sent = await sendSigningEmail(reqData.email, signLink, document.filename);

    if (sent) {
      await reqRef.update({ emailSent: true, updatedAt: new Date().toISOString() });
      return res.json({ success: true, message: `Email sent to ${reqData.email}` });
    } else {
      return res.status(500).json({ error: `Failed to send email to ${reqData.email}. Check your EMAIL_USER/EMAIL_PASS or SENDGRID_API_KEY in .env` });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send email' });
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
