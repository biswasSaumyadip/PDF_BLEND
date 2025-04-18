import { Response } from 'express';
import { sendPDFResponse } from '../pdfResponse';
import { PDFDocument } from 'pdf-lib';

describe('sendPDFResponse', () => {
  let mockResponse: Partial<Response>;
  let headers: Record<string, string>;
  let sentData: Buffer | null;

  beforeEach(() => {
    headers = {};
    sentData = null;
    mockResponse = {
      setHeader: jest.fn((name: string, value: string) => {
        headers[name] = value;
        return mockResponse as Response;
      }),
      send: jest.fn((data: Buffer) => {
        sentData = data;
        return mockResponse as Response;
      })
    };
  });

  it('should set correct Content-Type header', () => {
    const filename = 'test.pdf';
    const pdfBuffer = Buffer.from('dummy pdf content');

    sendPDFResponse(mockResponse as Response, filename, pdfBuffer);

    expect(headers['Content-Type']).toBe('application/pdf');
  });

  it('should set correct Content-Disposition header with filename', () => {
    const filename = 'test.pdf';
    const pdfBuffer = Buffer.from('dummy pdf content');

    sendPDFResponse(mockResponse as Response, filename, pdfBuffer);

    expect(headers['Content-Disposition']).toBe('attachment; filename="test.pdf"');
  });

  it('should handle filenames with spaces', () => {
    const filename = 'my test file.pdf';
    const pdfBuffer = Buffer.from('dummy pdf content');

    sendPDFResponse(mockResponse as Response, filename, pdfBuffer);

    expect(headers['Content-Disposition']).toBe('attachment; filename="my test file.pdf"');
  });

  it('should send the PDF buffer in response', async () => {
    // Create a real PDF document for testing
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage();
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    sendPDFResponse(mockResponse as Response, 'test.pdf', pdfBuffer);

    expect(sentData).toBe(pdfBuffer);
    expect(mockResponse.send).toHaveBeenCalledWith(pdfBuffer);
  });

  it('should handle empty PDF buffer', () => {
    const emptyBuffer = Buffer.alloc(0);

    sendPDFResponse(mockResponse as Response, 'empty.pdf', emptyBuffer);

    expect(sentData).toBe(emptyBuffer);
    expect(mockResponse.send).toHaveBeenCalledWith(emptyBuffer);
  });

  it('should handle special characters in filename', () => {
    const filename = 'test@#$%.pdf';
    const pdfBuffer = Buffer.from('dummy pdf content');

    sendPDFResponse(mockResponse as Response, filename, pdfBuffer);

    expect(headers['Content-Disposition']).toBe('attachment; filename="test@#$%.pdf"');
  });
});