import { Request, Response } from 'express';
import { PDFDocument } from 'pdf-lib';
import { PDFService } from '../../services/pdfService';
import { mergePDFsHandler } from '../mergeController';
import logger from '../../utils/logger';
import AdmZip from 'adm-zip';

// Mock the PDFService and logger
jest.mock('../../services/pdfService');
jest.mock('../../utils/logger');

describe('mergePDFsHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseData: any;
  let statusCode: number;
  let headers: Record<string, string>;
  let originalConsoleError: typeof console.error;

  beforeEach(async () => {
    // Save original console.error
    originalConsoleError = console.error;
    // Mock console.error
    console.error = jest.fn();
    
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
      send: jest.fn((data: any) => {
        responseData = data;
        return mockResponse as Response;
      }),
      setHeader: jest.fn((name: string, value: string) => {
        headers[name] = value;
        return mockResponse as Response;
      })
    };

    // Mock request object with default values
    mockRequest = {
      body: { filename: 'test.pdf' },
      files: {}
    };

    // Mock PDFService methods
    (PDFService.mergePDFs as jest.Mock).mockResolvedValue(Buffer.from(pdfBytes));
    (PDFService.mergeFromZip as jest.Mock).mockResolvedValue(Buffer.from(pdfBytes));
  });

  afterEach(() => {
    // Restore original console.error
    console.error = originalConsoleError;
  });

  it('should merge multiple PDF files in array format', async () => {
    const files = [
      { originalname: '1.pdf', buffer: Buffer.from('pdf1') },
      { originalname: '2.pdf', buffer: Buffer.from('pdf2') }
    ] as Express.Multer.File[];

    mockRequest.files = files;

    await mergePDFsHandler(mockRequest as Request, mockResponse as Response);

    expect(PDFService.mergePDFs).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(Buffer), expect.any(Buffer)])
    );
    expect(headers['Content-Type']).toBe('application/pdf');
    expect(headers['Content-Disposition']).toBe('attachment; filename="test.pdf"');
  });

  it('should sort PDF files by numeric prefix in filename', async () => {
    const files = [
      { originalname: '2.pdf', buffer: Buffer.from('pdf2') },
      { originalname: '1.pdf', buffer: Buffer.from('pdf1') },
      { originalname: '10.pdf', buffer: Buffer.from('pdf10') }
    ] as Express.Multer.File[];

    mockRequest.files = files;

    await mergePDFsHandler(mockRequest as Request, mockResponse as Response);

    const sortedBuffers = [
      Buffer.from('pdf1'),
      Buffer.from('pdf2'),
      Buffer.from('pdf10')
    ];

    expect(PDFService.mergePDFs).toHaveBeenCalledWith(
      expect.arrayContaining(sortedBuffers)
    );
  });

  it('should handle ZIP file upload', async () => {
    const zipBuffer = new AdmZip().toBuffer();
    mockRequest.files = {
      zip: [{
        fieldname: 'zip',
        originalname: 'test.zip',
        encoding: '7bit',
        mimetype: 'application/zip',
        buffer: zipBuffer,
        size: zipBuffer.length,
        stream: null as any, // Mock stream
        destination: '',
        filename: 'test.zip',
        path: ''
      }] as Express.Multer.File[]
    };

    await mergePDFsHandler(mockRequest as Request, mockResponse as Response);

    expect(PDFService.mergeFromZip).toHaveBeenCalledWith(zipBuffer);
    expect(headers['Content-Type']).toBe('application/pdf');
  });

  it('should handle PDFs in pdfs field', async () => {
    mockRequest.files = {
      pdfs: [
        { buffer: Buffer.from('pdf1') },
        { buffer: Buffer.from('pdf2') }
      ] as Express.Multer.File[]
    };

    await mergePDFsHandler(mockRequest as Request, mockResponse as Response);

    expect(PDFService.mergePDFs).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(Buffer), expect.any(Buffer)])
    );
  });

  it('should use default filename if not provided', async () => {
    mockRequest.body = {};
    mockRequest.files = [{ buffer: Buffer.from('pdf1') }] as Express.Multer.File[];

    await mergePDFsHandler(mockRequest as Request, mockResponse as Response);

    expect(headers['Content-Disposition']).toBe('attachment; filename="merged.pdf"');
  });

  it('should handle no files uploaded', async () => {
    mockRequest.files = {};

    await mergePDFsHandler(mockRequest as Request, mockResponse as Response);

    expect(statusCode).toBe(400);
    expect(responseData).toBe('No files uploaded.');
  });

  it('should handle error during PDF merge', async () => {
    const error = new Error('Merge failed');
    (PDFService.mergePDFs as jest.Mock).mockRejectedValue(error);
    mockRequest.files = [{ buffer: Buffer.from('pdf1') }] as Express.Multer.File[];

    await mergePDFsHandler(mockRequest as Request, mockResponse as Response);

    expect(statusCode).toBe(500);
    expect(responseData).toBe('An error occurred while merging PDFs.');
    expect(logger.error).toHaveBeenCalledWith(
      '[mergePDFsHandler] An error occurred while merging PDFs',
      expect.objectContaining({ error })
    );
    expect(console.error).toHaveBeenCalledWith(error);
  });

  it('should handle files with no numeric prefix', async () => {
    const files = [
      { originalname: 'b.pdf', buffer: Buffer.from('pdf2') },
      { originalname: 'a.pdf', buffer: Buffer.from('pdf1') }
    ] as Express.Multer.File[];

    mockRequest.files = files;

    await mergePDFsHandler(mockRequest as Request, mockResponse as Response);

    const sortedBuffers = [
      Buffer.from('pdf1'),
      Buffer.from('pdf2')
    ];

    expect(PDFService.mergePDFs).toHaveBeenCalledWith(
      expect.arrayContaining(sortedBuffers)
    );
  });
});