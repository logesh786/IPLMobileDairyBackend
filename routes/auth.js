const express = require("express");
const router = express.Router();
const sql = require("mssql");
const { getPool } = require("../db");

// =====================================================
// NORMALIZE ROLE
// =====================================================

const normalizeRole = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

// =====================================================
// GET USER TYPES
// GET /api/usertypes
// =====================================================

router.get("/usertypes", async (req, res) => {
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
      "GET USER TYPES SUCCESS:",
      result.recordset
    );

    return res.status(200).json(result.recordset);

  } catch (error) {
    console.error(
      "GET USER TYPES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load user types",
      error: error.message,
    });
  }
});

// =====================================================
// GET COMPANY
// GET /api/Company
// =====================================================

router.get("/Company", async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        CompanyCode,
        EDNO,

        LTRIM(
          RTRIM(ISNULL(Header1, '')) +
          CASE
            WHEN LTRIM(RTRIM(ISNULL(Header2, ''))) <> ''
            THEN ' ' + LTRIM(RTRIM(ISNULL(Header2, '')))
            ELSE ''
          END
        ) AS CompanyName,

        MobileNo

      FROM tbl_Company

      WHERE
        LEN(
          LTRIM(
            RTRIM(ISNULL(Header1, '')) +
            CASE
              WHEN LTRIM(RTRIM(ISNULL(Header2, ''))) <> ''
              THEN ' ' + LTRIM(RTRIM(ISNULL(Header2, '')))
              ELSE ''
            END
          )
        ) > 10

        AND LEN(
          RTRIM(ISNULL(MobileNo, ''))
        ) = 10

        AND EDNO > 0

      ORDER BY EDNO
    `);

    console.log(
      "GET COMPANY SUCCESS:",
      result.recordset.length
    );

    return res.status(200).json(
      result.recordset
    );

  } catch (error) {
    console.error(
      "GET COMPANY ERROR:",
      error
    );

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
// =====================================================

router.post("/login", async (req, res) => {
  try {
    const {
      userTypeId,
      userName,
      password,
    } = req.body;

    console.log("");
    console.log("======================================");
    console.log("LOGIN REQUEST");
    console.log("UserType:", userTypeId);
    console.log("Username:", userName);
    console.log("======================================");

    // =================================================
    // VALIDATION
    // =================================================

    if (
      userTypeId === undefined ||
      userTypeId === null ||
      userTypeId === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "User type is required",
      });
    }

    if (
      !userName ||
      String(userName).trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    if (
      password === undefined ||
      password === null ||
      String(password) === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    const pool = await getPool();

    // =================================================
    // GET USER
    // =================================================

    const result = await pool
      .request()
      .input(
        "UserName",
        sql.VarChar(100),
        String(userName).trim()
      )
      .input(
        "UserTypeCode",
        sql.Int,
        Number(userTypeId)
      )
      .query(`
        SELECT TOP 1

          u.UserCode,
          u.UserName,
          u.Password,
          u.UserTypeCode,
          u.CompanyCode,
          u.MemberNumber,
          u.RegisteredMobileNumber,

          t.UserTypeName,

          c.EDNO,

          LTRIM(
            RTRIM(
              ISNULL(c.Header1, '')
            )
            +
            CASE
              WHEN
                LTRIM(
                  RTRIM(
                    ISNULL(c.Header2, '')
                  )
                ) <> ''
              THEN
                ' ' +
                LTRIM(
                  RTRIM(
                    ISNULL(c.Header2, '')
                  )
                )
              ELSE
                ''
            END
          ) AS CompanyName

        FROM tbl_User u

        LEFT JOIN tbl_UserType t
          ON t.UserTypeCode =
             u.UserTypeCode

        LEFT JOIN tbl_Company c
          ON c.CompanyCode =
             u.CompanyCode

        WHERE
          LTRIM(RTRIM(u.UserName)) =
          LTRIM(RTRIM(@UserName))

          AND u.UserTypeCode =
              @UserTypeCode
      `);

    // =================================================
    // USER NOT FOUND
    // =================================================

    if (
      !result.recordset ||
      result.recordset.length === 0
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid username, password or user type",
      });
    }

    const row = result.recordset[0];

    // =================================================
    // PASSWORD CHECK
    // =================================================

    if (
      String(row.Password) !==
      String(password)
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid username, password or user type",
      });
    }

    // =================================================
    // ROLE
    // =================================================

    const role = normalizeRole(
      row.UserTypeName
    );

    const companyName = String(
      row.CompanyName || ""
    ).trim();

    // =================================================
    // LOGIN LOG
    // =================================================

    console.log("======================================");
    console.log("LOGIN SUCCESS");
    console.log("UserCode:", row.UserCode);
    console.log("UserName:", row.UserName);
    console.log(
      "UserTypeCode:",
      row.UserTypeCode
    );
    console.log(
      "UserTypeName:",
      row.UserTypeName
    );
    console.log("Role:", role);
    console.log(
      "CompanyCode:",
      row.CompanyCode
    );
    console.log(
      "CompanyName:",
      companyName
    );
    console.log(
      "MemberNumber:",
      row.MemberNumber
    );
    console.log("======================================");

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,
      message: "Login successful",

      user: {
        userCode:
          row.UserCode,

        userName:
          row.UserName,

        userTypeCode:
          row.UserTypeCode,

        userTypeName:
          row.UserTypeName,

        role:
          role,

        companyCode:
          row.CompanyCode,

        companyName:
          companyName,

        memberNumber:
          row.MemberNumber,

        registeredMobileNumber:
          row.RegisteredMobileNumber,

        edno:
          row.EDNO,
      },
    });

  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error during login",
      error:
        error.message,
    });
  }
});

// =====================================================
// REGISTER USER
// POST /api/register
// =====================================================

router.post("/register", async (req, res) => {
  try {
    const {
      userTypeId,
      CompanyCode,
      MemberNumber,
      RegisteredMobileNumber,
      userName,
      password,
    } = req.body;

    console.log("");
    console.log("======================================");
    console.log("REGISTER REQUEST");
    console.log("Body:", req.body);
    console.log("======================================");

    // =================================================
    // BASIC VALIDATION
    // =================================================

    if (
      userTypeId === undefined ||
      userTypeId === null ||
      userTypeId === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "User type is required.",
      });
    }

    if (!CompanyCode) {
      return res.status(400).json({
        success: false,
        message: "Company is required.",
      });
    }

    if (!RegisteredMobileNumber) {
      return res.status(400).json({
        success: false,
        message:
          "Registered mobile number is required.",
      });
    }

    if (!userName) {
      return res.status(400).json({
        success: false,
        message: "Username is required.",
      });
    }

    if (
      password === undefined ||
      password === null ||
      String(password) === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Password is required.",
      });
    }

    const pool = await getPool();

    // =================================================
    // CLEAN VALUES
    // =================================================

    const companyCode = Number(
      CompanyCode
    );

    const enteredMobile = String(
      RegisteredMobileNumber
    ).trim();

    const enteredMemberNumber = String(
      MemberNumber || ""
    ).trim();

    const enteredUserName = String(
      userName
    ).trim();

    const enteredPassword = String(
      password
    );

    // =================================================
    // COMPANY VALIDATION
    // =================================================

    if (
      !Number.isInteger(companyCode) ||
      companyCode <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Company.",
      });
    }

    // =================================================
    // MOBILE VALIDATION
    // =================================================

    if (
      !/^[6-9][0-9]{9}$/.test(
        enteredMobile
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid mobile number. Enter a valid 10 digit mobile number.",
      });
    }

    // =================================================
    // USERNAME
    // =================================================

    if (!enteredUserName) {
      return res.status(400).json({
        success: false,
        message: "Username is required.",
      });
    }

    // =================================================
    // GET USER TYPE
    // =================================================

    const userTypeResult = await pool
      .request()
      .input(
        "UserTypeCode",
        sql.Int,
        Number(userTypeId)
      )
      .query(`
        SELECT
          UserTypeCode,
          UserTypeName

        FROM tbl_UserType

        WHERE UserTypeCode =
              @UserTypeCode
      `);

    if (
      userTypeResult.recordset.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type.",
      });
    }

    const userTypeName = normalizeRole(
      userTypeResult.recordset[0]
        .UserTypeName
    );

    console.log(
      "User Type:",
      userTypeName
    );

    console.log(
      "Company Code:",
      companyCode
    );

    console.log(
      "Member Number:",
      enteredMemberNumber
    );

    console.log(
      "Entered Mobile:",
      enteredMobile
    );

    // =================================================
    // SECRETARY REGISTRATION
    // =================================================

    if (
      userTypeName === "secretary" ||
      userTypeName === "secretory" ||
      userTypeName === "secrectory"
    ) {
      console.log(
        "SECRETARY REGISTRATION"
      );

      const companyResult =
        await pool
          .request()
          .input(
            "CompanyCode",
            sql.Int,
            companyCode
          )
          .query(`
            SELECT TOP 1
              CompanyCode,
              MobileNo
            FROM tbl_Company
            WHERE CompanyCode =
                  @CompanyCode
          `);

      if (
        companyResult.recordset.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid Company. Company does not exist.",
        });
      }

      const companyMobile =
        String(
          companyResult.recordset[0]
            .MobileNo || ""
        ).trim();

      console.log(
        "Company Mobile:",
        companyMobile
      );

      console.log(
        "Entered Mobile:",
        enteredMobile
      );

      if (
        companyMobile !==
        enteredMobile
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid Mobile Number. Mobile number does not match the company.",
        });
      }

      console.log(
        "SECRETARY MOBILE CHECK SUCCESS"
      );
    }

    // =================================================
    // MEMBER REGISTRATION
    // =================================================

    else if (
      userTypeName === "member"
    ) {
      console.log(
        "MEMBER REGISTRATION"
      );

      if (!enteredMemberNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Member Number is required for Member registration.",
        });
      }

      const memberResult =
        await pool
          .request()
          .input(
            "CompanyCode",
            sql.Int,
            companyCode
          )
          .input(
            "MemberNumber",
            sql.VarChar(100),
            enteredMemberNumber
          )
          .query(`
            SELECT TOP 1

              CompanyCode,

              [number]
                AS MemberNumber,

              MobileNo

            FROM tbl_Member

            WHERE
              CompanyCode =
                @CompanyCode

              AND [number] =
                @MemberNumber
          `);

      if (
        memberResult.recordset.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid Member Number. Member does not exist for the selected company.",
        });
      }

      const memberRow =
        memberResult.recordset[0];

      const memberMobile =
        String(
          memberRow.MobileNo || ""
        ).trim();

      console.log(
        "tbl_Member CompanyCode:",
        memberRow.CompanyCode
      );

      console.log(
        "tbl_Member Number:",
        memberRow.MemberNumber
      );

      console.log(
        "tbl_Member MobileNo:",
        memberMobile
      );

      console.log(
        "Entered Mobile:",
        enteredMobile
      );

      if (
        memberMobile !==
        enteredMobile
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid Mobile Number. Mobile number does not match the member.",
        });
      }

      console.log(
        "MEMBER MOBILE CHECK SUCCESS"
      );
    }

    // =================================================
    // INVALID USER TYPE
    // =================================================

    else {
      return res.status(400).json({
        success: false,
        message:
          "Only Secretary and Member registration is allowed.",
      });
    }

    // =================================================
    // CHECK USERNAME
    // =================================================

    const checkUser =
      await pool
        .request()
        .input(
          "UserName",
          sql.VarChar(100),
          enteredUserName
        )
        .query(`
          SELECT TOP 1
            UserCode
          FROM tbl_User
          WHERE
            LTRIM(RTRIM(UserName)) =
            LTRIM(RTRIM(@UserName))
        `);

    if (
      checkUser.recordset.length > 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Username already exists.",
      });
    }

    // =================================================
    // MEMBER ALREADY REGISTERED
    // =================================================

    if (
      userTypeName === "member"
    ) {
      const existingMemberUser =
        await pool
          .request()
          .input(
            "CompanyCode",
            sql.Int,
            companyCode
          )
          .input(
            "MemberNumber",
            sql.VarChar(100),
            enteredMemberNumber
          )
          .query(`
            SELECT TOP 1
              UserCode
            FROM tbl_User
            WHERE
              CompanyCode =
                @CompanyCode

              AND MemberNumber =
                @MemberNumber
          `);

      if (
        existingMemberUser.recordset
          .length > 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This member is already registered.",
        });
      }
    }

    // =================================================
    // SECRETARY ALREADY REGISTERED
    // =================================================

    if (
      userTypeName === "secretary" ||
      userTypeName === "secretory" ||
      userTypeName === "secrectory"
    ) {
      const existingSecretary =
        await pool
          .request()
          .input(
            "CompanyCode",
            sql.Int,
            companyCode
          )
          .input(
            "UserTypeCode",
            sql.Int,
            Number(userTypeId)
          )
          .query(`
            SELECT TOP 1
              UserCode
            FROM tbl_User
            WHERE
              CompanyCode =
                @CompanyCode

              AND UserTypeCode =
                @UserTypeCode
          `);

      if (
        existingSecretary.recordset
          .length > 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This company already has a registered Secretary.",
        });
      }
    }

    // =================================================
    // GENERATE USER CODE
    // =================================================

    const userCodeResult =
      await pool
        .request()
        .query(`
          SELECT
            ISNULL(
              MAX(UserCode),
              0
            ) + 1 AS UserCode

          FROM tbl_User
        `);

    const newUserCode =
      Number(
        userCodeResult
          .recordset[0]
          .UserCode
      );

    console.log(
      "New UserCode:",
      newUserCode
    );

    // =================================================
    // INSERT USER
    // =================================================

    await pool
      .request()
      .input(
        "UserCode",
        sql.Int,
        newUserCode
      )
      .input(
        "UserTypeCode",
        sql.Int,
        Number(userTypeId)
      )
      .input(
        "CompanyCode",
        sql.Int,
        companyCode
      )
      .input(
        "MemberNumber",
        sql.VarChar(100),
        enteredMemberNumber
      )
      .input(
        "RegisteredMobileNumber",
        sql.VarChar(20),
        enteredMobile
      )
      .input(
        "UserName",
        sql.VarChar(100),
        enteredUserName
      )
      .input(
        "Password",
        sql.VarChar(255),
        enteredPassword
      )
      .query(`
        INSERT INTO tbl_User
        (
          UserCode,
          UserTypeCode,
          CompanyCode,
          MemberNumber,
          RegisteredMobileNumber,
          UserName,
          Password,
          C_Date
        )
        VALUES
        (
          @UserCode,
          @UserTypeCode,
          @CompanyCode,
          @MemberNumber,
          @RegisteredMobileNumber,
          @UserName,
          @Password,
          GETDATE()
        )
      `);

    // =================================================
    // SUCCESS
    // =================================================

    console.log(
      "======================================"
    );

    console.log(
      "USER CREATED SUCCESSFULLY"
    );

    console.log(
      "UserCode:",
      newUserCode
    );

    console.log(
      "UserType:",
      userTypeName
    );

    console.log(
      "CompanyCode:",
      companyCode
    );

    console.log(
      "MemberNumber:",
      enteredMemberNumber
    );

    console.log(
      "======================================"
    );

    return res.status(201).json({
      success: true,
      message:
        "User created successfully.",
      userCode:
        newUserCode,
    });

  } catch (error) {
    console.error(
      "======================================"
    );

    console.error(
      "POST /register ERROR"
    );

    console.error(
      "Error message:",
      error.message
    );

    console.error(
      "Error code:",
      error.code
    );

    console.error(
      "SQL number:",
      error.number
    );

    console.error(
      "Full error:",
      error
    );

    console.error(
      "======================================"
    );

    return res.status(500).json({
      success: false,
      message:
        "User registration failed.",
      error:
        error.message,
      code:
        error.code || null,
      number:
        error.number || null,
    });
  }
});

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;