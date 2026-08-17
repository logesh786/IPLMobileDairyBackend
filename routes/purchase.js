const express = require("express");
const router = express.Router();
const sql = require("mssql");
const { getPool } = require("../db");

// =====================================================
// FULL ACCESS ROLES
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
// DEFAULT DATE WINDOW
// =====================================================

const DEFAULT_LOOKBACK_DAYS = 31;

function getDefaultFromDate() {
  const d = new Date();

  d.setDate(
    d.getDate() - DEFAULT_LOOKBACK_DAYS
  );

  return d.toISOString().slice(0, 10);
}

// =====================================================
// GET PURCHASES
// =====================================================

router.get("/purchases", async (req, res) => {
  try {

    // =================================================
    // REQUEST PARAMETERS
    // =================================================

    const {
      userCode,
      companyCode,
      memberNumber,
      fromDate,
      toDate,
    } = req.query;

    console.log("======================================");
    console.log("PURCHASE API REQUEST");
    console.log("Query:", req.query);
    console.log("======================================");

    // =================================================
    // VALIDATE USER CODE
    // =================================================

    if (
      !userCode ||
      String(userCode).trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "userCode is required.",
      });
    }

    const numericUserCode =
      Number(userCode);

    if (
      !Number.isInteger(numericUserCode) ||
      numericUserCode <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid userCode.",
      });
    }

    // =================================================
    // DATABASE
    // =================================================

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

    if (
      userResult.recordset.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const me =
      userResult.recordset[0];

    // =================================================
    // ROLE
    // =================================================

    const role =
      normalizeRole(me.UserTypeName);

    const userTypeCode =
      Number(me.UserTypeCode);

    // =================================================
    // SECRETARY
    //
    // UserTypeCode 2 = Secretary
    //
    // Support all known spelling variations:
    // secretary
    // secretory
    // secretory
    // =================================================

    const isSecretary =
      userTypeCode === 2 ||
      role === "secretary" ||
      role === "secretory" ||
      role === "secretory";

    // =================================================
    // ADMIN
    // =================================================

    const isAdmin =
      role === "admin";

    // =================================================
    // MANAGER
    // =================================================

    const isManager =
      role === "manager";

    // =================================================
    // FULL ACCESS
    //
    // Secretary + Admin + Manager
    // =================================================

    const isFullAccess =
      isSecretary ||
      isAdmin ||
      isManager ||
      FULL_ACCESS_ROLES.includes(role);

    console.log("======================================");
    console.log("ACCESS CHECK");
    console.log("UserCode:", me.UserCode);
    console.log("UserTypeCode:", userTypeCode);
    console.log("UserTypeName:", me.UserTypeName);
    console.log("Normalized Role:", role);
    console.log("CompanyCode:", me.CompanyCode);
    console.log("MemberNumber:", me.MemberNumber);
    console.log("isSecretary:", isSecretary);
    console.log("isAdmin:", isAdmin);
    console.log("isManager:", isManager);
    console.log("isFullAccess:", isFullAccess);
    console.log("======================================");

    // =================================================
    // BUILD WHERE CLAUSE
    // =================================================

    const request =
      pool.request();

    let where =
      "WHERE 1 = 1";

    // =================================================
    // SECRETARY
    //
    // SECRETARY HAS ALL-SOCIETY ACCESS
    //
    // IMPORTANT:
    // Do NOT filter:
    // - CompanyCode
    // - MemberNumber
    // =================================================

    if (isSecretary) {

      console.log(
        "SECRETARY FULL ACCESS - NO COMPANY/MEMBER FILTER"
      );

    }

    // =================================================
    // ADMIN / MANAGER
    //
    // Full access, but optional filters from frontend
    // are allowed.
    // =================================================

    else if (isFullAccess) {

      console.log(
        "ADMIN / MANAGER FULL ACCESS"
      );

      // -------------------------------------------------
      // OPTIONAL COMPANY FILTER
      // -------------------------------------------------

      if (
        companyCode &&
        String(companyCode).trim() !== ""
      ) {

        const filterCompanyCode =
          Number(companyCode);

        if (
          Number.isInteger(
            filterCompanyCode
          )
        ) {

          request.input(
            "FilterCompanyCode",
            sql.Int,
            filterCompanyCode
          );

          where += `
            AND p.CompanyCode =
                @FilterCompanyCode
          `;
        }
      }

      // -------------------------------------------------
      // OPTIONAL MEMBER FILTER
      // -------------------------------------------------

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
          AND CONVERT(
                varchar(50),
                p.MemberCode
              ) = @FilterMemberNumber
        `;
      }
    }

    // =================================================
    // NORMAL MEMBER
    // =================================================

    else {

      console.log(
        "NORMAL MEMBER ACCESS"
      );

      // -------------------------------------------------
      // MEMBER MUST HAVE COMPANY
      // -------------------------------------------------

      if (
        me.CompanyCode === null ||
        me.CompanyCode === undefined
      ) {

        return res.status(400).json({
          success: false,
          message:
            "User has no registered society.",
        });
      }

      // -------------------------------------------------
      // COMPANY FILTER
      // -------------------------------------------------

      request.input(
        "UserCompanyCode",
        sql.Int,
        Number(me.CompanyCode)
      );

      // -------------------------------------------------
      // MEMBER NUMBER FILTER
      // -------------------------------------------------

      request.input(
        "UserMemberNumber",
        sql.VarChar(50),
        String(
          me.MemberNumber || ""
        ).trim()
      );

      where += `
        AND p.CompanyCode =
            @UserCompanyCode

        AND CONVERT(
              varchar(50),
              p.MemberCode
            ) = @UserMemberNumber
      `;
    }

    // =================================================
    // DATE FILTER
    // =================================================

    const effectiveFromDate =
      fromDate &&
      String(fromDate).trim() !== ""
        ? String(fromDate).trim()
        : null;

    const effectiveToDate =
      toDate &&
      String(toDate).trim() !== ""
        ? String(toDate).trim()
        : null;

    let defaultWindowApplied =
      false;

    // =================================================
    // FROM DATE
    // =================================================

    if (effectiveFromDate) {

      request.input(
        "FromDate",
        sql.Date,
        effectiveFromDate
      );

      where += `
        AND p.PurchaseDate >=
            @FromDate
      `;
    }

    // =================================================
    // DEFAULT 31 DAYS
    //
    // If no fromDate and no toDate
    // =================================================

    else if (!effectiveToDate) {

      defaultWindowApplied =
        true;

      request.input(
        "FromDate",
        sql.Date,
        getDefaultFromDate()
      );

      where += `
        AND p.PurchaseDate >=
            @FromDate
      `;
    }

    // =================================================
    // TO DATE
    // =================================================

    if (effectiveToDate) {

      request.input(
        "ToDate",
        sql.Date,
        effectiveToDate
      );

      where += `
        AND p.PurchaseDate <
            DATEADD(
              DAY,
              1,
              @ToDate
            )
      `;
    }

    // =================================================
    // PURCHASE QUERY
    // =================================================

    console.log("======================================");
    console.log("PURCHASE QUERY ACCESS");
    console.log("isSecretary:", isSecretary);
    console.log("isFullAccess:", isFullAccess);
    console.log("Default Window:", defaultWindowApplied);
    console.log("======================================");

    const result =
      await request.query(`
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

            ELSE ISNULL(
              p.Shift,
              '-'
            )
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
          ON m.CompanyCode =
             p.CompanyCode

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

          WHERE co.CompanyCode =
                p.CompanyCode

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

    // =================================================
    // SUMMARY
    // =================================================

    const summary = {

      count:
        records.length,

      totalQty:
        records.reduce(
          (sum, row) =>
            sum +
            Number(
              row.QtyLtr || 0
            ),
          0
        ),

      totalAmount:
        records.reduce(
          (sum, row) =>
            sum +
            Number(
              row.Amount || 0
            ),
          0
        ),

      fatSum:
        records.reduce(
          (sum, row) =>
            sum +
            Number(
              row.FatPercent || 0
            ),
          0
        ),

      snfSum:
        records.reduce(
          (sum, row) =>
            sum +
            Number(
              row.SNFPercent || 0
            ),
          0
        ),
    };

    // =================================================
    // RESPONSE
    // =================================================

    console.log("======================================");
    console.log("PURCHASE API SUCCESS");
    console.log("Records:", records.length);
    console.log("Secretary:", isSecretary);
    console.log("Full Access:", isFullAccess);
    console.log("======================================");

    return res.json({

      success: true,

      role:
        me.UserTypeName,

      userTypeCode:
        me.UserTypeCode,

      isSecretary,

      isAdmin,

      isManager,

      fullAccess:
        isFullAccess,

      companyCode:
        me.CompanyCode,

      companyName:
        me.CompanyName || "",

      defaultWindowApplied,

      defaultLookbackDays:
        defaultWindowApplied
          ? DEFAULT_LOOKBACK_DAYS
          : undefined,

      records,

      summary: {

        count:
          summary.count,

        totalQty:
          Number(
            summary.totalQty.toFixed(2)
          ),

        totalAmount:
          Number(
            summary.totalAmount.toFixed(2)
          ),

        avgFat:
          summary.count
            ? Number(
                (
                  summary.fatSum /
                  summary.count
                ).toFixed(2)
              )
            : 0,

        avgSnf:
          summary.count
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

    // =================================================
    // ERROR
    // =================================================

    console.error(
      "======================================"
    );

    console.error(
      "PURCHASE API ERROR:"
    );

    console.error(err);

    console.error(
      "======================================"
    );

    return res.status(500).json({

      success: false,

      message:
        err.message ||
        "Failed to load purchase data.",
    });
  }
});

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;