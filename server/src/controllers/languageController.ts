import { Response, NextFunction } from 'express';
import fs from 'fs';
import franc from 'franc';
import pdfParse from 'pdf-parse';
import { AuthRequest } from '../middlewares/auth';
import { createError } from '../middlewares/error';
import ActivityModel from '../models/Activity';

// ISO 639-3 code -> human readable language name (common languages)
const LANGUAGE_NAMES: Record<string, { name: string; native: string }> = {
  eng: { name: 'English', native: 'English' },
  hin: { name: 'Hindi', native: 'हिन्दी' },
  ben: { name: 'Bengali', native: 'বাংলা' },
  tel: { name: 'Telugu', native: 'తెలుగు' },
  mar: { name: 'Marathi', native: 'मराठी' },
  tam: { name: 'Tamil', native: 'தமிழ்' },
  urd: { name: 'Urdu', native: 'اردو' },
  guj: { name: 'Gujarati', native: 'ગુજરાતી' },
  kan: { name: 'Kannada', native: 'ಕನ್ನಡ' },
  mal: { name: 'Malayalam', native: 'മലയാളം' },
  pan: { name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  ori: { name: 'Odia', native: 'ଓଡ଼ିଆ' },
  asm: { name: 'Assamese', native: 'অসমীয়া' },
  nep: { name: 'Nepali', native: 'नेपाली' },
  spa: { name: 'Spanish', native: 'Español' },
  fra: { name: 'French', native: 'Français' },
  deu: { name: 'German', native: 'Deutsch' },
  ita: { name: 'Italian', native: 'Italiano' },
  por: { name: 'Portuguese', native: 'Português' },
  rus: { name: 'Russian', native: 'Русский' },
  jpn: { name: 'Japanese', native: '日本語' },
  kor: { name: 'Korean', native: '한국어' },
  cmn: { name: 'Chinese (Mandarin)', native: '中文' },
  arb: { name: 'Arabic', native: 'العربية' },
  tur: { name: 'Turkish', native: 'Türkçe' },
  vie: { name: 'Vietnamese', native: 'Tiếng Việt' },
  tha: { name: 'Thai', native: 'ไทย' },
  ind: { name: 'Indonesian', native: 'Bahasa Indonesia' },
  nld: { name: 'Dutch', native: 'Nederlands' },
  pol: { name: 'Polish', native: 'Polski' },
  ukr: { name: 'Ukrainian', native: 'Українська' },
  swe: { name: 'Swedish', native: 'Svenska' },
  ell: { name: 'Greek', native: 'Ελληνικά' },
  heb: { name: 'Hebrew', native: 'עברית' },
  fas: { name: 'Persian', native: 'فارسی' },
  sco: { name: 'Scots', native: 'Scots' },
};

const codeToLanguage = (code: string) => {
  const known = LANGUAGE_NAMES[code];
  return {
    code,
    name: known ? known.name : code.toUpperCase(),
    native: known ? known.native : '',
  };
};

// Helper: extract plain text from an uploaded file (txt, html, pdf)
const extractFileText = async (filePath: string, mimetype: string): Promise<string> => {
  if (mimetype === 'application/pdf') {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }
  // text/plain, text/html — read as UTF-8, strip HTML tags if present
  const raw = fs.readFileSync(filePath, 'utf-8');
  if (mimetype === 'text/html') {
    return raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
  }
  return raw;
};

// @desc  Detect language from raw text or an uploaded file (txt/html/pdf)
// @route POST /api/language/detect
export const detectLanguage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const inputPath = (req.file as Express.Multer.File)?.path;
  try {
    let text: string = req.body.text || '';
    let sourceName = 'text input';

    if (req.file) {
      const allowed = ['text/plain', 'text/html', 'application/pdf'];
      if (!allowed.includes(req.file.mimetype)) {
        inputPath && fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
        return next(createError('Only TXT, HTML and PDF files are supported for language detection', 400));
      }
      text = await extractFileText(inputPath, req.file.mimetype);
      sourceName = req.file.originalname;
    }

    text = String(text).trim();
    if (!text) {
      inputPath && fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError('Please provide text or upload a file with readable text', 400));
    }
    if (text.length < 10) {
      inputPath && fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError('Text is too short for reliable detection. Provide at least 10 characters.', 400));
    }

    // Analyze a sample (franc works well on a few thousand chars, keeps large PDFs fast)
    const sample = text.slice(0, 5000);
    const results = franc.all(sample, { minLength: 10 });

    if (!results.length || results[0][0] === 'und') {
      inputPath && fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
      return next(createError('Could not detect language. Text may be too short or ambiguous.', 422));
    }

    const [topCode, topScore] = results[0];
    const candidates = results.slice(0, 5).map(([code, score]) => ({
      ...codeToLanguage(code),
      confidence: Math.round(score * 1000) / 10, // percentage with 1 decimal
    }));

    await ActivityModel.create({
      userId: req.user.id,
      operation: 'Language Detection',
      fileName: sourceName,
      status: 'success',
    });

    inputPath && fs.existsSync(inputPath) && fs.unlinkSync(inputPath);

    res.json({
      success: true,
      detected: {
        ...codeToLanguage(topCode),
        confidence: Math.round(topScore * 1000) / 10,
      },
      candidates,
      stats: {
        characters: text.length,
        words: text.split(/\s+/).filter(Boolean).length,
        analyzedCharacters: sample.length,
      },
    });
  } catch (error) {
    inputPath && fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
    next(error);
  }
};
