// // const express = require("express");
// // const router = express.Router();
// // const sql = require("mssql");
// // const { getPool } = require("../db");

// // const FULL_ACCESS_ROLES = ["secretary", "admin", "manager"];

// // // =====================
// // // GET PURCHASES (dashboard data)
// // // Query params:
// // //   userCode   (required) - the logged-in user's UserCode, used to
// // //                            look up their real role/company/member
// // //                            number server-side (never trust a role
// // //                            claim sent from the client).
// // //   companyCode, memberNumber, fromDate, toDate (optional filters,
// // //                            only honoured for full-access roles;
// // //                            Member users are always locked to their
// // //                            own CompanyCode + MemberNumber).
// // // =====================
// // router.get("/purchases", async (req, res) => {
// //   try {
// //     const { userCode, companyCode, memberCode, fromDate, toDate } = req.query;

// //     if (!userCode) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "userCode is required.",
// //       });
// //     }

// //     const pool = await getPool();

// //     // 1) Look up the requesting user's real role/company/member number.
// //     const userResult = await pool
// //       .request()
// //       .input("UserCode", sql.Int, userCode)
// //       .query(`
// //         SELECT
// //           u.UserCode,
// //           u.CompanyCode,
// //           u.MemberCode,
// //           t.UserTypeName
// //         FROM tbl_User u
// //         INNER JOIN tbl_UserType t ON u.UserTypeCode = t.UserTypeCode
// //         WHERE u.UserCode = @UserCode
// //       `);

// //     if (userResult.recordset.length === 0) {
// //       return res.status(404).json({
// //         success: false,
// //         message: "User not found.",
// //       });
// //     }

// //     const me = userResult.recordset[0];
// //     const role = String(me.UserTypeName || "").toLowerCase();
// //     const fullAccess = FULL_ACCESS_ROLES.includes(role);

// //     // 2) Build the purchase query.
// //     const request = pool.request();
// //     let where = "WHERE 1=1";

// //     if (fullAccess) {
// //       // Secretary/Admin/Manager: see everything, with optional filters.
// //       if (companyCode) {
// //         request.input("CompanyCode", sql.Int, companyCode);
// //         where += " AND p.CompanyCode = @CompanyCode";
// //       }
// //       if (memberNumber) {
// //         request.input("MemberCode", sql.VarChar, memberCode);
// //         where += " AND p.MemberCode = @MemberCode";
// //       }
// //     } else {
// //       // Member: locked to their own company + member number, no matter
// //       // what filters were passed in the querystring.
// //       request.input("CompanyCode", sql.Int, me.CompanyCode);
// //       request.input("MemberCode", sql.VarChar, me.MemberCode);
// //       where += " AND p.CompanyCode = @CompanyCode AND p.MemberCode = @MemberCode";
// //     }

// //     if (fromDate) {
// //       request.input("FromDate", sql.Date, fromDate);
// //       where += " AND p.PurchaseDate >= @FromDate";
// //     }
// //     if (toDate) {
// //       request.input("ToDate", sql.Date, toDate);
// //       where += " AND p.PurchaseDate <= @ToDate";
// //     }

// //     const result = await request.query(`
// //       SELECT
// //     p.Purchasenumber,
// //     p.PurchaseDate,
// //     p.Shift,
// //     p.MemberCode,
// //     p.Test,
// //     p.Snf,
// //     p.Qty,
// //     p.Rate,
// //     p.Amount,
// //     p.CompanyCode,
// //     RTRIM(ISNULL(c.Header1,'') + ISNULL(c.Header2,'')) AS CompanyName
// //   FROM tbl_Purchase p
// //   INNER JOIN tbl_Company c
// //     ON p.CompanyCode = c.CompanyCode
// //   ${where}
// //   ORDER BY p.PurchaseDate DESC, p.Purchasenumber DESC
// //       `);

// //     const records = result.recordset;

// //     const summary = records.reduce(
// //       (acc, r) => {
// //         acc.totalQty += Number(r.QtyLtr) || 0;
// //         acc.totalAmount += Number(r.Amount) || 0;
// //         acc.fatSum += Number(r.FatPercent) || 0;
// //         acc.count += 1;
// //         return acc;
// //       },
// //       { totalQty: 0, totalAmount: 0, fatSum: 0, count: 0 }
// //     );

// //     res.json({
// //       success: true,
// //       role: me.UserTypeName,
// //       fullAccess,
// //       records,
// //       summary: {
// //         count: summary.count,
// //         totalQty: Number(summary.totalQty.toFixed(2)),
// //         totalAmount: Number(summary.totalAmount.toFixed(2)),
// //         avgFat: summary.count
// //           ? Number((summary.fatSum / summary.count).toFixed(2))
// //           : 0,
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

// // module.exports = router;
// const express = require("express");
// const router = express.Router();
// const sql = require("mssql");
// const { getPool } = require("../db");

// const FULL_ACCESS_ROLES = ["secretary", "admin", "manager"];

// // =====================
// // GET PURCHASES (dashboard data)
// // Query params:
// //   userCode   (required) - the logged-in user's UserCode, used to
// //                            look up their real role/company/member
// //                            number server-side (never trust a role
// //                            claim sent from the client).
// //   companyCode, memberNumber, fromDate, toDate (optional filters,
// //                            only honoured for full-access roles;
// //                            Member users are always locked to their
// //                            own CompanyCode + MemberNumber).
// // =====================
// router.get("/purchases", async (req, res) => {
//   try {
//     const { userCode, companyCode, memberNumber, fromDate, toDate } = req.query;

//     if (!userCode) {
//       return res.status(400).json({
//         success: false,
//         message: "userCode is required.",
//       });
//     }

//     const pool = await getPool();

//     // 1) Look up the requesting user's real role/company/member number.
//     const userResult = await pool
//       .request()
//       .input("UserCode", sql.Int, userCode)
//       .query(`
//         SELECT
//           u.UserCode,
//           u.CompanyCode,
//           u.MemberNumber,
//           t.UserTypeName
//         FROM tbl_User u
//         INNER JOIN tbl_UserType t ON u.UserTypeCode = t.UserTypeCode
//         WHERE u.UserCode = @UserCode
//       `);

//     if (userResult.recordset.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found.",
//       });
//     }

//     const me = userResult.recordset[0];
//     const role = String(me.UserTypeName || "").toLowerCase();
//     const fullAccess = FULL_ACCESS_ROLES.includes(role);

//     // 2) Build the purchase query.
//     const request = pool.request();
//     let where = "WHERE 1=1";

//     if (fullAccess) {
//       // Secretary/Admin/Manager: see everything, with optional filters.
//       if (companyCode) {
//         request.input("CompanyCode", sql.Int, companyCode);
//         where += " AND p.CompanyCode = @CompanyCode";
//       }
//       if (memberNumber) {
//         // tbl_Purchase.MemberCode is bigint, tbl_User.MemberNumber is
//         // varchar, so compare as strings to avoid a conversion error.
//         request.input("MemberNumber", sql.VarChar, memberNumber);
//         where += " AND CONVERT(varchar(50), p.MemberCode) = @MemberNumber";
//       }
//     } else {
//       // Member: locked to their own company + member number, no matter
//       // what filters were passed in the querystring.
//       request.input("CompanyCode", sql.Int, me.CompanyCode);
//       request.input("MemberNumber", sql.VarChar, me.MemberNumber);
//       where +=
//         " AND p.CompanyCode = @CompanyCode AND CONVERT(varchar(50), p.MemberCode) = @MemberNumber";
//     }

//     if (fromDate) {
//       request.input("FromDate", sql.Date, fromDate);
//       where += " AND p.PurchaseDate >= @FromDate";
//     }
//     if (toDate) {
//       request.input("ToDate", sql.Date, toDate);
//       where += " AND p.PurchaseDate <= @ToDate";
//     }

//     const result = await request.query(`
//       SELECT
//     p.Purchasenumber AS PurchaseID,
//     CONVERT(varchar(10), p.PurchaseDate, 103) AS PurchaseDate,
//     CASE p.Shift
//         WHEN 'M' THEN 'Morning'
//         WHEN 'E' THEN 'Evening'
//         ELSE p.Shift
//     END AS ShiftName,
//     p.MemberCode AS MemberNumber,
//     p.Test AS FatPercent,
//     p.Snf AS SNFPercent,
//     p.Qty AS QtyLtr,
//     p.Rate,
//     p.Amount,
//     p.CompanyCode,
//     RTRIM(ISNULL(c.Header1,'') + ISNULL(c.Header2,'')) AS CompanyName
// FROM tbl_Purchase p
// INNER JOIN tbl_Company c
// ON p.CompanyCode=c.CompanyCode
// ${where}
// ORDER BY p.PurchaseDate DESC,p.Purchasenumber DESC
//     `);



//     const records = result.recordset;

//     const summary = records.reduce(
//       (acc, r) => {
//         acc.totalQty += Number(r.QtyLtr) || 0;
//         acc.totalAmount += Number(r.Amount) || 0;
//         acc.fatSum += Number(r.FatPercent) || 0;
//         acc.count += 1;
//         return acc;
//       },
//       { totalQty: 0, totalAmount: 0, fatSum: 0, count: 0 }
//     );

//     res.json({
//       success: true,
//       role: me.UserTypeName,
//       fullAccess,
//       records,
//       summary: {
//         count: summary.count,
//         totalQty: Number(summary.totalQty.toFixed(2)),
//         totalAmount: Number(summary.totalAmount.toFixed(2)),
//         avgFat: summary.count
//           ? Number((summary.fatSum / summary.count).toFixed(2))
//           : 0,
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

// const express = require("express");
// const router = express.Router();
// const sql = require("mssql");
// const { getPool } = require("../db");

// const FULL_ACCESS_ROLES = ["secretary", "admin", "manager"];

// // =====================
// // GET PURCHASES (dashboard data)
// // Query params:
// //   userCode   (required) - the logged-in user's UserCode, used to
// //                            look up their real role/company/member
// //                            number server-side (never trust a role
// //                            claim sent from the client).
// //   companyCode, memberNumber, fromDate, toDate (optional filters,
// //                            only honoured for full-access roles;
// //                            Member users are always locked to their
// //                            own CompanyCode + MemberNumber).
// // =====================
// router.get("/purchases", async (req, res) => {
//   try {
//     const { userCode, companyCode, memberCode, fromDate, toDate } = req.query;

//     if (!userCode) {
//       return res.status(400).json({
//         success: false,
//         message: "userCode is required.",
//       });
//     }

//     const pool = await getPool();

//     // 1) Look up the requesting user's real role/company/member number.
//     const userResult = await pool
//       .request()
//       .input("UserCode", sql.Int, userCode)
//       .query(`
//         SELECT
//           u.UserCode,
//           u.CompanyCode,
//           u.MemberCode,
//           t.UserTypeName
//         FROM tbl_User u
//         INNER JOIN tbl_UserType t ON u.UserTypeCode = t.UserTypeCode
//         WHERE u.UserCode = @UserCode
//       `);

//     if (userResult.recordset.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found.",
//       });
//     }

//     const me = userResult.recordset[0];
//     const role = String(me.UserTypeName || "").toLowerCase();
//     const fullAccess = FULL_ACCESS_ROLES.includes(role);

//     // 2) Build the purchase query.
//     const request = pool.request();
//     let where = "WHERE 1=1";

//     if (fullAccess) {
//       // Secretary/Admin/Manager: see everything, with optional filters.
//       if (companyCode) {
//         request.input("CompanyCode", sql.Int, companyCode);
//         where += " AND p.CompanyCode = @CompanyCode";
//       }
//       if (memberNumber) {
//         request.input("MemberCode", sql.VarChar, memberCode);
//         where += " AND p.MemberCode = @MemberCode";
//       }
//     } else {
//       // Member: locked to their own company + member number, no matter
//       // what filters were passed in the querystring.
//       request.input("CompanyCode", sql.Int, me.CompanyCode);
//       request.input("MemberCode", sql.VarChar, me.MemberCode);
//       where += " AND p.CompanyCode = @CompanyCode AND p.MemberCode = @MemberCode";
//     }

//     if (fromDate) {
//       request.input("FromDate", sql.Date, fromDate);
//       where += " AND p.PurchaseDate >= @FromDate";
//     }
//     if (toDate) {
//       request.input("ToDate", sql.Date, toDate);
//       where += " AND p.PurchaseDate <= @ToDate";
//     }

//     const result = await request.query(`
//       SELECT
//     p.Purchasenumber,
//     p.PurchaseDate,
//     p.Shift,
//     p.MemberCode,
//     p.Test,
//     p.Snf,
//     p.Qty,
//     p.Rate,
//     p.Amount,
//     p.CompanyCode,
//     RTRIM(ISNULL(c.Header1,'') + ISNULL(c.Header2,'')) AS CompanyName
//   FROM tbl_Purchase p
//   INNER JOIN tbl_Company c
//     ON p.CompanyCode = c.CompanyCode
//   ${where}
//   ORDER BY p.PurchaseDate DESC, p.Purchasenumber DESC
//       `);

//     const records = result.recordset;

//     const summary = records.reduce(
//       (acc, r) => {
//         acc.totalQty += Number(r.QtyLtr) || 0;
//         acc.totalAmount += Number(r.Amount) || 0;
//         acc.fatSum += Number(r.FatPercent) || 0;
//         acc.count += 1;
//         return acc;
//       },
//       { totalQty: 0, totalAmount: 0, fatSum: 0, count: 0 }
//     );

//     res.json({
//       success: true,
//       role: me.UserTypeName,
//       fullAccess,
//       records,
//       summary: {
//         count: summary.count,
//         totalQty: Number(summary.totalQty.toFixed(2)),
//         totalAmount: Number(summary.totalAmount.toFixed(2)),
//         avgFat: summary.count
//           ? Number((summary.fatSum / summary.count).toFixed(2))
//           : 0,
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

const FULL_ACCESS_ROLES = ["secretary", "admin", "manager"];

// =====================
// GET PURCHASES (dashboard data)
// Query params:
//   userCode   (required) - the logged-in user's UserCode, used to
//                            look up their real role/company/member
//                            number server-side (never trust a role
//                            claim sent from the client).
//   companyCode, memberNumber, fromDate, toDate (optional filters,
//                            only honoured for full-access roles;
//                            Member users are always locked to their
//                            own CompanyCode + MemberNumber).
// =====================
router.get("/purchases", async (req, res) => {
  try {
    const { userCode, companyCode, memberNumber, fromDate, toDate } = req.query;

    if (!userCode) {
      return res.status(400).json({
        success: false,
        message: "userCode is required.",
      });
    }

    const pool = await getPool();

    // 1) Look up the requesting user's real role/company/member number.
    const userResult = await pool
      .request()
      .input("UserCode", sql.Int, userCode)
      .query(`
        SELECT
          u.UserCode,
          u.CompanyCode,
          u.MemberNumber,
          t.UserTypeName
        FROM tbl_User u
        INNER JOIN tbl_UserType t ON u.UserTypeCode = t.UserTypeCode
        WHERE u.UserCode = @UserCode
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const me = userResult.recordset[0];
    const role = String(me.UserTypeName || "").toLowerCase();
    const fullAccess = FULL_ACCESS_ROLES.includes(role);

    // 2) Build the purchase query.
    const request = pool.request();
    let where = "WHERE 1=1";

    if (fullAccess) {
      // Secretary/Admin/Manager: see everything, with optional filters.
      if (companyCode) {
        request.input("CompanyCode", sql.Int, companyCode);
        where += " AND p.CompanyCode = @CompanyCode";
      }
      if (memberNumber) {
        // tbl_Purchase.MemberCode is bigint, tbl_User.MemberNumber is
        // varchar, so compare as strings to avoid a conversion error.
        request.input("MemberNumber", sql.VarChar, memberNumber);
        where += " AND CONVERT(varchar(50), p.MemberCode) = @MemberNumber";
      }
    } else {
      // Member: locked to their own company + member number, no matter
      // what filters were passed in the querystring.
      request.input("CompanyCode", sql.Int, me.CompanyCode);
      request.input("MemberNumber", sql.VarChar, me.MemberNumber);
      where +=
        " AND p.CompanyCode = @CompanyCode AND CONVERT(varchar(50), p.MemberCode) = @MemberNumber";
    }

    if (fromDate) {
      request.input("FromDate", sql.Date, fromDate);
      where += " AND p.PurchaseDate >= @FromDate";
    }
    if (toDate) {
      request.input("ToDate", sql.Date, toDate);
      where += " AND p.PurchaseDate <= @ToDate";
    }

    const result = await request.query(`
      select purchasenumber as PurchaseID,CONVERT(varchar(10), PurchaseDate, 103) AS PurchaseDate,
case when shift='M' then 'Morning' else 'Evening' end Shift,Number as MemberNumber,Test as FatPercent,
Snf as SNFPercent,Qty as QtyLtr,Rate,Amount,tbl_Purchase.CompanyCode,RTRIM(ISNULL(Header1,'') + ISNULL(Header2,'')) AS CompanyName
from tbl_Purchase left outer join tbl_Company on tbl_Purchase.companycode=tbl_Company.CompanyCode 
where tbl_Purchase.CompanyCode=8 and tbl_Purchase.PurchaseDate='2026-01-07' order by tbl_Purchase.purchasedate,shift desc,number
    `);



    const records = result.recordset;

    const summary = records.reduce(
      (acc, r) => {
        acc.totalQty += Number(r.QtyLtr) || 0;
        acc.totalAmount += Number(r.Amount) || 0;
        acc.fatSum += Number(r.FatPercent) || 0;
        acc.count += 1;
        return acc;
      },
      { totalQty: 0, totalAmount: 0, fatSum: 0, count: 0 }
    );

    res.json({
      success: true,
      role: me.UserTypeName,
      fullAccess,
      records,
      summary: {
        count: summary.count,
        totalQty: Number(summary.totalQty.toFixed(2)),
        totalAmount: Number(summary.totalAmount.toFixed(2)),
        avgFat: summary.count
          ? Number((summary.fatSum / summary.count).toFixed(2))
          : 0,
      },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;