// =====================================================
// API PURCHASE
// Purchase Companies / Purchase Records
// =====================================================

const BASE_URL =
  "https://iplmobiledairybackend.onrender.com/api";

// =====================================================
// HANDLE API RESPONSE
// =====================================================

const handleResponse = async (response) => {
  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      message: text || "Invalid server response",
    };
  }

  console.log("======================================");
  console.log("API RESPONSE STATUS:", response.status);
  console.log("API RESPONSE BODY:", data);
  console.log("======================================");

  if (!response.ok) {
    console.error("======================================");
    console.error("API ERROR");
    console.error("STATUS:", response.status);
    console.error("STATUS TEXT:", response.statusText);
    console.error("RESPONSE:", data);
    console.error("======================================");

    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
};

// =====================================================
// VALUE CHECK
// =====================================================

const hasValue = (value) => {
  return (
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ""
  );
};

// =====================================================
// NORMALIZE VALUE
// =====================================================

const cleanValue = (value) => {
  if (!hasValue(value)) {
    return "";
  }

  return String(value).trim();
};

// =====================================================
// BUILD QUERY
// =====================================================

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (hasValue(value)) {
        query.append(
          key,
          cleanValue(value)
        );
      }
    }
  );

  return query.toString();
};

// =====================================================
// PURCHASE API
// =====================================================

export const apiPurchase = {

  // ===================================================
  // GET PURCHASE SOCIETIES
  //
  // GET /api/purchase-companies
  //
  // REQUIRED:
  //   userCode
  //
  // BACKEND ACCESS:
  //
  // ADMIN / MANAGER
  //   -> ALL SOCIETIES
  //
  // SECRETARY
  //   -> REGISTERED SOCIETY
  //
  // MEMBER
  //   -> REGISTERED SOCIETY
  // ===================================================

  getPurchaseCompanies: async (
    userCode
  ) => {
    try {

      // =================================================
      // VALIDATE USER CODE
      // =================================================

      if (!hasValue(userCode)) {
        throw new Error(
          "userCode is required to load purchase societies."
        );
      }

      // =================================================
      // QUERY
      // =================================================

      const queryString =
        buildQueryString({
          userCode,
        });

      // =================================================
      // URL
      // =================================================

      const url =
        `${BASE_URL}/purchase-companies` +
        `?${queryString}`;

      // =================================================
      // DEBUG
      // =================================================

      console.log("======================================");
      console.log("GET PURCHASE COMPANIES");
      console.log("USER CODE:", userCode);
      console.log("QUERY STRING:", queryString);
      console.log("REQUEST URL:", url);
      console.log("======================================");

      // =================================================
      // REQUEST
      // =================================================

      const response =
        await fetch(
          url,
          {
            method: "GET",

            headers: {
              Accept:
                "application/json",
            },
          }
        );

      // =================================================
      // RESPONSE
      // =================================================

      const result =
        await handleResponse(
          response
        );

      // =================================================
      // DEBUG
      // =================================================

      console.log("======================================");
      console.log(
        "PURCHASE COMPANIES RESPONSE:"
      );
      console.log(result);

      console.log(
        "COMPANY COUNT:",
        Array.isArray(result)
          ? result.length
          : Array.isArray(
              result?.companies
            )
          ? result.companies.length
          : 0
      );

      console.log("======================================");

      return result;

    } catch (error) {

      console.error("======================================");
      console.error(
        "GET PURCHASE COMPANIES ERROR:"
      );
      console.error(error);
      console.error("======================================");

      throw error;
    }
  },

  // ===================================================
  // GET PURCHASES
  //
  // GET /api/purchases
  //
  // REQUIRED:
  //   userCode
  //
  // OPTIONAL:
  //   companyCode
  //   memberNumber
  //   fromDate
  //   toDate
  //
  // EMPTY DATE:
  //   Backend should use:
  //   LAST 31 DAYS -> TODAY
  //
  // ACCESS:
  //
  // ADMIN / MANAGER
  //   -> ALL SOCIETIES
  //
  // SECRETARY
  //   -> OWN SOCIETY
  //
  // MEMBER
  //   -> OWN SOCIETY + OWN MEMBER
  // ===================================================

  getPurchases: async (
    params = {}
  ) => {
    try {

      // =================================================
      // VALIDATE PARAMS
      // =================================================

      if (
        !params ||
        typeof params !== "object"
      ) {
        throw new Error(
          "Purchase parameters are required."
        );
      }

      // =================================================
      // USER CODE REQUIRED
      // =================================================

      if (!hasValue(params.userCode)) {
        throw new Error(
          "userCode is required."
        );
      }

      // =================================================
      // CLEAN PARAMETERS
      // =================================================

      const userCode =
        cleanValue(
          params.userCode
        );

      const companyCode =
        cleanValue(
          params.companyCode
        );

      const memberNumber =
        cleanValue(
          params.memberNumber
        );

      let fromDate =
        cleanValue(
          params.fromDate
        );

      let toDate =
        cleanValue(
          params.toDate
        );

      // =================================================
      // HANDLE NULL DATE STRINGS
      //
      // Do not send:
      // "null"
      //
      // Backend will apply:
      // LAST 31 DAYS -> TODAY
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
      // QUERY PARAMETERS
      // =================================================

      const queryParams = {
        userCode,
      };

      // =================================================
      // COMPANY
      // =================================================

      if (hasValue(companyCode)) {
        queryParams.companyCode =
          companyCode;
      }

      // =================================================
      // MEMBER
      // =================================================

      if (hasValue(memberNumber)) {
        queryParams.memberNumber =
          memberNumber;
      }

      // =================================================
      // FROM DATE
      // =================================================

      if (hasValue(fromDate)) {
        queryParams.fromDate =
          fromDate;
      }

      // =================================================
      // TO DATE
      // =================================================

      if (hasValue(toDate)) {
        queryParams.toDate =
          toDate;
      }

      // =================================================
      // QUERY STRING
      // =================================================

      const queryString =
        buildQueryString(
          queryParams
        );

      // =================================================
      // URL
      // =================================================

      const url =
        `${BASE_URL}/purchases` +
        `?${queryString}`;

      // =================================================
      // DEBUG
      // =================================================

      console.log("======================================");
      console.log("GET PURCHASES");
      console.log("======================================");

      console.log(
        "USER CODE:",
        userCode
      );

      console.log(
        "COMPANY CODE:",
        companyCode || "(ALL / BACKEND DECIDES)"
      );

      console.log(
        "MEMBER NUMBER:",
        memberNumber || "(ALL / BACKEND DECIDES)"
      );

      console.log(
        "FROM DATE:",
        fromDate || "(BACKEND DEFAULT)"
      );

      console.log(
        "TO DATE:",
        toDate || "(BACKEND DEFAULT)"
      );

      console.log(
        "QUERY PARAMETERS:",
        queryParams
      );

      console.log(
        "QUERY STRING:",
        queryString
      );

      console.log(
        "REQUEST URL:",
        url
      );

      console.log("======================================");

      // =================================================
      // REQUEST
      // =================================================

      const response =
        await fetch(
          url,
          {
            method: "GET",

            headers: {
              Accept:
                "application/json",
            },
          }
        );

      // =================================================
      // RESPONSE
      // =================================================

      const result =
        await handleResponse(
          response
        );

      // =================================================
      // NORMALIZE RECORDS
      // =================================================

      const records =
        Array.isArray(
          result?.records
        )
          ? result.records
          : Array.isArray(result)
          ? result
          : [];

      // =================================================
      // DEBUG RESPONSE
      // =================================================

      console.log("======================================");
      console.log(
        "PURCHASE API RESPONSE"
      );
      console.log("======================================");

      console.log(
        "FULL RESULT:",
        result
      );

      console.log(
        "RECORD COUNT:",
        records.length
      );

      console.log(
        "SUMMARY:",
        result?.summary
      );

      console.log(
        "REGISTERED SOCIETY CODE:",
        result?.userCompanyCode
      );

      console.log(
        "REGISTERED MEMBER NUMBER:",
        result?.userMemberNumber
      );

      console.log(
        "USER TYPE:",
        result?.userTypeName
      );

      console.log(
        "USER TYPE CODE:",
        result?.userTypeCode
      );

      console.log(
        "IS SECRETARY:",
        result?.isSecretary
      );

      console.log(
        "IS MEMBER:",
        result?.isMember
      );

      console.log(
        "IS ADMIN:",
        result?.isAdmin
      );

      console.log(
        "IS MANAGER:",
        result?.isManager
      );

      console.log(
        "CAN VIEW ALL SOCIETIES:",
        result?.canViewAllSocieties
      );

      console.log(
        "CAN VIEW ALL MEMBERS:",
        result?.canViewAllMembers
      );

      console.log(
        "======================================");

      // =================================================
      // RETURN
      // =================================================

      return result;

    } catch (error) {

      console.error("======================================");
      console.error(
        "GET PURCHASES ERROR:"
      );
      console.error(error);
      console.error("======================================");

      throw error;
    }
  },
};

// =====================================================
// DEFAULT EXPORT
// =====================================================

export default apiPurchase;