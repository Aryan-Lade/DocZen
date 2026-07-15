import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { AuthRequest } from '../middlewares/auth';
import { createError } from '../middlewares/error';
import { UPLOADS_PATH } from '../middlewares/upload';
import ActivityModel from '../models/Activity';

// Helper: create a simple PDF from text
const textToPdfBytes = async (text: string): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
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
        page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
        y -= lineHeight;
        currentLine = word;
        if (y < margin + lineHeight) {
          page = pdfDoc.addPage();
          y = height - margin;
        }
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    }
    y -= lineHeight;
  }

  return pdfDoc.save();
};

// @desc  Convert Text to PDF
// @route POST /api/convert/text-to-pdf
export const textToPdf = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No file uploaded', 400));

    const text = fs.readFileSync(inputPath, 'utf-8');
    const bytes = await textToPdfBytes(text);
    const outPath = path.join(UPLOADS_PATH, `converted_${uuidv4()}.pdf`);
    fs.writeFileSync(outPath, bytes);

    await ActivityModel.create({ user: req.user._id, operation: 'Text to PDF', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'converted.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Convert Word/Excel/PPT to PDF (requires LibreOffice)
// @route POST /api/convert/office-to-pdf
export const officeToPdf = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No file uploaded', 400));

    const { exec } = require('child_process');
    const libreOfficePath = process.env.LIBREOFFICE_PATH || 'libreoffice';

    const command = `"${libreOfficePath}" --headless --convert-to pdf --outdir "${UPLOADS_PATH}" "${inputPath}"`;

    exec(command, async (error: any, stdout: string, stderr: string) => {
      if (error) {
        fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
        return res.status(500).json({
          success: false,
          message: 'LibreOffice conversion failed. Please ensure LibreOffice is installed on the server.',
          error: stderr,
        });
      }

      const baseName = path.basename(inputPath, path.extname(inputPath));
      const outPath = path.join(UPLOADS_PATH, `${baseName}.pdf`);

      await ActivityModel.create({ user: req.user._id, operation: 'Office to PDF', fileName: req.file!.originalname, status: 'success' });

      res.download(outPath, 'converted.pdf', () => {
        fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
        fs.existsSync(outPath) && fs.unlinkSync(outPath);
      });
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Convert HTML to PDF (using pdf-lib for simple HTML)
// @route POST /api/convert/html-to-pdf
export const htmlToPdf = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No HTML file uploaded', 400));

    // Strip HTML tags for basic conversion
    const htmlContent = fs.readFileSync(inputPath, 'utf-8');
    const textContent = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    const bytes = await textToPdfBytes(textContent);
    const outPath = path.join(UPLOADS_PATH, `converted_${uuidv4()}.pdf`);
    fs.writeFileSync(outPath, bytes);

    await ActivityModel.create({ user: req.user._id, operation: 'HTML to PDF', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'converted.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};
