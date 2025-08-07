"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/employeeRoutes.ts
const express_1 = __importDefault(require("express"));
const employeeController_1 = require("../controllers/employeeController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use(authMiddleware_1.authMiddleware);
// Get all employees for a specific company
router.get('/company/:companyId', employeeController_1.getEmployeesByCompany);
// Get single employee by ID
router.get('/:id', employeeController_1.getEmployeeById);
// Create new employee
router.post('/', employeeController_1.createEmployee);
// Update employee
router.put('/:id', employeeController_1.updateEmployee);
// Delete employee
router.delete('/:id', employeeController_1.deleteEmployee);
// Upload employees from Excel for a specific company
router.post('/company/:companyId/upload', employeeController_1.uploadEmployeesFromExcel);
exports.default = router;
//# sourceMappingURL=employeeRoutes.js.map