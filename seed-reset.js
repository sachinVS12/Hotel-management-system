require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./src/models/User");
const MenuItem = require("./src/models/MenuItem");
const Bill = require("./src/models/Bill");
const Order = require("./src/models/Order");
const ActivityLog = require("./src/models/ActivityLog");
const connectDB = require("./src/config/database");

const resetAndSeed = async () => {
  try {
    await connectDB();

    console.log("🗑️  Clearing all data...");
    await User.deleteMany({});
    await MenuItem.deleteMany({});
    await Bill.deleteMany({});
    await Order.deleteMany({});
    await ActivityLog.deleteMany({});
    console.log("✅ All collections cleared");

    // Hash passwords
    const salt = await bcrypt.genSalt(10);

    // Create users
    const users = [
      {
        username: "admin",
        email: "admin@hotel.com",
        password: await bcrypt.hash("Admin@123", salt),
        fullName: "System Administrator",
        role: "admin",
        phone: "1234567890",
        isActive: true,
        permissions: [
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
      {
        username: "manager",
        email: "manager@hotel.com",
        password: await bcrypt.hash("Manager@123", salt),
        fullName: "Hotel Manager",
        role: "manager",
        phone: "1234567891",
        isActive: true,
        permissions: [
          "view_reports",
          "edit_menu",
          "view_all_bills",
          "view_dashboard",
        ],
      },
      {
        username: "staff",
        email: "staff@hotel.com",
        password: await bcrypt.hash("Staff@123", salt),
        fullName: "Kitchen Staff",
        role: "staff",
        phone: "1234567892",
        isActive: true,
        permissions: [],
      },
    ];

    await User.insertMany(users);
    console.log("✅ Users created");

    // Create menu items
    const menuItems = [
      {
        name: "Margherita Pizza",
        category: "main_course",
        price: 12.99,
        isAvailable: true,
      },
      {
        name: "Chicken Burger",
        category: "main_course",
        price: 9.99,
        isAvailable: true,
      },
      {
        name: "Caesar Salad",
        category: "starter",
        price: 7.99,
        isAvailable: true,
      },
      {
        name: "French Fries",
        category: "snacks",
        price: 4.99,
        isAvailable: true,
      },
      { name: "Coke", category: "beverage", price: 2.99, isAvailable: true },
      {
        name: "Chocolate Cake",
        category: "dessert",
        price: 5.99,
        isAvailable: true,
      },
      {
        name: "Spring Rolls",
        category: "starter",
        price: 6.99,
        isAvailable: true,
      },
      {
        name: "Grilled Sandwich",
        category: "snacks",
        price: 8.99,
        isAvailable: true,
      },
    ];

    await MenuItem.insertMany(menuItems);
    console.log("✅ Menu items created");

    console.log("\n🎉 Database reset and seeded successfully!");
    console.log("\n📝 Login Credentials:");
    console.log("Admin:   admin / Admin@123");
    console.log("Manager: manager / Manager@123");
    console.log("Staff:   staff / Staff@123");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

resetAndSeed();
