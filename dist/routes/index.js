"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
/* GET home page. */
router.get('/', (req, res, next) => {
    res.render('index', { title: 'PDF Blend' });
});
router.get('/merge-with-preview', (req, res) => {
    res.render('merge-with-preview', { title: 'PDF Blend with Preview' });
});
router.get('/merge', (req, res) => {
    res.render('merge', { title: 'Merge PDFs' });
});
router.get('/remove', (req, res) => {
    res.render('remove', { title: 'Remove Pages' });
});
exports.default = router;
