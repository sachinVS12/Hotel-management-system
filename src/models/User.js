const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "manager", "staff"],
    default: "staff",
  },
  phone: {
    type: String,
    required: true,
  },
  address: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: Date,
  permissions: [
    {
      type: String,
      enum: [
        "view_reports",
        "edit_menu",
        "manage_staff",
        "view_all_bills",
        "delete_bills",
        "manage_users",
        "system_settings",
        "view_dashboard",
      ],
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Static method to hash password
userSchema.statics.hashPassword = async function (password) {
  return await bcrypt.hash(password, 10);
};

module.exports = mongoose.model("User", userSchema);
