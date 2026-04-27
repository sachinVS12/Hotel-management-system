const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  user: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: String,
    role: String,
  },
  action: {
    type: String,
    required: true,
    enum: ["create", "update", "delete", "view", "login", "logout", "export"],
  },
  entity: {
    type: String,
    enum: ["bill", "order", "menu", "user", "report", "setting"],
  },
  entityId: String,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ "user.userId": 1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
