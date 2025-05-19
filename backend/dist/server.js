// src/server.ts
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db";
import authRoutes from "./routes/authRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import companyRoutes from "./routes/companyRoutes";
import projectRoutes from "./routes/projectRoutes";
import userRoutes from "./routes/userRoutes";
import messageRoutes from "./routes/messageRoutes";
import path from "path";
import supplierRoutes from "./routes/supplierRoutes";

// Load environment variables
dotenv.config();

// Initialize express
const app = express();
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
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL || 'https://elave-platform-ovee.vercel.app'] 
  : ['http://localhost:3000', 'http://localhost:5173']; // Default Vite port is 5173

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    
    return callback(null, true);
  },
  credentials: true
}));

// Rest of your middleware
app.use(express.json());

// Static files directory for file downloads
app.use('/files', express.static(path.join(__dirname, '../files')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/utilities", userRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/messages', messageRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/users", userRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

export default app;