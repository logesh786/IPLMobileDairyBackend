const express = require("express");
const sql = require("mssql");

const router = express.Router();

const { getPool } = require("../db");

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

const cleanString = (value) => {
  if (!hasValue(value)) {
    return "";
  }

  return String(value).trim();
};

// =====================================================
// REGISTER
// POST /api/register
// =====================================================

router.post("/register", async (req, res) => {
  let transaction;

  try {
    console.log("======================================");
    console.log("POST /api/register");
    console.log("REGISTER REQUEST");
    console.log("======================================");

    // =================================================
    // REQUEST BODY
    // =================================================

    const {
      userTypeId,
      CompanyCode,
      MemberNumber,
      RegisteredMobileNumber,
      userName,
      password,
    } = req.body || {};

    console.log("REQUEST DATA:");
    console.log({
      userTypeId,
      CompanyCode,
      MemberNumber,
      RegisteredMobileNumber,
      userName,
      passwordProvided: hasValue(password),
    });

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
    // NORMALIZE VALUES
    // =================================================

    const parsedUserTypeCode = Number(userTypeId);

    const companyCode = cleanString(CompanyCode);

    const memberNumber = cleanString(MemberNumber);

    const mobile = cleanString(
      RegisteredMobileNumber
    );

    const cleanUserName = cleanString(userName);

    const cleanPassword = String(password);

    // =================================================
    // VALIDATE USER TYPE
    // =================================================

    if (!Number.isInteger(parsedUserTypeCode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type.",
      });
    }

    // =================================================
    // VALIDATE MOBILE
    // =================================================

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid 10-digit mobile number.",
      });
    }

    // =================================================
    // VALIDATE USERNAME
    // =================================================

    if (cleanUserName.length < 3) {
      return res.status(400).json({
        success: false,
        message:
          "Username must contain at least 3 characters.",
      });
    }

    // =================================================
    // VALIDATE PASSWORD
    // =================================================

    if (cleanPassword.length < 4) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 4 characters.",
      });
    }

    console.log("======================================");
    console.log("NORMALIZED REGISTER DATA");
    console.log("UserTypeCode:", parsedUserTypeCode);
    console.log("CompanyCode:", companyCode);
    console.log("MemberNumber:", memberNumber);
    console.log("Mobile:", mobile);
    console.log("UserName:", cleanUserName);
    console.log("======================================");

    // =================================================
    // DATABASE
    // =================================================

    const pool = await getPool();

    // =================================================
    // GET USER TYPE
    // =================================================

    console.log("======================================");
    console.log("GETTING USER TYPE");
    console.log("======================================");

    const userTypeRequest = pool.request();

    userTypeRequest.input(
      "UserTypeCode",
      sql.Int,
      parsedUserTypeCode
    );

    const userTypeResult =
      await userTypeRequest.query(`
        SELECT TOP 1
          UserTypeCode,
          UserTypeName
        FROM tbl_UserType
        WHERE UserTypeCode = @UserTypeCode
      `);

    if (
      !userTypeResult.recordset ||
      userTypeResult.recordset.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "User type does not exist.",
      });
    }

    const userTypeRow =
      userTypeResult.recordset[0];

    const userTypeName = String(
      userTypeRow.UserTypeName || ""
    )
      .trim()
      .toLowerCase();

    const isMember =
      userTypeName === "member";

    const isSecretary =
      userTypeName === "secretary" ||
      userTypeName === "secretory";

    console.log("USER TYPE CODE:", parsedUserTypeCode);
    console.log("USER TYPE NAME:", userTypeName);
    console.log("IS MEMBER:", isMember);
    console.log("IS SECRETARY:", isSecretary);

    // =================================================
    // MEMBER NUMBER REQUIRED FOR MEMBER
    // =================================================

    if (
      isMember &&
      !hasValue(memberNumber)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Member Number is required.",
      });
    }

    // =================================================
    // CHECK COMPANY
    // =================================================

    console.log("======================================");
    console.log("CHECKING COMPANY");
    console.log("CompanyCode:", companyCode);
    console.log("======================================");

    const companyRequest = pool.request();

    /*
     * IMPORTANT:
     * CompanyCode is sent as VARCHAR/NVARCHAR.
     *
     * This avoids problems if CompanyCode is stored
     * as VARCHAR in SQL Server.
     */

    companyRequest.input(
      "CompanyCode",
      sql.VarChar(50),
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

    console.log(
      "COMPANY MATCH COUNT:",
      companyResult.recordset.length
    );

    if (
      !companyResult.recordset ||
      companyResult.recordset.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected society does not exist.",
      });
    }

    const company =
      companyResult.recordset[0];

    const companyName =
      `${company.Header1 || ""} ${
        company.Header2 || ""
      }`.trim();

    console.log("COMPANY CODE:", company.CompanyCode);
    console.log("COMPANY NAME:", companyName);
    console.log("COMPANY MOBILE:", company.MobileNo);

    // =================================================
    // MEMBER VALIDATION
    // =================================================

    if (isMember) {
      console.log("======================================");
      console.log("CHECKING MEMBER");
      console.log("======================================");

      const memberRequest =
        pool.request();

      memberRequest.input(
        "CompanyCode",
        sql.VarChar(50),
        companyCode
      );

      memberRequest.input(
        "MemberNumber",
        sql.VarChar(50),
        memberNumber
      );

      memberRequest.input(
        "MobileNo",
        sql.VarChar(20),
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

      if (
        !memberResult.recordset ||
        memberResult.recordset.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Member details do not match the registered society records.",
        });
      }

      console.log(
        "MEMBER VALIDATION SUCCESS"
      );
    }

    // =================================================
    // SECRETARY VALIDATION
    // =================================================

    if (isSecretary) {
      console.log("======================================");
      console.log("CHECKING SECRETARY");
      console.log("======================================");

      const companyMobile =
        cleanString(company.MobileNo);

      console.log(
        "COMPANY MOBILE:",
        companyMobile
      );

      console.log(
        "REQUEST MOBILE:",
        mobile
      );

      if (
        companyMobile !== mobile
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Registered mobile number does not match the society records.",
        });
      }

      console.log(
        "SECRETARY VALIDATION SUCCESS"
      );
    }

    // =================================================
    // CHECK USERNAME
    // =================================================

    console.log("======================================");
    console.log("CHECKING USERNAME");
    console.log("USERNAME:", cleanUserName);
    console.log("======================================");

    const usernameRequest =
      pool.request();

    usernameRequest.input(
      "UserName",
      sql.VarChar(100),
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

    if (
      usernameResult.recordset &&
      usernameResult.recordset.length > 0
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Username already exists.",
      });
    }

    // =================================================
    // CHECK DUPLICATE MEMBER
    // =================================================

    if (isMember) {
      console.log("======================================");
      console.log("CHECKING DUPLICATE MEMBER");
      console.log("======================================");

      const duplicateMemberRequest =
        pool.request();

      duplicateMemberRequest.input(
        "CompanyCode",
        sql.VarChar(50),
        companyCode
      );

      duplicateMemberRequest.input(
        "MemberNumber",
        sql.VarChar(50),
        memberNumber
      );

      duplicateMemberRequest.input(
        "UserTypeCode",
        sql.Int,
        parsedUserTypeCode
      );

      const duplicateMemberResult =
        await duplicateMemberRequest.query(`
          SELECT TOP 1
            UserCode,
            UserName,
            CompanyCode,
            MemberNumber,
            UserTypeCode
          FROM tbl_User
          WHERE
            CompanyCode = @CompanyCode
            AND MemberNumber = @MemberNumber
            AND UserTypeCode = @UserTypeCode
        `);

      console.log(
        "DUPLICATE MEMBER COUNT:",
        duplicateMemberResult.recordset.length
      );

      if (
        duplicateMemberResult.recordset &&
        duplicateMemberResult.recordset.length > 0
      ) {
        const existing =
          duplicateMemberResult.recordset[0];

        console.log(
          "EXISTING USER:",
          existing
        );

        return res.status(409).json({
          success: false,
          message:
            "This member is already registered.",
          existingUser: {
            userCode:
              existing.UserCode,
            userName:
              existing.UserName,
          },
        });
      }
    }

    // =================================================
    // START TRANSACTION
    // =================================================

    transaction =
      new sql.Transaction(pool);

    await transaction.begin();

    console.log("======================================");
    console.log("TRANSACTION STARTED");
    console.log("======================================");

    // =================================================
    // GET NEXT USER CODE
    // =================================================

    /*
     * UPDLOCK + HOLDLOCK prevents two simultaneous
     * registrations from selecting the same UserCode
     * as far as the transaction isolation allows.
     */

    const codeRequest =
      new sql.Request(transaction);

    const codeResult =
      await codeRequest.query(`
        SELECT
          ISNULL(MAX(UserCode), 0) + 1
            AS NextUserCode
        FROM tbl_User WITH (UPDLOCK, HOLDLOCK)
      `);

    const nextUserCode =
      Number(
        codeResult.recordset[0]
          ?.NextUserCode
      );

    console.log(
      "NEXT USER CODE:",
      nextUserCode
    );

    if (
      !Number.isInteger(nextUserCode) ||
      nextUserCode <= 0
    ) {
      throw new Error(
        "Unable to generate UserCode."
      );
    }

    // =================================================
    // INSERT USER
    // =================================================

    console.log("======================================");
    console.log("INSERTING USER");
    console.log("======================================");

    const insertRequest =
      new sql.Request(transaction);

    insertRequest.input(
      "UserCode",
      sql.Int,
      nextUserCode
    );

    insertRequest.input(
      "UserTypeCode",
      sql.Int,
      parsedUserTypeCode
    );

    insertRequest.input(
      "UserName",
      sql.VarChar(100),
      cleanUserName
    );

    insertRequest.input(
      "Password",
      sql.VarChar(255),
      cleanPassword
    );

    insertRequest.input(
      "CompanyCode",
      sql.VarChar(50),
      companyCode
    );

    insertRequest.input(
      "MemberNumber",
      sql.VarChar(50),
      isMember
        ? memberNumber
        : ""
    );

    insertRequest.input(
      "RegisteredMobileNumber",
      sql.VarChar(20),
      mobile
    );

    const insertResult =
      await insertRequest.query(`
        INSERT INTO tbl_User
        (
          UserCode,
          UserTypeCode,
          UserName,
          Password,
          C_Date,
          E_Date,
          RegisteredMobileNumber,
          MemberNumber,
          CompanyCode
        )
        VALUES
        (
          @UserCode,
          @UserTypeCode,
          @UserName,
          @Password,
          GETDATE(),
          NULL,
          @RegisteredMobileNumber,
          @MemberNumber,
          @CompanyCode
        )
      `);

    console.log(
      "INSERTED ROWS:",
      insertResult.rowsAffected
    );

    // =================================================
    // COMMIT
    // =================================================

    await transaction.commit();

    transaction = null;

    console.log("======================================");
    console.log("TRANSACTION COMMITTED");
    console.log("======================================");

    // =================================================
    // SUCCESS
    // =================================================

    console.log("======================================");
    console.log("REGISTRATION SUCCESS");
    console.log("======================================");

    console.log({
      UserCode: nextUserCode,
      UserTypeCode: parsedUserTypeCode,
      UserTypeName:
        userTypeRow.UserTypeName,
      UserName: cleanUserName,
      CompanyCode: companyCode,
      CompanyName: companyName,
      MemberNumber:
        isMember
          ? memberNumber
          : "",
      RegisteredMobileNumber: mobile,
    });

    return res.status(201).json({
      success: true,
      message:
        "User created successfully.",

      user: {
        userCode:
          nextUserCode,

        userTypeCode:
          parsedUserTypeCode,

        userTypeName:
          userTypeRow.UserTypeName,

        userName:
          cleanUserName,

        companyCode:
          companyCode,

        companyName:
          companyName,

        memberNumber:
          isMember
            ? memberNumber
            : "",

        registeredMobileNumber:
          mobile,
      },
    });

  } catch (error) {

    // =================================================
    // ROLLBACK
    // =================================================

    if (transaction) {
      try {
        await transaction.rollback();

        console.log(
          "TRANSACTION ROLLED BACK"
        );
      } catch (rollbackError) {
        console.error(
          "ROLLBACK ERROR:",
          rollbackError.message
        );
      }
    }

    // =================================================
    // DETAILED ERROR
    // =================================================

    console.error("======================================");
    console.error("POST /api/register ERROR");
    console.error("======================================");

    console.error(
      "MESSAGE:",
      error?.message
    );

    console.error(
      "NAME:",
      error?.name
    );

    console.error(
      "NUMBER:",
      error?.number
    );

    console.error(
      "CODE:",
      error?.code
    );

    console.error(
      "STATE:",
      error?.state
    );

    console.error(
      "CLASS:",
      error?.class
    );

    console.error(
      "LINE:",
      error?.lineNumber
    );

    console.error(
      "PROC:",
      error?.procName
    );

    console.error(
      "STACK:",
      error?.stack
    );

    console.error("======================================");

    // =================================================
    // SQL DUPLICATE KEY
    // =================================================

    if (
      error?.number === 2627 ||
      error?.number === 2601
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Registration already exists.",
        error:
          error.message,
      });
    }

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(500).json({
      success: false,
      message:
        "Registration failed.",
      error:
        error?.message ||
        "Unknown database error.",
      code:
        error?.code || null,
      number:
        error?.number || null,
    });
  }
});

// =====================================================
// EXPORT
// =====================================================

module.exports = router;