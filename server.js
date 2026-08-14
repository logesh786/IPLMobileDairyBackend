// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();

// const { getPool } = require("./db");
// const authRoutes = require("./routes/auth");
// const purchaseRoutes = require("./routes/purchase");

// const app = express();

// // ===============================
// // MIDDLEWARE
// // ===============================
// app.use(cors());
// app.use(express.json());

// // ===============================
// // ROUTES
// // ===============================
// app.use("/api", authRoutes);
// app.use("/api", purchaseRoutes);

// // ===============================
// // ROOT
// // ===============================
// app.get("/", (req, res) => {
//   res.json({
//     success: true,
//     message: "Mobile Dairy API Running..."
//   });
// });

// // ===============================
// // 404
// // ===============================
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: `Route not found: ${req.method} ${req.originalUrl}`
//   });
// });

// // ===============================
// // ERROR
// // ===============================
// app.use((err, req, res, next) => {
//   console.error("API Error:", err);

//   res.status(500).json({
//     success: false,
//     message: "Internal server error.",
//     error: err.message
//   });
// });

// // ===============================
// // PORT
// // ===============================
// const PORT = process.env.PORT || 5000;

// async function startServer() {
//   try {
//     console.log("Connecting to SQL Server...");

//     await getPool();

//     console.log("✅ Connected to SQL Server");

//     app.listen(PORT, () => {
//       console.log(
//         `🚀 Server running on port ${PORT}`
//       );
//     });

//   } catch (error) {
//     console.error(
//       "❌ Server startup error:",
//       error
//     );

//     process.exit(1);
//   }
// }

// startServer();

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

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without Origin
      // Example: Postman / server-to-server
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log(
        "CORS BLOCKED:",
        origin
      );

      return callback(
        new Error(
          `CORS blocked origin: ${origin}`
        )
      );
    },

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

    credentials: false,
  })
);

// =====================================================
// PREFLIGHT
// =====================================================

app.options("*", cors());

// =====================================================
// BODY PARSER
// =====================================================

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// =====================================================
// ROUTES
// =====================================================

app.use(
  "/api",
  authRoutes
);

app.use(
  "/api",
  purchaseRoutes
);

// =====================================================
// ROOT
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "Mobile Dairy API Running...",
  });
});

// =====================================================
// 404
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message:
      `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use(
  (err, req, res, next) => {
    console.error(
      "======================================"
    );

    console.error(
      "API ERROR"
    );

    console.error(
      "======================================"
    );

    console.error(
      "Message:",
      err.message
    );

    console.error(
      "Origin:",
      req.headers.origin
    );

    console.error(
      "Method:",
      req.method
    );

    console.error(
      "URL:",
      req.originalUrl
    );

    console.error(
      "======================================"
    );

    res.status(500).json({
      success: false,
      message:
        "Internal server error.",
      error: err.message,
    });
  }
);

// =====================================================
// PORT
// =====================================================

const PORT =
  process.env.PORT || 5000;

// =====================================================
// START SERVER
// =====================================================

async function startServer() {
  try {
    console.log(
      "======================================"
    );

    console.log(
      "Connecting to SQL Server..."
    );

    await getPool();

    console.log(
      "✅ Connected to SQL Server"
    );

    console.log(
      "======================================"
    );

    app.listen(
      PORT,
      () => {
        console.log(
          `🚀 Server running on port ${PORT}`
        );

        console.log(
          `🌐 Port: ${PORT}`
        );
      }
    );

  } catch (error) {
    console.error(
      "❌ Server startup error:"
    );

    console.error(
      error
    );

    process.exit(1);
  }
}

startServer();