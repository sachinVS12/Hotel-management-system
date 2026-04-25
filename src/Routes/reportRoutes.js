const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

router.get("/daily", reportController.getDailyReport);
router.get("/weekly", reportController.getWeeklyReport);
router.get("/monthly", reportController.getMonthlyReport);
router.get("/custom", reportController.getCustomReport);

module.exports = router;
