"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/projectRoutes.ts
const express_1 = __importDefault(require("express"));
const projectController_1 = require("../controllers/projectController");
const projectTemplatesController_1 = require("../controllers/projectTemplatesController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const roleMiddleware_1 = require("../middleware/roleMiddleware");
const router = express_1.default.Router();
// Project template routes - these need to come BEFORE the :id routes to avoid conflict
router.get("/templates", authMiddleware_1.authMiddleware, projectTemplatesController_1.getProjectTemplates);
router.post("/templates", authMiddleware_1.authMiddleware, roleMiddleware_1.userRoleMiddleware, projectTemplatesController_1.createProjectTemplate);
router.get("/templates/:id", authMiddleware_1.authMiddleware, projectTemplatesController_1.getProjectTemplateById);
router.put("/templates/:id", authMiddleware_1.authMiddleware, roleMiddleware_1.userRoleMiddleware, projectTemplatesController_1.updateProjectTemplate);
router.delete("/templates/:id", authMiddleware_1.authMiddleware, roleMiddleware_1.userRoleMiddleware, projectTemplatesController_1.deleteProjectTemplate);
router.post("/bulk", authMiddleware_1.authMiddleware, roleMiddleware_1.userRoleMiddleware, projectTemplatesController_1.createProjectsFromTemplates);
// Project routes - the :id route comes after more specific routes
router.get("/", authMiddleware_1.authMiddleware, projectController_1.getProjects);
router.post("/", authMiddleware_1.authMiddleware, roleMiddleware_1.userRoleMiddleware, projectController_1.createProject);
router.get("/:id", authMiddleware_1.authMiddleware, projectController_1.getProjectById);
router.put("/:id", authMiddleware_1.authMiddleware, roleMiddleware_1.userRoleMiddleware, projectController_1.updateProject);
router.delete("/:id", authMiddleware_1.authMiddleware, roleMiddleware_1.userRoleMiddleware, projectController_1.deleteProject);
exports.default = router;
//# sourceMappingURL=projectRoutes.js.map