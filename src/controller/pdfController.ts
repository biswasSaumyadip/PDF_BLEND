import { Request, Response } from 'express';
import { mergePdfWithRemovals } from '../services/pdfMergeService';
import logger from '../utils/logger';
import { PDFService } from '../services/pdfService';
import { sendPDFResponse } from '../utils/pdfResponse';
import { LinkPageMap } from '../types/types';

export const mergeWithPreview = async (req: Request, res: Response) => {
  try {
    const files = (req.files as { [fieldname: string]: Express.Multer.File[] })['files'] || [];
    const filename = req.body.filename || 'MergedPreview.pdf';
    let pagesToRemoveMap: { [filename: string]: number[] } = {};

    try {
      pagesToRemoveMap = JSON.parse(req.body.pagesToRemove || '{}');
    } catch (error) {
      logger.error('[Parse Error] Invalid pagesToRemove format', { error });
      return res.status(400).json({ error: 'Invalid page removal format' });
    }

    logger.info(`[Merge Start] Processing ${files.length} file(s), Output: ${filename}`);
    logger.debug('[Page Removals]', pagesToRemoveMap);

    // Sort files by original filename if they start with numbers
    files.sort((a, b) => {
      const aMatch = a.originalname.match(/^(\d+)/);
      const bMatch = b.originalname.match(/^(\d+)/);

      if (aMatch && bMatch) {
        return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
      }
      return a.originalname.localeCompare(b.originalname);
    });

    const mergedBuffer = await mergePdfWithRemovals(files, pagesToRemoveMap);

    sendPDFResponse(res, filename, mergedBuffer);

    logger.info('[Merge Complete] Successfully merged PDFs with preview');
  } catch (error: any) {
    logger.error('[PDF Merge Controller Error]', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to merge and remove pages.' });
  }
};

export async function fixLinksHandler(req: Request, res: Response) {
  try {
    const file = (req.file as Express.Multer.File).buffer;
    const linksToFix: LinkPageMap = JSON.parse(req.body.linksToFix);
    const filename = req.body.filename || 'fixed.pdf';

    logger.info('[fixLinksHandler] Fixing links', { pages: Object.keys(linksToFix) });

    const updatedPdf = await PDFService.fixInternalLinks(file, linksToFix);

    sendPDFResponse(res, filename, updatedPdf);
  } catch (err: any) {
    logger.error('[fixLinksHandler] Failed', { error: err.message });
    res.status(500).send('Error fixing links');
  }
}
