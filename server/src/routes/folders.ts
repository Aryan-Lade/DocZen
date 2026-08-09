import { Router } from 'express';
import {
  createFolder,
  getFolders,
  getFolderContents,
  renameFolder,
  deleteFolder,
  shareFolder,
  getFolderShares,
  revokeFolderShare,
} from '../controllers/folderController';
import { protect } from '../middlewares/auth';

const router = Router();

router.use(protect);

router.post('/', createFolder);
router.get('/', getFolders);
router.get('/:id', getFolderContents);
router.put('/:id', renameFolder);
router.delete('/:id', deleteFolder);

router.post('/:id/share', shareFolder);
router.get('/:id/shares', getFolderShares);
router.delete('/shares/:shareId', revokeFolderShare);

export default router;
