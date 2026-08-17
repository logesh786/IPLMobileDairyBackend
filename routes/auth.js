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

    return res.status(200).json(result.recordset);

  } catch (error) {
    console.error("GET /api/usertypes ERROR:", error);

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

    return res.status(200).json(companies);

  } catch (error) {
    console.error("GET /api/Company ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load companies",
      error: error.message,
    });
  }
});


// =====================================================
// LOGIN
// POST /api/login
//
// Frontend sends:
//
// {
//   userTypeId: "...",
//   userName: "...",
//   password: "..."
// }
//
// Database:
//
// tbl_User.UserTypeCode
// tbl_User.UserName
// tbl_User.Password
// =====================================================

router.post("/login", async (req, res) => {
  try {
    console.log("======================================");
    console.log("POST /api/login");
    console.log("LOGIN REQUEST:", {
      userTypeId: req.body?.userTypeId,
      userName: req.body?.userName,
      passwordProvided:
        req.body?.password !== undefined &&
        req.body?.password !== null &&
        String(req.body.password).length > 0,
    });
    console.log("======================================");


    // =================================================
    // READ REQUEST DATA
    // =================================================

    const {
      userTypeId,
      userName,
      password,
    } = req.body;


    // =================================================
    // VALIDATE USER TYPE
    // =================================================

    if (
      userTypeId === undefined ||
      userTypeId === null ||
      String(userTypeId).trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "User type is required",
      });
    }


    // =================================================
    // VALIDATE USERNAME
    // =================================================

    if (
      userName === undefined ||
      userName === null ||
      String(userName).trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }


    // =================================================
    // VALIDATE PASSWORD
    // =================================================

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
    // VALIDATE USER TYPE NUMBER
    // =================================================

    const parsedUserTypeCode = Number(userTypeId);

    if (!Number.isInteger(parsedUserTypeCode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type",
      });
    }


    // =================================================
    // DATABASE CONNECTION
    // =================================================

    const pool = await getPool();

    const request = pool.request();


    // =================================================
    // SQL PARAMETERS
    // =================================================

    request.input(
      "UserName",
      String(userName).trim()
    );

    request.input(
      "Password",
      String(password)
    );

    request.input(
      "UserTypeCode",
      parsedUserTypeCode
    );


    // =================================================
    // LOGIN QUERY
    // =================================================

    const result = await request.query(`
      SELECT
        U.UserCode,
        U.UserTypeCode,
        U.UserName,
        U.RegisteredMobileNumber,
        U.MemberNumber,
        U.CompanyCode,

        UT.UserTypeName,

        C.Header1,
        C.Header2,
        C.MobileNo

      FROM tbl_User AS U

      LEFT JOIN tbl_UserType AS UT
        ON U.UserTypeCode = UT.UserTypeCode

      LEFT JOIN tbl_Company AS C
        ON U.CompanyCode = C.CompanyCode

      WHERE
        U.UserName = @UserName
        AND U.Password = @Password
        AND U.UserTypeCode = @UserTypeCode
    `);


    // =================================================
    // NO USER FOUND
    // =================================================

    if (result.recordset.length === 0) {
      console.log("======================================");
      console.log("LOGIN FAILED");
      console.log("Reason: Invalid username/password/user type");
      console.log("Username:", userName);
      console.log("UserTypeCode:", parsedUserTypeCode);
      console.log("======================================");

      return res.status(401).json({
        success: false,
        message: "Invalid username, password, or user type",
      });
    }


    // =================================================
    // USER FOUND
    // =================================================

    const row = result.recordset[0];


    // =================================================
    // BUILD COMPANY NAME
    // =================================================

    const companyName =
      `${row.Header1 || ""} ${row.Header2 || ""}`.trim();


    // =================================================
    // BUILD USER OBJECT
    // =================================================

    const user = {
      userCode: row.UserCode,

      userName: row.UserName,

      userTypeCode: row.UserTypeCode,

      userTypeName:
        row.UserTypeName || "",

      companyCode:
        row.CompanyCode,

      companyName:
        companyName,

      memberNumber:
        row.MemberNumber || "",

      registeredMobileNumber:
        row.RegisteredMobileNumber || "",
    };


    // =================================================
    // LOGIN SUCCESS LOG
    // =================================================

    console.log("======================================");
    console.log("LOGIN SUCCESS");
    console.log("======================================");

    console.log("UserCode:", user.userCode);
    console.log("UserName:", user.userName);
    console.log("UserTypeCode:", user.userTypeCode);
    console.log("UserTypeName:", user.userTypeName);
    console.log("CompanyCode:", user.companyCode);
    console.log("CompanyName:", user.companyName);
    console.log("MemberNumber:", user.memberNumber);

    console.log("======================================");


    // =================================================
    // SEND RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: user,
    });


  } catch (error) {

    // =================================================
    // SERVER ERROR
    // =================================================

    console.error("======================================");
    console.error("POST /api/login ERROR");
    console.error("======================================");

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
// EXPORT ROUTER
// =====================================================

module.exports = router;