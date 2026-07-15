"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const convertController_1 = require("../controllers/convertController");
const auth_1 = require("../middlewares/auth");
const upload_1 = require("../middlewares/upload");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const router = (0, express_1.Router)();
router.use(auth_1.protect, rateLimiter_1.uploadLimiter);
router.post('/text-to-pdf', upload_1.upload.single('file'), convertController_1.textToPdf);
router.post('/office-to-pdf', upload_1.upload.single('file'), convertController_1.officeToPdf);
router.post('/html-to-pdf', upload_1.upload.single('file'), convertController_1.htmlToPdf);
exports.default = router;
//# sourceMappingURL=convert.js.map