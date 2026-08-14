// const express = require("express");
// const router = express.Router();
// const sql = require("mssql");
// const { getPool } = require("../db");

// const FULL_ACCESS_ROLES = [
//   "secretary",
//   "admin",
//   "manager",
// ];

// // =====================================================
// // GET PURCHASES
// // =====================================================
// router.get("/purchases", async (req, res) => {
//   try {
//     const {
//       userCode,
//       companyCode,
//       memberNumber,
//       fromDate,
//       toDate,
//     } = req.query;

//     console.log("======================================");
//     console.log("PURCHASE REQUEST");
//     console.log({
//       userCode,
//       companyCode,
//       memberNumber,
//       fromDate,
//       toDate,
//     });
//     console.log("======================================");

//     if (!userCode) {
//       return res.status(400).json({
//         success: false,
//         message: "userCode is required.",
//       });
//     }

//     const pool = await getPool();

//     // =================================================
//     // GET LOGGED-IN USER
//     // =================================================
//     const userResult = await pool
//       .request()
//       .input(
//         "UserCode",
//         sql.Int,
//         Number(userCode)
//       )
//       .query(`
//         SELECT
//           u.UserCode,
//           u.UserTypeCode,
//           u.UserName,
//           u.CompanyCode,
//           u.MemberNumber,
//           t.UserTypeName
//         FROM tbl_User u
//         INNER JOIN tbl_UserType t
//           ON u.UserTypeCode = t.UserTypeCode
//         WHERE u.UserCode = @UserCode
//       `);

//     if (userResult.recordset.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found.",
//       });
//     }

//     const me = userResult.recordset[0];

//     const role = String(
//       me.UserTypeName || ""
//     )
//       .trim()
//       .toLowerCase();

//     const fullAccess =
//       FULL_ACCESS_ROLES.includes(role);

//     console.log("LOGIN USER:");
//     console.log("UserCode:", me.UserCode);
//     console.log("UserName:", me.UserName);
//     console.log("Role:", role);
//     console.log("CompanyCode:", me.CompanyCode);
//     console.log("MemberNumber:", me.MemberNumber);
//     console.log("Full Access:", fullAccess);

//     // =================================================
//     // BUILD REQUEST
//     // =================================================
//     const request = pool.request();

//     let where = `
//       WHERE 1 = 1
//     `;

//     // =================================================
//     // SECRETARY / ADMIN / MANAGER
//     //
//     // IMPORTANT:
//     // Secretary DOES NOT use MemberNumber.
//     //
//     // Company filter is OPTIONAL for full-access users.
//     // If the frontend sends a companyCode, use it.
//     // If not, and the user has a valid CompanyCode of
//     // their own, use that.
//     // If neither is available (e.g. secretary with no
//     // fixed CompanyCode, meant to see ALL companies),
//     // do NOT filter by company at all — this matches
//     // the original working behavior.
//     // =================================================
//     if (fullAccess) {

//       console.log(
//         "PURCHASE MODE: FULL ACCESS"
//       );

//       // -----------------------------------------------
//       // COMPANY CODE (OPTIONAL)
//       // -----------------------------------------------

//       let filterCompanyCode = null;

//       // If frontend sends companyCode,
//       // use it.
//       if (
//         companyCode !== undefined &&
//         companyCode !== null &&
//         String(companyCode).trim() !== ""
//       ) {
//         const match =
//           String(companyCode)
//             .trim()
//             .match(/^\d+/);

//         if (match) {
//           filterCompanyCode =
//             Number(match[0]);
//         }
//       }

//       // -----------------------------------------------
//       // If no companyCode was sent, fall back to the
//       // user's own CompanyCode -- but ONLY if it is a
//       // real, valid value. Secretaries often have a
//       // NULL CompanyCode because they oversee ALL
//       // companies, so in that case we deliberately
//       // leave filterCompanyCode as null (no filter).
//       // -----------------------------------------------
//       if (
//         filterCompanyCode === null &&
//         me.CompanyCode !== null &&
//         me.CompanyCode !== undefined &&
//         Number.isInteger(Number(me.CompanyCode)) &&
//         Number(me.CompanyCode) > 0
//       ) {
//         filterCompanyCode =
//           Number(me.CompanyCode);
//       }

//       // -----------------------------------------------
//       // Apply the filter only if we actually have one.
//       // No filter => full-access user sees purchases
//       // across ALL companies (old/expected behavior).
//       // -----------------------------------------------
//       if (filterCompanyCode !== null) {
//         request.input(
//           "FilterCompanyCode",
//           sql.Int,
//           filterCompanyCode
//         );

//         where += `
//           AND p.CompanyCode =
//               @FilterCompanyCode
//         `;

//         console.log(
//           "FULL ACCESS COMPANY FILTER:",
//           filterCompanyCode
//         );
//       } else {
//         console.log(
//           "FULL ACCESS: NO COMPANY FILTER (all companies)"
//         );
//       }

//       // -----------------------------------------------
//       // OPTIONAL MEMBER FILTER
//       // -----------------------------------------------
//       if (
//         memberNumber !== undefined &&
//         memberNumber !== null &&
//         String(memberNumber).trim() !== ""
//       ) {
//         request.input(
//           "FilterMemberNumber",
//           sql.VarChar(100),
//           String(memberNumber).trim()
//         );

//         where += `
//           AND EXISTS
//           (
//             SELECT 1
//             FROM tbl_Member m
//             WHERE
//               m.CompanyCode =
//                 p.CompanyCode

//               AND CONVERT(
//                 varchar(100),
//                 m.Number
//               ) =
//                 @FilterMemberNumber

//               AND CONVERT(
//                 varchar(100),
//                 m.MemberCode
//               ) =
//                 CONVERT(
//                   varchar(100),
//                   p.MemberCode
//                 )
//           )
//         `;

//         console.log(
//           "MEMBER FILTER:",
//           memberNumber
//         );
//       }
//     }

//     // =================================================
//     // MEMBER
//     // =================================================
//     else {

//       console.log(
//         "PURCHASE MODE: MEMBER"
//       );

//       // -----------------------------------------------
//       // CompanyCode
//       // -----------------------------------------------
//       if (
//         me.CompanyCode === null ||
//         me.CompanyCode === undefined
//       ) {
//         return res.json({
//           success: true,
//           role: me.UserTypeName,
//           fullAccess: false,
//           records: [],
//           summary: {
//             count: 0,
//             totalQty: 0,
//             totalAmount: 0,
//             avgFat: 0,
//           },
//         });
//       }

//       // -----------------------------------------------
//       // MemberNumber
//       // -----------------------------------------------
//       if (
//         me.MemberNumber === null ||
//         me.MemberNumber === undefined ||
//         String(me.MemberNumber).trim() === ""
//       ) {
//         return res.json({
//           success: true,
//           role: me.UserTypeName,
//           fullAccess: false,
//           records: [],
//           summary: {
//             count: 0,
//             totalQty: 0,
//             totalAmount: 0,
//             avgFat: 0,
//           },
//         });
//       }

//       request.input(
//         "UserCompanyCode",
//         sql.Int,
//         Number(me.CompanyCode)
//       );

//       request.input(
//         "UserMemberNumber",
//         sql.VarChar(100),
//         String(me.MemberNumber).trim()
//       );

//       where += `
//         AND p.CompanyCode =
//             @UserCompanyCode

//         AND EXISTS
//         (
//           SELECT 1
//           FROM tbl_Member m
//           WHERE
//             m.CompanyCode =
//               p.CompanyCode

//             AND CONVERT(
//               varchar(100),
//               m.Number
//             ) =
//               @UserMemberNumber

//             AND CONVERT(
//               varchar(100),
//               m.MemberCode
//             ) =
//               CONVERT(
//                 varchar(100),
//                 p.MemberCode
//               )
//         )
//       `;

//       console.log(
//         "MEMBER COMPANY:",
//         me.CompanyCode
//       );

//       console.log(
//         "MEMBER NUMBER:",
//         me.MemberNumber
//       );
//     }

//     // =================================================
//     // DATE FILTER
//     // =================================================

//     if (
//       fromDate &&
//       String(fromDate).trim() !== ""
//     ) {
//       request.input(
//         "FromDate",
//         sql.Date,
//         String(fromDate).trim()
//       );

//       where += `
//         AND p.PurchaseDate >= @FromDate
//       `;
//     }

//     if (
//       toDate &&
//       String(toDate).trim() !== ""
//     ) {
//       request.input(
//         "ToDate",
//         sql.Date,
//         String(toDate).trim()
//       );

//       where += `
//         AND p.PurchaseDate <
//             DATEADD(day, 1, @ToDate)
//       `;
//     }

//     // =================================================
//     // PURCHASE QUERY
//     // =================================================

//     console.log(
//       "FINAL WHERE:",
//       where
//     );

//     const result = await request.query(`
//       SELECT

//         p.Purchasenumber AS PurchaseID,

//         CONVERT(
//           varchar(10),
//           p.PurchaseDate,
//           103
//         ) AS PurchaseDate,

//         CASE
//           WHEN p.Shift = 'M'
//             THEN 'Morning'

//           WHEN p.Shift = 'E'
//             THEN 'Evening'

//           ELSE ISNULL(
//             p.Shift,
//             '-'
//           )
//         END AS ShiftName,

//         p.MemberCode,

//         m.Number AS MemberNumber,

//         m.MemberName,

//         p.Test AS FatPercent,

//         p.Snf AS SNFPercent,

//         p.Qty AS QtyLtr,

//         p.Rate,

//         p.Amount,

//         p.CompanyCode,

//         RTRIM(
//           ISNULL(
//             c.Header1,
//             ''
//           ) +
//           ISNULL(
//             c.Header2,
//             ''
//           )
//         ) AS CompanyName

//       FROM tbl_Purchase p

//       LEFT JOIN tbl_Member m
//         ON m.CompanyCode =
//            p.CompanyCode

//         AND CONVERT(
//           varchar(100),
//           m.MemberCode
//         ) =
//         CONVERT(
//           varchar(100),
//           p.MemberCode
//         )

//       OUTER APPLY
//       (
//         SELECT TOP 1
//           co.Header1,
//           co.Header2
//         FROM tbl_Company co
//         WHERE
//           co.CompanyCode =
//             p.CompanyCode
//         ORDER BY
//           co.EDNO
//       ) c

//       ${where}

//       ORDER BY
//         p.PurchaseDate DESC,

//         CASE
//           WHEN p.Shift = 'M'
//             THEN 1

//           WHEN p.Shift = 'E'
//             THEN 2

//           ELSE 3
//         END,

//         p.Purchasenumber DESC
//     `);

//     const records =
//       result.recordset || [];

//     console.log(
//       "PURCHASE RECORD COUNT:",
//       records.length
//     );

//     // =================================================
//     // SUMMARY
//     // =================================================

//     const summary =
//       records.reduce(
//         (acc, row) => {

//           acc.totalQty +=
//             Number(row.QtyLtr) || 0;

//           acc.totalAmount +=
//             Number(row.Amount) || 0;

//           acc.fatSum +=
//             Number(row.FatPercent) || 0;

//           acc.count += 1;

//           return acc;

//         },
//         {
//           totalQty: 0,
//           totalAmount: 0,
//           fatSum: 0,
//           count: 0,
//         }
//       );

//     // =================================================
//     // RESPONSE
//     // =================================================

//     return res.json({
//       success: true,

//       role: me.UserTypeName,

//       fullAccess,

//       records,

//       summary: {
//         count:
//           summary.count,

//         totalQty:
//           Number(
//             summary.totalQty.toFixed(2)
//           ),

//         totalAmount:
//           Number(
//             summary.totalAmount.toFixed(2)
//           ),

//         avgFat:
//           summary.count
//             ? Number(
//                 (
//                   summary.fatSum /
//                   summary.count
//                 ).toFixed(2)
//               )
//             : 0,
//       },
//     });

//   } catch (err) {

//     console.error(
//       "======================================"
//     );

//     console.error(
//       "PURCHASE API ERROR"
//     );

//     console.error(
//       "Message:",
//       err.message
//     );

//     console.error(
//       "Code:",
//       err.code
//     );

//     console.error(
//       "Number:",
//       err.number
//     );

//     console.error(
//       "======================================"
//     );

//     return res.status(500).json({
//       success: false,
//       message:
//         "Failed to load purchase records.",
//       error: err.message,
//     });
//   }
// });

// module.exports = router;
const express = require("express");
const router = express.Router();
const sql = require("mssql");
const { getPool } = require("../db");

// =====================================================
// FULL ACCESS ROLES
// Supports both SECRETARY and existing  spelling
// =====================================================
const FULL_ACCESS_ROLES = [
  "secretary",
  "admin",
  "manager",
];

// =====================================================
// GET PURCHASES
// =====================================================
router.get("/purchases", async (req, res) => {
  try {
    const {
      userCode,
      companyCode,
      memberNumber,
      fromDate,
      toDate,
    } = req.query;

    console.log("======================================");
    console.log("PURCHASE REQUEST");
    console.log({
      userCode,
      companyCode,
      memberNumber,
      fromDate,
      toDate,
    });
    console.log("======================================");

    // =================================================
    // VALIDATE USER CODE
    // =================================================

    if (!userCode) {
      return res.status(400).json({
        success: false,
        message: "userCode is required.",
      });
    }

    const numericUserCode = Number(userCode);

    if (
      !Number.isInteger(numericUserCode) ||
      numericUserCode <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid userCode.",
      });
    }

    const pool = await getPool();

    // =================================================
    // GET LOGGED-IN USER
    // =================================================

    const userResult = await pool
      .request()
      .input(
        "UserCode",
        sql.Int,
        numericUserCode
      )
      .query(`
        SELECT
          u.UserCode,
          u.UserTypeCode,
          u.UserName,
          u.CompanyCode,
          u.MemberNumber,
          t.UserTypeName
        FROM tbl_User u
        INNER JOIN tbl_UserType t
          ON u.UserTypeCode = t.UserTypeCode
        WHERE u.UserCode = @UserCode
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const me = userResult.recordset[0];

    // =================================================
    // NORMALIZE ROLE
    // =================================================

    const originalRole = String(
      me.UserTypeName || ""
    ).trim();

    const role = originalRole.toLowerCase();

    const fullAccess =
      FULL_ACCESS_ROLES.includes(role);

    console.log("======================================");
    console.log("LOGIN USER");
    console.log("UserCode:", me.UserCode);
    console.log("UserName:", me.UserName);
    console.log("Original Role:", originalRole);
    console.log("Normalized Role:", role);
    console.log("CompanyCode:", me.CompanyCode);
    console.log("MemberNumber:", me.MemberNumber);
    console.log("Full Access:", fullAccess);
    console.log("======================================");

    // =================================================
    // BUILD PURCHASE QUERY
    // =================================================

    let where = `
      WHERE 1 = 1
    `;

    const request = pool.request();

    // =================================================
    // FULL ACCESS
    // SECRETARY /  ADMIN / MANAGER
    // =================================================

    if (fullAccess) {
      console.log(
        "PURCHASE MODE: FULL ACCESS"
      );

      // -----------------------------------------------
      // COMPANY FILTER
      // -----------------------------------------------

      let filterCompanyCode = null;

      if (
        companyCode !== undefined &&
        companyCode !== null &&
        String(companyCode).trim() !== ""
      ) {
        const numericCompanyCode = Number(
          companyCode
        );

        if (
          Number.isInteger(numericCompanyCode) &&
          numericCompanyCode > 0
        ) {
          filterCompanyCode =
            numericCompanyCode;
        }
      }

      // -----------------------------------------------
      // MEMBER FILTER
      // -----------------------------------------------

      let filterMemberNumber = null;

      if (
        memberNumber !== undefined &&
        memberNumber !== null &&
        String(memberNumber).trim() !== ""
      ) {
        filterMemberNumber =
          String(memberNumber).trim();
      }

      // -----------------------------------------------
      // COMPANY CONDITION
      // -----------------------------------------------

      if (filterCompanyCode !== null) {
        where += `
          AND p.CompanyCode = @FilterCompanyCode
        `;

        request.input(
          "FilterCompanyCode",
          sql.Int,
          filterCompanyCode
        );
      }

      // -----------------------------------------------
      // MEMBER CONDITION
      // -----------------------------------------------

      if (filterMemberNumber !== null) {
        where += `
          AND RTRIM(RTRIM(
            CAST(p.MemberNumber AS VARCHAR(50))
          )) = @FilterMemberNumber
        `;

        request.input(
          "FilterMemberNumber",
          sql.VarChar(50),
          filterMemberNumber
        );
      }

      console.log(
        "FULL ACCESS COMPANY FILTER:",
        filterCompanyCode
      );

      console.log(
        "FULL ACCESS MEMBER FILTER:",
        filterMemberNumber
      );
    }

    // =================================================
    // MEMBER LOGIN
    // =================================================

    else {
      console.log(
        "PURCHASE MODE: MEMBER ACCESS"
      );

      // -----------------------------------------------
      // MEMBER MUST USE HIS OWN COMPANY
      // -----------------------------------------------

      if (
        me.CompanyCode === null ||
        me.CompanyCode === undefined ||
        Number(me.CompanyCode) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Your account does not have a valid CompanyCode.",
        });
      }

      // -----------------------------------------------
      // MEMBER MUST HAVE MEMBER NUMBER
      // -----------------------------------------------

      if (
        me.MemberNumber === null ||
        me.MemberNumber === undefined ||
        String(me.MemberNumber).trim() === ""
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Your account does not have a valid MemberNumber.",
        });
      }

      where += `
        AND p.CompanyCode = @UserCompanyCode
        AND RTRIM(RTRIM(
          CAST(p.MemberNumber AS VARCHAR(50))
        )) = @UserMemberNumber
      `;

      request.input(
        "UserCompanyCode",
        sql.Int,
        Number(me.CompanyCode)
      );

      request.input(
        "UserMemberNumber",
        sql.VarChar(50),
        String(me.MemberNumber).trim()
      );
    }

    // =================================================
    // DATE FILTER
    // =================================================

    if (
      fromDate !== undefined &&
      fromDate !== null &&
      String(fromDate).trim() !== ""
    ) {
      where += `
        AND CAST(p.PurchaseDate AS DATE)
        >= @FromDate
      `;

      request.input(
        "FromDate",
        sql.Date,
        String(fromDate).trim()
      );
    }

    if (
      toDate !== undefined &&
      toDate !== null &&
      String(toDate).trim() !== ""
    ) {
      where += `
        AND CAST(p.PurchaseDate AS DATE)
        <= @ToDate
      `;

      request.input(
        "ToDate",
        sql.Date,
        String(toDate).trim()
      );
    }

    // =================================================
    // PURCHASE QUERY
    // =================================================

    const purchaseQuery = `
      SELECT
        p.CompanyCode,
        p.SubCentreCode,
        p.Purchasenumber,
        p.PurchaseDate,
        p.Milk,
        p.Shift,
        p.MemberCode,
        p.Sample,
        p.Qty,
        p.Test,
        p.Lr,
        p.Snf,
        p.Rate,
        p.Rating,
        p.Amount,
        p.countno,
        p.C_Date,
        p.C_User,
        p.C_Node,
        p.E_Date,
        p.E_User,
        p.E_Node,
        p.EDno,
        p.Export,
        p.Number,
        p.OnLine
      FROM tbl_Purchase p
      ${where}
      ORDER BY
        p.PurchaseDate DESC,
        p.Purchasenumber DESC
    `;

    console.log("======================================");
    console.log("PURCHASE SQL");
    console.log(purchaseQuery);
    console.log("======================================");

    const result = await request.query(
      purchaseQuery
    );

    const records = result.recordset || [];

    console.log(
      "PURCHASE RECORD COUNT:",
      records.length
    );

    // =================================================
    // SUMMARY
    // =================================================

    let totalQty = 0;
    let totalAmount = 0;
    let totalFat = 0;
    let fatCount = 0;

    records.forEach((row) => {
      const qty = Number(row.Qty);

      const amount = Number(row.Amount);

      const fat = Number(row.Test);

      if (Number.isFinite(qty)) {
        totalQty += qty;
      }

      if (Number.isFinite(amount)) {
        totalAmount += amount;
      }

      if (Number.isFinite(fat)) {
        totalFat += fat;
        fatCount++;
      }
    });

    const avgFat =
      fatCount > 0
        ? totalFat / fatCount
        : 0;

    const summary = {
      count: records.length,
      totalQty,
      totalAmount,
      avgFat,
    };

    // =================================================
    // RESPONSE
    // =================================================

    return res.json({
      success: true,

      // Keep original database role for debugging
      role: originalRole,

      // This MUST be true for      fullAccess,

      records,

      summary,
    });
  } catch (error) {
    console.error(
      "======================================"
    );

    console.error(
      "PURCHASE API ERROR"
    );

    console.error(error);

    console.error(
      "======================================"
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to load purchase data.",
    });
  }
});

module.exports = router;