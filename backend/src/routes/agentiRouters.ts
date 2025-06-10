// src/routes/agenti.ts
import express from 'express';
import { 
  getAgenti, 
  getAgenteById, 
  createAgente, 
  updateAgente, 
  deleteAgente, 
  uploadAgentiFromExcel 
} from '../controllers/agentiController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();



// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET /api/agenti - Get all agents
router.get('/', getAgenti);

// GET /api/agenti/:id - Get single agent by ID
router.get('/:id', getAgenteById);

// POST /api/agenti - Create new agent
router.post('/', createAgente);

// PUT /api/agenti/:id - Update agent
router.put('/:id', updateAgente);

// DELETE /api/agenti/:id - Delete agent
router.delete('/:id', deleteAgente);

// POST /api/agenti/upload - Upload agents from Excel file
router.post('/upload', uploadAgentiFromExcel);

export default router;
