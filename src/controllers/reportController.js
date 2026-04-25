const Bill = require("../models/Bill");
const Order = require("../models/Order");
const moment = require("moment");

// Get daily report
exports.getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date ? new Date(date) : new Date();

    const startOfDay = moment(reportDate).startOf("day").toDate();
    const endOfDay = moment(reportDate).endOf("day").toDate();

    const bills = await Bill.find({
      billDate: { $gte: startOfDay, $lte: endOfDay },
    });

    const totalOrders = bills.length;
    const totalRevenue = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const totalTax = bills.reduce((sum, bill) => sum + bill.taxAmount, 0);
    const totalDiscount = bills.reduce(
      (sum, bill) => sum + bill.discountAmount,
      0,
    );

    // Payment method breakdown
    const paymentBreakdown = {
      cash: bills.filter((b) => b.paymentMethod === "cash").length,
      card: bills.filter((b) => b.paymentMethod === "card").length,
      upi: bills.filter((b) => b.paymentMethod === "upi").length,
      other: bills.filter((b) => b.paymentMethod === "other").length,
    };

    // Popular items
    const itemSales = {};
    bills.forEach((bill) => {
      bill.items.forEach((item) => {
        if (!itemSales[item.name]) {
          itemSales[item.name] = { quantity: 0, revenue: 0 };
        }
        itemSales[item.name].quantity += item.quantity;
        itemSales[item.name].revenue += item.total;
      });
    });

    const popularItems = Object.entries(itemSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        date: moment(reportDate).format("YYYY-MM-DD"),
        totalOrders,
        totalRevenue,
        totalTax,
        totalDiscount,
        netRevenue: totalRevenue - totalTax,
        paymentBreakdown,
        popularItems,
        bills: bills.map((bill) => ({
          billNumber: bill.billNumber,
          totalAmount: bill.totalAmount,
          time: moment(bill.billDate).format("HH:mm"),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get weekly report
exports.getWeeklyReport = async (req, res) => {
  try {
    const { weekStart } = req.query;
    const startDate = weekStart
      ? new Date(weekStart)
      : moment().startOf("week").toDate();
    const endDate = moment(startDate).endOf("week").toDate();

    const bills = await Bill.find({
      billDate: { $gte: startDate, $lte: endDate },
    });

    const dailyBreakdown = [];
    for (let i = 0; i <= 6; i++) {
      const dayStart = moment(startDate).add(i, "days").startOf("day").toDate();
      const dayEnd = moment(startDate).add(i, "days").endOf("day").toDate();

      const dayBills = bills.filter(
        (bill) => bill.billDate >= dayStart && bill.billDate <= dayEnd,
      );

      dailyBreakdown.push({
        day: moment(dayStart).format("dddd"),
        date: moment(dayStart).format("YYYY-MM-DD"),
        orders: dayBills.length,
        revenue: dayBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
      });
    }

    const totalOrders = bills.length;
    const totalRevenue = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    res.json({
      success: true,
      data: {
        week: {
          start: moment(startDate).format("YYYY-MM-DD"),
          end: moment(endDate).format("YYYY-MM-DD"),
        },
        totalOrders,
        totalRevenue,
        averageOrderValue,
        dailyBreakdown,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get monthly report
exports.getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    const reportYear = year || moment().year();
    const reportMonth = month || moment().month() + 1;

    const startDate = moment(`${reportYear}-${reportMonth}-01`)
      .startOf("month")
      .toDate();
    const endDate = moment(startDate).endOf("month").toDate();

    const bills = await Bill.find({
      billDate: { $gte: startDate, $lte: endDate },
    });

    const weeklyBreakdown = [];
    const weeksInMonth = Math.ceil(moment(endDate).date() / 7);

    for (let i = 0; i < weeksInMonth; i++) {
      const weekStart = moment(startDate)
        .add(i * 7, "days")
        .toDate();
      const weekEnd = moment(weekStart).add(6, "days").toDate();

      const weekBills = bills.filter(
        (bill) => bill.billDate >= weekStart && bill.billDate <= weekEnd,
      );

      weeklyBreakdown.push({
        week: i + 1,
        start: moment(weekStart).format("YYYY-MM-DD"),
        end: moment(weekEnd).format("YYYY-MM-DD"),
        orders: weekBills.length,
        revenue: weekBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
      });
    }

    const totalOrders = bills.length;
    const totalRevenue = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const totalTax = bills.reduce((sum, bill) => sum + bill.taxAmount, 0);

    // Daily average
    const daysInMonth = moment(endDate).date();
    const averageDailyRevenue = totalRevenue / daysInMonth;

    res.json({
      success: true,
      data: {
        month: moment(startDate).format("MMMM YYYY"),
        totalOrders,
        totalRevenue,
        totalTax,
        averageDailyRevenue,
        weeklyBreakdown,
        recentBills: bills.slice(0, 10),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Custom date range report
exports.getCustomReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const bills = await Bill.find({
      billDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).populate("orderId");

    const totalRevenue = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const totalOrders = bills.length;

    // Category wise sales
    const categorySales = {};
    bills.forEach((bill) => {
      bill.items.forEach((item) => {
        // You would need category from MenuItem model
        if (!categorySales[item.name]) {
          categorySales[item.name] = { quantity: 0, revenue: 0 };
        }
        categorySales[item.name].quantity += item.quantity;
        categorySales[item.name].revenue += item.total;
      });
    });

    res.json({
      success: true,
      data: {
        period: {
          start: startDate,
          end: endDate,
        },
        totalOrders,
        totalRevenue,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        topSellingItems: Object.entries(categorySales)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
        bills: bills,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
