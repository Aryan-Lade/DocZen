"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.htmlToPdf = exports.officeToPdf = exports.textToPdf = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const pdf_lib_1 = require("pdf-lib");
const error_1 = require("../middlewares/error");
const upload_1 = require("../middlewares/upload");
const Activity_1 = __importDefault(require("../models/Activity"));
// Helper: create a simple PDF from text
const textToPdfBytes = async (text) => {
    const pdfDoc = await pdf_lib_1.PDFDocument.create();
    const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
    const fontSize = 12;
    const margin = 50;
    const lineHeight = fontSize * 1.5;
    const lines = text.split('\n');
    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    let y = height - margin;
    for (const line of lines) {
        if (y < margin + lineHeight) {
            page = pdfDoc.addPage();
            y = height - margin;
        }
        // Word-wrap long lines
        const words = line.split(' ');
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = font.widthOfTextAtSize(testLine, fontSize);
            if (testWidth > width - margin * 2 && currentLine) {
                page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
                y -= lineHeight;
                currentLine = word;
                if (y < margin + lineHeight) {
                    page = pdfDoc.addPage();
                    y = height - margin;
                }
            }
            else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
        }
        y -= lineHeight;
    }
    return pdfDoc.save();
};
// @desc  Convert Text to PDF
// @route POST /api/convert/text-to-pdf
const textToPdf = async (req, res, next) => {
    const inputPath = req.file?.path;
    try {
        if (!req.file)
            return next((0, error_1.createError)('No file uploaded', 400));
        const text = fs_1.default.readFileSync(inputPath, 'utf-8');
        const bytes = await textToPdfBytes(text);
        const outPath = path_1.default.join(upload_1.UPLOADS_PATH, `converted_${(0, uuid_1.v4)()}.pdf`);
        fs_1.default.writeFileSync(outPath, bytes);
        await Activity_1.default.create({ user: req.user._id, operation: 'Text to PDF', fileName: req.file.originalname, status: 'success' });
        res.download(outPath, 'converted.pdf', () => {
            fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
            fs_1.default.existsSync(outPath) && fs_1.default.unlinkSync(outPath);
        });
    }
    catch (error) {
        fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
        next(error);
    }
};
exports.textToPdf = textToPdf;
// @desc  Convert Word/Excel/PPT to PDF (requires LibreOffice)
// @route POST /api/convert/office-to-pdf
const officeToPdf = async (req, res, next) => {
    const inputPath = req.file?.path;
    try {
        if (!req.file)
            return next((0, error_1.createError)('No file uploaded', 400));
        const { exec } = require('child_process');
        const libreOfficePath = process.env.LIBREOFFICE_PATH || 'libreoffice';
        const command = `"${libreOfficePath}" --headless --convert-to pdf --outdir "${upload_1.UPLOADS_PATH}" "${inputPath}"`;
        exec(command, async (error, stdout, stderr) => {
            if (error) {
                fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
                return res.status(500).json({
                    success: false,
                    message: 'LibreOffice conversion failed. Please ensure LibreOffice is installed on the server.',
                    error: stderr,
                });
            }
            const baseName = path_1.default.basename(inputPath, path_1.default.extname(inputPath));
            const outPath = path_1.default.join(upload_1.UPLOADS_PATH, `${baseName}.pdf`);
            await Activity_1.default.create({ user: req.user._id, operation: 'Office to PDF', fileName: req.file.originalname, status: 'success' });
            res.download(outPath, 'converted.pdf', () => {
                fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
                fs_1.default.existsSync(outPath) && fs_1.default.unlinkSync(outPath);
            });
        });
    }
    catch (error) {
        fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
        next(error);
    }
};
exports.officeToPdf = officeToPdf;
// @desc  Convert HTML to PDF (using pdf-lib for simple HTML)
// @route POST /api/convert/html-to-pdf
const htmlToPdf = async (req, res, next) => {
    const inputPath = req.file?.path;
    try {
        if (!req.file)
            return next((0, error_1.createError)('No HTML file uploaded', 400));
        // Strip HTML tags for basic conversion
        const htmlContent = fs_1.default.readFileSync(inputPath, 'utf-8');
        const textContent = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const bytes = await textToPdfBytes(textContent);
        const outPath = path_1.default.join(upload_1.UPLOADS_PATH, `converted_${(0, uuid_1.v4)()}.pdf`);
        fs_1.default.writeFileSync(outPath, bytes);
        await Activity_1.default.create({ user: req.user._id, operation: 'HTML to PDF', fileName: req.file.originalname, status: 'success' });
        res.download(outPath, 'converted.pdf', () => {
            fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
            fs_1.default.existsSync(outPath) && fs_1.default.unlinkSync(outPath);
        });
    }
    catch (error) {
        fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
        next(error);
    }
};
exports.htmlToPdf = htmlToPdf;
//# sourceMappingURL=convertController.js.map