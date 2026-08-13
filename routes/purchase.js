const express = require("express");
const router = express.Router();
const sql = require("mssql");
const { getPool } = require("../db");

const FULL_ACCESS_ROLES = ["secretary", "admin", "manager"];

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

    console.log("PURCHASE REQUEST PARAMS:", {
      userCode,
      companyCode,
      memberNumber,
      fromDate,
      toDate,
    });

    // ---------------------------------------------
    // Validate userCode
    // ---------------------------------------------
    if (!userCode) {
      return res.status(400).json({
        success: false,
        message: "userCode is required.",
      });
    }

    const pool = await getPool();

    // ---------------------------------------------
    // Get logged-in user's actual role/company/member
    // ---------------------------------------------
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
        INNER JOIN tbl_UserType t
          ON u.UserTypeCode = t.UserTypeCode
        WHERE u.UserCode = @UserCode
      `);

    if (userResult.recordset.length === 0) {
      console.log("PURCHASE: user not found for userCode", userCode);
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const me = userResult.recordset[0];

    const role = String(me.UserTypeName || "")
      .trim()
      .toLowerCase();

    const fullAccess = FULL_ACCESS_ROLES.includes(role);

    console.log("PURCHASE: resolved user", {
      UserCode: me.UserCode,
      role,
      fullAccess,
      CompanyCode: me.CompanyCode,
      MemberNumber: me.MemberNumber,
    });

    // ---------------------------------------------
    // Build purchase WHERE condition
    // ---------------------------------------------
    const request = pool.request();

    let where = "WHERE 1 = 1";

    // ---------------------------------------------
    // SECRETARY / ADMIN / MANAGER
    // ---------------------------------------------
    if (fullAccess) {
      // Society filter
      // companyCode may arrive as "1111" or "1111 - Some Society Name"
      // from the frontend combobox — extract the numeric code only.
      if (companyCode) {
        const rawCompanyCode = String(companyCode).trim();
        const numericCompanyCode = parseInt(
          rawCompanyCode.split(/[\s-]/)[0],
          10
        );

        if (!Number.isNaN(numericCompanyCode)) {
          request.input(
            "FilterCompanyCode",
            sql.Int,
            numericCompanyCode
          );

          where += `
            AND p.CompanyCode = @FilterCompanyCode
          `;
        } else {
          console.log(
            "PURCHASE: companyCode could not be parsed as a number:",
            companyCode
          );
        }
      }

      // Member Number filter
      if (memberNumber) {
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

    // ---------------------------------------------
    // MEMBER USER
    // ---------------------------------------------
    else {
      if (!me.CompanyCode || !me.MemberNumber) {
        console.log(
          "PURCHASE: non-full-access user is missing CompanyCode/MemberNumber — will match 0 rows.",
          { CompanyCode: me.CompanyCode, MemberNumber: me.MemberNumber }
        );
      }

      request.input(
        "UserCompanyCode",
        sql.Int,
        me.CompanyCode
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

    // ---------------------------------------------
    // DATE FILTER
    // ---------------------------------------------

    if (fromDate) {
      request.input(
        "FromDate",
        sql.Date,
        fromDate
      );

      where += `
        AND p.PurchaseDate >= @FromDate
      `;
    }

    if (toDate) {
      request.input(
        "ToDate",
        sql.Date,
        toDate
      );

      where += `
        AND p.PurchaseDate < DATEADD(day, 1, @ToDate)
      `;
    }

    console.log("PURCHASE: final WHERE clause:", where);

    // ---------------------------------------------
    // PURCHASE QUERY
    // ---------------------------------------------
    const result = await request.query(`
      SELECT

        p.Purchasenumber AS PurchaseID,

        CONVERT(
          varchar(10),
          p.PurchaseDate,
          103
        ) AS PurchaseDate,

        CASE
          WHEN p.Shift = 'M' THEN 'Morning'
          WHEN p.Shift = 'E' THEN 'Evening'
          ELSE ISNULL(p.Shift, '-')
        END AS ShiftName,

        p.MemberCode AS MemberNumber,

        p.Test AS FatPercent,

        p.Snf AS SNFPercent,

        p.Qty AS QtyLtr,

        p.Rate,

        p.Amount,

        p.CompanyCode,

        -- Prefer a "clean" company record (matches the stricter
        -- OUTER APPLY conditions), but fall back to any matching
        -- company row so CompanyName isn't silently blanked out.
        RTRIM(
          ISNULL(cPreferred.Header1, ISNULL(cAny.Header1, '')) +
          ISNULL(cPreferred.Header2, ISNULL(cAny.Header2, ''))
        ) AS CompanyName

      FROM tbl_Purchase p

      OUTER APPLY (
        SELECT TOP 1
          co.Header1,
          co.Header2
        FROM tbl_Company co
        WHERE co.CompanyCode = p.CompanyCode
          AND LEN(RTRIM(ISNULL(co.Header1, '')) + RTRIM(ISNULL(co.Header2, ''))) > 10
          AND LEN(co.MobileNo) = 10
          AND co.EDNO > 0
        ORDER BY co.EDNO
      ) cPreferred

      OUTER APPLY (
        SELECT TOP 1
          co.Header1,
          co.Header2
        FROM tbl_Company co
        WHERE co.CompanyCode = p.CompanyCode
        ORDER BY co.EDNO
      ) cAny

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

    // ---------------------------------------------
    // RECORDS
    // ---------------------------------------------
    const records = result.recordset;

    console.log("PURCHASE: rows returned:", records.length);

    // ---------------------------------------------
    // SUMMARY
    // ---------------------------------------------
    const summary = records.reduce(
      (acc, r) => {
        acc.totalQty += Number(r.QtyLtr) || 0;

        acc.totalAmount += Number(r.Amount) || 0;

        acc.fatSum += Number(r.FatPercent) || 0;

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

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------
    return res.json({
      success: true,

      role: me.UserTypeName,

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
    console.error("PURCHASE API ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;