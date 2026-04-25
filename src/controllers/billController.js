const Bill = require("../models/Bill");
const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");
const moment = require("moment");

// Generate unique bill number
const generateBillNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000);
  return `BIL-${year}${month}${day}-${random}`;
};

// Create new bill after order
exports.createBill = async (req, res) => {
  try {
    const {
      orderId,
      customerName,
      tableNumber,
      paymentMethod,
      discount,
      tax,
      generatedBy,
    } = req.body;

    // Find the order
    const order = await Order.findById(orderId).populate("items.itemId");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.isBilled) {
      return res
        .status(400)
        .json({ success: false, message: "Order already billed" });
    }

    // Calculate bill amounts
    let subtotal = 0;
    const billItems = order.items.map((item) => {
      const itemTotal = item.quantity * item.price;
      subtotal += itemTotal;
      return {
        itemId: item.itemId._id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: itemTotal,
      };
    });

    const taxAmount = (subtotal * tax) / 100;
    const discountAmount = (subtotal * discount) / 100;
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Create bill
    const bill = new Bill({
      billNumber: generateBillNumber(),
      orderId: order._id,
      customerName,
      tableNumber,
      items: billItems,
      subtotal,
      tax: tax || 0,
      taxAmount,
      discount: discount || 0,
      discountAmount,
      totalAmount,
      paymentMethod,
      paymentStatus: "paid",
      generatedBy,
    });

    await bill.save();

    // Update order
    order.isBilled = true;
    order.billId = bill._id;
    await order.save();

    res.status(201).json({
      success: true,
      message: "Bill generated successfully",
      data: bill,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get bill by ID
exports.getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate("orderId");
    if (!bill) {
      return res
        .status(404)
        .json({ success: false, message: "Bill not found" });
    }
    res.json({ success: true, data: bill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all bills with filters
exports.getAllBills = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      paymentMethod,
      page = 1,
      limit = 10,
    } = req.query;

    let filter = {};

    if (startDate && endDate) {
      filter.billDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    const bills = await Bill.find(filter)
      .sort({ billDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("orderId");

    const total = await Bill.countDocuments(filter);

    res.json({
      success: true,
      data: bills,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
