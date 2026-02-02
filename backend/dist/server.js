"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/server.ts
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const db_1 = __importDefault(require("./config/db"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const companyRoutes_1 = __importDefault(require("./routes/companyRoutes"));
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
const utilityRoutes_1 = __importDefault(require("./routes/utilityRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const path_1 = __importDefault(require("path"));
const supplierRoutes_1 = __importDefault(require("./routes/supplierRoutes"));
const agentiRouters_1 = __importDefault(require("./routes/agentiRouters"));
const sportelloRouter_1 = __importDefault(require("./routes/sportelloRouter"));
const segnalatoreRoutes_1 = __importDefault(require("./routes/segnalatoreRoutes"));
const procacciatoreRoutes_1 = __importDefault(require("./routes/procacciatoreRoutes"));
const formTempletRoutes_1 = __importDefault(require("./routes/formTempletRoutes"));
const approvalRoutes_1 = __importDefault(require("./routes/approvalRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const employeeRoutes_1 = __importDefault(require("./routes/employeeRoutes"));
const contoRoutes_1 = __importDefault(require("./routes/contoRoutes"));
// Load environment variables
dotenv_1.default.config();
// Initialize express
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Connect to MongoDB
(0, db_1.default)()
    .then(() => {
    console.log("✅ Database connection established");
})
    .catch((err) => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
});
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL,
    'https://elave-platform-ovee-mary-s-projects-357233a1.vercel.app',
    'https://elave-platform-cm04fcsd1-mary-s-projects-357233a1.vercel.app',
    'https://elave-platform.vercel.app',
    'https://your-frontend-app.up.railway.app', // Optional
];
const isAllowedOrigin = (origin) => {
    if (allowedOrigins.filter(Boolean).includes(origin))
        return true;
    if (/\.vercel\.app$/.test(origin))
        return true;
    return false;
};
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin || isAllowedOrigin(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`? Blocked by CORS: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express_1.default.json());
// Static files directory for file downloads
app.use('/files', express_1.default.static(path_1.default.join(__dirname, '../files')));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, 'uploads')));
// Log environment info on startup
console.log('Environment:', process.env.NODE_ENV);
console.log('Frontend URL:', process.env.FRONTEND_URL);
console.log('Port:', PORT);
// Routes
app.use("/api/auth", authRoutes_1.default);
app.use("/api/dashboard", dashboardRoutes_1.default);
app.use("/api/companies", companyRoutes_1.default);
app.use("/api/projects", projectRoutes_1.default);
app.use("/api/utilities", utilityRoutes_1.default);
app.use("/api/users", userRoutes_1.default);
app.use('/api/messages', messageRoutes_1.default);
app.use("/api/suppliers", supplierRoutes_1.default);
app.use("/api/agenti", agentiRouters_1.default);
app.use("/api/sportello-lavoro", sportelloRouter_1.default);
app.use("/api/segnalatori", segnalatoreRoutes_1.default);
app.use("/api/procacciatori", procacciatoreRoutes_1.default);
app.use("/api/form-templates", formTempletRoutes_1.default);
app.use("/api/approvals", approvalRoutes_1.default);
app.use("/api/notifications", notificationRoutes_1.default);
app.use("/api/employees", employeeRoutes_1.default);
app.use("/api/conto", contoRoutes_1.default);
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.originalUrl,
        method: req.method
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map
