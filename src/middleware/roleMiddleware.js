const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions",
      });
    }
    next();
  };
};

exports.checkPermission = (permission) => {
  return (req, res, next) => {
    if (req.user.role === "admin") return next();

    if (req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Missing required permission: ${permission}`,
    });
  };
};
