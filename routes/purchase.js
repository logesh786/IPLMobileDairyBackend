const express = require("express");
const router = express.Router();
const sql = require("mssql");
const { getPool } = require("../db");

// =====================================================
// ONLY ADMIN / MANAGER HAVE FULL ACCESS
// =====================================================

const FULL_ACCESS_ROLES = [
  "admin",
  "manager",
];

// =====================================================
// NORMALIZE ROLE
// =====================================================

const normalizeRole = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

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

    // =================================================
    // VALIDATE USER CODE
    // =================================================

    if (!userCode || String(userCode).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "userCode is required.",
      });
    }

    const pool = await getPool();

    // =================================================
    // GET LOGGED-IN USER
    // =================================================

    const userResult = await pool
      .request()
      .input("UserCode", sql.Int, Number(userCode))
      .query(`
        SELECT
          u.UserCode,
          u.UserTypeCode,
          u.CompanyCode,
          u.MemberNumber,
          u.UserName,

          t.UserTypeName,

          RTRIM(
            ISNULL(c.Header1, '') +
            ISNULL(c.Header2, '')
          ) AS CompanyName

        FROM tbl_User u

        INNER JOIN tbl_UserType t
          ON u.UserTypeCode = t.UserTypeCode

        OUTER APPLY
        (
          SELECT TOP 1
            co.Header1,
            co.Header2
          FROM tbl_Company co
          WHERE co.CompanyCode = u.CompanyCode
          ORDER BY co.EDNO
        ) c

        WHERE u.UserCode = @UserCode
      `);

    // =================================================
    // USER NOT FOUND
    // =================================================

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const me = userResult.recordset[0];

    // =================================================
    // ROLE
    // =================================================

    const role = normalizeRole(me.UserTypeName);

    const isSecretary =
      Number(me.UserTypeCode) === 2 ||
      role === "secretary" ||
      role === "secretory";

    const isFullAccess =
      !isSecretary &&
      FULL_ACCESS_ROLES.includes(role);

    // =================================================
    // BUILD WHERE
    // =================================================

    const request = pool.request();

    let where = "WHERE 1 = 1";

    // =================================================
    // ADMIN / MANAGER
    // =================================================

    if (isFullAccess) {
      if (
        companyCode &&
        String(companyCode).trim() !== ""
      ) {
        request.input(
          "FilterCompanyCode",
          sql.Int,
          Number(companyCode)
        );

        where += `
          AND p.CompanyCode = @FilterCompanyCode
        `;
      }

      if (
        memberNumber &&
        String(memberNumber).trim() !== ""
      ) {
        request.input(
          "FilterMemberNumber",
          sql.VarChar(50),
          String(memberNumber).trim()
        );

        where += `
          AND CONVERT(varchar(50), p.MemberCode)
              = @FilterMemberNumber
        `;
      }
    }

    // =================================================
    // SECRETARY
    // =================================================

    else if (isSecretary) {
      if (
        me.CompanyCode === null ||
        me.CompanyCode === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "Secretary has no registered society.",
        });
      }

      request.input(
        "SecretaryCompanyCode",
        sql.Int,
        Number(me.CompanyCode)
      );

      where += `
        AND p.CompanyCode = @SecretaryCompanyCode
      `;

      if (
        memberNumber &&
        String(memberNumber).trim() !== ""
      ) {
        request.input(
          "SecretaryMemberNumber",
          sql.VarChar(50),
          String(memberNumber).trim()
        );

        where += `
          AND CONVERT(varchar(50), p.MemberCode)
              = @SecretaryMemberNumber
        `;
      }
    }

    // =================================================
    // NORMAL MEMBER
    // =================================================

    else {
      if (
        me.CompanyCode === null ||
        me.CompanyCode === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "User has no registered society.",
        });
      }

      request.input(
        "UserCompanyCode",
        sql.Int,
        Number(me.CompanyCode)
      );

      request.input(
        "UserMemberNumber",
        sql.VarChar(50),
        String(me.MemberNumber || "").trim()
      );

      where += `
        AND p.CompanyCode = @UserCompanyCode

        AND CONVERT(varchar(50), p.MemberCode)
            = @UserMemberNumber
      `;
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
        AND p.PurchaseDate <
            DATEADD(DAY, 1, @ToDate)
      `;
    }

    // =================================================
    // PURCHASE QUERY
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

        p.MemberCode,

        m.Number AS MemberNumber,

        m.MemberName,

        p.Test AS FatPercent,

        p.Snf AS SNFPercent,

        p.Qty AS QtyLtr,

        p.Rate,

        p.Amount,

        p.CompanyCode,

        RTRIM(
          ISNULL(c.Header1, '') +
          ISNULL(c.Header2, '')
        ) AS CompanyName

      FROM tbl_Purchase p

      LEFT JOIN tbl_Member m
        ON m.CompanyCode = p.CompanyCode

        AND CONVERT(
          varchar(100),
          m.MemberCode
        ) =
        CONVERT(
          varchar(100),
          p.MemberCode
        )

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
          WHEN p.Shift = 'M' THEN 1
          WHEN p.Shift = 'E' THEN 2
          ELSE 3
        END,

        p.Purchasenumber DESC
    `);

    // =================================================
    // RECORDS
    // =================================================

    const records = result.recordset;

    // =================================================
    // SUMMARY
    // =================================================

    const summary = {
      count: records.length,

      totalQty: records.reduce(
        (sum, row) =>
          sum + Number(row.QtyLtr || 0),
        0
      ),

      totalAmount: records.reduce(
        (sum, row) =>
          sum + Number(row.Amount || 0),
        0
      ),

      fatSum: records.reduce(
        (sum, row) =>
          sum + Number(row.FatPercent || 0),
        0
      ),

      snfSum: records.reduce(
        (sum, row) =>
          sum + Number(row.SNFPercent || 0),
        0
      ),
    };

    // =================================================
    // RESPONSE
    // =================================================

    return res.json({
      success: true,

      role: me.UserTypeName,

      userTypeCode: me.UserTypeCode,

      isSecretary,

      fullAccess: isFullAccess,

      companyCode: me.CompanyCode,

      companyName: me.CompanyName || "",

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

        avgSnf: summary.count
          ? Number(
              (
                summary.snfSum /
                summary.count
              ).toFixed(2)
            )
          : 0,
      },
    });
  } catch (err) {
    console.error(
      "PURCHASE API ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to load purchase data.",
    });
  }
});

module.exports = router;
