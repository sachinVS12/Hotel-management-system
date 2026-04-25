const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

// JSON responses
router.get("/daily", reportController.getDailyReport);
router.get("/weekly", reportController.getWeeklyReport);
router.get("/monthly", reportController.getMonthlyReport);
router.get("/custom", reportController.getCustomReport);

// Download endpoints with format parameter
router.get("/download/daily", reportController.getDailyReport); // Add ?format=csv or ?format=excel
router.get("/download/weekly", reportController.getWeeklyReport);
router.get("/download/monthly", reportController.getMonthlyReport);
router.get("/download/custom", reportController.getCustomReport);
router.get("/download/complete", reportController.downloadCompleteReport);

module.exports = router;
