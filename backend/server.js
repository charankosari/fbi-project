const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Remove timeout limits for requests (allow long-running requests)
// Set to a very high value (24 hours in milliseconds) to effectively remove timeout
const NO_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
app.timeout = NO_TIMEOUT;
app.use((req, res, next) => {
  // Set timeout to very high value for all requests
  req.setTimeout(NO_TIMEOUT);
  res.setTimeout(NO_TIMEOUT);
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "500mb" })); // Increase body size limit
app.use(express.urlencoded({ extended: true, limit: "500mb" })); // Increase body size limit

// Images are now served directly from Cloudinary CDN - no need for /uploads route

// Routes
app.use("/api/cases", require("./routes/cases"));
app.use("/api/ai", require("./routes/ai"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running" });
});

// Connect to MongoDB
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/fbi-cases";

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 24 * 60 * 60 * 1000, // 24 hours - effectively no timeout
      socketTimeoutMS: 24 * 60 * 60 * 1000, // 24 hours - effectively no timeout
      connectTimeoutMS: 24 * 60 * 60 * 1000, // 24 hours - effectively no timeout
    });
    isConnected = true;
    console.log("✅ Connected to MongoDB");
    console.log(`📊 Database: ${MONGODB_URI.split("/").pop()}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
};

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Serve static files from Next.js build in production
if (process.env.NODE_ENV === "production") {
  const frontendBuildPath = path.join(__dirname, "..", "frontend", "out");
  
  // Serve static files (js, css, images)
  app.use(express.static(frontendBuildPath));
  
  // All other routes should serve the Next.js app (SPA fallback)
  app.get("*", (req, res) => {
    // Don't serve index for API routes
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  });
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running" });
});

module.exports = app;

// Start server if run directly (for local development)
if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`📡 API available at http://localhost:${PORT}/api`);
      });
    })
    .catch((error) => {
      console.error("❌ MongoDB connection error:", error.message);
      process.exit(1);
    });
}
