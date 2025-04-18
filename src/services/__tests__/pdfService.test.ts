import { PDFDocument } from 'pdf-lib';
import { PDFService } from '../pdfService';

describe('PDFService', () => {
  it('should merge multiple PDFs into one', async () => {
    // Create two small PDFs for testing
    const pdf1 = await PDFDocument.create();
    pdf1.addPage();
    const pdfBytes1 = await pdf1.save();

    const pdf2 = await PDFDocument.create();
    pdf2.addPage();
    pdf2.addPage();
    const pdfBytes2 = await pdf2.save();

    const mergedBuffer = await PDFService.mergePDFs([
      Buffer.from(pdfBytes1),
      Buffer.from(pdfBytes2),
    ]);

    const mergedDoc = await PDFDocument.load(new Uint8Array(mergedBuffer));

    expect(mergedDoc.getPageCount()).toBe(3);
  });
});
