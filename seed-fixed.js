require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./src/models/User");
const MenuItem = require("./src/models/MenuItem");
const connectDB = require("./src/config/database");

const seedDatabase = async () => {
  try {
    await connectDB();

    // Hash passwords manually
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash("Admin@123", salt);
    const managerPassword = await bcrypt.hash("Manager@123", salt);
    const staffPassword = await bcrypt.hash("Staff@123", salt);

    // Create admin user using create method (bypasses pre-save hook issues)
    let adminExists = await User.findOne({ role: "admin" });
    if (!adminExists) {
      await User.create({
        username: "admin",
        email: "admin@hotel.com",
        password: adminPassword,
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
      console.log("✅ Admin user created");
    } else {
      console.log("⚠️ Admin user already exists");
    }

    // Create manager user
    let managerExists = await User.findOne({ username: "manager" });
    if (!managerExists) {
      await User.create({
        username: "manager",
        email: "manager@hotel.com",
        password: managerPassword,
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
      console.log("✅ Manager user created");
    } else {
      console.log("⚠️ Manager user already exists");
    }

    // Create staff user
    let staffExists = await User.findOne({ username: "staff" });
    if (!staffExists) {
      await User.create({
        username: "staff",
        email: "staff@hotel.com",
        password: staffPassword,
        fullName: "Kitchen Staff",
        role: "staff",
        phone: "1234567892",
        isActive: true,
        permissions: [],
      });
      console.log("✅ Staff user created");
    } else {
      console.log("⚠️ Staff user already exists");
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
        {
          name: "Pasta Alfredo",
          category: "main_course",
          price: 11.99,
          isAvailable: true,
        },
        {
          name: "Cold Coffee",
          category: "beverage",
          price: 3.99,
          isAvailable: true,
        },
      ];

      await MenuItem.insertMany(menuItems);
      console.log("✅ Sample menu items created");
    } else {
      console.log("⚠️ Menu items already exist");
    }

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📝 Login Credentials:");
    console.log("Admin:   admin / Admin@123");
    console.log("Manager: manager / Manager@123");
    console.log("Staff:   staff / Staff@123");

    // Display database info
    const userCount = await User.countDocuments();
    const menuItemCount = await MenuItem.countDocuments();
    console.log(`\n📊 Database Stats:`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Menu Items: ${menuItemCount}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    console.error("Error details:", error.message);
    if (error.code === 11000) {
      console.error("Duplicate key error - users already exist");
    }
    process.exit(1);
  }
};

// Run seed function
seedDatabase();
