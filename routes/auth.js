// const express = require("express");
// const router = express.Router();
// const sql = require("mssql");
// const { getPool } = require("../db");

// // ======================================================
// // GET USER TYPES
// // GET /api/usertypes
// // ======================================================
// router.get("/usertypes", async (req, res) => {
//   try {
//     const pool = await getPool();

//     const result = await pool.request().query(`
//       SELECT
//         UserTypeCode,
//         UserTypeName
//       FROM tbl_UserType
//       ORDER BY UserTypeCode
//     `);

//     console.log("User Types:", result.recordset);

//     res.json(result.recordset);

//   } catch (err) {
//     console.error("GET /usertypes ERROR:", err);

//     res.status(500).json({
//       success: false,
//       message: "Failed to load user types.",
//       error: err.message,
//     });
//   }
// });


// // ======================================================
// // GET COMPANY
// // GET /api/Company
// // ======================================================
// router.get("/Company", async (req, res) => {
//   try {
//     const pool = await getPool();

//     const result = await pool.request().query(`
//       SELECT
//         CompanyCode,
//         EDNO,
//         RTRIM(ISNULL(Header1, '')) +
//         RTRIM(ISNULL(Header2, '')) AS CompanyName,
//         MobileNo
//       FROM tbl_Company
//       WHERE LEN(
//         RTRIM(ISNULL(Header1, '')) +
//         RTRIM(ISNULL(Header2, ''))
//       ) > 10
//         AND LEN(RTRIM(ISNULL(MobileNo, ''))) = 10
//         AND EDNO > 0
//       ORDER BY EDNO
//     `);

//     console.log("Companies:", result.recordset);

//     res.json(result.recordset);

//   } catch (err) {
//     console.error("GET /Company ERROR:", err);

//     res.status(500).json({
//       success: false,
//       message: "Failed to load companies.",
//       error: err.message,
//     });
//   }
// });


// // ======================================================
// // LOGIN
// // POST /api/login
// // ======================================================
// router.post("/login", async (req, res) => {
//   try {
//     const {
//       userTypeId,
//       userName,
//       password,
//     } = req.body;

//     // ------------------------------------------
//     // VALIDATION
//     // ------------------------------------------
//     if (!userTypeId || !userName || !password) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "User type, username and password are required.",
//       });
//     }

//     const pool = await getPool();

//     // ------------------------------------------
//     // GET USER
//     // ------------------------------------------
//     const result = await pool
//       .request()
//       .input(
//         "UserTypeCode",
//         sql.Int,
//         Number(userTypeId)
//       )
//       .input(
//         "UserName",
//         sql.VarChar,
//         String(userName).trim()
//       )
//       .query(`
//         SELECT
//           u.UserCode,
//           u.UserName,
//           u.Password,
//           u.UserTypeCode,
//           u.CompanyCode,
//           u.MemberNumber,

//           t.UserTypeName,

//           RTRIM(
//             ISNULL(c.Header1, '') +
//             ISNULL(c.Header2, '')
//           ) AS CompanyName

//         FROM tbl_User u

//         INNER JOIN tbl_UserType t
//           ON u.UserTypeCode = t.UserTypeCode

//         LEFT JOIN tbl_Company c
//           ON u.CompanyCode = c.CompanyCode

//         WHERE
//           u.UserName = @UserName
//           AND u.UserTypeCode = @UserTypeCode
//       `);

//     // ------------------------------------------
//     // USER NOT FOUND
//     // ------------------------------------------
//     if (result.recordset.length === 0) {
//       return res.status(401).json({
//         success: false,
//         message:
//           "Invalid username, password, or user type.",
//       });
//     }

//     const row = result.recordset[0];

//     // ------------------------------------------
//     // PASSWORD CHECK
//     // ------------------------------------------
//     if (String(row.Password) !== String(password)) {
//       return res.status(401).json({
//         success: false,
//         message:
//           "Invalid username, password, or user type.",
//       });
//     }

//     // ------------------------------------------
//     // FULL ACCESS ROLES
//     // ------------------------------------------
//     const FULL_ACCESS_ROLES = [
//       "secretary",
//       "admin",
//       "manager",
//     ];

//     const role = String(
//       row.UserTypeName || ""
//     ).toLowerCase();

//     // ------------------------------------------
//     // LOGIN SUCCESS
//     // ------------------------------------------
//     return res.json({
//       success: true,
//       message: "Login successful",

//       user: {
//         userCode: row.UserCode,
//         userName: row.UserName,
//         userTypeCode: row.UserTypeCode,
//         userTypeName: row.UserTypeName,
//         companyCode: row.CompanyCode,

//         companyName:
//           FULL_ACCESS_ROLES.includes(role)
//             ? row.CompanyName
//             : "",

//         memberNumber: row.MemberNumber,
//       },
//     });

//   } catch (err) {
//     console.error("POST /login ERROR:", err);

//     return res.status(500).json({
//       success: false,
//       message: "Login failed.",
//       error: err.message,
//     });
//   }
// });


// // ======================================================
// // REGISTER USER
// // POST /api/register
// // ======================================================
// router.post("/register", async (req, res) => {
//   try {
//     const {
//       userTypeId,
//       CompanyCode,
//       MemberNumber,
//       RegisteredMobileNumber,
//       userName,
//       password,
//     } = req.body;

//     // ------------------------------------------
//     // VALIDATION
//     // ------------------------------------------
//     if (
//       !userTypeId ||
//       !CompanyCode ||
//       !RegisteredMobileNumber ||
//       !userName ||
//       !password
//     ) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "User type, company, mobile number, username and password are required.",
//       });
//     }

//     const pool = await getPool();

//     // ------------------------------------------
//     // CHECK SELECTED COMPANY
//     // ------------------------------------------
//     const companyResult = await pool
//       .request()
//       .input(
//         "CompanyCode",
//         sql.Int,
//         Number(CompanyCode)
//       )
//       .query(`
//         SELECT
//           CompanyCode,
//           EDNO,
//           RTRIM(ISNULL(Header1, '')) +
//           RTRIM(ISNULL(Header2, '')) AS CompanyName,
//           MobileNo
//         FROM tbl_Company
//         WHERE LEN(
//           RTRIM(ISNULL(Header1, '')) +
//           RTRIM(ISNULL(Header2, ''))
//         ) > 10
//           AND LEN(RTRIM(ISNULL(MobileNo, ''))) = 10
//           AND EDNO > 0
//           AND CompanyCode = @CompanyCode
//       `);

//     // ------------------------------------------
//     // COMPANY NOT FOUND
//     // ------------------------------------------
//     if (companyResult.recordset.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message:
//           "Company not found or company is not eligible for registration.",
//       });
//     }

//     // ------------------------------------------
//     // COMPANY MOBILE
//     // ------------------------------------------
//     const companyMobile = String(
//       companyResult.recordset[0].MobileNo || ""
//     ).trim();

//     const enteredMobile = String(
//       RegisteredMobileNumber || ""
//     ).trim();

//     console.log("Company Mobile:", companyMobile);
//     console.log("Entered Mobile:", enteredMobile);

//     // ------------------------------------------
//     // MOBILE VALIDATION
//     // ------------------------------------------
//     if (companyMobile !== enteredMobile) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Registered Mobile Number does not match Company Mobile Number.",
//       });
//     }

//     // ------------------------------------------
//     // CHECK USERNAME
//     // ------------------------------------------
//     const checkUser = await pool
//       .request()
//       .input(
//         "UserName",
//         sql.VarChar,
//         String(userName).trim()
//       )
//       .query(`
//         SELECT
//           UserCode
//         FROM tbl_User
//         WHERE UserName = @UserName
//       `);

//     if (checkUser.recordset.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Username already exists.",
//       });
//     }

//     // ------------------------------------------
//     // GENERATE USER CODE
//     // ------------------------------------------
//     const userCodeResult = await pool
//       .request()
//       .query(`
//         SELECT
//           ISNULL(MAX(UserCode), 0) + 1 AS UserCode
//         FROM tbl_User
//       `);

//     const newUserCode =
//       userCodeResult.recordset[0].UserCode;

//     // ------------------------------------------
//     // INSERT USER
//     // ------------------------------------------
//     await pool
//       .request()
//       .input(
//         "UserCode",
//         sql.Int,
//         newUserCode
//       )
//       .input(
//         "UserTypeCode",
//         sql.Int,
//         Number(userTypeId)
//       )
//       .input(
//         "CompanyCode",
//         sql.Int,
//         Number(CompanyCode)
//       )
//       .input(
//         "MemberNumber",
//         sql.VarChar,
//         MemberNumber
//           ? String(MemberNumber).trim()
//           : ""
//       )
//       .input(
//         "RegisteredMobileNumber",
//         sql.VarChar,
//         enteredMobile
//       )
//       .input(
//         "UserName",
//         sql.VarChar,
//         String(userName).trim()
//       )
//       .input(
//         "Password",
//         sql.VarChar,
//         String(password)
//       )
//       .query(`
//         INSERT INTO tbl_User
//         (
//           UserCode,
//           UserTypeCode,
//           CompanyCode,
//           MemberNumber,
//           RegisteredMobileNumber,
//           UserName,
//           Password,
//           C_Date
//         )
//         VALUES
//         (
//           @UserCode,
//           @UserTypeCode,
//           @CompanyCode,
//           @MemberNumber,
//           @RegisteredMobileNumber,
//           @UserName,
//           @Password,
//           GETDATE()
//         )
//       `);

//     // ------------------------------------------
//     // SUCCESS
//     // ------------------------------------------
//     return res.status(201).json({
//       success: true,
//       message: "User created successfully.",
//       userCode: newUserCode,
//     });

//   } catch (err) {
//     console.error("POST /register ERROR:", err);

//     return res.status(500).json({
//       success: false,
//       message: "User registration failed.",
//       error: err.message,
//     });
//   }
// });
// router.get("/Company", async (req, res) => {
//   try {
//     const { CompanyCode } = req.query;

//     const pool = await getPool();

//     const result = await pool
//       .request()
//       .input("CompanyCode", sql.Int, CompanyCode)
//       .query(`
//         SELECT
//           CompanyCode,
//           EDNO,
//           RTRIM(ISNULL(Header1, '')) +
//           RTRIM(ISNULL(Header2, '')) AS CompanyName,
//           MobileNo
//         FROM tbl_Company
//         WHERE LEN(
//           RTRIM(ISNULL(Header1, '')) +
//           RTRIM(ISNULL(Header2, ''))
//         ) > 10
//         AND LEN(RTRIM(ISNULL(MobileNo, ''))) = 10
//         AND EDNO > 0
//         AND CompanyCode = @CompanyCode
//       `);

//     res.json(result.recordset);

//   } catch (error) {
//     console.error("Company API Error:", error);
//     res.status(500).json({
//       message: "Failed to load companies"
//     });
//   }
// });


// // ======================================================
// // EXPORT ROUTER
// // ======================================================
// module.exports = router;









const express = require("express");

const router = express.Router();
const sql = require("mssql");
const { getPool } = require("../db");

// ======================================================
// GET USER TYPES
// GET /api/usertypes
// ======================================================
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

    console.log("User Types:", result.recordset);

    return res.json(result.recordset);
  } catch (err) {
    console.error("GET /usertypes ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to load user types.",
      error: err.message,
    });
  }
});

// ======================================================
// GET COMPANY
// GET /api/Company
// ======================================================
router.get("/Company", async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        CompanyCode,
        EDNO,
        RTRIM(ISNULL(Header1, '')) +
        RTRIM(ISNULL(Header2, '')) AS CompanyName,
        MobileNo
      FROM tbl_Company
      WHERE LEN(
        RTRIM(ISNULL(Header1, '')) +
        RTRIM(ISNULL(Header2, ''))
      ) > 10
        AND LEN(
          RTRIM(ISNULL(MobileNo, ''))
        ) = 10
        AND EDNO > 0
      ORDER BY EDNO
    `);

    console.log(
      "Companies:",
      result.recordset.length
    );

    res.json(result.recordset);

  } catch (err) {
    console.error(
      "GET /Company ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      message: "Failed to load companies.",
      error: err.message,
    });
  }
});

// ======================================================
// LOGIN
// POST /api/login
// ======================================================
router.post("/login", async (req, res) => {
  try {
    const {
      userTypeId,
      userName,
      password,
    } = req.body;

    // ------------------------------------------
    // VALIDATION
    // ------------------------------------------
    if (!userTypeId || !userName || !password) {
      return res.status(400).json({
        success: false,
        message:
          "User type, username and password are required.",
      });
    }

    const pool = await getPool();

    // ------------------------------------------
    // GET USER
    // ------------------------------------------
    const result = await pool
      .request()
      .input(
        "UserTypeCode",
        sql.Int,
        Number(userTypeId)
      )
      .input(
        "UserName",
        sql.VarChar,
        String(userName).trim()
      )
      .query(`
        SELECT
          u.UserCode,
          u.UserName,
          u.Password,
          u.UserTypeCode,
          u.CompanyCode,
          u.MemberNumber,

          t.UserTypeName,

          RTRIM(
            ISNULL(c.Header1, '') +
            ISNULL(c.Header2, '')
          ) AS CompanyName

        FROM tbl_User u

        INNER JOIN tbl_UserType t
          ON u.UserTypeCode = t.UserTypeCode

        LEFT JOIN tbl_Company c
          ON u.CompanyCode = c.CompanyCode

        WHERE
          u.UserName = @UserName
          AND u.UserTypeCode = @UserTypeCode
      `);

    // ------------------------------------------
    // USER NOT FOUND
    // ------------------------------------------
    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid username, password, or user type.",
      });
    }

    const row = result.recordset[0];

    // ------------------------------------------
    // PASSWORD CHECK
    // ------------------------------------------
    if (String(row.Password) !== String(password)) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid username, password, or user type.",
      });
    }

    // ------------------------------------------
    // FULL ACCESS ROLES
    // ------------------------------------------
    const FULL_ACCESS_ROLES = [
      "Secretary",
      "Member",
      ];

    const role = String(
      row.UserTypeName || ""
    ).toLowerCase();

    // ------------------------------------------
    // LOGIN SUCCESS
    // ------------------------------------------
    return res.json({
      success: true,
      message: "Login successful",

      user: {
        userCode: row.UserCode,
        userName: row.UserName,
        userTypeCode: row.UserTypeCode,
        userTypeName: row.UserTypeName,
        companyCode: row.CompanyCode,

        companyName:
          FULL_ACCESS_ROLES.includes(role)
            ? row.CompanyName
            : "",

        memberNumber: row.MemberNumber,
      },
    });
  } catch (err) {
    console.error("POST /login ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Login failed.",
      error: err.message,
    });
  }
});

// ======================================================
// REGISTER USER
// POST /api/register
// ======================================================
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

    // ------------------------------------------
    // VALIDATION
    // ------------------------------------------
    if (
      !userTypeId ||
      !CompanyCode ||
      !RegisteredMobileNumber ||
      !userName ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "User type, company, mobile number, username and password are required.",
      });
    }

    const pool = await getPool();

    // ------------------------------------------
    // CHECK SELECTED COMPANY
    // ------------------------------------------
    const companyResult = await pool
      .request()
      .input(
        "CompanyCode",
        sql.Int,
        Number(CompanyCode)
      )
      .query(`
        SELECT TOP 1
          CompanyCode,
          EDNO,
          RTRIM(ISNULL(Header1, '')) +
          RTRIM(ISNULL(Header2, '')) AS CompanyName,
          MobileNo
        FROM tbl_Company
        WHERE LEN(
          RTRIM(ISNULL(Header1, '')) +
          RTRIM(ISNULL(Header2, ''))
        ) > 10
          AND LEN(RTRIM(ISNULL(MobileNo, ''))) = 10
          AND EDNO > 0
          AND CompanyCode = @CompanyCode
        ORDER BY EDNO
      `);

    // ------------------------------------------
    // COMPANY NOT FOUND
    // ------------------------------------------
    if (companyResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Company not found or company is not eligible for registration.",
      });
    }

    // ------------------------------------------
    // COMPANY MOBILE
    // ------------------------------------------
    const companyMobile = String(
      companyResult.recordset[0].MobileNo || ""
    ).trim();

    const enteredMobile = String(
      RegisteredMobileNumber || ""
    ).trim();

    console.log("Company Mobile:", companyMobile);
    console.log("Entered Mobile:", enteredMobile);

    // ------------------------------------------
    // MOBILE VALIDATION
    // ------------------------------------------
    if (companyMobile !== enteredMobile) {
      return res.status(400).json({
        success: false,
        message:
          "Registered Mobile Number does not match Company Mobile Number.",
      });
    }

    // ------------------------------------------
    // CHECK USERNAME
    // ------------------------------------------
    const checkUser = await pool
      .request()
      .input(
        "UserName",
        sql.VarChar,
        String(userName).trim()
      )
      .query(`
        SELECT
          UserCode
        FROM tbl_User
        WHERE UserName = @UserName
      `);

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Username already exists.",
      });
    }

    // ------------------------------------------
    // GENERATE USER CODE
    // ------------------------------------------
    const userCodeResult = await pool
      .request()
      .query(`
        SELECT
          ISNULL(MAX(UserCode), 0) + 1 AS UserCode
        FROM tbl_User
      `);

    const newUserCode =
      userCodeResult.recordset[0].UserCode;

    // ------------------------------------------
    // INSERT USER
    // ------------------------------------------
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
        Number(CompanyCode)
      )
      .input(
        "MemberNumber",
        sql.VarChar,
        MemberNumber
          ? String(MemberNumber).trim()
          : ""
      )
      .input(
        "RegisteredMobileNumber",
        sql.VarChar,
        enteredMobile
      )
      .input(
        "UserName",
        sql.VarChar,
        String(userName).trim()
      )
      .input(
        "Password",
        sql.VarChar,
        String(password)
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

    // ------------------------------------------
    // SUCCESS
    // ------------------------------------------
    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      userCode: newUserCode,
    });

  } catch (err) {
    console.error("POST /register ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "User registration failed.",
      error: err.message,
    });
  }
});

// ======================================================
// EXPORT ROUTER
// ======================================================
module.exports = router;