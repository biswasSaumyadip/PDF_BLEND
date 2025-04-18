import { Response } from 'express';

export function sendPDFResponse(res: Response, filename: string, pdfBuffer: Buffer) {
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/pdf');
  res.send(pdfBuffer);
}
