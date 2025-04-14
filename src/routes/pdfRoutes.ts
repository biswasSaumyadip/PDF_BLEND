import express, { NextFunction, Request, Response } from 'express';
import { mergePDFsHandler, PDFService } from '../services/pdfService';
import upload from '../middleware/uploadMiddleware';
import logger from '../utils/logger';

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

router.post(
  '/merge-with-preview',
  (req: Request, res: Response, next: NextFunction) => {
    upload.fields([{ name: 'files', maxCount: 20 }])(req, res, (err) => {
      if (err) {
        logger.error('[Multer Error] File upload failed', { error: err.message });
        return res.status(400).json({ error: 'Error uploading file' });
      }

      if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
        logger.warn('[Validation Error] No files uploaded');
        return res
          .status(400)
          .json({ error: 'No files uploaded. Please select at least one PDF or ZIP.' });
      }

      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const pdfFiles = (req.files as { [fieldname: string]: Express.Multer.File[] })['files'] || [];
      const filename = req.body.filename || 'MergedPreview.pdf';
      const pagesToRemove: number[] = JSON.parse(req.body.pagesToRemove || '[]');

      const pdfBuffers = pdfFiles.map((file) => file.buffer);

      const mergedCleanedPdf = await PDFService.mergeAndRemovePages(pdfBuffers, pagesToRemove);

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/pdf');
      res.send(mergedCleanedPdf);
    } catch (error: any) {
      logger.error('[PDF Merge-Preview Error]', { error: error.message });
      res.status(500).json({ error: 'Failed to merge and remove pages.' });
    }
  }
);


export default router;
