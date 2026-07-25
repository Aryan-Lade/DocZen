import { Router } from 'express';
import {
  compressImage, convertImage, pdfToImage,
  resizeImage, rotateImage, imageEffects, cropImage, watermarkImage,
} from '../controllers/imageController';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();
router.use(protect, uploadLimiter);

router.post('/compress', upload.single('file'), compressImage);
router.post('/convert', upload.single('file'), convertImage);
router.post('/pdf-to-image', upload.single('file'), pdfToImage);
router.post('/resize', upload.single('file'), resizeImage);
router.post('/rotate', upload.single('file'), rotateImage);
router.post('/effects', upload.single('file'), imageEffects);
router.post('/crop', upload.single('file'), cropImage);
router.post('/watermark', upload.single('file'), watermarkImage);

export default router;
