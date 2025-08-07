import express from 'express';
import {
  getSegnalatori,
  getSegnalatoreById,
  createSegnalatore,
  updateSegnalatore,
  deleteSegnalatore,
  uploadSegnalatoriFromExcel
} from '../controllers/segnalatoreController';
import { authMiddleware } from '../middleware/authMiddleware';
import { segnalaториRoleMiddleware, sportelloLavoroRoleMiddleware } from '../middleware/roleMiddleware';

const router = express.Router();


router.get('/test', (req, res) => {
  res.json({
    message: 'Segnalatori router is working!',
    timestamp: new Date().toISOString()
  });
});


router.post('/upload', authMiddleware, sportelloLavoroRoleMiddleware, uploadSegnalatoriFromExcel);


router.get('/', authMiddleware, segnalaториRoleMiddleware, getSegnalatori);
router.get('/:id', authMiddleware, segnalaториRoleMiddleware, getSegnalatoreById);


router.post('/', authMiddleware, sportelloLavoroRoleMiddleware, createSegnalatore);
router.put('/:id', authMiddleware, sportelloLavoroRoleMiddleware, updateSegnalatore);
router.delete('/:id', authMiddleware, sportelloLavoroRoleMiddleware, deleteSegnalatore);

export default router;