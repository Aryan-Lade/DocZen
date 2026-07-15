"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middlewares/auth");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const validation_1 = require("../middlewares/validation");
const router = (0, express_1.Router)();
router.post('/register', rateLimiter_1.authLimiter, [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], validation_1.validateRequest, authController_1.register);
router.post('/login', rateLimiter_1.authLimiter, [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
], validation_1.validateRequest, authController_1.login);
router.get('/me', auth_1.protect, authController_1.getMe);
router.put('/profile', auth_1.protect, authController_1.updateProfile);
router.put('/change-password', auth_1.protect, authController_1.changePassword);
router.post('/forgot-password', authController_1.forgotPassword);
router.put('/reset-password/:token', authController_1.resetPassword);
router.delete('/account', auth_1.protect, authController_1.deleteAccount);
exports.default = router;
//# sourceMappingURL=auth.js.map