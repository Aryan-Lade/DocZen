import { Router } from 'express';
import { detectLanguage } from '../controllers/languageController';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();
router.use(protect, uploadLimiter);

router.post('/detect', upload.single('file'), detectLanguage);

export default router;
