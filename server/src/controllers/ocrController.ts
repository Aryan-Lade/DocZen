import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import Tesseract from 'tesseract.js';
import { AuthRequest } from '../middlewares/auth';
import { createError } from '../middlewares/error';
import { UPLOADS_PATH } from '../middlewares/upload';
import ActivityModel from '../models/Activity';

// @desc  Extract text from image/scanned PDF via OCR
// @route POST /api/ocr/extract
export const extractText = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No file uploaded', 400));

    const { lang = 'eng' } = req.body;

    // Run OCR
    const result = await Tesseract.recognize(inputPath, lang, {
      logger: () => {}, // suppress logs
    });

    const extractedText = result.data.text;
    const confidence = result.data.confidence;

    await ActivityModel.create({
      userId: req.user.id,
      operation: 'OCR Extract',
      fileName: req.file.originalname,
      status: 'success',
    });

    // Optionally save as text file
    const saveAsFile = req.body.saveAsFile === 'true';
    if (saveAsFile) {
      const txtPath = path.join(UPLOADS_PATH, `ocr_${Date.now()}.txt`);
      fs.writeFileSync(txtPath, extractedText);
      res.download(txtPath, 'extracted_text.txt', () => {
        fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
        fs.existsSync(txtPath) && fs.unlinkSync(txtPath);
      });
      return;
    }

    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);

    res.json({
      success: true,
      text: extractedText,
      confidence: confidence.toFixed(1),
      wordCount: extractedText.split(/\s+/).filter(Boolean).length,
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};
