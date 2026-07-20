import { Router } from 'express';
import { generateQRCode, wordCount, textCase } from '../controllers/utilsController';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();
router.use(protect, uploadLimiter);

router.post('/qrcode', upload.none(), generateQRCode);
router.post('/word-count', upload.single('file'), wordCount);
router.post('/text-case', upload.single('file'), textCase);

export default router;
