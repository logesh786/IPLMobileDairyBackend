// const express = require("express");
// const router = express.Router();
// const sql = require("mssql");
// const { getPool } = require("../db");

// // // =====================
// // // GET USER TYPES
// // // =====================
// // router.get("/usertypes", async (req, res) => {
// //   try {
// //     const pool = await getPool();

// //     const result = await pool.request().query(`
// //       SELECT
// //         UserTypeCode,
// //         UserTypeName
// //       FROM tbl_UserType
// //       ORDER BY UserTypeCode
// //     `);

// //     res.json(result.recordset);

// //   } catch (err) {
// //     console.error(err);

// //     res.status(500).json({
// //       success: false,
// //       message: err.message,
// //     });
// //   }
// // });

// // // =====================
// // // GET COMPANY
// // // =====================
// // router.get("/Company", async (req, res) => {
// //   try {
// //     const pool = await getPool();

// //     const result = await pool.request().query(`
// //       SELECT
// //         CompanyCode,
// //         RTRIM(ISNULL(Header1,'') + ISNULL(Header2,'')) AS CompanyName
// //       FROM tbl_Company
// //       WHERE RTRIM(ISNULL(Header1,'') + ISNULL(Header2,'')) <> ''
// //       ORDER BY CompanyName
// //     `);

// //     res.json(result.recordset);

// //   } catch (err) {
// //     console.error(err);

// //     res.status(500).json({
// //       success: false,
// //       message: err.message,
// //     });
// //   }
// // });

// // // =====================
// // // LOGIN
// // // =====================
// // router.post("/login", async (req, res) => {
// //   try {
// //     const { userTypeId, userName, password } = req.body;

// //     if (!userTypeId || !userName || !password) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "User type, username and password are required.",
// //       });
// //     }

// //     const pool = await getPool();

// //     const result = await pool
// //       .request()
// //       .input("UserTypeCode", sql.Int, userTypeId)
// //       .input("UserName", sql.VarChar, userName)
// //       .query(`
// //         SELECT
// //           u.UserCode,
// //           u.UserName,
// //           u.Password,
// //           u.UserTypeCode,
// //           u.CompanyCode,
// //           u.MemberNumber,
// //           t.UserTypeName,
// //           RTRIM(ISNULL(c.Header1,'') + ISNULL(c.Header2,'')) AS CompanyName
// //         FROM tbl_User u
// //         INNER JOIN tbl_UserType t ON u.UserTypeCode = t.UserTypeCode
// //         LEFT JOIN tbl_Company c ON u.CompanyCode = c.CompanyCode
// //         WHERE u.UserName = @UserName
// //           AND u.UserTypeCode = @UserTypeCode
// //       `);

// //     if (result.recordset.length === 0) {
// //       return res.status(401).json({
// //         success: false,
// //         message: "Invalid username, password, or user type.",
// //       });
// //     }

// //     const row = result.recordset[0];

// //     if (String(row.Password) !== String(password)) {
// //       return res.status(401).json({
// //         success: false,
// //         message: "Invalid username, password, or user type.",
// //       });
// //     }

// //     res.json({
// //       success: true,
// //       message: "Login successful",
// //       user: {
// //         userCode: row.UserCode,
// //         userName: row.UserName,
// //         userTypeCode: row.UserTypeCode,
// //         userTypeName: row.UserTypeName,
// //         companyCode: row.CompanyCode,
// //         companyName: row.CompanyName,
// //         memberNumber: row.MemberNumber,
// //       },
// //     });
// //   } catch (err) {
// //     console.error(err);

// //     res.status(500).json({
// //       success: false,
// //       message: err.message,
// //     });
// //   }
// // });

// // // =====================
// // // REGISTER USER
// // // =====================
// // router.post("/register", async (req, res) => {
// //   try {

// //     const {
// //       userTypeId,
// //       CompanyCode,
// //       MemberNumber,
// //       RegisteredMobileNumber,
// //       userName,
// //       password,
// //     } = req.body;

// //     const pool = await getPool();

// //     // =====================
// //     // CHECK COMPANY EXISTS
// //     // =====================
// //     const companyResult = await pool
// //       .request()
// //       .input("CompanyCode", sql.Int, CompanyCode)
// //       .query(`
// //         SELECT
// //           MobileNumber
// //         FROM tbl_Company
// //         WHERE CompanyCode=@CompanyCode
// //       `);

// //     if (companyResult.recordset.length === 0) {
// //       return res.status(404).json({
// //         success: false,
// //         message: "Company not found."
// //       });
// //     }

// //     const companyMobile =
// //       String(companyResult.recordset[0].MobileNumber || "").trim();

// //     const enteredMobile =
// //       String(RegisteredMobileNumber || "").trim();

// //     // =====================
// //     // MOBILE VALIDATION
// //     // =====================
// //     if (companyMobile !== enteredMobile) {
// //       return res.status(400).json({
// //         success: false,
// //         message:
// //           "Registered Mobile Number does not match Company Mobile Number."
// //       });
// //     }

// //     // =====================
// //     // CHECK USERNAME
// //     // =====================
// //     const checkUser = await pool
// //       .request()
// //       .input("UserName", sql.VarChar, userName)
// //       .query(`
// //         SELECT UserCode
// //         FROM tbl_User
// //         WHERE UserName=@UserName
// //       `);

// //     if (checkUser.recordset.length > 0) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "Username already exists."
// //       });
// //     }

// //     // =====================
// //     // INSERT USER
// //     // =====================
// //     await pool
// //       .request()
// //       .input("UserTypeCode", sql.Int, userTypeId)
// //       .input("CompanyCode", sql.Int, CompanyCode)
// //       .input("MemberNumber", sql.VarChar, MemberNumber || "")
// //       .input(
// //         "RegisteredMobileNumber",
// //         sql.VarChar,
// //         RegisteredMobileNumber
// //       )
// //       .input("UserName", sql.VarChar, userName)
// //       .input("Password", sql.VarChar, password)
// //       .query(`
// //         INSERT INTO tbl_User
// //         (
// //             UserCode,
// //             UserTypeCode,
// //             CompanyCode,
// //             MemberNumber,
// //             RegisteredMobileNumber,
// //             UserName,
// //             Password,
// //             C_Date
// //         )
// //         VALUES
// //         (
// //             (SELECT ISNULL(MAX(UserCode),0)+1 FROM tbl_User),
// //             @UserTypeCode,
// //             @CompanyCode,
// //             @MemberNumber,
// //             @RegisteredMobileNumber,
// //             @UserName,
// //             @Password,
// //             GETDATE()
// //         )
// //       `);

// //     res.json({
// //       success: true,
// //       message: "User Created Successfully"
// //     });

// //   } catch (err) {

// //     console.error(err);

// //     res.status(500).json({
// //       success: false,
// //       message: err.message
// //     });

// //   }
// // });

// // module.exports = router;

// // =====================
// // LOGIN
// // =====================
// router.post("/login", async (req, res) => {
//   try {
//     const { userTypeId, userName, password } = req.body;

//     if (!userTypeId || !userName || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "User type, username and password are required.",
//       });
//     }

//     const pool = await getPool();

//     const result = await pool
//       .request()
//       .input("UserTypeCode", sql.Int, userTypeId)
//       .input("UserName", sql.VarChar, userName)
//       .query(`
//         SELECT
//           u.UserCode,
//           u.UserName,
//           u.Password,
//           u.UserTypeCode,
//           u.CompanyCode,
//           u.MemberNumber,
//           t.UserTypeName,
//           RTRIM(ISNULL(c.Header1,'') + ISNULL(c.Header2,'')) AS CompanyName
//         FROM tbl_User u
//         INNER JOIN tbl_UserType t
//           ON u.UserTypeCode = t.UserTypeCode
//         LEFT JOIN tbl_Company c
//           ON u.CompanyCode = c.CompanyCode
//         WHERE u.UserName = @UserName
//           AND u.UserTypeCode = @UserTypeCode
//       `);

//     if (result.recordset.length === 0) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid username, password, or user type.",
//       });
//     }

//     const row = result.recordset[0];

//     if (String(row.Password) !== String(password)) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid username, password, or user type.",
//       });
//     }

//     // Full access roles
//     const FULL_ACCESS_ROLES = ["secretary", "admin", "manager"];
//     const role = String(row.UserTypeName || "").toLowerCase();

//     res.json({
//       success: true,
//       message: "Login successful",
//       user: {
//         userCode: row.UserCode,
//         userName: row.UserName,
//         userTypeCode: row.UserTypeCode,
//         userTypeName: row.UserTypeName,
//         companyCode: row.CompanyCode,

//         // Hide society name for Member
//         companyName: FULL_ACCESS_ROLES.includes(role)
//           ? row.CompanyName
//           : "",

//         memberNumber: row.MemberNumber,
//       },
//     });

//   } catch (err) {
//     console.error(err);

//     res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// });
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

    res.json(result.recordset);

  } catch (err) {
    console.error("GET /usertypes ERROR:", err);

    res.status(500).json({
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
        RTRIM(
          ISNULL(Header1, '') +
          ISNULL(Header2, '')
        ) AS CompanyName
      FROM tbl_Company
      WHERE RTRIM(
        ISNULL(Header1, '') +
        ISNULL(Header2, '')
      ) <> ''
      ORDER BY CompanyName
    `);

    console.log("Companies:", result.recordset);

    res.json(result.recordset);

  } catch (err) {
    console.error("GET /Company ERROR:", err);

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
    if (
      String(row.Password) !==
      String(password)
    ) {
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
      "secretary",
      "admin",
      "manager",
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

        // Hide company name for Member
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
    // CHECK COMPANY
    // ------------------------------------------
    const companyResult = await pool
      .request()
      .input(
        "CompanyCode",
        sql.Int,
        Number(CompanyCode)
      )
      .query(`
        SELECT
          CompanyCode,CompanyName,
          MobileNo
        FROM tbl_Company
        WHERE CompanyCode = @CompanyCode
      `);

    if (companyResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Company not found.",
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
        String(RegisteredMobileNumber).trim()
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