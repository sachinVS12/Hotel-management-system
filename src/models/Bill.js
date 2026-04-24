const mongoose = require("mongoose");

const billSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: true,
      unique: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
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
        total: Number,
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "upi", "other"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "partial"],
      default: "pending",
    },
    billDate: {
      type: Date,
      default: Date.now,
    },
    generatedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Index for better query performance
billSchema.index({ billDate: -1 });
billSchema.index({ billNumber: 1 });

module.exports = mongoose.model("Bill", billSchema);
