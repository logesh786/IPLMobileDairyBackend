// const sql = require('mssql');
// require('dotenv').config();

// // SQL Server 2008 note:
// // The mssql package uses the "tedious" driver under the hood. Tedious defaults
// // to a newer TDS protocol version than SQL Server 2008 speaks, so we pin
// // tdsVersion to 7_3_A (or 7_2, try either if you get a connection/version
// // error) via options below.
// const config = {
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   server: process.env.DB_SERVER,
//   database: process.env.DB_NAME,
//   port: Number(process.env.DB_PORT) || 1433,
//   options: {
//     encrypt: false,            // SQL Server 2008 usually has no SSL cert configured
//     trustServerCertificate: true,
//     tdsVersion: '7_3_A',       // compatibility for SQL Server 2008. Try '7_2' if this fails.
//     enableArithAbort: true,
//   },
//   pool: {
//     max: 10,
//     min: 0,
//     idleTimeoutMillis: 30000,
//   },
// };

// // Named instance support (e.g. IPL2008, SQLEXPRESS) - only used if DB_INSTANCE is set.
// // IMPORTANT: when connecting to a named instance, do NOT also pass a fixed port -
// // tedious resolves the real port via the SQL Server Browser service (UDP 1434).
// // Passing both at the same time is a common cause of connection timeouts.
// if (process.env.DB_INSTANCE) {
//   config.options.instanceName = process.env.DB_INSTANCE;
//   delete config.port;
// }

// let poolPromise;

// function getPool() {
//   if (!poolPromise) {
//     poolPromise = new sql.ConnectionPool(config)
//       .connect()
//       .then((pool) => {
//         console.log('Connected to SQL Server (LoginDB)');
//         return pool;
//       })
//       .catch((err) => {
//         console.error('Database connection failed:', err);
//         poolPromise = null;
//         throw err;
//       });
//   }
//   return poolPromise;
// }

// module.exports = { sql, getPool };

const sql = require("mssql");
require("dotenv").config();

const config = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),

  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },

  connectionTimeout: 30000,
  requestTimeout: 30000,
};

let pool;

async function getPool() {
  if (pool) {
    return pool;
  }

  try {
    console.log("Connecting to SQL Server...");
    console.log("Server:", config.server);
    console.log("Port:", config.port);
    console.log("Database:", config.database);

    pool = await sql.connect(config);

    console.log("✅ Database connected successfully");

    return pool;
  } catch (error) {
    console.error("❌ Database connection failed:", error);

    pool = null;
    throw error;
  }
}

module.exports = {
  sql,
  getPool,
};