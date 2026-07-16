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
      userId: req.user.id,
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
      userId: req.user.id,
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

    const uuid = uuidv4();
    const outputPattern = path.join(UPLOADS_PATH, `page_${uuid}_%d.jpg`);
    
    const { exec } = require('child_process');
    const ghostscriptPath = process.env.GHOSTSCRIPT_PATH || 'gs';
    
    const command = `"${ghostscriptPath}" -dNOPAUSE -dBATCH -sDEVICE=jpeg -r150 -sOutputFile="${outputPattern}" "${inputPath}"`;

    exec(command, async (error: any, stdout: string, stderr: string) => {
      if (error) {
        console.error('Ghostscript PDF to Image error:', error, stderr);
        fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
        return res.status(500).json({
          success: false,
          message: 'PDF to Image conversion failed. Ensure Ghostscript is installed on the server.',
          error: stderr || error.message,
        });
      }

      try {
        const filesInDir = fs.readdirSync(UPLOADS_PATH);
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
          fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
          return res.status(500).json({
            success: false,
            message: 'PDF to Image conversion succeeded but output files could not be found.',
          });
        }

        await ActivityModel.create({
          userId: req.user.id,
          operation: 'PDF to Image',
          fileName: req.file!.originalname,
          status: 'success',
        });

        res.json({
          success: true,
          message: `Converted into ${pageFiles.length} pages`,
          files: pageFiles,
        });

        fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      } catch (dirErr) {
        fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
        next(dirErr);
      }
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};
