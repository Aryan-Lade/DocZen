"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectLanguage = void 0;
const fs_1 = __importDefault(require("fs"));
const franc_1 = __importDefault(require("franc"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const error_1 = require("../middlewares/error");
const Activity_1 = __importDefault(require("../models/Activity"));
// ISO 639-3 code -> human readable language name (common languages)
const LANGUAGE_NAMES = {
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
const codeToLanguage = (code) => {
    const known = LANGUAGE_NAMES[code];
    return {
        code,
        name: known ? known.name : code.toUpperCase(),
        native: known ? known.native : '',
    };
};
// Helper: extract plain text from an uploaded file (txt, html, pdf)
const extractFileText = async (filePath, mimetype) => {
    if (mimetype === 'application/pdf') {
        const buffer = fs_1.default.readFileSync(filePath);
        const data = await (0, pdf_parse_1.default)(buffer);
        return data.text;
    }
    // text/plain, text/html — read as UTF-8, strip HTML tags if present
    const raw = fs_1.default.readFileSync(filePath, 'utf-8');
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
const detectLanguage = async (req, res, next) => {
    const inputPath = req.file?.path;
    try {
        let text = req.body.text || '';
        let sourceName = 'text input';
        if (req.file) {
            const allowed = ['text/plain', 'text/html', 'application/pdf'];
            if (!allowed.includes(req.file.mimetype)) {
                inputPath && fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
                return next((0, error_1.createError)('Only TXT, HTML and PDF files are supported for language detection', 400));
            }
            text = await extractFileText(inputPath, req.file.mimetype);
            sourceName = req.file.originalname;
        }
        text = String(text).trim();
        if (!text) {
            inputPath && fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
            return next((0, error_1.createError)('Please provide text or upload a file with readable text', 400));
        }
        if (text.length < 10) {
            inputPath && fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
            return next((0, error_1.createError)('Text is too short for reliable detection. Provide at least 10 characters.', 400));
        }
        // Analyze a sample (franc works well on a few thousand chars, keeps large PDFs fast)
        const sample = text.slice(0, 5000);
        const results = franc_1.default.all(sample, { minLength: 10 });
        if (!results.length || results[0][0] === 'und') {
            inputPath && fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
            return next((0, error_1.createError)('Could not detect language. Text may be too short or ambiguous.', 422));
        }
        const [topCode, topScore] = results[0];
        const candidates = results.slice(0, 5).map(([code, score]) => ({
            ...codeToLanguage(code),
            confidence: Math.round(score * 1000) / 10, // percentage with 1 decimal
        }));
        await Activity_1.default.create({
            userId: req.user.id,
            operation: 'Language Detection',
            fileName: sourceName,
            status: 'success',
        });
        inputPath && fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
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
    }
    catch (error) {
        inputPath && fs_1.default.existsSync(inputPath) && fs_1.default.unlinkSync(inputPath);
        next(error);
    }
};
exports.detectLanguage = detectLanguage;
//# sourceMappingURL=languageController.js.map