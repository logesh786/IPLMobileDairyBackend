const express = require("express");
const router = express.Router();
const sql = require("mssql");
const { getPool } = require("../db");

// =====================================================
// ACCESS CONFIGURATION
// =====================================================

// Secretary = FULL ACCESS
const FULL_ACCESS_ROLES = ["secretary"];

// Only these two roles can access purchases
const ALLOWED_ROLES = ["secretary", "member"];

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

    console.log("");
    console.log("======================================");
    console.log("PURCHASE API REQUEST");
    console.log("======================================");

    console.log({
      userCode,
      companyCode,
      memberNumber,
      fromDate,
      toDate,
    });

    // =================================================
    // VALIDATE USER CODE
    // =================================================

    if (
      userCode === undefined ||
      userCode === null ||
      String(userCode).trim() === ""
    ) {
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

    // =================================================
    // DATABASE CONNECTION
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
          u.UserName,
          u.UserTypeCode,
          u.CompanyCode,
          u.MemberNumber,
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
      !userResult.recordset ||
      userResult.recordset.length === 0
    ) {
      console.log(
        "USER NOT FOUND:",
        numericUserCode
      );

      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // =================================================
    // USER DATA
    // =================================================

    const me =
      userResult.recordset[0];

    // =================================================
    // ROLE
    // =================================================

    const userTypeCode = Number(
  me.UserTypeCode
);

const originalRole = String(
  me.UserTypeName || ""
).trim();

const role = originalRole
  .toLowerCase()
  .replace(/\s+/g, " ")
  .trim();

// =====================================================
// SECRETARY DETECTION
// UserTypeCode 2 = Secretary in your database
// =====================================================

const isSecretary =
  userTypeCode === 2 ||
  role === "secretary" ||
  role === "secretary";

// =====================================================
// MEMBER DETECTION
// =====================================================

const isMember =
  role === "member";

// =====================================================
// ACCESS
// =====================================================

const fullAccess =
  isSecretary;

const allowed =
  isSecretary ||
  isMember;

// =====================================================
// DEBUG
// =====================================================

console.log("======================================");
console.log("PURCHASE ROLE DEBUG");
console.log("======================================");

console.log("UserCode:", me.UserCode);
console.log("UserName:", me.UserName);
console.log("UserTypeCode:", me.UserTypeCode);
console.log("UserTypeCode Number:", userTypeCode);
console.log("UserTypeName RAW:", me.UserTypeName);
console.log("Original Role:", originalRole);
console.log("Normalized Role:", role);
console.log("Is Secretary:", isSecretary);
console.log("Is Member:", isMember);
console.log("Full Access:", fullAccess);
console.log("Allowed:", allowed);

console.log("======================================");

    // =================================================
    // ONLY SECRETARY + MEMBER
    // =================================================

    if (!allowed) {
      console.log(
        "ACCESS DENIED FOR ROLE:",
        role
      );

      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to view purchase records.",
      });
    }

    // =================================================
    // BUILD SQL
    // =================================================

    let where = `
      WHERE 1 = 1
    `;

    const request =
      pool.request();

    // =================================================
    // SECRETARY
    // =================================================
    //
    // Secretary:
    // - Full access
    // - MemberNumber NOT required
    // - CompanyCode used when available
    // - Optional companyCode from frontend
    // - Optional memberNumber filter
    // =================================================

    if (role === "secretary") {
      console.log("");
      console.log(
        "======================================"
      );
      console.log(
        "PURCHASE MODE: SECRETARY"
      );
      console.log(
        "======================================"
      );

      let filterCompanyCode = null;

      // ------------------------------------------------
      // FRONTEND COMPANY CODE
      // ------------------------------------------------

      if (
        companyCode !== undefined &&
        companyCode !== null &&
        String(companyCode).trim() !== ""
      ) {
        const numericCompanyCode =
          Number(companyCode);

        if (
          Number.isInteger(
            numericCompanyCode
          ) &&
          numericCompanyCode > 0
        ) {
          filterCompanyCode =
            numericCompanyCode;
        }
      }

      // ------------------------------------------------
      // USER'S COMPANY CODE
      // ------------------------------------------------

      if (
        filterCompanyCode === null &&
        me.CompanyCode !== null &&
        me.CompanyCode !== undefined &&
        Number(me.CompanyCode) > 0
      ) {
        filterCompanyCode =
          Number(me.CompanyCode);
      }

      // ------------------------------------------------
      // COMPANY FILTER
      // ------------------------------------------------

      if (
        filterCompanyCode !== null
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

        console.log(
          "SECRETARY COMPANY FILTER:",
          filterCompanyCode
        );
      } else {
        console.log(
          "SECRETARY: ALL COMPANIES"
        );
      }

      // ------------------------------------------------
      // OPTIONAL MEMBER FILTER
      // ------------------------------------------------

      if (
        memberNumber !== undefined &&
        memberNumber !== null &&
        String(memberNumber).trim() !== ""
      ) {
        const filterMemberNumber =
          String(
            memberNumber
          ).trim();

        request.input(
          "FilterMemberNumber",
          sql.VarChar(100),
          filterMemberNumber
        );

        // tbl_Purchase.Number is used
        // for the member number filter.
        where += `
          AND CONVERT(
            VARCHAR(100),
            p.Number
          ) = @FilterMemberNumber
        `;

        console.log(
          "SECRETARY MEMBER FILTER:",
          filterMemberNumber
        );
      }

      // IMPORTANT:
      // DO NOT CHECK me.MemberNumber HERE.
      //
      // Secretary can have:
      // MemberNumber = NULL
      //
      // This is valid.
    }

    // =================================================
    // MEMBER
    // =================================================

    else if (role === "member") {
      console.log("");
      console.log(
        "======================================"
      );
      console.log(
        "PURCHASE MODE: MEMBER"
      );
      console.log(
        "======================================"
      );

      // ------------------------------------------------
      // MEMBER COMPANY CODE REQUIRED
      // ------------------------------------------------

      if (
        me.CompanyCode === null ||
        me.CompanyCode === undefined ||
        Number(me.CompanyCode) <= 0
      ) {
        console.log(
          "MEMBER HAS NO VALID COMPANY CODE"
        );

        return res.status(400).json({
          success: false,
          message:
            "Your account does not have a valid CompanyCode.",
        });
      }

      // ------------------------------------------------
      // MEMBER NUMBER REQUIRED
      // ------------------------------------------------

      if (
        me.MemberNumber === null ||
        me.MemberNumber === undefined ||
        String(me.MemberNumber).trim() === ""
      ) {
        console.log(
          "MEMBER HAS NO VALID MEMBER NUMBER"
        );

        return res.status(400).json({
          success: false,
          message:
            "Your account does not have a valid MemberNumber.",
        });
      }

      // ------------------------------------------------
      // COMPANY FILTER
      // ------------------------------------------------

      request.input(
        "UserCompanyCode",
        sql.Int,
        Number(me.CompanyCode)
      );

      where += `
        AND p.CompanyCode =
            @UserCompanyCode
      `;

      // ------------------------------------------------
      // MEMBER NUMBER
      // ------------------------------------------------

      request.input(
        "UserMemberNumber",
        sql.VarChar(100),
        String(
          me.MemberNumber
        ).trim()
      );

      // ------------------------------------------------
      // MEMBER MATCH
      // ------------------------------------------------
      //
      // tbl_User.MemberNumber
      //       ↓
      // tbl_Member.Number
      //
      // tbl_Member.MemberCode
      //       ↓
      // tbl_Purchase.MemberCode
      // ------------------------------------------------

      where += `
        AND EXISTS
        (
          SELECT 1

          FROM tbl_Member m

          WHERE
            m.CompanyCode =
              p.CompanyCode

            AND CONVERT(
              VARCHAR(100),
              m.Number
            ) =
              @UserMemberNumber

            AND CONVERT(
              VARCHAR(100),
              m.MemberCode
            ) =
              CONVERT(
                VARCHAR(100),
                p.MemberCode
              )
        )
      `;

      console.log(
        "MEMBER COMPANY:",
        me.CompanyCode
      );

      console.log(
        "MEMBER NUMBER:",
        me.MemberNumber
      );
    }

    // =================================================
    // FROM DATE
    // =================================================

    if (
      fromDate !== undefined &&
      fromDate !== null &&
      String(fromDate).trim() !== ""
    ) {
      request.input(
        "FromDate",
        sql.Date,
        String(fromDate).trim()
      );

      where += `
        AND CAST(
          p.PurchaseDate AS DATE
        ) >= @FromDate
      `;
    }

    // =================================================
    // TO DATE
    // =================================================

    if (
      toDate !== undefined &&
      toDate !== null &&
      String(toDate).trim() !== ""
    ) {
      request.input(
        "ToDate",
        sql.Date,
        String(toDate).trim()
      );

      where += `
        AND CAST(
          p.PurchaseDate AS DATE
        ) <= @ToDate
      `;
    }

    // =================================================
    // PURCHASE SQL
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

    // =================================================
    // DEBUG SQL
    // =================================================

    console.log("");
    console.log(
      "======================================"
    );
    console.log(
      "FINAL PURCHASE SQL"
    );
    console.log(
      "======================================"
    );

    console.log(purchaseQuery);

    console.log(
      "======================================"
    );

    // =================================================
    // EXECUTE
    // =================================================

    const result =
      await request.query(
        purchaseQuery
      );

    const records =
      result.recordset || [];

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

    records.forEach(
      (row) => {
        const qty =
          Number(row.Qty);

        const amount =
          Number(row.Amount);

        const fat =
          Number(row.Test);

        if (
          Number.isFinite(qty)
        ) {
          totalQty += qty;
        }

        if (
          Number.isFinite(amount)
        ) {
          totalAmount += amount;
        }

        if (
          Number.isFinite(fat)
        ) {
          totalFat += fat;
          fatCount++;
        }
      }
    );

    const avgFat =
      fatCount > 0
        ? totalFat / fatCount
        : 0;

    // =================================================
    // RESPONSE
    // =================================================

    return res.json({
      success: true,

      role: originalRole,

      fullAccess,

      records,

      summary: {
        count:
          records.length,

        totalQty:
          Number(
            totalQty.toFixed(2)
          ),

        totalAmount:
          Number(
            totalAmount.toFixed(2)
          ),

        avgFat:
          Number(
            avgFat.toFixed(2)
          ),
      },
    });

  } catch (error) {

    // =================================================
    // ERROR
    // =================================================

    console.error("");
    console.error(
      "======================================"
    );

    console.error(
      "PURCHASE API ERROR"
    );

    console.error(
      "======================================"
    );

    console.error(
      "Message:",
      error?.message
    );

    console.error(
      "Code:",
      error?.code
    );

    console.error(
      "Number:",
      error?.number
    );

    console.error(
      "Stack:",
      error?.stack
    );

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

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;