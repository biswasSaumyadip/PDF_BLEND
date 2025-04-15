import { Request, Response } from 'express';
import { mergePdfWithRemovals } from '../services/pdfMergeService';
import logger from '../utils/logger';

export const mergeWithPreview = async (req: Request, res: Response) => {
  try {
    const files = (req.files as { [fieldname: string]: Express.Multer.File[] })['files'] || [];
    const filename = req.body.filename || 'MergedPreview.pdf';
    const pagesToRemoveMap = JSON.parse(req.body.pagesToRemove || '{}');

    logger.info(`[Merge Start] ${files.length} file(s), Output: ${filename}`);

    const mergedBuffer = await mergePdfWithRemovals(files, pagesToRemoveMap);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(mergedBuffer);
  } catch (error: any) {
    logger.error('[PDF Merge Controller Error]', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to merge and remove pages.' });
  }
};
