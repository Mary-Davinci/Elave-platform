// src/server.ts
import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db";
import authRoutes from "./routes/authRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import companyRoutes from "./routes/companyRoutes";
import projectRoutes from "./routes/projectRoutes";
import utilityRoutes from "./routes/utilityRoutes";
import userRoutes from "./routes/userRoutes";
import messageRoutes from './routes/messageRoutes';
import path from "path";
import supplierRoutes from "./routes/supplierRoutes";
import agentiRouters from "./routes/agentiRouters";
import sportelloRouter from "./routes/sportelloRouter";
 import segnalatoreRoutes from "./routes/segnalatoreRoutes";
  import procacciatoreRoutes from "./routes/procacciatoreRoutes";
  import formTempletRoutes from "./routes/formTempletRoutes";
  import approvalRoutes from "./routes/approvalRoutes";
import notificationRoutes from "./routes/notificationRoutes"; 
import  employeeRoutes from "./routes/employeeRoutes";

// Load environment variables
dotenv.config();

// Initialize express
const app: Express = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB()
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
  'https://elave-platform-ovee-mary-s-projects-357233a1.vercel.app',
  'https://elave-platform-cm04fcsd1-mary-s-projects-357233a1.vercel.app',
  'https://elave-platform.vercel.app',
  'https://your-frontend-app.up.railway.app', // Optional
  
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));


app.use(express.json());

// Static files directory for file downloads
app.use('/files', express.static(path.join(__dirname, '../files')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log environment info on startup
console.log('Environment:', process.env.NODE_ENV);
console.log('Frontend URL:', process.env.FRONTEND_URL);
console.log('Port:', PORT);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/utilities", utilityRoutes);
app.use("/api/users", userRoutes);
app.use('/api/messages', messageRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/agenti", agentiRouters);
app.use("/api/sportello-lavoro", sportelloRouter);
app.use("/api/segnalatori", segnalatoreRoutes);
app.use("/api/procacciatori", procacciatoreRoutes);
app.use("/api/form-templates", formTempletRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/employees", employeeRoutes);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ 
    status: "ok",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.use('*', (req: Request, res: Response) => {
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

export default app;
