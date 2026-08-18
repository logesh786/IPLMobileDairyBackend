const express = require("express");
const cors = require("cors");
const { getPool } = require("./db");

// =====================================================
// APP
// =====================================================

const app = express();

// =====================================================
// PORT
// =====================================================

const PORT = process.env.PORT || 5000;

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

const normalize = (value) => {
  return String(value || "").trim().toLowerCase();
};

const getCompanyName = (company) => {
  return `${company?.Header1 || ""} ${company?.Header2 || ""}`.trim();
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
// GET USER TYPES
// GET /api/usertypes
// =====================================================

app.get("/api/usertypes", async (req, res) => {
  try {
    console.log("======================================");
    console.log("GET /api/usertypes");
    console.log("======================================");

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

app.get("/api/Company", async (req, res) => {
  try {
    console.log("======================================");
    console.log("GET /api/Company");
    console.log("======================================");

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

    console.log("COMPANIES COUNT:", companies.length);

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
// REGISTER
// POST /api/register
// =====================================================
//
// MEMBER:
//   userTypeId
//   CompanyCode
//   MemberNumber
//   RegisteredMobileNumber
//   userName
//   password
//
// SECRETARY:
//   userTypeId
//   CompanyCode
//   RegisteredMobileNumber
//   userName
//   password
//
// =====================================================

app.post("/api/register", async (req, res) => {
  try {
    console.log("======================================");
    console.log("POST /api/register");
    console.log("REGISTER REQUEST");
    console.log("======================================");

    console.log({
      userTypeId: req.body?.userTypeId,
      CompanyCode: req.body?.CompanyCode,
      MemberNumber: req.body?.MemberNumber,
      RegisteredMobileNumber:
        req.body?.RegisteredMobileNumber,
      userName: req.body?.userName,
      passwordProvided: hasValue(req.body?.password),
    });

    // =================================================
    // READ REQUEST
    // =================================================

    const {
      userTypeId,
      CompanyCode,
      MemberNumber,
      RegisteredMobileNumber,
      userName,
      password,
    } = req.body || {};

    // =================================================
    // BASIC VALIDATION
    // =================================================

    if (!hasValue(userTypeId)) {
      return res.status(400).json({
        success: false,
        message: "User type is required.",
      });
    }

    if (!hasValue(CompanyCode)) {
      return res.status(400).json({
        success: false,
        message: "Company is required.",
      });
    }

    if (!hasValue(RegisteredMobileNumber)) {
      return res.status(400).json({
        success: false,
        message: "Registered mobile number is required.",
      });
    }

    if (!hasValue(userName)) {
      return res.status(400).json({
        success: false,
        message: "Username is required.",
      });
    }

    if (!hasValue(password)) {
      return res.status(400).json({
        success: false,
        message: "Password is required.",
      });
    }

    // =================================================
    // USER TYPE CODE
    // =================================================

    const parsedUserTypeCode = Number(userTypeId);

    if (!Number.isInteger(parsedUserTypeCode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type.",
      });
    }

    // =================================================
    // MOBILE
    // =================================================

    const mobile = String(
      RegisteredMobileNumber
    ).trim();

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid 10-digit mobile number.",
      });
    }

    // =================================================
    // CLEAN VALUES
    // =================================================

    const companyCode = String(CompanyCode).trim();

    const cleanMemberNumber = hasValue(MemberNumber)
      ? String(MemberNumber).trim()
      : "";

    const cleanUserName = String(userName).trim();

    const cleanPassword = String(password);

    // =================================================
    // DATABASE
    // =================================================

    const pool = await getPool();

    // =================================================
    // GET USER TYPE
    // =================================================

    const userTypeRequest = pool.request();

    userTypeRequest.input(
      "UserTypeCode",
      parsedUserTypeCode
    );

    const userTypeResult =
      await userTypeRequest.query(`
        SELECT
          UserTypeCode,
          UserTypeName
        FROM tbl_UserType
        WHERE UserTypeCode = @UserTypeCode
      `);

    if (userTypeResult.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User type does not exist.",
      });
    }

    const userTypeRow =
      userTypeResult.recordset[0];

    const userTypeName =
      String(userTypeRow.UserTypeName || "").trim();

    const normalizedUserType = normalize(userTypeName);

    console.log("USER TYPE:", userTypeName);
    console.log(
      "USER TYPE CODE:",
      parsedUserTypeCode
    );

    // =================================================
    // DETERMINE MEMBER / SECRETARY
    // =================================================

    const isMember =
      normalizedUserType === "member";

    const isSecretary =
      normalizedUserType === "secretary" ||
      normalizedUserType === "secretory";

    console.log("IS MEMBER:", isMember);
    console.log("IS SECRETARY:", isSecretary);

    // =================================================
    // MEMBER NUMBER REQUIRED ONLY FOR MEMBER
    // =================================================

    if (isMember && !hasValue(cleanMemberNumber)) {
      return res.status(400).json({
        success: false,
        message: "Member Number is required.",
      });
    }

    // =================================================
    // CHECK COMPANY / SOCIETY
    // =================================================

    const companyRequest = pool.request();

    companyRequest.input(
      "CompanyCode",
      companyCode
    );

    const companyResult =
      await companyRequest.query(`
        SELECT TOP 1
          CompanyCode,
          EDNO,
          Header1,
          Header2,
          MobileNo
        FROM tbl_Company
        WHERE CompanyCode = @CompanyCode
      `);

    if (companyResult.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Selected society does not exist.",
      });
    }

    const company =
      companyResult.recordset[0];

    const companyName = getCompanyName(company);

    console.log("COMPANY CODE:", company.CompanyCode);
    console.log("COMPANY NAME:", companyName);

    // =================================================
    // MEMBER VALIDATION
    // =================================================

    if (isMember) {
      console.log("======================================");
      console.log("CHECKING MEMBER");
      console.log("======================================");

      const memberRequest = pool.request();

      memberRequest.input(
        "CompanyCode",
        companyCode
      );

      memberRequest.input(
        "MemberNumber",
        cleanMemberNumber
      );

      memberRequest.input(
        "MobileNo",
        mobile
      );

      const memberResult =
        await memberRequest.query(`
          SELECT TOP 1
            CompanyCode,
            MemberNumber,
            MobileNo
          FROM tbl_Member
          WHERE
            CompanyCode = @CompanyCode
            AND MemberNumber = @MemberNumber
            AND MobileNo = @MobileNo
        `);

      console.log(
        "MEMBER MATCH COUNT:",
        memberResult.recordset.length
      );

      if (memberResult.recordset.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Member details do not match the registered society records.",
        });
      }
    }

    // =================================================
    // SECRETARY VALIDATION
    // =================================================

    if (isSecretary) {
      console.log("======================================");
      console.log("CHECKING SECRETARY");
      console.log("======================================");

      const companyMobile =
        String(company.MobileNo || "").trim();

      if (companyMobile !== mobile) {
        return res.status(400).json({
          success: false,
          message:
            "Registered mobile number does not match the society records.",
        });
      }
    }

    // =================================================
    // OTHER USER TYPES
    // =================================================

    if (!isMember && !isSecretary) {
      console.log(
        "OTHER USER TYPE REGISTRATION:",
        userTypeName
      );
    }

    // =================================================
    // CHECK USERNAME
    // =================================================

    const usernameRequest = pool.request();

    usernameRequest.input(
      "UserName",
      cleanUserName
    );

    const usernameResult =
      await usernameRequest.query(`
        SELECT TOP 1
          UserCode,
          UserName
        FROM tbl_User
        WHERE UserName = @UserName
      `);

    if (usernameResult.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Username already exists.",
      });
    }

    // =================================================
    // CHECK DUPLICATE MEMBER REGISTRATION
    // =================================================

    if (isMember) {
      const duplicateMemberRequest =
        pool.request();

      duplicateMemberRequest.input(
        "CompanyCode",
        companyCode
      );

      duplicateMemberRequest.input(
        "MemberNumber",
        cleanMemberNumber
      );

      duplicateMemberRequest.input(
        "UserTypeCode",
        parsedUserTypeCode
      );

      const duplicateMemberResult =
        await duplicateMemberRequest.query(`
          SELECT TOP 1
            UserCode,
            UserName
          FROM tbl_User
          WHERE
            CompanyCode = @CompanyCode
            AND MemberNumber = @MemberNumber
            AND UserTypeCode = @UserTypeCode
        `);

      if (
        duplicateMemberResult.recordset.length > 0
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This member is already registered.",
        });
      }
    }

    // =================================================
    // CHECK DUPLICATE SECRETARY
    // =================================================

    if (isSecretary) {
      const duplicateSecretaryRequest =
        pool.request();

      duplicateSecretaryRequest.input(
        "CompanyCode",
        companyCode
      );

      duplicateSecretaryRequest.input(
        "UserTypeCode",
        parsedUserTypeCode
      );

      const duplicateSecretaryResult =
        await duplicateSecretaryRequest.query(`
          SELECT TOP 1
            UserCode,
            UserName
          FROM tbl_User
          WHERE
            CompanyCode = @CompanyCode
            AND UserTypeCode = @UserTypeCode
        `);

      if (
        duplicateSecretaryResult.recordset.length > 0
      ) {
        return res.status(409).json({
          success: false,
          message:
            "A secretary account already exists for this society.",
        });
      }
    }

    // =================================================
    // GET NEXT USER CODE
    // =================================================

    const codeResult =
      await pool.request().query(`
        SELECT
          ISNULL(MAX(UserCode), 0) + 1 AS NextUserCode
        FROM tbl_User
      `);

    const nextUserCode =
      Number(
        codeResult.recordset[0]?.NextUserCode
      );

    if (
      !Number.isInteger(nextUserCode) ||
      nextUserCode <= 0
    ) {
      return res.status(500).json({
        success: false,
        message: "Unable to generate UserCode.",
      });
    }

    // =================================================
    // INSERT USER
    // =================================================

    console.log("======================================");
    console.log("INSERTING USER");
    console.log("UserCode:", nextUserCode);
    console.log(
      "UserTypeCode:",
      parsedUserTypeCode
    );
    console.log("CompanyCode:", companyCode);
    console.log(
      "MemberNumber:",
      isMember ? cleanMemberNumber : ""
    );
    console.log("UserName:", cleanUserName);
    console.log("======================================");

    const insertRequest =
      pool.request();

    insertRequest.input(
      "UserCode",
      nextUserCode
    );

    insertRequest.input(
      "UserTypeCode",
      parsedUserTypeCode
    );

    insertRequest.input(
      "UserName",
      cleanUserName
    );

    insertRequest.input(
      "Password",
      cleanPassword
    );

    insertRequest.input(
      "CompanyCode",
      companyCode
    );

    insertRequest.input(
      "MemberNumber",
      isMember
        ? cleanMemberNumber
        : ""
    );

    insertRequest.input(
      "RegisteredMobileNumber",
      mobile
    );

    await insertRequest.query(`
      INSERT INTO tbl_User
      (
        UserCode,
        UserTypeCode,
        UserName,
        Password,
        CompanyCode,
        MemberNumber,
        RegisteredMobileNumber
      )
      VALUES
      (
        @UserCode,
        @UserTypeCode,
        @UserName,
        @Password,
        @CompanyCode,
        @MemberNumber,
        @RegisteredMobileNumber
      )
    `);

    // =================================================
    // SUCCESS
    // =================================================

    console.log("======================================");
    console.log("REGISTRATION SUCCESS");
    console.log("UserCode:", nextUserCode);
    console.log("UserName:", cleanUserName);
    console.log("CompanyCode:", companyCode);
    console.log("CompanyName:", companyName);
    console.log("======================================");

    return res.status(201).json({
      success: true,
      message: "User created successfully.",

      user: {
        userCode: nextUserCode,
        userTypeCode: parsedUserTypeCode,
        userTypeName: userTypeRow.UserTypeName,
        userName: cleanUserName,
        companyCode: companyCode,
        companyName: companyName,
        memberNumber: isMember
          ? cleanMemberNumber
          : "",
        registeredMobileNumber: mobile,
      },
    });
  } catch (error) {
    console.error("======================================");
    console.error("POST /api/register ERROR");
    console.error("======================================");
    console.error(error);
    console.error("======================================");

    return res.status(500).json({
      success: false,
      message: "Registration failed.",
      error: error.message,
    });
  }
});

// =====================================================
// LOGIN
// POST /api/login
// =====================================================

app.post("/api/login", async (req, res) => {
  try {
    console.log("======================================");
    console.log("POST /api/login");
    console.log("LOGIN REQUEST");
    console.log("======================================");

    console.log({
      userTypeId: req.body?.userTypeId,
      userName: req.body?.userName,
      passwordProvided:
        hasValue(req.body?.password),
    });

    // =================================================
    // READ REQUEST
    // =================================================

    const {
      userTypeId,
      userName,
      password,
    } = req.body || {};

    // =================================================
    // VALIDATION
    // =================================================

    if (!hasValue(userTypeId)) {
      return res.status(400).json({
        success: false,
        message: "User type is required",
      });
    }

    if (!hasValue(userName)) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    if (!hasValue(password)) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    // =================================================
    // USER TYPE
    // =================================================

    const parsedUserTypeCode =
      Number(userTypeId);

    if (
      !Number.isInteger(parsedUserTypeCode)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type",
      });
    }

    // =================================================
    // DATABASE
    // =================================================

    const pool = await getPool();

    const request = pool.request();

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

    const result =
      await request.query(`
        SELECT
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
          U.UserName = @UserName
          AND U.Password = @Password
          AND U.UserTypeCode =
              @UserTypeCode
      `);

    // =================================================
    // LOGIN FAILED
    // =================================================

    if (result.recordset.length === 0) {
      console.log("LOGIN FAILED");

      return res.status(401).json({
        success: false,
        message:
          "Invalid username, password, or user type",
      });
    }

    // =================================================
    // USER
    // =================================================

    const row =
      result.recordset[0];

    const companyName =
      `${row.Header1 || ""} ${
        row.Header2 || ""
      }`.trim();

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
        row.RegisteredMobileNumber || "",

      companyMobileNo:
        row.MobileNo || "",
    };

    // =================================================
    // LOG
    // =================================================

    console.log("======================================");
    console.log("LOGIN SUCCESS");
    console.log("UserCode:", user.userCode);
    console.log("UserName:", user.userName);
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

    // =================================================
    // SUCCESS
    // =================================================

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: user,
    });
  } catch (error) {
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
// 404 HANDLER
// =====================================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  console.error("GLOBAL SERVER ERROR:", err);

  return res.status(500).json({
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
  console.log(`Server running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  console.log("======================================");
});

// =====================================================
// EXPORT APP
// =====================================================

module.exports = app;