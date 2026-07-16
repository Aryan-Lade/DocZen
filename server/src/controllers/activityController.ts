import { Response, NextFunction } from 'express';
import ActivityModel from '../models/Activity';
import { AuthRequest } from '../middlewares/auth';

// @desc  Get user activity log
// @route GET /api/activity
export const getActivity = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const activities = await ActivityModel.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      offset: (+page - 1) * +limit,
      limit: +limit,
    });

    const total = await ActivityModel.count({ where: { userId: req.user.id } });

    res.json({
      success: true,
      activities,
      total,
      page: +page,
      pages: Math.ceil(total / +limit),
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Clear activity log
// @route DELETE /api/activity
export const clearActivity = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await ActivityModel.destroy({ where: { userId: req.user.id } });
    res.json({ success: true, message: 'Activity log cleared' });
  } catch (error) {
    next(error);
  }
};
