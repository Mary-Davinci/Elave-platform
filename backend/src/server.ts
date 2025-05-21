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
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://your-frontend-app.up.railway.app',
  'https://elave-platform-ovee-mary-s-projects-357233a1.vercel.app',
  'https://elave-platform-ovee-git-main-mary-s-projects-357233a1.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

// Fixed CORS configuration - this is the critical change
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      // Return the specific origin instead of wildcard * - this fixes credentials issue
      callback(null, origin);
    } else {
      console.warn('CORS blocked request from origin: ${origin}');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json());

// Static files directory for file downloads
app.use('/files', express.static(path.join(__dirname, '../files')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Log environment info on startup
console.log('Environment:', process.env.NODE_ENV);
console.log('Frontend URL:', process.env.FRONTEND_URL);
console.log('Port:', PORT);

// Fixed preflight OPTIONS handling - also critical for CORS with credentials
app.options('*', cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      // Return the specific origin instead of wildcard *
      callback(null, origin);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// CORS debugging endpoint - helps troubleshoot CORS issues
app.get("/debug/cors", (req: Request, res: Response) => {
  // Return detailed information about the request and CORS configuration
  res.status(200).json({
    message: "CORS Debug Information",
    requestInfo: {
      origin: req.headers.origin || "No origin header",
      referer: req.headers.referer || "No referer header",
      host: req.headers.host || "No host header",
      method: req.method,
      path: req.path,
      ip: req.ip,
      secure: req.secure,
      xhr: req.xhr,
      protocol: req.protocol,
    },
    corsConfig: {
      allowedOrigins: allowedOrigins,
      currentNodeEnv: process.env.NODE_ENV || "Not set",
      frontendUrl: process.env.FRONTEND_URL || "Not set",
    },
    allHeaders: req.headers,
    // Add response headers that will be sent back
    responseHeaders: {
      "Access-Control-Allow-Origin": res.getHeader("Access-Control-Allow-Origin") || "Not set yet",
      "Access-Control-Allow-Credentials": res.getHeader("Access-Control-Allow-Credentials") || "Not set yet",
      "Access-Control-Allow-Methods": res.getHeader("Access-Control-Allow-Methods") || "Not set yet",
      "Access-Control-Allow-Headers": res.getHeader("Access-Control-Allow-Headers") || "Not set yet",
    }
  });
});

// Add a specific OPTIONS handler for the debug endpoint to see preflight behavior
app.options("/debug/cors", (req: Request, res: Response) => {
  res.status(200).json({
    message: "CORS Preflight Debug",
    requestHeaders: req.headers,
    responseHeaders: {
      "Access-Control-Allow-Origin": res.getHeader("Access-Control-Allow-Origin") || "Not set",
      "Access-Control-Allow-Credentials": res.getHeader("Access-Control-Allow-Credentials") || "Not set",
      "Access-Control-Allow-Methods": res.getHeader("Access-Control-Allow-Methods") || "Not set",
      "Access-Control-Allow-Headers": res.getHeader("Access-Control-Allow-Headers") || "Not set",
    }
  });
});

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
  console.log('✅ Server running on port ${PORT}');
});

export default app;