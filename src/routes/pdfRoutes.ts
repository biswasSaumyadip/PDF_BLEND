import express from 'express';
import { mergePDFsHandler } from '../services/pdfService';
import upload from '../middleware/uploadMiddleware';
import logger from '../utils/logger';

const router = express.Router();

router.post(
  '/merge',
  (req, res, next) => {
    upload.fields([{ name: 'files', maxCount: 20 }])(req, res, (err) => {
      if (err) {
        logger.error('[Multer Error] File upload failed', { error: err.message });
        return res.status(400).json({ error: 'Error uploading file' });
      }

      if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        logger.warn('[Validation Error] No files uploaded');
        return res
          .status(400)
          .json({ error: 'No files uploaded. Please select at least one file.' });
      }

      next();
    });
  },
  mergePDFsHandler
);

export default router;
