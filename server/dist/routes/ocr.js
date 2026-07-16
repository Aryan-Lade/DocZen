"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ocrController_1 = require("../controllers/ocrController");
const auth_1 = require("../middlewares/auth");
const upload_1 = require("../middlewares/upload");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const router = (0, express_1.Router)();
router.use(auth_1.protect, rateLimiter_1.uploadLimiter);
router.post('/extract', upload_1.upload.single('file'), ocrController_1.extractText);
exports.default = router;
//# sourceMappingURL=ocr.js.map