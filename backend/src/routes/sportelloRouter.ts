import express from 'express';
import {
  getSportelloLavoro,
  getSportelloLavoroById,
  createSportelloLavoro,
  updateSportelloLavoro,
  deleteSportelloLavoro,
  uploadSportelloLavoroFromExcel
} from '../controllers/sportelloLavoroController';
import { authMiddleware } from '../middleware/authMiddleware';
import { segnalaториRoleMiddleware, responsabileTerritorialeMiddleware } from '../middleware/roleMiddleware';

const router = express.Router();


router.get('/test', (req, res) => {
  res.json({
    message: 'Sportello Lavoro router is working!',
    timestamp: new Date().toISOString()
  });
});


router.post('/upload', authMiddleware, responsabileTerritorialeMiddleware, uploadSportelloLavoroFromExcel);

router.get('/', authMiddleware, segnalaториRoleMiddleware, getSportelloLavoro);
router.get('/:id', authMiddleware, segnalaториRoleMiddleware, getSportelloLavoroById);

router.post('/', authMiddleware, responsabileTerritorialeMiddleware, createSportelloLavoro);
router.put('/:id', authMiddleware, responsabileTerritorialeMiddleware, updateSportelloLavoro);
router.delete('/:id', authMiddleware, responsabileTerritorialeMiddleware, deleteSportelloLavoro);

export default router;