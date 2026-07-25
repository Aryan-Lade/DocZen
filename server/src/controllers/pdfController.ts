import { Response, NextFunction } from 'express';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
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

// Helper: parse hex color safely
const parseHexColor = (hex: string): { r: number; g: number; b: number } => {
  const defaultColor = { r: 0, g: 0, b: 0 }; // black fallback
  if (!hex || typeof hex !== 'string') return defaultColor;
  
  let cleanHex = hex.trim().replace(/^#/, '');
  
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  
  if (cleanHex.length !== 6) return defaultColor;
  
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) return defaultColor;
  
  return { r: r / 255, g: g / 255, b: b / 255 };
};

const UPLOADS_ROOT = `${path.resolve(UPLOADS_PATH)}${path.sep}`;
const isWithinUploads = (filePath: string): boolean => path.resolve(filePath).startsWith(UPLOADS_ROOT);
const safeUnlink = (filePath?: string): void => {
  if (!filePath || !isWithinUploads(filePath)) return;
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
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
      try {
        const order: number[] = JSON.parse(req.body.order);
        orderedFiles = order.map((i) => {
          const idx = parseInt(i as any);
          if (isNaN(idx) || idx < 0 || idx >= files.length) {
            throw new Error(`Invalid file index ${idx}`);
          }
          return files[idx];
        });
      } catch (err: any) {
        files.forEach((file) => fs.existsSync(file.path) && fs.unlinkSync(file.path));
        return next(createError(err.message || 'Invalid file order JSON format', 400));
      }
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
      userId: req.user.id,
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
      
      if (isNaN(start) || isNaN(end) || start < 0 || end >= total || start > end) {
        fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
        return next(createError(`Invalid page range. Start and end must be between 1 and ${total}`, 400));
      }
      
      pageRanges = [Array.from({ length: end - start + 1 }, (_, i) => start + i)];
    } else if (mode === 'custom' && pages) {
      const selected: number[] = String(pages)
        .split(',')
        .map((p) => parseInt(p.trim()) - 1)
        .filter((p) => !isNaN(p) && p >= 0 && p < total);
      
      if (selected.length === 0) {
        fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
        return next(createError(`No valid pages selected for split. Total pages: ${total}`, 400));
      }
      pageRanges = [selected];
    } else {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError('Invalid split mode or parameters missing', 400));
    }

    const outPaths: string[] = [];
    for (const range of pageRanges) {
      const newPdf = await PDFDocument.create();
      const copied = await newPdf.copyPages(srcPdf, range);
      copied.forEach((page) => newPdf.addPage(page));
      outPaths.push(await savePDF(newPdf, 'split'));
    }

    if (outPaths.length === 1) {
      await ActivityModel.create({ userId: req.user.id, operation: 'PDF Split', fileName: req.file.originalname, status: 'success' });
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

// @desc  Compress PDF
// @route POST /api/pdf/compress
// Body (optional): mode = 'percent' | 'size'
//   - percent: targetPercent (how much to reduce, 1–99)  → target = original * (1 - pct/100)
//   - size:    targetBytes   (absolute target size in bytes)
// Compression is best-effort: Ghostscript presets are tried from highest to lowest
// quality and the highest-quality result that meets the target is returned. If none
// meet it, the smallest achievable result is returned. Sizes are reported via headers.
export const compressPDF = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const rawInputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file || !rawInputPath) return next(createError('No PDF file uploaded', 400));
    const inputPath = path.resolve(rawInputPath);
    if (!isWithinUploads(inputPath)) return next(createError('Invalid upload path', 400));

    const originalSize = fs.statSync(inputPath).size;

    // Resolve the requested target size in bytes (null = no explicit target).
    const { mode, targetBytes, targetPercent } = req.body;
    let target: number | null = null;
    if (mode === 'size' && targetBytes != null) {
      const t = parseInt(targetBytes, 10);
      if (!isNaN(t) && t > 0) target = t;
    } else if (mode === 'percent' && targetPercent != null) {
      const p = parseFloat(targetPercent);
      if (!isNaN(p) && p > 0 && p < 100) target = Math.round(originalSize * (1 - p / 100));
    }

    const ghostscriptPath = process.env.GHOSTSCRIPT_PATH || 'gs';

    // Run Ghostscript with a single quality preset → resolves to {path,size} or null on failure.
    const runGs = (preset: string): Promise<{ path: string; size: number } | null> =>
      new Promise((resolve) => {
        const out = path.resolve(path.join(UPLOADS_PATH, `compressed_${uuidv4()}.pdf`));
        if (!isWithinUploads(out)) return resolve(null);
        const args = [
          '-sDEVICE=pdfwrite',
          '-dCompatibilityLevel=1.4',
          `-dPDFSETTINGS=${preset}`,
          '-dNOPAUSE',
          '-dQUIET',
          '-dBATCH',
          `-sOutputFile=${out}`,
          inputPath,
        ];
        execFile(ghostscriptPath, args, (error: any) => {
          if (error || !fs.existsSync(out)) return resolve(null);
          resolve({ path: out, size: fs.statSync(out).size });
        });
      });

    // With a target, sweep presets from highest to most aggressive quality and stop at the
    // first that meets it. Without a target, keep the original single /screen behaviour.
    const presets = target !== null
      ? ['/prepress', '/printer', '/ebook', '/screen']
      : ['/screen'];

    let best: { path: string; size: number } | null = null;
    for (const preset of presets) {
      const r = await runGs(preset);
      if (!r) continue;
      if (!best) {
        best = r;
      } else if (r.size < best.size) {
        safeUnlink(best.path); // discard the larger result
        best = r;
      } else {
        safeUnlink(r.path);       // this preset didn't help
      }
      if (target !== null && best.size <= target) break;      // met target at best quality → done
    }

    // Fallback: Ghostscript unavailable/failed → compress with pdf-lib object streams.
    let outPath: string;
    if (best) {
      outPath = best.path;
    } else {
      outPath = path.resolve(path.join(UPLOADS_PATH, `compressed_${uuidv4()}.pdf`));
      if (!isWithinUploads(outPath)) {
        safeUnlink(inputPath);
        return next(createError('Invalid output path', 500));
      }
      try {
        const bytes = fs.readFileSync(inputPath);
        const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const compressed = await pdfDoc.save({ useObjectStreams: true });
        fs.writeFileSync(outPath, compressed);
      } catch (fallbackError) {
        safeUnlink(inputPath);
        return next(createError('PDF compression failed: ' + String(fallbackError), 500));
      }
    }

    const compressedSize = fs.statSync(outPath).size;

    await ActivityModel.create({
      userId: req.user.id,
      operation: 'PDF Compress',
      fileName: req.file!.originalname,
      status: 'success',
      fileSize: compressedSize,
      details: target !== null
        ? `Target ${(target / 1024).toFixed(0)}KB · ${originalSize} → ${compressedSize} bytes`
        : `${originalSize} → ${compressedSize} bytes`,
    });

    // Surface the numbers to the client (also exposed via CORS in index.ts).
    res.setHeader('X-Original-Size', String(originalSize));
    res.setHeader('X-Compressed-Size', String(compressedSize));
    res.setHeader('X-Target-Bytes', target !== null ? String(target) : '');
    res.setHeader('X-Target-Met', target !== null ? String(compressedSize <= target) : 'true');

    res.download(outPath, 'compressed.pdf', () => {
      safeUnlink(inputPath);
      safeUnlink(outPath);
    });
  } catch (error) {
    safeUnlink(rawInputPath);
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

    const outPath = path.join(UPLOADS_PATH, `protected_${uuidv4()}.pdf`);

    const { exec } = require('child_process');
    const ghostscriptPath = process.env.GHOSTSCRIPT_PATH || 'gs';
    
    // Ghostscript command to password-protect/encrypt PDF
    const command = `"${ghostscriptPath}" -q -dNOPAUSE -dBATCH -sDEVICE=pdfwrite -sOwnerPassword="${password}" -sUserPassword="${password}" -dEncryptionR=3 -dKeyLength=128 -dPermissions=-4 -sOutputFile="${outPath}" "${inputPath}"`;

    exec(command, async (error: any, stdout: string, stderr: string) => {
      if (error) {
        console.error('Ghostscript error:', error, stderr);
        fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
        return res.status(500).json({
          success: false,
          message: 'PDF protection failed. Please ensure Ghostscript is installed and configured on the server.',
          error: stderr || error.message,
        });
      }

      await ActivityModel.create({ userId: req.user.id, operation: 'PDF Protect', fileName: req.file!.originalname, status: 'success' });

      res.download(outPath, 'protected.pdf', () => {
        fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
        fs.existsSync(outPath) && fs.unlinkSync(outPath);
      });
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

    await ActivityModel.create({ userId: req.user.id, operation: 'PDF Unlock', fileName: req.file.originalname, status: 'success' });

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

    let pageOrder: number[];
    try {
      pageOrder = JSON.parse(order).map((p: any) => parseInt(p) - 1);
    } catch (e) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError('Invalid page order format. Must be a JSON array of page numbers.', 400));
    }

    const bytes = fs.readFileSync(inputPath);
    const srcPdf = await PDFDocument.load(bytes);
    const totalPages = srcPdf.getPageCount();

    // Validate pageOrder
    for (const p of pageOrder) {
      if (isNaN(p) || p < 0 || p >= totalPages) {
        fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
        return next(createError(`Invalid page number ${p + 1} in order. Must be between 1 and ${totalPages}`, 400));
      }
    }

    const newPdf = await PDFDocument.create();
    const copied = await newPdf.copyPages(srcPdf, pageOrder);
    copied.forEach((page) => newPdf.addPage(page));

    const outPath = await savePDF(newPdf, 'reordered');

    await ActivityModel.create({ userId: req.user.id, operation: 'PDF Reorder', fileName: req.file.originalname, status: 'success' });

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

    const rotationAngle = parseInt(angle);
    if (isNaN(rotationAngle) || rotationAngle % 90 !== 0) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError('Angle must be a multiple of 90 degrees', 400));
    }

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
        .filter((p) => !isNaN(p) && p >= 0 && p < totalPages);
    }

    targetPages.forEach((idx) => {
      const page = pdfDoc.getPage(idx);
      const currentAngle = page.getRotation().angle;
      page.setRotation(degrees((currentAngle + rotationAngle) % 360));
    });

    const outPath = await savePDF(pdfDoc, 'rotated');

    await ActivityModel.create({ userId: req.user.id, operation: 'PDF Rotate', fileName: req.file.originalname, status: 'success' });

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

    const parsedOpacity = parseFloat(opacity);
    const parsedFontSize = parseInt(fontSize);
    if (isNaN(parsedOpacity) || parsedOpacity < 0 || parsedOpacity > 1) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError('Opacity must be a number between 0 and 1', 400));
    }
    if (isNaN(parsedFontSize) || parsedFontSize <= 0) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError('Font size must be a positive integer', 400));
    }

    const bytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(bytes);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { r, g, b } = parseHexColor(color);

    const pages = pdfDoc.getPages();
    pages.forEach((page) => {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, parsedFontSize);
      const textHeight = font.heightAtSize(parsedFontSize);

      let x = (width - textWidth) / 2;
      let y = height / 2 - textHeight / 2;

      if (position === 'top-left') { x = 50; y = height - 80; }
      else if (position === 'top-right') { x = width - textWidth - 50; y = height - 80; }
      else if (position === 'bottom-left') { x = 50; y = 50; }
      else if (position === 'bottom-right') { x = width - textWidth - 50; y = 50; }

      page.drawText(text, {
        x, y,
        size: parsedFontSize,
        font,
        color: rgb(r, g, b),
        opacity: parsedOpacity,
        rotate: degrees(-45),
      });
    });

    const outPath = await savePDF(pdfDoc, 'watermarked');

    await ActivityModel.create({ userId: req.user.id, operation: 'PDF Watermark', fileName: req.file.originalname, status: 'success' });

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

    const parsedFontSize = parseInt(fontSize);
    if (isNaN(parsedFontSize) || parsedFontSize <= 0) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError('Font size must be a positive integer', 400));
    }

    const bytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(bytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    const { r, g, b } = parseHexColor(color);

    pages.forEach((page, i) => {
      const { width, height } = page.getSize();
      const num = style === 'roman' ? toRoman(i + 1) : String(i + 1);
      const text = `${num}`;
      const textWidth = font.widthOfTextAtSize(text, parsedFontSize);

      let x = (width - textWidth) / 2;
      let y = 20;

      if (position === 'bottom-left') { x = 30; }
      else if (position === 'bottom-right') { x = width - textWidth - 30; }
      else if (position === 'top-center') { y = height - 30; }
      else if (position === 'top-left') { x = 30; y = height - 30; }
      else if (position === 'top-right') { x = width - textWidth - 30; y = height - 30; }

      page.drawText(text, { x, y, size: parsedFontSize, font, color: rgb(r, g, b) });
    });

    const outPath = await savePDF(pdfDoc, 'numbered');

    await ActivityModel.create({ userId: req.user.id, operation: 'PDF Page Numbers', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'numbered.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Add text to PDF pages (basic PDF editing)
// @route POST /api/pdf/add-text
export const addTextToPDF = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No PDF file uploaded', 400));

    const {
      text,
      pages: pagesParam = 'all',
      position = 'center',
      fontSize = 18,
      color = '#000000',
    } = req.body;

    if (!text || !String(text).trim()) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError('Text to add is required', 400));
    }

    const parsedFontSize = parseInt(fontSize);
    if (isNaN(parsedFontSize) || parsedFontSize <= 0) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError('Font size must be a positive integer', 400));
    }

    const bytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(bytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const totalPages = pdfDoc.getPageCount();

    let targetPages: number[];
    if (pagesParam === 'all' || !pagesParam) {
      targetPages = Array.from({ length: totalPages }, (_, i) => i);
    } else {
      targetPages = String(pagesParam)
        .split(',')
        .map((p) => parseInt(p.trim()) - 1)
        .filter((p) => !isNaN(p) && p >= 0 && p < totalPages);
    }

    if (targetPages.length === 0) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError(`No valid pages selected. Total pages: ${totalPages}`, 400));
    }

    const { r, g, b } = parseHexColor(color);

    targetPages.forEach((idx) => {
      const page = pdfDoc.getPage(idx);
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, parsedFontSize);
      const textHeight = font.heightAtSize(parsedFontSize);

      let x = (width - textWidth) / 2;
      let y = height / 2 - textHeight / 2;

      if (position === 'top-left') { x = 50; y = height - 60; }
      else if (position === 'top-center') { y = height - 60; }
      else if (position === 'top-right') { x = width - textWidth - 50; y = height - 60; }
      else if (position === 'bottom-left') { x = 50; y = 40; }
      else if (position === 'bottom-center') { y = 40; }
      else if (position === 'bottom-right') { x = width - textWidth - 50; y = 40; }

      page.drawText(text, { x, y, size: parsedFontSize, font, color: rgb(r, g, b) });
    });

    const outPath = await savePDF(pdfDoc, 'edited');

    await ActivityModel.create({ userId: req.user.id, operation: 'PDF Add Text', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'edited.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Delete pages from a PDF
// @route POST /api/pdf/delete-pages
export const deletePages = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No PDF file uploaded', 400));
    const { pages } = req.body;
    if (!pages) return next(createError('Pages to delete are required', 400));

    const bytes = fs.readFileSync(inputPath);
    const srcPdf = await PDFDocument.load(bytes);
    const total = srcPdf.getPageCount();

    const toDelete = new Set(
      String(pages)
        .split(',')
        .map((p) => parseInt(p.trim()) - 1)
        .filter((p) => !isNaN(p) && p >= 0 && p < total)
    );

    if (toDelete.size === 0) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError(`No valid pages selected. Total pages: ${total}`, 400));
    }
    if (toDelete.size >= total) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError('Cannot delete every page of the PDF', 400));
    }

    const keep = Array.from({ length: total }, (_, i) => i).filter((i) => !toDelete.has(i));

    const newPdf = await PDFDocument.create();
    const copied = await newPdf.copyPages(srcPdf, keep);
    copied.forEach((page) => newPdf.addPage(page));

    const outPath = await savePDF(newPdf, 'trimmed');

    await ActivityModel.create({ userId: req.user.id, operation: 'PDF Delete Pages', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'trimmed.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Extract selected pages into a new PDF
// @route POST /api/pdf/extract-pages
export const extractPages = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No PDF file uploaded', 400));
    const { pages } = req.body;
    if (!pages) return next(createError('Pages to extract are required', 400));

    const bytes = fs.readFileSync(inputPath);
    const srcPdf = await PDFDocument.load(bytes);
    const total = srcPdf.getPageCount();

    const selected = String(pages)
      .split(',')
      .map((p) => parseInt(p.trim()) - 1)
      .filter((p) => !isNaN(p) && p >= 0 && p < total);

    if (selected.length === 0) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError(`No valid pages selected. Total pages: ${total}`, 400));
    }

    const newPdf = await PDFDocument.create();
    const copied = await newPdf.copyPages(srcPdf, selected);
    copied.forEach((page) => newPdf.addPage(page));

    const outPath = await savePDF(newPdf, 'extracted');

    await ActivityModel.create({ userId: req.user.id, operation: 'PDF Extract Pages', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'extracted.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Edit PDF metadata (title, author, subject, keywords)
// @route POST /api/pdf/metadata
export const editMetadata = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No PDF file uploaded', 400));

    const { title, author, subject, keywords } = req.body;

    const bytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(bytes);

    if (title !== undefined && title !== '') pdfDoc.setTitle(String(title));
    if (author !== undefined && author !== '') pdfDoc.setAuthor(String(author));
    if (subject !== undefined && subject !== '') pdfDoc.setSubject(String(subject));
    if (keywords !== undefined && keywords !== '') {
      pdfDoc.setKeywords(String(keywords).split(',').map((k: string) => k.trim()).filter(Boolean));
    }

    const outPath = await savePDF(pdfDoc, 'metadata');

    await ActivityModel.create({ userId: req.user.id, operation: 'PDF Edit Metadata', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'updated.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

// @desc  Duplicate / repeat pages of a PDF n times
// @route POST /api/pdf/duplicate
export const duplicatePDF = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    if (!req.file) return next(createError('No PDF file uploaded', 400));

    const { copies = 2 } = req.body;
    const n = parseInt(copies);
    if (isNaN(n) || n < 2 || n > 20) {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError('Copies must be a number between 2 and 20', 400));
    }

    const bytes = fs.readFileSync(inputPath);
    const srcPdf = await PDFDocument.load(bytes);
    const newPdf = await PDFDocument.create();

    for (let i = 0; i < n; i++) {
      const copied = await newPdf.copyPages(srcPdf, srcPdf.getPageIndices());
      copied.forEach((page) => newPdf.addPage(page));
    }

    const outPath = await savePDF(newPdf, 'duplicated');

    await ActivityModel.create({ userId: req.user.id, operation: 'PDF Duplicate', fileName: req.file.originalname, status: 'success' });

    res.download(outPath, 'duplicated.pdf', () => {
      fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      fs.existsSync(outPath) && fs.unlinkSync(outPath);
    });
  } catch (error) {
    fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};

const toRoman = (num: number): string => {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
  }
  return result;
};
