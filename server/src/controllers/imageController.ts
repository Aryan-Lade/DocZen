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

// @desc  Resize image
// @route POST /api/image/resize
export const resizeImage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No image uploaded', 400));

    const { width, height, fit = 'inside' } = req.body;
    const w = width ? parseInt(width) : undefined;
    const h = height ? parseInt(height) : undefined;

    if ((!w || isNaN(w)) && (!h || isNaN(h))) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError('Provide a width and/or height in pixels', 400));
    }

    const validFits = ['inside', 'cover', 'fill', 'contain'];
    const fitMode = validFits.includes(fit) ? fit : 'inside';

    const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
    const outPath = path.join(UPLOADS_PATH, `resized_${uuidv4()}${ext}`);

    await sharp(inputPath)
      .resize({ width: w, height: h, fit: fitMode as any })
      .toFile(outPath);

    await ActivityModel.create({ userId: req.user.id, operation: 'Image Resize', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, `resized_${req.file.originalname}`, () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Rotate / flip image
// @route POST /api/image/rotate
export const rotateImage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No image uploaded', 400));

    const { angle = '90', flip = 'none' } = req.body;
    const deg = parseInt(angle);
    if (isNaN(deg)) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError('Angle must be a number', 400));
    }

    const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
    const outPath = path.join(UPLOADS_PATH, `rotated_${uuidv4()}${ext}`);

    let pipeline = sharp(inputPath).rotate(deg);
    if (flip === 'horizontal') pipeline = pipeline.flop();
    else if (flip === 'vertical') pipeline = pipeline.flip();
    else if (flip === 'both') pipeline = pipeline.flip().flop();

    await pipeline.toFile(outPath);

    await ActivityModel.create({ userId: req.user.id, operation: 'Image Rotate', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, `rotated_${req.file.originalname}`, () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Apply effects to image (grayscale, blur, sharpen, negate, tint)
// @route POST /api/image/effects
export const imageEffects = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No image uploaded', 400));

    const { effect = 'grayscale', intensity = '5' } = req.body;
    const amount = Math.min(50, Math.max(1, parseInt(intensity) || 5));

    const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
    const outPath = path.join(UPLOADS_PATH, `effect_${uuidv4()}${ext}`);

    let pipeline = sharp(inputPath);
    switch (effect) {
      case 'grayscale': pipeline = pipeline.grayscale(); break;
      case 'blur': pipeline = pipeline.blur(amount); break;
      case 'sharpen': pipeline = pipeline.sharpen({ sigma: Math.min(10, amount) }); break;
      case 'negate': pipeline = pipeline.negate(); break;
      case 'sepia': pipeline = pipeline.recomb([
        [0.393, 0.769, 0.189],
        [0.349, 0.686, 0.168],
        [0.272, 0.534, 0.131],
      ]); break;
      default:
        fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
        return next(createError(`Effect ${effect} is not supported`, 400));
    }

    await pipeline.toFile(outPath);

    await ActivityModel.create({ userId: req.user.id, operation: 'Image Effects', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, `${effect}_${req.file.originalname}`, () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Crop image
// @route POST /api/image/crop
export const cropImage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No image uploaded', 400));

    const { left = '0', top = '0', width, height } = req.body;
    const l = parseInt(left) || 0;
    const t = parseInt(top) || 0;
    const w = parseInt(width);
    const h = parseInt(height);

    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError('Crop width and height are required (in pixels)', 400));
    }

    const meta = await sharp(inputPath).metadata();
    if (meta.width && meta.height && (l + w > meta.width || t + h > meta.height)) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError(`Crop area is outside the image (${meta.width}x${meta.height})`, 400));
    }

    const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
    const outPath = path.join(UPLOADS_PATH, `cropped_${uuidv4()}${ext}`);

    await sharp(inputPath)
      .extract({ left: l, top: t, width: w, height: h })
      .toFile(outPath);

    await ActivityModel.create({ userId: req.user.id, operation: 'Image Crop', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, `cropped_${req.file.originalname}`, () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Add a text watermark to an image
// @route POST /api/image/watermark
export const watermarkImage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No image uploaded', 400));

    const { text = 'WATERMARK', fontSize = '48', color = '#ffffff', opacity = '0.5', position = 'center' } = req.body;
    const size = Math.min(300, Math.max(8, parseInt(fontSize) || 48));
    const alpha = Math.min(1, Math.max(0, parseFloat(opacity) || 0.5));

    const meta = await sharp(inputPath).metadata();
    const imgW = meta.width || 800;
    const imgH = meta.height || 600;

    const safeText = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    let anchor = 'middle';
    let x = imgW / 2;
    let y = imgH / 2;
    if (position === 'top-left') { anchor = 'start'; x = 30; y = size + 20; }
    else if (position === 'top-right') { anchor = 'end'; x = imgW - 30; y = size + 20; }
    else if (position === 'bottom-left') { anchor = 'start'; x = 30; y = imgH - 30; }
    else if (position === 'bottom-right') { anchor = 'end'; x = imgW - 30; y = imgH - 30; }

    const svg = Buffer.from(
      `<svg width="${imgW}" height="${imgH}" xmlns="http://www.w3.org/2000/svg">` +
      `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial, sans-serif" font-weight="bold" ` +
      `font-size="${size}" fill="${color}" fill-opacity="${alpha}">${safeText}</text></svg>`
    );

    const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
    const outPath = path.join(UPLOADS_PATH, `watermarked_${uuidv4()}${ext}`);

    await sharp(inputPath)
      .composite([{ input: svg, top: 0, left: 0 }])
      .toFile(outPath);

    await ActivityModel.create({ userId: req.user.id, operation: 'Image Watermark', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, `watermarked_${req.file.originalname}`, () => {
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
