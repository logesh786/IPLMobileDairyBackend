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

//     return res.json(result.recordset);
//   } catch (err) {
//     console.error("GET /usertypes ERROR:", err);

//     return res.status(500).json({
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
//       AND LEN(RTRIM(ISNULL(MobileNo, ''))) = 10
//       AND EDNO > 0
//       ORDER BY EDNO
//     `);

//     console.log(
//       "Companies:",
//       result.recordset.length
//     );

//     return res.json(result.recordset);
//   } catch (err) {
//     console.error("GET /Company ERROR:", err);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to load companies.",
//       error: err.message,
//     });
//   }
// });

// // ======================================================
// // LOGIN
// // POST /api/login
// //
// // tbl_User:
// //   MemberNumber
// // ======================================================
// router.post("/login", async (req, res) => {
//   try {
//     const {
//       userTypeId,
//       userName,
//       password,
//     } = req.body;

//     // ==================================================
//     // VALIDATION
//     // ==================================================
//     if (!userTypeId || !userName || !password) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "User type, username and password are required.",
//       });
//     }

//     const pool = await getPool();

//     // ==================================================
//     // GET USER
//     // ==================================================
//     const result = await pool
//       .request()
//       .input(
//         "UserTypeCode",
//         sql.Int,
//         Number(userTypeId)
//       )
//       .input(
//         "UserName",
//         sql.VarChar(100),
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

//     // ==================================================
//     // USER NOT FOUND
//     // ==================================================
//     if (result.recordset.length === 0) {
//       return res.status(401).json({
//         success: false,
//         message:
//           "Invalid username, password, or user type.",
//       });
//     }

//     const row = result.recordset[0];

//     // ==================================================
//     // PASSWORD CHECK
//     // ==================================================
//     if (
//       String(row.Password) !==
//       String(password)
//     ) {
//       return res.status(401).json({
//         success: false,
//         message:
//           "Invalid username, password, or user type.",
//       });
//     }

//     // ==================================================
//     // FULL ACCESS ROLES
//     // ==================================================
//     const FULL_ACCESS_ROLES = [
//       "secretary",
//       "member",
//     ];

//     const role = String(
//       row.UserTypeName || ""
//     )
//       .trim()
//       .toLowerCase();

//     // ==================================================
//     // LOGIN SUCCESS
//     // ==================================================
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
// //
// // SECRETARY:
// //   tbl_Company.MobileNo
// //
// // MEMBER:
// //   tbl_Member.[number]
// //   tbl_Member.MobileNo
// //
// // tbl_User:
// //   MemberNumber
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

//     console.log("");
//     console.log("======================================");
//     console.log("REGISTER REQUEST");
//     console.log("Body:", req.body);
//     console.log("======================================");

//     // ==================================================
//     // BASIC VALIDATION
//     // ==================================================
//     if (!userTypeId) {
//       return res.status(400).json({
//         success: false,
//         message: "User type is required.",
//       });
//     }

//     if (!CompanyCode) {
//       return res.status(400).json({
//         success: false,
//         message: "Company is required.",
//       });
//     }

//     if (!RegisteredMobileNumber) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Registered mobile number is required.",
//       });
//     }

//     if (!userName) {
//       return res.status(400).json({
//         success: false,
//         message: "Username is required.",
//       });
//     }

//     if (!password) {
//       return res.status(400).json({
//         success: false,
//         message: "Password is required.",
//       });
//     }

//     const pool = await getPool();

//     // ==================================================
//     // CLEAN VALUES
//     // ==================================================
//     const companyCode = Number(CompanyCode);

//     const enteredMobile = String(
//       RegisteredMobileNumber
//     ).trim();

//     const enteredMemberNumber = String(
//       MemberNumber || ""
//     ).trim();

//     const enteredUserName = String(
//       userName
//     ).trim();

//     const enteredPassword = String(
//       password
//     );

//     // ==================================================
//     // COMPANY CODE VALIDATION
//     // ==================================================
//     if (
//       !Number.isInteger(companyCode) ||
//       companyCode <= 0
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid Company.",
//       });
//     }

//     // ==================================================
//     // MOBILE VALIDATION
//     // ==================================================
//     if (
//       !/^[6-9][0-9]{9}$/.test(
//         enteredMobile
//       )
//     ) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Invalid mobile number. Enter a valid 10 digit mobile number.",
//       });
//     }

//     // ==================================================
//     // USERNAME VALIDATION
//     // ==================================================
//     if (!enteredUserName) {
//       return res.status(400).json({
//         success: false,
//         message: "Username is required.",
//       });
//     }

//     // ==================================================
//     // PASSWORD VALIDATION
//     // ==================================================
//     if (!enteredPassword) {
//       return res.status(400).json({
//         success: false,
//         message: "Password is required.",
//       });
//     }

//     // ==================================================
//     // CHECK USER TYPE
//     // ==================================================
//     const userTypeResult = await pool
//       .request()
//       .input(
//         "UserTypeCode",
//         sql.Int,
//         Number(userTypeId)
//       )
//       .query(`
//         SELECT
//           UserTypeCode,
//           UserTypeName
//         FROM tbl_UserType
//         WHERE UserTypeCode = @UserTypeCode
//       `);

//     if (
//       userTypeResult.recordset.length === 0
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid user type.",
//       });
//     }

//     const userTypeName = String(
//       userTypeResult.recordset[0]
//         .UserTypeName || ""
//     )
//       .trim()
//       .toLowerCase();

//     console.log("----------------------------------");
//     console.log(
//       "User Type:",
//       userTypeName
//     );
//     console.log(
//       "Company Code:",
//       companyCode
//     );
//     console.log(
//       "Member Number:",
//       enteredMemberNumber
//     );
//     console.log(
//       "Entered Mobile:",
//       enteredMobile
//     );
//     console.log("----------------------------------");

//     // ==================================================
//     // SECRETARY REGISTRATION
//     //
//     // tbl_Company.MobileNo
//     // ==================================================
//     if (userTypeName === "secretary") {
//       console.log(
//         "SECRETARY REGISTRATION"
//       );

//       const companyResult = await pool
//         .request()
//         .input(
//           "CompanyCode",
//           sql.Int,
//           companyCode
//         )
//         .query(`
//           SELECT TOP 1
//             CompanyCode,
//             MobileNo
//           FROM tbl_Company
//           WHERE CompanyCode = @CompanyCode
//         `);

//       // =================================================
//       // COMPANY NOT FOUND
//       // =================================================
//       if (
//         companyResult.recordset.length === 0
//       ) {
//         console.log(
//           "COMPANY NOT FOUND"
//         );

//         return res.status(400).json({
//           success: false,
//           message:
//             "Invalid Company. Company does not exist.",
//         });
//       }

//       const companyMobile = String(
//         companyResult.recordset[0]
//           .MobileNo || ""
//       ).trim();

//       console.log(
//         "Company Mobile:",
//         companyMobile
//       );

//       console.log(
//         "Entered Mobile:",
//         enteredMobile
//       );

//       // =================================================
//       // MOBILE CHECK
//       // =================================================
//       if (
//         companyMobile !==
//         enteredMobile
//       ) {
//         console.log(
//           "SECRETARY MOBILE CHECK FAILED"
//         );

//         return res.status(400).json({
//           success: false,
//           message:
//             "Invalid Mobile Number. Mobile number does not match the company.",
//         });
//       }

//       console.log(
//         "SECRETARY MOBILE CHECK SUCCESS"
//       );
//     }

//     // ==================================================
//     // MEMBER REGISTRATION
//     //
//     // tbl_Member:
//     //   CompanyCode
//     //   [number]
//     //   MobileNo
//     // ==================================================
//     else if (
//       userTypeName === "member"
//     ) {
//       console.log(
//         "MEMBER REGISTRATION"
//       );

//       // =================================================
//       // MEMBER NUMBER REQUIRED
//       // =================================================
//       if (!enteredMemberNumber) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "Member Number is required for Member registration.",
//         });
//       }

//       // =================================================
//       // CHECK MEMBER
//       //
//       // IMPORTANT:
//       // tbl_Member column = [number]
//       // =================================================
//       const memberResult = await pool
//         .request()
//         .input(
//           "CompanyCode",
//           sql.Int,
//           companyCode
//         )
//         .input(
//           "MemberNumber",
//           sql.VarChar(100),
//           enteredMemberNumber
//         )
//         .query(`
//           SELECT TOP 1
//             CompanyCode,

//             [number] AS MemberNumber,

//             MobileNo

//           FROM tbl_Member

//           WHERE
//             CompanyCode = @CompanyCode
//             AND [number] = @MemberNumber
//         `);

//       // =================================================
//       // MEMBER NOT FOUND
//       // =================================================
//       if (
//         memberResult.recordset.length === 0
//       ) {
//         console.log(
//           "MEMBER NOT FOUND"
//         );

//         return res.status(400).json({
//           success: false,
//           message:
//             "Invalid Member Number. Member does not exist for the selected company.",
//         });
//       }

//       const memberRow =
//         memberResult.recordset[0];

//       const memberMobile = String(
//         memberRow.MobileNo || ""
//       ).trim();

//       console.log(
//         "tbl_Member CompanyCode:",
//         memberRow.CompanyCode
//       );

//       console.log(
//         "tbl_Member Number:",
//         memberRow.MemberNumber
//       );

//       console.log(
//         "tbl_Member MobileNo:",
//         memberMobile
//       );

//       console.log(
//         "Entered Mobile:",
//         enteredMobile
//       );

//       // =================================================
//       // MEMBER MOBILE CHECK
//       // =================================================
//       if (
//         memberMobile !==
//         enteredMobile
//       ) {
//         console.log(
//           "MEMBER MOBILE CHECK FAILED"
//         );

//         return res.status(400).json({
//           success: false,
//           message:
//             "Invalid Mobile Number. Mobile number does not match the member.",
//         });
//       }

//       console.log(
//         "MEMBER MOBILE CHECK SUCCESS"
//       );
//     }

//     // ==================================================
//     // INVALID USER TYPE
//     // ==================================================
//     else {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Only Secretary and Member registration is allowed.",
//       });
//     }

//     // ==================================================
//     // CHECK USERNAME
//     // ==================================================
//     const checkUser = await pool
//       .request()
//       .input(
//         "UserName",
//         sql.VarChar(100),
//         enteredUserName
//       )
//       .query(`
//         SELECT TOP 1
//           UserCode
//         FROM tbl_User
//         WHERE UserName = @UserName
//       `);

//     if (
//       checkUser.recordset.length > 0
//     ) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Username already exists.",
//       });
//     }

//     // ==================================================
//     // CHECK MEMBER ALREADY REGISTERED
//     //
//     // tbl_User.MemberNumber
//     // ==================================================
//     if (
//       userTypeName === "member"
//     ) {
//       const existingMemberUser =
//         await pool
//           .request()
//           .input(
//             "CompanyCode",
//             sql.Int,
//             companyCode
//           )
//           .input(
//             "MemberNumber",
//             sql.VarChar(100),
//             enteredMemberNumber
//           )
//           .query(`
//             SELECT TOP 1
//               UserCode
//             FROM tbl_User
//             WHERE
//               CompanyCode = @CompanyCode
//               AND MemberNumber = @MemberNumber
//           `);

//       if (
//         existingMemberUser.recordset
//           .length > 0
//       ) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "This member is already registered.",
//         });
//       }
//     }

//     // ==================================================
//     // CHECK SECRETARY ALREADY REGISTERED
//     // ==================================================
//     if (
//       userTypeName === "secretary"
//     ) {
//       const existingSecretary =
//         await pool
//           .request()
//           .input(
//             "CompanyCode",
//             sql.Int,
//             companyCode
//           )
//           .input(
//             "UserTypeCode",
//             sql.Int,
//             Number(userTypeId)
//           )
//           .query(`
//             SELECT TOP 1
//               UserCode
//             FROM tbl_User
//             WHERE
//               CompanyCode = @CompanyCode
//               AND UserTypeCode = @UserTypeCode
//           `);

//       if (
//         existingSecretary.recordset
//           .length > 0
//       ) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "This company already has a registered Secretary.",
//         });
//       }
//     }

//     // ==================================================
//     // GENERATE USER CODE
//     // ==================================================
//     const userCodeResult =
//       await pool
//         .request()
//         .query(`
//           SELECT
//             ISNULL(MAX(UserCode), 0) + 1 AS UserCode
//           FROM tbl_User
//         `);

//     const newUserCode = Number(
//       userCodeResult.recordset[0]
//         .UserCode
//     );

//     console.log(
//       "New UserCode:",
//       newUserCode
//     );

//     // ==================================================
//     // INSERT USER
//     //
//     // tbl_User.MemberNumber
//     // ==================================================
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
//         companyCode
//       )
//       .input(
//         "MemberNumber",
//         sql.VarChar(100),
//         enteredMemberNumber
//       )
//       .input(
//         "RegisteredMobileNumber",
//         sql.VarChar(20),
//         enteredMobile
//       )
//       .input(
//         "UserName",
//         sql.VarChar(100),
//         enteredUserName
//       )
//       .input(
//         "Password",
//         sql.VarChar(255),
//         enteredPassword
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

//     // ==================================================
//     // SUCCESS
//     // ==================================================
//     console.log("======================================");
//     console.log(
//       "USER CREATED SUCCESSFULLY"
//     );
//     console.log(
//       "UserCode:",
//       newUserCode
//     );
//     console.log(
//       "UserType:",
//       userTypeName
//     );
//     console.log(
//       "CompanyCode:",
//       companyCode
//     );
//     console.log(
//       "MemberNumber:",
//       enteredMemberNumber
//     );
//     console.log("======================================");

//     return res.status(201).json({
//       success: true,
//       message:
//         "User created successfully.",
//       userCode: newUserCode,
//     });

//   } catch (err) {
//     // ==================================================
//     // DATABASE ERROR
//     // ==================================================
//     console.error(
//       "======================================"
//     );

//     console.error(
//       "POST /register ERROR"
//     );

//     console.error(
//       "Error message:",
//       err.message
//     );

//     console.error(
//       "Error code:",
//       err.code
//     );

//     console.error(
//       "SQL number:",
//       err.number
//     );

//     console.error(
//       "SQL state:",
//       err.state
//     );

//     console.error(
//       "SQL class:",
//       err.class
//     );

//     console.error(
//       "Full error:",
//       err
//     );

//     console.error(
//       "======================================"
//     );

//     return res.status(500).json({
//       success: false,
//       message:
//         "User registration failed.",
//       error: err.message,
//       code: err.code || null,
//       number: err.number || null,
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

// =====================================================
// NORMALIZE ROLE
// =====================================================
const normalizeRole = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

// =====================================================
// LOGIN
// =====================================================
router.post("/login", async (req, res) => {
  try {
    const {
      userTypeId,
      userName,
      password,
    } = req.body;

    // =================================================
    // VALIDATION
    // =================================================

    if (!userTypeId) {
      return res.status(400).json({
        message: "User type is required",
      });
    }

    if (!userName) {
      return res.status(400).json({
        message: "Username is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        message: "Password is required",
      });
    }

    const pool = await getPool();

    // =================================================
    // GET USER + USER TYPE + COMPANY
    // =================================================

    const result = await pool
      .request()

      .input(
        "UserName",
        sql.VarChar,
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
            ) +
            CASE
              WHEN
                LTRIM(RTRIM(ISNULL(c.Header2, ''))) <> ''
              THEN
                ' ' +
                LTRIM(RTRIM(ISNULL(c.Header2, '')))
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
        message:
          "Invalid username, password or user type",
      });
    }

    const row =
      result.recordset[0];

    // =================================================
    // PASSWORD CHECK
    // =================================================

    if (
      String(row.Password) !==
      String(password)
    ) {
      return res.status(401).json({
        message:
          "Invalid username, password or user type",
      });
    }

    // =================================================
    // ROLE
    // =================================================

    const role =
      normalizeRole(
        row.UserTypeName
      );

    // =================================================
    // COMPANY NAME
    // =================================================

    const companyName =
      String(
        row.CompanyName || ""
      ).trim();

    // =================================================
    // DEBUG
    // =================================================

    console.log(
      "======================================"
    );

    console.log(
      "LOGIN SUCCESS"
    );

    console.log(
      "UserCode:",
      row.UserCode
    );

    console.log(
      "UserName:",
      row.UserName
    );

    console.log(
      "UserTypeCode:",
      row.UserTypeCode
    );

    console.log(
      "UserTypeName:",
      row.UserTypeName
    );

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

    console.log(
      "======================================"
    );

    // =================================================
    // RETURN USER
    // =================================================

    return res.status(200).json({

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

        companyCode:
          row.CompanyCode,

        // IMPORTANT
        // This is what DashboardHome.jsx uses
        companyName:
          companyName,

        memberNumber:
          row.MemberNumber,

        registeredMobileNumber:
          row.RegisteredMobileNumber,
      },

    });

  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Server error during login",
      error:
        error.message,
    });
  }
});

module.exports = router;