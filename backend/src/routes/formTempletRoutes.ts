// routes/form-templates.ts
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
  segnalaториRoleMiddleware,   // keep your existing name
  adminRoleMiddleware,
} from "../middleware/roleMiddleware";

const router = express.Router();

router.use(authMiddleware);

/* Download FIRST to avoid capture by '/:category' */
router.get("/download/:type", segnalaториRoleMiddleware, downloadFormTemplate);
router.get("/download/:category/:type", segnalaториRoleMiddleware, downloadFormTemplateByCategory);

/* Listing */
router.get("/", segnalaториRoleMiddleware, getFormTemplates);
router.get("/category/:category", segnalaториRoleMiddleware, getFormTemplatesByCategory);

/* Back-compat: allow old '/:category' like '/sportello-lavoro' */
router.get("/:category", segnalaториRoleMiddleware, getFormTemplatesByCategory);

/* Mutations */
router.post("/", adminRoleMiddleware, uploadFormTemplate);
router.delete("/:type", adminRoleMiddleware, deleteFormTemplate);

export default router;
