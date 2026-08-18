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

  return Number.isFinite(number)
    ? number
    : null;
};

// =====================================================
// GET USER DETAILS
// =====================================================

const getUserDetails = async (
  pool,
  userCode
) => {
  const result =
    await pool
      .request()
      .input(
        "userCode",
        sql.Int,
        Number(userCode)
      )
      .query(`
        SELECT TOP 1

          u.UserCode,
          u.UserName,
          u.UserTypeCode,
          u.CompanyCode,
          u.MemberNumber,

          ut.UserTypeName

        FROM tbl_User u

        LEFT JOIN tbl_UserType ut
          ON ut.UserTypeCode =
             u.UserTypeCode

        WHERE
          u.UserCode = @userCode
      `);

  return (
    result.recordset[0] ||
    null
  );
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
    const result =
      await pool
        .request()
        .input(
          "companyCode",
          sql.Int,
          Number(companyCode)
        )
        .query(`
          SELECT TOP 1

            LTRIM(RTRIM(
              ISNULL(Header1, '') +

              CASE
                WHEN
                  ISNULL(Header1, '') <> ''
                  AND
                  ISNULL(Header2, '') <> ''
                THEN ' '
                ELSE ''
              END +

              ISNULL(Header2, '')
            )) AS CompanyName

          FROM tbl_Company

          WHERE
            CompanyCode = @companyCode
        `);

    return (
      result.recordset[0]
        ?.CompanyName || ""
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
      const userCode =
        parseNumber(
          req.query.userCode
        );

      console.log("======================================");
      console.log(
        "GET PURCHASE COMPANIES"
      );
      console.log(
        "USER CODE:",
        userCode
      );
      console.log("======================================");

      if (!userCode) {
        return res.status(400).json({
          success: false,
          message:
            "userCode is required",
        });
      }

      const pool =
        await getPool();

      const user =
        await getUserDetails(
          pool,
          userCode
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      const role =
        normalizeRole(
          user.UserTypeName
        );

      const userTypeCode =
        Number(
          user.UserTypeCode
        );

      // =================================================
      // ROLE
      // =================================================

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
        isAdmin ||
        isManager;

      let result;

      // =================================================
      // ADMIN / MANAGER
      // =================================================

      if (canViewAll) {
        result =
          await pool
            .request()
            .query(`
              SELECT

                CompanyCode,
                EDNO,

                LTRIM(RTRIM(
                  ISNULL(Header1, '') +

                  CASE
                    WHEN
                      ISNULL(Header1, '') <> ''
                      AND
                      ISNULL(Header2, '') <> ''
                    THEN ' '
                    ELSE ''
                  END +

                  ISNULL(Header2, '')
                )) AS CompanyName,

                MobileNo

              FROM tbl_Company

              WHERE
                ISNULL(EDNO, 0) > 0

              ORDER BY
                CompanyName
            `);
      }

      // =================================================
      // SECRETARY / MEMBER
      // OWN SOCIETY
      // =================================================

      else if (
        isSecretary ||
        isMember
      ) {
        const companyCode =
          parseNumber(
            user.CompanyCode
          );

        if (!companyCode) {
          return res.json({
            success: true,

            role:
              user.UserTypeName,

            fullAccess: false,

            userCode:
              user.UserCode,

            userCompanyCode:
              null,

            companies: [],

            message:
              isMember
                ? "Member has no registered society."
                : "Secretary has no registered society.",
          });
        }

        result =
          await pool
            .request()
            .input(
              "companyCode",
              sql.Int,
              companyCode
            )
            .query(`
              SELECT

                CompanyCode,
                EDNO,

                LTRIM(RTRIM(
                  ISNULL(Header1, '') +

                  CASE
                    WHEN
                      ISNULL(Header1, '') <> ''
                      AND
                      ISNULL(Header2, '') <> ''
                    THEN ' '
                    ELSE ''
                  END +

                  ISNULL(Header2, '')
                )) AS CompanyName,

                MobileNo

              FROM tbl_Company

              WHERE
                CompanyCode = @companyCode
            `);
      }

      else {
        return res.json({
          success: true,
          role:
            user.UserTypeName,
          fullAccess: false,
          companies: [],
        });
      }

      const companies =
        result.recordset || [];

      const userCompanyCode =
        parseNumber(
          user.CompanyCode
        );

      const userCompanyName =
        await getCompanyName(
          pool,
          userCompanyCode
        );

      return res.json({
        success: true,

        role:
          user.UserTypeName,

        userCode:
          user.UserCode,

        userCompanyCode,

        userCompanyName,

        fullAccess:
          canViewAll,

        canViewAllSocieties:
          canViewAll,

        companies,
      });
    } catch (error) {
      console.error(
        "======================================"
      );

      console.error(
        "PURCHASE COMPANIES ERROR:"
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
// =====================================================

router.get(
  "/purchases",
  async (req, res) => {
    try {
      // =================================================
      // REQUEST PARAMETERS
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
      // NULL STRING
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
        isAdmin ||
        isManager;

      const canViewAllMembers =
        isAdmin ||
        isManager;

      // =================================================
      // REGISTERED COMPANY
      // =================================================

      const userCompanyCode =
        parseNumber(
          user.CompanyCode
        );

      const userMemberNumber =
        cleanValue(
          user.MemberNumber
        );

      // =================================================
      // COMPANY ACCESS
      // =================================================

      let finalCompanyCode =
        null;

      if (canViewAllSocieties) {
        // Admin / Manager
        finalCompanyCode =
          requestedCompanyCode;
      } else {
        // Secretary / Member
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

            userCompanyName: "",

            userMemberNumber: null,

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

            userCompanyName: "",

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

            userCompanyName:
              await getCompanyName(
                pool,
                userCompanyCode
              ),

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
      // DATE FILTER
      //
      // If both are empty:
      // LAST 31 DAYS -> TODAY
      // =================================================

      const useDefaultDates =
        !fromDate &&
        !toDate;

      // =================================================
      // WHERE
      // =================================================

      const whereConditions = [];

      // =================================================
      // COMPANY
      // =================================================

      if (finalCompanyCode) {
        whereConditions.push(
          "p.CompanyCode = @companyCode"
        );
      }

      // =================================================
      // MEMBER
      // =================================================

      if (isMember) {
        whereConditions.push(`
          CAST(
            p.MemberNumber AS VARCHAR(100)
          ) = @memberNumber
        `);
      }

      else if (
        requestedMemberNumber &&
        canViewAllMembers
      ) {
        whereConditions.push(`
          CAST(
            p.MemberNumber AS VARCHAR(100)
          ) = @memberNumber
        `);
      }

      // =================================================
      // DATE
      // =================================================

      if (useDefaultDates) {
        whereConditions.push(`
          p.PurchaseDate >=
            DATEADD(
              DAY,
              -30,
              CAST(GETDATE() AS DATE)
            )
        `);

        whereConditions.push(`
          p.PurchaseDate <
            DATEADD(
              DAY,
              1,
              CAST(GETDATE() AS DATE)
            )
        `);
      } else {
        if (fromDate) {
          whereConditions.push(
            "CAST(p.PurchaseDate AS DATE) >= @fromDate"
          );
        }

        if (toDate) {
          whereConditions.push(
            "CAST(p.PurchaseDate AS DATE) <= @toDate"
          );
        }
      }

      // =================================================
      // WHERE SQL
      // =================================================

      const whereSQL =
        whereConditions.length
          ? `
            WHERE
              ${whereConditions.join(
                "\n AND "
              )}
          `
          : "";

      // =================================================
      // SQL REQUEST
      // =================================================

      const request =
        pool.request();

      if (finalCompanyCode) {
        request.input(
          "companyCode",
          sql.Int,
          Number(
            finalCompanyCode
          )
        );
      }

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

      if (fromDate) {
        request.input(
          "fromDate",
          sql.Date,
          fromDate
        );
      }

      if (toDate) {
        request.input(
          "toDate",
          sql.Date,
          toDate
        );
      }

      // =================================================
      // PURCHASE SQL
      // =================================================

      const purchaseQuery = `
        SELECT

          p.*,

          LTRIM(RTRIM(
            ISNULL(c.Header1, '') +

            CASE
              WHEN
                ISNULL(c.Header1, '') <> ''
                AND
                ISNULL(c.Header2, '') <> ''
              THEN ' '
              ELSE ''
            END +

            ISNULL(c.Header2, '')
          )) AS CompanyName,

          c.EDNO AS CompanyEDNO,

          m.MemberNumber AS RegisteredMemberNumber

        FROM tbl_Purchase p

        LEFT JOIN tbl_Company c
          ON c.CompanyCode =
             p.CompanyCode

        LEFT JOIN tbl_Member m
          ON m.CompanyCode =
             p.CompanyCode

         AND CAST(
           m.MemberNumber AS VARCHAR(100)
         )
           =
         CAST(
           p.MemberNumber AS VARCHAR(100)
         )

        ${whereSQL}

        ORDER BY
          p.PurchaseDate DESC
      `;

      console.log("======================================");
      console.log(
        "GET PURCHASES"
      );
      console.log(
        "USER CODE:",
        userCode
      );
      console.log(
        "ROLE:",
        user.UserTypeName
      );
      console.log(
        "USER TYPE CODE:",
        userTypeCode
      );
      console.log(
        "REGISTERED COMPANY:",
        userCompanyCode
      );
      console.log(
        "REGISTERED MEMBER:",
        userMemberNumber
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
        fromDate || "DEFAULT"
      );
      console.log(
        "TO DATE:",
        toDate || "DEFAULT"
      );
      console.log(
        "FINAL COMPANY:",
        finalCompanyCode
      );
      console.log(
        "PURCHASE SQL:"
      );
      console.log(
        purchaseQuery
      );
      console.log("======================================");

      const result =
        await request.query(
          purchaseQuery
        );

      const records =
        result.recordset || [];

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
        // -----------------------------------------------
        // QUANTITY
        // -----------------------------------------------

        const qty =
          Number(
            row.Qty ??
            row.Quantity ??
            row.QtyLitres ??
            row.Litre ??
            row.Liters ??
            0
          );

        if (
          Number.isFinite(qty)
        ) {
          totalQty += qty;
        }

        // -----------------------------------------------
        // AMOUNT
        // -----------------------------------------------

        const amount =
          Number(
            row.Amount ??
            row.TotalAmount ??
            row.PurchaseAmount ??
            row.NetAmount ??
            0
          );

        if (
          Number.isFinite(amount)
        ) {
          totalAmount += amount;
        }

        // -----------------------------------------------
        // FAT
        // -----------------------------------------------

        const fat =
          Number(
            row.Fat ??
            row.FAT ??
            row.FatPercent ??
            row.FatPercentage
          );

        if (
          Number.isFinite(fat)
        ) {
          totalFat += fat;
          fatCount++;
        }

        // -----------------------------------------------
        // SNF
        // -----------------------------------------------

        const snf =
          Number(
            row.Snf ??
            row.SNF ??
            row.SnfPercent ??
            row.SNFPercentage
          );

        if (
          Number.isFinite(snf)
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
      // COMPANY NAME
      // =================================================

      const userCompanyName =
        await getCompanyName(
          pool,
          userCompanyCode
        );

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

          totalQty,

          totalAmount,

          avgFat,

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
// TEST
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