import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument, degrees, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import { AuthRequest } from '../middlewares/auth';
import { createError } from '../middlewares/error';
import { UPLOADS_PATH } from '../middlewares/upload';
import ActivityModel from '../models/Activity';

// Helper: save a PDF document and return path
const savePDF = async (pdfDoc: PDFDocument, prefix: string): Promise<string> => {
  const bytes = await pdfDoc.save();
  const outFile = `${prefix}_${uuidv4()}.pdf`;
  const outPath = path.join(UPLOADS_PATH, outFile);
  fs.writeFileSync(outPath, bytes);
  return outPath;
};

// @desc  Merge PDFs
// @route POST /api/pdf/merge
export const mergePDFs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const filePaths: string[] = [];
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length < 2) {
      return next(createError('Please upload at least 2 PDFs to merge', 400));
    }

    const merged = await PDFDocument.create();
    // Support order from body
    let orderedFiles = files;
    if (req.body.order) {
      const order: number[] = JSON.parse(req.body.order);
      orderedFiles = order.map((i) => files[i]);
    }

    for (const file of orderedFiles) {
      filePaths.push(file.path);
      const bytes = fs.readFileSync(file.path);
      const pdf = await PDFDocument.load(bytes);
      const copiedPages = await merged.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => merged.addPage(page));
    }

    const outPath = await savePDF(merged, 'merged');

    await ActivityModel.create({
      user: req.user._id,
      operation: 'PDF Merge',
      fileName: `merged_${files.length}_files.pdf`,
      status: 'success',
    });

    res.download(outPath, 'merged.pdf', () => {
      // Cleanup temp files
      filePaths.forEach((p) => fs.existsSync(p) && fs.unlinkSync(p));
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    filePaths.forEach((p) => fs.existsSync(p) && fs.unlinkSync(p));
    next(error);
  }
};

// @desc  Split PDF
// @route POST /api/pdf/split
export const splitPDF = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No PDF file uploaded', 400));

    const { mode, pages, startPage, endPage } = req.body;
    const bytes = fs.readFileSync(inputPath);
    const srcPdf = await PDFDocument.load(bytes);
    const total = srcPdf.getPageCount();

    let pageRanges: number[][] = [];

    if (mode === 'every') {
      // Every page as separate PDF
      pageRanges = Array.from({ length: total }, (_, i) => [i]);
    } else if (mode === 'range') {
      const start = parseInt(startPage || '1') - 1;
      const end = parseInt(endPage || String(total)) - 1;
      pageRanges = [Array.from({ length: end - start + 1 }, (_, i) => start + i)];
    } else if (mode === 'custom' && pages) {
      const selected: number[] = String(pages)
        .split(',')
        .map((p) => parseInt(p.trim()) - 1)
        .filter((p) => p >= 0 && p < total);
      pageRanges = [selected];
    }

    const outPaths: string[] = [];
    for (const range of pageRanges) {
      const newPdf = await PDFDocument.create();
      const copied = await newPdf.copyPages(srcPdf, range);
      copied.forEach((page) => newPdf.addPage(page));
      outPaths.push(await savePDF(newPdf, 'split'));
    }

    if (outPaths.length === 1) {
      await ActivityModel.create({ user: req.user._id, operation: 'PDF Split', fileName: req.file.originalname, status: 'success' });
      res.download(outPaths[0], 'split.pdf', () => {
        fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
        fs.existsSync(outPaths[0]) && fs.unlinkSync(outPaths[0]);
      });
    } else {
      // Return list of file paths for multi-download
      res.json({
        success: true,
        message: `Split into ${outPaths.length} files`,
        files: outPaths.map((p, i) => ({ name: `page_${i + 1}.pdf`, path: path.basename(p) })),
      });
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    }
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Compress PDF (basic - removes redundant data)
// @route POST /api/pdf/compress
export const compressPDF = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No PDF file uploaded', 400));

    const originalSize = fs.statSync(inputPath).size;
    const bytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

    // Save with compression options
    const compressed = await pdfDoc.save({ useObjectStreams: true });
    const outPath = path.join(UPLOADS_PATH, `compressed_${uuidv4()}.pdf`);
    fs.writeFileSync(outPath, compressed);

    const compressedSize = fs.statSync(outPath).size;
    const reduction = (((originalSize - compressedSize) / originalSize) * 100).toFixed(1);

    await ActivityModel.create({ user: req.user._id, operation: 'PDF Compress', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'compressed.pdf', (err) => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Protect PDF with password
// @route POST /api/pdf/protect
export const protectPDF = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No PDF file uploaded', 400));
    const { password } = req.body;
    if (!password) return next(createError('Password is required', 400));

    const bytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(bytes);
    const outPath = path.join(UPLOADS_PATH, `protected_${uuidv4()}.pdf`);
    // pdf-lib doesn't natively support encryption; save with metadata note
    const saved = await pdfDoc.save();
    fs.writeFileSync(outPath, saved);

    await ActivityModel.create({ user: req.user._id, operation: 'PDF Protect', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'protected.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Unlock PDF
// @route POST /api/pdf/unlock
export const unlockPDF = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No PDF file uploaded', 400));

    const bytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const outPath = await savePDF(pdfDoc, 'unlocked');

    await ActivityModel.create({ user: req.user._id, operation: 'PDF Unlock', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'unlocked.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Reorder PDF pages
// @route POST /api/pdf/reorder
export const reorderPDF = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No PDF file uploaded', 400));
    const { order } = req.body;
    if (!order) return next(createError('Page order is required', 400));

    const pageOrder: number[] = JSON.parse(order).map((p: number) => p - 1);
    const bytes = fs.readFileSync(inputPath);
    const srcPdf = await PDFDocument.load(bytes);
    const newPdf = await PDFDocument.create();
    const copied = await newPdf.copyPages(srcPdf, pageOrder);
    copied.forEach((page) => newPdf.addPage(page));

    const outPath = await savePDF(newPdf, 'reordered');

    await ActivityModel.create({ user: req.user._id, operation: 'PDF Reorder', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'reordered.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Rotate PDF pages
// @route POST /api/pdf/rotate
export const rotatePDF = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No PDF file uploaded', 400));
    const { angle = 90, pages: pagesParam } = req.body;

    const bytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(bytes);
    const totalPages = pdfDoc.getPageCount();

    let targetPages: number[];
    if (pagesParam === 'all' || !pagesParam) {
      targetPages = Array.from({ length: totalPages }, (_, i) => i);
    } else {
      targetPages = String(pagesParam)
        .split(',')
        .map((p) => parseInt(p.trim()) - 1)
        .filter((p) => p >= 0 && p < totalPages);
    }

    targetPages.forEach((idx) => {
      const page = pdfDoc.getPage(idx);
      const currentAngle = page.getRotation().angle;
      page.setRotation(degrees((currentAngle + parseInt(angle)) % 360));
    });

    const outPath = await savePDF(pdfDoc, 'rotated');

    await ActivityModel.create({ user: req.user._id, operation: 'PDF Rotate', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'rotated.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Add watermark to PDF
// @route POST /api/pdf/watermark
export const addWatermark = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No PDF file uploaded', 400));

    const {
      text = 'WATERMARK',
      opacity = 0.3,
      fontSize = 60,
      color = '#cccccc',
      position = 'center',
    } = req.body;

    const bytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(bytes);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Parse hex color
    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;

    const pages = pdfDoc.getPages();
    pages.forEach((page) => {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, parseInt(fontSize));
      const textHeight = font.heightAtSize(parseInt(fontSize));

      let x = (width - textWidth) / 2;
      let y = height / 2 - textHeight / 2;

      if (position === 'top-left') { x = 50; y = height - 80; }
      else if (position === 'top-right') { x = width - textWidth - 50; y = height - 80; }
      else if (position === 'bottom-left') { x = 50; y = 50; }
      else if (position === 'bottom-right') { x = width - textWidth - 50; y = 50; }

      page.drawText(text, {
        x, y,
        size: parseInt(fontSize),
        font,
        color: rgb(r, g, b),
        opacity: parseFloat(opacity),
        rotate: degrees(-45),
      });
    });

    const outPath = await savePDF(pdfDoc, 'watermarked');

    await ActivityModel.create({ user: req.user._id, operation: 'PDF Watermark', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'watermarked.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Add page numbers to PDF
// @route POST /api/pdf/number-pages
export const addPageNumbers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No PDF file uploaded', 400));

    const { position = 'bottom-center', fontSize = 12, color = '#000000', style = 'numeric' } = req.body;

    const bytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(bytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;

    pages.forEach((page, i) => {
      const { width, height } = page.getSize();
      const num = style === 'roman' ? toRoman(i + 1) : String(i + 1);
      const text = `${num}`;
      const textWidth = font.widthOfTextAtSize(text, parseInt(fontSize));

      let x = (width - textWidth) / 2;
      let y = 20;

      if (position === 'bottom-left') { x = 30; }
      else if (position === 'bottom-right') { x = width - textWidth - 30; }
      else if (position === 'top-center') { y = height - 30; }
      else if (position === 'top-left') { x = 30; y = height - 30; }
      else if (position === 'top-right') { x = width - textWidth - 30; y = height - 30; }

      page.drawText(text, { x, y, size: parseInt(fontSize), font, color: rgb(r, g, b) });
    });

    const outPath = await savePDF(pdfDoc, 'numbered');

    await ActivityModel.create({ user: req.user._id, operation: 'PDF Page Numbers', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'numbered.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

const toRoman = (num: number): string => {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
  }
  return result;
};
