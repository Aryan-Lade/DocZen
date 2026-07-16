"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractText = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const tesseract_js_1 = __importDefault(require("tesseract.js"));
const error_1 = require("../middlewares/error");
const upload_1 = require("../middlewares/upload");
const Activity_1 = __importDefault(require("../models/Activity"));
// @desc  Extract text from image/scanned PDF via OCR
// @route POST /api/ocr/extract
const extractText = async (req, res, next) => {
    const inputPath = req.file?.path;
    try {
        if (!req.file)
            return next((0, error_1.createError)('No file uploaded', 400));
        const { lang = 'eng' } = req.body;
        // Run OCR
        const result = await tesseract_js_1.default.recognize(inputPath, lang, {
            logger: () => { }, // suppress logs
        });
        const extractedText = result.data.text;
        const confidence = result.data.confidence;
        await Activity_1.default.create({
            userId: req.user.id,
            operation: 'OCR Extract',
            fileName: req.file.originalname,
            status: 'success',
        });
        // Optionally save as text file
        const saveAsFile = req.body.saveAsFile === 'true';
        if (saveAsFile) {
            const txtPath = path_1.default.join(upload_1.UPLOADS_PATH, `ocr_${Date.now()}.txt`);
            fs_1.default.writeFileSync(txtPath, extractedText);
            res.download(txtPath, 'extracted_text.txt', () => {
                fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
                fs_1.default.existsSync(txtPath) && fs_1.default.unlinkSync(txtPath);
            });
            return;
        }
        fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
        res.json({
            success: true,
            text: extractedText,
            confidence: confidence.toFixed(1),
            wordCount: extractedText.split(/\s+/).filter(Boolean).length,
        });
    }
    catch (error) {
        fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
        next(error);
    }
};
exports.extractText = extractText;
//# sourceMappingURL=ocrController.js.map