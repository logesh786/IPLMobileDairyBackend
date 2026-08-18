const express = require("express");
const router = express.Router();

const sql = require("mssql");
const { getPool } = require("../db");

// =====================================================
// REGISTER USER
//
// Mounted from server.js:
//
// app.use("/api/register", registerRouter);
//
// Therefore:
//
// router.post("/")
//
// becomes:
//
// POST /api/register
// =====================================================

router.post("/", async (req, res) => {
  console.log("======================================");
  console.log("POST /api/register");
  console.log("REGISTER REQUEST");
  console.log(req.body);
  console.log("======================================");

  let transaction = null;

  try {
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
    } = req.body || {};

    // ===================================================
    // NORMALIZE USER TYPE
    // ===================================================

    const finalUserTypeCode =
      Number(
        userTypeId ??
          UserTypeCode
      );

    // ===================================================
    // NORMALIZE COMPANY
    // ===================================================

    const finalCompanyCode =
      Number(
        CompanyCode
      );

    // ===================================================
    // NORMALIZE MEMBER NUMBER
    // ===================================================

    const finalMemberNumber =
      MemberNumber !== undefined &&
      MemberNumber !== null
        ? String(
            MemberNumber
          ).trim()
        : "";

    // ===================================================
    // NORMALIZE MOBILE
    // ===================================================

    const finalMobile =
      RegisteredMobileNumber !==
        undefined &&
      RegisteredMobileNumber !==
        null
        ? String(
            RegisteredMobileNumber
          ).trim()
        : "";

    // ===================================================
    // NORMALIZE USERNAME
    // ===================================================

    const finalUserName =
      userName ??
      UserName ??
      "";

    // ===================================================
    // NORMALIZE PASSWORD
    // ===================================================

    const finalPassword =
      password ??
      Password ??
      "";

    console.log("======================================");
    console.log(
      "NORMALIZED REGISTER DATA"
    );
    console.log(
      "UserTypeCode:",
      finalUserTypeCode
    );
    console.log(
      "CompanyCode:",
      finalCompanyCode
    );
    console.log(
      "MemberNumber:",
      finalMemberNumber
    );
    console.log(
      "Mobile:",
      finalMobile
    );
    console.log(
      "UserName:",
      finalUserName
    );
    console.log(
      "Password provided:",
      !!String(
        finalPassword
      ).trim()
    );
    console.log("======================================");

    // ===================================================
    // VALIDATION
    // ===================================================

    if (
      !Number.isInteger(
        finalUserTypeCode
      ) ||
      finalUserTypeCode <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user type.",
      });
    }

    if (
      !Number.isInteger(
        finalCompanyCode
      ) ||
      finalCompanyCode <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid CompanyCode.",
      });
    }

    if (
      !String(
        finalUserName
      ).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "User name is required.",
      });
    }

    if (
      !String(
        finalPassword
      ).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password is required.",
      });
    }

    // ===================================================
    // MEMBER VALIDATION
    //
    // Member user type = 1
    //
    // tbl_Member:
    //
    // MemberCode
    // MemberName
    // CompanyCode
    // Number
    // ===================================================

    if (
      finalUserTypeCode === 1 &&
      !finalMemberNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Member number is required.",
      });
    }

    // ===================================================
    // DATABASE POOL
    // ===================================================

    console.log(
      "CONNECTING TO DATABASE..."
    );

    const pool =
      await getPool();

    console.log(
      "DATABASE CONNECTED"
    );

    // ===================================================
    // TRANSACTION
    // ===================================================

    transaction =
      new sql.Transaction(
        pool
      );

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
            CompanyCode,
            EDNO,
            Header1,
            Header2
          FROM tbl_Company
          WHERE CompanyCode =
                @CompanyCode
        `);

    if (
      !companyResult.recordset ||
      companyResult.recordset.length === 0
    ) {
      await transaction.rollback();
      transaction = null;

      return res.status(400).json({
        success: false,
        message:
          "Invalid company.",
      });
    }

    console.log(
      "COMPANY FOUND:",
      companyResult.recordset[0]
    );

    // ===================================================
    // 2. CHECK MEMBER
    // ===================================================

    let member = null;

    if (
      finalUserTypeCode === 1
    ) {
      console.log(
        "CHECKING MEMBER:",
        finalMemberNumber
      );

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

            WHERE CompanyCode =
                  @CompanyCode

              AND LTRIM(
                    RTRIM(
                      CONVERT(
                        VARCHAR(50),
                        Number
                      )
                    )
                  )
                  =
                  LTRIM(
                    RTRIM(
                      @MemberNumber
                    )
                  )
          `);

      if (
        !memberResult.recordset ||
        memberResult.recordset.length === 0
      ) {
        await transaction.rollback();
        transaction = null;

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
    // 3. CHECK USERNAME DUPLICATE
    // ===================================================

    console.log(
      "CHECKING USERNAME DUPLICATE..."
    );

    const duplicateUserName =
      await transaction
        .request()
        .input(
          "UserName",
          sql.VarChar(50),
          String(
            finalUserName
          ).trim()
        )
        .query(`
          SELECT TOP 1
            UserCode,
            UserName,
            CompanyCode
          FROM tbl_User
          WHERE LTRIM(
                  RTRIM(UserName)
                )
                =
                LTRIM(
                  RTRIM(@UserName)
                )
        `);

    if (
      duplicateUserName.recordset &&
      duplicateUserName.recordset.length >
        0
    ) {
      await transaction.rollback();
      transaction = null;

      return res.status(409).json({
        success: false,
        message:
          "Username already exists.",
      });
    }

    // ===================================================
    // 4. CHECK MOBILE DUPLICATE
    // ===================================================

    if (finalMobile) {
      console.log(
        "CHECKING MOBILE DUPLICATE..."
      );

      const duplicateMobile =
        await transaction
          .request()
          .input(
            "RegisteredMobileNumber",
            sql.VarChar(50),
            finalMobile
          )
          .query(`
            SELECT TOP 1

              UserCode,
              UserName,
              RegisteredMobileNumber,
              CompanyCode

            FROM tbl_User

            WHERE LTRIM(
                    RTRIM(
                      RegisteredMobileNumber
                    )
                  )
                  =
                  LTRIM(
                    RTRIM(
                      @RegisteredMobileNumber
                    )
                  )
          `);

      if (
        duplicateMobile.recordset &&
        duplicateMobile.recordset.length >
          0
      ) {
        await transaction.rollback();
        transaction = null;

        return res.status(409).json({
          success: false,
          message:
            "A user with this registered mobile number already exists.",
        });
      }
    }

    // ===================================================
    // 5. CHECK MEMBER ALREADY REGISTERED
    // ===================================================

    if (
      finalUserTypeCode === 1
    ) {
      console.log(
        "CHECKING MEMBER ALREADY REGISTERED..."
      );

      const existingMemberUser =
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

            WHERE CompanyCode =
                  @CompanyCode

              AND LTRIM(
                    RTRIM(MemberNumber)
                  )
                  =
                  LTRIM(
                    RTRIM(@MemberNumber)
                  )

              AND UserTypeCode = 1
          `);

      if (
        existingMemberUser.recordset &&
        existingMemberUser.recordset.length >
          0
      ) {
        await transaction.rollback();
        transaction = null;

        return res.status(409).json({
          success: false,
          message:
            "This member is already registered.",
        });
      }
    }

    // ===================================================
    // 6. GENERATE USER CODE
    //
    // UserCode is NOT IDENTITY.
    // ===================================================

    console.log(
      "GENERATING USER CODE..."
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
          FROM tbl_User WITH (
            UPDLOCK,
            HOLDLOCK
          )
        `);

    const nextUserCode =
      Number(
        userCodeResult
          .recordset[0]
          .NextUserCode
      );

    if (
      !Number.isInteger(
        nextUserCode
      )
    ) {
      await transaction.rollback();
      transaction = null;

      return res.status(500).json({
        success: false,
        message:
          "Unable to generate UserCode.",
      });
    }

    console.log(
      "NEXT USER CODE:",
      nextUserCode
    );

    // ===================================================
    // 7. INSERT USER
    // ===================================================

    console.log(
      "INSERTING USER..."
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
          String(
            finalUserName
          ).trim()
        )

        .input(
          "Password",
          sql.NVarChar(50),
          String(
            finalPassword
          )
        )

        .input(
          "RegisteredMobileNumber",
          sql.VarChar(50),
          finalMobile ||
            null
        )

        .input(
          "MemberNumber",
          sql.VarChar(50),
          finalMemberNumber ||
            null
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
            C_Date,
            E_Date,
            RegisteredMobileNumber,
            MemberNumber,
            CompanyCode

          FROM tbl_User

          WHERE UserCode =
                @UserCode;
        `);

    console.log(
      "INSERT RESULT:",
      insertResult.recordset
    );

    // ===================================================
    // 8. COMMIT
    // ===================================================

    await transaction.commit();
    transaction = null;

    console.log(
      "TRANSACTION COMMITTED"
    );

    const createdUser =
      insertResult.recordset &&
      insertResult.recordset.length >
        0
        ? insertResult.recordset[0]
        : null;

    console.log("======================================");
    console.log(
      "REGISTER SUCCESS"
    );
    console.log(
      "CREATED USER:",
      createdUser
    );
    console.log("======================================");

    return res.status(201).json({
      success: true,
      message:
        "User registered successfully.",
      user:
        createdUser,
      member:
        member,
    });
  } catch (error) {
    console.error("======================================");
    console.error(
      "REGISTRATION DATABASE ERROR"
    );
    console.error(
      "ERROR NAME:",
      error?.name
    );
    console.error(
      "ERROR MESSAGE:",
      error?.message
    );
    console.error(
      "ERROR NUMBER:",
      error?.number
    );
    console.error(
      "ERROR CODE:",
      error?.code
    );
    console.error(
      "FULL ERROR:",
      error
    );
    console.error("======================================");

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