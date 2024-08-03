"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pdfService_1 = require("../services/pdfService");
const uploadMiddleware_1 = __importDefault(require("../middleware/uploadMiddleware"));
const router = express_1.default.Router();
router.post('/merge', uploadMiddleware_1.default.fields([{ name: 'pdfs', maxCount: 10 }, { name: 'zip' }]), pdfService_1.mergePDFsHandler);
exports.default = router;
