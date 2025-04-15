import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import logger from '../utils/logger';

const upload = multer();

export const validateMergeUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.fields([{ name: 'files' }])(req, res, (err) => {
    if (err) {
      logger.error('[Multer Error] File upload failed', { error: err.message });
      return res.status(400).json({ error: 'Error uploading file' });
    }

    const files = (req.files as { [fieldname: string]: Express.Multer.File[] })?.['files'] || [];
    if (files.length === 0) {
      logger.warn('[Validation Error] No files uploaded');
      return res.status(400).json({ error: 'No files uploaded. Please select at least one PDF or ZIP.' });
    }

    logger.info(`[Upload Success] ${files.length} file(s) received`);
    next();
  });
};
