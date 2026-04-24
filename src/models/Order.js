const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
    },
    customerName: {
      type: String,
      required: true,
    },
    tableNumber: {
      type: Number,
      required: true,
    },
    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MenuItem",
          required: true,
        },
        name: String,
        quantity: Number,
        price: Number,
        specialInstructions: String,
      },
    ],
    orderStatus: {
      type: String,
      enum: ["pending", "preparing", "ready", "served", "cancelled"],
      default: "pending",
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    isBilled: {
      type: Boolean,
      default: false,
    },
    notes: String,
  },
  {
    timestamps: true,
  },
);

orderSchema.index({ orderDate: -1 });
orderSchema.index({ orderStatus: 1 });

module.exports = mongoose.model("Order", orderSchema);
