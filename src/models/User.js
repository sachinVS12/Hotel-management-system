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

// Hash password before saving - FIXED VERSION with regular function
userSchema.pre("save", function (next) {
  const user = this;

  // Only hash the password if it has been modified (or is new)
  if (!user.isModified("password")) {
    return next();
  }

  // Generate salt and hash password
  bcrypt.genSalt(10, (err, salt) => {
    if (err) return next(err);

    bcrypt.hash(user.password, salt, (err, hash) => {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
