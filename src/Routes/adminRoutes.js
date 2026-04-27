const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize("admin"));

// Dashboard
router.get("/dashboard", adminController.getAdminDashboard);

// User management
router.get("/users", adminController.getAllUsers);
router.post("/users", adminController.createUser);
router.put("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);

// System logs
router.get("/logs", adminController.getSystemLogs);

// System settings
router.get("/settings", adminController.getSystemSettings);
router.put("/settings", adminController.updateSystemSettings);

module.exports = router;
