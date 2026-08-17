const express = require("express");
const router = express.Router();

const sql = require("mssql");
const { getPool } = require("../db");
router.get("/usertypes", async (req, res) => {
  try {
    console.log("GET /api/usertypes");

    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        UserTypeCode,
        UserTypeName
      FROM tbl_UserType
      ORDER BY UserTypeCode
    `);

    console.log("USER TYPES:", result.recordset);

    res.status(200).json(result.recordset);

  } catch (error) {
    console.error("GET /api/usertypes ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load user types",
      error: error.message,
    });
  }
});
router.get("/Company", async (req, res) => {
  try {
    console.log("GET /api/Company");

    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        CompanyCode,
        EDNO,
        Header1,
        Header2,
        MobileNo
      FROM tbl_Company
      WHERE
        LEN(ISNULL(MobileNo, '')) = 10
        AND EDNO > 0
      ORDER BY CompanyCode
    `);

    const companies = result.recordset.map((row) => ({
      CompanyCode: row.CompanyCode,
      EDNO: row.EDNO,
      CompanyName:
        `${row.Header1 || ""} ${row.Header2 || ""}`.trim(),
      MobileNo: row.MobileNo,
    }));

    console.log("COMPANIES:", companies.length);

    res.status(200).json(companies);

  } catch (error) {
    console.error("GET /api/Company ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load companies",
      error: error.message,
    });
  }
});

module.exports = router;
