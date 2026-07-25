import { Router } from 'express';
import {
  mergePDFs, splitPDF, compressPDF, protectPDF, unlockPDF,
  reorderPDF, rotatePDF, addWatermark, addPageNumbers,
  addTextToPDF, deletePages, extractPages, editMetadata, duplicatePDF,
} from '../controllers/pdfController';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();
router.use(protect, uploadLimiter);

router.post('/merge', upload.array('files', 20), mergePDFs);
router.post('/split', upload.single('file'), splitPDF);
router.post('/compress', upload.single('file'), compressPDF);
router.post('/protect', upload.single('file'), protectPDF);
router.post('/unlock', upload.single('file'), unlockPDF);
router.post('/reorder', upload.single('file'), reorderPDF);
router.post('/rotate', upload.single('file'), rotatePDF);
router.post('/watermark', upload.single('file'), addWatermark);
router.post('/number-pages', upload.single('file'), addPageNumbers);
router.post('/add-text', upload.single('file'), addTextToPDF);
router.post('/delete-pages', upload.single('file'), deletePages);
router.post('/extract-pages', upload.single('file'), extractPages);
router.post('/metadata', upload.single('file'), editMetadata);
router.post('/duplicate', upload.single('file'), duplicatePDF);

export default router;
