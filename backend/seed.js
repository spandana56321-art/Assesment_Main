const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Admin = require("./models/Admin");

async function seedAdmin() {
  try {
    console.log("Connecting with MONGO_URI:", process.env.MONGO_URI);

    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected to host:", conn.connection.host);
    console.log("Connected to database:", conn.connection.name);

    const deleted = await Admin.deleteMany({});
    console.log("Deleted existing admins:", deleted.deletedCount);

    const admin = await Admin.create({
      name: "Super Admin",
      email: "admin@myhourly.com",
      password: "Admin@123",
    });

    console.log("Admin document created with _id:", admin._id.toString());

    // Read it back exactly the way loginAdmin() will, to prove it's really there
    const check = await Admin.findOne({ email: "admin@myhourly.com" });
    console.log("Re-fetched admin exists:", !!check);
    console.log("Stored (hashed) password starts with:", check.password.slice(0, 10));

    console.log("");
    console.log("Login with:");
    console.log("  email:    admin@myhourly.com");
    console.log("  password: Admin@123");
  } catch (error) {
    console.error("Seeding admin failed:", error);
  } finally {
    process.exit();
  }
}

seedAdmin();