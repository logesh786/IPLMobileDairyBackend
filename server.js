const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { getPool } = require("./db");

const authRoutes = require("./routes/auth");
const companyRoutes = require("./routes/company");
const purchaseRoutes = require("./routes/purchase");

const app = express();

// =====================================================
// CORS
// =====================================================

app.use(
  cors({
    origin: "*",
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// =====================================================
// BODY PARSER
// =====================================================

app.use(express.json());

// =====================================================
// API ROUTES
// =====================================================

app.use("/api", authRoutes);
app.use("/api", companyRoutes);
app.use("/api", purchaseRoutes);

// =====================================================
// ROOT TEST
// =====================================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Mobile Dairy API Running...",
  });
});

// =====================================================
// 404
// =====================================================

app.use((req, res) => {
  console.log(
    `404: ${req.method} ${req.originalUrl}`
  );

  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  console.error("======================================");
  console.error("SERVER ERROR");
  console.error(err);
  console.error("======================================");

  res.status(500).json({
    success: false,
    message:
      err.message || "Internal server error.",
  });
});

// =====================================================
// PORT
// =====================================================

const PORT = process.env.PORT || 5000;

// =====================================================
// START SERVER
// =====================================================

async function startServer() {
  try {
    await getPool();

    console.log(
      "✅ Connected to SQL Server"
    );

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