const express = require("express");
const router = express.Router();
const billController = require("../controllers/billController");

router.post("/create", billController.createBill);
router.get("/:id", billController.getBillById);
router.get("/", billController.getAllBills);

module.exports = router;
