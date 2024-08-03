import { PDFDocument } from 'pdf-lib';
import { Request, Response } from 'express';
import AdmZip from 'adm-zip';

export class PDFService {
  static async mergePDFs(pdfs: Buffer[]): Promise<Buffer> {
    const mergedPdf = await PDFDocument.create();

    for (const pdf of pdfs) {
      // Convert Buffer to Uint8Array
      const uint8ArrayPdf = new Uint8Array(pdf);

      const pdfDoc = await PDFDocument.load(uint8ArrayPdf);
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    return Buffer.from(mergedPdfBytes);
  }

  static async mergeFromZip(zipBuffer: Buffer): Promise<Buffer> {
    const zip = new AdmZip(zipBuffer);
    const pdfBuffers: Buffer[] = [];

    zip.getEntries().forEach((entry) => {
      if (entry.entryName.endsWith('.pdf')) {
        pdfBuffers.push(entry.getData());
      }
    });

    return await this.mergePDFs(pdfBuffers);
  }
}

export const mergePDFsHandler = async (req: Request, res: Response) => {
  try {
    const filename = req.body.filename || 'merged.pdf';

    const files =
      (req.files as any)?.files ||
      (req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[]);

    if (Array.isArray(files) || Array.isArray(files?.files)) {

      const pdfFiles = files as Express.Multer.File[];

      pdfFiles.sort((a, b) => {
        const numA = parseInt(a.originalname.match(/^(\d+)/)?.[0] || '0', 10);
        const numB = parseInt(b.originalname.match(/^(\d+)/)?.[0] || '0', 10);
        return numA - numB;
      });

      const pdfBuffers = pdfFiles.map((file) => file.buffer);
      const mergedPdf = await PDFService.mergePDFs(pdfBuffers);

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/pdf');
      res.send(mergedPdf);
    } else {
 
      const zipFile = files['zip'] ? files['zip'][0].buffer : null;

      if (zipFile) {
        const mergedPdf = await PDFService.mergeFromZip(zipFile);

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(mergedPdf);
      } else if (files['pdfs']) {
        // Handle regular PDF files
        const pdfFiles = files['pdfs'] as Express.Multer.File[];
        const pdfBuffers = pdfFiles.map((file) => file.buffer);
        const mergedPdf = await PDFService.mergePDFs(pdfBuffers);

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(mergedPdf);
      } else {
        res.status(400).send('No files uploaded.');
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while merging PDFs.');
  }
};
