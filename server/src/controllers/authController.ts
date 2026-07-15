import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import User from '../models/User';
import { createError } from '../middlewares/error';
import { AuthRequest } from '../middlewares/auth';

const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  } as jwt.SignOptions);
};

// @desc    Register user
// @route   POST /api/auth/register
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return next(createError('Email already registered', 400));
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(String(user.id));

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.scope('withPassword').findOne({ where: { email } });
    if (!user || !(await user.comparePassword(password))) {
      return next(createError('Invalid email or password', 401));
    }

    const token = generateToken(String(user.id));

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findByPk(req.user.id);
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return next(createError('User not found', 404));
    }
    await user.update({ name, avatar });
    res.json({ success: true, message: 'Profile updated', user });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.scope('withPassword').findByPk(req.user.id);
    if (!user || !(await user.comparePassword(currentPassword))) {
      return next(createError('Current password is incorrect', 400));
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password - generate reset token
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });
    if (!user) {
      return next(createError('No account found with that email', 404));
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save();

    // In production, send email. For now, return token.
    res.json({
      success: true,
      message: 'Password reset token generated',
      resetToken, // In production, send via email
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return next(createError('Invalid or expired reset token', 400));
    }

    user.password = req.body.password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    const token = generateToken(String(user.id));
    res.json({ success: true, message: 'Password reset successful', token });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete account
// @route   DELETE /api/auth/account
export const deleteAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user) {
      await user.destroy();
    }
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
};
