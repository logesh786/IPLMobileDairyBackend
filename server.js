const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { getPool } = require("./db");
const authRoutes = require("./routes/auth");
const purchaseRoutes = require("./routes/purchase");

const app = express();

// =====================================================
// CORS
// =====================================================

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// =====================================================
// ROUTES
// =====================================================

app.use("/api", authRoutes);
app.use("/api", purchaseRoutes);

// =====================================================
// ROOT
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Mobile Dairy API Running..."
  });
});

// =====================================================
// 404
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// =====================================================
// ERROR
// =====================================================

app.use((err, req, res, next) => {
  console.error("======================================");
  console.error("SERVER ERROR");
  console.error(err);
  console.error("======================================");

  res.status(500).json({
    success: false,
    message: err.message || "Internal server error."
  });
});

// =====================================================
// START
// =====================================================

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await getPool();

    console.log("✅ Connected to SQL Server");

    app.listen(PORT, () => {
      console.log(
        `🚀 Server running on port ${PORT}`
      );
    });

  } catch (error) {
    console.error(
      "❌ Server startup error:",
      error
    );

    process.exit(1);
  }
}

startServer();