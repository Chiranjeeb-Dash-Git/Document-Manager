import express from 'express';
import path from 'path';
import { PDFDocument, degrees } from 'pdf-lib';
import fs from 'fs';
import { db, bucket } from '../firebase';

const router = express.Router();

// Get public signature request details
router.get('/requests/:token', async (req: any, res: any) => {
  try {
    const snapshot = await db.collection('signatureRequests')
      .where('token', '==', req.params.token)
      .limit(1)
      .get();
      
    if (snapshot.empty) return res.status(404).json({ error: 'Invalid or expired signature link' });
    
    const requestDoc = snapshot.docs[0];
    const requestData = requestDoc.data() as any;
    
    const docSnap = await db.collection('documents').doc(requestData.documentId).get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Document not found' });
    const documentData = docSnap.data() as any;

    res.json({
      id: requestDoc.id,
      status: requestData.status,
      email: requestData.email,
      document: {
        filename: documentData.filename,
        filepath: documentData.filepath,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// Apply signature publicly
router.post('/requests/:token/sign', async (req: any, res: any) => {
  try {
    const reqSnap = await db.collection('signatureRequests')
      .where('token', '==', req.params.token)
      .limit(1)
      .get();
      
    if (reqSnap.empty) return res.status(404).json({ error: 'Invalid signature link' });
    
    const requestDoc = reqSnap.docs[0];
    const requestData = requestDoc.data() as any;
    
    if (requestData.status === 'Signed') return res.status(400).json({ error: 'Already signed' });

    const docRef = db.collection('documents').doc(requestData.documentId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Document not found' });
    const documentData = docSnap.data() as any;

    const { x, y, width, height, pageNum, signatureImage, rotation } = req.body;

    // Load PDF from local persistent volume first (primary storage)
    const pdfPath = path.join(process.cwd(), 'uploads', documentData.filepath);
    let existingPdfBytes: Buffer;
    if (fs.existsSync(pdfPath)) {
      existingPdfBytes = fs.readFileSync(pdfPath) as unknown as Buffer;
    } else {
      // Fall back to Firebase Storage if not on local disk
      const fileRef = bucket.file(documentData.filepath);
      const [cloudExists] = await fileRef.exists();
      if (!cloudExists) {
        return res.status(404).json({ error: 'PDF file not found in storage' });
      }
      const [buffer] = await fileRef.download();
      existingPdfBytes = buffer;
    }
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    const page = pdfDoc.getPages()[pageNum - 1];

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

    // Save signed PDF back to local persistent volume (primary)
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    fs.writeFileSync(pdfPath, pdfBytes);

    // Optionally back up signed PDF to Firebase Storage (non-fatal if it fails)
    try {
      const firebaseFileRef = bucket.file(documentData.filepath);
      await firebaseFileRef.save(Buffer.from(pdfBytes), { metadata: { contentType: 'application/pdf' } });
    } catch (cloudErr: any) {
      console.warn('Firebase Storage backup of signed PDF failed (saved locally):', cloudErr.message || cloudErr);
    }

    // Update SignatureRequest
    await requestDoc.ref.update({ status: 'Signed', updatedAt: new Date().toISOString() });

    // Add History
    await db.collection('signatureHistory').add({
      documentId: docRef.id,
      signerName: requestData.email,
      signerIp: req.ip || 'Unknown',
      action: 'Signed via Public Link',
      signatureImageBase64: signatureImage || null,
      createdAt: new Date().toISOString()
    });

    // Check if all requests are now signed
    const pendingSnap = await db.collection('signatureRequests')
      .where('documentId', '==', docRef.id)
      .where('status', '==', 'Pending')
      .get();

    if (pendingSnap.empty) {
      await docRef.update({ status: 'Signed', updatedAt: new Date().toISOString() });
    }

    res.json({ message: 'Successfully signed document' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to apply signature' });
  }
});

// Get global public document details
router.get('/document/:token', async (req: any, res: any) => {
  try {
    const docSnap = await db.collection('documents')
      .where('publicToken', '==', req.params.token)
      .limit(1)
      .get();

    if (docSnap.empty) return res.status(404).json({ error: 'Invalid or disabled public link' });
    
    const document = docSnap.docs[0].data() as any;
    if (!document.isPublic) {
      return res.status(404).json({ error: 'Invalid or disabled public link' });
    }

    res.json({
      id: docSnap.docs[0].id,
      filename: document.filename,
      filepath: document.filepath,
      status: document.status
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Apply signature globally
router.post('/document/:token/sign', async (req: any, res: any) => {
  try {
    const docSnap = await db.collection('documents')
      .where('publicToken', '==', req.params.token)
      .limit(1)
      .get();

    if (docSnap.empty) return res.status(404).json({ error: 'Invalid public link' });
    
    const document = docSnap.docs[0].data() as any;
    const docId = docSnap.docs[0].id;
    
    if (!document.isPublic) {
      return res.status(404).json({ error: 'Invalid public link' });
    }

    const { x, y, width, height, pageNum, signatureImage, rotation, signerName, signerPhone, signerAddress, signerGovtId, signerGovtIdImage } = req.body;
    
    if (!signerName) {
      return res.status(400).json({ error: 'Signer name is required' });
    }
    if (!signerPhone) {
      return res.status(400).json({ error: 'Signer phone number is required' });
    }
    if (!signerAddress) {
      return res.status(400).json({ error: 'Signer address is required' });
    }
    if (!signerGovtId) {
      return res.status(400).json({ error: 'Signer Govt ID is required' });
    }

    // Only modify the PDF if a signature image was provided
    if (signatureImage) {
      // Load PDF from local persistent volume first (primary storage)
      const pdfPath = path.join(process.cwd(), 'uploads', document.filepath);
      let existingPdfBytes: Buffer;
      if (fs.existsSync(pdfPath)) {
        existingPdfBytes = fs.readFileSync(pdfPath) as unknown as Buffer;
      } else {
        // Fall back to Firebase Storage if not on local disk
        const fileRef = bucket.file(document.filepath);
        const [cloudExists] = await fileRef.exists();
        if (!cloudExists) {
          return res.status(404).json({ error: 'PDF file not found in storage' });
        }
        const [buffer] = await fileRef.download();
        existingPdfBytes = buffer;
      }
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      const page = pdfDoc.getPages()[pageNum - 1];

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

      // Save signed PDF back to local persistent volume (primary)
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      fs.writeFileSync(pdfPath, pdfBytes);

      // Optionally back up signed PDF to Firebase Storage (non-fatal if it fails)
      try {
        const firebaseFileRef = bucket.file(document.filepath);
        await firebaseFileRef.save(Buffer.from(pdfBytes), { metadata: { contentType: 'application/pdf' } });
      } catch (cloudErr: any) {
        console.warn('Firebase Storage backup of signed PDF failed (saved locally):', cloudErr.message || cloudErr);
      }
    }

    // Add History
    await db.collection('signatureHistory').add({
      documentId: docId,
      signerName: signerName,
      signerPhone: signerPhone,
      signerAddress: signerAddress,
      signerGovtId: signerGovtId,
      signerGovtIdImageBase64: signerGovtIdImage || null,
      signerIp: req.ip || 'Unknown',
      action: 'Signed via Public Share Link',
      signatureImageBase64: signatureImage || null,
      createdAt: new Date().toISOString()
    });

    res.json({ message: 'Successfully signed document' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to apply signature' });
  }
});

// Get document details and signatures for public viewing
router.get('/document/:token/view', async (req: any, res: any) => {
  try {
    const docSnap = await db.collection('documents')
      .where('publicViewToken', '==', req.params.token)
      .limit(1)
      .get();

    if (docSnap.empty) return res.status(404).json({ error: 'Invalid public view link' });
    
    const document = docSnap.docs[0].data() as any;
    const docId = docSnap.docs[0].id;
    
    if (!document.hasPublicView) {
      return res.status(404).json({ error: 'Invalid public view link' });
    }

    // Fetch signature history
    const historySnap = await db.collection('signatureHistory')
      .where('documentId', '==', docId)
      .get();

    const signatures = historySnap.docs.map(d => ({ id: d.id, ...d.data() }));
    signatures.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      id: docId,
      filename: document.filename,
      filepath: document.filepath,
      status: document.status,
      signatures: signatures
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch document view' });
  }
});

export default router;
