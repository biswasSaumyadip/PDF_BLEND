import express, { NextFunction, Request, Response } from 'express';
import { mergePDFsHandler, PDFService } from '../services/pdfService';
import upload from '../middleware/uploadMiddleware';
import logger from '../utils/logger';
import { PDFDocument } from 'pdf-lib';
import { validateMergeUpload } from '../middleware/uploadValidatorMiddleware';
import { mergeWithPreview } from '../controller/pdfController';

const router = express.Router();

interface CustomRequest extends Request {
  file: Express.Multer.File;
}


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

router.post(
  '/remove',
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        logger.error('[Multer Error] File upload failed', { error: err.message });
        return res.status(400).json({ error: 'Error uploading file' });
      }

      if (!req.file) {
        logger.warn('[Validation Error] No file uploaded');
        return res
          .status(400)
          .json({ error: 'No file uploaded. Please select a PDF.' });
      }

      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const filename = req.body.filename || 'CleanedFile.pdf';
      const pagesToRemove: number[] = JSON.parse(req.body.pagesToRemove || '[]');

      if (!file?.buffer) {
        return res.status(400).json({ error: 'Uploaded file is empty.' });
      }

      const cleanedPdf = await PDFService.removePages(file.buffer, pagesToRemove);

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/pdf');
      res.send(cleanedPdf);
    } catch (error: any) {
      logger.error('[PDF Remove Error]', { error: error.message });
      res.status(500).json({ error: 'Failed to remove pages from PDF.' });
    }
  }
);

router.post('/merge-with-preview', validateMergeUpload, mergeWithPreview);

router.post('/fix-links', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const filename = req.body.filename || 'Updated.pdf';
    const linksToFix: Record<number, { oldTarget: number; newTarget: number }[]> = JSON.parse(req.body.linksToFix || '{}');

    if (!file?.buffer) return res.status(400).send('No file uploaded');

    const updated = await PDFService.fixInternalLinks(file.buffer, linksToFix);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(updated);
  } catch (err: any) {
    logger.error('[Fix Links Error]', err.message);
    res.status(500).send('Failed to fix links');
  }
});


export default router;
