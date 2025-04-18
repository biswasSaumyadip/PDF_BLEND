import { Request, Response } from "express";
import logger from "../utils/logger";
import { PDFService } from "../services/pdfService";
import { sendPDFResponse } from "../utils/pdfResponse";

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
        const aMatch = a.originalname.match(/^(\d+)/);
        const bMatch = b.originalname.match(/^(\d+)/);

        if (aMatch && bMatch) {
          return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
        }
        return a.originalname.localeCompare(b.originalname);
      });

      logger.info(`[mergePDFsHandler] Sorted PDFs by filename`);

      const pdfBuffers = pdfFiles.map((file) => file.buffer);
      const mergedPdf = await PDFService.mergePDFs(pdfBuffers);

      logger.info(`[mergePDFsHandler] Successfully merged PDFs, sending response`);

      sendPDFResponse(res, filename, mergedPdf);
    } else {
      const zipFile = files['zip'] ? files['zip'][0].buffer : null;

      if (zipFile) {
        logger.info(`[mergePDFsHandler] ZIP file detected, extracting PDFs`);
        const mergedPdf = await PDFService.mergeFromZip(zipFile);

        logger.info(`[mergePDFsHandler] Successfully merged PDFs from ZIP`);

        sendPDFResponse(res, filename, mergedPdf);
      } else if (files['pdfs']) {
        // Handle regular PDF files
        const pdfFiles = files['pdfs'] as Express.Multer.File[];
        logger.info(`[mergePDFsHandler] ${pdfFiles.length} PDFs detected in 'pdfs' field`);

        const pdfBuffers = pdfFiles.map((file) => file.buffer);
        const mergedPdf = await PDFService.mergePDFs(pdfBuffers);

        logger.info(`[mergePDFsHandler] Successfully merged PDFs, sending response`);

        sendPDFResponse(res, filename, mergedPdf);
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
