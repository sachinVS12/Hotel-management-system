const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Remove deprecated options - they're no longer needed in newer Mongoose versions
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
