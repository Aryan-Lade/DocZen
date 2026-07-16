import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { Op } from 'sequelize';
import sequelize from '../config/db';
import DocumentModel from '../models/Document';
import ActivityModel from '../models/Activity';
import User from '../models/User';
import { AuthRequest } from '../middlewares/auth';
import { createError } from '../middlewares/error';

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
        ownerId: req.user.id,
        originalName: file.originalname,
        fileName: file.filename,
        filePath: file.path,
        mimeType: file.mimetype,
        size: file.size,
        category: getMimeCategory(file.mimetype),
        tags: [],
        isDeleted: false,
      });

      savedDocs.push(doc);
      totalSize += file.size;

      await ActivityModel.create({
        userId: req.user.id,
        operation: 'File Upload',
        fileName: file.originalname,
        status: 'success',
        fileSize: file.size,
      });
    }

    // Update user storage
    const user = await User.findByPk(req.user.id);
    if (user) {
      await user.increment('storageUsed', { by: totalSize });
    }

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

    const whereClause: any = { ownerId: req.user.id, isDeleted: false };
    if (search) {
      whereClause.originalName = { [Op.like]: `%${search}%` };
    }
    if (category) {
      whereClause.category = category;
    }

    let sortField = 'createdAt';
    let sortOrder = 'DESC';
    if (sort) {
      const sortStr = sort as string;
      if (sortStr.startsWith('-')) {
        sortField = sortStr.substring(1);
        sortOrder = 'DESC';
      } else {
        sortField = sortStr;
        sortOrder = 'ASC';
      }
    }

    const files = await DocumentModel.findAll({
      where: whereClause,
      order: [[sortField, sortOrder]],
      offset: (+page - 1) * +limit,
      limit: +limit,
    });

    const total = await DocumentModel.count({ where: whereClause });

    res.json({ success: true, files, total, page: +page, pages: Math.ceil(total / +limit) });
  } catch (error) {
    next(error);
  }
};

// @desc  Get single file
// @route GET /api/files/:id
export const getFile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = await DocumentModel.findOne({
      where: { id: req.params.id, ownerId: req.user.id, isDeleted: false }
    });
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
    const file = await DocumentModel.findOne({
      where: { id: req.params.id, ownerId: req.user.id }
    });
    if (!file) return next(createError('File not found', 404));
    await file.update({ originalName: name });
    res.json({ success: true, message: 'File renamed', file });
  } catch (error) {
    next(error);
  }
};

// @desc  Delete file (hard delete)
// @route DELETE /api/files/:id
export const deleteFile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = await DocumentModel.findOne({
      where: { id: req.params.id, ownerId: req.user.id }
    });
    if (!file) return next(createError('File not found', 404));

    // Hard delete from disk
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    const fileSize = file.size;
    const fileName = file.originalName;

    await file.destroy();

    const user = await User.findByPk(req.user.id);
    if (user) {
      await user.decrement('storageUsed', { by: fileSize });
    }

    await ActivityModel.create({
      userId: req.user.id,
      operation: 'File Delete',
      fileName: fileName,
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
    const file = await DocumentModel.findOne({
      where: { id: req.params.id, ownerId: req.user.id, isDeleted: false }
    });
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
    const userId = req.user.id;
    const [totalFiles, recentDocs, user] = await Promise.all([
      DocumentModel.count({ where: { ownerId: userId, isDeleted: false } }),
      DocumentModel.findAll({
        where: { ownerId: userId, isDeleted: false },
        order: [['createdAt', 'DESC']],
        limit: 5,
      }),
      User.findByPk(userId),
    ]);

    const categoryBreakdown = await DocumentModel.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('size')), 'totalSize'],
      ],
      where: { ownerId: userId, isDeleted: false },
      group: ['category'],
    });

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
