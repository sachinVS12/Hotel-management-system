require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDB = require("./src/config/database");

// Import routes
const billRoutes = require("./src/routes/billRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const reportRoutes = require("./src/routes/reportRoutes");
const authRoutes = require("./src/routes/authRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const managerRoutes = require("./src/routes/managerRoutes");

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Public routes
app.use("/api/auth", authRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reports", reportRoutes);

// Protected routes
app.use("/api/admin", adminRoutes);
app.use("/api/manager", managerRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Hotel Billing System is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Something went wrong!" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
