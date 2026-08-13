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
//         AND LEN(RTRIM(ISNULL(MobileNo, ''))) = 10
//         AND EDNO > 0
//       ORDER BY EDNO
//     `);

//     console.log("Companies:", result.recordset.length);

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
//     if (String(row.Password) !== String(password)) {
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
// //   Check tbl_Company.MobileNo
// //
// // MEMBER:
// //   Check tbl_Member:
// //      CompanyCode
// //      MemberNumber
// //      MobileNo
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
//         message: "Mobile number is required.",
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

//     // ==================================================
//     // VALIDATE MOBILE FORMAT
//     // ==================================================
//     if (!/^[0-9]{10}$/.test(enteredMobile)) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Invalid mobile number. Enter a valid 10 digit mobile number.",
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

//     if (userTypeResult.recordset.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid user type.",
//       });
//     }

//     const userTypeName = String(
//       userTypeResult.recordset[0].UserTypeName || ""
//     )
//       .trim()
//       .toLowerCase();

//     console.log("----------------------------------");
//     console.log("REGISTER USER");
//     console.log("User Type:", userTypeName);
//     console.log("Company Code:", companyCode);
//     console.log("Member Number:", enteredMemberNumber);
//     console.log("Mobile:", enteredMobile);
//     console.log("----------------------------------");

//     // ==================================================
//     // SECRETARY
//     //
//     // SECRETARY MOBILE MUST MATCH tbl_Company.MobileNo
//     // ==================================================
//     if (userTypeName === "secretary") {
//       console.log("Checking Secretary Company Mobile...");

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

//       // ------------------------------------------------
//       // COMPANY NOT FOUND
//       // ------------------------------------------------
//       if (companyResult.recordset.length === 0) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "Invalid Company. Company does not exist.",
//         });
//       }

//       const companyMobile = String(
//         companyResult.recordset[0].MobileNo || ""
//       ).trim();

//       console.log(
//         "Company Mobile:",
//         companyMobile
//       );

//       console.log(
//         "Entered Mobile:",
//         enteredMobile
//       );

//       // ------------------------------------------------
//       // COMPANY MOBILE CHECK
//       // ------------------------------------------------
//       if (companyMobile !== enteredMobile) {
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
//     // MEMBER
//     //
//     // MEMBER NUMBER + COMPANY + MOBILE
//     // MUST MATCH tbl_Member
//     // ==================================================
//     else if (userTypeName === "member") {
//       console.log("Checking Member...");

//       // ------------------------------------------------
//       // MEMBER NUMBER REQUIRED
//       // ------------------------------------------------
//       if (!enteredMemberNumber) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "Member Number is required for Member registration.",
//         });
//       }

//       // ------------------------------------------------
//       // CHECK MEMBER
//       // ------------------------------------------------
//       const memberResult = await pool
//         .request()
//         .input(
//           "CompanyCode",
//           sql.Int,
//           companyCode
//         )
//         .input(
//           "MemberNumber",
//           sql.VarChar,
//           enteredMemberNumber
//         )
//         .query(`
//           SELECT TOP 1
//             CompanyCode,
//             MemberNumber,
//             MobileNo
//           FROM tbl_Member
//           WHERE CompanyCode = @CompanyCode
//             AND MemberNumber = @MemberNumber
//         `);

//       // ------------------------------------------------
//       // MEMBER NOT FOUND
//       // ------------------------------------------------
//       if (memberResult.recordset.length === 0) {
//         console.log(
//           "MEMBER NOT FOUND"
//         );

//         return res.status(400).json({
//           success: false,
//           message:
//             "Invalid Member Number. Member does not exist for the selected company.",
//         });
//       }

//       const memberMobile = String(
//         memberResult.recordset[0].MobileNo || ""
//       ).trim();

//       console.log(
//         "Member Mobile:",
//         memberMobile
//       );

//       console.log(
//         "Entered Mobile:",
//         enteredMobile
//       );

//       // ------------------------------------------------
//       // MEMBER MOBILE CHECK
//       // ------------------------------------------------
//       if (memberMobile !== enteredMobile) {
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
//         sql.VarChar,
//         enteredUserName
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
//         message:
//           "Username already exists.",
//       });
//     }

//     // ==================================================
//     // CHECK SAME MEMBER ALREADY REGISTERED
//     // ==================================================
//     if (userTypeName === "member") {
//       const existingMemberUser = await pool
//         .request()
//         .input(
//           "CompanyCode",
//           sql.Int,
//           companyCode
//         )
//         .input(
//           "MemberNumber",
//           sql.VarChar,
//           enteredMemberNumber
//         )
//         .query(`
//           SELECT
//             UserCode
//           FROM tbl_User
//           WHERE CompanyCode = @CompanyCode
//             AND MemberNumber = @MemberNumber
//         `);

//       if (
//         existingMemberUser.recordset.length > 0
//       ) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "This member is already registered.",
//         });
//       }
//     }

//     // ==================================================
//     // GENERATE USER CODE
//     // ==================================================
//     const userCodeResult = await pool
//       .request()
//       .query(`
//         SELECT
//           ISNULL(MAX(UserCode), 0) + 1 AS UserCode
//         FROM tbl_User
//       `);

//     const newUserCode =
//       userCodeResult.recordset[0].UserCode;

//     // ==================================================
//     // INSERT USER
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
//         sql.VarChar,
//         enteredMemberNumber
//       )
//       .input(
//         "RegisteredMobileNumber",
//         sql.VarChar,
//         enteredMobile
//       )
//       .input(
//         "UserName",
//         sql.VarChar,
//         enteredUserName
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

//     // ==================================================
//     // SUCCESS
//     // ==================================================
//     console.log(
//       "USER CREATED:",
//       newUserCode
//     );

//     return res.status(201).json({
//       success: true,
//       message:
//         "User created successfully.",
//       userCode: newUserCode,
//     });

//   } catch (err) {
//     console.error(
//       "POST /register ERROR:",
//       err
//     );

//     return res.status(500).json({
//       success: false,
//       message:
//         "User registration failed.",
//       error: err.message,
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
        AND LEN(RTRIM(ISNULL(MobileNo, ''))) = 10
        AND EDNO > 0
      ORDER BY EDNO
    `);

    console.log(
      "Companies:",
      result.recordset.length
    );

    return res.json(result.recordset);
  } catch (err) {
    console.error("GET /Company ERROR:", err);

    return res.status(500).json({
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

    // ==================================================
    // VALIDATION
    // ==================================================
    if (!userTypeId || !userName || !password) {
      return res.status(400).json({
        success: false,
        message:
          "User type, username and password are required.",
      });
    }

    const pool = await getPool();

    // ==================================================
    // GET USER
    // ==================================================
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

    // ==================================================
    // USER NOT FOUND
    // ==================================================
    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid username, password, or user type.",
      });
    }

    const row = result.recordset[0];

    // ==================================================
    // PASSWORD CHECK
    // ==================================================
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

    // ==================================================
    // FULL ACCESS ROLES
    // ==================================================
    const FULL_ACCESS_ROLES = [
      "secretary",
      "member",
    ];

    const role = String(
      row.UserTypeName || ""
    )
      .trim()
      .toLowerCase();

    // ==================================================
    // LOGIN SUCCESS
    // ==================================================
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
    console.error(
      "POST /login ERROR:",
      err
    );

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
//
// SECRETARY:
//   CompanyCode
//   Mobile -> tbl_Company.MobileNo
//
// MEMBER:
//   CompanyCode
//   MemberNumber
//   Mobile -> tbl_Member.MobileNo
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

    console.log("");
    console.log(
      "======================================"
    );
    console.log("REGISTER REQUEST");
    console.log("Body:", req.body);
    console.log(
      "======================================"
    );

    // ==================================================
    // BASIC VALIDATION
    // ==================================================
    if (!userTypeId) {
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

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required.",
      });
    }

    const pool = await getPool();

    // ==================================================
    // CLEAN VALUES
    // ==================================================
    const companyCode = Number(CompanyCode);

    const enteredMobile = String(
      RegisteredMobileNumber
    ).trim();

    const enteredMemberNumber = String(
      MemberNumber || ""
    ).trim();

    const enteredUserName = String(
      userName
    ).trim();

    // ==================================================
    // COMPANY CODE VALIDATION
    // ==================================================
    if (
      !Number.isInteger(companyCode) ||
      companyCode <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Company.",
      });
    }

    // ==================================================
    // MOBILE VALIDATION
    // ==================================================
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

    // ==================================================
    // CHECK USER TYPE
    // ==================================================
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
        WHERE UserTypeCode = @UserTypeCode
      `);

    if (
      userTypeResult.recordset.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type.",
      });
    }

    const userTypeName = String(
      userTypeResult.recordset[0]
        .UserTypeName || ""
    )
      .trim()
      .toLowerCase();

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

    // ==================================================
    // SECRETARY
    //
    // tbl_Company ONLY
    //
    // CompanyCode
    //     +
    // MobileNo
    // ==================================================
    if (userTypeName === "secretary") {
      console.log(
        "----------------------------------"
      );

      console.log(
        "SECRETARY REGISTRATION"
      );

      console.log(
        "Checking tbl_Company..."
      );

      const companyResult = await pool
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
          WHERE CompanyCode = @CompanyCode
        `);

      // ==================================================
      // COMPANY NOT FOUND
      // ==================================================
      if (
        companyResult.recordset.length === 0
      ) {
        console.log(
          "COMPANY NOT FOUND"
        );

        return res.status(400).json({
          success: false,
          message:
            "Invalid Company. Company does not exist.",
        });
      }

      const companyMobile = String(
        companyResult.recordset[0]
          .MobileNo || ""
      ).trim();

      console.log(
        "tbl_Company MobileNo:",
        companyMobile
      );

      console.log(
        "Entered Mobile:",
        enteredMobile
      );

      // ==================================================
      // SECRETARY MOBILE CHECK
      //
      // DO NOT CHANGE
      // ==================================================
      if (
        companyMobile !==
        enteredMobile
      ) {
        console.log(
          "SECRETARY MOBILE CHECK FAILED"
        );

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

    // ==================================================
    // MEMBER
    //
    // tbl_Member ONLY
    //
    // CompanyCode
    //     +
    // MemberNumber
    //     +
    // MobileNo
    // ==================================================
    else if (
      userTypeName === "member"
    ) {
      console.log(
        "----------------------------------"
      );

      console.log(
        "MEMBER REGISTRATION"
      );

      console.log(
        "Checking tbl_Member..."
      );

      // ==================================================
      // MEMBER NUMBER REQUIRED
      // ==================================================
      if (!enteredMemberNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Member Number is required for Member registration.",
        });
      }

      // ==================================================
      // GET MEMBER
      // ==================================================
      const memberResult = await pool
        .request()
        .input(
          "CompanyCode",
          sql.Int,
          companyCode
        )
        .input(
          "MemberNumber",
          sql.VarChar,
          enteredMemberNumber
        )
        .query(`
          SELECT TOP 1
            CompanyCode,
            MemberNumber,
            MobileNo
          FROM tbl_Member
          WHERE CompanyCode = @CompanyCode
            AND MemberNumber = @MemberNumber
        `);

      // ==================================================
      // MEMBER NOT FOUND
      // ==================================================
      if (
        memberResult.recordset.length === 0
      ) {
        console.log(
          "MEMBER NOT FOUND"
        );

        return res.status(400).json({
          success: false,
          message:
            "Invalid Member Number. Member does not exist for the selected company.",
        });
      }

      const memberRow =
        memberResult.recordset[0];

      const memberMobile = String(
        memberRow.MobileNo || ""
      ).trim();

      console.log(
        "tbl_Member CompanyCode:",
        memberRow.CompanyCode
      );

      console.log(
        "tbl_Member MemberNumber:",
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

      // ==================================================
      // MEMBER MOBILE CHECK
      //
      // IMPORTANT:
      // CHECK tbl_Member.MobileNo
      //
      // NOT tbl_Company.MobileNo
      // ==================================================
      if (
        memberMobile !==
        enteredMobile
      ) {
        console.log(
          "MEMBER MOBILE CHECK FAILED"
        );

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

    // ==================================================
    // INVALID USER TYPE
    // ==================================================
    else {
      return res.status(400).json({
        success: false,
        message:
          "Only Secretary and Member registration is allowed.",
      });
    }

    // ==================================================
    // CHECK USERNAME
    // ==================================================
    const checkUser = await pool
      .request()
      .input(
        "UserName",
        sql.VarChar,
        enteredUserName
      )
      .query(`
        SELECT
          UserCode
        FROM tbl_User
        WHERE UserName = @UserName
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

    // ==================================================
    // CHECK MEMBER ALREADY REGISTERED
    // ==================================================
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
            sql.VarChar,
            enteredMemberNumber
          )
          .query(`
            SELECT
              UserCode
            FROM tbl_User
            WHERE CompanyCode = @CompanyCode
              AND MemberNumber = @MemberNumber
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

    // ==================================================
    // GENERATE USER CODE
    // ==================================================
    const userCodeResult =
      await pool
        .request()
        .query(`
          SELECT
            ISNULL(MAX(UserCode), 0) + 1 AS UserCode
          FROM tbl_User
        `);

    const newUserCode =
      userCodeResult.recordset[0]
        .UserCode;

    console.log(
      "New UserCode:",
      newUserCode
    );

    // ==================================================
    // INSERT USER
    // ==================================================
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
        sql.VarChar,
        enteredMemberNumber
      )
      .input(
        "RegisteredMobileNumber",
        sql.VarChar,
        enteredMobile
      )
      .input(
        "UserName",
        sql.VarChar,
        enteredUserName
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

    // ==================================================
    // SUCCESS
    // ==================================================
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
      userCode: newUserCode,
    });

  } catch (err) {
    console.error(
      "POST /register ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        "User registration failed.",
      error: err.message,
    });
  }
});

// ======================================================
// EXPORT ROUTER
// ======================================================
module.exports = router;