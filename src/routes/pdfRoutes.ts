import express from 'express';
import { mergePDFsHandler } from '../services/pdfService';
import upload from '../middleware/uploadMiddleware';

const router = express.Router();

router.post(
  '/merge',
  (req, res, next) => {
    upload.fields([{ name: 'files', maxCount: 20 }])(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ error: 'Error uploading file' });
      }
      next();
    });
  },
  mergePDFsHandler
);

export default router;
