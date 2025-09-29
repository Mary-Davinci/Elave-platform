// src/routes/agenti.ts
import express from 'express';
import { 
  getAgenti, 
  getAgenteById, 
  createAgente, 
  updateAgente, 
  deleteAgente, 
  uploadAgentiFromExcel,
  getAgentiMinimal        
} from '../controllers/agentiController'; 
import { authMiddleware } from "../middleware/authMiddleware";
import { segnalaториRoleMiddleware, responsabileTerritorialeMiddleware } from "../middleware/roleMiddleware";

const router = express.Router();


router.get(
  "/list-minimal",
  authMiddleware,
  segnalaториRoleMiddleware,  
  getAgentiMinimal
);

// Existing routes
router.get("/", authMiddleware, segnalaториRoleMiddleware, getAgenti);
router.get("/:id", authMiddleware, segnalaториRoleMiddleware, getAgenteById);

router.post("/", authMiddleware, responsabileTerritorialeMiddleware, createAgente);
router.put("/:id", authMiddleware, responsabileTerritorialeMiddleware, updateAgente);
router.delete("/:id", authMiddleware, responsabileTerritorialeMiddleware, deleteAgente);
router.post("/upload", authMiddleware, responsabileTerritorialeMiddleware, uploadAgentiFromExcel);

export default router;
