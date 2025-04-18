import AdmZip from 'adm-zip';
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFObject,
  PDFPage,
  PDFRef,
  PDFString,
} from 'pdf-lib';
import { LinkPageMap } from '../types/types';
import logger from '../utils/logger';

export class PDFService {
  static async mergePDFs(pdfs: Buffer[]): Promise<Buffer> {
    logger.info(`[PDFService] Merging ${pdfs.length} PDFs`);

    const mergedPdf = await PDFDocument.create();
    let totalPages = 0;

    // If no PDFs provided, return empty document
    if (pdfs.length === 0) {
      const emptyBytes = await mergedPdf.save({ addDefaultPage: false });
      return Buffer.from(emptyBytes);
    }

    for (const pdf of pdfs) {
      try {
        const uint8ArrayPdf = new Uint8Array(pdf);
        const pdfDoc = await PDFDocument.load(uint8ArrayPdf);
        const pageIndices = pdfDoc.getPageIndices();
        if (pageIndices.length > 0) {
          const copiedPages = await mergedPdf.copyPages(pdfDoc, pageIndices);
          copiedPages.forEach((page) => mergedPdf.addPage(page));
          totalPages += copiedPages.length;
        }
      } catch (error) {
        logger.error(`[PDFService] Error processing a PDF file`, { error });
      }
    }

    const mergedPdfBytes = await mergedPdf.save({ addDefaultPage: false });
    logger.info(`[PDFService] Successfully merged PDFs with ${totalPages} total pages`);
    return Buffer.from(mergedPdfBytes);
  }

  static async mergeFromZip(zipBuffer: Buffer): Promise<Buffer> {
    logger.info(`[PDFService] Extracting PDFs from ZIP`);

    const zip = new AdmZip(zipBuffer);
    const pdfBuffers: Buffer[] = [];

    zip.getEntries().forEach((entry) => {
      if (entry.entryName.toLowerCase().endsWith('.pdf')) {
        logger.info(`[PDFService] Found PDF in ZIP: ${entry.entryName}`);
        const buffer = entry.getData();
        if (buffer.length > 0) {
          pdfBuffers.push(buffer);
        }
      }
    });

    logger.info(`[PDFService] Extracted ${pdfBuffers.length} PDFs from ZIP`);
    return await this.mergePDFs(pdfBuffers);
  }

  static async removePages(pdfBuffer: Buffer, pagesToRemove: number[]): Promise<Buffer> {
    const uint8Array = new Uint8Array(pdfBuffer);
    const pdfDoc = await PDFDocument.load(uint8Array);
    const totalPages = pdfDoc.getPageCount();

    // Filter out invalid page indices
    const validPagesToRemove = pagesToRemove.filter((i) => i >= 0 && i < totalPages);

    const pagesToKeep = Array.from({ length: totalPages }, (_, i) => i).filter(
      (i) => !validPagesToRemove.includes(i)
    );

    const newPdf = await PDFDocument.create();
    if (pagesToKeep.length > 0) {
      const copiedPages = await newPdf.copyPages(pdfDoc, pagesToKeep);
      copiedPages.forEach((page) => newPdf.addPage(page));
    }

    const pdfBytes = await newPdf.save({ addDefaultPage: false });
    return Buffer.from(pdfBytes);
  }

  static async mergeAndRemovePages(buffers: Buffer[], pagesToRemove: number[]): Promise<Buffer> {
    // If no buffers provided, return empty document
    if (buffers.length === 0) {
      const emptyDoc = await PDFDocument.create();
      const emptyBytes = await emptyDoc.save({ addDefaultPage: false });
      return Buffer.from(emptyBytes);
    }

    const mergedPdf = await PDFDocument.create();
    let pageOffset = 0;
    let totalPages = 0;

    for (const buffer of buffers) {
      try {
        const pdfDoc = await PDFDocument.load(new Uint8Array(buffer));
        const currentPages = pdfDoc.getPageCount();
        logger.info(`[mergeAndRemovePages] Processing PDF with ${currentPages} pages`);

        const keepPages = Array.from({ length: currentPages }, (_, i) => i).filter(
          (i) => !pagesToRemove.includes(i + pageOffset)
        );

        if (keepPages.length > 0) {
          const copied = await mergedPdf.copyPages(pdfDoc, keepPages);
          copied.forEach((page) => mergedPdf.addPage(page));
          totalPages += copied.length;
        }

        pageOffset += currentPages;
      } catch (error) {
        logger.error(`[mergeAndRemovePages] Error processing PDF`, { error });
      }
    }

    const finalBytes = await mergedPdf.save({ addDefaultPage: false });
    logger.info(`[mergeAndRemovePages] Final merged PDF saved with ${totalPages} pages`);
    return Buffer.from(finalBytes);
  }

  /**
   * Fixes internal links in a PDF document based on user-provided mapping
   * @param fileBuffer The original PDF file as a buffer
   * @param linksToFix Mapping of page links to update: { pageIndex: [{ oldTarget, newTarget }] }
   * @returns Buffer containing the modified PDF
   */
  static async fixInternalLinks(fileBuffer: Buffer, linksToFix: LinkPageMap): Promise<Buffer> {
    try {
      logger.info('[PDFService] Starting to modify link destinations');

      // Load the PDF document with preservation of existing structure
      const pdfDoc = await PDFDocument.load(new Uint8Array(fileBuffer), {
        ignoreEncryption: true,
        updateMetadata: false,
      });

      const pages = pdfDoc.getPages();

      // Process each page that has links to fix
      for (const [pageIndex, links] of Object.entries(linksToFix)) {
        const pageIdx = parseInt(pageIndex, 10);

        if (isNaN(pageIdx) || pageIdx < 0 || pageIdx >= pages.length) {
          logger.warn('[PDFService] Invalid page index', { pageIndex });
          continue;
        }

        // Get the page
        const page = pages[pageIdx];
        const pageDict = page.node;

        // Check for annotations and create if not exist
        let annotsRef = pageDict.get(PDFName.of('Annots'));
        let annotations: PDFArray;

        if (!annotsRef) {
          logger.info('[PDFService] Creating new Annots array for page', { pageIndex });
          annotations = pdfDoc.context.obj([]);
          pageDict.set(PDFName.of('Annots'), annotations);
        } else {
          try {
            const lookupResult = pdfDoc.context.lookup(annotsRef);
            if (!(lookupResult instanceof PDFArray)) {
              logger.warn('[PDFService] Annotations not an array, creating new one', { pageIndex });
              annotations = pdfDoc.context.obj([]);
              pageDict.set(PDFName.of('Annots'), annotations);
            } else {
              annotations = lookupResult;
            }
          } catch (error) {
            logger.error('[PDFService] Failed to lookup annotations', {
              pageIndex,
              error: error instanceof Error ? error.message : String(error),
            });
            annotations = pdfDoc.context.obj([]);
            pageDict.set(PDFName.of('Annots'), annotations);
          }
        }

        // Process each link update request
        for (const linkData of links) {
          try {
            this.createOrUpdateLinkAnnotation(
              pdfDoc,
              page,
              annotations,
              linkData.oldTarget,
              linkData.newTarget,
              pages
            );
          } catch (error) {
            logger.warn('[PDFService] Failed to update link', {
              oldTarget: linkData.oldTarget,
              newTarget: linkData.newTarget,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      logger.info('[PDFService] Finished modifying link destinations');

      // Save the modified PDF with options to preserve interactive elements
      const modifiedPdfBytes = await pdfDoc.save({
        addDefaultPage: false,
        useObjectStreams: false,
      });

      return Buffer.from(modifiedPdfBytes);
    } catch (error: any) {
      logger.error('[PDFService] Error modifying links', {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to modify links: ${error.message}`);
    }
  }

  /**
   * Creates or updates a link annotation on a page
   */
  private static createOrUpdateLinkAnnotation(
    pdfDoc: PDFDocument,
    page: PDFPage,
    annotations: PDFArray,
    oldTarget: number,
    newTarget: number,
    pages: PDFPage[]
  ): void {
    // First, try to find existing link annotations pointing to oldTarget
    let foundExistingLink = false;

    for (let i = 0; i < annotations.size(); i++) {
      try {
        const annotRef = annotations.get(i);
        const annot = pdfDoc.context.lookup(annotRef);

        if (!(annot instanceof PDFDict)) continue;

        const subtype = annot.get(PDFName.of('Subtype'));
        if (!subtype || !(subtype instanceof PDFName) || subtype.asString() !== 'Link') continue;

        // Check if this link points to our oldTarget
        const pointsToOldTarget = this.linkPointsToTarget(pdfDoc, annot, oldTarget, pages);

        if (pointsToOldTarget) {
          logger.info('[PDFService] Found existing link to update', {
            oldTarget,
            newTarget,
          });

          foundExistingLink = true;

          // Update the link destination
          this.updateLinkDestination(pdfDoc, annot, newTarget, pages);
        }
      } catch (error) {
        logger.warn('[PDFService] Error checking annotation', {
          index: i,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // If no existing links were found, we can create a new one
    // Note: In a real implementation, you would need coordinates of where to place this link
    // Those would typically come from your linkToFix data
    if (!foundExistingLink) {
      logger.info('[PDFService] No existing link found to target', { oldTarget, newTarget });
      // Creating new links would require rectangle coordinates which we don't have
      // This would be where you'd add code to create a new link if needed
    }
  }

  /**
   * Checks if a link annotation points to the specified target page
   */
  private static linkPointsToTarget(
    pdfDoc: PDFDocument,
    annot: PDFDict,
    targetPageIndex: number,
    pages: PDFPage[]
  ): boolean {
    // Check direct Dest
    const dest = annot.get(PDFName.of('Dest'));
    if (dest && this.isValidDestinationObject(dest)) {
      return this.destinationPointsToTarget(pdfDoc, dest, targetPageIndex, pages);
    }

    // Check Action with GoTo
    const action = annot.get(PDFName.of('A'));
    if (action instanceof PDFDict) {
      const actionType = action.get(PDFName.of('S'));
      if (actionType instanceof PDFName && actionType.asString() === 'GoTo') {
        const actionDest = action.get(PDFName.of('D'));
        if (actionDest && this.isValidDestinationObject(actionDest)) {
          return this.destinationPointsToTarget(pdfDoc, actionDest, targetPageIndex, pages);
        }
      }
    }

    return false;
  }

  /**
   * Checks if a destination points to the specified target page
   */
  private static destinationPointsToTarget(
    pdfDoc: PDFDocument,
    dest: PDFArray | PDFRef | PDFName | PDFString,
    targetPageIndex: number,
    pages: PDFPage[]
  ): boolean {
    // Handle direct array destination
    if (dest instanceof PDFArray && dest.size() > 0) {
      const pageRef = dest.get(0);

      if (pageRef instanceof PDFRef) {
        // Find the page index by comparing references
        const pageIndex = pages.findIndex((p) => {
          return (
            p.ref.objectNumber === pageRef.objectNumber &&
            p.ref.generationNumber === pageRef.generationNumber
          );
        });

        return pageIndex === targetPageIndex;
      } else if (pageRef instanceof PDFNumber) {
        return pageRef.asNumber() === targetPageIndex;
      }
    }
    // Handle reference to a destination array
    else if (dest instanceof PDFRef) {
      try {
        const destObj = pdfDoc.context.lookup(dest);
        if (destObj instanceof PDFArray) {
          return this.destinationPointsToTarget(pdfDoc, destObj, targetPageIndex, pages);
        }
      } catch (error) {
        logger.warn('[PDFService] Failed to lookup destination reference', {
          destinationRef: dest?.toString?.() || 'unknown',
        });
      }
    }
    // Handle named destinations
    else if (dest instanceof PDFString || dest instanceof PDFName) {
      // Named destinations would require resolving through Names dict
      // This is complex and omitted for brevity
      logger.debug('[PDFService] Named destination found - not checking');
    }

    return false;
  }

  /**
   * Updates the destination of a link annotation to point to the new target page
   */
  private static updateLinkDestination(
    pdfDoc: PDFDocument,
    annot: PDFDict,
    newTargetIndex: number,
    pages: PDFPage[]
  ): void {
    if (newTargetIndex < 0 || newTargetIndex >= pages.length) {
      logger.warn('[PDFService] New target page index out of range', { newTargetIndex });
      return;
    }

    const newPageRef = pages[newTargetIndex].ref;

    // Update direct Dest if it exists
    const dest = annot.get(PDFName.of('Dest'));
    if (dest && this.isValidDestinationObject(dest)) {
      this.updateDestinationTarget(pdfDoc, dest, newPageRef);
      return;
    }

    // Update Action with GoTo if it exists
    const action = annot.get(PDFName.of('A'));
    if (action instanceof PDFDict) {
      const actionType = action.get(PDFName.of('S'));
      if (actionType instanceof PDFName && actionType.asString() === 'GoTo') {
        const actionDest = action.get(PDFName.of('D'));
        if (actionDest && this.isValidDestinationObject(actionDest)) {
          this.updateDestinationTarget(pdfDoc, actionDest, newPageRef);
          return;
        }
      }
    }
  }
  /**
   * Updates the target page in a destination
   */
  private static updateDestinationTarget(
    pdfDoc: PDFDocument,
    dest: PDFArray | PDFRef | PDFName | PDFString,
    newPageRef: PDFRef
  ): void {
    if (dest instanceof PDFArray) {
      if (dest.size() > 0) {
        dest.set(0, newPageRef);
        logger.debug('[PDFService] Updated destination array with new page reference');
      } else {
        logger.warn('[PDFService] Destination array is empty, cannot update');
      }
      return;
    }

    if (dest instanceof PDFRef) {
      try {
        const destObj = pdfDoc.context.lookup(dest);
        if (destObj instanceof PDFArray && destObj.size() > 0) {
          destObj.set(0, newPageRef);
          logger.debug('[PDFService] Updated referenced destination array with new page reference');
        } else {
          logger.warn(
            '[PDFService] Referenced destination object is not a valid array or is empty'
          );
        }
      } catch (error) {
        logger.warn('[PDFService] Failed to lookup destination reference for update', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (dest instanceof PDFName || dest instanceof PDFString) {
      logger.warn('[PDFService] Named destinations not supported for updating', {
        destination: dest.toString(),
      });
      return;
    }

    // Defensive programming: should never reach here
    logger.error('[PDFService] Unexpected destination type encountered', {
      destinationType: typeof dest,
    });
  }

  private static isValidDestinationObject(
    dest: PDFObject
  ): dest is PDFArray | PDFRef | PDFName | PDFString {
    return (
      dest instanceof PDFArray ||
      dest instanceof PDFRef ||
      dest instanceof PDFName ||
      dest instanceof PDFString
    );
  }
}
