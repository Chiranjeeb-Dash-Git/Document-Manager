import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import documentRoutes from './routes/documents';
import publicRoutes from './routes/public';
import convertRoutes from './routes/convert';
import safeRoutes from './routes/safe';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mobileSigRoutes from './routes/mobilesig';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Security and Performance Middlewares
app.use(helmet({ crossOriginResourcePolicy: false })); // Allow cross-origin for static files/PDFs
app.use(compression());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/convert', convertRoutes);
app.use('/api/safe', safeRoutes);
app.use('/api/mobile-sig', mobileSigRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
