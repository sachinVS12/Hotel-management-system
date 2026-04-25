const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

router.post("/create", orderController.createOrder);
router.put("/:id/status", orderController.updateOrderStatus);
router.get("/:id", orderController.getOrderById);
router.get("/active/all", orderController.getActiveOrders);

module.exports = router;
