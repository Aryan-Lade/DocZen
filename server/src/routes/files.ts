import { Router } from 'express';
import { uploadFile, getFiles, getFile, renameFile, deleteFile, downloadFile, getStats } from '../controllers/fileController';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.use(protect);

router.get('/stats', getStats);
router.post('/upload', uploadLimiter, upload.array('files', 20), uploadFile);
router.get('/', getFiles);
router.get('/:id', getFile);
router.put('/:id/rename', renameFile);
router.delete('/:id', deleteFile);
router.get('/:id/download', downloadFile);

export default router;
