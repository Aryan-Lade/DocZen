import { Response, NextFunction } from 'express';
import ActivityModel from '../models/Activity';
import { AuthRequest } from '../middlewares/auth';

// @desc  Get user activity log
// @route GET /api/activity
export const getActivity = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const activities = await ActivityModel.find({ user: req.user._id })
      .sort('-createdAt')
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const total = await ActivityModel.countDocuments({ user: req.user._id });

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
    await ActivityModel.deleteMany({ user: req.user._id });
    res.json({ success: true, message: 'Activity log cleared' });
  } catch (error) {
    next(error);
  }
};
