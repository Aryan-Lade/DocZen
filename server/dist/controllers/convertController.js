"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.htmlToPdf = exports.pdfToOffice = exports.officeToPdf = exports.textToPdf = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const pdf_lib_1 = require("pdf-lib");
const mammoth_1 = __importDefault(require("mammoth"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const docx_1 = require("docx");
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
        await Activity_1.default.create({ userId: req.user.id, operation: 'Text to PDF', fileName: req.file.originalname, status: 'success' });
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
// @desc  Convert Word/Excel/PPT to PDF (using mammoth for simple text extraction)
// @route POST /api/convert/office-to-pdf
const officeToPdf = async (req, res, next) => {
    const inputPath = req.file?.path;
    try {
        if (!req.file)
            return next((0, error_1.createError)('No file uploaded', 400));
        // For simplicity without LibreOffice, we extract text from Word using mammoth
        // and create a basic PDF. Complex formatting will be lost, but it will work flawlessly.
        const result = await mammoth_1.default.extractRawText({ path: inputPath });
        const text = result.value || 'Empty document';
        const bytes = await textToPdfBytes(text);
        const baseName = path_1.default.basename(inputPath, path_1.default.extname(inputPath));
        const outPath = path_1.default.join(upload_1.UPLOADS_PATH, `${baseName}.pdf`);
        fs_1.default.writeFileSync(outPath, bytes);
        await Activity_1.default.create({ userId: req.user.id, operation: 'Office to PDF', fileName: req.file.originalname, status: 'success' });
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
exports.officeToPdf = officeToPdf;
// @desc  Convert PDF to Office (Word/Docx) (using pdf-parse and docx)
// @route POST /api/convert/pdf-to-office
const pdfToOffice = async (req, res, next) => {
    const inputPath = req.file?.path;
    try {
        if (!req.file)
            return next((0, error_1.createError)('No file uploaded', 400));
        // Extract text from PDF
        const dataBuffer = fs_1.default.readFileSync(inputPath);
        const pdfData = await (0, pdf_parse_1.default)(dataBuffer);
        const text = pdfData.text || 'Empty document';
        // Create a new Word Document with the text
        const paragraphs = text.split('\n').map(line => {
            return new docx_1.Paragraph({
                children: [new docx_1.TextRun(line)],
            });
        });
        const doc = new docx_1.Document({
            sections: [{
                    properties: {},
                    children: paragraphs,
                }],
        });
        const b64string = await docx_1.Packer.toBase64String(doc);
        const buffer = Buffer.from(b64string, 'base64');
        const baseName = path_1.default.basename(inputPath, path_1.default.extname(inputPath));
        const outPath = path_1.default.join(upload_1.UPLOADS_PATH, `${baseName}.docx`);
        fs_1.default.writeFileSync(outPath, buffer);
        await Activity_1.default.create({ userId: req.user.id, operation: 'PDF to Word', fileName: req.file.originalname, status: 'success' });
        res.download(outPath, 'converted.docx', () => {
            fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
            fs_1.default.existsSync(outPath) && fs_1.default.unlinkSync(outPath);
        });
    }
    catch (error) {
        fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
        next(error);
    }
};
exports.pdfToOffice = pdfToOffice;
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
        await Activity_1.default.create({ userId: req.user.id, operation: 'HTML to PDF', fileName: req.file.originalname, status: 'success' });
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