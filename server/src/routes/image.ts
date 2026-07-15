import { Router } from 'express';
import { compressImage, convertImage, pdfToImage } from '../controllers/imageController';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();
router.use(protect, uploadLimiter);

router.post('/compress', upload.single('file'), compressImage);
router.post('/convert', upload.single('file'), convertImage);
router.post('/pdf-to-image', upload.single('file'), pdfToImage);

export default router;
