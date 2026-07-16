"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./config/db");
const error_1 = require("./middlewares/error");
const rateLimiter_1 = require("./middlewares/rateLimiter");
const auth_1 = __importDefault(require("./routes/auth"));
const files_1 = __importDefault(require("./routes/files"));
const pdf_1 = __importDefault(require("./routes/pdf"));
const image_1 = __importDefault(require("./routes/image"));
const ocr_1 = __importDefault(require("./routes/ocr"));
const convert_1 = __importDefault(require("./routes/convert"));
const activity_1 = __importDefault(require("./routes/activity"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Connect Database
(0, db_1.connectDB)();
// Security Middlewares
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use((0, morgan_1.default)('dev'));
}
// Rate limiting
app.use(rateLimiter_1.globalLimiter);
// Static file serving for uploads
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'DocFusion API is running', timestamp: new Date().toISOString() });
});
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/files', files_1.default);
app.use('/api/pdf', pdf_1.default);
app.use('/api/image', image_1.default);
app.use('/api/ocr', ocr_1.default);
app.use('/api/convert', convert_1.default);
app.use('/api/activity', activity_1.default);
// Error Handling
app.use(error_1.notFound);
app.use(error_1.errorHandler);
app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════╗
  ║         DocFusion API Server          ║
  ║   Running on http://localhost:${PORT}   ║
  ╚══════════════════════════════════════╝
  `);
});
exports.default = app;
//# sourceMappingURL=index.js.map