"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// Set up disk storage configuration
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        // Set the destination folder for uploads
        cb(null, path_1.default.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        // Set the filename for the uploaded file
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({ storage });
exports.default = upload;
