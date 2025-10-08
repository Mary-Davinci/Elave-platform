"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dashboardController_1 = require("../controllers/dashboardController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const profileController_1 = require("../controllers/profileController");
const router = express_1.default.Router();
router.get("/stats", authMiddleware_1.authMiddleware, dashboardController_1.getDashboardStats);
;
router.get("/profile", authMiddleware_1.authMiddleware, (req, res) => {
    (0, profileController_1.getProfileData)(req, res);
});
exports.default = router;
//# sourceMappingURL=dashboardRoutes.js.map