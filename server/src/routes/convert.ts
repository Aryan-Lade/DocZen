import { Router } from 'express';
import { textToPdf, officeToPdf, htmlToPdf, pdfToOffice } from '../controllers/convertController';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();
router.use(protect, uploadLimiter);

router.post('/text-to-pdf', upload.single('file'), textToPdf);
router.post('/office-to-pdf', upload.single('file'), officeToPdf);
router.post('/pdf-to-office', upload.single('file'), pdfToOffice);
router.post('/html-to-pdf', upload.single('file'), htmlToPdf);

export default router;
