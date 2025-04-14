"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pdfService_1 = require("../services/pdfService");
const uploadMiddleware_1 = __importDefault(require("../middleware/uploadMiddleware"));
const logger_1 = __importDefault(require("../utils/logger"));
const router = express_1.default.Router();
router.post('/merge', (req, res, next) => {
    uploadMiddleware_1.default.fields([{ name: 'files', maxCount: 20 }])(req, res, (err) => {
        if (err) {
            logger_1.default.error('[Multer Error] File upload failed', { error: err.message });
            return res.status(400).json({ error: 'Error uploading file' });
        }
        if (!req.files || req.files.length === 0) {
            logger_1.default.warn('[Validation Error] No files uploaded');
            return res
                .status(400)
                .json({ error: 'No files uploaded. Please select at least one file.' });
        }
        next();
    });
}, pdfService_1.mergePDFsHandler);
router.post('/remove', async (req, res) => {
    const file = req.files?.file;
    const filename = req.body.filename || 'CleanedFile.pdf';
    const pagesToRemove = JSON.parse(req.body.pagesToRemove || '[]');
    if (!file?.buffer) {
        return res.status(400).send("No PDF file uploaded.");
    }
    const cleanedPdf = await pdfService_1.PDFService.removePages(file.buffer, pagesToRemove);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(cleanedPdf);
});
exports.default = router;
