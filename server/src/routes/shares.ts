import { Router } from 'express';
import { createShare, getShareInfo, downloadSharedFile, getMyShares, revokeShare } from '../controllers/shareController';
import { protect } from '../middlewares/auth';

const router = Router();

// Public endpoints
router.get('/info/:token', getShareInfo);
router.get('/download/:token', downloadSharedFile);

// Protected endpoints
router.use(protect);
router.post('/create', createShare);
router.get('/my-shares', getMyShares);
router.delete('/:id', revokeShare);

export default router;
