import { PDFDocument } from 'pdf-lib';
import { Request, Response } from 'express';
import AdmZip from 'adm-zip';
import logger from '../utils/logger';

export class PDFService {
  static async mergePDFs(pdfs: Buffer[]): Promise<Buffer> {
    logger.info(`[PDFService] Merging ${pdfs.length} PDFs`);

    const mergedPdf = await PDFDocument.create();

    for (const pdf of pdfs) {
      // Convert Buffer to Uint8Array
      try {
        const uint8ArrayPdf = new Uint8Array(pdf);
        const pdfDoc = await PDFDocument.load(uint8ArrayPdf);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      } catch (error) {
        logger.error(`[PDFService] Error processing a PDF file`, { error });
      }
    }

    const mergedPdfBytes = await mergedPdf.save();
    logger.info(`[PDFService] Successfully merged PDFs`);
    return Buffer.from(mergedPdfBytes);
  }

  static async mergeFromZip(zipBuffer: Buffer): Promise<Buffer> {
    logger.info(`[PDFService] Extracting PDFs from ZIP`);

    const zip = new AdmZip(zipBuffer);
    const pdfBuffers: Buffer[] = [];

    zip.getEntries().forEach((entry) => {
      if (entry.entryName.endsWith('.pdf')) {
        logger.info(`[PDFService] Found PDF in ZIP: ${entry.entryName}`);
        pdfBuffers.push(entry.getData());
      }
    });

    logger.info(`[PDFService] Extracted ${pdfBuffers.length} PDFs from ZIP`);
    return await this.mergePDFs(pdfBuffers);
  }

  static async removePages(pdfBuffer: Buffer, pagesToRemove: number[]): Promise<Buffer> {
    // Explicit conversion for compatibility
    const uint8Array = new Uint8Array(pdfBuffer);

    const pdfDoc = await PDFDocument.load(uint8Array);
    const totalPages = pdfDoc.getPageCount();

    const pagesToKeep = Array.from({ length: totalPages }, (_, i) => i).filter(
      (i) => !pagesToRemove.includes(i)
    );

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdfDoc, pagesToKeep);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    return Buffer.from(pdfBytes);
  }

  static async mergeAndRemovePages(buffers: Buffer[], pagesToRemove: number[]): Promise<Buffer> {
    const mergedPdf = await PDFDocument.create();
    let pageOffset = 0;

    for (const buffer of buffers) {
      const pdfDoc = await PDFDocument.load(new Uint8Array(buffer));
      const totalPages = pdfDoc.getPageCount();

      const keepPages = Array.from({ length: totalPages }, (_, i) => i).filter(
        (i) => !pagesToRemove.includes(i + pageOffset)
      );

      const copied = await mergedPdf.copyPages(
        pdfDoc,
        keepPages.map((i) => i)
      );
      copied.forEach((page) => mergedPdf.addPage(page));

      pageOffset += totalPages;
    }

    const finalBytes = await mergedPdf.save();
    return Buffer.from(finalBytes);
  }
}

export const mergePDFsHandler = async (req: Request, res: Response) => {
  try {
    const filename = req.body.filename || 'merged.pdf';
    logger.info(`[mergePDFsHandler] Received merge request with filename: ${filename}`);

    const files =
      (req.files as any)?.files ||
      (req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[]);

    if (Array.isArray(files) || Array.isArray(files?.files)) {
      const pdfFiles = files as Express.Multer.File[];

      logger.info(`[mergePDFsHandler] ${pdfFiles.length} PDFs uploaded`);

      pdfFiles.sort((a, b) => {
        const numA = parseInt(a.originalname.match(/^(\d+)/)?.[0] || '0', 10);
        const numB = parseInt(b.originalname.match(/^(\d+)/)?.[0] || '0', 10);
        return numA - numB;
      });

      logger.info(`[mergePDFsHandler] Sorted PDFs by filename`);

      const pdfBuffers = pdfFiles.map((file) => file.buffer);
      const mergedPdf = await PDFService.mergePDFs(pdfBuffers);

      logger.info(`[mergePDFsHandler] Successfully merged PDFs, sending response`);

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/pdf');
      res.send(mergedPdf);
    } else {
      const zipFile = files['zip'] ? files['zip'][0].buffer : null;

      if (zipFile) {
        logger.info(`[mergePDFsHandler] ZIP file detected, extracting PDFs`);
        const mergedPdf = await PDFService.mergeFromZip(zipFile);

        logger.info(`[mergePDFsHandler] Successfully merged PDFs from ZIP`);

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(mergedPdf);
      } else if (files['pdfs']) {
        // Handle regular PDF files
        const pdfFiles = files['pdfs'] as Express.Multer.File[];
        logger.info(`[mergePDFsHandler] ${pdfFiles.length} PDFs detected in 'pdfs' field`);

        const pdfBuffers = pdfFiles.map((file) => file.buffer);
        const mergedPdf = await PDFService.mergePDFs(pdfBuffers);

        logger.info(`[mergePDFsHandler] Successfully merged PDFs, sending response`);

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(mergedPdf);
      } else {
        logger.warn(`[mergePDFsHandler] No valid files uploaded`);
        res.status(400).send('No files uploaded.');
      }
    }
  } catch (error) {
    console.error(error);
    logger.error(`[mergePDFsHandler] An error occurred while merging PDFs`, { error });
    res.status(500).send('An error occurred while merging PDFs.');
  }
};
