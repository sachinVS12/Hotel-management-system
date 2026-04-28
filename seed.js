require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");
const MenuItem = require("./src/models/MenuItem");
const connectDB = require("./src/config/database");

const seedDatabase = async () => {
  try {
    await connectDB();

    // Create admin user
    const adminExists = await User.findOne({ role: "admin" });
    if (!adminExists) {
      await User.create({
        username: "admin",
        email: "admin@hotel.com",
        password: "Admin@123",
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
      });
      console.log("Admin user created");
    }

    // Create manager user
    const managerExists = await User.findOne({ username: "manager" });
    if (!managerExists) {
      await User.create({
        username: "manager",
        email: "manager@hotel.com",
        password: "Manager@123",
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
      });
      console.log("Manager user created");
    }

    // Create staff user
    const staffExists = await User.findOne({ username: "staff" });
    if (!staffExists) {
      await User.create({
        username: "staff",
        email: "staff@hotel.com",
        password: "Staff@123",
        fullName: "Kitchen Staff",
        role: "staff",
        phone: "1234567892",
        isActive: true,
        permissions: [],
      });
      console.log("Staff user created");
    }

    // Add sample menu items
    const menuCount = await MenuItem.countDocuments();
    if (menuCount === 0) {
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
      console.log("Sample menu items created");
    }

    console.log("Database seeding completed!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
