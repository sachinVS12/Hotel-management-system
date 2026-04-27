const User = require("../models/User");
const Bill = require("../models/Bill");
const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");
const ActivityLog = require("../models/ActivityLog");
const moment = require("moment");

// Get admin dashboard data
exports.getAdminDashboard = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = moment(today).startOf("day").toDate();
    const endOfDay = moment(today).endOf("day").toDate();
    const startOfWeek = moment(today).startOf("week").toDate();
    const startOfMonth = moment(today).startOf("month").toDate();

    // Today's statistics
    const todayBills = await Bill.find({
      billDate: { $gte: startOfDay, $lte: endOfDay },
    });

    const todayRevenue = todayBills.reduce(
      (sum, bill) => sum + bill.totalAmount,
      0,
    );
    const todayOrders = todayBills.length;

    // Weekly statistics
    const weekBills = await Bill.find({
      billDate: { $gte: startOfWeek },
    });

    const weekRevenue = weekBills.reduce(
      (sum, bill) => sum + bill.totalAmount,
      0,
    );
    const weekOrders = weekBills.length;

    // Monthly statistics
    const monthBills = await Bill.find({
      billDate: { $gte: startOfMonth },
    });

    const monthRevenue = monthBills.reduce(
      (sum, bill) => sum + bill.totalAmount,
      0,
    );
    const monthOrders = monthBills.length;

    // System statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalMenuItems = await MenuItem.countDocuments();
    const activeOrders = await Order.countDocuments({
      isBilled: false,
      orderStatus: { $ne: "cancelled" },
    });

    // Recent activities
    const recentActivities = await ActivityLog.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate("user.userId", "fullName username");

    // Top selling items (all time)
    const allBills = await Bill.find();
    const itemSales = {};
    allBills.forEach((bill) => {
      bill.items.forEach((item) => {
        if (!itemSales[item.name]) {
          itemSales[item.name] = { quantity: 0, revenue: 0 };
        }
        itemSales[item.name].quantity += item.quantity;
        itemSales[item.name].revenue += item.total;
      });
    });

    const topItems = Object.entries(itemSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Payment method distribution
    const paymentDistribution = {
      cash: allBills
        .filter((b) => b.paymentMethod === "cash")
        .reduce((sum, b) => sum + b.totalAmount, 0),
      card: allBills
        .filter((b) => b.paymentMethod === "card")
        .reduce((sum, b) => sum + b.totalAmount, 0),
      upi: allBills
        .filter((b) => b.paymentMethod === "upi")
        .reduce((sum, b) => sum + b.totalAmount, 0),
      other: allBills
        .filter((b) => b.paymentMethod === "other")
        .reduce((sum, b) => sum + b.totalAmount, 0),
    };

    // Revenue trend (last 7 days)
    const revenueTrend = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = moment(today)
        .subtract(i, "days")
        .startOf("day")
        .toDate();
      const dayEnd = moment(today).subtract(i, "days").endOf("day").toDate();

      const dayBills = await Bill.find({
        billDate: { $gte: dayStart, $lte: dayEnd },
      });

      revenueTrend.push({
        date: moment(dayStart).format("YYYY-MM-DD"),
        revenue: dayBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
        orders: dayBills.length,
      });
    }

    res.json({
      success: true,
      data: {
        summary: {
          today: { revenue: todayRevenue, orders: todayOrders },
          week: { revenue: weekRevenue, orders: weekOrders },
          month: { revenue: monthRevenue, orders: monthOrders },
        },
        system: {
          totalUsers,
          activeUsers,
          totalMenuItems,
          activeOrders,
        },
        analytics: {
          topItems,
          paymentDistribution,
          revenueTrend,
        },
        recentActivities,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// User management
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      fullName,
      role,
      phone,
      address,
      permissions,
    } = req.body;

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Username or email already exists" });
    }

    const user = new User({
      username,
      email,
      password,
      fullName,
      role,
      phone,
      address,
      permissions: permissions || [],
    });

    await user.save();

    // Log activity
    await ActivityLog.create({
      user: {
        userId: req.user._id,
        username: req.user.username,
        role: req.user.role,
      },
      action: "create",
      entity: "user",
      entityId: user._id,
      details: { createdUser: username, role },
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: { id: user._id, username, email, role },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent role change if last admin
    if (updates.role && updates.role !== "admin") {
      const adminCount = await User.countDocuments({
        role: "admin",
        isActive: true,
      });
      const targetUser = await User.findById(id);

      if (
        targetUser.role === "admin" &&
        adminCount === 1 &&
        updates.role !== "admin"
      ) {
        return res.status(400).json({
          success: false,
          message: "Cannot change role of the last admin user",
        });
      }
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
    }).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await ActivityLog.create({
      user: {
        userId: req.user._id,
        username: req.user.username,
        role: req.user.role,
      },
      action: "update",
      entity: "user",
      entityId: user._id,
      details: { updatedUser: user.username, updates },
    });

    res.json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting last admin
    const adminCount = await User.countDocuments({
      role: "admin",
      isActive: true,
    });
    const targetUser = await User.findById(id);

    if (targetUser.role === "admin" && adminCount === 1) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete the last admin user",
      });
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await ActivityLog.create({
      user: {
        userId: req.user._id,
        username: req.user.username,
        role: req.user.role,
      },
      action: "delete",
      entity: "user",
      entityId: user._id,
      details: { deletedUser: user.username },
    });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// System logs
exports.getSystemLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      entity,
      startDate,
      endDate,
    } = req.query;

    let filter = {};
    if (action) filter.action = action;
    if (entity) filter.entity = entity;
    if (startDate && endDate) {
      filter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const logs = await ActivityLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("user.userId", "fullName username");

    const total = await ActivityLog.countDocuments(filter);

    res.json({
      success: true,
      data: logs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// System settings
exports.getSystemSettings = async (req, res) => {
  try {
    // Get system-wide settings
    const settings = {
      taxRate: process.env.TAX_RATE || 5,
      currency: process.env.CURRENCY || "USD",
      hotelName: process.env.HOTEL_NAME || "Hotel Billing System",
      address: process.env.HOTEL_ADDRESS || "123 Main Street",
      phone: process.env.HOTEL_PHONE || "+1234567890",
      email: process.env.HOTEL_EMAIL || "info@hotel.com",
      gstNumber: process.env.GST_NUMBER || "GST123456789",
    };

    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSystemSettings = async (req, res) => {
  try {
    const updates = req.body;
    // In production, save to database settings collection
    // For now, just log the update
    await ActivityLog.create({
      user: {
        userId: req.user._id,
        username: req.user.username,
        role: req.user.role,
      },
      action: "update",
      entity: "setting",
      details: { settings: updates },
    });

    res.json({ success: true, message: "Settings updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
