// src/routes/projectRoutes.ts
import express from "express";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getProjectById
} from "../controllers/projectController";
import {
  getProjectTemplates,
  getProjectTemplateById,
  createProjectTemplate,
  updateProjectTemplate,
  deleteProjectTemplate,
  createProjectsFromTemplates
} from "../controllers/projectTemplatesController";
import { authMiddleware } from "../middleware/authMiddleware";
import { userRoleMiddleware } from "../middleware/roleMiddleware";

const router = express.Router();

// Project template routes - these need to come BEFORE the :id routes to avoid conflict
router.get("/templates", authMiddleware, getProjectTemplates);
router.post("/templates", authMiddleware, userRoleMiddleware, createProjectTemplate);
router.get("/templates/:id", authMiddleware, getProjectTemplateById);
router.put("/templates/:id", authMiddleware, userRoleMiddleware, updateProjectTemplate);
router.delete("/templates/:id", authMiddleware, userRoleMiddleware, deleteProjectTemplate);
router.post("/bulk", authMiddleware, userRoleMiddleware, createProjectsFromTemplates);

// Project routes - the :id route comes after more specific routes
router.get("/", authMiddleware, getProjects);
router.post("/", authMiddleware, userRoleMiddleware, createProject);
router.get("/:id", authMiddleware, getProjectById);
router.put("/:id", authMiddleware, userRoleMiddleware, updateProject);
router.delete("/:id", authMiddleware, userRoleMiddleware, deleteProject);

export default router;