const express = require("express");
const cors = require("cors");
const sql = require("mssql");

const { getPool } = require("./db");
const registerRouter = require("./routes/register");

const app = express();

// =====================================================
// PORT
// =====================================================

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
app.use(express.urlencoded({ extended: true }));

app.use("/api/register", registerRouter);
// =====================================================
// HELPERS
// =====================================================

const hasValue = (value) => {
  return (
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ""
  );
};

const getCompanyName = (company) => {
  return `${company?.Header1 || ""} ${
    company?.Header2 || ""
  }`.trim();
};

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Backend API is running",
    port: PORT,
  });
});

// =====================================================
// API HEALTH CHECK
// =====================================================

app.get("/api", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "API is running",
  });
});

// =====================================================
// GET USER TYPES
// GET /api/usertypes
// =====================================================

app.get("/api/usertypes", async (req, res) => {
  console.log("======================================");
  console.log("GET /api/usertypes");
  console.log("======================================");

  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        UserTypeCode,
        UserTypeName
      FROM tbl_UserType
      ORDER BY UserTypeCode
    `);

    console.log(
      "USER TYPES:",
      result.recordset
    );

    return res.status(200).json(
      result.recordset
    );
  } catch (error) {
    console.error(
      "GET /api/usertypes ERROR:"
    );

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to load user types",
      error: error.message,
    });
  }
});

// =====================================================
// GET COMPANIES / SOCIETIES
// GET /api/Company
// =====================================================

app.get("/api/Company", async (req, res) => {
  console.log("======================================");
  console.log("GET /api/Company");
  console.log("======================================");

  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        CompanyCode,
        EDNO,
        Header1,
        Header2,
        MobileNo
      FROM tbl_Company
      WHERE
        LEN(ISNULL(MobileNo, '')) = 10
        AND EDNO > 0
      ORDER BY CompanyCode
    `);

    const companies =
      result.recordset.map((row) => ({
        CompanyCode: row.CompanyCode,

        EDNO: row.EDNO,

        CompanyName:
          `${row.Header1 || ""} ${
            row.Header2 || ""
          }`.trim(),

        MobileNo: row.MobileNo,
      }));

    console.log(
      "COMPANIES COUNT:",
      companies.length
    );

    return res.status(200).json(
      companies
    );
  } catch (error) {
    console.error(
      "GET /api/Company ERROR:"
    );

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to load companies",
      error: error.message,
    });
  }
});

// =====================================================
// REGISTER
//
// POST /api/register
//
// IMPORTANT
// =====================================================

app.use(
  "/api/register",
  registerRouter
);

// =====================================================
// LOGIN
// POST /api/login
// =====================================================

app.post("/api/login", async (req, res) => {
  console.log("======================================");
  console.log("POST /api/login");
  console.log("LOGIN REQUEST");
  console.log(req.body);
  console.log("======================================");

  try {
    const {
      userTypeId,
      UserTypeCode,
      userName,
      UserName,
      password,
      Password,
    } = req.body || {};

    const finalUserTypeCode = Number(
      userTypeId ??
        UserTypeCode
    );

    const finalUserName =
      userName ??
      UserName ??
      "";

    const finalPassword =
      password ??
      Password ??
      "";

    console.log(
      "NORMALIZED LOGIN:"
    );

    console.log({
      userTypeId,
      finalUserTypeCode,
      finalUserName,
      passwordProvided:
        hasValue(finalPassword),
    });

    // =================================================
    // VALIDATION
    // =================================================

    if (
      !Number.isInteger(
        finalUserTypeCode
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type",
      });
    }

    if (
      !hasValue(finalUserName)
    ) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    if (
      !hasValue(finalPassword)
    ) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    // =================================================
    // DATABASE
    // =================================================

    const pool = await getPool();

    const request =
      pool.request();

    request.input(
      "UserName",
      sql.VarChar(50),
      String(
        finalUserName
      ).trim()
    );

    request.input(
      "Password",
      sql.NVarChar(50),
      String(finalPassword)
    );

    request.input(
      "UserTypeCode",
      sql.Int,
      finalUserTypeCode
    );

    // =================================================
    // LOGIN QUERY
    // =================================================

    const result =
      await request.query(`
        SELECT TOP 1

          U.UserCode,
          U.UserTypeCode,
          U.UserName,

          U.RegisteredMobileNumber,
          U.MemberNumber,
          U.CompanyCode,

          UT.UserTypeName,

          C.EDNO,
          C.Header1,
          C.Header2,
          C.MobileNo

        FROM tbl_User AS U

        LEFT JOIN tbl_UserType AS UT
          ON U.UserTypeCode =
             UT.UserTypeCode

        LEFT JOIN tbl_Company AS C
          ON U.CompanyCode =
             C.CompanyCode

        WHERE
          U.UserName =
            @UserName

          AND U.Password =
            @Password

          AND U.UserTypeCode =
            @UserTypeCode
      `);

    console.log(
      "LOGIN RECORD COUNT:",
      result.recordset.length
    );

    // =================================================
    // LOGIN FAILED
    // =================================================

    if (
      !result.recordset ||
      result.recordset.length === 0
    ) {
      console.log(
        "LOGIN FAILED"
      );

      return res.status(401).json({
        success: false,
        message:
          "Invalid username, password, or user type",
      });
    }

    // =================================================
    // LOGIN SUCCESS
    // =================================================

    const row =
      result.recordset[0];

    const companyName =
      getCompanyName(row);

    const user = {
      userCode:
        row.UserCode,

      userName:
        row.UserName,

      userTypeCode:
        row.UserTypeCode,

      userTypeName:
        row.UserTypeName || "",

      companyCode:
        row.CompanyCode,

      companyName:
        companyName,

      EDNO:
        row.EDNO,

      memberNumber:
        row.MemberNumber || "",

      registeredMobileNumber:
        row.RegisteredMobileNumber ||
        "",

      companyMobileNo:
        row.MobileNo || "",
    };

    console.log("======================================");
    console.log("LOGIN SUCCESS");
    console.log("======================================");

    console.log(
      "UserCode:",
      user.userCode
    );

    console.log(
      "UserName:",
      user.userName
    );

    console.log(
      "UserTypeCode:",
      user.userTypeCode
    );

    console.log(
      "UserType:",
      user.userTypeName
    );

    console.log(
      "CompanyCode:",
      user.companyCode
    );

    console.log(
      "CompanyName:",
      user.companyName
    );

    console.log(
      "MemberNumber:",
      user.memberNumber
    );

    console.log("======================================");

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user,
    });
  } catch (error) {
    console.error("======================================");
    console.error(
      "POST /api/login ERROR"
    );
    console.error("======================================");

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
});

// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {
  console.log("======================================");
  console.log("404 ROUTE NOT FOUND");
  console.log(
    req.method,
    req.originalUrl
  );
  console.log("======================================");

  return res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
  (err, req, res, next) => {
    console.error(
      "======================================"
    );

    console.error(
      "GLOBAL SERVER ERROR"
    );

    console.error(err);

    console.error(
      "======================================"
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
      error:
        err?.message ||
        "Unknown server error",
    });
  }
);

// =====================================================
// START SERVER
// =====================================================

app.listen(
  PORT,
  () => {
    console.log(
      "======================================"
    );

    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      `http://localhost:${PORT}`
    );

    console.log(
      "REGISTER ROUTE:"
    );

    console.log(
      "POST /api/register"
    );

    console.log(
      "LOGIN ROUTE:"
    );

    console.log(
      "POST /api/login"
    );

    console.log(
      "======================================"
    );
  }
);

// =====================================================
// EXPORT
// =====================================================

module.exports = app;