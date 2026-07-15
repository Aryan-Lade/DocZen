import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { AuthRequest } from '../middlewares/auth';
import { createError } from '../middlewares/error';
import { UPLOADS_PATH } from '../middlewares/upload';
import ActivityModel from '../models/Activity';

// @desc  Compress image
// @route POST /api/image/compress
export const compressImage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No image uploaded', 400));

    const { quality = 80 } = req.body;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const outFile = `compressed_${uuidv4()}${ext}`;
    const outPath = path.join(UPLOADS_PATH, outFile);

    const q = Math.min(100, Math.max(1, parseInt(quality)));

    await sharp(inputPath)
      .jpeg({ quality: q })
      .toFile(outPath);

    await ActivityModel.create({
      user: req.user._id,
      operation: 'Image Compress',
      fileName: req.file.originalname,
      status: 'success',
    });

    res.download(outPath, `compressed_${req.file.originalname}`, () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Convert image format
// @route POST /api/image/convert
export const convertImage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No image uploaded', 400));

    const { format = 'png' } = req.body;
    const validFormats = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff'];
    if (!validFormats.includes(format.toLowerCase())) {
      return next(createError(`Format ${format} is not supported`, 400));
    }

    const outFile = `converted_${uuidv4()}.${format}`;
    const outPath = path.join(UPLOADS_PATH, outFile);

    await sharp(inputPath)
      .toFormat(format.toLowerCase() as any)
      .toFile(outPath);

    await ActivityModel.create({
      user: req.user._id,
      operation: 'Image Convert',
      fileName: req.file.originalname,
      status: 'success',
    });

    res.download(outPath, `converted.${format}`, () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  PDF to Image (per page)
// @route POST /api/image/pdf-to-image
export const pdfToImage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No PDF uploaded', 400));

    // Since we can't use pdf-poppler without system deps, return info message
    // In production, use pdf-poppler or Ghostscript CLI
    res.json({
      success: false,
      message: 'PDF to Image requires Ghostscript or pdf-poppler installed on the server. Please install Ghostscript and configure the path in .env.',
    });

    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};
