import { Request, Response } from 'express';
import { mergePdfWithRemovals } from '../services/pdfMergeService';
import logger from '../utils/logger';
import { PDFService } from '../services/pdfService';

export const mergeWithPreview = async (req: Request, res: Response) => {
  try {
    const files = (req.files as { [fieldname: string]: Express.Multer.File[] })['files'] || [];
    const filename = req.body.filename || 'MergedPreview.pdf';
    let pagesToRemoveMap = {};

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
      const numA = parseInt(a.originalname.match(/^(\d+)/)?.[0] || '0', 10);
      const numB = parseInt(b.originalname.match(/^(\d+)/)?.[0] || '0', 10);
      return numA - numB;
    });

    const mergedBuffer = await mergePdfWithRemovals(files, pagesToRemoveMap);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(mergedBuffer);

    logger.info('[Merge Complete] Successfully merged PDFs with preview');
  } catch (error: any) {
    logger.error('[PDF Merge Controller Error]', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to merge and remove pages.' });
  }
};

export async function fixLinksHandler(req: Request, res: Response) {
  try {
    const file = (req.file as Express.Multer.File).buffer;
    const linksToFix = JSON.parse(req.body.linksToFix);
    const filename = req.body.filename || 'fixed.pdf';

    logger.info('[fixLinksHandler] Fixing links', { pages: Object.keys(linksToFix) });

    const updatedPdf = await PDFService.fixInternalLinks(file, linksToFix);

    res
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .type('application/pdf')
      .send(updatedPdf);
  } catch (err: any) {
    logger.error('[fixLinksHandler] Failed', { error: err.message });
    res.status(500).send('Error fixing links');
  }
}
