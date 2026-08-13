const express = require("express");
const router = express.Router();
const sql = require("mssql");
const { getPool } = require("../db");

const FULL_ACCESS_ROLES = [
  "secretary",
  "admin",
  "manager",
];

// =====================================================
// GET PURCHASES
// GET /api/purchases
//
// MAPPING:
//
// tbl_User.MemberNumber
//          ↓
// tbl_Member.Number
//          ↓
// tbl_Member.MemberCode
//          ↓
// tbl_Purchase.MemberCode
//
// CompanyCode must also match.
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

    console.log("");
    console.log("==============================================");
    console.log("PURCHASE REQUEST");
    console.log("==============================================");
    console.log("userCode:", userCode);
    console.log("companyCode:", companyCode);
    console.log("memberNumber:", memberNumber);
    console.log("fromDate:", fromDate);
    console.log("toDate:", toDate);
    console.log("==============================================");

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
          u.CompanyCode,
          u.MemberNumber,
          u.UserName,
          t.UserTypeName
        FROM tbl_User u
        INNER JOIN tbl_UserType t
          ON u.UserTypeCode = t.UserTypeCode
        WHERE u.UserCode = @UserCode
      `);

    // =================================================
    // USER NOT FOUND
    // =================================================
    if (
      userResult.recordset.length === 0
    ) {
      console.log(
        "PURCHASE: USER NOT FOUND:",
        numericUserCode
      );

      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const user = userResult.recordset[0];

    const role = String(
      user.UserTypeName || ""
    )
      .trim()
      .toLowerCase();

    const fullAccess =
      FULL_ACCESS_ROLES.includes(role);

    console.log("");
    console.log("==============================================");
    console.log("RESOLVED USER");
    console.log("==============================================");
    console.log("UserCode:", user.UserCode);
    console.log("UserName:", user.UserName);
    console.log("Role:", role);
    console.log("Full Access:", fullAccess);
    console.log("CompanyCode:", user.CompanyCode);
    console.log(
      "MemberNumber:",
      user.MemberNumber
    );
    console.log("==============================================");

    // =================================================
    // BUILD SQL REQUEST
    // =================================================
    const request = pool.request();

    let where = "WHERE 1 = 1";

    // =================================================
    // FULL ACCESS USERS
    //
    // Secretary / Admin / Manager
    // =================================================
    if (fullAccess) {

      // -------------------------------------------------
      // COMPANY FILTER
      // -------------------------------------------------
      if (
        companyCode !== undefined &&
        companyCode !== null &&
        String(companyCode).trim() !== ""
      ) {
        const rawCompanyCode =
          String(companyCode).trim();

        // Accept:
        // 1
        // 1 - Society Name
        // 1 Society Name
        const match =
          rawCompanyCode.match(/^\d+/);

        if (match) {
          const numericCompanyCode =
            Number(match[0]);

          request.input(
            "FilterCompanyCode",
            sql.Int,
            numericCompanyCode
          );

          where += `
            AND p.CompanyCode = @FilterCompanyCode
          `;

          console.log(
            "Company filter:",
            numericCompanyCode
          );
        }
      }

      // -------------------------------------------------
      // MEMBER NUMBER FILTER
      //
      // IMPORTANT:
      //
      // frontend memberNumber
      //       ↓
      // tbl_Member.Number
      //       ↓
      // tbl_Member.MemberCode
      //       ↓
      // tbl_Purchase.MemberCode
      // -------------------------------------------------
      if (
        memberNumber !== undefined &&
        memberNumber !== null &&
        String(memberNumber).trim() !== ""
      ) {
        const enteredMemberNumber =
          String(memberNumber).trim();

        request.input(
          "FilterMemberNumber",
          sql.VarChar(100),
          enteredMemberNumber
        );

        where += `
          AND EXISTS
          (
            SELECT 1
            FROM tbl_Member m
            WHERE
              m.CompanyCode = p.CompanyCode
              AND CONVERT(varchar(100), m.Number)
                  = @FilterMemberNumber
              AND CONVERT(varchar(100), m.MemberCode)
                  = CONVERT(varchar(100), p.MemberCode)
          )
        `;

        console.log(
          "Member number filter:",
          enteredMemberNumber
        );
      }
    }

    // =================================================
    // MEMBER USER
    //
    // tbl_User.MemberNumber
    //        =
    // tbl_Member.Number
    //
    // tbl_Member.MemberCode
    //        =
    // tbl_Purchase.MemberCode
    // =================================================
    else {

      // -------------------------------------------------
      // COMPANY CODE REQUIRED
      // -------------------------------------------------
      if (
        user.CompanyCode === undefined ||
        user.CompanyCode === null
      ) {
        console.log(
          "PURCHASE: MEMBER USER HAS NO CompanyCode"
        );

        return res.json({
          success: true,
          role: user.UserTypeName,
          fullAccess: false,
          records: [],
          summary: {
            count: 0,
            totalQty: 0,
            totalAmount: 0,
            avgFat: 0,
          },
        });
      }

      // -------------------------------------------------
      // MEMBER NUMBER REQUIRED
      // -------------------------------------------------
      if (
        user.MemberNumber === undefined ||
        user.MemberNumber === null ||
        String(user.MemberNumber).trim() === ""
      ) {
        console.log(
          "PURCHASE: MEMBER USER HAS NO MemberNumber"
        );

        return res.json({
          success: true,
          role: user.UserTypeName,
          fullAccess: false,
          records: [],
          summary: {
            count: 0,
            totalQty: 0,
            totalAmount: 0,
            avgFat: 0,
          },
        });
      }

      request.input(
        "UserCompanyCode",
        sql.Int,
        Number(user.CompanyCode)
      );

      request.input(
        "UserMemberNumber",
        sql.VarChar(100),
        String(user.MemberNumber).trim()
      );

      where += `
        AND p.CompanyCode = @UserCompanyCode

        AND EXISTS
        (
          SELECT 1
          FROM tbl_Member m
          WHERE
            m.CompanyCode = p.CompanyCode

            AND CONVERT(varchar(100), m.Number)
                = @UserMemberNumber

            AND CONVERT(varchar(100), m.MemberCode)
                = CONVERT(varchar(100), p.MemberCode)
        )
      `;

      console.log(
        "Member CompanyCode:",
        user.CompanyCode
      );

      console.log(
        "Member Number:",
        user.MemberNumber
      );
    }

    // =================================================
    // FROM DATE
    // =================================================
    if (
      fromDate &&
      String(fromDate).trim() !== ""
    ) {
      request.input(
        "FromDate",
        sql.Date,
        String(fromDate).trim()
      );

      where += `
        AND p.PurchaseDate >= @FromDate
      `;
    }

    // =================================================
    // TO DATE
    // =================================================
    if (
      toDate &&
      String(toDate).trim() !== ""
    ) {
      request.input(
        "ToDate",
        sql.Date,
        String(toDate).trim()
      );

      where += `
        AND p.PurchaseDate < DATEADD(day, 1, @ToDate)
      `;
    }

    // =================================================
    // FINAL WHERE
    // =================================================
    console.log("");
    console.log("==============================================");
    console.log("FINAL PURCHASE WHERE");
    console.log("==============================================");
    console.log(where);
    console.log("==============================================");

    // =================================================
    // GET PURCHASE RECORDS
    // =================================================
    const result = await request.query(`
      SELECT

        p.Purchasenumber AS PurchaseID,

        CONVERT(
          varchar(10),
          p.PurchaseDate,
          103
        ) AS PurchaseDate,

        CASE
          WHEN p.Shift = 'M'
            THEN 'Morning'

          WHEN p.Shift = 'E'
            THEN 'Evening'

          ELSE ISNULL(p.Shift, '-')
        END AS ShiftName,

        p.MemberCode AS MemberNumber,

        p.Test AS FatPercent,

        p.Snf AS SNFPercent,

        p.Qty AS QtyLtr,

        p.Rate,

        p.Amount,

        p.CompanyCode,

        RTRIM(
          ISNULL(c.Header1, '') +
          ISNULL(c.Header2, '')
        ) AS CompanyName,

        m.Number AS ActualMemberNumber,

        m.MemberCode AS ActualMemberCode,

        m.MemberName,

        m.MobileNo

      FROM tbl_Purchase p

      LEFT JOIN tbl_Member m
        ON m.CompanyCode = p.CompanyCode
        AND CONVERT(varchar(100), m.MemberCode)
            = CONVERT(varchar(100), p.MemberCode)

      OUTER APPLY
      (
        SELECT TOP 1
          co.Header1,
          co.Header2
        FROM tbl_Company co
        WHERE co.CompanyCode = p.CompanyCode
        ORDER BY co.EDNO
      ) c

      ${where}

      ORDER BY
        p.PurchaseDate DESC,

        CASE
          WHEN p.Shift = 'M'
            THEN 1

          WHEN p.Shift = 'E'
            THEN 2

          ELSE 3
        END,

        p.Purchasenumber DESC
    `);

    // =================================================
    // RECORDS
    // =================================================
    const records =
      result.recordset || [];

    console.log("");
    console.log("==============================================");
    console.log(
      "PURCHASE ROWS RETURNED:",
      records.length
    );
    console.log("==============================================");

    // Show first few rows for debugging
    if (records.length > 0) {
      console.log(
        "FIRST PURCHASE:",
        records[0]
      );
    }

    // =================================================
    // SUMMARY
    // =================================================
    const summary = records.reduce(
      (acc, row) => {

        acc.totalQty +=
          Number(row.QtyLtr) || 0;

        acc.totalAmount +=
          Number(row.Amount) || 0;

        acc.fatSum +=
          Number(row.FatPercent) || 0;

        acc.count += 1;

        return acc;

      },
      {
        totalQty: 0,
        totalAmount: 0,
        fatSum: 0,
        count: 0,
      }
    );

    // =================================================
    // RESPONSE
    // =================================================
    return res.json({
      success: true,

      role: user.UserTypeName,

      fullAccess,

      records,

      summary: {
        count: summary.count,

        totalQty: Number(
          summary.totalQty.toFixed(2)
        ),

        totalAmount: Number(
          summary.totalAmount.toFixed(2)
        ),

        avgFat: summary.count
          ? Number(
              (
                summary.fatSum /
                summary.count
              ).toFixed(2)
            )
          : 0,
      },
    });

  } catch (err) {

    console.error("");
    console.error("==============================================");
    console.error("PURCHASE API ERROR");
    console.error("==============================================");
    console.error("Message:", err.message);
    console.error("Code:", err.code);
    console.error("Number:", err.number);
    console.error("State:", err.state);
    console.error("Full Error:", err);
    console.error("==============================================");

    return res.status(500).json({
      success: false,
      message: "Failed to load purchase records.",
      error: err.message,
      code: err.code || null,
      number: err.number || null,
    });
  }
});

module.exports = router;