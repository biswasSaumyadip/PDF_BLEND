import { PDFDocument } from 'pdf-lib';
import { mergePdfs } from '../pdfMergeUtils';

describe('mergePdfs', () => {
  it('should merge multiple PDFs into one', async () => {
    // Create first PDF with 2 pages
    const pdf1 = await PDFDocument.create();
    pdf1.addPage();
    pdf1.addPage();
    const pdf1Bytes = await pdf1.save();

    // Create second PDF with 1 page
    const pdf2 = await PDFDocument.create();
    pdf2.addPage();
    const pdf2Bytes = await pdf2.save();

    const result = await mergePdfs([Buffer.from(pdf1Bytes), Buffer.from(pdf2Bytes)]);
    const resultDoc = await PDFDocument.load(result);

    expect(resultDoc.getPageCount()).toBe(3);
  });

  it('should handle empty buffers array', async () => {
    const result = await mergePdfs([]);
    const resultDoc = await PDFDocument.load(result);

    expect(resultDoc.getPageCount()).toBe(0);
  });

  it('should handle page removals correctly', async () => {
    // Create PDF with 3 pages
    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.addPage();
    pdf.addPage();
    const pdfBytes = await pdf.save();

    const removals = {
      0: [1], // Remove second page (index 1) from first PDF
    };

    const result = await mergePdfs([Buffer.from(pdfBytes)], removals);
    const resultDoc = await PDFDocument.load(result);

    expect(resultDoc.getPageCount()).toBe(2);
  });

  it('should handle removing all pages', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.addPage();
    const pdfBytes = await pdf.save();

    const removals = {
      0: [0, 1], // Remove all pages
    };

    const result = await mergePdfs([Buffer.from(pdfBytes)], removals);
    const resultDoc = await PDFDocument.load(result);

    expect(resultDoc.getPageCount()).toBe(0);
  });

  it('should handle invalid page indices for removal', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const pdfBytes = await pdf.save();

    const removals = {
      0: [99], // Invalid page index
    };

    const result = await mergePdfs([Buffer.from(pdfBytes)], removals);
    const resultDoc = await PDFDocument.load(result);

    // Should keep the page since invalid index was specified
    expect(resultDoc.getPageCount()).toBe(1);
  });

  it('should handle corrupted PDF', async () => {
    const invalidPdfBuffer = Buffer.from('corrupted content');
    const validPdf = await PDFDocument.create();
    validPdf.addPage();
    const validPdfBytes = await validPdf.save();

    await expect(mergePdfs([invalidPdfBuffer, Buffer.from(validPdfBytes)])).rejects.toThrow();
  });

  it('should handle removals for multiple PDFs', async () => {
    // Create first PDF with 2 pages
    const pdf1 = await PDFDocument.create();
    pdf1.addPage();
    pdf1.addPage();
    const pdf1Bytes = await pdf1.save();

    // Create second PDF with 2 pages
    const pdf2 = await PDFDocument.create();
    pdf2.addPage();
    pdf2.addPage();
    const pdf2Bytes = await pdf2.save();

    const removals = {
      0: [1], // Remove second page from first PDF
      1: [0], // Remove first page from second PDF
    };

    const result = await mergePdfs([Buffer.from(pdf1Bytes), Buffer.from(pdf2Bytes)], removals);
    const resultDoc = await PDFDocument.load(result);

    expect(resultDoc.getPageCount()).toBe(2);
  });
});
