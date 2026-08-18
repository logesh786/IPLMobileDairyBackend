const express = require("express");
const router = express.Router();

const sql = require("mssql");
const { getPool } = require("../db");

router.post("/", async (req, res) => {
  // Your complete registration code here
});

// =====================================================
// REGISTER USER
// POST /api/register
// =====================================================

router.post("/", async (req, res) => {
  console.log("");
  console.log("======================================");
  console.log("REGISTER REQUEST START");
  console.log("======================================");
  console.log("BODY:", req.body);

  const {
    userTypeId,
    UserTypeCode,

    CompanyCode,

    MemberNumber,

    RegisteredMobileNumber,

    userName,
    UserName,

    password,
    Password,
  } = req.body;

  // =====================================================
  // NORMALIZE
  // =====================================================

  const finalUserTypeCode = Number(
    userTypeId ?? UserTypeCode
  );

  const finalCompanyCode = Number(
    CompanyCode
  );

  const finalMemberNumber =
    MemberNumber !== undefined &&
    MemberNumber !== null
      ? String(MemberNumber).trim()
      : "";

  const finalMobile =
    RegisteredMobileNumber !== undefined &&
    RegisteredMobileNumber !== null
      ? String(RegisteredMobileNumber).trim()
      : "";

  const finalUserName = String(
    userName ??
      UserName ??
      ""
  ).trim();

  const finalPassword = String(
    password ??
      Password ??
      ""
  );

  console.log("NORMALIZED VALUES:");
  console.log({
    finalUserTypeCode,
    finalCompanyCode,
    finalMemberNumber,
    finalMobile,
    finalUserName,
  });

  // =====================================================
  // VALIDATION
  // =====================================================

  if (
    !Number.isInteger(finalUserTypeCode) ||
    finalUserTypeCode <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid user type.",
    });
  }

  if (
    !Number.isInteger(finalCompanyCode) ||
    finalCompanyCode <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid CompanyCode.",
    });
  }

  if (!finalUserName) {
    return res.status(400).json({
      success: false,
      message: "User name is required.",
    });
  }

  if (!finalPassword.trim()) {
    return res.status(400).json({
      success: false,
      message: "Password is required.",
    });
  }

  // =====================================================
  // MEMBER USER
  // UserTypeCode = 1
  // =====================================================

  if (
    finalUserTypeCode === 1 &&
    !finalMemberNumber
  ) {
    return res.status(400).json({
      success: false,
      message: "Member number is required.",
    });
  }

  let pool;
  let transaction;

  try {
    // ===================================================
    // GET SQL CONNECTION
    // ===================================================

    pool = await getPool();

    console.log("DATABASE CONNECTION OK");

    // ===================================================
    // IMPORTANT DATABASE SCHEMA CHECK
    // ===================================================

    console.log(
      "======================================"
    );
    console.log(
      "CHECKING tbl_Member COLUMNS"
    );
    console.log(
      "======================================"
    );

    const memberColumnsResult =
      await pool.request().query(`
        SELECT
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH,
          IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'tbl_Member'
        ORDER BY ORDINAL_POSITION
      `);

    console.log(
      "tbl_Member COLUMNS:",
      memberColumnsResult.recordset
    );

    console.log(
      "======================================"
    );
    console.log(
      "CHECKING tbl_User COLUMNS"
    );
    console.log(
      "======================================"
    );

    const userColumnsResult =
      await pool.request().query(`
        SELECT
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH,
          IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'tbl_User'
        ORDER BY ORDINAL_POSITION
      `);

    console.log(
      "tbl_User COLUMNS:",
      userColumnsResult.recordset
    );

    // ===================================================
    // VERIFY REQUIRED COLUMNS
    // ===================================================

    const memberColumns =
      memberColumnsResult.recordset.map(
        (row) =>
          String(row.COLUMN_NAME).toLowerCase()
      );

    const userColumns =
      userColumnsResult.recordset.map(
        (row) =>
          String(row.COLUMN_NAME).toLowerCase()
      );

    console.log(
      "HAS tbl_Member.Number:",
      memberColumns.includes("number")
    );

    console.log(
      "HAS tbl_User.MemberNumber:",
      userColumns.includes("membernumber")
    );

    // ===================================================
    // STOP IF DATABASE SCHEMA IS WRONG
    // ===================================================

    if (!memberColumns.includes("number")) {
      return res.status(500).json({
        success: false,
        message:
          "Database schema error: tbl_Member.Number does not exist.",
      });
    }

    if (!userColumns.includes("membernumber")) {
      return res.status(500).json({
        success: false,
        message:
          "Database schema error: tbl_User.MemberNumber does not exist.",
      });
    }

    // ===================================================
    // START TRANSACTION
    // ===================================================

    transaction = new sql.Transaction(pool);

    await transaction.begin();

    console.log(
      "TRANSACTION STARTED"
    );

    // ===================================================
    // 1. CHECK COMPANY
    // ===================================================

    console.log(
      "CHECKING COMPANY:",
      finalCompanyCode
    );

    const companyResult =
      await transaction
        .request()
        .input(
          "CompanyCode",
          sql.Int,
          finalCompanyCode
        )
        .query(`
          SELECT TOP 1
            *
          FROM tbl_Company
          WHERE CompanyCode = @CompanyCode
        `);

    if (
      !companyResult.recordset ||
      companyResult.recordset.length === 0
    ) {
      await transaction.rollback();

      console.log(
        "INVALID COMPANY"
      );

      return res.status(400).json({
        success: false,
        message: "Invalid company.",
      });
    }

    console.log(
      "COMPANY FOUND:",
      companyResult.recordset[0]
    );

    // ===================================================
    // 2. CHECK MEMBER
    //
    // tbl_Member:
    //
    // MemberCode
    // MemberName
    // CompanyCode
    // Number
    //
    // IMPORTANT:
    // DO NOT USE tbl_Member.MemberNumber
    // ===================================================

    let member = null;

    if (finalUserTypeCode === 1) {
      console.log(
        "CHECKING MEMBER"
      );

      console.log({
        CompanyCode: finalCompanyCode,
        Number: finalMemberNumber,
      });

      const memberResult =
        await transaction
          .request()
          .input(
            "CompanyCode",
            sql.Int,
            finalCompanyCode
          )
          .input(
            "MemberNumber",
            sql.VarChar(50),
            finalMemberNumber
          )
          .query(`
            SELECT TOP 1
              MemberCode,
              MemberName,
              CompanyCode,
              Number
            FROM tbl_Member
            WHERE CompanyCode = @CompanyCode
              AND LTRIM(
                    RTRIM(
                      CONVERT(
                        VARCHAR(50),
                        Number
                      )
                    )
                  ) = LTRIM(
                        RTRIM(
                          @MemberNumber
                        )
                      )
          `);

      console.log(
        "MEMBER QUERY RESULT:",
        memberResult.recordset
      );

      if (
        !memberResult.recordset ||
        memberResult.recordset.length === 0
      ) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message:
            "Member number not found for the selected company.",
        });
      }

      member =
        memberResult.recordset[0];

      console.log(
        "MEMBER FOUND:",
        member
      );
    }

    // ===================================================
    // 3. CHECK DUPLICATE MOBILE
    // ===================================================

    if (finalMobile) {
      console.log(
        "CHECKING DUPLICATE MOBILE"
      );

      const duplicateMobileResult =
        await transaction
          .request()
          .input(
            "RegisteredMobileNumber",
            sql.VarChar(50),
            finalMobile
          )
          .input(
            "CompanyCode",
            sql.Int,
            finalCompanyCode
          )
          .query(`
            SELECT TOP 1
              UserCode,
              UserTypeCode,
              UserName,
              RegisteredMobileNumber,
              MemberNumber,
              CompanyCode
            FROM tbl_User
            WHERE CompanyCode = @CompanyCode
              AND LTRIM(
                    RTRIM(
                      RegisteredMobileNumber
                    )
                  ) =
                  LTRIM(
                    RTRIM(
                      @RegisteredMobileNumber
                    )
                  )
          `);

      console.log(
        "DUPLICATE MOBILE RESULT:",
        duplicateMobileResult.recordset
      );

      if (
        duplicateMobileResult.recordset &&
        duplicateMobileResult.recordset.length > 0
      ) {
        await transaction.rollback();

        return res.status(409).json({
          success: false,
          message:
            "A user with this registered mobile number already exists.",
        });
      }
    }

    // ===================================================
    // 4. CHECK MEMBER ALREADY REGISTERED
    // ===================================================

    if (finalUserTypeCode === 1) {
      console.log(
        "CHECKING EXISTING MEMBER USER"
      );

      const existingMemberResult =
        await transaction
          .request()
          .input(
            "CompanyCode",
            sql.Int,
            finalCompanyCode
          )
          .input(
            "MemberNumber",
            sql.VarChar(50),
            finalMemberNumber
          )
          .query(`
            SELECT TOP 1
              UserCode,
              UserName,
              MemberNumber,
              CompanyCode
            FROM tbl_User
            WHERE CompanyCode = @CompanyCode
              AND LTRIM(
                    RTRIM(
                      MemberNumber
                    )
                  ) =
                  LTRIM(
                    RTRIM(
                      @MemberNumber
                    )
                  )
              AND UserTypeCode = 1
          `);

      console.log(
        "EXISTING MEMBER RESULT:",
        existingMemberResult.recordset
      );

      if (
        existingMemberResult.recordset &&
        existingMemberResult.recordset.length > 0
      ) {
        await transaction.rollback();

        return res.status(409).json({
          success: false,
          message:
            "This member is already registered.",
        });
      }
    }

    // ===================================================
    // 5. GENERATE USER CODE
    //
    // UserCode is NOT IDENTITY.
    // ===================================================

    console.log(
      "GENERATING USER CODE"
    );

    const userCodeResult =
      await transaction
        .request()
        .query(`
          SELECT
            ISNULL(
              MAX(UserCode),
              0
            ) + 1 AS NextUserCode
          FROM tbl_User
        `);

    const nextUserCode =
      Number(
        userCodeResult.recordset[0]
          .NextUserCode
      );

    console.log(
      "NEXT USER CODE:",
      nextUserCode
    );

    if (
      !Number.isInteger(nextUserCode) ||
      nextUserCode <= 0
    ) {
      await transaction.rollback();

      return res.status(500).json({
        success: false,
        message:
          "Unable to generate UserCode.",
      });
    }

    // ===================================================
    // 6. INSERT INTO tbl_User
    //
    // tbl_User EXACT COLUMNS:
    //
    // UserCode
    // UserTypeCode
    // UserName
    // Password
    // C_Date
    // E_Date
    // RegisteredMobileNumber
    // MemberNumber
    // CompanyCode
    // ===================================================

    console.log(
      "INSERTING USER"
    );

    const insertResult =
      await transaction
        .request()
        .input(
          "UserCode",
          sql.Int,
          nextUserCode
        )
        .input(
          "UserTypeCode",
          sql.Int,
          finalUserTypeCode
        )
        .input(
          "UserName",
          sql.VarChar(50),
          finalUserName
        )
        .input(
          "Password",
          sql.NVarChar(50),
          finalPassword
        )
        .input(
          "RegisteredMobileNumber",
          sql.VarChar(50),
          finalMobile || null
        )
        .input(
          "MemberNumber",
          sql.VarChar(50),
          finalMemberNumber || null
        )
        .input(
          "CompanyCode",
          sql.Int,
          finalCompanyCode
        )
        .query(`
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
          );

          SELECT
            UserCode,
            UserTypeCode,
            UserName,
            RegisteredMobileNumber,
            MemberNumber,
            CompanyCode,
            C_Date
          FROM tbl_User
          WHERE UserCode = @UserCode;
        `);

    console.log(
      "INSERT RESULT:",
      insertResult.recordset
    );

    // ===================================================
    // 7. COMMIT
    // ===================================================

    await transaction.commit();

    console.log(
      "TRANSACTION COMMITTED"
    );

    const createdUser =
      insertResult.recordset &&
      insertResult.recordset.length > 0
        ? insertResult.recordset[0]
        : null;

    console.log(
      "======================================"
    );
    console.log(
      "REGISTER SUCCESS"
    );
    console.log(
      "CREATED USER:",
      createdUser
    );
    console.log(
      "======================================"
    );

    return res.status(201).json({
      success: true,
      message:
        "User registered successfully.",
      user: createdUser,
      member: member,
    });
  } catch (error) {
    console.error(
      "======================================"
    );
    console.error(
      "REGISTRATION DATABASE ERROR"
    );
    console.error(
      "MESSAGE:",
      error?.message
    );
    console.error(
      "CODE:",
      error?.code
    );
    console.error(
      "NUMBER:",
      error?.number
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
      "FULL ERROR:",
      error
    );
    console.error(
      "======================================"
    );

    // ===================================================
    // ROLLBACK
    // ===================================================

    try {
      if (transaction) {
        await transaction.rollback();

        console.log(
          "TRANSACTION ROLLED BACK"
        );
      }
    } catch (rollbackError) {
      console.error(
        "ROLLBACK ERROR:",
        rollbackError
      );
    }

    return res.status(500).json({
      success: false,
      message:
        "Registration failed.",
      error:
        error?.message ||
        "Unknown database error.",
    });
  }
});

module.exports = router;