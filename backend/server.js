require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const domainRoutes = require("./routes/domainRoutes");
const examRoutes = require("./routes/examRoutes");
const questionRoutes = require("./routes/questionRoutes");
const adminRoutes = require("./routes/adminRoutes");

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Exam App API running",
  });
});

/* =========================
   USER ROUTES
========================= */

app.use("/api/auth", authRoutes);
app.use("/api/domains", domainRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/questions", questionRoutes);

/* =========================
   ADMIN ROUTES
========================= */

app.use("/api/admin", adminRoutes);

/* =========================
   404
========================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 7000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


