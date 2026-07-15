import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import DocumentModel from '../models/Document';
import ActivityModel from '../models/Activity';
import User from '../models/User';
import { AuthRequest } from '../middlewares/auth';
import { createError } from '../middlewares/error';
import { UPLOADS_PATH } from '../middlewares/upload';

const getMimeCategory = (mimeType: string): any => {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('word')) return 'word';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'excel';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'ppt';
  if (mimeType === 'text/plain' || mimeType === 'text/html') return 'text';
  return 'other';
};

// @desc  Upload file(s)
// @route POST /api/files/upload
export const uploadFile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return next(createError('No files uploaded', 400));
    }

    const savedDocs = [];
    let totalSize = 0;

    for (const file of files) {
      const doc = await DocumentModel.create({
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

      await ActivityModel.create({
        user: req.user._id,
        operation: 'File Upload',
        fileName: file.originalname,
        status: 'success',
        fileSize: file.size,
      });
    }

    // Update user storage
    await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: totalSize } });

    res.status(201).json({ success: true, message: 'Files uploaded successfully', files: savedDocs });
  } catch (error) {
    next(error);
  }
};

// @desc  Get all user files
// @route GET /api/files
export const getFiles = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, category, sort = '-createdAt', page = 1, limit = 20 } = req.query;

    const query: any = { owner: req.user._id, isDeleted: false };
    if (search) query.$text = { $search: search as string };
    if (category) query.category = category;

    const files = await DocumentModel.find(query)
      .sort(sort as string)
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const total = await DocumentModel.countDocuments(query);

    res.json({ success: true, files, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (error) {
    next(error);
  }
};

// @desc  Get single file
// @route GET /api/files/:id
export const getFile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = await DocumentModel.findOne({ _id: req.params.id, owner: req.user._id, isDeleted: false });
    if (!file) return next(createError('File not found', 404));
    res.json({ success: true, file });
  } catch (error) {
    next(error);
  }
};

// @desc  Rename file
// @route PUT /api/files/:id/rename
export const renameFile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.body;
    const file = await DocumentModel.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { originalName: name },
      { new: true }
    );
    if (!file) return next(createError('File not found', 404));
    res.json({ success: true, message: 'File renamed', file });
  } catch (error) {
    next(error);
  }
};

// @desc  Delete file (soft delete)
// @route DELETE /api/files/:id
export const deleteFile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = await DocumentModel.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) return next(createError('File not found', 404));

    // Hard delete from disk
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    await DocumentModel.findByIdAndDelete(file._id);
    await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: -file.size } });

    await ActivityModel.create({
      user: req.user._id,
      operation: 'File Delete',
      fileName: file.originalName,
      status: 'success',
    });

    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc  Download file
// @route GET /api/files/:id/download
export const downloadFile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = await DocumentModel.findOne({ _id: req.params.id, owner: req.user._id, isDeleted: false });
    if (!file) return next(createError('File not found', 404));

    if (!fs.existsSync(file.filePath)) {
      return next(createError('File not found on disk', 404));
    }

    res.download(file.filePath, file.originalName);
  } catch (error) {
    next(error);
  }
};

// @desc  Get dashboard stats
// @route GET /api/files/stats
export const getStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user._id;
    const [totalFiles, recentDocs, user] = await Promise.all([
      DocumentModel.countDocuments({ owner: userId, isDeleted: false }),
      DocumentModel.find({ owner: userId, isDeleted: false }).sort('-createdAt').limit(5),
      User.findById(userId),
    ]);

    const categoryBreakdown = await DocumentModel.aggregate([
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
  } catch (error) {
    next(error);
  }
};
