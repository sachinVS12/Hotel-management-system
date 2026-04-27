const express = require("express");
const router = express.Router();
const managerController = require("../controllers/managerController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

// All manager routes require authentication and manager or admin role
router.use(authenticate);
router.use(authorize("manager", "admin"));

// Dashboard
router.get("/dashboard", managerController.getManagerDashboard);

// Sales reports
router.get("/sales-report", managerController.getSalesReport);

// Menu management
router.get("/menu", managerController.getAllMenuItems);
router.post("/menu", managerController.createMenuItem);
router.put("/menu/:id", managerController.updateMenuItem);
router.delete("/menu/:id", managerController.deleteMenuItem);

// Staff management
router.get("/staff", managerController.getStaffList);

// Order management
router.get("/orders", managerController.getAllOrders);

module.exports = router;
