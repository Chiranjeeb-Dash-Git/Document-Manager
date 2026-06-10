import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import CloudConvert from 'cloudconvert';

const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'convert');
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
    const inputPath = req.file.path;
    const outputFilename = `${path.parse(req.file.filename).name}.${targetFormat}`;
    const outputPath = path.join(process.cwd(), 'uploads', 'convert', outputFilename);
    
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    if (ext === '.heic' || ext === '.heif') {
      const heicConvert = require('heic-convert');
      const inputBuffer = fs.readFileSync(inputPath);
      const jpegBuffer = await heicConvert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: quality / 100
      });
      
      if (targetFormat === 'jpg' || targetFormat === 'jpeg') {
        fs.writeFileSync(outputPath, jpegBuffer as Uint8Array);
      } else {
        await sharp(Buffer.from(jpegBuffer))
          .toFormat(targetFormat as any, { quality })
          .toFile(outputPath);
      }
    } else {
      await sharp(inputPath)
        .toFormat(targetFormat as any, { quality })
        .toFile(outputPath);
    }
      
    // Cleanup input
    fs.unlinkSync(inputPath);
    
    res.json({
      success: true,
      url: `http://localhost:5000/uploads/convert/${outputFilename}`,
      filename: outputFilename
    });
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
    
    const inputPath = req.file.path;
    const originalName = req.file.originalname;
    
    // Step 1: Create an import/upload task
    const importTask = await cloudConvert.tasks.create('import/upload');
    
    // Step 2: Upload the file to the import task
    const inputStream = fs.createReadStream(inputPath);
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
    
    // Clean up input
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
    
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
