const Bill = require("../models/Bill");
const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const moment = require("moment");

// Get manager dashboard data
exports.getManagerDashboard = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = moment(today).startOf("day").toDate();
    const endOfDay = moment(today).endOf("day").toDate();
    const startOfWeek = moment(today).startOf("week").toDate();

    // Today's performance
    const todayBills = await Bill.find({
      billDate: { $gte: startOfDay, $lte: endOfDay },
    });

    const todayRevenue = todayBills.reduce(
      (sum, bill) => sum + bill.totalAmount,
      0,
    );
    const todayOrders = todayBills.length;
    const averageBillValue = todayOrders > 0 ? todayRevenue / todayOrders : 0;

    // Active orders
    const activeOrders = await Order.find({
      isBilled: false,
      orderStatus: { $ne: "cancelled" },
    }).populate("items.itemId");

    // Staff performance (if manager has staff under them)
    const staffUsers = await User.find({ role: "staff", isActive: true });
    const staffPerformance = [];

    for (const staff of staffUsers) {
      const staffBills = await Bill.find({
        generatedBy: staff.fullName,
        billDate: { $gte: startOfWeek },
      });

      staffPerformance.push({
        name: staff.fullName,
        totalBills: staffBills.length,
        totalRevenue: staffBills.reduce(
          (sum, bill) => sum + bill.totalAmount,
          0,
        ),
        averageBill:
          staffBills.length > 0
            ? staffBills.reduce((sum, bill) => sum + bill.totalAmount, 0) /
              staffBills.length
            : 0,
      });
    }

    // Today's hourly revenue
    const hourlyRevenue = [];
    for (let i = 0; i < 24; i++) {
      const hourStart = moment(startOfDay).add(i, "hours").toDate();
      const hourEnd = moment(hourStart).add(1, "hour").toDate();

      const hourBills = todayBills.filter(
        (bill) => bill.billDate >= hourStart && bill.billDate < hourEnd,
      );

      hourlyRevenue.push({
        hour: i,
        revenue: hourBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
        orders: hourBills.length,
      });
    }

    // Low stock items (if quantity tracking is implemented)
    const lowStockItems = await MenuItem.find({ isAvailable: true }).limit(5); // In production, add quantity field and filter

    // Recent bills
    const recentBills = await Bill.find()
      .sort({ billDate: -1 })
      .limit(10)
      .populate("orderId");

    res.json({
      success: true,
      data: {
        summary: {
          todayRevenue,
          todayOrders,
          averageBillValue,
          activeOrdersCount: activeOrders.length,
        },
        staffPerformance,
        hourlyRevenue,
        lowStockItems,
        activeOrders: activeOrders.map((order) => ({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          tableNumber: order.tableNumber,
          status: order.orderStatus,
          itemsCount: order.items.length,
        })),
        recentBills: recentBills.map((bill) => ({
          billNumber: bill.billNumber,
          customerName: bill.customerName,
          amount: bill.totalAmount,
          time: moment(bill.billDate).format("HH:mm"),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get sales report for manager
exports.getSalesReport = async (req, res) => {
  try {
    const { period = "today" } = req.query;
    let startDate,
      endDate = new Date();

    switch (period) {
      case "today":
        startDate = moment().startOf("day").toDate();
        break;
      case "yesterday":
        startDate = moment().subtract(1, "day").startOf("day").toDate();
        endDate = moment().subtract(1, "day").endOf("day").toDate();
        break;
      case "week":
        startDate = moment().startOf("week").toDate();
        break;
      case "month":
        startDate = moment().startOf("month").toDate();
        break;
      default:
        startDate = moment().startOf("day").toDate();
    }

    const bills = await Bill.find({
      billDate: { $gte: startDate, $lte: endDate },
    });

    const totalRevenue = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const totalOrders = bills.length;

    // Category wise breakdown
    const categorySales = {};
    for (const bill of bills) {
      for (const item of bill.items) {
        const menuItem = await MenuItem.findById(item.itemId);
        const category = menuItem ? menuItem.category : "other";

        if (!categorySales[category]) {
          categorySales[category] = { quantity: 0, revenue: 0 };
        }
        categorySales[category].quantity += item.quantity;
        categorySales[category].revenue += item.total;
      }
    }

    res.json({
      success: true,
      data: {
        period,
        startDate: moment(startDate).format("YYYY-MM-DD"),
        endDate: moment(endDate).format("YYYY-MM-DD"),
        totalRevenue,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        categorySales,
        bills: bills.map((bill) => ({
          billNumber: bill.billNumber,
          customerName: bill.customerName,
          amount: bill.totalAmount,
          date: moment(bill.billDate).format("YYYY-MM-DD HH:mm"),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Menu management (manager can update menu)
exports.getAllMenuItems = async (req, res) => {
  try {
    const menuItems = await MenuItem.find();
    res.json({ success: true, data: menuItems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createMenuItem = async (req, res) => {
  try {
    const menuItem = new MenuItem(req.body);
    await menuItem.save();

    await ActivityLog.create({
      user: {
        userId: req.user._id,
        username: req.user.username,
        role: req.user.role,
      },
      action: "create",
      entity: "menu",
      entityId: menuItem._id,
      details: { name: menuItem.name, price: menuItem.price },
    });

    res.status(201).json({ success: true, data: menuItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const menuItem = await MenuItem.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!menuItem) {
      return res
        .status(404)
        .json({ success: false, message: "Menu item not found" });
    }

    await ActivityLog.create({
      user: {
        userId: req.user._id,
        username: req.user.username,
        role: req.user.role,
      },
      action: "update",
      entity: "menu",
      entityId: menuItem._id,
      details: { name: menuItem.name, updates: req.body },
    });

    res.json({ success: true, data: menuItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const menuItem = await MenuItem.findByIdAndDelete(id);

    if (!menuItem) {
      return res
        .status(404)
        .json({ success: false, message: "Menu item not found" });
    }

    await ActivityLog.create({
      user: {
        userId: req.user._id,
        username: req.user.username,
        role: req.user.role,
      },
      action: "delete",
      entity: "menu",
      entityId: menuItem._id,
      details: { name: menuItem.name },
    });

    res.json({ success: true, message: "Menu item deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Staff management (for manager)
exports.getStaffList = async (req, res) => {
  try {
    const staff = await User.find({ role: "staff" }).select("-password");
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all orders (for kitchen display)
exports.getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (status) filter.orderStatus = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate("items.itemId");

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
