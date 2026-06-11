import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import CloudConvert from 'cloudconvert';
import os from 'os';

const router = express.Router();

// Use memory storage for Vercel compatibility (no persistent disk)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const cloudConvert = process.env.CLOUDCONVERT_API_KEY 
  ? new CloudConvert(process.env.CLOUDCONVERT_API_KEY)
  : null;

router.post('/image', upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const targetFormat = req.body.targetFormat || 'jpg';
    const quality = Math.max(1, Math.min(100, parseInt(req.body.quality) || 90));
    const outputFilename = `${path.parse(req.file.originalname).name}.${targetFormat}`;
    
    const ext = path.extname(req.file.originalname).toLowerCase();
    let outputBuffer: Buffer;
    
    if (ext === '.heic' || ext === '.heif') {
      const heicConvert = require('heic-convert');
      const jpegBuffer = await heicConvert({
        buffer: req.file.buffer,
        format: 'JPEG',
        quality: quality / 100
      });
      
      if (targetFormat === 'jpg' || targetFormat === 'jpeg') {
        outputBuffer = Buffer.from(jpegBuffer);
      } else {
        outputBuffer = await sharp(Buffer.from(jpegBuffer))
          .toFormat(targetFormat as any, { quality })
          .toBuffer();
      }
    } else {
      outputBuffer = await sharp(req.file.buffer)
        .toFormat(targetFormat as any, { quality })
        .toBuffer();
    }
    
    // Send the converted file directly as a download response
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      avif: 'image/avif',
      tiff: 'image/tiff',
    };
    
    res.set({
      'Content-Type': mimeTypes[targetFormat] || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${outputFilename}"`,
      'Content-Length': outputBuffer.length,
    });
    res.send(outputBuffer);
  } catch (err) {
    console.error('Image convert error:', err);
    res.status(500).json({ error: 'Failed to convert image' });
  }
});

router.post('/document', upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { targetFormat } = req.body;
    if (!targetFormat) {
      return res.status(400).json({ error: 'Target format is required' });
    }

    if (!cloudConvert) {
      return res.status(500).json({ 
        error: 'CloudConvert API key is missing. Please add CLOUDCONVERT_API_KEY to backend/.env file.' 
      });
    }
    
    // Write to temp directory for CloudConvert upload (Vercel allows /tmp writes)
    const tmpDir = os.tmpdir();
    const tmpFilePath = path.join(tmpDir, `${Date.now()}-${req.file.originalname}`);
    fs.writeFileSync(tmpFilePath, req.file.buffer);
    
    const originalName = req.file.originalname;
    
    // Step 1: Create an import/upload task
    const importTask = await cloudConvert.tasks.create('import/upload');
    
    // Step 2: Upload the file to the import task
    const inputStream = fs.createReadStream(tmpFilePath);
    await cloudConvert.tasks.upload(importTask, inputStream, originalName);
    
    // Step 3: Create a convert task that depends on the import task
    const convertTask = await cloudConvert.tasks.create('convert', {
      input: [importTask.id],
      output_format: targetFormat
    });
    
    // Step 4: Wait for conversion to complete
    const completedConvert = await cloudConvert.tasks.wait(convertTask.id);
    
    // Step 5: Create export task
    const exportTask = await cloudConvert.tasks.create('export/url', {
      input: [completedConvert.id]
    });
    
    // Step 6: Wait for export to complete
    const completedExport = await cloudConvert.tasks.wait(exportTask.id);
    
    const file = completedExport.result?.files?.[0];
    
    if (!file) {
      throw new Error('Conversion completed but no output file was generated.');
    }
    
    // Clean up temp file
    try { fs.unlinkSync(tmpFilePath); } catch (e) { /* ignore */ }
    
    res.json({
      success: true,
      url: file.url,
      filename: file.filename
    });
  } catch (err: any) {
    console.error('Document convert error:', err);
    res.status(500).json({ error: err.message || 'Failed to convert document' });
  }
});

export default router;
