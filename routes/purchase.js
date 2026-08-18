// =====================================================
// PURCHASE ROUTES
// Mobile Dairy Backend
// =====================================================

const express = require("express");
const sql = require("mssql");
const { getPool } = require("../db");

const router = express.Router();

// =====================================================
// HELPERS
// =====================================================

const normalizeRole = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
};

const hasValue = (value) => {
  return (
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ""
  );
};

const cleanValue = (value) => {
  if (!hasValue(value)) {
    return "";
  }

  return String(value).trim();
};

const parseNumber = (value) => {
  if (!hasValue(value)) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

// =====================================================
// GET USER DETAILS
// =====================================================

const getUserDetails = async (pool, userCode) => {
  const result = await pool
    .request()
    .input(
      "userCode",
      sql.Int,
      Number(userCode)
    )
    .query(`
      SELECT TOP 1
        U.UserCode,
        U.UserName,
        U.UserTypeCode,
        U.CompanyCode,
        U.MemberNumber,
        UT.UserTypeName
      FROM tbl_User AS U
      LEFT JOIN tbl_UserType AS UT
        ON UT.UserTypeCode = U.UserTypeCode
      WHERE U.UserCode = @userCode
    `);

  return result.recordset[0] || null;
};

// =====================================================
// GET COMPANY NAME
// =====================================================

const getCompanyName = async (
  pool,
  companyCode
) => {
  if (!hasValue(companyCode)) {
    return "";
  }

  try {
    const result = await pool
      .request()
      .input(
        "companyCode",
        sql.Int,
        Number(companyCode)
      )
      .query(`
        SELECT TOP 1

          CompanyCode,

          LTRIM(RTRIM(
            ISNULL(Header1, '') +
            CASE
              WHEN ISNULL(Header1, '') <> ''
               AND ISNULL(Header2, '') <> ''
              THEN ' '
              ELSE ''
            END +
            ISNULL(Header2, '')
          )) AS CompanyName

        FROM tbl_Company

        WHERE CompanyCode = @companyCode
      `);

    return (
      result.recordset[0]?.CompanyName || ""
    );
  } catch (error) {
    console.error(
      "COMPANY NAME ERROR:",
      error.message
    );

    return "";
  }
};

// =====================================================
// GET PURCHASE COMPANIES
//
// GET /api/purchase-companies?userCode=3
// =====================================================

router.get(
  "/purchase-companies",
  async (req, res) => {
    try {
      const userCode = parseNumber(
        req.query.userCode
      );

      console.log(
        "======================================"
      );
      console.log(
        "GET PURCHASE COMPANIES"
      );
      console.log(
        "USER CODE:",
        userCode
      );
      console.log(
        "======================================"
      );

      if (!userCode) {
        return res.status(400).json({
          success: false,
          message: "userCode is required",
        });
      }

      const pool = await getPool();

      const user =
        await getUserDetails(
          pool,
          userCode
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const role = normalizeRole(
        user.UserTypeName
      );

      const userTypeCode =
        Number(user.UserTypeCode);

      const isAdmin =
        role === "admin" ||
        userTypeCode === 1;

      const isManager =
        role === "manager";

      const isSecretary =
        role === "secretary" ||
        role === "secretory" ||
        role === "secrectory" ||
        role === "secratory" ||
        role === "secretery" ||
        userTypeCode === 2;

      const isMember =
        role === "member" ||
        userTypeCode === 3;

      const canViewAll =
        isAdmin || isManager;

      let result;

      // =================================================
      // ADMIN / MANAGER
      // ALL SOCIETIES
      // =================================================

      if (canViewAll) {
        result =
          await pool.request().query(`
            SELECT
              CompanyCode,
              EDNO,

              LTRIM(RTRIM(
                ISNULL(Header1, '') +
                CASE
                  WHEN ISNULL(Header1, '') <> ''
                   AND ISNULL(Header2, '') <> ''
                  THEN ' '
                  ELSE ''
                END +
                ISNULL(Header2, '')
              )) AS CompanyName,

              MobileNo

            FROM tbl_Company

            WHERE
              ISNULL(EDNO, 0) > 0
              AND LEN(
                ISNULL(MobileNo, '')
              ) = 10

            ORDER BY CompanyName
          `);
      }

      // =================================================
      // SECRETARY
      // OWN SOCIETY
      // =================================================

      else if (isSecretary) {
        if (!hasValue(user.CompanyCode)) {
          return res.json({
            success: true,
            role: user.UserTypeName,
            fullAccess: false,
            companies: [],
            userCode: user.UserCode,
            userCompanyCode: null,
            message:
              "Secretary does not have a registered CompanyCode.",
          });
        }

        result =
          await pool
            .request()
            .input(
              "companyCode",
              sql.Int,
              Number(user.CompanyCode)
            )
            .query(`
              SELECT
                CompanyCode,
                EDNO,

                LTRIM(RTRIM(
                  ISNULL(Header1, '') +
                  CASE
                    WHEN ISNULL(Header1, '') <> ''
                     AND ISNULL(Header2, '') <> ''
                    THEN ' '
                    ELSE ''
                  END +
                  ISNULL(Header2, '')
                )) AS CompanyName,

                MobileNo

              FROM tbl_Company

              WHERE CompanyCode = @companyCode
            `);
      }

      // =================================================
      // MEMBER
      // OWN SOCIETY
      // =================================================

      else if (isMember) {
        if (!hasValue(user.CompanyCode)) {
          return res.json({
            success: true,
            role: user.UserTypeName,
            fullAccess: false,
            companies: [],
            userCode: user.UserCode,
            userCompanyCode: null,
          });
        }

        result =
          await pool
            .request()
            .input(
              "companyCode",
              sql.Int,
              Number(user.CompanyCode)
            )
            .query(`
              SELECT
                CompanyCode,
                EDNO,

                LTRIM(RTRIM(
                  ISNULL(Header1, '') +
                  CASE
                    WHEN ISNULL(Header1, '') <> ''
                     AND ISNULL(Header2, '') <> ''
                    THEN ' '
                    ELSE ''
                  END +
                  ISNULL(Header2, '')
                )) AS CompanyName,

                MobileNo

              FROM tbl_Company

              WHERE CompanyCode = @companyCode
            `);
      }

      else {
        return res.json({
          success: true,
          role: user.UserTypeName,
          fullAccess: false,
          companies: [],
          userCode: user.UserCode,
          userCompanyCode:
            user.CompanyCode || null,
        });
      }

      const companies =
        result.recordset || [];

      return res.json({
        success: true,

        role:
          user.UserTypeName,

        fullAccess:
          canViewAll,

        userCode:
          user.UserCode,

        userCompanyCode:
          user.CompanyCode,

        userMemberNumber:
          user.MemberNumber || null,

        companies,
      });

    } catch (error) {
      console.error(
        "======================================"
      );
      console.error(
        "PURCHASE COMPANIES ERROR"
      );
      console.error(error);
      console.error(
        "======================================"
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to load purchase companies.",
      });
    }
  }
);

// =====================================================
// GET PURCHASES
//
// GET /api/purchases
//
// Examples:
//
// /api/purchases?userCode=5
//
// /api/purchases?userCode=5&companyCode=10
//
// /api/purchases?userCode=5
//   &fromDate=2026-08-01
//   &toDate=2026-08-18
//
// =====================================================

router.get(
  "/purchases",
  async (req, res) => {
    try {
      // =================================================
      // INPUT
      // =================================================

      const userCode =
        parseNumber(
          req.query.userCode
        );

      const requestedCompanyCode =
        parseNumber(
          req.query.companyCode
        );

      const requestedMemberNumber =
        cleanValue(
          req.query.memberNumber
        );

      let fromDate =
        cleanValue(
          req.query.fromDate
        );

      let toDate =
        cleanValue(
          req.query.toDate
        );

      // =================================================
      // VALIDATION
      // =================================================

      if (!userCode) {
        return res.status(400).json({
          success: false,
          message:
            "userCode is required.",
        });
      }

      // =================================================
      // NULL STRING CLEANUP
      // =================================================

      if (
        fromDate.toLowerCase() ===
        "null"
      ) {
        fromDate = "";
      }

      if (
        toDate.toLowerCase() ===
        "null"
      ) {
        toDate = "";
      }

      // =================================================
      // DEFAULT DATE
      //
      // Last 31 days -> today
      //
      // -30 = today + previous 30 days
      // =================================================

      const useDefaultFromDate =
        !fromDate;

      const useDefaultToDate =
        !toDate;

      console.log(
        "======================================"
      );
      console.log(
        "GET PURCHASES"
      );
      console.log(
        "USER CODE:",
        userCode
      );
      console.log(
        "REQUESTED COMPANY:",
        requestedCompanyCode
      );
      console.log(
        "REQUESTED MEMBER:",
        requestedMemberNumber
      );
      console.log(
        "FROM DATE:",
        fromDate || "(default)"
      );
      console.log(
        "TO DATE:",
        toDate || "(default)"
      );
      console.log(
        "======================================"
      );

      // =================================================
      // DATABASE
      // =================================================

      const pool =
        await getPool();

      // =================================================
      // USER
      // =================================================

      const user =
        await getUserDetails(
          pool,
          userCode
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found.",
        });
      }

      // =================================================
      // ROLE
      // =================================================

      const role =
        normalizeRole(
          user.UserTypeName
        );

      const userTypeCode =
        Number(
          user.UserTypeCode
        );

      const isAdmin =
        role === "admin" ||
        userTypeCode === 1;

      const isManager =
        role === "manager";

      const isSecretary =
        role === "secretary" ||
        role === "secretory" ||
        role === "secrectory" ||
        role === "secratory" ||
        role === "secretery" ||
        userTypeCode === 2;

      const isMember =
        role === "member" ||
        userTypeCode === 3;

      const canViewAllSocieties =
        isAdmin || isManager;

      const canViewAllMembers =
        isAdmin || isManager;

      // =================================================
      // USER REGISTERED VALUES
      // =================================================

      const userCompanyCode =
        parseNumber(
          user.CompanyCode
        );

      const userMemberNumber =
        cleanValue(
          user.MemberNumber
        );

      console.log(
        "USER:",
        user
      );

      console.log(
        "ROLE:",
        role
      );

      console.log(
        "USER TYPE CODE:",
        userTypeCode
      );

      console.log(
        "USER COMPANY CODE:",
        userCompanyCode
      );

      console.log(
        "USER MEMBER NUMBER:",
        userMemberNumber
      );

      // =================================================
      // COMPANY FILTER
      // =================================================

      let finalCompanyCode =
        null;

      if (canViewAllSocieties) {
        // Admin / Manager
        // can select a company.
        finalCompanyCode =
          requestedCompanyCode;
      } else {
        // Secretary / Member
        // ALWAYS their registered society.
        finalCompanyCode =
          userCompanyCode;
      }

      // =================================================
      // SECRETARY SECURITY
      // =================================================

      if (isSecretary) {
        if (!userCompanyCode) {
          return res.json({
            success: true,
            role:
              user.UserTypeName,

            fullAccess: false,

            records: [],

            summary: {
              count: 0,
              totalQty: 0,
              totalAmount: 0,
              avgFat: 0,
              avgSnf: 0,
            },

            userCompanyCode: null,

            userMemberNumber:
              userMemberNumber ||
              null,

            message:
              "Secretary has no registered society.",
          });
        }

        if (
          requestedCompanyCode &&
          Number(
            requestedCompanyCode
          ) !==
            Number(
              userCompanyCode
            )
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Secretary can view only the registered society.",
          });
        }
      }

      // =================================================
      // MEMBER SECURITY
      // =================================================

      if (isMember) {
        if (!userCompanyCode) {
          return res.json({
            success: true,
            role:
              user.UserTypeName,

            fullAccess: false,

            records: [],

            summary: {
              count: 0,
              totalQty: 0,
              totalAmount: 0,
              avgFat: 0,
              avgSnf: 0,
            },

            userCompanyCode: null,

            userMemberNumber:
              userMemberNumber ||
              null,

            message:
              "Member has no registered society.",
          });
        }

        if (!userMemberNumber) {
          return res.json({
            success: true,
            role:
              user.UserTypeName,

            fullAccess: false,

            records: [],

            summary: {
              count: 0,
              totalQty: 0,
              totalAmount: 0,
              avgFat: 0,
              avgSnf: 0,
            },

            userCompanyCode:
              userCompanyCode,

            userMemberNumber: null,

            message:
              "Member has no registered member number.",
          });
        }

        if (
          requestedCompanyCode &&
          Number(
            requestedCompanyCode
          ) !==
            Number(
              userCompanyCode
            )
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Member can view only the registered society.",
          });
        }

        if (
          requestedMemberNumber &&
          requestedMemberNumber !==
            userMemberNumber
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Member can view only their own purchases.",
          });
        }
      }

      // =================================================
      // WHERE CONDITIONS
      // =================================================

      const whereConditions = [];

      // -------------------------------------------------
      // COMPANY
      // -------------------------------------------------

      if (finalCompanyCode) {
        whereConditions.push(
          "p.CompanyCode = @companyCode"
        );
      }

      // -------------------------------------------------
      // MEMBER
      //
      // IMPORTANT DATABASE STRUCTURE:
      //
      // tbl_Purchase.MemberCode
      //        ↓
      // tbl_Member.MemberCode
      //
      // tbl_User.MemberNumber
      //        ↓
      // tbl_Member.Number
      //
      // Therefore DO NOT use:
      //
      // p.MemberNumber
      // m.MemberNumber
      //
      // -------------------------------------------------

      if (isMember) {
        whereConditions.push(`
          CAST(m.Number AS VARCHAR(100))
            = @memberNumber
        `);
      }

      else if (
        requestedMemberNumber &&
        canViewAllMembers
      ) {
        whereConditions.push(`
          CAST(m.Number AS VARCHAR(100))
            = @memberNumber
        `);
      }

      // =================================================
      // DATE FILTER
      // =================================================

      if (fromDate) {
        whereConditions.push(`
          CAST(
            p.PurchaseDate AS DATE
          ) >= @fromDate
        `);
      }
      else {
        whereConditions.push(`
          p.PurchaseDate >=
            DATEADD(
              DAY,
              -30,
              CAST(GETDATE() AS DATE)
            )
        `);
      }

      if (toDate) {
        whereConditions.push(`
          CAST(
            p.PurchaseDate AS DATE
          ) <= @toDate
        `);
      }
      else {
        whereConditions.push(`
          p.PurchaseDate <
            DATEADD(
              DAY,
              1,
              CAST(GETDATE() AS DATE)
            )
        `);
      }

      // =================================================
      // WHERE SQL
      // =================================================

      const whereSQL =
        whereConditions.length > 0
          ? `
            WHERE
              ${whereConditions.join(
                "\n AND "
              )}
          `
          : "";

      // =================================================
      // REQUEST
      // =================================================

      const request =
        pool.request();

      // =================================================
      // COMPANY PARAMETER
      // =================================================

      if (finalCompanyCode) {
        request.input(
          "companyCode",
          sql.Int,
          Number(
            finalCompanyCode
          )
        );
      }

      // =================================================
      // MEMBER PARAMETER
      // =================================================

      if (
        isMember ||
        (
          requestedMemberNumber &&
          canViewAllMembers
        )
      ) {
        request.input(
          "memberNumber",
          sql.VarChar(100),
          isMember
            ? userMemberNumber
            : requestedMemberNumber
        );
      }

      // =================================================
      // FROM DATE PARAMETER
      // =================================================

      if (fromDate) {
        request.input(
          "fromDate",
          sql.Date,
          fromDate
        );
      }

      // =================================================
      // TO DATE PARAMETER
      // =================================================

      if (toDate) {
        request.input(
          "toDate",
          sql.Date,
          toDate
        );
      }

      // =================================================
      // PURCHASE QUERY
      //
      // CORRECT TABLE RELATION:
      //
      // tbl_Purchase.MemberCode
      //       =
      // tbl_Member.MemberCode
      //
      // =================================================

      const purchaseQuery = `
        SELECT

          p.*,

          LTRIM(RTRIM(
            ISNULL(c.Header1, '') +
            CASE
              WHEN ISNULL(c.Header1, '') <> ''
               AND ISNULL(c.Header2, '') <> ''
              THEN ' '
              ELSE ''
            END +
            ISNULL(c.Header2, '')
          )) AS CompanyName,

          c.EDNO AS CompanyEDNO,

          m.MemberCode AS RegisteredMemberCode,

          m.Number AS RegisteredMemberNumber,

          m.MemberName,

          m.MemberNameEnglish,

          m.MobileNo AS MemberMobileNo

        FROM tbl_Purchase AS p

        LEFT JOIN tbl_Company AS c
          ON c.CompanyCode =
             p.CompanyCode

        LEFT JOIN tbl_Member AS m
          ON m.CompanyCode =
             p.CompanyCode

         AND CAST(
               m.MemberCode AS VARCHAR(100)
             )
             =
             CAST(
               p.MemberCode AS VARCHAR(100)
             )

        ${whereSQL}

        ORDER BY
          p.PurchaseDate DESC,
          p.Purchasenumber DESC
      `;

      console.log(
        "======================================"
      );
      console.log(
        "PURCHASE SQL"
      );
      console.log(
        purchaseQuery
      );
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

      let totalSnf = 0;

      let snfCount = 0;

      for (
        const row of records
      ) {

        // ---------------------------------------------
        // QTY
        // ---------------------------------------------

        const qty =
          Number(
            row.Qty ?? 0
          );

        if (
          Number.isFinite(qty)
        ) {
          totalQty += qty;
        }

        // ---------------------------------------------
        // AMOUNT
        // ---------------------------------------------

        const amount =
          Number(
            row.Amount ?? 0
          );

        if (
          Number.isFinite(amount)
        ) {
          totalAmount += amount;
        }

        // ---------------------------------------------
        // FAT
        // ---------------------------------------------

        const fat =
          Number(
            row.Test ??
            row.Fat ??
            row.FAT ??
            0
          );

        if (
          Number.isFinite(fat) &&
          fat > 0
        ) {
          totalFat += fat;
          fatCount++;
        }

        // ---------------------------------------------
        // SNF
        // ---------------------------------------------

        const snf =
          Number(
            row.Snf ??
            row.SNF ??
            0
          );

        if (
          Number.isFinite(snf) &&
          snf > 0
        ) {
          totalSnf += snf;
          snfCount++;
        }
      }

      const avgFat =
        fatCount > 0
          ? totalFat / fatCount
          : 0;

      const avgSnf =
        snfCount > 0
          ? totalSnf / snfCount
          : 0;

      // =================================================
      // USER COMPANY NAME
      // =================================================

      let userCompanyName = "";

      if (userCompanyCode) {
        userCompanyName =
          await getCompanyName(
            pool,
            userCompanyCode
          );
      }

      // =================================================
      // RESPONSE
      // =================================================

      return res.json({

        success: true,

        role:
          user.UserTypeName,

        userCode:
          user.UserCode,

        userName:
          user.UserName,

        userTypeCode:
          user.UserTypeCode,

        userTypeName:
          user.UserTypeName,

        userCompanyCode:
          userCompanyCode,

        userCompanyName:
          userCompanyName,

        userMemberNumber:
          userMemberNumber ||
          null,

        isSecretary,

        isMember,

        isAdmin,

        isManager,

        fullAccess:
          canViewAllSocieties,

        canViewAllSocieties,

        canViewAllMembers,

        selectedCompanyCode:
          finalCompanyCode,

        selectedMemberNumber:
          isMember
            ? userMemberNumber
            : requestedMemberNumber ||
              null,

        records,

        summary: {
          count:
            records.length,

          totalQty:
            totalQty,

          totalAmount:
            totalAmount,

          avgFat:
            avgFat,

          avgSnf:
            avgSnf,
        },
      });

    } catch (error) {

      console.error(
        "======================================"
      );

      console.error(
        "GET PURCHASES ERROR"
      );

      console.error(
        "MESSAGE:",
        error.message
      );

      console.error(
        "STACK:",
        error.stack
      );

      console.error(
        "======================================"
      );

      return res.status(500).json({
        success: false,

        message:
          error.message ||
          "Failed to load purchases.",
      });
    }
  }
);

// =====================================================
// TEST ROUTE
// =====================================================

router.get(
  "/purchase-test",
  (req, res) => {
    return res.json({
      success: true,
      message:
        "Purchase route is working.",
    });
  }
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;