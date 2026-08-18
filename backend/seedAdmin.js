const mongoose = require("mongoose");
const Admin = require("./models/Admin");



require("dotenv").config();


mongoose.connect(process.env.MONGO_URI);

async function seedAdmin() {
  await Admin.deleteMany({});

  await Admin.create({
    name: "Super Admin",
    email: "admin@myhourly.com",
    password: "Admin@123",
  });

  console.log("Admin created");
  process.exit();
}

seedAdmin();