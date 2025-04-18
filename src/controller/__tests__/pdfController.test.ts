import { Request, Response } from 'express';
import { PDFDocument } from 'pdf-lib';
import { mergePdfWithRemovals } from '../../services/pdfMergeService';
import { PDFService } from '../../services/pdfService';
import logger from '../../utils/logger';
import { fixLinksHandler, mergeWithPreview } from '../pdfController';

// Mock dependencies
jest.mock('../../services/pdfMergeService');
jest.mock('../../services/pdfService');
jest.mock('../../utils/logger');

describe('pdfController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseData: any;
  let statusCode: number;
  let headers: Record<string, string>;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Create sample PDF for tests
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage();
    const pdfBytes = await pdfDoc.save();

    headers = {};
    responseData = null;
    statusCode = 200;

    // Mock response object
    mockResponse = {
      status: jest.fn((code: number) => {
        statusCode = code;
        return mockResponse as Response;
      }),
      json: jest.fn((data: any) => {
        responseData = data;
        return mockResponse as Response;
      }),
      send: jest.fn((data: any) => {
        responseData = data;
        return mockResponse as Response;
      }),
      setHeader: jest.fn((name: string, value: string) => {
        headers[name] = value;
        return mockResponse as Response;
      }),
    };

    // Mock request object with default values
    mockRequest = {
      body: {},
      files: {},
      file: undefined,
    };

    // Mock service methods
    (mergePdfWithRemovals as jest.Mock).mockResolvedValue(Buffer.from(pdfBytes));
    (PDFService.fixInternalLinks as jest.Mock).mockResolvedValue(Buffer.from(pdfBytes));
  });

  describe('mergeWithPreview', () => {
    it('should merge PDFs with preview and set correct headers', async () => {
      const files = [
        { originalname: '1.pdf', buffer: Buffer.from('pdf1') },
        { originalname: '2.pdf', buffer: Buffer.from('pdf2') },
      ] as Express.Multer.File[];

      mockRequest.files = { files };
      mockRequest.body = { filename: 'test.pdf' };

      await mergeWithPreview(mockRequest as Request, mockResponse as Response);

      expect(mergePdfWithRemovals).toHaveBeenCalledWith(files, {});
      expect(headers['Content-Type']).toBe('application/pdf');
      expect(headers['Content-Disposition']).toBe('attachment; filename="test.pdf"');
    });

    it('should use default filename if not provided', async () => {
      mockRequest.files = {
        files: [{ buffer: Buffer.from('pdf1') }] as Express.Multer.File[],
      };

      await mergeWithPreview(mockRequest as Request, mockResponse as Response);

      expect(headers['Content-Disposition']).toBe('attachment; filename="MergedPreview.pdf"');
    });

    it('should handle empty files array', async () => {
      mockRequest.files = { files: [] };

      await mergeWithPreview(mockRequest as Request, mockResponse as Response);

      expect(mergePdfWithRemovals).toHaveBeenCalledWith([], {});
    });

    it('should sort files by numeric prefix', async () => {
      const files = [
        { originalname: '2.pdf', buffer: Buffer.from('pdf2') },
        { originalname: '1.pdf', buffer: Buffer.from('pdf1') },
        { originalname: '10.pdf', buffer: Buffer.from('pdf10') },
      ] as Express.Multer.File[];

      mockRequest.files = { files };

      await mergeWithPreview(mockRequest as Request, mockResponse as Response);

      const sortedFiles = [
        { originalname: '1.pdf', buffer: Buffer.from('pdf1') },
        { originalname: '2.pdf', buffer: Buffer.from('pdf2') },
        { originalname: '10.pdf', buffer: Buffer.from('pdf10') },
      ];

      expect(mergePdfWithRemovals).toHaveBeenCalledWith(
        expect.arrayContaining(sortedFiles),
        expect.any(Object)
      );
    });

    it('should handle invalid pagesToRemove JSON', async () => {
      mockRequest.files = { files: [] };
      mockRequest.body = { pagesToRemove: 'invalid json' };

      await mergeWithPreview(mockRequest as Request, mockResponse as Response);

      expect(statusCode).toBe(400);
      expect(responseData).toEqual({ error: 'Invalid page removal format' });
    });

    it('should handle merge errors', async () => {
      (mergePdfWithRemovals as jest.Mock).mockRejectedValue(new Error('Merge failed'));
      mockRequest.files = { files: [{ buffer: Buffer.from('pdf1') }] as Express.Multer.File[] };

      await mergeWithPreview(mockRequest as Request, mockResponse as Response);

      expect(statusCode).toBe(500);
      expect(responseData).toEqual({ error: 'Failed to merge and remove pages.' });
    });
  });

  describe('fixLinksHandler', () => {
    it('should fix links and set correct headers', async () => {
      const file = { buffer: Buffer.from('pdf content') };
      const linksToFix = { '0': [{ oldTarget: 0, newTarget: 1 }] };

      mockRequest.file = file as Express.Multer.File;
      mockRequest.body = {
        linksToFix: JSON.stringify(linksToFix),
        filename: 'fixed.pdf',
      };

      await fixLinksHandler(mockRequest as Request, mockResponse as Response);

      expect(PDFService.fixInternalLinks).toHaveBeenCalledWith(file.buffer, linksToFix);
      expect(headers['Content-Type']).toBe('application/pdf');
      expect(headers['Content-Disposition']).toBe('attachment; filename="fixed.pdf"');
    });

    it('should use default filename if not provided', async () => {
      const file = { buffer: Buffer.from('pdf content') };
      const linksToFix = { '0': [{ oldTarget: 0, newTarget: 1 }] };

      mockRequest.file = file as Express.Multer.File;
      mockRequest.body = {
        linksToFix: JSON.stringify(linksToFix),
      };

      await fixLinksHandler(mockRequest as Request, mockResponse as Response);

      expect(headers['Content-Disposition']).toBe('attachment; filename="fixed.pdf"');
    });

    it('should handle fixing links errors', async () => {
      const error = new Error('Fix links failed');
      (PDFService.fixInternalLinks as jest.Mock).mockRejectedValue(error);

      mockRequest.file = { buffer: Buffer.from('pdf content') } as Express.Multer.File;
      mockRequest.body = {
        linksToFix: JSON.stringify({ '0': [{ oldTarget: 0, newTarget: 1 }] }),
      };

      await fixLinksHandler(mockRequest as Request, mockResponse as Response);

      expect(statusCode).toBe(500);
      expect(responseData).toBe('Error fixing links');
      expect(logger.error).toHaveBeenCalledWith(
        '[fixLinksHandler] Failed',
        expect.objectContaining({ error: error.message })
      );
    });
  });
});
