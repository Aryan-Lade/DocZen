"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const imageController_1 = require("../controllers/imageController");
const auth_1 = require("../middlewares/auth");
const upload_1 = require("../middlewares/upload");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const router = (0, express_1.Router)();
router.use(auth_1.protect, rateLimiter_1.uploadLimiter);
router.post('/compress', upload_1.upload.single('file'), imageController_1.compressImage);
router.post('/convert', upload_1.upload.single('file'), imageController_1.convertImage);
router.post('/pdf-to-image', upload_1.upload.single('file'), imageController_1.pdfToImage);
exports.default = router;
//# sourceMappingURL=image.js.map