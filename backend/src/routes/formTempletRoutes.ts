import express from "express";
import {
  getFormTemplates,
  getFormTemplatesByCategory,
  uploadFormTemplate,
  downloadFormTemplate,
  downloadFormTemplateByCategory,
  deleteFormTemplate,
} from "../controllers/formTemplateController";
import { authMiddleware } from "../middleware/authMiddleware";
import { 
  segnalaториRoleMiddleware, 
  adminRoleMiddleware 
} from "../middleware/roleMiddleware";

const router = express.Router();


router.use(authMiddleware);


router.get("/", segnalaториRoleMiddleware, getFormTemplates);

router.get("/:category", segnalaториRoleMiddleware, getFormTemplatesByCategory);


router.post("/", adminRoleMiddleware, uploadFormTemplate);


router.get("/download/:type", segnalaториRoleMiddleware, downloadFormTemplate);


router.get("/download/:category/:type", segnalaториRoleMiddleware, downloadFormTemplateByCategory);

router.delete("/:type", adminRoleMiddleware, deleteFormTemplate);

export default router;