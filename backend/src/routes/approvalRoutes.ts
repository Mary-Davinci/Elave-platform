import express from 'express';
import { 
  getPendingItems, 
  approveCompany, 
  approveSportelloLavoro, 
  approveAgente, 
  approveUser,
  rejectItem 
} from '../controllers/approvalController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminRoleMiddleware } from '../middleware/roleMiddleware';

const router = express.Router();

router.use(authMiddleware);
router.use(adminRoleMiddleware);

router.get('/pending', getPendingItems);

router.post('/approve/company/:id', approveCompany);
router.post('/approve/sportello/:id', approveSportelloLavoro);
router.post('/approve/agente/:id', approveAgente);
router.post('/approve/user/:id', approveUser);

router.post('/reject/:type/:id', rejectItem);

export default router;

