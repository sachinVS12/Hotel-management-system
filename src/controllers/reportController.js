const Bill = require("../models/Bill");
const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");
const moment = require("moment");
const { Parser } = require("json2csv");
const ExcelJS = require("exceljs");

// Helper function to send CSV response
const sendCSV = (res, data, filename, fields) => {
  try {
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment(`${filename}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to send Excel response
const sendExcel = async (res, data, filename, worksheetName) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(worksheetName);

    // Add headers
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);

      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Add data
      data.forEach((item) => {
        const row = headers.map((header) => item[header]);
        worksheet.addRow(row);
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        column.width = 20;
      });
    }

    res.header(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.attachment(`${filename}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get daily report with CSV/Excel download
exports.getDailyReport = async (req, res) => {
  try {
    const { date, format = "json" } = req.query;
    const reportDate = date ? new Date(date) : new Date();

    const startOfDay = moment(reportDate).startOf("day").toDate();
    const endOfDay = moment(reportDate).endOf("day").toDate();

    const bills = await Bill.find({
      billDate: { $gte: startOfDay, $lte: endOfDay },
    }).populate("orderId");

    const totalOrders = bills.length;
    const totalRevenue = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const totalTax = bills.reduce((sum, bill) => sum + bill.taxAmount, 0);
    const totalDiscount = bills.reduce(
      (sum, bill) => sum + bill.discountAmount,
      0,
    );

    const paymentBreakdown = {
      cash: bills.filter((b) => b.paymentMethod === "cash").length,
      card: bills.filter((b) => b.paymentMethod === "card").length,
      upi: bills.filter((b) => b.paymentMethod === "upi").length,
      other: bills.filter((b) => b.paymentMethod === "other").length,
    };

    // Item sales for the day
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

    const reportData = {
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
        customerName: bill.customerName,
        tableNumber: bill.tableNumber,
        totalAmount: bill.totalAmount,
        paymentMethod: bill.paymentMethod,
        time: moment(bill.billDate).format("HH:mm:ss"),
        items: bill.items.map((i) => `${i.name} x${i.quantity}`).join(", "),
      })),
    };

    // Handle different formats
    if (format === "csv") {
      const csvData = reportData.bills.map((bill) => ({
        "Bill Number": bill.billNumber,
        "Customer Name": bill.customerName,
        "Table Number": bill.tableNumber,
        "Total Amount": bill.totalAmount,
        "Payment Method": bill.paymentMethod,
        Time: bill.time,
        Items: bill.items,
      }));

      const fields = [
        "Bill Number",
        "Customer Name",
        "Table Number",
        "Total Amount",
        "Payment Method",
        "Time",
        "Items",
      ];
      return sendCSV(res, csvData, `daily_report_${reportData.date}`, fields);
    } else if (format === "excel") {
      const excelData = reportData.bills.map((bill) => ({
        "Bill Number": bill.billNumber,
        "Customer Name": bill.customerName,
        "Table Number": bill.tableNumber,
        "Total Amount": bill.totalAmount,
        "Payment Method": bill.paymentMethod,
        Time: bill.time,
        Items: bill.items,
      }));
      return await sendExcel(
        res,
        excelData,
        `daily_report_${reportData.date}`,
        "Daily Report",
      );
    } else {
      res.json({
        success: true,
        data: reportData,
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get weekly report with CSV/Excel download
exports.getWeeklyReport = async (req, res) => {
  try {
    const { weekStart, format = "json" } = req.query;
    const startDate = weekStart
      ? new Date(weekStart)
      : moment().startOf("week").toDate();
    const endDate = moment(startDate).endOf("week").toDate();

    const bills = await Bill.find({
      billDate: { $gte: startDate, $lte: endDate },
    }).populate("orderId");

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
        averageOrderValue:
          dayBills.length > 0
            ? dayBills.reduce((sum, bill) => sum + bill.totalAmount, 0) /
              dayBills.length
            : 0,
      });
    }

    const totalOrders = bills.length;
    const totalRevenue = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const reportData = {
      week: {
        start: moment(startDate).format("YYYY-MM-DD"),
        end: moment(endDate).format("YYYY-MM-DD"),
        weekNumber: moment(startDate).week(),
      },
      totalOrders,
      totalRevenue,
      averageOrderValue,
      dailyBreakdown,
      allBills: bills.map((bill) => ({
        billNumber: bill.billNumber,
        customerName: bill.customerName,
        date: moment(bill.billDate).format("YYYY-MM-DD"),
        amount: bill.totalAmount,
        paymentMethod: bill.paymentMethod,
      })),
    };

    if (format === "csv") {
      const csvData = dailyBreakdown.map((day) => ({
        Day: day.day,
        Date: day.date,
        "Number of Orders": day.orders,
        Revenue: day.revenue,
        "Average Order Value": day.averageOrderValue,
      }));

      const fields = [
        "Day",
        "Date",
        "Number of Orders",
        "Revenue",
        "Average Order Value",
      ];
      return sendCSV(
        res,
        csvData,
        `weekly_report_week_${reportData.week.weekNumber}`,
        fields,
      );
    } else if (format === "excel") {
      const excelData = [
        ...dailyBreakdown.map((day) => ({
          Type: "Daily Summary",
          "Day/Date": `${day.day} (${day.date})`,
          Orders: day.orders,
          Revenue: day.revenue,
          "Avg Order Value": day.averageOrderValue,
        })),
        {
          Type: "TOTAL",
          "Day/Date": `Week ${reportData.week.weekNumber}`,
          Orders: reportData.totalOrders,
          Revenue: reportData.totalRevenue,
          "Avg Order Value": reportData.averageOrderValue,
        },
      ];
      return await sendExcel(
        res,
        excelData,
        `weekly_report_week_${reportData.week.weekNumber}`,
        "Weekly Report",
      );
    } else {
      res.json({
        success: true,
        data: reportData,
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get monthly report with CSV/Excel download
exports.getMonthlyReport = async (req, res) => {
  try {
    const { year, month, format = "json" } = req.query;
    const reportYear = year || moment().year();
    const reportMonth = month || moment().month() + 1;

    const startDate = moment(`${reportYear}-${reportMonth}-01`)
      .startOf("month")
      .toDate();
    const endDate = moment(startDate).endOf("month").toDate();

    const bills = await Bill.find({
      billDate: { $gte: startDate, $lte: endDate },
    }).populate("orderId");

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
        averageOrderValue:
          weekBills.length > 0
            ? weekBills.reduce((sum, bill) => sum + bill.totalAmount, 0) /
              weekBills.length
            : 0,
      });
    }

    // Daily breakdown for the month
    const dailyBreakdown = [];
    const daysInMonth = moment(endDate).date();
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStart = moment(`${reportYear}-${reportMonth}-${i}`)
        .startOf("day")
        .toDate();
      const dayEnd = moment(`${reportYear}-${reportMonth}-${i}`)
        .endOf("day")
        .toDate();

      const dayBills = bills.filter(
        (bill) => bill.billDate >= dayStart && bill.billDate <= dayEnd,
      );

      dailyBreakdown.push({
        date: moment(dayStart).format("YYYY-MM-DD"),
        orders: dayBills.length,
        revenue: dayBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
      });
    }

    const totalOrders = bills.length;
    const totalRevenue = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const totalTax = bills.reduce((sum, bill) => sum + bill.taxAmount, 0);
    const averageDailyRevenue = totalRevenue / daysInMonth;

    // Payment method summary
    const paymentSummary = {
      cash: bills
        .filter((b) => b.paymentMethod === "cash")
        .reduce((sum, b) => sum + b.totalAmount, 0),
      card: bills
        .filter((b) => b.paymentMethod === "card")
        .reduce((sum, b) => sum + b.totalAmount, 0),
      upi: bills
        .filter((b) => b.paymentMethod === "upi")
        .reduce((sum, b) => sum + b.totalAmount, 0),
      other: bills
        .filter((b) => b.paymentMethod === "other")
        .reduce((sum, b) => sum + b.totalAmount, 0),
    };

    const reportData = {
      month: moment(startDate).format("MMMM YYYY"),
      year: reportYear,
      monthNumber: reportMonth,
      totalOrders,
      totalRevenue,
      totalTax,
      averageDailyRevenue,
      weeklyBreakdown,
      dailyBreakdown,
      paymentSummary,
      topBills: bills
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10)
        .map((bill) => ({
          billNumber: bill.billNumber,
          customerName: bill.customerName,
          amount: bill.totalAmount,
          date: moment(bill.billDate).format("YYYY-MM-DD"),
        })),
    };

    if (format === "csv") {
      const csvData = dailyBreakdown.map((day) => ({
        Date: day.date,
        "Number of Orders": day.orders,
        Revenue: day.revenue,
      }));

      const fields = ["Date", "Number of Orders", "Revenue"];
      return sendCSV(
        res,
        csvData,
        `monthly_report_${reportYear}_${reportMonth}`,
        fields,
      );
    } else if (format === "excel") {
      const excelData = [
        ...weeklyBreakdown.map((week) => ({
          Type: "Weekly Summary",
          Period: `Week ${week.week} (${week.start} to ${week.end})`,
          Orders: week.orders,
          Revenue: week.revenue,
          "Avg Order Value": week.averageOrderValue,
        })),
        {
          Type: "MONTHLY TOTAL",
          Period: reportData.month,
          Orders: reportData.totalOrders,
          Revenue: reportData.totalRevenue,
          "Avg Order Value":
            reportData.totalRevenue / reportData.totalOrders || 0,
        },
      ];
      return await sendExcel(
        res,
        excelData,
        `monthly_report_${reportYear}_${reportMonth}`,
        "Monthly Report",
      );
    } else {
      res.json({
        success: true,
        data: reportData,
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Custom date range report with download
exports.getCustomReport = async (req, res) => {
  try {
    const { startDate, endDate, format = "json" } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Start date and end date are required",
        });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const bills = await Bill.find({
      billDate: {
        $gte: start,
        $lte: end,
      },
    })
      .populate("orderId")
      .sort({ billDate: -1 });

    const totalRevenue = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const totalOrders = bills.length;

    // Category wise sales
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

    const reportData = {
      period: {
        start: moment(start).format("YYYY-MM-DD"),
        end: moment(end).format("YYYY-MM-DD"),
        totalDays: moment(end).diff(moment(start), "days") + 1,
      },
      totalOrders,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      topSellingItems: Object.entries(itemSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
      bills: bills.map((bill) => ({
        billNumber: bill.billNumber,
        customerName: bill.customerName,
        date: moment(bill.billDate).format("YYYY-MM-DD"),
        amount: bill.totalAmount,
        paymentMethod: bill.paymentMethod,
        items: bill.items.map((i) => `${i.name} x${i.quantity}`).join(", "),
      })),
    };

    if (format === "csv") {
      const csvData = reportData.bills.map((bill) => ({
        "Bill Number": bill.billNumber,
        "Customer Name": bill.customerName,
        Date: bill.date,
        Amount: bill.amount,
        "Payment Method": bill.paymentMethod,
        Items: bill.items,
      }));

      const fields = [
        "Bill Number",
        "Customer Name",
        "Date",
        "Amount",
        "Payment Method",
        "Items",
      ];
      return sendCSV(
        res,
        csvData,
        `custom_report_${reportData.period.start}_to_${reportData.period.end}`,
        fields,
      );
    } else if (format === "excel") {
      const excelData = reportData.bills.map((bill) => ({
        "Bill Number": bill.billNumber,
        "Customer Name": bill.customerName,
        Date: bill.date,
        Amount: bill.amount,
        "Payment Method": bill.paymentMethod,
        Items: bill.items,
      }));
      return await sendExcel(
        res,
        excelData,
        `custom_report_${reportData.period.start}_to_${reportData.period.end}`,
        "Custom Report",
      );
    } else {
      res.json({
        success: true,
        data: reportData,
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Download complete sales report (all time)
exports.downloadCompleteReport = async (req, res) => {
  try {
    const { format = "excel" } = req.query;

    const bills = await Bill.find().sort({ billDate: -1 }).populate("orderId");

    const reportData = bills.map((bill) => ({
      "Bill Number": bill.billNumber,
      "Customer Name": bill.customerName,
      "Table Number": bill.tableNumber,
      Date: moment(bill.billDate).format("YYYY-MM-DD"),
      Time: moment(bill.billDate).format("HH:mm:ss"),
      Subtotal: bill.subtotal,
      Tax: bill.taxAmount,
      Discount: bill.discountAmount,
      "Total Amount": bill.totalAmount,
      "Payment Method": bill.paymentMethod,
      "Generated By": bill.generatedBy,
      Items: bill.items.map((i) => `${i.name} (x${i.quantity})`).join(" | "),
    }));

    if (format === "csv") {
      const fields = [
        "Bill Number",
        "Customer Name",
        "Table Number",
        "Date",
        "Time",
        "Subtotal",
        "Tax",
        "Discount",
        "Total Amount",
        "Payment Method",
        "Generated By",
        "Items",
      ];
      return sendCSV(
        res,
        reportData,
        `complete_sales_report_${moment().format("YYYY-MM-DD")}`,
        fields,
      );
    } else {
      return await sendExcel(
        res,
        reportData,
        `complete_sales_report_${moment().format("YYYY-MM-DD")}`,
        "All Sales",
      );
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
