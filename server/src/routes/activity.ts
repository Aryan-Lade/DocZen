import { Router } from 'express';
import { getActivity, clearActivity } from '../controllers/activityController';
import { protect } from '../middlewares/auth';

const router = Router();
router.use(protect);

router.get('/', getActivity);
router.delete('/', clearActivity);

export default router;
