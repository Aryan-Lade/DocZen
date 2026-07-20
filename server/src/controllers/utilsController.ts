import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { AuthRequest } from '../middlewares/auth';
import { createError } from '../middlewares/error';
import { UPLOADS_PATH } from '../middlewares/upload';
import ActivityModel from '../models/Activity';

// @desc  Generate a QR code image from text/URL
// @route POST /api/utils/qrcode
export const generateQRCode = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { text, size = '400', dark = '#000000', light = '#ffffff' } = req.body;
    if (!text || !String(text).trim()) {
      return next(createError('Text or URL for the QR code is required', 400));
    }

    const px = Math.min(2000, Math.max(100, parseInt(size) || 400));
    const outPath = path.join(UPLOADS_PATH, `qrcode_${uuidv4()}.png`);

    await QRCode.toFile(outPath, String(text), {
      width: px,
      margin: 2,
      color: { dark, light },
    });

    await ActivityModel.create({ userId: req.user.id, operation: 'QR Code', fileName: 'qrcode.png', status: 'success' });

    res.download(outPath, 'qrcode.png', () => {
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Count words / characters / lines in a text file or pasted text
// @route POST /api/utils/word-count
export const wordCount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    let text = '';
    if (req.file) {
      text = fs.readFileSync(inputPath, 'utf-8');
    } else if (req.body.text) {
      text = String(req.body.text);
    } else {
      return next(createError('Upload a text file or paste some text', 400));
    }

    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const lines = text ? text.split('\n').length : 0;
    const sentences = trimmed ? (trimmed.match(/[.!?]+(\s|$)/g) || []).length : 0;
    const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter((p) => p.trim()).length : 0;
    // Average reading speed of ~200 words per minute
    const readingTimeMin = Math.max(1, Math.ceil(words / 200));

    await ActivityModel.create({ userId: req.user.id, operation: 'Word Count', fileName: req.file?.originalname || 'pasted text', status: 'success' });

    res.json({
      success: true,
      stats: { words, characters, charactersNoSpaces, lines, sentences, paragraphs, readingTimeMin },
    });

    if (inputPath) fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
  } catch (error) {
    if (inputPath) fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Transform text case (upper/lower/title/sentence)
// @route POST /api/utils/text-case
export const textCase = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    let text = '';
    if (req.file) {
      text = fs.readFileSync(inputPath, 'utf-8');
    } else if (req.body.text) {
      text = String(req.body.text);
    } else {
      return next(createError('Upload a text file or paste some text', 400));
    }

    const { mode = 'upper' } = req.body;
    let out: string;
    switch (mode) {
      case 'upper': out = text.toUpperCase(); break;
      case 'lower': out = text.toLowerCase(); break;
      case 'title':
        out = text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
        break;
      case 'sentence':
        out = text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase());
        break;
      default:
        if (inputPath) fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
        return next(createError(`Mode ${mode} is not supported`, 400));
    }

    const outPath = path.join(UPLOADS_PATH, `text_${uuidv4()}.txt`);
    fs.writeFileSync(outPath, out, 'utf-8');

    await ActivityModel.create({ userId: req.user.id, operation: 'Text Case', fileName: req.file?.originalname || 'pasted text', status: 'success' });

    res.download(outPath, 'transformed.txt', () => {
      if (inputPath) fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    if (inputPath) fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};
