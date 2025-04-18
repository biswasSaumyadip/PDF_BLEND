import { PDFDocument } from 'pdf-lib';
import { mergePdfWithRemovals } from '../pdfMergeService';

describe('mergePdfWithRemovals', () => {
  it('should merge PDFs and remove specified pages', async () => {
    // Create first PDF with 2 pages
    const pdf1 = await PDFDocument.create();
    pdf1.addPage();
    pdf1.addPage();
    const pdf1Bytes = await pdf1.save();

    // Create second PDF with 1 page
    const pdf2 = await PDFDocument.create();
    pdf2.addPage();
    const pdf2Bytes = await pdf2.save();

    // Create test files array
    const files = [
      {
        originalname: 'test1.pdf',
        buffer: Buffer.from(pdf1Bytes),
      },
      {
        originalname: 'test2.pdf',
        buffer: Buffer.from(pdf2Bytes),
      },
    ] as Express.Multer.File[];

    // Remove page 1 (second page) from first PDF
    const pagesToRemoveMap = {
      'test1.pdf': [1],
    };

    const result = await mergePdfWithRemovals(files, pagesToRemoveMap);
    const resultDoc = await PDFDocument.load(new Uint8Array(result));

    // Should have 2 pages total (1 from first PDF, 1 from second PDF)
    expect(resultDoc.getPageCount()).toBe(2);
  });

  it('should handle empty files array', async () => {
    const files: Express.Multer.File[] = [];
    const pagesToRemoveMap = {};

    const result = await mergePdfWithRemovals(files, pagesToRemoveMap);
    const resultDoc = await PDFDocument.load(new Uint8Array(result));

    // An empty PDF document should still be valid and loadable
    expect(resultDoc).toBeTruthy();
    expect(resultDoc.getPageCount()).toBe(0);
  });

  it('should handle empty pagesToRemoveMap', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.addPage();
    const pdfBytes = await pdf.save();

    const files = [
      {
        originalname: 'test.pdf',
        buffer: Buffer.from(pdfBytes),
      },
    ] as Express.Multer.File[];

    const pagesToRemoveMap = {};

    const result = await mergePdfWithRemovals(files, pagesToRemoveMap);
    const resultDoc = await PDFDocument.load(new Uint8Array(result));

    // Should keep all pages when no pages are specified for removal
    expect(resultDoc.getPageCount()).toBe(2);
  });

  it('should handle removing all pages from a PDF', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.addPage();
    const pdfBytes = await pdf.save();

    const files = [
      {
        originalname: 'test.pdf',
        buffer: Buffer.from(pdfBytes),
      },
    ] as Express.Multer.File[];

    const pagesToRemoveMap = {
      'test.pdf': [0, 1], // Remove both pages
    };

    const result = await mergePdfWithRemovals(files, pagesToRemoveMap);
    const resultDoc = await PDFDocument.load(new Uint8Array(result));

    // When all pages are removed, we should still get a valid PDF with 0 pages
    expect(resultDoc).toBeTruthy();
    expect(resultDoc.getPageCount()).toBe(0);
  });

  it('should handle invalid page indices', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const pdfBytes = await pdf.save();

    const files = [
      {
        originalname: 'test.pdf',
        buffer: Buffer.from(pdfBytes),
      },
    ] as Express.Multer.File[];

    const pagesToRemoveMap = {
      'test.pdf': [99], // Invalid page index
    };

    const result = await mergePdfWithRemovals(files, pagesToRemoveMap);
    const resultDoc = await PDFDocument.load(new Uint8Array(result));

    // Should keep the page since invalid index was specified
    expect(resultDoc.getPageCount()).toBe(1);
  });

  it('should handle corrupted PDF', async () => {
    const files = [
      {
        originalname: 'corrupted.pdf',
        buffer: Buffer.from('corrupted content'),
      },
    ] as Express.Multer.File[];

    const pagesToRemoveMap = {
      'corrupted.pdf': [0],
    };

    await expect(mergePdfWithRemovals(files, pagesToRemoveMap)).rejects.toThrow();
  });
});
