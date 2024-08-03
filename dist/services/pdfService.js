"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergePDFsHandler = exports.PDFService = void 0;
const pdf_lib_1 = require("pdf-lib");
const adm_zip_1 = __importDefault(require("adm-zip"));
class PDFService {
    static async mergePDFs(pdfs) {
        const mergedPdf = await pdf_lib_1.PDFDocument.create();
        for (const pdf of pdfs) {
            // Convert Buffer to Uint8Array
            const uint8ArrayPdf = new Uint8Array(pdf);
            const pdfDoc = await pdf_lib_1.PDFDocument.load(uint8ArrayPdf);
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }
        const mergedPdfBytes = await mergedPdf.save();
        return Buffer.from(mergedPdfBytes); // Convert Uint8Array to Buffer
    }
    static async mergeFromZip(zipBuffer) {
        const zip = new adm_zip_1.default(zipBuffer);
        const pdfBuffers = [];
        zip.getEntries().forEach((entry) => {
            if (entry.entryName.endsWith('.pdf')) {
                pdfBuffers.push(entry.getData());
            }
        });
        return await this.mergePDFs(pdfBuffers);
    }
}
exports.PDFService = PDFService;
const mergePDFsHandler = async (req, res) => {
    try {
        const filename = req.body.filename || 'merged.pdf';
        // Typecast req.files to handle both scenarios
        const files = req.files;
        if (Array.isArray(files)) {
            // Handle array of files (if no zip file uploaded)
            const pdfFiles = files;
            const pdfBuffers = pdfFiles.map((file) => file.buffer);
            const mergedPdf = await PDFService.mergePDFs(pdfBuffers);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', 'application/pdf');
            res.send(mergedPdf);
        }
        else {
            // Handle object with field names (when zip file is uploaded)
            const zipFile = files['zip'] ? files['zip'][0].buffer : null;
            if (zipFile) {
                const mergedPdf = await PDFService.mergeFromZip(zipFile);
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.setHeader('Content-Type', 'application/pdf');
                res.send(mergedPdf);
            }
            else if (files['pdfs']) {
                // Handle regular PDF files
                const pdfFiles = files['pdfs'];
                const pdfBuffers = pdfFiles.map((file) => file.buffer);
                const mergedPdf = await PDFService.mergePDFs(pdfBuffers);
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.setHeader('Content-Type', 'application/pdf');
                res.send(mergedPdf);
            }
            else {
                res.status(400).send('No files uploaded.');
            }
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while merging PDFs.');
    }
};
exports.mergePDFsHandler = mergePDFsHandler;
