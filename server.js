// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();

// const { getPool } = require("./db");

// const authRoutes = require("./routes/auth");
// const purchaseRoutes = require("./routes/purchase");

// const app = express();

// // =====================================================
// // PORT
// // =====================================================

// const PORT = process.env.PORT || 5000;

// // =====================================================
// // CORS
// // =====================================================

// app.use(
//     cors({
//         origin: "*",
//         methods: [
//             "GET",
//             "POST",
//             "PUT",
//             "PATCH",
//             "DELETE",
//             "OPTIONS"
//         ],
//         allowedHeaders: [
//             "Content-Type",
//             "Authorization"
//         ]
//     })
// );

// // =====================================================
// // BODY PARSER
// // =====================================================

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // =====================================================
// // ROOT / HEALTH CHECK
// // =====================================================

// app.get("/", async (req, res) => {
//     let dbConnected = true;
//     let dbError = null;

//     try {
//         await getPool();
//     } catch (error) {
//         dbConnected = false;
//         dbError = error.message;
//     }

//     res.status(200).json({
//         success: true,
//         message: "Mobile Dairy API Running...",
//         dbConnected,
//         dbError
//     });
// });

// // =====================================================
// // API ROUTES
// // =====================================================

// app.use("/api", authRoutes);
// app.use("/api", purchaseRoutes);

// // =====================================================
// // 404
// // =====================================================

// app.use((req, res) => {
//     console.log(
//         `404 - ${req.method} ${req.originalUrl}`
//     );

//     res.status(404).json({
//         success: false,
//         message: `Route not found: ${req.method} ${req.originalUrl}`
//     });
// });

// // =====================================================
// // ERROR HANDLER
// // =====================================================

// app.use((err, req, res, next) => {
//     console.error("======================================");
//     console.error("SERVER ERROR");
//     console.error(err);
//     console.error("======================================");

//     res.status(500).json({
//         success: false,
//         message: err.message || "Internal server error"
//     });
// });

// // =====================================================
// // START SERVER
// // =====================================================

// app.listen(PORT, () => {
//     console.log("======================================");
//     console.log("🚀 MOBILE DAIRY BACKEND");
//     console.log("======================================");
//     console.log(`🚀 Server running on port ${PORT}`);
//     console.log("======================================");
// });

// // =====================================================
// // DATABASE CONNECTION
// // =====================================================

// getPool()
//     .then(() => {
//         console.log("✅ Connected to SQL Server");
//     })
//     .catch((error) => {
//         console.error(
//             "⚠️ Could not connect to SQL Server on startup."
//         );

//         console.error(
//             "Database error:",
//             error.message
//         );

//         console.log(
//             "Server will remain running and retry DB connection when required."
//         );
//     });









const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");

const app = express();

const PORT = process.env.PORT || 5000;

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

// =====================================================
// TEST
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Mobile Dairy Backend is running",
  });
});

// =====================================================
// API ROUTES
// =====================================================

app.use("/api", authRoutes);

// =====================================================
// 404
// =====================================================

app.use((req, res) => {
  console.log(
    "ROUTE NOT FOUND:",
    req.method,
    req.originalUrl
  );

  res.status(404).json({
    success: false,
    message:
      `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
  });
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log("======================================");
  console.log("Mobile Dairy Backend Started");
  console.log("PORT:", PORT);
  console.log("======================================");
});