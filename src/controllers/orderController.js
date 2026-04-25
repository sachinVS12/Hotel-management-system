const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");

// Generate unique order number
const generateOrderNumber = () => {
  const date = new Date();
  const timestamp = date.getTime();
  return `ORD-${timestamp}`;
};

// Create new order (before billing)
exports.createOrder = async (req, res) => {
  try {
    const { customerName, tableNumber, items, notes } = req.body;

    // Validate items and fetch prices
    let orderItems = [];
    for (let item of items) {
      const menuItem = await MenuItem.findById(item.itemId);
      if (!menuItem) {
        return res
          .status(404)
          .json({ success: false, message: `Item ${item.itemId} not found` });
      }
      if (!menuItem.isAvailable) {
        return res
          .status(400)
          .json({
            success: false,
            message: `${menuItem.name} is not available`,
          });
      }

      orderItems.push({
        itemId: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price,
        specialInstructions: item.specialInstructions || "",
      });
    }

    const order = new Order({
      orderNumber: generateOrderNumber(),
      customerName,
      tableNumber,
      items: orderItems,
      orderStatus: "pending",
      notes: notes || "",
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: "Order created successfully. Please proceed to billing.",
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: status },
      { new: true },
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.json({
      success: true,
      message: "Order status updated",
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("items.itemId");
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all active orders (not billed)
exports.getActiveOrders = async (req, res) => {
  try {
    const orders = await Order.find({ isBilled: false })
      .sort({ createdAt: -1 })
      .populate("items.itemId");

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
