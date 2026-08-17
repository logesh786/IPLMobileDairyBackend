const express = require("express");
const router = express.Router();
const sql = require("mssql");

const { getPool } = require("../db");

// =====================================================
// CONFIG
// =====================================================

const SECRETARY_USER_TYPE_CODE = 2;

const DEFAULT_LOOKBACK_DAYS = 31;

// =====================================================
// NORMALIZE ROLE
// =====================================================

function normalizeRole(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// =====================================================
// VALUE CHECK
// =====================================================

function hasValue(value) {
  return (
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ""
  );
}

// =====================================================
// DEFAULT FROM DATE
// =====================================================

function getDefaultFromDate() {
  const d = new Date();

  d.setDate(
    d.getDate() - DEFAULT_LOOKBACK_DAYS
  );

  return d.toISOString().slice(0, 10);
}

// =====================================================
// TODAY
// =====================================================

function getToday() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

// =====================================================
// GET LOGGED USER
// =====================================================

async function getLoggedUser(pool, userCode) {
  const result = await pool
    .request()
    .input(
      "UserCode",
      sql.Int,
      Number(userCode)
    )
    .query(`
      SELECT

        u.UserCode,
        u.UserTypeCode,
        u.UserName,
        u.CompanyCode,
        u.MemberNumber,
        u.RegisteredMobileNumber,

        t.UserTypeName,

        RTRIM(
          ISNULL(c.Header1, '') + ' ' +
          ISNULL(c.Header2, '')
        ) AS CompanyName

      FROM tbl_User u

      INNER JOIN tbl_UserType t
        ON u.UserTypeCode = t.UserTypeCode

      LEFT JOIN tbl_Company c
        ON u.CompanyCode = c.CompanyCode

      WHERE
        u.UserCode = @UserCode
    `);

  if (!result.recordset.length) {
    return null;
  }

  return result.recordset[0];
}

// =====================================================
// GET PURCHASE COMPANIES
//
// ADMIN
// MANAGER
// SECRETARY
//     -> ALL SOCIETIES
//
// NORMAL MEMBER
//     -> ONLY OWN SOCIETY
// =====================================================

router.get(
  "/purchase-companies",
  async (req, res) => {
    try {
      const { userCode } = req.query;

      // =================================================
      // VALIDATE USER
      // =================================================

      if (!hasValue(userCode)) {
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
      // DB
      // =================================================

      const pool = await getPool();

      // =================================================
      // USER
      // =================================================

      const user = await getLoggedUser(
        pool,
        numericUserCode
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      // =================================================
      // ROLE
      // =================================================

      const role = normalizeRole(
        user.UserTypeName
      );

      const userTypeCode = Number(
        user.UserTypeCode
      );

      const isSecretary =
        userTypeCode === SECRETARY_USER_TYPE_CODE ||
        role === "secretary" ||
        role === "secretory" ||
        role === "secratory" ||
        role === "secretery";

      const isAdmin =
        role === "admin";

      const isManager =
        role === "manager";

      // =================================================
      // IMPORTANT
      //
      // SECRETARY NOW HAS ALL SOCIETY ACCESS
      // =================================================

      const canViewAllSocieties =
        isAdmin ||
        isManager ||
        isSecretary;

      // =================================================
      // QUERY
      // =================================================

      const request = pool.request();

      let where = `
        WHERE
          LEN(ISNULL(c.MobileNo, '')) = 10
          AND c.EDNO > 0
      `;

      // =================================================
      // NORMAL MEMBER
      //
      // ONLY NORMAL MEMBER IS RESTRICTED
      // =================================================

      if (!canViewAllSocieties) {
        if (
          user.CompanyCode === null ||
          user.CompanyCode === undefined ||
          Number(user.CompanyCode) <= 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Member has no registered society.",
          });
        }

        request.input(
          "RegisteredCompanyCode",
          sql.Int,
          Number(user.CompanyCode)
        );

        where += `
          AND c.CompanyCode =
              @RegisteredCompanyCode
        `;
      }

      // =================================================
      // FETCH
      // =================================================

      const result = await request.query(`
        SELECT

          c.CompanyCode,

          c.EDNO,

          c.Header1,

          c.Header2,

          c.MobileNo

        FROM tbl_Company c

        ${where}

        ORDER BY
          c.CompanyCode
      `);

      // =================================================
      // FORMAT
      // =================================================

      const records =
        result.recordset.map((row) => ({
          CompanyCode: row.CompanyCode,

          EDNO: row.EDNO,

          CompanyName:
            `${row.Header1 || ""} ${
              row.Header2 || ""
            }`.trim(),

          MobileNo: row.MobileNo,
        }));

      // =================================================
      // RESPONSE
      // =================================================

      return res.status(200).json({
        success: true,

        isSecretary,

        isAdmin,

        isManager,

        canViewAllSocieties,

        userCompanyCode:
          user.CompanyCode,

        records,
      });

    } catch (err) {

      console.error(
        "PURCHASE COMPANIES ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        message:
          err.message ||
          "Failed to load societies.",
      });
    }
  }
);

// =====================================================
// GET PURCHASES
//
// ADMIN / MANAGER / SECRETARY
//     -> ALL SOCIETIES
//     -> OPTIONAL SOCIETY FILTER
//     -> OPTIONAL MEMBER FILTER
//
// NORMAL MEMBER
//     -> OWN SOCIETY
//     -> OWN MEMBER
// =====================================================

router.get(
  "/purchases",
  async (req, res) => {

    try {

      const {
        userCode,
        companyCode,
        memberNumber,
        fromDate,
        toDate,
      } = req.query;

      console.log(
        "======================================"
      );

      console.log(
        "PURCHASE REQUEST"
      );

      console.log(
        req.query
      );

      console.log(
        "======================================"
      );

      // =================================================
      // USER CODE
      // =================================================

      if (!hasValue(userCode)) {
        return res.status(400).json({
          success: false,
          message:
            "userCode is required.",
        });
      }

      const numericUserCode =
        Number(userCode);

      if (
        !Number.isInteger(
          numericUserCode
        ) ||
        numericUserCode <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid userCode.",
        });
      }

      // =================================================
      // DB
      // =================================================

      const pool = await getPool();

      // =================================================
      // USER
      // =================================================

      const me =
        await getLoggedUser(
          pool,
          numericUserCode
        );

      if (!me) {
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
          me.UserTypeName
        );

      const userTypeCode =
        Number(
          me.UserTypeCode
        );

      const isSecretary =
        userTypeCode ===
          SECRETARY_USER_TYPE_CODE ||
        role === "secretary" ||
        role === "secretory" ||
        role === "secratory" ||
        role === "secretery";

      const isAdmin =
        role === "admin";

      const isManager =
        role === "manager";

      // =================================================
      // ALL SOCIETY ACCESS
      //
      // SECRETARY INCLUDED
      // =================================================

      const canViewAllSocieties =
        isAdmin ||
        isManager ||
        isSecretary;

      // =================================================
      // ALL MEMBER ACCESS
      //
      // SECRETARY INCLUDED
      // =================================================

      const canViewAllMembers =
        isAdmin ||
        isManager ||
        isSecretary;

      // =================================================
      // REQUEST
      // =================================================

      const request =
        pool.request();

      // =================================================
      // COMPANY FILTER
      // =================================================

      let selectedCompanyCode =
        null;

      if (canViewAllSocieties) {

        // -----------------------------------------------
        // Admin / Manager / Secretary
        //
        // companyCode is OPTIONAL
        //
        // If companyCode supplied:
        //     show selected society
        //
        // If companyCode not supplied:
        //     show ALL societies
        // -----------------------------------------------

        if (hasValue(companyCode)) {

          selectedCompanyCode =
            Number(companyCode);

          if (
            !Number.isInteger(
              selectedCompanyCode
            ) ||
            selectedCompanyCode <= 0
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid companyCode.",
            });
          }

          request.input(
            "CompanyCode",
            sql.Int,
            selectedCompanyCode
          );
        }

      } else {

        // -----------------------------------------------
        // NORMAL MEMBER
        //
        // FORCE OWN SOCIETY
        // -----------------------------------------------

        selectedCompanyCode =
          Number(me.CompanyCode);

        if (
          !Number.isInteger(
            selectedCompanyCode
          ) ||
          selectedCompanyCode <= 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Member has no registered society.",
          });
        }

        request.input(
          "CompanyCode",
          sql.Int,
          selectedCompanyCode
        );
      }

      // =================================================
      // MEMBER FILTER
      // =================================================

      let selectedMemberNumber =
        null;

      if (canViewAllMembers) {

        // -----------------------------------------------
        // OPTIONAL MEMBER FILTER
        // -----------------------------------------------

        if (hasValue(memberNumber)) {

          selectedMemberNumber =
            String(
              memberNumber
            ).trim();

          request.input(
            "MemberNumber",
            sql.VarChar(50),
            selectedMemberNumber
          );
        }

      } else {

        // -----------------------------------------------
        // NORMAL MEMBER
        // FORCE REGISTERED MEMBER
        // -----------------------------------------------

        if (
          !hasValue(
            me.MemberNumber
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Member has no registered member number.",
          });
        }

        selectedMemberNumber =
          String(
            me.MemberNumber
          ).trim();

        request.input(
          "MemberNumber",
          sql.VarChar(50),
          selectedMemberNumber
        );
      }

      // =================================================
      // DATES
      // =================================================

      const effectiveFromDate =
        hasValue(fromDate)
          ? String(fromDate).trim()
          : getDefaultFromDate();

      const effectiveToDate =
        hasValue(toDate)
          ? String(toDate).trim()
          : getToday();

      request.input(
        "FromDate",
        sql.Date,
        effectiveFromDate
      );

      request.input(
        "ToDate",
        sql.Date,
        effectiveToDate
      );

      // =================================================
      // DEBUG
      // =================================================

      console.log(
        "======================================"
      );

      console.log(
        "USER CODE:",
        me.UserCode
      );

      console.log(
        "USER TYPE:",
        me.UserTypeName
      );

      console.log(
        "USER TYPE CODE:",
        me.UserTypeCode
      );

      console.log(
        "REGISTERED COMPANY:",
        me.CompanyCode
      );

      console.log(
        "FRONTEND COMPANY:",
        companyCode
      );

      console.log(
        "FINAL COMPANY:",
        selectedCompanyCode
      );

      console.log(
        "MEMBER:",
        selectedMemberNumber
      );

      console.log(
        "FROM:",
        effectiveFromDate
      );

      console.log(
        "TO:",
        effectiveToDate
      );

      console.log(
        "ALL SOCIETIES:",
        canViewAllSocieties
      );

      console.log(
        "ALL MEMBERS:",
        canViewAllMembers
      );

      console.log(
        "======================================"
      );

      // =================================================
      // WHERE
      // =================================================

      let where = `
        WHERE
          p.PurchaseDate >= @FromDate

          AND p.PurchaseDate <
              DATEADD(
                DAY,
                1,
                @ToDate
              )
      `;

      // =================================================
      // COMPANY FILTER
      //
      // IMPORTANT:
      //
      // If companyCode is NOT supplied for
      // Secretary/Admin/Manager,
      // NO company condition is added.
      //
      // Therefore ALL societies are returned.
      // =================================================

      if (canViewAllSocieties) {

        if (
          selectedCompanyCode !== null
        ) {

          where += `
            AND p.CompanyCode =
                @CompanyCode
          `;
        }

      } else {

        where += `
          AND p.CompanyCode =
              @CompanyCode
        `;
      }

      // =================================================
      // MEMBER FILTER
      //
      // IMPORTANT:
      //
      // Uses p.Number
      //
      // This matches your original SQL:
      //
      // tbl_purchase.number =
      // ISNULL(@MemberNumber,tbl_purchase.Number)
      // =================================================

      if (
        selectedMemberNumber !== null
      ) {

        where += `
          AND p.Number =
              @MemberNumber
        `;
      }

      // =================================================
      // PURCHASE QUERY
      // =================================================

      const result =
        await request.query(`

          SELECT

            p.PurchaseNumber
              AS PurchaseID,

            p.PurchaseDate
              AS PurchaseDate,

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

            p.Number
              AS MemberNumber,

            m.MemberName,

            m.MobileNo
              AS MemberMobileNo,

            p.Test
              AS FatPercent,

            p.SNF
              AS SNFPercent,

            p.Qty
              AS QtyLtr,

            p.Rate,

            p.Amount,

            p.CompanyCode

          FROM tbl_Purchase p

          LEFT OUTER JOIN tbl_Member m

            ON
              p.MemberCode =
                m.MemberCode

            AND
              p.CompanyCode =
                m.CompanyCode

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

            p.PurchaseNumber DESC

        `);

      // =================================================
      // RECORDS
      // =================================================

      const records =
        result.recordset || [];

      // =================================================
      // SUMMARY
      // =================================================

      const totalQty =
        records.reduce(
          (sum, row) =>
            sum +
            Number(
              row.QtyLtr || 0
            ),
          0
        );

      const totalAmount =
        records.reduce(
          (sum, row) =>
            sum +
            Number(
              row.Amount || 0
            ),
          0
        );

      const fatSum =
        records.reduce(
          (sum, row) =>
            sum +
            Number(
              row.FatPercent || 0
            ),
          0
        );

      const snfSum =
        records.reduce(
          (sum, row) =>
            sum +
            Number(
              row.SNFPercent || 0
            ),
          0
        );

      // =================================================
      // RESPONSE
      // =================================================

      return res.status(200).json({

        success: true,

        userCode:
          me.UserCode,

        userName:
          me.UserName,

        role:
          me.UserTypeName,

        userTypeCode:
          me.UserTypeCode,

        isSecretary,

        isAdmin,

        isManager,

        canViewAllSocieties,

        canViewAllMembers,

        fullAccess:
          canViewAllSocieties,

        userCompanyCode:
          me.CompanyCode,

        userCompanyName:
          me.CompanyName || "",

        userMemberNumber:
          me.MemberNumber || null,

        registeredMobileNumber:
          me.RegisteredMobileNumber || "",

        selectedCompanyCode,

        selectedMemberNumber,

        fromDate:
          effectiveFromDate,

        toDate:
          effectiveToDate,

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
            records.length
              ? Number(
                  (
                    fatSum /
                    records.length
                  ).toFixed(2)
                )
              : 0,

          avgSnf:
            records.length
              ? Number(
                  (
                    snfSum /
                    records.length
                  ).toFixed(2)
                )
              : 0,
        },
      });

    } catch (err) {

      console.error(
        "======================================"
      );

      console.error(
        "PURCHASE API ERROR"
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
  }
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;