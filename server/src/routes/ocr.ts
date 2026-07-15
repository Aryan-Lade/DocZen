import { Router } from 'express';
import { extractText } from '../controllers/ocrController';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();
router.use(protect, uploadLimiter);

router.post('/extract', upload.single('file'), extractText);

export default router;
