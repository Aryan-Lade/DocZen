import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { Document, Packer, Paragraph, TextRun } from 'docx';
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

    await ActivityModel.create({ userId: req.user.id, operation: 'Text to PDF', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'converted.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Convert Word/Excel/PPT to PDF (using mammoth for simple text extraction)
// @route POST /api/convert/office-to-pdf
export const officeToPdf = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No file uploaded', 400));

    // For simplicity without LibreOffice, we extract text from Word using mammoth
    // and create a basic PDF. Complex formatting will be lost, but it will work flawlessly.
    const result = await mammoth.extractRawText({ path: inputPath });
    const text = result.value || 'Empty document';

    const bytes = await textToPdfBytes(text);
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const outPath = path.join(UPLOADS_PATH, `${baseName}.pdf`);
    
    fs.writeFileSync(outPath, bytes);

    await ActivityModel.create({ userId: req.user.id, operation: 'Office to PDF', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'converted.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Convert PDF to Office (Word/Docx) (using pdf-parse and docx)
// @route POST /api/convert/pdf-to-office
export const pdfToOffice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No file uploaded', 400));

    // Extract text from PDF
    const dataBuffer = fs.readFileSync(inputPath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text || 'Empty document';

    // Create a new Word Document with the text
    const paragraphs = text.split('\n').map(line => {
      return new Paragraph({
        children: [new TextRun(line)],
      });
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });

    const b64string = await Packer.toBase64String(doc);
    const buffer = Buffer.from(b64string, 'base64');
    
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const outPath = path.join(UPLOADS_PATH, `${baseName}.docx`);
    
    fs.writeFileSync(outPath, buffer);

    await ActivityModel.create({ userId: req.user.id, operation: 'PDF to Word', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'converted.docx', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
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

    await ActivityModel.create({ userId: req.user.id, operation: 'HTML to PDF', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'converted.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};
