import { PDFDocument } from 'pdf-lib';
import logger from '../utils/logger';

export async function mergePdfWithRemovals(
  files: Express.Multer.File[],
  pagesToRemoveMap: Record<string, number[]>
): Promise<Buffer> {
  const mergedPdf = await PDFDocument.create();
  
  for (const file of files) {
    try {
      const uint8ArrayPdf = new Uint8Array(file.buffer);
      const pdfDoc = await PDFDocument.load(uint8ArrayPdf);
      const totalPages = pdfDoc.getPageCount();
      
      // Get pages to remove for this file, default to empty array if none specified
      const toRemove = new Set(pagesToRemoveMap[file.originalname] || []);
      
      // Create array of pages to keep (those not in toRemove)
      const toKeep = Array.from({ length: totalPages }, (_, i) => 
        toRemove.has(i) ? null : i
      ).filter((i): i is number => i !== null);

      logger.info(`[File] "${file.originalname}" → Total: ${totalPages} | Remove: [${Array.from(toRemove)}] | Keep: [${toKeep}]`);

      const copiedPages = await mergedPdf.copyPages(pdfDoc, toKeep);
      copiedPages.forEach(page => {
        mergedPdf.addPage(page);
      });

      logger.debug(`[Pages Added] File: ${file.originalname}, Pages: ${copiedPages.length}`);
    } catch (error: any) {
      logger.error(`[PDF Process Error] Failed to process "${file.originalname}"`, {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to process "${file.originalname}": ${error.message}`);
    }
  }

  const finalBytes = await mergedPdf.save();
  logger.info(`[Merge Complete] Final PDF size: ${finalBytes.length} bytes`);
  return Buffer.from(finalBytes);
}
