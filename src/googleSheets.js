import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure Google Auth Provider with Google Sheets & Drive scopes
export const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: "consent",
  access_type: "online",
});

export const DEFAULT_SPREADSHEET_ID = "1usHttm2gWyLA11umygGUJwqwiqAQ-9iTDBVXoedapOc";
export const DEFAULT_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit?gid=0#gid=0`;

export const SHEET_COLUMNS = [
  { key: "caseId", header: "Case ID" },
  { key: "reportDate", header: "Report Date" },
  { key: "reportType", header: "Report Type" },
  { key: "status", header: "Status" },
  { key: "followUpDate", header: "Follow-Up Date" },
  { key: "victimName", header: "Victim Name" },
  { key: "victimGender", header: "Victim Gender" },
  { key: "victimAge", header: "Victim Age" },
  { key: "victimDisability", header: "Victim Disability" },
  { key: "district", header: "District" },
  { key: "traditionalAuthority", header: "Traditional Authority" },
  { key: "village", header: "Village" },
  { key: "guardianName", header: "Guardian Name" },
  { key: "guardianContact", header: "Guardian Contact" },
  { key: "perpetratorName", header: "Perpetrator Name(s)" },
  { key: "perpetratorGender", header: "Perpetrator Gender" },
  { key: "perpetratorAge", header: "Perpetrator Age" },
  { key: "relationshipToVictim", header: "Relationship to Victim" },
  { key: "perpetratorLocation", header: "Perpetrator Location" },
  { key: "abuseType", header: "Abuse Type" },
  { key: "description", header: "Description of Incident" },
  { key: "incidentLocation", header: "Location of Incident" },
  { key: "incidentDate", header: "Date of Incident" },
  { key: "reportedBy", header: "Reported By" },
  { key: "assignedTo", header: "Assigned To" },
  { key: "resolutionNotes", header: "Resolution Notes" },
  { key: "referralMadeTo", header: "Referral Made To" },
  { key: "confidentialityLevel", header: "Confidentiality Level" },
  { key: "consentObtained", header: "Consent Obtained" },
  { key: "additionalNotes", header: "Additional Notes" },
];

export const SHEET_HEADERS = SHEET_COLUMNS.map((c) => c.header);
export const HEADER_TO_KEY = {};
export const KEY_TO_HEADER = {};
SHEET_COLUMNS.forEach((c) => {
  HEADER_TO_KEY[c.header.toLowerCase().trim()] = c.key;
  KEY_TO_HEADER[c.key] = c.header;
});

// Cache the access token in memory (never localStorage)
let cachedAccessToken = null;
let isSigningIn = false;

export const getAccessToken = async () => cachedAccessToken;

export const initAuth = (onAuthSuccess, onAuthFailure) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Need user interaction to get new credential token
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async () => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to obtain OAuth access token for Google Sheets from Firebase Auth");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error("Google Sign-In error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export function extractSpreadsheetId(input) {
  if (!input) return DEFAULT_SPREADSHEET_ID;
  const str = input.trim();
  const match = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return str;
}

/**
 * Fetch spreadsheet metadata (title, list of sheets)
 */
export async function getSpreadsheetDetails(spreadsheetId, token) {
  const tokenToUse = token || cachedAccessToken;
  if (!tokenToUse) {
    throw new Error("Google authentication required. Please sign in with Google.");
  }
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=spreadsheetId,properties.title,sheets.properties`, {
    headers: {
      Authorization: `Bearer ${tokenToUse}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData?.error?.message || `Google Sheets API error (${res.status})`;
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Google Sheets access denied: ${message}. Please ensure you have permission to view this sheet or re-authenticate.`);
    }
    if (res.status === 404) {
      throw new Error(`Spreadsheet not found (ID: ${cleanId}). Check the URL/ID and sharing settings.`);
    }
    throw new Error(message);
  }

  const data = await res.json();
  const sheets = (data.sheets || []).map((s) => ({
    sheetId: s.properties.sheetId,
    title: s.properties.title,
    rowCount: s.properties.gridProperties?.rowCount || 0,
    columnCount: s.properties.gridProperties?.columnCount || 0,
  }));

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || "Untitled Spreadsheet",
    sheets,
    primarySheetTitle: sheets[0]?.title || "Sheet1",
  };
}

/**
 * Ensure standard 30-column header exists in sheet
 */
export async function ensureSheetHeaders(spreadsheetId, sheetTitle, token) {
  const tokenToUse = token || cachedAccessToken;
  if (!tokenToUse) return;

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const targetSheet = sheetTitle || "Cases";

  // Check row 1
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(targetSheet)}!A1:AD1`,
      {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const existingHeaders = data.values?.[0] || [];
      if (existingHeaders.length > 0 && String(existingHeaders[0]).trim().toLowerCase() === "case id") {
        return; // Headers already present
      }
    }

    // Write headers
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(targetSheet)}!A1:AD1?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: `${targetSheet}!A1:AD1`,
          majorDimension: "ROWS",
          values: [SHEET_HEADERS],
        }),
      }
    );
  } catch (err) {
    console.warn("Could not auto-verify sheet headers:", err);
  }
}

/**
 * Convert a case object to a row array of 30 columns
 */
export function caseToRow(caseItem) {
  return SHEET_COLUMNS.map((col) => {
    const val = caseItem[col.key];
    return val !== undefined && val !== null ? String(val) : "";
  });
}

/**
 * Convert a row array back into a structured case object
 */
export function rowToCase(row, headerMap = HEADER_TO_KEY) {
  const item = {
    caseId: "",
    reportDate: "",
    reportType: "Initial-Report",
    status: "Open",
    followUpDate: "",
    victimName: "",
    victimGender: "",
    victimAge: "",
    victimDisability: "",
    district: "",
    traditionalAuthority: "",
    village: "",
    guardianName: "",
    guardianContact: "",
    perpetratorName: "",
    perpetratorGender: "",
    perpetratorAge: "",
    relationshipToVictim: "",
    perpetratorLocation: "",
    abuseType: "Physical",
    description: "",
    incidentLocation: "",
    incidentDate: "",
    reportedBy: "",
    assignedTo: "",
    resolutionNotes: "",
    referralMadeTo: "",
    confidentialityLevel: "High",
    consentObtained: "Yes",
    additionalNotes: "",
  };

  row.forEach((cell, idx) => {
    const headerName = SHEET_HEADERS[idx];
    const key = headerName ? HEADER_TO_KEY[headerName.toLowerCase().trim()] : null;
    if (key && cell !== undefined && cell !== null) {
      item[key] = String(cell).trim();
    }
  });

  return item;
}

/**
 * Read all cases from the Google Sheet
 */
export async function pullCasesFromGoogleSheet(spreadsheetId, sheetTitle, token) {
  const tokenToUse = token || cachedAccessToken;
  if (!tokenToUse) {
    throw new Error("Please sign in with Google to read from Google Sheets.");
  }

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const targetSheet = sheetTitle || "Sheet1";

  // Fetch sheet rows (up to 2000 rows, 30 columns)
  const range = `${targetSheet}!A1:AD2000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${tokenToUse}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `Failed to read sheet (${res.status})`;
    throw new Error(msg);
  }

  const data = await res.json();
  const rows = data.values || [];

  if (rows.length === 0) {
    return [];
  }

  // First row is headers
  const headerRow = rows[0] || [];
  const dynamicHeaderMap = {};
  headerRow.forEach((h, i) => {
    const cleaned = String(h).toLowerCase().trim();
    if (HEADER_TO_KEY[cleaned]) {
      dynamicHeaderMap[i] = HEADER_TO_KEY[cleaned];
    }
  });

  const parsedCases = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === "" || c === null || c === undefined)) continue;

    const item = {
      caseId: "",
      reportDate: "",
      reportType: "Initial-Report",
      status: "Open",
      followUpDate: "",
      victimName: "",
      victimGender: "",
      victimAge: "",
      victimDisability: "",
      district: "",
      traditionalAuthority: "",
      village: "",
      guardianName: "",
      guardianContact: "",
      perpetratorName: "",
      perpetratorGender: "",
      perpetratorAge: "",
      relationshipToVictim: "",
      perpetratorLocation: "",
      abuseType: "Physical",
      description: "",
      incidentLocation: "",
      incidentDate: "",
      reportedBy: "",
      assignedTo: "",
      resolutionNotes: "",
      referralMadeTo: "",
      confidentialityLevel: "High",
      consentObtained: "Yes",
      additionalNotes: "",
    };

    row.forEach((cellVal, colIdx) => {
      const key = dynamicHeaderMap[colIdx] || (SHEET_HEADERS[colIdx] ? HEADER_TO_KEY[SHEET_HEADERS[colIdx].toLowerCase()] : null);
      if (key && cellVal !== undefined && cellVal !== null) {
        item[key] = String(cellVal).trim();
      }
    });

    if (item.caseId) {
      parsedCases.push(item);
    }
  }

  return parsedCases;
}

/**
 * Save or update a single case in Google Sheets
 */
export async function pushCaseToGoogleSheet(spreadsheetId, sheetTitle, caseData, token) {
  const tokenToUse = token || cachedAccessToken;
  if (!tokenToUse) {
    throw new Error("Please sign in with Google to save to Google Sheets.");
  }

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const targetSheet = sheetTitle || "Sheet1";

  // Ensure headers exist
  await ensureSheetHeaders(cleanId, targetSheet, tokenToUse);

  // Read existing Case IDs in column A
  const colARes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(targetSheet)}!A1:A2000`,
    {
      headers: { Authorization: `Bearer ${tokenToUse}` },
    }
  );

  let existingRowIndex = -1;
  if (colARes.ok) {
    const colAData = await colARes.json();
    const rows = colAData.values || [];
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i]?.[0] || "").trim() === String(caseData.caseId).trim()) {
        existingRowIndex = i + 1; // 1-indexed for Sheets range
        break;
      }
    }
  }

  const rowValues = caseToRow(caseData);

  if (existingRowIndex > 0) {
    // Update existing row
    const updateRange = `${targetSheet}!A${existingRowIndex}:AD${existingRowIndex}`;
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: updateRange,
          majorDimension: "ROWS",
          values: [rowValues],
        }),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Failed to update case in Google Sheet.");
    }
    return { action: "updated", rowIndex: existingRowIndex };
  } else {
    // Append new row
    const appendRange = `${targetSheet}!A:AD`;
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: appendRange,
          majorDimension: "ROWS",
          values: [rowValues],
        }),
      }
    );

    if (!appendRes.ok) {
      const err = await appendRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Failed to append case to Google Sheet.");
    }
    return { action: "appended" };
  }
}

/**
 * Delete a case row from Google Sheets by clearing its values or shifting
 */
export async function deleteCaseFromGoogleSheet(spreadsheetId, sheetTitle, caseId, token) {
  const tokenToUse = token || cachedAccessToken;
  if (!tokenToUse) {
    throw new Error("Please sign in with Google to delete from Google Sheets.");
  }

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const targetSheet = sheetTitle || "Sheet1";

  // Find the row
  const colARes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(targetSheet)}!A1:A2000`,
    {
      headers: { Authorization: `Bearer ${tokenToUse}` },
    }
  );

  if (!colARes.ok) {
    throw new Error("Unable to locate case row in Google Sheet.");
  }

  const colAData = await colARes.json();
  const rows = colAData.values || [];
  let targetRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i]?.[0] || "").trim() === String(caseId).trim()) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return { action: "not_found" };
  }

  // Clear the row
  const clearRange = `${targetSheet}!A${targetRow}:AD${targetRow}`;
  const clearRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(clearRange)}:clear`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenToUse}` },
    }
  );

  if (!clearRes.ok) {
    const err = await clearRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to clear case row in Google Sheet.");
  }

  return { action: "deleted", rowIndex: targetRow };
}

/**
 * Batch synchronize all cases to Google Sheet (overwrites sheet contents cleanly)
 */
export async function syncAllCasesToGoogleSheet(spreadsheetId, sheetTitle, cases, token) {
  const tokenToUse = token || cachedAccessToken;
  if (!tokenToUse) {
    throw new Error("Please sign in with Google to sync with Google Sheets.");
  }

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const targetSheet = sheetTitle || "Sheet1";

  // Build matrix of headers + all rows
  const allRows = [SHEET_HEADERS, ...cases.map(caseToRow)];

  // Clear existing range first
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(targetSheet)}!A1:AD2000:clear`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenToUse}` },
    }
  );

  // Write new data
  const writeRange = `${targetSheet}!A1:AD${allRows.length}`;
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(writeRange)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${tokenToUse}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        range: writeRange,
        majorDimension: "ROWS",
        values: allRows,
      }),
    }
  );

  if (!writeRes.ok) {
    const err = await writeRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to batch upload cases to Google Sheet.");
  }

  return { success: true, count: cases.length };
}
