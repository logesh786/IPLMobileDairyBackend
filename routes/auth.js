const express = require("express");
const router = express.Router();

const { getPool } = require("../db");

// =====================================================
// GET USER TYPES
// GET /api/usertypes
// =====================================================

router.get("/usertypes", async (req, res) => {
  try {
    console.log("GET /api/usertypes");

    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        UserTypeCode,
        UserTypeName
      FROM tbl_UserType
      ORDER BY UserTypeCode
    `);

    console.log("USER TYPES:", result.recordset);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("GET /api/usertypes ERROR:", error);

    res.status(500).json({
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

router.get("/Company", async (req, res) => {
  try {
    console.log("GET /api/Company");

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

    const companies = result.recordset.map((row) => ({
      CompanyCode: row.CompanyCode,
      EDNO: row.EDNO,
      CompanyName:
        `${row.Header1 || ""} ${row.Header2 || ""}`.trim(),
      MobileNo: row.MobileNo,
    }));

    console.log("COMPANIES:", companies.length);

    res.status(200).json(companies);
  } catch (error) {
    console.error("GET /api/Company ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load companies",
      error: error.message,
    });
  }
});

// =====================================================
// LOGIN
// POST /api/login
// =====================================================

router.post("/login", async (req, res) => {
  try {
    console.log("======================================");
    console.log("POST /api/login");
    console.log("LOGIN REQUEST:", req.body);
    console.log("======================================");

    const {
      userCode,
      password,
      userTypeCode,
      companyCode,
      memberNumber,
      registeredMobileNumber,
    } = req.body;

    // =================================================
    // VALIDATION
    // =================================================

    if (
      userCode === undefined ||
      userCode === null ||
      String(userCode).trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "User code is required",
      });
    }

    if (
      password === undefined ||
      password === null ||
      String(password).trim() === ""
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

    const request = pool.request();

    request.input("UserCode", String(userCode).trim());
    request.input("Password", String(password));

    // =================================================
    // LOGIN QUERY
    // =================================================

    const result = await request.query(`
      SELECT
        U.UserCode,
        U.UserTypeCode,
        U.UserName,
        U.Password,
        U.RegisteredMobileNumber,
        U.MemberNumber,
        U.CompanyCode,

        UT.UserTypeName,

        C.Header1,
        C.Header2,
        C.MobileNo

      FROM tbl_User U

      LEFT JOIN tbl_UserType UT
        ON U.UserTypeCode = UT.UserTypeCode

      LEFT JOIN tbl_Company C
        ON U.CompanyCode = C.CompanyCode

      WHERE
        U.UserCode = TRY_CONVERT(INT, @UserCode)
        AND U.Password = @Password
    `);

    // =================================================
    // USER NOT FOUND
    // =================================================

    if (result.recordset.length === 0) {
      console.log("LOGIN FAILED: Invalid credentials");

      return res.status(401).json({
        success: false,
        message: "Invalid user code or password",
      });
    }

    const row = result.recordset[0];

    // =================================================
    // OPTIONAL VALIDATION
    // =================================================

    if (
      userTypeCode !== undefined &&
      userTypeCode !== null &&
      String(userTypeCode).trim() !== "" &&
      Number(userTypeCode) !== Number(row.UserTypeCode)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid user type",
      });
    }

    if (
      companyCode !== undefined &&
      companyCode !== null &&
      String(companyCode).trim() !== "" &&
      Number(companyCode) !== Number(row.CompanyCode)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid company",
      });
    }

    if (
      memberNumber !== undefined &&
      memberNumber !== null &&
      String(memberNumber).trim() !== "" &&
      String(memberNumber).trim() !== String(row.MemberNumber || "").trim()
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid member number",
      });
    }

    if (
      registeredMobileNumber !== undefined &&
      registeredMobileNumber !== null &&
      String(registeredMobileNumber).trim() !== "" &&
      String(registeredMobileNumber).trim() !==
        String(row.RegisteredMobileNumber || "").trim()
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid registered mobile number",
      });
    }

    // =================================================
    // BUILD USER RESPONSE
    // =================================================

    const user = {
      userCode: row.UserCode,
      userName: row.UserName,

      userTypeCode: row.UserTypeCode,
      userTypeName: row.UserTypeName || "",

      companyCode: row.CompanyCode,

      companyName:
        `${row.Header1 || ""} ${row.Header2 || ""}`.trim(),

      memberNumber: row.MemberNumber || "",

      registeredMobileNumber:
        row.RegisteredMobileNumber || "",
    };

    // =================================================
    // SUCCESS
    // =================================================

    console.log("LOGIN SUCCESS:");
    console.log({
      userCode: user.userCode,
      userName: user.userName,
      userTypeCode: user.userTypeCode,
      companyCode: user.companyCode,
      memberNumber: user.memberNumber,
    });

    console.log("======================================");

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user,
    });
  } catch (error) {
    console.error("======================================");
    console.error("POST /api/login ERROR:");
    console.error(error);
    console.error("======================================");

    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
});

// =====================================================
// EXPORT
// =====================================================

module.exports = router;