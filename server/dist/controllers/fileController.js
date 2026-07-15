"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = exports.downloadFile = exports.deleteFile = exports.renameFile = exports.getFile = exports.getFiles = exports.uploadFile = void 0;
const fs_1 = __importDefault(require("fs"));
const Document_1 = __importDefault(require("../models/Document"));
const Activity_1 = __importDefault(require("../models/Activity"));
const User_1 = __importDefault(require("../models/User"));
const error_1 = require("../middlewares/error");
const getMimeCategory = (mimeType) => {
    if (mimeType === 'application/pdf')
        return 'pdf';
    if (mimeType.startsWith('image/'))
        return 'image';
    if (mimeType.includes('word'))
        return 'word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
        return 'excel';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation'))
        return 'ppt';
    if (mimeType === 'text/plain' || mimeType === 'text/html')
        return 'text';
    return 'other';
};
// @desc  Upload file(s)
// @route POST /api/files/upload
const uploadFile = async (req, res, next) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return next((0, error_1.createError)('No files uploaded', 400));
        }
        const savedDocs = [];
        let totalSize = 0;
        for (const file of files) {
            const doc = await Document_1.default.create({
                owner: req.user._id,
                originalName: file.originalname,
                fileName: file.filename,
                filePath: file.path,
                mimeType: file.mimetype,
                size: file.size,
                category: getMimeCategory(file.mimetype),
            });
            savedDocs.push(doc);
            totalSize += file.size;
            await Activity_1.default.create({
                user: req.user._id,
                operation: 'File Upload',
                fileName: file.originalname,
                status: 'success',
                fileSize: file.size,
            });
        }
        // Update user storage
        await User_1.default.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: totalSize } });
        res.status(201).json({ success: true, message: 'Files uploaded successfully', files: savedDocs });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadFile = uploadFile;
// @desc  Get all user files
// @route GET /api/files
const getFiles = async (req, res, next) => {
    try {
        const { search, category, sort = '-createdAt', page = 1, limit = 20 } = req.query;
        const query = { owner: req.user._id, isDeleted: false };
        if (search)
            query.$text = { $search: search };
        if (category)
            query.category = category;
        const files = await Document_1.default.find(query)
            .sort(sort)
            .skip((+page - 1) * +limit)
            .limit(+limit);
        const total = await Document_1.default.countDocuments(query);
        res.json({ success: true, files, total, page: +page, pages: Math.ceil(total / +limit) });
    }
    catch (error) {
        next(error);
    }
};
exports.getFiles = getFiles;
// @desc  Get single file
// @route GET /api/files/:id
const getFile = async (req, res, next) => {
    try {
        const file = await Document_1.default.findOne({ _id: req.params.id, owner: req.user._id, isDeleted: false });
        if (!file)
            return next((0, error_1.createError)('File not found', 404));
        res.json({ success: true, file });
    }
    catch (error) {
        next(error);
    }
};
exports.getFile = getFile;
// @desc  Rename file
// @route PUT /api/files/:id/rename
const renameFile = async (req, res, next) => {
    try {
        const { name } = req.body;
        const file = await Document_1.default.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { originalName: name }, { new: true });
        if (!file)
            return next((0, error_1.createError)('File not found', 404));
        res.json({ success: true, message: 'File renamed', file });
    }
    catch (error) {
        next(error);
    }
};
exports.renameFile = renameFile;
// @desc  Delete file (soft delete)
// @route DELETE /api/files/:id
const deleteFile = async (req, res, next) => {
    try {
        const file = await Document_1.default.findOne({ _id: req.params.id, owner: req.user._id });
        if (!file)
            return next((0, error_1.createError)('File not found', 404));
        // Hard delete from disk
        if (fs_1.default.existsSync(file.filePath)) {
            fs_1.default.unlinkSync(file.filePath);
        }
        await Document_1.default.findByIdAndDelete(file._id);
        await User_1.default.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: -file.size } });
        await Activity_1.default.create({
            user: req.user._id,
            operation: 'File Delete',
            fileName: file.originalName,
            status: 'success',
        });
        res.json({ success: true, message: 'File deleted' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteFile = deleteFile;
// @desc  Download file
// @route GET /api/files/:id/download
const downloadFile = async (req, res, next) => {
    try {
        const file = await Document_1.default.findOne({ _id: req.params.id, owner: req.user._id, isDeleted: false });
        if (!file)
            return next((0, error_1.createError)('File not found', 404));
        if (!fs_1.default.existsSync(file.filePath)) {
            return next((0, error_1.createError)('File not found on disk', 404));
        }
        res.download(file.filePath, file.originalName);
    }
    catch (error) {
        next(error);
    }
};
exports.downloadFile = downloadFile;
// @desc  Get dashboard stats
// @route GET /api/files/stats
const getStats = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const [totalFiles, recentDocs, user] = await Promise.all([
            Document_1.default.countDocuments({ owner: userId, isDeleted: false }),
            Document_1.default.find({ owner: userId, isDeleted: false }).sort('-createdAt').limit(5),
            User_1.default.findById(userId),
        ]);
        const categoryBreakdown = await Document_1.default.aggregate([
            { $match: { owner: userId, isDeleted: false } },
            { $group: { _id: '$category', count: { $sum: 1 }, totalSize: { $sum: '$size' } } },
        ]);
        res.json({
            success: true,
            stats: {
                totalFiles,
                storageUsed: user?.storageUsed || 0,
                storageLimit: user?.storageLimit || 0,
                categoryBreakdown,
                recentDocs,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getStats = getStats;
//# sourceMappingURL=fileController.js.map