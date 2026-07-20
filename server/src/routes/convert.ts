import { Router } from 'express';
import {
  textToPdf, officeToPdf, htmlToPdf, pdfToOffice,
  pdfToText, wordToText, imageToPdf, markdownToPdf,
  excelToCsv, csvToExcel, excelToPdf, textToWord,
} from '../controllers/convertController';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();
router.use(protect, uploadLimiter);

router.post('/text-to-pdf', upload.single('file'), textToPdf);
router.post('/office-to-pdf', upload.single('file'), officeToPdf);
router.post('/pdf-to-office', upload.single('file'), pdfToOffice);
router.post('/html-to-pdf', upload.single('file'), htmlToPdf);
router.post('/pdf-to-text', upload.single('file'), pdfToText);
router.post('/word-to-text', upload.single('file'), wordToText);
router.post('/image-to-pdf', upload.array('files', 30), imageToPdf);
router.post('/markdown-to-pdf', upload.single('file'), markdownToPdf);
router.post('/excel-to-csv', upload.single('file'), excelToCsv);
router.post('/csv-to-excel', upload.single('file'), csvToExcel);
router.post('/excel-to-pdf', upload.single('file'), excelToPdf);
router.post('/text-to-word', upload.single('file'), textToWord);

export default router;
