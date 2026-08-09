import { Response, NextFunction } from 'express';
import fs from 'fs';
import { Folder } from '../models/Folder';
import { FolderShare } from '../models/FolderShare';
import { Document } from '../models/Document';
import { User } from '../models/User';
import { AuthRequest } from '../middlewares/auth';
import { createError } from '../middlewares/error';
import { Activity } from '../models/Activity';

// @desc  Create a folder
// @route POST /api/folders
export const createFolder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return next(createError('Folder name is required', 400));
    }

    const folder = await Folder.create({
      name: name.trim(),
      ownerId: req.user.id,
    });

    res.status(201).json({ success: true, folder });
  } catch (error) {
    next(error);
  }
};

// @desc  Get all folders (owned and shared with user)
// @route GET /api/folders
export const getFolders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const owned = await Folder.findAll({
      where: { ownerId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    const sharedShares = await FolderShare.findAll({
      where: { sharedWithUserId: req.user.id },
      include: [
        {
          model: Folder,
          as: 'folder',
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['name', 'email'],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const shared = sharedShares.map((s) => ({
      id: s.folder.id,
      name: s.folder.name,
      ownerId: s.folder.ownerId,
      owner: (s.folder as any).owner,
      permission: s.permission,
      shareId: s.id,
    }));

    res.json({ success: true, owned, shared });
  } catch (error) {
    next(error);
  }
};

// @desc  Get folder contents (documents)
// @route GET /api/folders/:id
export const getFolderContents = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user is owner
    let folder = await Folder.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['name', 'email'],
        },
      ],
    });

    if (!folder) {
      return next(createError('Folder not found', 404));
    }

    let permission: 'owner' | 'view' | 'upload' = 'owner';

    if (folder.ownerId !== req.user.id) {
      // Check folder share
      const share = await FolderShare.findOne({
        where: { folderId: id, sharedWithUserId: req.user.id },
      });

      if (!share) {
        return next(createError('Unauthorized to access this folder', 403));
      }

      permission = share.permission;
    }

    const documents = await Document.findAll({
      where: { folderId: id, isDeleted: false },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      folder: {
        id: folder.id,
        name: folder.name,
        ownerId: folder.ownerId,
        owner: (folder as any).owner,
        permission,
      },
      documents,
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Rename folder
// @route PUT /api/folders/:id
export const renameFolder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return next(createError('Folder name is required', 400));
    }

    const folder = await Folder.findOne({
      where: { id: req.params.id, ownerId: req.user.id },
    });

    if (!folder) {
      return next(createError('Folder not found or unauthorized', 404));
    }

    await folder.update({ name: name.trim() });

    res.json({ success: true, message: 'Folder renamed', folder });
  } catch (error) {
    next(error);
  }
};

// @desc  Delete folder and all files inside
// @route DELETE /api/folders/:id
export const deleteFolder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const folder = await Folder.findOne({
      where: { id: req.params.id, ownerId: req.user.id },
    });

    if (!folder) {
      return next(createError('Folder not found or unauthorized', 404));
    }

    // Find all files inside this folder
    const docs = await Document.findAll({
      where: { folderId: folder.id },
    });

    let reclaimedSize = 0;

    for (const doc of docs) {
      if (fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
      reclaimedSize += doc.size;
      await doc.destroy();
    }

    // Decrement user storage
    const user = await User.findByPk(req.user.id);
    if (user && reclaimedSize > 0) {
      await user.decrement('storageUsed', { by: reclaimedSize });
    }

    await folder.destroy();

    await Activity.create({
      userId: req.user.id,
      operation: 'Folder Delete',
      fileName: folder.name,
      status: 'success',
    });

    res.json({ success: true, message: 'Folder and its contents deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc  Share a folder with another user by email
// @route POST /api/folders/:id/share
export const shareFolder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, permission } = req.body;

    if (!email || !permission) {
      return next(createError('Email and permission are required', 400));
    }

    if (permission !== 'view' && permission !== 'upload') {
      return next(createError('Invalid permission. Must be view or upload', 400));
    }

    const folder = await Folder.findOne({
      where: { id: req.params.id, ownerId: req.user.id },
    });

    if (!folder) {
      return next(createError('Folder not found or unauthorized', 404));
    }

    const recipient = await User.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (!recipient) {
      return next(createError('User with this email is not registered', 404));
    }

    if (recipient.id === req.user.id) {
      return next(createError('You cannot share a folder with yourself', 400));
    }

    // Check if already shared
    let share = await FolderShare.findOne({
      where: { folderId: folder.id, sharedWithUserId: recipient.id },
    });

    if (share) {
      await share.update({ permission });
    } else {
      share = await FolderShare.create({
        folderId: folder.id,
        sharedWithUserId: recipient.id,
        permission,
      });
    }

    res.json({
      success: true,
      message: `Folder successfully shared with ${recipient.name}`,
      share,
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Get shares list for a folder
// @route GET /api/folders/:id/shares
export const getFolderShares = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const folder = await Folder.findOne({
      where: { id: req.params.id, ownerId: req.user.id },
    });

    if (!folder) {
      return next(createError('Folder not found or unauthorized', 404));
    }

    const shares = await FolderShare.findAll({
      where: { folderId: folder.id },
      include: [
        {
          model: User,
          as: 'sharedWithUser',
          attributes: ['name', 'email'],
        },
      ],
    });

    res.json({ success: true, shares });
  } catch (error) {
    next(error);
  }
};

// @desc  Revoke access to a shared folder
// @route DELETE /api/folders/shares/:shareId
export const revokeFolderShare = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const share = await FolderShare.findByPk(req.params.shareId, {
      include: [{ model: Folder, as: 'folder' }],
    });

    if (!share) {
      return next(createError('Folder share not found', 404));
    }

    // Only the folder owner or the recipient can revoke/remove the share
    if (share.folder.ownerId !== req.user.id && share.sharedWithUserId !== req.user.id) {
      return next(createError('Unauthorized to revoke this share', 403));
    }

    await share.destroy();

    res.json({ success: true, message: 'Folder share access revoked successfully' });
  } catch (error) {
    next(error);
  }
};
