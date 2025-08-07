import express from 'express';
import {
  getEmployeesByCompany,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  uploadEmployeesFromExcel
} from '../controllers/employeeController';
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();


router.use(authMiddleware);


router.get('/company/:companyId', getEmployeesByCompany);

router.get('/:id', getEmployeeById);

router.post('/', createEmployee);

router.put('/:id', updateEmployee);

router.delete('/:id', deleteEmployee);

router.post('/company/:companyId/upload', uploadEmployeesFromExcel);

export default router;