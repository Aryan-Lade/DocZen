"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const activityController_1 = require("../controllers/activityController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.get('/', activityController_1.getActivity);
router.delete('/', activityController_1.clearActivity);
exports.default = router;
//# sourceMappingURL=activity.js.map