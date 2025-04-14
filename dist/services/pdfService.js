"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergePDFsHandler = exports.PDFService = void 0;
const pdf_lib_1 = require("pdf-lib");
const adm_zip_1 = __importDefault(require("adm-zip"));
const logger_1 = __importDefault(require("../utils/logger"));
class PDFService {
    static async mergePDFs(pdfs) {
        logger_1.default.info(`[PDFService] Merging ${pdfs.length} PDFs`);
        const mergedPdf = await pdf_lib_1.PDFDocument.create();
        for (const pdf of pdfs) {
            // Convert Buffer to Uint8Array
            try {
                const uint8ArrayPdf = new Uint8Array(pdf);
                const pdfDoc = await pdf_lib_1.PDFDocument.load(uint8ArrayPdf);
                const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }
            catch (error) {
                logger_1.default.error(`[PDFService] Error processing a PDF file`, { error });
            }
        }
        const mergedPdfBytes = await mergedPdf.save();
        logger_1.default.info(`[PDFService] Successfully merged PDFs`);
        return Buffer.from(mergedPdfBytes);
    }
    static async mergeFromZip(zipBuffer) {
        logger_1.default.info(`[PDFService] Extracting PDFs from ZIP`);
        const zip = new adm_zip_1.default(zipBuffer);
        const pdfBuffers = [];
        zip.getEntries().forEach((entry) => {
            if (entry.entryName.endsWith('.pdf')) {
                logger_1.default.info(`[PDFService] Found PDF in ZIP: ${entry.entryName}`);
                pdfBuffers.push(entry.getData());
            }
        });
        logger_1.default.info(`[PDFService] Extracted ${pdfBuffers.length} PDFs from ZIP`);
        return await this.mergePDFs(pdfBuffers);
    }
    static async removePages(pdfBuffer, pagesToRemove) {
        // Explicit conversion for compatibility
        const uint8Array = new Uint8Array(pdfBuffer);
        const pdfDoc = await pdf_lib_1.PDFDocument.load(uint8Array);
        const totalPages = pdfDoc.getPageCount();
        const pagesToKeep = Array.from({ length: totalPages }, (_, i) => i).filter(i => !pagesToRemove.includes(i));
        const newPdf = await pdf_lib_1.PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdfDoc, pagesToKeep);
        copiedPages.forEach((page) => newPdf.addPage(page));
        const pdfBytes = await newPdf.save();
        return Buffer.from(pdfBytes);
    }
}
exports.PDFService = PDFService;
const mergePDFsHandler = async (req, res) => {
    try {
        const filename = req.body.filename || 'merged.pdf';
        logger_1.default.info(`[mergePDFsHandler] Received merge request with filename: ${filename}`);
        const files = req.files?.files ||
            req.files;
        if (Array.isArray(files) || Array.isArray(files?.files)) {
            const pdfFiles = files;
            logger_1.default.info(`[mergePDFsHandler] ${pdfFiles.length} PDFs uploaded`);
            pdfFiles.sort((a, b) => {
                const numA = parseInt(a.originalname.match(/^(\d+)/)?.[0] || '0', 10);
                const numB = parseInt(b.originalname.match(/^(\d+)/)?.[0] || '0', 10);
                return numA - numB;
            });
            logger_1.default.info(`[mergePDFsHandler] Sorted PDFs by filename`);
            const pdfBuffers = pdfFiles.map((file) => file.buffer);
            const mergedPdf = await PDFService.mergePDFs(pdfBuffers);
            logger_1.default.info(`[mergePDFsHandler] Successfully merged PDFs, sending response`);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', 'application/pdf');
            res.send(mergedPdf);
        }
        else {
            const zipFile = files['zip'] ? files['zip'][0].buffer : null;
            if (zipFile) {
                logger_1.default.info(`[mergePDFsHandler] ZIP file detected, extracting PDFs`);
                const mergedPdf = await PDFService.mergeFromZip(zipFile);
                logger_1.default.info(`[mergePDFsHandler] Successfully merged PDFs from ZIP`);
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.setHeader('Content-Type', 'application/pdf');
                res.send(mergedPdf);
            }
            else if (files['pdfs']) {
                // Handle regular PDF files
                const pdfFiles = files['pdfs'];
                logger_1.default.info(`[mergePDFsHandler] ${pdfFiles.length} PDFs detected in 'pdfs' field`);
                const pdfBuffers = pdfFiles.map((file) => file.buffer);
                const mergedPdf = await PDFService.mergePDFs(pdfBuffers);
                logger_1.default.info(`[mergePDFsHandler] Successfully merged PDFs, sending response`);
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.setHeader('Content-Type', 'application/pdf');
                res.send(mergedPdf);
            }
            else {
                logger_1.default.warn(`[mergePDFsHandler] No valid files uploaded`);
                res.status(400).send('No files uploaded.');
            }
        }
    }
    catch (error) {
        console.error(error);
        logger_1.default.error(`[mergePDFsHandler] An error occurred while merging PDFs`, { error });
        res.status(500).send('An error occurred while merging PDFs.');
    }
};
exports.mergePDFsHandler = mergePDFsHandler;
