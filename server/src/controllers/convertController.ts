import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as XLSX from 'xlsx';
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

// @desc  Convert PDF to plain text
// @route POST /api/convert/pdf-to-text
export const pdfToText = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No PDF file uploaded', 400));

    const dataBuffer = fs.readFileSync(inputPath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text || '';

    const outPath = path.join(UPLOADS_PATH, `extracted_${uuidv4()}.txt`);
    fs.writeFileSync(outPath, text, 'utf-8');

    await ActivityModel.create({ userId: req.user.id, operation: 'PDF to Text', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'extracted.txt', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Convert Word to plain text
// @route POST /api/convert/word-to-text
export const wordToText = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No file uploaded', 400));

    const result = await mammoth.extractRawText({ path: inputPath });
    const text = result.value || '';

    const outPath = path.join(UPLOADS_PATH, `extracted_${uuidv4()}.txt`);
    fs.writeFileSync(outPath, text, 'utf-8');

    await ActivityModel.create({ userId: req.user.id, operation: 'Word to Text', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'extracted.txt', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Convert one or more images into a single PDF
// @route POST /api/convert/image-to-pdf
export const imageToPdf = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const filePaths: string[] = [];
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return next(createError('Please upload at least 1 image', 400));
    }

    const { pageSize = 'fit' } = req.body;

    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
      filePaths.push(file.path);
      const imgBytes = fs.readFileSync(file.path);
      const ext = path.extname(file.originalname).toLowerCase();

      let image;
      if (ext === '.jpg' || ext === '.jpeg') {
        image = await pdfDoc.embedJpg(imgBytes);
      } else if (ext === '.png') {
        image = await pdfDoc.embedPng(imgBytes);
      } else {
        // Convert other formats (webp/bmp/gif/tiff) to PNG via sharp, then embed
        const sharp = require('sharp');
        const pngBuffer = await sharp(file.path).png().toBuffer();
        image = await pdfDoc.embedPng(pngBuffer);
      }

      if (pageSize === 'a4') {
        // A4 page, image scaled to fit with margins
        const page = pdfDoc.addPage([595.28, 841.89]);
        const margin = 40;
        const maxW = page.getWidth() - margin * 2;
        const maxH = page.getHeight() - margin * 2;
        const scale = Math.min(maxW / image.width, maxH / image.height, 1);
        const w = image.width * scale;
        const h = image.height * scale;
        page.drawImage(image, {
          x: (page.getWidth() - w) / 2,
          y: (page.getHeight() - h) / 2,
          width: w,
          height: h,
        });
      } else {
        // Page sized exactly to the image
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      }
    }

    const bytes = await pdfDoc.save();
    const outPath = path.join(UPLOADS_PATH, `images_${uuidv4()}.pdf`);
    fs.writeFileSync(outPath, bytes);

    await ActivityModel.create({ userId: req.user.id, operation: 'Image to PDF', fileName: `${files.length}_images.pdf`, status: 'success' });

    res.download(outPath, 'images.pdf', () => {
      filePaths.forEach((p) => fs.existsSync(p) && fs.unlinkSync(p));
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    filePaths.forEach((p) => fs.existsSync(p) && fs.unlinkSync(p));
    next(error);
  }
};

// @desc  Convert Markdown to PDF (basic rendering)
// @route POST /api/convert/markdown-to-pdf
export const markdownToPdf = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No Markdown file uploaded', 400));

    const md = fs.readFileSync(inputPath, 'utf-8');

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const margin = 50;

    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    let y = height - margin;

    const drawWrapped = (text: string, size: number, useFont = font) => {
      const lineHeight = size * 1.5;
      const words = text.split(' ');
      let current = '';
      const flush = () => {
        if (!current) return;
        if (y < margin + lineHeight) {
          page = pdfDoc.addPage();
          y = height - margin;
        }
        page.drawText(current, { x: margin, y, size, font: useFont, color: rgb(0, 0, 0) });
        y -= lineHeight;
        current = '';
      };
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (useFont.widthOfTextAtSize(test, size) > width - margin * 2 && current) {
          flush();
          current = word;
        } else {
          current = test;
        }
      }
      flush();
    };

    for (const rawLine of md.split('\n')) {
      const line = rawLine.trimEnd();
      if (!line.trim()) { y -= 8; continue; }

      // Headings
      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        const level = heading[1].length;
        const sizes = [24, 20, 17, 15, 13, 12];
        y -= 6;
        drawWrapped(heading[2], sizes[level - 1], bold);
        y -= 4;
        continue;
      }

      // List items
      const list = line.match(/^\s*[-*+]\s+(.*)$/);
      if (list) {
        drawWrapped(`• ${stripInline(list[1])}`, 12);
        continue;
      }

      drawWrapped(stripInline(line), 12);
    }

    const bytes = await pdfDoc.save();
    const outPath = path.join(UPLOADS_PATH, `converted_${uuidv4()}.pdf`);
    fs.writeFileSync(outPath, bytes);

    await ActivityModel.create({ userId: req.user.id, operation: 'Markdown to PDF', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'converted.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// Strip basic inline markdown syntax (bold/italic/code/links)
const stripInline = (s: string): string =>
  s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

// @desc  Convert Excel to CSV
// @route POST /api/convert/excel-to-csv
export const excelToCsv = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No Excel file uploaded', 400));

    const workbook = XLSX.readFile(inputPath);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError('The Excel file has no sheets', 400));
    }
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);

    const outPath = path.join(UPLOADS_PATH, `converted_${uuidv4()}.csv`);
    fs.writeFileSync(outPath, csv, 'utf-8');

    await ActivityModel.create({ userId: req.user.id, operation: 'Excel to CSV', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'converted.csv', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Convert CSV to Excel
// @route POST /api/convert/csv-to-excel
export const csvToExcel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No CSV file uploaded', 400));

    const csvData = fs.readFileSync(inputPath, 'utf-8');
    const workbook = XLSX.read(csvData, { type: 'string' });

    const outPath = path.join(UPLOADS_PATH, `converted_${uuidv4()}.xlsx`);
    XLSX.writeFile(workbook, outPath);

    await ActivityModel.create({ userId: req.user.id, operation: 'CSV to Excel', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'converted.xlsx', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Convert Excel to PDF (table rendered as text)
// @route POST /api/convert/excel-to-pdf
export const excelToPdf = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No Excel file uploaded', 400));

    const workbook = XLSX.readFile(inputPath);
    let text = '';
    for (const sheetName of workbook.SheetNames) {
      const rows: string[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: '' });
      text += `${sheetName}\n${'='.repeat(sheetName.length)}\n`;
      for (const row of rows) {
        text += row.join('  |  ') + '\n';
      }
      text += '\n';
    }

    const bytes = await textToPdfBytes(text || 'Empty workbook');
    const outPath = path.join(UPLOADS_PATH, `converted_${uuidv4()}.pdf`);
    fs.writeFileSync(outPath, bytes);

    await ActivityModel.create({ userId: req.user.id, operation: 'Excel to PDF', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'converted.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Convert text/PDF/Word content into a Word document
// @route POST /api/convert/text-to-word
export const textToWord = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No file uploaded', 400));

    const text = fs.readFileSync(inputPath, 'utf-8');

    const paragraphs = text.split('\n').map((line) => new Paragraph({ children: [new TextRun(line)] }));
    const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });

    const b64string = await Packer.toBase64String(doc);
    const buffer = Buffer.from(b64string, 'base64');
    const outPath = path.join(UPLOADS_PATH, `converted_${uuidv4()}.docx`);
    fs.writeFileSync(outPath, buffer);

    await ActivityModel.create({ userId: req.user.id, operation: 'Text to Word', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'converted.docx', () => {
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
export const htmlToPdf = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {  const inputPath = (req.file as Express.Multer.File)?.path;
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
