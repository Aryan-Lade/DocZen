"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fileController_1 = require("../controllers/fileController");
const auth_1 = require("../middlewares/auth");
const upload_1 = require("../middlewares/upload");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.get('/stats', fileController_1.getStats);
router.post('/upload', rateLimiter_1.uploadLimiter, upload_1.upload.array('files', 20), fileController_1.uploadFile);
router.get('/', fileController_1.getFiles);
router.get('/:id', fileController_1.getFile);
router.put('/:id/rename', fileController_1.renameFile);
router.delete('/:id', fileController_1.deleteFile);
router.get('/:id/download', fileController_1.downloadFile);
exports.default = router;
//# sourceMappingURL=files.js.map