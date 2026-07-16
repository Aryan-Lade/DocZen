"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfToImage = exports.convertImage = exports.compressImage = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const sharp_1 = __importDefault(require("sharp"));
const error_1 = require("../middlewares/error");
const upload_1 = require("../middlewares/upload");
const Activity_1 = __importDefault(require("../models/Activity"));
// @desc  Compress image
// @route POST /api/image/compress
const compressImage = async (req, res, next) => {
    const inputPath = req.file?.path;
    try {
        if (!req.file)
            return next((0, error_1.createError)('No image uploaded', 400));
        const { quality = 80 } = req.body;
        const ext = path_1.default.extname(req.file.originalname).toLowerCase();
        const outFile = `compressed_${(0, uuid_1.v4)()}${ext}`;
        const outPath = path_1.default.join(upload_1.UPLOADS_PATH, outFile);
        const q = Math.min(100, Math.max(1, parseInt(quality)));
        await (0, sharp_1.default)(inputPath)
            .jpeg({ quality: q })
            .toFile(outPath);
        await Activity_1.default.create({
            userId: req.user.id,
            operation: 'Image Compress',
            fileName: req.file.originalname,
            status: 'success',
        });
        res.download(outPath, `compressed_${req.file.originalname}`, () => {
            fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
            fs_1.default.existsSync(outPath) && fs_1.default.unlinkSync(outPath);
        });
    }
    catch (error) {
        fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
        next(error);
    }
};
exports.compressImage = compressImage;
// @desc  Convert image format
// @route POST /api/image/convert
const convertImage = async (req, res, next) => {
    const inputPath = req.file?.path;
    try {
        if (!req.file)
            return next((0, error_1.createError)('No image uploaded', 400));
        const { format = 'png' } = req.body;
        const validFormats = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff'];
        if (!validFormats.includes(format.toLowerCase())) {
            return next((0, error_1.createError)(`Format ${format} is not supported`, 400));
        }
        const outFile = `converted_${(0, uuid_1.v4)()}.${format}`;
        const outPath = path_1.default.join(upload_1.UPLOADS_PATH, outFile);
        await (0, sharp_1.default)(inputPath)
            .toFormat(format.toLowerCase())
            .toFile(outPath);
        await Activity_1.default.create({
            userId: req.user.id,
            operation: 'Image Convert',
            fileName: req.file.originalname,
            status: 'success',
        });
        res.download(outPath, `converted.${format}`, () => {
            fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
            fs_1.default.existsSync(outPath) && fs_1.default.unlinkSync(outPath);
        });
    }
    catch (error) {
        fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
        next(error);
    }
};
exports.convertImage = convertImage;
// @desc  PDF to Image (per page)
// @route POST /api/image/pdf-to-image
const pdfToImage = async (req, res, next) => {
    const inputPath = req.file?.path;
    try {
        if (!req.file)
            return next((0, error_1.createError)('No PDF uploaded', 400));
        const uuid = (0, uuid_1.v4)();
        const outputPattern = path_1.default.join(upload_1.UPLOADS_PATH, `page_${uuid}_%d.jpg`);
        const { exec } = require('child_process');
        const ghostscriptPath = process.env.GHOSTSCRIPT_PATH || 'gs';
        const command = `"${ghostscriptPath}" -dNOPAUSE -dBATCH -sDEVICE=jpeg -r150 -sOutputFile="${outputPattern}" "${inputPath}"`;
        exec(command, async (error, stdout, stderr) => {
            if (error) {
                console.error('Ghostscript PDF to Image error:', error, stderr);
                fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
                return res.status(500).json({
                    success: false,
                    message: 'PDF to Image conversion failed. Ensure Ghostscript is installed on the server.',
                    error: stderr || error.message,
                });
            }
            try {
                const filesInDir = fs_1.default.readdirSync(upload_1.UPLOADS_PATH);
                const prefix = `page_${uuid}_`;
                const pageFiles = filesInDir
                    .filter(f => f.startsWith(prefix) && f.endsWith('.jpg'))
                    .map(f => {
                    const parts = f.substring(prefix.length).split('.');
                    const pageNum = parseInt(parts[0]) || 0;
                    return { name: f, pageNum };
                })
                    .sort((a, b) => a.pageNum - b.pageNum)
                    .map(item => ({
                    name: `page_${item.pageNum}.jpg`,
                    path: item.name
                }));
                if (pageFiles.length === 0) {
                    fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
                    return res.status(500).json({
                        success: false,
                        message: 'PDF to Image conversion succeeded but output files could not be found.',
                    });
                }
                await Activity_1.default.create({
                    userId: req.user.id,
                    operation: 'PDF to Image',
                    fileName: req.file.originalname,
                    status: 'success',
                });
                res.json({
                    success: true,
                    message: `Converted into ${pageFiles.length} pages`,
                    files: pageFiles,
                });
                fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
            }
            catch (dirErr) {
                fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
                next(dirErr);
            }
        });
    }
    catch (error) {
        fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
        next(error);
    }
};
exports.pdfToImage = pdfToImage;
//# sourceMappingURL=imageController.js.map