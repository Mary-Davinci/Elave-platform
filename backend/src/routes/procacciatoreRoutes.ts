import express from 'express';
import {
  getProcacciatori,
  getProcacciatoreById,
  createProcacciatore,
  updateProcacciatore,
  deleteProcacciatore,
  uploadProcacciatoriFromExcel
} from '../controllers/procacciatoreController';
import { authMiddleware } from '../middleware/authMiddleware';
import { segnalaториRoleMiddleware } from '../middleware/roleMiddleware';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({
    message: 'Procacciatori router is working!',
    timestamp: new Date().toISOString()
  });
});


router.post('/upload', authMiddleware, segnalaториRoleMiddleware, uploadProcacciatoriFromExcel);

router.get('/', authMiddleware, getProcacciatori);

router.get('/:id', authMiddleware, getProcacciatoreById);


router.post('/', authMiddleware, segnalaториRoleMiddleware, createProcacciatore);


router.put('/:id', authMiddleware, segnalaториRoleMiddleware, updateProcacciatore);


router.delete('/:id', authMiddleware, segnalaториRoleMiddleware, deleteProcacciatore);

export default router;