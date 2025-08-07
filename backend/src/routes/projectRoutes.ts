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
import { segnalaториRoleMiddleware } from "../middleware/roleMiddleware";

const router = express.Router();

router.get("/templates", authMiddleware, getProjectTemplates);
router.post("/templates", authMiddleware, segnalaториRoleMiddleware, createProjectTemplate);
router.get("/templates/:id", authMiddleware, getProjectTemplateById);
router.put("/templates/:id", authMiddleware, segnalaториRoleMiddleware, updateProjectTemplate);
router.delete("/templates/:id", authMiddleware, segnalaториRoleMiddleware, deleteProjectTemplate);
router.post("/bulk", authMiddleware, segnalaториRoleMiddleware, createProjectsFromTemplates);

router.get("/", authMiddleware, getProjects);
router.post("/", authMiddleware, segnalaториRoleMiddleware, createProject);
router.get("/:id", authMiddleware, getProjectById);
router.put("/:id", authMiddleware, segnalaториRoleMiddleware, updateProject);
router.delete("/:id", authMiddleware, segnalaториRoleMiddleware, deleteProject);

export default router;