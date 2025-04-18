import { PDFDocument } from 'pdf-lib';
import { PDFService } from '../pdfService';
import AdmZip from 'adm-zip';

describe('PDFService', () => {
  describe('mergePDFs', () => {
    it('should merge multiple PDFs into one', async () => {
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

    it('should handle empty array when merging PDFs', async () => {
      const mergedBuffer = await PDFService.mergePDFs([]);
      const mergedDoc = await PDFDocument.load(new Uint8Array(mergedBuffer));
      expect(mergedDoc.getPageCount()).toBe(0);
    });

    it('should handle invalid PDF in merge', async () => {
      const invalidPdfBuffer = Buffer.from('not a pdf');
      const validPdf = await PDFDocument.create();
      validPdf.addPage();
      const validPdfBytes = await validPdf.save();

      const mergedBuffer = await PDFService.mergePDFs([
        invalidPdfBuffer,
        Buffer.from(validPdfBytes),
      ]);

      const mergedDoc = await PDFDocument.load(new Uint8Array(mergedBuffer));
      expect(mergedDoc.getPageCount()).toBe(1);
    });

    it('should merge multiple PDFs with different page counts', async () => {
      const pdf1 = await PDFDocument.create();
      pdf1.addPage();
      pdf1.addPage();
      const pdfBytes1 = await pdf1.save();

      const pdf2 = await PDFDocument.create();
      pdf2.addPage();
      const pdfBytes2 = await pdf2.save();

      const mergedBuffer = await PDFService.mergePDFs([
        Buffer.from(pdfBytes1),
        Buffer.from(pdfBytes2),
      ]);

      const mergedDoc = await PDFDocument.load(new Uint8Array(mergedBuffer));
      expect(mergedDoc.getPageCount()).toBe(3);
    });

    it('should handle empty PDFs', async () => {
      const emptyPdf = await PDFDocument.create();
      const emptyPdfBytes = await emptyPdf.save({ addDefaultPage: false });

      const mergedBuffer = await PDFService.mergePDFs([Buffer.from(emptyPdfBytes)]);
      const mergedDoc = await PDFDocument.load(new Uint8Array(mergedBuffer));
      expect(mergedDoc.getPageCount()).toBe(0);
    });

    it('should handle mixed valid and invalid PDFs', async () => {
      const validPdf = await PDFDocument.create();
      validPdf.addPage();
      const validPdfBytes = await validPdf.save();

      const invalidPdfBuffer = Buffer.from('invalid pdf content');

      const mergedBuffer = await PDFService.mergePDFs([
        Buffer.from(validPdfBytes),
        invalidPdfBuffer,
        Buffer.from(validPdfBytes)
      ]);

      const mergedDoc = await PDFDocument.load(new Uint8Array(mergedBuffer));
      expect(mergedDoc.getPageCount()).toBe(2);
    });
  });

  describe('mergeFromZip', () => {
    it('should extract and merge PDFs from zip', async () => {
      const zip = new AdmZip();
      
      const pdf1 = await PDFDocument.create();
      pdf1.addPage();
      const pdf1Bytes = await pdf1.save();
      
      const pdf2 = await PDFDocument.create();
      pdf2.addPage();
      pdf2.addPage();
      const pdf2Bytes = await pdf2.save();

      zip.addFile('1.pdf', Buffer.from(pdf1Bytes));
      zip.addFile('2.pdf', Buffer.from(pdf2Bytes));
      
      const zipBuffer = zip.toBuffer();
      const result = await PDFService.mergeFromZip(zipBuffer);
      
      const mergedDoc = await PDFDocument.load(new Uint8Array(result));
      expect(mergedDoc.getPageCount()).toBe(3);
    });

    it('should handle zip with no PDFs', async () => {
      const zip = new AdmZip();
      zip.addFile('test.txt', Buffer.from('not a pdf'));
      
      const result = await PDFService.mergeFromZip(zip.toBuffer());
      const mergedDoc = await PDFDocument.load(new Uint8Array(result));
      expect(mergedDoc.getPageCount()).toBe(0);
    });

    it('should handle corrupted zip file', async () => {
      const corruptedZipBuffer = Buffer.from('corrupted zip content');
      
      await expect(PDFService.mergeFromZip(corruptedZipBuffer))
        .rejects.toThrow();
    });

    it('should handle zip with mixed valid and invalid PDFs', async () => {
      const zip = new AdmZip();
      
      const validPdf = await PDFDocument.create();
      validPdf.addPage();
      const validPdfBytes = await validPdf.save();

      zip.addFile('valid.pdf', Buffer.from(validPdfBytes));
      zip.addFile('invalid.pdf', Buffer.from('invalid content'));
      zip.addFile('text.txt', Buffer.from('text content'));

      const result = await PDFService.mergeFromZip(zip.toBuffer());
      const mergedDoc = await PDFDocument.load(new Uint8Array(result));
      expect(mergedDoc.getPageCount()).toBe(1);
    });
  });

  describe('removePages', () => {
    it('should remove specified pages', async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      pdf.addPage();
      pdf.addPage();
      const pdfBytes = await pdf.save();

      const result = await PDFService.removePages(Buffer.from(pdfBytes), [1]);
      const modifiedDoc = await PDFDocument.load(new Uint8Array(result));
      
      expect(modifiedDoc.getPageCount()).toBe(2);
    });

    it('should handle removing non-existent pages', async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      const pdfBytes = await pdf.save();

      const result = await PDFService.removePages(Buffer.from(pdfBytes), [5]);
      const modifiedDoc = await PDFDocument.load(new Uint8Array(result));
      
      expect(modifiedDoc.getPageCount()).toBe(1);
    });

    it('should handle removing all pages', async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      pdf.addPage();
      const pdfBytes = await pdf.save();

      const result = await PDFService.removePages(Buffer.from(pdfBytes), [0, 1]);
      const modifiedDoc = await PDFDocument.load(new Uint8Array(result));
      expect(modifiedDoc.getPageCount()).toBe(0);
    });

    it('should handle negative page indices', async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      const pdfBytes = await pdf.save();

      const result = await PDFService.removePages(Buffer.from(pdfBytes), [-1]);
      const modifiedDoc = await PDFDocument.load(new Uint8Array(result));
      expect(modifiedDoc.getPageCount()).toBe(1);
    });

    it('should handle duplicate page indices', async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      pdf.addPage();
      const pdfBytes = await pdf.save();

      const result = await PDFService.removePages(Buffer.from(pdfBytes), [1, 1, 1]);
      const modifiedDoc = await PDFDocument.load(new Uint8Array(result));
      expect(modifiedDoc.getPageCount()).toBe(1);
    });
  });

  describe('mergeAndRemovePages', () => {
    it('should merge PDFs and remove specified pages', async () => {
      const pdf1 = await PDFDocument.create();
      pdf1.addPage();
      pdf1.addPage();
      const pdf1Bytes = await pdf1.save();

      const pdf2 = await PDFDocument.create();
      pdf2.addPage();
      const pdf2Bytes = await pdf2.save();

      const result = await PDFService.mergeAndRemovePages(
        [Buffer.from(pdf1Bytes), Buffer.from(pdf2Bytes)],
        [1]
      );
      
      const modifiedDoc = await PDFDocument.load(new Uint8Array(result));
      expect(modifiedDoc.getPageCount()).toBe(2);
    });

    it('should handle empty buffers array', async () => {
      const result = await PDFService.mergeAndRemovePages([], [1]);
      const modifiedDoc = await PDFDocument.load(new Uint8Array(result));
      expect(modifiedDoc.getPageCount()).toBe(0);
    });
  });

  describe('fixInternalLinks', () => {
    it('should update internal links', async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      pdf.addPage();
      const pdfBytes = await pdf.save();

      const linksToFix = {
        '0': [{ oldTarget: 1, newTarget: 0 }]
      };

      const result = await PDFService.fixInternalLinks(
        Buffer.from(pdfBytes),
        linksToFix
      );
      
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle invalid page indices', async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      const pdfBytes = await pdf.save();

      const linksToFix = {
        '99': [{ oldTarget: 1, newTarget: 0 }]
      };

      const result = await PDFService.fixInternalLinks(
        Buffer.from(pdfBytes),
        linksToFix
      );
      
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle empty link map', async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      const pdfBytes = await pdf.save();

      const result = await PDFService.fixInternalLinks(Buffer.from(pdfBytes), {});
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle invalid target pages', async () => {
      const pdf = await PDFDocument.create();
      pdf.addPage();
      const pdfBytes = await pdf.save();

      const linksToFix = {
        '0': [{ oldTarget: -1, newTarget: 999 }]
      };

      const result = await PDFService.fixInternalLinks(Buffer.from(pdfBytes), linksToFix);
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle corrupted PDF', async () => {
      const corruptedPdf = Buffer.from('corrupted pdf content');
      const linksToFix = {
        '0': [{ oldTarget: 0, newTarget: 1 }]
      };

      await expect(PDFService.fixInternalLinks(corruptedPdf, linksToFix))
        .rejects.toThrow();
    });
  });
});
