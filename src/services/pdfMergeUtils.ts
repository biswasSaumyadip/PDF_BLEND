import { PDFDocument } from 'pdf-lib';

type RemovalMap = Record<number, number[]>;

/**
 * Merge one or more PDFs, optionally removing specified pages.
 *
 * @param buffers   Array of PDF file buffers in order.
 * @param removals  Map of PDF index → pages to drop (0‑based indices).
 * @returns         A single merged PDF as Uint8Array.
 */
export async function mergePdfs(buffers: Buffer[], removals: RemovalMap = {}): Promise<Uint8Array> {
  const outDoc = await PDFDocument.create();

  for (let i = 0; i < buffers.length; i++) {
    // Convert Node Buffer → Uint8Array
    const uint8Buf = new Uint8Array(buffers[i]);
    const inDoc = await PDFDocument.load(uint8Buf);

    const totalPages = inDoc.getPageCount();
    const toRemove = new Set(removals[i] || []);
    const keepPages = Array.from({ length: totalPages }, (_, idx) =>
      toRemove.has(idx) ? null : idx
    ).filter((n): n is number => n !== null);

    const copied = await outDoc.copyPages(inDoc, keepPages);
    copied.forEach((page) => outDoc.addPage(page));
  }

  return outDoc.save();
}
