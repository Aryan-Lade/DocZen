"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.updateProfile = exports.getMe = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const sequelize_1 = require("sequelize");
const User_1 = __importDefault(require("../models/User"));
const error_1 = require("../middlewares/error");
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d',
    });
};
// @desc    Register user
// @route   POST /api/auth/register
const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User_1.default.findOne({ where: { email } });
        if (existingUser) {
            return next((0, error_1.createError)('Email already registered', 400));
        }
        const user = await User_1.default.create({ name, email, password });
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
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.default.scope('withPassword').findOne({ where: { email } });
        if (!user || !(await user.comparePassword(password))) {
            return next((0, error_1.createError)('Invalid email or password', 401));
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
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res, next) => {
    try {
        const user = await User_1.default.findByPk(req.user.id);
        res.json({ success: true, user });
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
// @desc    Update profile
// @route   PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
    try {
        const { name, avatar } = req.body;
        const user = await User_1.default.findByPk(req.user.id);
        if (!user) {
            return next((0, error_1.createError)('User not found', 404));
        }
        await user.update({ name, avatar });
        res.json({ success: true, message: 'Profile updated', user });
    }
    catch (error) {
        next(error);
    }
};
exports.updateProfile = updateProfile;
// @desc    Change password
// @route   PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User_1.default.scope('withPassword').findByPk(req.user.id);
        if (!user || !(await user.comparePassword(currentPassword))) {
            return next((0, error_1.createError)('Current password is incorrect', 400));
        }
        user.password = newPassword;
        await user.save();
        res.json({ success: true, message: 'Password changed successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.changePassword = changePassword;
// @desc    Forgot password - generate reset token
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
    try {
        const user = await User_1.default.findOne({ where: { email: req.body.email } });
        if (!user) {
            return next((0, error_1.createError)('No account found with that email', 404));
        }
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto_1.default.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 min
        await user.save();
        // In production, send email. For now, return token.
        res.json({
            success: true,
            message: 'Password reset token generated',
            resetToken, // In production, send via email
        });
    }
    catch (error) {
        next(error);
    }
};
exports.forgotPassword = forgotPassword;
// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
const resetPassword = async (req, res, next) => {
    try {
        const hashedToken = crypto_1.default.createHash('sha256').update(req.params.token).digest('hex');
        const user = await User_1.default.findOne({
            where: {
                resetPasswordToken: hashedToken,
                resetPasswordExpire: { [sequelize_1.Op.gt]: new Date() },
            },
        });
        if (!user) {
            return next((0, error_1.createError)('Invalid or expired reset token', 400));
        }
        user.password = req.body.password;
        user.resetPasswordToken = null;
        user.resetPasswordExpire = null;
        await user.save();
        const token = generateToken(String(user.id));
        res.json({ success: true, message: 'Password reset successful', token });
    }
    catch (error) {
        next(error);
    }
};
exports.resetPassword = resetPassword;
// @desc    Delete account
// @route   DELETE /api/auth/account
const deleteAccount = async (req, res, next) => {
    try {
        const user = await User_1.default.findByPk(req.user.id);
        if (user) {
            await user.destroy();
        }
        res.json({ success: true, message: 'Account deleted successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteAccount = deleteAccount;
//# sourceMappingURL=authController.js.map