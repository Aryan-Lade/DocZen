"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearActivity = exports.getActivity = void 0;
const Activity_1 = __importDefault(require("../models/Activity"));
// @desc  Get user activity log
// @route GET /api/activity
const getActivity = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const activities = await Activity_1.default.find({ user: req.user._id })
            .sort('-createdAt')
            .skip((+page - 1) * +limit)
            .limit(+limit);
        const total = await Activity_1.default.countDocuments({ user: req.user._id });
        res.json({
            success: true,
            activities,
            total,
            page: +page,
            pages: Math.ceil(total / +limit),
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getActivity = getActivity;
// @desc  Clear activity log
// @route DELETE /api/activity
const clearActivity = async (req, res, next) => {
    try {
        await Activity_1.default.deleteMany({ user: req.user._id });
        res.json({ success: true, message: 'Activity log cleared' });
    }
    catch (error) {
        next(error);
    }
};
exports.clearActivity = clearActivity;
//# sourceMappingURL=activityController.js.map