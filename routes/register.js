const express = require("express");
const router = express.Router();

const sql = require("mssql");
const { getPool } = require("../db");

// =====================================================
// POST /api/register
// =====================================================

router.post("/", async (req, res) => {
  console.log("======================================");
  console.log("POST /api/register");
  console.log("REGISTER REQUEST");
  console.log(req.body);
  console.log("======================================");

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
  // NORMALIZE
  // ===================================================

  const finalUserTypeCode =
    Number(
      userTypeId ??
        UserTypeCode
    );

  const finalCompanyCode =
    Number(CompanyCode);

  const finalMemberNumber =
    MemberNumber !== undefined &&
    MemberNumber !== null
      ? String(
          MemberNumber
        ).trim()
      : "";

  const finalMobile =
    RegisteredMobileNumber !==
      undefined &&
    RegisteredMobileNumber !==
      null
      ? String(
          RegisteredMobileNumber
        ).trim()
      : "";

  const finalUserName =
    userName ??
    UserName ??
    "";

  const finalPassword =
    password ??
    Password ??
    "";

  console.log(
    "NORMALIZED REGISTER:"
  );

  console.log({
    finalUserTypeCode,
    finalCompanyCode,
    finalMemberNumber,
    finalMobile,
    finalUserName,
    passwordProvided:
      Boolean(finalPassword),
  });

  // ===================================================
  // VALIDATION
  // ===================================================

  if (
    !Number.isInteger(
      finalUserTypeCode
    )
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
    )
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid CompanyCode.",
    });
  }

  if (
    !String(finalUserName).trim()
  ) {
    return res.status(400).json({
      success: false,
      message:
        "User name is required.",
    });
  }

  if (
    !String(finalPassword).trim()
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
  // tbl_Member:
  //
  // MemberCode
  // MemberName
  // CompanyCode
  // Number
  //
  // Number = MEMBER NUMBER
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

  let pool;
  let transaction;

  try {
    pool =
      await getPool();

    transaction =
      new sql.Transaction(
        pool
      );

    await transaction.begin();

    // =================================================
    // 1. CHECK COMPANY
    // =================================================

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
            CompanyCode
          FROM tbl_Company
          WHERE CompanyCode =
            @CompanyCode
        `);

    if (
      !companyResult.recordset ||
      companyResult.recordset.length === 0
    ) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Invalid company.",
      });
    }

    // =================================================
    // 2. CHECK MEMBER
    // =================================================

    let member = null;

    if (
      finalUserTypeCode === 1
    ) {
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
            WHERE
              CompanyCode =
                @CompanyCode

              AND
              LTRIM(
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

        return res.status(400).json({
          success: false,
          message:
            "Member number not found for the selected company.",
        });
      }

      member =
        memberResult.recordset[0];

      console.log(
        "FOUND MEMBER:",
        member
      );
    }

    // =================================================
    // 3. CHECK MOBILE DUPLICATE
    // =================================================

    if (finalMobile) {
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
            WHERE
              LTRIM(
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
        duplicateMobile.recordset.length > 0
      ) {
        await transaction.rollback();

        return res.status(409).json({
          success: false,
          message:
            "A user with this registered mobile number already exists.",
        });
      }
    }

    // =================================================
    // 4. CHECK USERNAME DUPLICATE
    // =================================================

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
          WHERE
            LTRIM(
              RTRIM(UserName)
            )
            =
            LTRIM(
              RTRIM(@UserName)
            )
        `);

    if (
      duplicateUserName.recordset &&
      duplicateUserName.recordset.length > 0
    ) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,
        message:
          "Username already exists.",
      });
    }

    // =================================================
    // 5. CHECK MEMBER ALREADY REGISTERED
    // =================================================

    if (
      finalUserTypeCode === 1
    ) {
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
            WHERE
              CompanyCode =
                @CompanyCode

              AND
              LTRIM(
                RTRIM(MemberNumber)
              )
              =
              LTRIM(
                RTRIM(@MemberNumber)
              )

              AND
              UserTypeCode = 1
          `);

      if (
        existingMemberUser.recordset &&
        existingMemberUser.recordset.length > 0
      ) {
        await transaction.rollback();

        return res.status(409).json({
          success: false,
          message:
            "This member is already registered.",
        });
      }
    }

    // =================================================
    // 6. GENERATE USER CODE
    //
    // UserCode is NOT IDENTITY.
    // =================================================

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

    console.log(
      "NEXT USER CODE:",
      nextUserCode
    );

    if (
      !Number.isInteger(
        nextUserCode
      )
    ) {
      await transaction.rollback();

      return res.status(500).json({
        success: false,
        message:
          "Unable to generate UserCode.",
      });
    }

    // =================================================
    // 7. INSERT USER
    // =================================================

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
          finalMobile || null
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
            RegisteredMobileNumber,
            MemberNumber,
            CompanyCode,
            C_Date
          FROM tbl_User
          WHERE UserCode =
            @UserCode;
        `);

    // =================================================
    // 8. COMMIT
    // =================================================

    await transaction.commit();

    const createdUser =
      insertResult.recordset?.[0] ||
      null;

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
      user: createdUser,
      member: member,
    });
  } catch (error) {
    console.error("======================================");
    console.error(
      "REGISTRATION DATABASE ERROR"
    );
    console.error(error);
    console.error("======================================");

    try {
      if (transaction) {
        await transaction.rollback();
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