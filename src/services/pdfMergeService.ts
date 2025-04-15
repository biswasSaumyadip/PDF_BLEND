import { PDFDocument } from 'pdf-lib';
import logger  from '../utils/logger'; // adjust as needed

export async function mergePdfWithRemovals(
  files: Express.Multer.File[],
  pagesToRemoveMap: Record<string, number[]>
): Promise<Buffer> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const uint8ArrayPdf = new Uint8Array(file.buffer);
    const pdfDoc = await PDFDocument.load(uint8ArrayPdf);
    const totalPages = pdfDoc.getPageCount();

    const toRemove = pagesToRemoveMap[file.originalname] || [];
    const toKeep = Array.from({ length: totalPages }, (_, i) => i).filter(i => !toRemove.includes(i));

    logger.info(`[File] "${file.originalname}" → Total: ${totalPages} | Remove: [${toRemove}] | Keep: [${toKeep}]`);

    const copiedPages = await mergedPdf.copyPages(pdfDoc, toKeep);
    copiedPages.forEach((page, idx) => {
      mergedPdf.addPage(page);
      logger.debug(`[Page Added] File: ${file.originalname}, Page Index: ${idx}`);
    });
  }

  const finalBytes = await mergedPdf.save();
  logger.info(`[Merge Complete] PDF merged successfully. Size: ${finalBytes.length} bytes`);
  return Buffer.from(finalBytes);
}
