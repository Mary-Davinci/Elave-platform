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

// CORS configuration
const allowedOrigins = [
  'https://elave-platform-ovee-mary-s-projects-357233a1.vercel.app',
  'https://elave-platform-ovee-git-main-mary-s-projects-357233a1.vercel.app',
  'https://elave-platform-ovee-2v2365pkz-mary-s-projects-357233a1.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow server-to-server or curl
    if (allowedOrigins.includes(origin)) {
      return callback(null, origin); // ✅ Echo origin
    }
    console.warn(`Blocked by CORS: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true // ⛔ Cannot work with Access-Control-Allow-Origin: *
}));

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      // Log instead of rejecting for easier debugging
      console.warn(`CORS: Request from origin ${origin} not in allowlist`);
      callback(null, true); // Still allow it but log it
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

// Health check route
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ 
    status: "ok",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Catch-all route for debugging
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