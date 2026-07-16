"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const languageController_1 = require("../controllers/languageController");
const auth_1 = require("../middlewares/auth");
const upload_1 = require("../middlewares/upload");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const router = (0, express_1.Router)();
router.use(auth_1.protect, rateLimiter_1.uploadLimiter);
router.post('/detect', upload_1.upload.single('file'), languageController_1.detectLanguage);
exports.default = router;
//# sourceMappingURL=language.js.map