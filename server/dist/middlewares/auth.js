"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOnly = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        res.status(401).json({ success: false, message: 'Not authorized, no token' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = await User_1.default.findById(decoded.id).select('-password');
        if (!req.user) {
            res.status(401).json({ success: false, message: 'User not found' });
            return;
        }
        next();
    }
    catch (error) {
        res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
    }
};
exports.protect = protect;
const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Admin access required' });
        return;
    }
    next();
};
exports.adminOnly = adminOnly;
//# sourceMappingURL=auth.js.map