import React, { useState, useMemo, useRef, useEffect } from "react";
import Papa from "papaparse";
import {
  ShieldCheck, ClipboardList, LayoutGrid, FileText, Sparkles,
  Upload, Download, Search, X, Printer, Copy, Check, AlertCircle,
  ChevronRight, Plus, Loader2, Settings, RefreshCw, CloudOff, Cloud,
  Filter, TrendingUp, Users, ShieldAlert, CheckCircle2, UserCheck,
  Building, AlertTriangle, Camera, Image as ImageIcon, FileSpreadsheet,
  Code, CheckCircle, HelpCircle, ExternalLink, LogIn, LogOut, Lock,
  Share2, ArrowDownToLine, ArrowUpFromLine
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  auth,
  SCOPES,
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_SPREADSHEET_URL,
  SHEET_HEADERS,
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  extractSpreadsheetId,
  getSpreadsheetDetails,
  ensureSheetHeaders,
  pullCasesFromGoogleSheet,
  pushCaseToGoogleSheet,
  deleteCaseFromGoogleSheet,
  syncAllCasesToGoogleSheet,
} from "./googleSheets";

/* ---------------------------------------------------------------------- */
/*  Design tokens                                                          */
/* ---------------------------------------------------------------------- */
const COLOR = {
  ink: "#1B2430",
  inkSoft: "#4A5568",
  paper: "#F5F4EF",
  paperRaised: "#FFFFFF",
  line: "#DDD9CE",
  teal: "#0F5257",
  tealDeep: "#0A3A3E",
  tealSoft: "#E4EEEC",
  sage: "#7C9885",
  amber: "#C97B2E",
  amberSoft: "#F6E7D5",
  rose: "#A8464B",
  roseSoft: "#F3E1DF",
};

const FONTS_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');";

/* ---------------------------------------------------------------------- */
/*  Reference data                                                         */
/* ---------------------------------------------------------------------- */
const MALAWI_DISTRICTS = [
  "Balaka","Blantyre","Chikwawa","Chiradzulu","Chitipa","Dedza","Dowa","Karonga",
  "Kasungu","Likoma","Lilongwe","Machinga","Mangochi","Mchinji","Mulanje","Mwanza",
  "Mzimba","Neno","Nkhatabay","Nkhotakota","Nsanje","Ntcheu","Ntchisi","Phalombe",
  "Rumphi","Salima","Thyolo","Zomba"
];

const STATUS_OPTIONS = ["Open", "In Progress", "Referred", "Closed"];
const REPORT_TYPES = ["Initial-Report", "Follow-up"];
const ABUSE_TYPES = ["Sexual", "Physical", "Emotional", "Exploitation", "Neglect", "Other"];
const GENDERS = ["Female", "Male", "Not disclosed / Not stated"];
const CONFIDENTIALITY_LEVELS = ["High", "Medium", "Low"];
const CONSENT_OPTIONS = ["Yes", "No", "N/A"];

const STATUS_COLOR = {
  "Open": COLOR.rose,
  "In Progress": COLOR.amber,
  "Referred": COLOR.teal,
  "Closed": COLOR.sage,
};

/* Column definition — order matches the source register exactly */
const FIELDS = [
  { key: "caseId", label: "Case ID", group: "Case Information", auto: true },
  { key: "reportDate", label: "Report Date", group: "Case Information", type: "date" },
  { key: "reportType", label: "Report Type", group: "Case Information", type: "select", options: REPORT_TYPES },
  { key: "status", label: "Status", group: "Case Information", type: "select", options: STATUS_OPTIONS },
  { key: "followUpDate", label: "Follow-Up Date", group: "Case Information", type: "date" },
  { key: "victimName", label: "Victim Name", group: "Victim Information" },
  { key: "victimGender", label: "Victim Gender", group: "Victim Information", type: "select", options: GENDERS },
  { key: "victimAge", label: "Victim Age", group: "Victim Information" },
  { key: "victimDisability", label: "Victim Disability", group: "Victim Information" },
  { key: "district", label: "District", group: "Victim Information", type: "select", options: MALAWI_DISTRICTS },
  { key: "traditionalAuthority", label: "Traditional Authority", group: "Victim Information" },
  { key: "village", label: "Village", group: "Victim Information" },
  { key: "guardianName", label: "Guardian Name", group: "Victim Information" },
  { key: "guardianContact", label: "Guardian Contact", group: "Victim Information" },
  { key: "perpetratorName", label: "Perpetrator Name(s)", group: "Perpetrator Information" },
  { key: "perpetratorGender", label: "Perpetrator Gender", group: "Perpetrator Information", type: "select", options: GENDERS },
  { key: "perpetratorAge", label: "Perpetrator Age", group: "Perpetrator Information" },
  { key: "relationshipToVictim", label: "Relationship to Victim", group: "Perpetrator Information" },
  { key: "perpetratorLocation", label: "Perpetrator Location", group: "Perpetrator Information" },
  { key: "abuseType", label: "Abuse Type", group: "Incident Details", type: "select", options: ABUSE_TYPES },
  { key: "description", label: "Description of Incident", group: "Incident Details", type: "textarea" },
  { key: "incidentLocation", label: "Location of Incident", group: "Incident Details" },
  { key: "incidentDate", label: "Date of Incident", group: "Incident Details" },
  { key: "reportedBy", label: "Reported By", group: "Reporting & Handling" },
  { key: "assignedTo", label: "Assigned To", group: "Reporting & Handling" },
  { key: "resolutionNotes", label: "Resolution Notes", group: "Reporting & Handling", type: "textarea" },
  { key: "referralMadeTo", label: "Referral Made To", group: "Reporting & Handling" },
  { key: "confidentialityLevel", label: "Confidentiality Level", group: "Safeguards & Confidentiality", type: "select", options: CONFIDENTIALITY_LEVELS },
  { key: "consentObtained", label: "Consent Obtained", group: "Safeguards & Confidentiality", type: "select", options: CONSENT_OPTIONS },
  { key: "additionalNotes", label: "Additional Notes", group: "Safeguards & Confidentiality", type: "textarea" },
];

const CSV_HEADER_MAP = {
  "Case ID": "caseId", "Report Date": "reportDate", "Report Type": "reportType",
  "Status": "status", "Follow-Up Date": "followUpDate", "Victim Name": "victimName",
  "Victim Gender": "victimGender", "Victim Age": "victimAge", "Victim Disability": "victimDisability",
  "District": "district", "Traditional Authority": "traditionalAuthority", "Village": "village",
  "Guardian Name": "guardianName", "Guardian Contact": "guardianContact",
  "Perpetrator Name(s)": "perpetratorName", "Perpetrator Gender": "perpetratorGender",
  "Perpetrator Age": "perpetratorAge", "Relationship to Victim": "relationshipToVictim",
  "Perpetrator Location": "perpetratorLocation", "Abuse Type": "abuseType",
  "Description of Incident": "description", "Location of Incident": "incidentLocation",
  "Date of Incident": "incidentDate", "Reported By": "reportedBy", "Assigned To": "assignedTo",
  "Resolution Notes": "resolutionNotes", "Referral Made To": "referralMadeTo",
  "Confidentiality Level": "confidentialityLevel", "Consent Obtained": "consentObtained",
  "Additional Notes": "additionalNotes",
};

function emptyCase() {
  const c = {};
  FIELDS.forEach((f) => (c[f.key] = ""));
  return c;
}

function generateCaseId(existing) {
  const now = new Date();
  const stamp =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") + "-" +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");
  let id = `CPW-${stamp}`;
  let n = 1;
  while (existing.some((c) => c.caseId === id)) {
    id = `CPW-${stamp}-${n}`;
    n += 1;
  }
  return id;
}

/* ---------------------------------------------------------------------- */
/*  Image Processing Helper                                               */
/* ---------------------------------------------------------------------- */
function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      return reject(new Error("Selected file is not an image"));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.replace(/^data:[^;]+;base64,/, "");
        resolve({
          dataUrl,
          base64,
          mimeType: "image/jpeg",
          name: file.name,
          size: `${Math.round(file.size / 1024)} KB`,
        });
      };
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

/* ---------------------------------------------------------------------- */
/*  Gemini API helper — calls /api/gemini/generate server endpoint so the */
/*  API key remains safely on the server.                                 */
/* ---------------------------------------------------------------------- */
async function callGemini(prompt, { image, images, json = false, systemInstruction } = {}) {
  let res;
  try {
    res = await fetch("/api/gemini/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        image,
        images,
        json,
        systemInstruction,
      }),
    });
  } catch (networkError) {
    throw new Error(
      "Network connection error: Unable to reach the AI server endpoint. Please verify your connection."
    );
  }

  if (!res.ok) {
    let errorDetail = "";
    try {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const errData = await res.json();
        errorDetail = errData.error || errData.message || JSON.stringify(errData);
      } else {
        const text = await res.text();
        if (res.status === 404) {
          errorDetail = "API route not found (404). If deployed on Netlify, ensure Netlify Functions are deployed and GEMINI_API_KEY is configured in Netlify Site Configuration → Environment variables.";
        } else {
          errorDetail = text.slice(0, 150) || `HTTP Error ${res.status}`;
        }
      }
    } catch {
      errorDetail = `HTTP ${res.status} ${res.statusText}`;
    }

    if (typeof errorDetail === "string" && errorDetail.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(errorDetail);
        if (parsed?.error?.message) {
          errorDetail = parsed.error.message;
        }
      } catch {
        // ignore parse error
      }
    }

    if (errorDetail.includes("GEMINI_API_KEY")) {
      throw new Error("GEMINI_API_KEY is not configured. On Netlify, add GEMINI_API_KEY in Site Settings → Environment variables, then trigger a redeploy.");
    }
    if (errorDetail.includes("503") || errorDetail.includes("high demand") || errorDetail.includes("UNAVAILABLE") || errorDetail.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("Gemini is currently experiencing temporary high traffic. Automatic fallback has been configured — please click 'Try again'.");
    }
    throw new Error(errorDetail || "AI request failed");
  }

  const data = await res.json();
  if (json) {
    return data.data || (typeof data.text === "string" ? JSON.parse(data.text) : data.text);
  }
  return data.text || "";
}

/* ---------------------------------------------------------------------- */
/*  Storage shim — this build runs outside the Claude artifact sandbox,    */
/*  so window.storage isn't available; localStorage covers the same need  */
/*  here (just remembering the Sheet sync URL per browser).                */
/* ---------------------------------------------------------------------- */
const storage = {
  async get(key) {
    const v = localStorage.getItem(key);
    return v === null ? null : { value: v };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { value };
  },
};

/* ---------------------------------------------------------------------- */
/*  Complete 30-Column Google Apps Script Template for Users               */
/* ---------------------------------------------------------------------- */
const COMPLETE_APPS_SCRIPT_CODE = `/**
 * National Children's Commission - Child Protection Register
 * Google Apps Script Web App (2-Way Full 30-Column Sync)
 */

const SHEET_NAME = "Cases";

const HEADERS = [
  "Case ID", "Report Date", "Report Type", "Status", "Follow-Up Date",
  "Victim Name", "Victim Gender", "Victim Age", "Victim Disability",
  "District", "Traditional Authority", "Village", "Guardian Name", "Guardian Contact",
  "Perpetrator Name(s)", "Perpetrator Gender", "Perpetrator Age", "Relationship to Victim", "Perpetrator Location",
  "Abuse Type", "Description of Incident", "Location of Incident", "Date of Incident",
  "Reported By", "Assigned To", "Resolution Notes", "Referral Made To",
  "Confidentiality Level", "Consent Obtained", "Additional Notes"
];

const KEY_TO_HEADER = {
  caseId: "Case ID", reportDate: "Report Date", reportType: "Report Type",
  status: "Status", followUpDate: "Follow-Up Date", victimName: "Victim Name",
  victimGender: "Victim Gender", victimAge: "Victim Age", victimDisability: "Victim Disability",
  district: "District", traditionalAuthority: "Traditional Authority", village: "Village",
  guardianName: "Guardian Name", guardianContact: "Guardian Contact",
  perpetratorName: "Perpetrator Name(s)", perpetratorGender: "Perpetrator Gender",
  perpetratorAge: "Perpetrator Age", relationshipToVictim: "Relationship to Victim",
  perpetratorLocation: "Perpetrator Location", abuseType: "Abuse Type",
  description: "Description of Incident", incidentLocation: "Location of Incident",
  incidentDate: "Date of Incident", reportedBy: "Reported By", assignedTo: "Assigned To",
  resolutionNotes: "Resolution Notes", referralMadeTo: "Referral Made To",
  confidentialityLevel: "Confidentiality Level", consentObtained: "Consent Obtained",
  additionalNotes: "Additional Notes"
};

const HEADER_TO_KEY = {};
Object.keys(KEY_TO_HEADER).forEach(function(k) {
  HEADER_TO_KEY[KEY_TO_HEADER[k]] = k;
});

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow === 0 || lastCol === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#E4EEEC");
    sheet.setFrozenRows(1);
  } else {
    const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (existingHeaders.length < HEADERS.length || existingHeaders[0] !== "Case ID") {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#E4EEEC");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function doGet(e) {
  try {
    const sheet = getOrCreateSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return respondJson({ success: true, count: 0, cases: [] });
    }
    
    const headers = data[0].map(function(h) { return String(h).trim(); });
    const cases = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.every(function(c) { return c === "" || c === null || c === undefined; })) continue;
      
      const item = {};
      Object.keys(KEY_TO_HEADER).forEach(function(k) {
        item[k] = "";
      });
      
      headers.forEach(function(h, colIdx) {
        const key = HEADER_TO_KEY[h];
        if (key && row[colIdx] !== undefined && row[colIdx] !== null) {
          let val = row[colIdx];
          if (val instanceof Date) {
            val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
          }
          item[key] = String(val).trim();
        }
      });
      
      if (item.caseId) {
        cases.push(item);
      }
    }
    
    return respondJson({ success: true, count: cases.length, cases: cases });
  } catch (err) {
    return respondJson({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (ex) {
        body = e.parameter || {};
      }
    } else if (e && e.parameter) {
      body = e.parameter;
    }
    
    const action = body.action || "upsert";
    const sheet = getOrCreateSheet();
    
    if (action === "upsert") {
      const caseData = body.case;
      if (!caseData || !caseData.caseId) {
        return respondJson({ success: false, error: "Missing case or caseId in payload" });
      }
      
      const allData = sheet.getDataRange().getValues();
      let rowIndex = -1;
      
      for (let i = 1; i < allData.length; i++) {
        if (String(allData[i][0]).trim() === String(caseData.caseId).trim()) {
          rowIndex = i + 1;
          break;
        }
      }
      
      const rowValues = HEADERS.map(function(headerName) {
        const key = HEADER_TO_KEY[headerName];
        const val = caseData[key];
        return val !== undefined && val !== null ? String(val) : "";
      });
      
      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
      }
      
      return respondJson({ success: true, message: "Case saved", caseId: caseData.caseId });
    }
    
    if (action === "delete") {
      const caseId = body.caseId;
      if (!caseId) {
        return respondJson({ success: false, error: "Missing caseId for deletion" });
      }
      const allData = sheet.getDataRange().getValues();
      for (let i = 1; i < allData.length; i++) {
        if (String(allData[i][0]).trim() === String(caseId).trim()) {
          sheet.deleteRow(i + 1);
          return respondJson({ success: true, message: "Case deleted", caseId: caseId });
        }
      }
      return respondJson({ success: true, message: "Case not found (already deleted)" });
    }
    
    return respondJson({ success: false, error: "Unknown action: " + action });
  } catch (err) {
    return respondJson({ success: false, error: err.toString() });
  }
}

function respondJson(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

/* ---------------------------------------------------------------------- */
/*  Google Sheet sync (via a deployed Apps Script web app)                 */
/* ---------------------------------------------------------------------- */
async function sheetPull(url) {
  let res;
  try {
    const separator = url.includes("?") ? "&" : "?";
    res = await fetch(`${url}${separator}action=list&t=${Date.now()}`, {
      method: "GET",
      mode: "cors",
      redirect: "follow",
    });
  } catch (err) {
    throw new Error("Cannot reach Google Sheet. Check your internet connection and verify the Apps Script URL.");
  }

  const rawText = await res.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    if (rawText.includes("accounts.google.com") || rawText.includes("<!DOCTYPE html>")) {
      throw new Error("Authorization error: The Google Apps Script must be deployed with 'Who has access: Anyone' (currently set to 'Only myself').");
    }
    throw new Error("Google Sheet returned an unexpected response format.");
  }

  if (!data.success) {
    throw new Error(data.error || "Google Sheet returned an error");
  }

  // Normalize all 30 fields so every section is populated
  const normalized = (data.cases || []).map((c) => {
    const obj = emptyCase();
    FIELDS.forEach((f) => {
      if (c[f.key] !== undefined && c[f.key] !== null) {
        obj[f.key] = String(c[f.key]);
      } else if (c[f.label] !== undefined && c[f.label] !== null) {
        obj[f.key] = String(c[f.label]);
      }
    });
    return obj;
  });

  return normalized;
}

async function sheetPush(url, action, payload) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      mode: "cors",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(action === "delete" ? { action, caseId: payload } : { action, case: payload }),
    });
  } catch (err) {
    throw new Error("Network error connecting to Google Sheet.");
  }

  const rawText = await res.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    if (rawText.includes("accounts.google.com") || rawText.includes("<!DOCTYPE html>")) {
      throw new Error("Authorization error: The Google Apps Script must be deployed with 'Who has access: Anyone'.");
    }
    throw new Error("Invalid response received from Google Apps Script Web App.");
  }

  if (!data.success) {
    throw new Error(data.error || "Sheet rejected the write");
  }
  return data;
}

function GoogleSignInButton({ onClick, loading, label = "Sign in with Google" }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        background: "#FFFFFF",
        color: "#3c4043",
        border: `1px solid ${COLOR.line}`,
        borderRadius: 8,
        padding: "8px 16px",
        fontFamily: "'Google Sans', Roboto, Inter, sans-serif",
        fontSize: 13,
        fontWeight: 500,
        cursor: loading ? "wait" : "pointer",
        boxShadow: "0 1px 2px rgba(60,64,67,0.08)",
        transition: "background 0.15s, box-shadow 0.15s",
      }}
      onMouseOver={(e) => (e.currentTarget.style.boxShadow = "0 1px 3px 1px rgba(60,64,67,0.15)")}
      onMouseOut={(e) => (e.currentTarget.style.boxShadow = "0 1px 2px rgba(60,64,67,0.08)")}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" color={COLOR.tealDeep} />
      ) : (
        <svg width="18" height="18" viewBox="0 0 48 48" style={{ display: "block" }}>
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          <path fill="none" d="M0 0h48v48H0z" />
        </svg>
      )}
      <span>{loading ? "Authenticating…" : label}</span>
    </button>
  );
}

function SyncSettingsModal({
  spreadsheetId,
  sheetTab,
  onUpdateSheetConfig,
  googleUser,
  onGoogleLogin,
  onGoogleLogout,
  webhookUrl,
  onSaveWebhookUrl,
  onPullDirect,
  onPushAllDirect,
  onClose,
  isBusy,
  statusMessage,
}) {
  const [activeTab, setActiveTab] = useState("direct"); // direct | webhook | code
  const [targetIdInput, setTargetIdInput] = useState(spreadsheetId || DEFAULT_SPREADSHEET_ID);
  const [selectedTab, setSelectedTab] = useState(sheetTab || "Sheet1");
  const [availableTabs, setAvailableTabs] = useState([]);
  const [sheetMeta, setSheetMeta] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [authError, setAuthError] = useState("");
  const [localWebhook, setLocalWebhook] = useState(webhookUrl || "");
  const [copiedCode, setCopiedCode] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [confirmBatchPush, setConfirmBatchPush] = useState(false);

  const cleanId = extractSpreadsheetId(targetIdInput);
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;

  // Fetch sheet details when user is signed in or target changes
  const fetchMetadata = async () => {
    if (!googleUser) return;
    setLoadingMeta(true);
    setAuthError("");
    try {
      const meta = await getSpreadsheetDetails(cleanId);
      setSheetMeta(meta);
      const tabNames = meta.sheets.map((s) => s.title);
      setAvailableTabs(tabNames);
      if (!tabNames.includes(selectedTab) && tabNames.length > 0) {
        setSelectedTab(tabNames[0]);
      }
    } catch (err) {
      setAuthError(err.message || "Failed to access spreadsheet.");
    } finally {
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    if (googleUser && cleanId) {
      fetchMetadata();
    }
  }, [googleUser, cleanId]);

  const handleLoginClick = async () => {
    setAuthError("");
    try {
      await onGoogleLogin();
    } catch (err) {
      setAuthError(err.message || "Google Sign-In failed.");
    }
  };

  const handlePullClick = async () => {
    setActionSuccess("");
    setAuthError("");
    try {
      const count = await onPullDirect(cleanId, selectedTab);
      setActionSuccess(`Successfully pulled ${count} record(s) from Google Sheet.`);
    } catch (err) {
      setAuthError(err.message || "Failed to pull from Google Sheet.");
    }
  };

  const handlePushAllClick = async () => {
    setActionSuccess("");
    setAuthError("");
    try {
      await onPushAllDirect(cleanId, selectedTab);
      setActionSuccess(`Successfully synchronized all cases to Google Sheet.`);
      setConfirmBatchPush(false);
    } catch (err) {
      setAuthError(err.message || "Failed to batch upload to Google Sheet.");
    }
  };

  const handleApplyConfig = () => {
    onUpdateSheetConfig(cleanId, selectedTab);
    onClose();
  };

  const copyScript = () => {
    navigator.clipboard.writeText(COMPLETE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,18,23,.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 70,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 14,
          width: "100%",
          maxWidth: 720,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 48px rgba(0,0,0,0.22)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: `1px solid ${COLOR.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#FFFFFF",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: COLOR.tealSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileSpreadsheet size={20} color={COLOR.tealDeep} />
            </div>
            <div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, color: COLOR.ink }}>
                Google Sheets Integration &amp; 2-Way Sync
              </div>
              <div style={{ fontSize: 11.5, color: COLOR.inkSoft }}>
                Connect directly to Google Workspace to read and write all 30 safeguarding fields
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: COLOR.inkSoft,
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${COLOR.line}`,
            background: "#FAFAF8",
            padding: "0 24px",
          }}
        >
          <button
            onClick={() => setActiveTab("direct")}
            style={{
              padding: "12px 16px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
              borderBottom: activeTab === "direct" ? `2.5px solid ${COLOR.teal}` : "2.5px solid transparent",
              color: activeTab === "direct" ? COLOR.tealDeep : COLOR.inkSoft,
            }}
          >
            <ShieldCheck size={15} /> Direct Google Sheets API (Recommended)
          </button>
          <button
            onClick={() => setActiveTab("webhook")}
            style={{
              padding: "12px 16px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
              borderBottom: activeTab === "webhook" ? `2.5px solid ${COLOR.teal}` : "2.5px solid transparent",
              color: activeTab === "webhook" ? COLOR.tealDeep : COLOR.inkSoft,
            }}
          >
            <Cloud size={15} /> Apps Script Webhook
          </button>
          <button
            onClick={() => setActiveTab("code")}
            style={{
              padding: "12px 16px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
              borderBottom: activeTab === "code" ? `2.5px solid ${COLOR.teal}` : "2.5px solid transparent",
              color: activeTab === "code" ? COLOR.tealDeep : COLOR.inkSoft,
            }}
          >
            <Code size={15} /> Setup Script
          </button>
        </div>

        {/* Modal body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {activeTab === "direct" && (
            <>
              {/* Account Auth Card */}
              <div
                style={{
                  background: googleUser ? "#F0F8F7" : "#FFFFFF",
                  border: `1px solid ${googleUser ? COLOR.tealSoft : COLOR.line}`,
                  borderRadius: 10,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                {googleUser ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {googleUser.photoURL ? (
                      <img
                        src={googleUser.photoURL}
                        alt="Profile"
                        referrerPolicy="no-referrer"
                        style={{ width: 38, height: 38, borderRadius: "50%", border: `1px solid ${COLOR.teal}` }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          background: COLOR.tealDeep,
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {(googleUser.displayName || googleUser.email || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: COLOR.ink }}>
                        {googleUser.displayName || "Google User"}
                      </div>
                      <div style={{ fontSize: 12, color: COLOR.inkSoft }}>
                        {googleUser.email} &bull; <span style={{ color: COLOR.tealDeep, fontWeight: 600 }}>Connected with Sheets permissions</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: COLOR.ink }}>
                      Google Workspace Authentication Required
                    </div>
                    <div style={{ fontSize: 12, color: COLOR.inkSoft }}>
                      Sign in with Google to enable real-time reading, writing, and auto-syncing to your spreadsheet.
                    </div>
                  </div>
                )}

                <div>
                  {googleUser ? (
                    <button
                      onClick={onGoogleLogout}
                      style={{
                        background: "#fff",
                        color: COLOR.rose,
                        border: `1px solid #F5C2C7`,
                        borderRadius: 7,
                        padding: "7px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <LogOut size={13} /> Sign Out
                    </button>
                  ) : (
                    <GoogleSignInButton onClick={handleLoginClick} loading={isBusy} />
                  )}
                </div>
              </div>

              {/* Target Spreadsheet Input */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: COLOR.ink, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Target Google Sheet URL or Spreadsheet ID
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={targetIdInput}
                    onChange={(e) => setTargetIdInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1usHttm2gWyLA11umygGUJwqwiqAQ-9iTDBVXoedapOc/edit"
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      borderRadius: 8,
                      border: `1px solid ${COLOR.line}`,
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: 12,
                      outline: "none",
                    }}
                  />
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#fff",
                      border: `1px solid ${COLOR.line}`,
                      color: COLOR.tealDeep,
                      borderRadius: 8,
                      padding: "0 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <ExternalLink size={13} /> Open in Sheets
                  </a>
                </div>
                <div style={{ fontSize: 11.5, color: COLOR.inkSoft, marginTop: 5 }}>
                  Pre-configured to your Commission Safeguarding Register: <code style={{ color: COLOR.tealDeep, fontWeight: 600 }}>{cleanId}</code>
                </div>
              </div>

              {/* Sheet Metadata / Tab Selection */}
              {googleUser && (
                <div
                  style={{
                    background: COLOR.paper,
                    borderRadius: 10,
                    padding: "14px 16px",
                    border: `1px solid ${COLOR.line}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FileSpreadsheet size={16} color={COLOR.tealDeep} />
                      <span style={{ fontWeight: 700, fontSize: 13, color: COLOR.ink }}>
                        {sheetMeta ? sheetMeta.title : "National Children's Commission Register"}
                      </span>
                    </div>
                    <button
                      onClick={fetchMetadata}
                      disabled={loadingMeta}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: COLOR.tealDeep,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <RefreshCw size={12} className={loadingMeta ? "animate-spin" : ""} /> Refresh info
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: COLOR.inkSoft, marginBottom: 4 }}>
                        Active Tab / Sub-Sheet
                      </label>
                      <select
                        value={selectedTab}
                        onChange={(e) => setSelectedTab(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          borderRadius: 6,
                          border: `1px solid ${COLOR.line}`,
                          fontSize: 12.5,
                          background: "#fff",
                        }}
                      >
                        {availableTabs.length > 0 ? (
                          availableTabs.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Sheet1">Sheet1</option>
                            <option value="Cases">Cases</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: COLOR.inkSoft, marginBottom: 4 }}>
                        30-Column Safeguarding Schema
                      </label>
                      <div
                        style={{
                          fontSize: 12,
                          padding: "7px 10px",
                          background: "#fff",
                          borderRadius: 6,
                          border: `1px solid ${COLOR.line}`,
                          color: COLOR.sage,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <CheckCircle2 size={14} color={COLOR.sage} /> 30 Standard Columns Active
                      </div>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginTop: 4,
                      paddingTop: 10,
                      borderTop: `1px solid ${COLOR.line}`,
                    }}
                  >
                    <Btn
                      small
                      variant="outline"
                      icon={ArrowDownToLine}
                      onClick={handlePullClick}
                      disabled={isBusy}
                    >
                      Pull Cases from Sheet
                    </Btn>

                    {!confirmBatchPush ? (
                      <Btn
                        small
                        variant="outline"
                        icon={ArrowUpFromLine}
                        onClick={() => setConfirmBatchPush(true)}
                        disabled={isBusy}
                      >
                        Push All Local Cases to Sheet
                      </Btn>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11.5, color: COLOR.rose, fontWeight: 600 }}>Overwrite sheet?</span>
                        <Btn small variant="danger" onClick={handlePushAllClick} disabled={isBusy}>
                          Yes, Push All
                        </Btn>
                        <button
                          onClick={() => setConfirmBatchPush(false)}
                          style={{
                            background: "transparent",
                            border: "none",
                            fontSize: 11.5,
                            color: COLOR.inkSoft,
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Feedback messages */}
              {authError && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    background: COLOR.roseSoft,
                    color: COLOR.rose,
                    border: `1px solid #F5C2C7`,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <div>{authError}</div>
                </div>
              )}

              {actionSuccess && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    background: "#EDF7F6",
                    color: COLOR.tealDeep,
                    border: `1px solid ${COLOR.tealSoft}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <CheckCircle size={15} style={{ flexShrink: 0 }} />
                  <div>{actionSuccess}</div>
                </div>
              )}
            </>
          )}

          {activeTab === "webhook" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: COLOR.ink, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Google Apps Script Web App URL
                </label>
                <input
                  value={localWebhook}
                  onChange={(e) => setLocalWebhook(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${COLOR.line}`,
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 12.5,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ fontSize: 11.5, color: COLOR.inkSoft, marginTop: 6, lineHeight: 1.4 }}>
                  Ensure your Web App was deployed with <b>Execute as: Me</b> and <b>Who has access: Anyone</b>.
                </div>
              </div>

              <div style={{ background: COLOR.paper, borderRadius: 10, padding: "14px 16px", border: `1px solid ${COLOR.line}` }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: COLOR.tealDeep, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <HelpCircle size={14} /> Webhook Mode:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: COLOR.inkSoft, lineHeight: 1.6 }}>
                  <li>Sends POST/GET requests to your deployed Apps Script web app endpoint.</li>
                  <li>Ideal for shared deployments where caseworkers do not individually sign in with Google.</li>
                </ul>
              </div>
            </>
          )}

          {activeTab === "code" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.ink }}>Turnkey 30-Column Google Apps Script</div>
                  <div style={{ fontSize: 11.5, color: COLOR.inkSoft }}>Automatically generates and syncs all Case, Victim, Perpetrator, Incident, and Safeguard columns.</div>
                </div>
                <Btn small icon={copiedCode ? Check : Copy} onClick={copyScript} style={{ background: copiedCode ? COLOR.sage : COLOR.teal }}>
                  {copiedCode ? "Copied to clipboard!" : "Copy Full Script"}
                </Btn>
              </div>

              <div style={{ background: COLOR.tealSoft, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: COLOR.tealDeep, lineHeight: 1.5 }}>
                <b>Quick Setup Steps:</b>
                <ol style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  <li>Open your Google Sheet &rarr; Click <b>Extensions &rarr; Apps Script</b>.</li>
                  <li>Delete any existing code, paste the script below, and click <b>Save</b> (Ctrl+S).</li>
                  <li>Click <b>Deploy &rarr; New deployment</b> &rarr; Click gear icon &rarr; Select <b>Web app</b>.</li>
                  <li>Set <b>Execute as:</b> <code>Me</code> and <b>Who has access:</b> <code>Anyone</code>.</li>
                  <li>Click <b>Deploy</b>, authorize permissions, copy the Web App URL, and paste it in the Webhook tab!</li>
                </ol>
              </div>

              <pre
                style={{
                  background: "#1E252B",
                  color: "#E6EDF3",
                  padding: "14px 16px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontFamily: "IBM Plex Mono, monospace",
                  maxHeight: 240,
                  overflowY: "auto",
                  lineHeight: 1.5,
                }}
              >
                {COMPLETE_APPS_SCRIPT_CODE}
              </pre>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: `1px solid ${COLOR.line}`,
            background: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 12, color: COLOR.inkSoft }}>
            {googleUser ? (
              <span style={{ color: COLOR.sage, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <CheckCircle2 size={14} /> Ready for live sync
              </span>
            ) : (
              <span>Sign in to enable 2-way Google Sheets sync</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" small onClick={onClose}>
              Close
            </Btn>
            {activeTab === "direct" ? (
              <Btn small icon={Check} onClick={handleApplyConfig}>
                Apply &amp; Connect
              </Btn>
            ) : (
              <Btn
                small
                icon={Check}
                onClick={() => {
                  onSaveWebhookUrl(localWebhook.trim());
                  onClose();
                }}
              >
                Save Webhook
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Small UI atoms                                                         */
/* ---------------------------------------------------------------------- */
function Field({ def, value, onChange, highlight }) {
  const base = {
    width: "100%",
    fontFamily: "Inter, sans-serif",
    fontSize: 13.5,
    padding: "9px 11px",
    borderRadius: 7,
    border: `1px solid ${highlight ? COLOR.amber : COLOR.line}`,
    background: highlight ? COLOR.amberSoft : COLOR.paperRaised,
    color: COLOR.ink,
    outline: "none",
    transition: "border-color .15s, background .4s",
  };
  return (
    <div>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 600, letterSpacing: ".02em",
        color: COLOR.inkSoft, marginBottom: 5, textTransform: "uppercase"
      }}>
        {def.label}{def.auto && <span style={{ fontWeight: 400, textTransform: "none" }}> · auto</span>}
      </label>
      {def.type === "select" ? (
        <select style={base} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {def.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : def.type === "textarea" ? (
        <textarea style={{ ...base, minHeight: 78, resize: "vertical", fontFamily: "Inter, sans-serif" }}
          value={value} onChange={(e) => onChange(e.target.value)} />
      ) : def.auto ? (
        <input style={{ ...base, fontFamily: "IBM Plex Mono, monospace", color: COLOR.teal, background: COLOR.tealSoft }}
          value={value} readOnly />
      ) : (
        <input style={base} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={def.type === "date" ? "e.g. 12/08/2026" : ""} />
      )}
    </div>
  );
}

function Pill({ text, color }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 600, padding: "3px 9px",
      borderRadius: 20, background: `${color}20`, color, whiteSpace: "nowrap"
    }}>{text}</span>
  );
}

function Btn({ children, onClick, variant = "solid", icon: Icon, disabled, small }) {
  const styles = {
    solid: { background: COLOR.teal, color: "#fff", border: `1px solid ${COLOR.teal}` },
    outline: { background: "transparent", color: COLOR.teal, border: `1px solid ${COLOR.teal}` },
    ghost: { background: "transparent", color: COLOR.inkSoft, border: `1px solid transparent` },
    danger: { background: "transparent", color: COLOR.rose, border: `1px solid ${COLOR.roseSoft}` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant],
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: "Inter, sans-serif", fontWeight: 600,
      fontSize: small ? 12.5 : 13.5, padding: small ? "6px 11px" : "9px 15px",
      borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1, transition: "opacity .15s, transform .1s",
    }}>
      {Icon && <Icon size={small ? 13 : 15} />}
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------------- */
/*  Entry form + AI auto-fill (Text & Picture Multimodal Intake)           */
/* ---------------------------------------------------------------------- */
function EntryForm({ cases, onSave }) {
  const [form, setForm] = useState(() => ({ ...emptyCase(), caseId: generateCaseId(cases) }));
  const [narrative, setNarrative] = useState("");
  const [imageObj, setImageObj] = useState(null); // { dataUrl, base64, mimeType, name, size }
  const [imageProcessing, setImageProcessing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [changed, setChanged] = useState({});
  const [savedFlash, setSavedFlash] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const setVal = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageProcessing(true);
    setAiError("");
    try {
      const processed = await processImageFile(file);
      setImageObj(processed);
    } catch (err) {
      setAiError("Could not process the selected image. Please choose another file.");
    } finally {
      setImageProcessing(false);
      e.target.value = "";
    }
  };

  const removeImage = () => {
    setImageObj(null);
  };

  const runAutofill = async () => {
    if (!narrative.trim() && !imageObj) return;
    setAiLoading(true);
    setAiError("");
    try {
      const schema = FIELDS.filter((f) => !f.auto).map((f) => f.key).join(", ");
      const systemInstruction =
        "You are an expert child protection caseworker AI for the National Children's Commission of Malawi. " +
        "You extract structured facts from incident narratives, photographs of handwritten field worker notes, police blotters/OB entries, news bulletins (e.g., Mibawa News, Zodiak, MBC), medical/hospital reports, or community complaints for official case intake registration. " +
        "The content may be written in Chichewa, Tumbuka, Yao, English, or a mix of languages. " +
        "Recognize Chichewa terms (e.g., 'mwana' = child, 'zaka' = years/age, 'ku simba / dambwe' = initiation camp, 'kumwalira / kufa' = died/death, 'Boma' = district, 'Mfumu yayikulu' = Traditional Authority / Senior Chief, 'Mudzi' = Village, 'wodulidwa' = circumcised, 'apilisi' = police). " +
        "Transcribe and translate all explicit facts into clear, professional English for the case record fields. " +
        "Only extract facts explicitly stated or clearly legible in the image/text. Leave any field as an empty string \"\" if not mentioned.";

      let prompt =
        `Extract case information into a JSON object with these exact keys: ${schema}.\n\n` +
        `Field Rules & Allowed Values:\n` +
        `- reportType: "Initial-Report" or "Follow-up" (default "Initial-Report")\n` +
        `- status: "Open", "In Progress", "Referred", or "Closed" (use "In Progress" if investigation is underway, or "Open")\n` +
        `- abuseType: "Physical", "Sexual", "Emotional", "Exploitation", "Neglect", or "Other"\n` +
        `- victimGender / perpetratorGender: "Female", "Male", or "Not disclosed / Not stated"\n` +
        `- district: Must be one of the official Malawi districts if mentioned: ${MALAWI_DISTRICTS.join(", ")}\n` +
        `- confidentialityLevel: "High", "Medium", or "Low" (default "High" for minors or fatalities)\n` +
        `- consentObtained: "Yes", "No", or "N/A"\n` +
        `- description: Comprehensive English summary of the incident\n\n`;

      if (imageObj) {
        prompt += `Analyze this attached image (photograph of field note, police blotter, medical memo, or document). Carefully read all legible handwriting, printed text, timestamps, names, and incident particulars.\n`;
      }
      if (narrative.trim()) {
        prompt += `Supplementary Text Narrative:\n"""\n${narrative.trim()}\n"""\n\n`;
      }

      prompt += `Return ONLY a valid JSON object matching the requested keys.`;

      const options = {
        json: true,
        systemInstruction,
      };

      if (imageObj) {
        options.image = {
          data: imageObj.base64,
          mimeType: imageObj.mimeType,
        };
      }

      const extracted = await callGemini(prompt, options);
      const diffKeys = {};
      setForm((f) => {
        const next = { ...f };
        Object.keys(extracted || {}).forEach((k) => {
          if (extracted[k] !== undefined && extracted[k] !== null && extracted[k] !== "" && FIELDS.some((fd) => fd.key === k)) {
            next[k] = String(extracted[k]);
            diffKeys[k] = true;
          }
        });
        return next;
      });
      setChanged(diffKeys);
      setTimeout(() => setChanged({}), 4000);
    } catch (e) {
      console.error("Autofill error:", e);
      setAiError(e?.message || "Couldn't auto-fill from that narrative or image. You can still fill the form in manually.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = () => {
    onSave({ ...form });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
    setForm({ ...emptyCase(), caseId: generateCaseId([...cases, form]) });
    setNarrative("");
    setImageObj(null);
  };

  const groups = [...new Set(FIELDS.map((f) => f.group))];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 920 }}>
      {/* AI Intake Box (Text & Picture Multimodal) */}
      <div style={{
        background: COLOR.tealDeep, borderRadius: 14, padding: "20px 22px",
        display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 4px 12px rgba(10,58,62,0.15)"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={17} color={COLOR.amber} />
            <span style={{ fontWeight: 600, fontSize: 14, fontFamily: "Inter, sans-serif" }}>
              Auto-Fill from Field Note, Picture, or Police Report
            </span>
          </div>
          <span style={{ fontSize: 11.5, color: "#C9D6D5" }}>Text &amp; Image OCR Enabled</span>
        </div>

        {/* Text Input Area */}
        <textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="Paste or type narrative in Chichewa, English, or Tumbuka (e.g. Mwana wa zaka 9 wamwalira ku simba m'mudzi wa Kakhomba, Thyolo… or A 12-year-old girl from Machinga…)"
          style={{
            width: "100%", minHeight: 76, borderRadius: 8, border: "none", padding: "10px 12px",
            fontFamily: "Inter, sans-serif", fontSize: 13, resize: "vertical", outline: "none",
            color: COLOR.ink, background: "#fff"
          }}
        />

        {/* Image Attachment Bar */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            style={{ display: "none" }}
          />
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={imageProcessing || aiLoading}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 7,
              background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif"
            }}
          >
            <ImageIcon size={14} /> Upload Picture / Photo of Note
          </button>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={imageProcessing || aiLoading}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 7,
              background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif"
            }}
          >
            <Camera size={14} /> Take Photo (Camera)
          </button>

          {imageProcessing && (
            <span style={{ color: "#E4EEEC", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Loader2 size={13} className="animate-spin" /> Processing image…
            </span>
          )}
        </div>

        {/* Image Thumbnail Preview Card */}
        {imageObj && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(0, 0, 0, 0.25)", borderRadius: 8, padding: "8px 12px",
            border: "1px solid rgba(255,255,255,0.15)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <img
                src={imageObj.dataUrl}
                alt="Case document preview"
                style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(255,255,255,0.3)" }}
              />
              <div>
                <div style={{ color: "#fff", fontSize: 12.5, fontWeight: 600 }}>{imageObj.name}</div>
                <div style={{ color: "#C9D6D5", fontSize: 11 }}>Picture attached · {imageObj.size} · Gemini Vision OCR ready</div>
              </div>
            </div>
            <button
              onClick={removeImage}
              title="Remove image"
              style={{ background: "transparent", border: "none", color: "#FFB4B8", cursor: "pointer", padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Action Button & Note */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 2 }}>
          <Btn
            onClick={runAutofill}
            disabled={aiLoading || (!narrative.trim() && !imageObj)}
            icon={aiLoading ? Loader2 : Sparkles}
            style={{ background: COLOR.amber, color: COLOR.ink, border: "none" }}
          >
            {aiLoading ? (imageObj ? "Analyzing picture & narrative…" : "Reading narrative…") : "Auto-fill form"}
          </Btn>
          <span style={{ color: "#C9D6D5", fontSize: 11.5, fontFamily: "Inter, sans-serif" }}>
            Only extracts facts explicitly stated or shown in the document.
          </span>
        </div>

        {/* Error banner with retry */}
        {aiError && (
          <div style={{
            background: "rgba(255, 255, 255, 0.12)",
            borderRadius: 8,
            padding: "8px 12px",
            color: "#FFF2DE",
            fontSize: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10
          }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <AlertCircle size={14} color={COLOR.amber} style={{ flexShrink: 0 }} />
              <span>{aiError}</span>
            </div>
            <button
              onClick={runAutofill}
              disabled={aiLoading}
              style={{
                background: COLOR.amber,
                color: COLOR.ink,
                border: "none",
                borderRadius: 6,
                padding: "4px 9px",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
            >
              <RefreshCw size={11} /> Try again
            </button>
          </div>
        )}
      </div>

      {groups.map((g) => (
        <div key={g}>
          <div style={{
            fontFamily: "Fraunces, serif", fontSize: 15.5, fontWeight: 600, color: COLOR.tealDeep,
            marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${COLOR.line}`
          }}>{g}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            {FIELDS.filter((f) => f.group === g).map((f) => (
              <Field key={f.key} def={f} value={form[f.key]} highlight={changed[f.key]}
                onChange={(v) => setVal(f.key, v)} />
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 6 }}>
        <Btn onClick={handleSave} icon={Plus}>Save case to registry</Btn>
        {savedFlash && (
          <span style={{ color: COLOR.sage, fontSize: 13, display: "flex", alignItems: "center", gap: 5, fontFamily: "Inter, sans-serif" }}>
            <Check size={14} /> Saved
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Registry                                                               */
/* ---------------------------------------------------------------------- */
function Registry({ cases, onOpen, onImport, onExport, onDelete }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [abuseType, setAbuseType] = useState("");
  const [district, setDistrict] = useState("");
  const [gender, setGender] = useState("");
  const fileRef = useRef(null);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (status && c.status !== status) return false;
      if (abuseType && c.abuseType !== abuseType) return false;
      if (district && c.district !== district) return false;
      if (gender && c.victimGender !== gender) return false;
      if (q) {
        const hay = Object.values(c).join(" ").toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [cases, q, status, abuseType, district, gender]);

  const selectStyle = {
    fontFamily: "Inter, sans-serif", fontSize: 12.5, padding: "7px 9px",
    borderRadius: 7, border: `1px solid ${COLOR.line}`, background: "#fff", color: COLOR.ink
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: COLOR.inkSoft }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all fields…"
            style={{ ...selectStyle, width: "100%", paddingLeft: 30 }} />
        </div>
        <select style={selectStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select style={selectStyle} value={abuseType} onChange={(e) => setAbuseType(e.target.value)}>
          <option value="">All abuse types</option>
          {ABUSE_TYPES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select style={selectStyle} value={district} onChange={(e) => setDistrict(e.target.value)}>
          <option value="">All districts</option>
          {MALAWI_DISTRICTS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select style={selectStyle} value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">All genders</option>
          {GENDERS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
          onChange={(e) => { if (e.target.files[0]) onImport(e.target.files[0]); e.target.value = ""; }} />
        <Btn variant="outline" small icon={Upload} onClick={() => fileRef.current.click()}>Import CSV</Btn>
        <Btn variant="outline" small icon={Download} onClick={() => onExport(filtered)}>Export CSV</Btn>
      </div>

      <div style={{ fontSize: 12, color: COLOR.inkSoft, marginBottom: 8, fontFamily: "Inter, sans-serif" }}>
        {filtered.length} of {cases.length} case{cases.length === 1 ? "" : "s"}
      </div>

      {filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 20px", color: COLOR.inkSoft, fontFamily: "Inter, sans-serif",
          background: COLOR.paperRaised, borderRadius: 12, border: `1px dashed ${COLOR.line}`
        }}>
          {cases.length === 0
            ? "No cases yet. Add one in the Entry tab, or import your existing sheet as CSV."
            : "No cases match these filters."}
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: `1px solid ${COLOR.line}`, borderRadius: 12, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: COLOR.tealSoft, textAlign: "left" }}>
                {["Case ID", "Status", "Abuse Type", "Victim", "District", "Reported", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", fontWeight: 600, color: COLOR.tealDeep, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={i} onClick={() => onOpen(c)} style={{
                  borderTop: `1px solid ${COLOR.line}`, cursor: "pointer",
                }} onMouseEnter={(e) => e.currentTarget.style.background = COLOR.paper}
                   onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "10px 12px", fontFamily: "IBM Plex Mono, monospace", color: COLOR.teal }}>{c.caseId || "—"}</td>
                  <td style={{ padding: "10px 12px" }}><Pill text={c.status || "—"} color={STATUS_COLOR[c.status] || COLOR.inkSoft} /></td>
                  <td style={{ padding: "10px 12px" }}>{c.abuseType || "—"}</td>
                  <td style={{ padding: "10px 12px" }}>{c.victimName || "Not disclosed"} · {c.victimAge || "age n/s"}</td>
                  <td style={{ padding: "10px 12px" }}>{c.district || "—"}</td>
                  <td style={{ padding: "10px 12px" }}>{c.reportDate || "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}><ChevronRight size={15} color={COLOR.inkSoft} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Case detail modal                                                      */
/* ---------------------------------------------------------------------- */
function CaseModal({ c, onClose, onUpdate, onDelete, onReport }) {
  const [edit, setEdit] = useState({ ...c });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const groups = [...new Set(FIELDS.map((f) => f.group))];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,18,23,.55)", display: "flex",
      alignItems: "flex-start", justifyContent: "center", padding: "4vh 16px", zIndex: 50, overflowY: "auto"
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: COLOR.paper, borderRadius: 16, width: "100%", maxWidth: 820, padding: 24,
        boxShadow: "0 20px 60px rgba(0,0,0,.3)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: COLOR.teal }}>{c.caseId}</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 600, color: COLOR.ink }}>Case dossier</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small variant="outline" icon={FileText} onClick={() => onReport(edit)}>Draft report</Btn>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color={COLOR.inkSoft} /></button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {groups.map((g) => (
            <div key={g}>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 14, fontWeight: 600, color: COLOR.tealDeep, marginBottom: 8 }}>{g}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
                {FIELDS.filter((f) => f.group === g).map((f) => (
                  <Field key={f.key} def={f} value={edit[f.key]}
                    onChange={(v) => setEdit((s) => ({ ...s, [f.key]: v }))} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {showDeleteConfirm && (
          <div style={{
            marginTop: 18, padding: "14px 16px", background: COLOR.roseSoft, borderRadius: 10,
            border: `1px solid #F5C2C7`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AlertCircle size={18} color={COLOR.rose} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 12.5, color: COLOR.rose, lineHeight: 1.4 }}>
                <b>Permanently delete Case {c.caseId}?</b>
                <div>This action will remove the record from both the local registry and the connected Google Sheet.</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn small variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Btn>
              <Btn small variant="danger" onClick={() => { onDelete(c); onClose(); }}>Confirm Delete</Btn>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22, paddingTop: 16, borderTop: `1px solid ${COLOR.line}` }}>
          {!showDeleteConfirm ? (
            <Btn variant="danger" small onClick={() => setShowDeleteConfirm(true)}>Delete case</Btn>
          ) : <div />}
          <Btn small onClick={() => { onUpdate(edit); onClose(); }} icon={Check}>Save changes</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Analytics                                                              */
/* ---------------------------------------------------------------------- */
const PIE_COLORS = [COLOR.teal, COLOR.amber, COLOR.rose, COLOR.sage, COLOR.tealDeep, "#B8AA8F", "#8E7DBE", "#5B8E7D"];

function countBy(cases, key) {
  const m = {};
  cases.forEach((c) => {
    const v = (c[key] || "Not stated").trim() || "Not stated";
    m[v] = (m[v] || 0) + 1;
  });
  return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function classifyAge(ageStr) {
  if (!ageStr || isNaN(parseInt(ageStr, 10))) return "Age unstated";
  const a = parseInt(ageStr, 10);
  if (a <= 5) return "0–5 yrs (Early Childhood)";
  if (a <= 11) return "6–11 yrs (Primary Age)";
  if (a <= 14) return "12–14 yrs (Adolescent)";
  if (a <= 17) return "15–17 yrs (Older Youth)";
  return "18+ yrs (Adult / Other)";
}

function StatCard({ label, value, subtext, color, icon: Icon }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${COLOR.line}`, padding: "16px 18px", flex: "1 1 150px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 700, color: color || COLOR.ink }}>{value}</div>
        {Icon && <div style={{ color: color || COLOR.tealDeep, opacity: 0.8 }}><Icon size={18} /></div>}
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: COLOR.ink }}>{label}</div>
      {subtext && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: COLOR.inkSoft, marginTop: 2 }}>{subtext}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, children, actions }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${COLOR.line}`, padding: 18, flex: "1 1 380px", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, color: COLOR.tealDeep }}>{title}</div>
          {subtitle && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: COLOR.inkSoft, marginTop: 1 }}>{subtitle}</div>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function Analytics({ cases }) {
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [abuseFilter, setAbuseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Gemini AI Strategic Briefing State
  const [aiBriefing, setAiBriefing] = useState("");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState("");

  if (cases.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 20px", color: COLOR.inkSoft, fontFamily: "Inter, sans-serif",
        background: "#fff", borderRadius: 12, border: `1px dashed ${COLOR.line}` }}>
        No data yet — add or import cases to see analytics.
      </div>
    );
  }

  // Filtered dataset
  const filteredCases = cases.filter((c) => {
    if (districtFilter !== "ALL" && c.district !== districtFilter) return false;
    if (abuseFilter !== "ALL" && c.abuseType !== abuseFilter) return false;
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    return true;
  });

  // KPIs
  const total = cases.length;
  const openCount = cases.filter((c) => c.status === "Open" || c.status === "In Progress").length;
  const resolvedCount = cases.filter((c) => c.status === "Closed" || c.status === "Referred").length;
  const highConfidentialityCount = cases.filter((c) => (c.confidentialityLevel || "").toLowerCase() === "high").length;
  const upcomingFollowups = cases.filter((c) => c.followUpDate && !["Not stated", "Not started", ""].includes(c.followUpDate.trim())).length;
  const districtsCount = new Set(cases.map((c) => c.district).filter(Boolean)).size;

  // Chart datasets from filtered
  const byAbuse = countBy(filteredCases, "abuseType");
  const byDistrict = countBy(filteredCases, "district").slice(0, 10);
  const byStatus = countBy(filteredCases, "status");
  const byGender = countBy(filteredCases, "victimGender");
  const byPerpGender = countBy(filteredCases, "perpetratorGender");
  
  // Age groups
  const ageMap = {};
  filteredCases.forEach((c) => {
    const grp = classifyAge(c.victimAge);
    ageMap[grp] = (ageMap[grp] || 0) + 1;
  });
  const ageOrder = [
    "0–5 yrs (Early Childhood)",
    "6–11 yrs (Primary Age)",
    "12–14 yrs (Adolescent)",
    "15–17 yrs (Older Youth)",
    "18+ yrs (Adult / Other)",
    "Age unstated"
  ];
  const byAgeGroup = ageOrder
    .map((name) => ({ name, value: ageMap[name] || 0 }))
    .filter((e) => e.value > 0);

  // Perpetrator relationships
  const perpRelMap = {};
  filteredCases.forEach((c) => {
    const r = (c.relationshipToVictim || "Not specified").trim() || "Not specified";
    perpRelMap[r] = (perpRelMap[r] || 0) + 1;
  });
  const byPerpRel = Object.entries(perpRelMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  // District table breakdown
  const districtTableData = useMemo(() => {
    const map = {};
    cases.forEach((c) => {
      const d = c.district || "Unassigned District";
      if (!map[d]) {
        map[d] = { district: d, total: 0, open: 0, resolved: 0, abuseCounts: {} };
      }
      map[d].total += 1;
      if (c.status === "Open" || c.status === "In Progress") map[d].open += 1;
      if (c.status === "Closed" || c.status === "Referred") map[d].resolved += 1;
      const ab = c.abuseType || "Other";
      map[d].abuseCounts[ab] = (map[d].abuseCounts[ab] || 0) + 1;
    });
    return Object.values(map)
      .map((item) => {
        let topAbuse = "N/A";
        let maxAb = 0;
        Object.entries(item.abuseCounts).forEach(([k, v]) => {
          if (v > maxAb) {
            maxAb = v;
            topAbuse = `${k} (${v})`;
          }
        });
        return {
          ...item,
          topAbuse,
          resolutionRate: item.total ? Math.round((item.resolved / item.total) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [cases]);

  // AI Briefing Generator
  const generateAiBriefing = async () => {
    setBriefingLoading(true);
    setBriefingError("");
    try {
      const summaryStats = `Total Cases: ${cases.length}\n` +
        `Open / In-Progress: ${openCount}\n` +
        `Resolved / Referred: ${resolvedCount}\n` +
        `Districts Represented: ${districtsCount}\n` +
        `Top Districts: ${byDistrict.map((d) => `${d.name} (${d.value})`).join(", ")}\n` +
        `Abuse Breakdown: ${byAbuse.map((a) => `${a.name} (${a.value})`).join(", ")}\n` +
        `Victim Age Groups: ${byAgeGroup.map((a) => `${a.name}: ${a.value}`).join(", ")}\n` +
        `Recent cases summary:\n` +
        cases.slice(0, 15).map((c) => `- [${c.caseId}] ${c.district || "Unknown District"}: ${c.abuseType || "Abuse"} affecting ${c.victimGender || "child"} age ${c.victimAge || "N/A"}. Status: ${c.status}. Notes: ${c.description || "N/A"}`).join("\n");

      const systemInstruction =
        "You are the Chief Safeguarding Intelligence Officer for the National Children's Commission of Malawi. " +
        "You deliver high-impact, professional analytical briefings summarizing child protection case registry data.";
      const prompt =
        `Provide a structured 4-paragraph Executive Intelligence Briefing for the Commissioners based on the current case register:\n\n` +
        `1. Strategic Overview & Caseload Dynamics (Total volume, resolution progress, active case pressure)\n` +
        `2. High-Risk Abuse Typologies & Vulnerable Demographics (Dominant violations, age groups most affected)\n` +
        `3. Geographic Hotspots & Regional Patterns (Districts needing priority attention)\n` +
        `4. Actionable Commission Recommendations (3 concrete child protection interventions)\n\n` +
        `Data:\n${summaryStats}`;

      const res = await callGemini(prompt, { systemInstruction });
      setAiBriefing(res);
    } catch (err) {
      console.error("AI briefing error:", err);
      setBriefingError(err?.message || "Could not generate AI briefing right now. Please verify your API connection.");
    } finally {
      setBriefingLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* KPI Stats Header */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <StatCard label="Total cases" value={total} subtext="Registered in database" icon={ClipboardList} />
        <StatCard label="Active caseload" value={openCount} color={COLOR.rose} subtext={`${Math.round((openCount / (total || 1)) * 100)}% pending or in progress`} icon={ShieldAlert} />
        <StatCard label="Resolved / Referred" value={resolvedCount} color={COLOR.sage} subtext={`${Math.round((resolvedCount / (total || 1)) * 100)}% resolution rate`} icon={CheckCircle2} />
        <StatCard label="High confidentiality" value={highConfidentialityCount} color={COLOR.amber} subtext="Restricted minor protection" icon={AlertTriangle} />
        <StatCard label="Districts covered" value={districtsCount} color={COLOR.teal} subtext={`Across ${MALAWI_DISTRICTS.length} Malawi districts`} icon={Building} />
        <StatCard label="Scheduled follow-ups" value={upcomingFollowups} color={COLOR.tealDeep} subtext="Pending field actions" icon={TrendingUp} />
      </div>

      {/* Filter Controls & AI Intelligence Trigger Bar */}
      <div style={{
        background: "#fff", borderRadius: 12, border: `1px solid ${COLOR.line}`, padding: "14px 18px",
        display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: COLOR.tealDeep, textTransform: "uppercase", letterSpacing: 0.5 }}>
            <Filter size={14} /> Filters:
          </div>

          {/* District Filter */}
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            style={{
              padding: "6px 10px", borderRadius: 7, border: `1px solid ${COLOR.line}`,
              fontFamily: "Inter, sans-serif", fontSize: 12.5, background: COLOR.paper
            }}
          >
            <option value="ALL">All Districts ({cases.length})</option>
            {MALAWI_DISTRICTS.map((d) => {
              const count = cases.filter((c) => c.district === d).length;
              return <option key={d} value={d}>{d} {count > 0 ? `(${count})` : ""}</option>;
            })}
          </select>

          {/* Abuse Filter */}
          <select
            value={abuseFilter}
            onChange={(e) => setAbuseFilter(e.target.value)}
            style={{
              padding: "6px 10px", borderRadius: 7, border: `1px solid ${COLOR.line}`,
              fontFamily: "Inter, sans-serif", fontSize: 12.5, background: COLOR.paper
            }}
          >
            <option value="ALL">All Abuse Types</option>
            {ABUSE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "6px 10px", borderRadius: 7, border: `1px solid ${COLOR.line}`,
              fontFamily: "Inter, sans-serif", fontSize: 12.5, background: COLOR.paper
            }}
          >
            <option value="ALL">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {(districtFilter !== "ALL" || abuseFilter !== "ALL" || statusFilter !== "ALL") && (
            <button
              onClick={() => {
                setDistrictFilter("ALL");
                setAbuseFilter("ALL");
                setStatusFilter("ALL");
              }}
              style={{
                border: "none", background: "transparent", color: COLOR.rose,
                fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 3
              }}
            >
              <X size={13} /> Reset filters ({filteredCases.length} shown)
            </button>
          )}
        </div>

        <Btn
          small
          icon={Sparkles}
          onClick={generateAiBriefing}
          disabled={briefingLoading}
          style={{ background: COLOR.tealDeep, color: "#fff" }}
        >
          {briefingLoading ? "Generating AI Briefing…" : "Generate Commission AI Briefing"}
        </Btn>
      </div>

      {/* AI Intelligence Briefing Modal / Banner if generated */}
      {aiBriefing && (
        <div style={{
          background: "#F0F7F6", borderRadius: 12, border: `1px solid ${COLOR.tealSoft}`,
          borderLeft: `5px solid ${COLOR.teal}`, padding: "18px 22px"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: COLOR.teal, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={14} color="#fff" />
              </div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, color: COLOR.tealDeep }}>
                National Children's Commission — Safeguarding Intelligence Briefing
              </div>
            </div>
            <button
              onClick={() => setAiBriefing("")}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: COLOR.inkSoft }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{
            fontFamily: "Inter, sans-serif", fontSize: 13, lineHeight: 1.65, color: COLOR.ink,
            whiteSpace: "pre-wrap", background: "#fff", padding: "14px 18px", borderRadius: 8, border: `1px solid ${COLOR.line}`
          }}>
            {aiBriefing}
          </div>
        </div>
      )}

      {briefingError && (
        <div style={{
          background: "#FDF2F2",
          color: COLOR.rose,
          padding: "12px 16px",
          borderRadius: 8,
          fontSize: 12.5,
          border: "1px solid #F5C2C7",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={16} color={COLOR.rose} style={{ flexShrink: 0 }} />
            <span>{briefingError}</span>
          </div>
          <button
            onClick={generateAiBriefing}
            disabled={briefingLoading}
            style={{
              background: COLOR.rose,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "5px 10px",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              whiteSpace: "nowrap"
            }}
          >
            <RefreshCw size={11} /> Try again
          </button>
        </div>
      )}

      {/* Charts Grid */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {/* Abuse Classification */}
        <ChartCard title="Cases by abuse classification" subtitle="Distribution of reported child protection violations">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byAbuse} layout="vertical" margin={{ left: 8, right: 20 }}>
              <CartesianGrid stroke={COLOR.line} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 11.5 }} />
              <Tooltip />
              <Bar dataKey="value" fill={COLOR.teal} radius={[0, 4, 4, 0]} name="Cases" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Status Breakdown */}
        <ChartCard title="Case status & resolution pipeline" subtitle="Active tracking versus closed/referred cases">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={52} outerRadius={85} paddingAngle={3}>
                {byStatus.map((e, i) => <Cell key={i} fill={STATUS_COLOR[e.name] || PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Legend iconSize={9} wrapperStyle={{ fontSize: 11.5 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Age Groups Breakdown */}
        <ChartCard title="Victim age vulnerability brackets" subtitle="Cases categorized by child developmental stages">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byAgeGroup} margin={{ left: -10, bottom: 20 }}>
              <CartesianGrid stroke={COLOR.line} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10.5 }} interval={0} angle={-25} textAnchor="end" height={55} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill={COLOR.sage} radius={[4, 4, 0, 0]} name="Children" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Perpetrator Relationship */}
        <ChartCard title="Perpetrator relationship profile" subtitle="Relationship of alleged perpetrator to victim">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byPerpRel} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid stroke={COLOR.line} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill={COLOR.amber} radius={[0, 4, 4, 0]} name="Cases" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Districts */}
        <ChartCard title="Geographic hotspots (Top districts)" subtitle="Districts with highest reported case volume">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byDistrict} margin={{ left: -10, bottom: 25 }}>
              <CartesianGrid stroke={COLOR.line} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10.5 }} interval={0} angle={-35} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill={COLOR.rose} radius={[4, 4, 0, 0]} name="Cases" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Gender Distribution */}
        <ChartCard title="Victim gender distribution" subtitle="Demographic composition of reported victims">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={byGender} dataKey="value" nameKey="name" outerRadius={85} paddingAngle={2} label={{ fontSize: 11 }}>
                {byGender.map((e, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Legend iconSize={9} wrapperStyle={{ fontSize: 11.5 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* District Vulnerability & Safeguarding Registry Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${COLOR.line}`, padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, color: COLOR.tealDeep }}>
              District Safeguarding &amp; Caseload Breakdown
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLOR.inkSoft }}>
              District-by-district vulnerability indicators and resolution rates
            </div>
          </div>
          <div style={{ fontSize: 12, color: COLOR.inkSoft, fontWeight: 600 }}>
            {districtTableData.length} districts with active records
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif", fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${COLOR.line}`, textAlign: "left", color: COLOR.inkSoft }}>
                <th style={{ padding: "10px 12px" }}>District</th>
                <th style={{ padding: "10px 12px" }}>Total Cases</th>
                <th style={{ padding: "10px 12px" }}>Open / In Progress</th>
                <th style={{ padding: "10px 12px" }}>Resolved / Referred</th>
                <th style={{ padding: "10px 12px" }}>Primary Abuse Typology</th>
                <th style={{ padding: "10px 12px" }}>Resolution Rate</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Filter</th>
              </tr>
            </thead>
            <tbody>
              {districtTableData.map((row) => (
                <tr key={row.district} style={{ borderBottom: `1px solid ${COLOR.line}` }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: COLOR.ink }}>
                    {row.district}
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: COLOR.tealDeep }}>
                    {row.total}
                  </td>
                  <td style={{ padding: "10px 12px", color: COLOR.rose, fontWeight: 600 }}>
                    {row.open}
                  </td>
                  <td style={{ padding: "10px 12px", color: COLOR.sage, fontWeight: 600 }}>
                    {row.resolved}
                  </td>
                  <td style={{ padding: "10px 12px", color: COLOR.inkSoft }}>
                    {row.topAbuse}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 60, height: 6, background: "#EAE7DF", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${row.resolutionRate}%`, height: "100%", background: COLOR.sage }} />
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 600 }}>{row.resolutionRate}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <button
                      onClick={() => setDistrictFilter(row.district)}
                      style={{
                        padding: "4px 8px", borderRadius: 6, border: `1px solid ${COLOR.line}`,
                        background: districtFilter === row.district ? COLOR.tealSoft : "#fff",
                        color: districtFilter === row.district ? COLOR.tealDeep : COLOR.inkSoft,
                        fontSize: 11.5, fontWeight: 600, cursor: "pointer"
                      }}
                    >
                      {districtFilter === row.district ? "Selected" : "Filter"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Reports                                                                 */
/* ---------------------------------------------------------------------- */
function buildSingleCaseText(c) {
  const groups = [...new Set(FIELDS.map((f) => f.group))];
  let out = `NATIONAL CHILDREN'S COMMISSION\nCHILD PROTECTION CASE REPORT\nConfidentiality: ${c.confidentialityLevel || "High"} — restricted distribution\n`;
  out += `Generated: ${new Date().toLocaleString()}\n`;
  out += "=".repeat(60) + "\n\n";
  groups.forEach((g) => {
    out += `${g.toUpperCase()}\n${"-".repeat(g.length)}\n`;
    FIELDS.filter((f) => f.group === g).forEach((f) => {
      out += `${f.label}: ${c[f.key] || "Not stated"}\n`;
    });
    out += "\n";
  });
  out += "-".repeat(60) + "\nPrepared by: ______________________   Signature: ______________________   Date: __________\n";
  return out;
}

function buildBatchText(cases) {
  let out = `NATIONAL CHILDREN'S COMMISSION\nCHILD PROTECTION CASE REGISTER — SUMMARY REPORT\nGenerated: ${new Date().toLocaleString()}\nTotal cases: ${cases.length}\n`;
  out += "=".repeat(60) + "\n\n";
  out += "OVERVIEW\n--------\n";
  ["status", "abuseType", "district"].forEach((k) => {
    out += `\nBy ${FIELDS.find((f) => f.key === k).label}:\n`;
    countBy(cases, k).forEach((e) => (out += `  ${e.name}: ${e.value}\n`));
  });
  out += "\nCASE LIST\n---------\n";
  cases.forEach((c) => {
    out += `\n${c.caseId || "—"} | ${c.status || "—"} | ${c.abuseType || "—"} | ${c.district || "—"} | reported ${c.reportDate || "—"}\n`;
    out += `  Victim: ${c.victimName || "Not disclosed"} (${c.victimGender || "n/s"}, ${c.victimAge || "age n/s"})\n`;
    out += `  Summary: ${(c.description || "No description recorded.").slice(0, 220)}${(c.description || "").length > 220 ? "…" : ""}\n`;
    out += `  Assigned to: ${c.assignedTo || "Not assigned"} | Resolution: ${c.resolutionNotes || "Pending"}\n`;
  });
  return out;
}

function ReportModal({ target, cases, onClose }) {
  const isSingle = target !== "ALL";
  const [text, setText] = useState(() => isSingle ? buildSingleCaseText(target) : buildBatchText(cases));
  const [narrative, setNarrative] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const addAiSummary = async () => {
    setLoading(true);
    try {
      const prompt = isSingle
        ? `Write a concise, professional 3-sentence case synthesis for a National Children's Commission child protection case file, ` +
          `based strictly on the facts below — do not add anything not present. Neutral, factual, ` +
          `report-appropriate tone.\n\n${buildSingleCaseText(target)}`
        : `Write a concise 4-sentence executive summary of this National Children's Commission child protection case register for a ` +
          `supervisor or commissioner briefing, based strictly on the statistics and cases listed below — do not invent ` +
          `figures. Neutral, factual tone.\n\n${buildBatchText(cases).slice(0, 6000)}`;
      const summary = await callGemini(prompt);
      setNarrative(summary);
    } catch (e) {
      setNarrative("(Could not generate an AI summary right now — the structured report below is unaffected.)");
    } finally {
      setLoading(false);
    }
  };

  const copyAll = () => {
    navigator.clipboard.writeText((narrative ? `EXECUTIVE SUMMARY\n${narrative}\n\n` : "") + text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const blob = new Blob([(narrative ? `EXECUTIVE SUMMARY\n${narrative}\n\n` : "") + text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = isSingle ? `${target.caseId || "case"}_report.txt` : `case_register_summary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,18,23,.55)", display: "flex",
      alignItems: "flex-start", justifyContent: "center", padding: "4vh 16px", zIndex: 60, overflowY: "auto"
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 760, padding: 24,
        boxShadow: "0 20px 60px rgba(0,0,0,.3)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, color: COLOR.ink }}>
            {isSingle ? "Single-case report" : "All-cases summary report"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color={COLOR.inkSoft} /></button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <Btn small variant="outline" icon={loading ? Loader2 : Sparkles} onClick={addAiSummary} disabled={loading}>
            {loading ? "Drafting…" : "Add AI executive summary"}
          </Btn>
          <Btn small variant="outline" icon={copied ? Check : Copy} onClick={copyAll}>{copied ? "Copied" : "Copy"}</Btn>
          <Btn small variant="outline" icon={Download} onClick={download}>Download .txt</Btn>
          <Btn small variant="outline" icon={Printer} onClick={() => window.print()}>Print</Btn>
        </div>

        {narrative && (
          <div style={{ background: COLOR.tealSoft, borderRadius: 10, padding: 14, marginBottom: 12,
            fontFamily: "Inter, sans-serif", fontSize: 13, color: COLOR.tealDeep, lineHeight: 1.5 }}>
            <b>Executive summary</b><br />{narrative}
          </div>
        )}

        <textarea value={text} onChange={(e) => setText(e.target.value)} style={{
          width: "100%", minHeight: 420, fontFamily: "IBM Plex Mono, monospace", fontSize: 12,
          border: `1px solid ${COLOR.line}`, borderRadius: 10, padding: 14, lineHeight: 1.6, color: COLOR.ink
        }} />
        <div style={{ fontSize: 11, color: COLOR.inkSoft, marginTop: 8, fontFamily: "Inter, sans-serif" }}>
          Editable before sharing. Structured facts are pulled directly from your records; only the executive summary is AI-drafted.
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  App shell                                                               */
/* ---------------------------------------------------------------------- */
export default function App() {
  const [tab, setTab] = useState("entry");
  const [cases, setCases] = useState([]);
  const [openCase, setOpenCase] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [importMsg, setImportMsg] = useState("");
  
  // Google Workspace / Sheets state
  const [googleUser, setGoogleUser] = useState(null);
  const [spreadsheetId, setSpreadsheetId] = useState(DEFAULT_SPREADSHEET_ID);
  const [sheetTab, setSheetTab] = useState("Sheet1");
  const [syncState, setSyncState] = useState("disconnected"); // disconnected | syncing | connected | error
  const [syncError, setSyncError] = useState("");
  const [syncSuccessMsg, setSyncSuccessMsg] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(null);

  // Initialize auth listener
  useEffect(() => {
    const unsub = initAuth((user) => {
      setGoogleUser(user);
      if (user) {
        // Attempt initial pull from default sheet
        pullDirectFromGoogle(spreadsheetId, sheetTab);
      } else {
        setSyncState("disconnected");
      }
    });
    return () => unsub();
  }, [spreadsheetId, sheetTab]);

  // Pull records directly from Google Sheets API
  const pullDirectFromGoogle = async (targetId = spreadsheetId, targetTab = sheetTab) => {
    const cleanId = extractSpreadsheetId(targetId);
    setSyncState("syncing");
    setSyncError("");
    setSyncSuccessMsg("");
    setIsBusy(true);
    try {
      const rows = await pullCasesFromGoogleSheet(cleanId, targetTab);
      if (rows && rows.length > 0) {
        setCases(rows);
        setSyncSuccessMsg(`Pulled ${rows.length} record(s) from Google Sheet.`);
      } else {
        setSyncSuccessMsg(`Google Sheet connected (0 records found in ${targetTab}).`);
      }
      setSyncState("connected");
      setTimeout(() => setSyncSuccessMsg(""), 4000);
      return rows ? rows.length : 0;
    } catch (err) {
      console.warn("Direct pull error:", err);
      // Fallback: If webhookUrl is set, try fallback
      if (webhookUrl) {
        try {
          const remote = await sheetPull(webhookUrl);
          setCases(remote);
          setSyncState("connected");
          return remote.length;
        } catch (e2) {
          setSyncState("error");
          setSyncError(err.message || "Failed to pull from Google Sheet.");
          throw err;
        }
      } else {
        setSyncState("error");
        setSyncError(err.message || "Failed to pull from Google Sheet.");
        throw err;
      }
    } finally {
      setIsBusy(false);
    }
  };

  // Push all local records to Google Sheet
  const pushAllDirectToGoogle = async (targetId = spreadsheetId, targetTab = sheetTab) => {
    const cleanId = extractSpreadsheetId(targetId);
    setSyncState("syncing");
    setSyncError("");
    setIsBusy(true);
    try {
      await syncAllCasesToGoogleSheet(cleanId, targetTab, cases);
      setSyncState("connected");
      setSyncSuccessMsg(`Successfully synced ${cases.length} cases to Google Sheet.`);
      setTimeout(() => setSyncSuccessMsg(""), 4000);
    } catch (err) {
      setSyncState("error");
      setSyncError(err.message || "Failed to push cases to Google Sheet.");
      throw err;
    } finally {
      setIsBusy(false);
    }
  };

  // Push single mutation (upsert or delete) to Sheet
  const pushMutationToSheet = async (action, caseObjOrId) => {
    setSyncState("syncing");
    try {
      if (googleUser || getAccessToken()) {
        if (action === "upsert") {
          await pushCaseToGoogleSheet(spreadsheetId, sheetTab, caseObjOrId);
        } else if (action === "delete") {
          const id = typeof caseObjOrId === "object" ? caseObjOrId.caseId : caseObjOrId;
          await deleteCaseFromGoogleSheet(spreadsheetId, sheetTab, id);
        }
        setSyncState("connected");
      } else if (webhookUrl) {
        await sheetPush(webhookUrl, action, caseObjOrId);
        setSyncState("connected");
      } else {
        setSyncState("disconnected");
      }
    } catch (err) {
      console.error("Mutation sync error:", err);
      setSyncState("error");
      setSyncError(`Saved locally, but write to Google Sheet failed: ${err.message || "Network issue"}`);
    }
  };

  const handleGoogleLogin = async () => {
    setIsBusy(true);
    setSyncError("");
    try {
      const user = await googleSignIn();
      setGoogleUser(user);
      await pullDirectFromGoogle(spreadsheetId, sheetTab);
    } catch (err) {
      setSyncError(err.message || "Google Sign-In failed.");
      throw err;
    } finally {
      setIsBusy(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setGoogleUser(null);
    setSyncState("disconnected");
  };

  const updateSheetConfig = (newId, newTab) => {
    setSpreadsheetId(newId);
    setSheetTab(newTab);
    pullDirectFromGoogle(newId, newTab);
  };

  const addCase = (c) => {
    setCases((cs) => [c, ...cs]);
    pushMutationToSheet("upsert", c);
  };

  const updateCase = (updated) => {
    setCases((cs) => cs.map((c) => (c.caseId === updated.caseId ? updated : c)));
    pushMutationToSheet("upsert", updated);
  };

  const deleteCase = (target) => {
    setCases((cs) => cs.filter((c) => c.caseId !== target.caseId));
    pushMutationToSheet("delete", target.caseId);
  };

  const handleImport = (file) => {
    Papa.parse(file, {
      complete: (res) => {
        const rows = res.data;
        const headerRowIdx = rows.findIndex((r) => r.some((cell) => CSV_HEADER_MAP[(cell || "").trim()]));
        if (headerRowIdx === -1) { setImportMsg("Couldn't find a recognizable header row in that CSV."); return; }
        const headers = rows[headerRowIdx].map((h) => (h || "").trim());
        const imported = [];
        for (let i = headerRowIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every((cell) => !cell || !cell.trim())) continue;
          const obj = emptyCase();
          headers.forEach((h, idx) => {
            const key = CSV_HEADER_MAP[h];
            if (key) obj[key] = (row[idx] || "").trim();
          });
          if (!obj.caseId) obj.caseId = generateCaseId([...cases, ...imported]);
          imported.push(obj);
        }
        setCases((cs) => [...imported, ...cs]);
        setImportMsg(`Imported ${imported.length} case${imported.length === 1 ? "" : "s"}.`);
        setTimeout(() => setImportMsg(""), 4000);
      },
    });
  };

  const handleExport = (rows) => {
    const header = FIELDS.map((f) => f.label);
    const data = rows.map((r) => FIELDS.map((f) => r[f.key] || ""));
    const csv = Papa.unparse([header, ...data]);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `case_register_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const NAV = [
    { id: "entry", label: "New Entry", icon: ClipboardList },
    { id: "registry", label: "Registry", icon: LayoutGrid },
    { id: "analytics", label: "Analytics", icon: Sparkles },
  ];

  const currentSheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: COLOR.paper, minHeight: "100%", color: COLOR.ink }}>
      <style>{FONTS_IMPORT}</style>

      {/* Top Navbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", borderBottom: `1px solid ${COLOR.line}`, background: "#fff", flexWrap: "wrap", gap: 12
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: COLOR.tealDeep, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: 16.5, lineHeight: 1.1, color: COLOR.ink }}>
              National Children's Commission
            </div>
            <div style={{ fontSize: 11, color: COLOR.inkSoft }}>Child Protection Case Register &amp; Tracking</div>
          </div>
        </div>

        {/* Center / Navigation Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: 13,
                background: tab === n.id ? COLOR.tealSoft : "transparent",
                color: tab === n.id ? COLOR.tealDeep : COLOR.inkSoft,
              }}
            >
              <n.icon size={15} /> {n.label}
            </button>
          ))}
          <div style={{ width: 1, height: 24, background: COLOR.line, margin: "0 4px" }} />
          <Btn small variant="outline" icon={FileText} onClick={() => setReportTarget("ALL")} disabled={cases.length === 0}>
            All-cases report
          </Btn>
        </div>

        {/* Right / Google Sheets & Account Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Pull Latest button */}
          <Btn
            small
            variant="outline"
            icon={isBusy ? Loader2 : RefreshCw}
            onClick={() => pullDirectFromGoogle()}
            disabled={isBusy}
            title="Pull latest records from connected Google Sheet"
          >
            {isBusy ? "Syncing…" : "Pull latest"}
          </Btn>

          {/* Connected Sheet Status Badge */}
          <button
            onClick={() => setShowSyncSettings(true)}
            title="Google Sheets 2-Way Sync Settings"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 8,
              border: `1px solid ${COLOR.line}`,
              background: syncState === "connected" ? "#F0F8F7" : "#fff",
              cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: syncState === "connected" ? COLOR.tealDeep : syncState === "error" ? COLOR.rose : COLOR.inkSoft,
            }}
          >
            {syncState === "syncing" ? (
              <Loader2 size={14} className="animate-spin" color={COLOR.teal} />
            ) : syncState === "connected" ? (
              <FileSpreadsheet size={14} color={COLOR.tealDeep} />
            ) : syncState === "error" ? (
              <CloudOff size={14} color={COLOR.rose} />
            ) : (
              <Settings size={14} />
            )}
            <span>
              {syncState === "connected"
                ? "Sheet Connected"
                : syncState === "syncing"
                ? "Syncing…"
                : syncState === "error"
                ? "Sync Issue"
                : "Connect Sheet"}
            </span>
          </button>

          {/* User Profile or Google Sign In */}
          {googleUser ? (
            <div
              onClick={() => setShowSyncSettings(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 8px 4px 4px",
                borderRadius: 20,
                background: COLOR.paper,
                border: `1px solid ${COLOR.line}`,
                cursor: "pointer",
              }}
              title={`Signed in as ${googleUser.email}`}
            >
              {googleUser.photoURL ? (
                <img
                  src={googleUser.photoURL}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  style={{ width: 26, height: 26, borderRadius: "50%" }}
                />
              ) : (
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: COLOR.tealDeep,
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {(googleUser.displayName || googleUser.email || "U")[0].toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: 12, fontWeight: 600, color: COLOR.ink, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {googleUser.displayName || googleUser.email.split("@")[0]}
              </span>
            </div>
          ) : (
            <GoogleSignInButton onClick={handleGoogleLogin} loading={isBusy} label="Sign in" />
          )}
        </div>
      </div>

      {/* Sync Banners */}
      {syncError && (
        <div style={{
          background: COLOR.roseSoft, color: COLOR.rose, padding: "10px 24px", fontSize: 12.5,
          display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid #F5C2C7`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{syncError}</span>
          </div>
          <button
            onClick={() => setShowSyncSettings(true)}
            style={{
              background: "transparent", border: "none", color: COLOR.rose, fontWeight: 700,
              fontSize: 12, cursor: "pointer", textDecoration: "underline"
            }}
          >
            Open Settings
          </button>
        </div>
      )}

      {syncSuccessMsg && (
        <div style={{
          background: "#EDF7F6", color: COLOR.tealDeep, padding: "8px 24px", fontSize: 12.5,
          display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${COLOR.tealSoft}`
        }}>
          <CheckCircle2 size={15} color={COLOR.tealDeep} />
          <span>{syncSuccessMsg}</span>
        </div>
      )}

      {importMsg && (
        <div style={{ background: COLOR.tealSoft, color: COLOR.tealDeep, padding: "8px 24px", fontSize: 12.5 }}>
          {importMsg}
        </div>
      )}

      {/* Main Body */}
      <div style={{ padding: "22px 24px 60px" }}>
        {cases.length === 0 && tab !== "entry" && (
          <div style={{
            background: COLOR.amberSoft, color: "#7A4B14", borderRadius: 10, padding: "12px 16px",
            fontSize: 12.5, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={15} />
              <span>
                {googleUser
                  ? "Connected to Google Sheet, but no case records were found in this sheet yet."
                  : "No cases loaded in current session. Sign in with Google to sync with your National Case Register spreadsheet, or enter a new case."}
              </span>
            </div>
            {!googleUser && (
              <GoogleSignInButton onClick={handleGoogleLogin} loading={isBusy} label="Connect with Google" />
            )}
          </div>
        )}
        {tab === "entry" && <EntryForm cases={cases} onSave={addCase} />}
        {tab === "registry" && (
          <Registry cases={cases} onOpen={setOpenCase} onImport={handleImport} onExport={handleExport} onDelete={deleteCase} />
        )}
        {tab === "analytics" && <Analytics cases={cases} />}
      </div>

      {/* Persistent Footer Bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, background: COLOR.tealDeep, color: "#DCE9E7",
        fontSize: 11.5, padding: "8px 24px", display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: "Inter, sans-serif", zIndex: 30
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>
            {googleUser
              ? `Connected to Google Sheet (${spreadsheetId.slice(0, 8)}…)`
              : "Local Session Mode — Click 'Sign in with Google' to sync directly with your Google Sheet."}
          </span>
          <a
            href={currentSheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#8AE0D6", textDecoration: "underline", display: "flex", alignItems: "center", gap: 3 }}
          >
            Open Sheet <ExternalLink size={11} />
          </a>
        </div>
        <span>{cases.length} safeguarding case{cases.length === 1 ? "" : "s"} in register</span>
      </div>

      {/* Modals */}
      {openCase && (
        <CaseModal
          c={openCase}
          onClose={() => setOpenCase(null)}
          onUpdate={updateCase}
          onDelete={deleteCase}
          onReport={(c) => setReportTarget(c)}
        />
      )}
      {reportTarget && (
        <ReportModal
          target={reportTarget}
          cases={reportTarget === "ALL" ? cases : cases}
          onClose={() => setReportTarget(null)}
        />
      )}
      {showSyncSettings && (
        <SyncSettingsModal
          spreadsheetId={spreadsheetId}
          sheetTab={sheetTab}
          onUpdateSheetConfig={updateSheetConfig}
          googleUser={googleUser}
          onGoogleLogin={handleGoogleLogin}
          onGoogleLogout={handleGoogleLogout}
          webhookUrl={webhookUrl}
          onSaveWebhookUrl={(url) => setWebhookUrl(url)}
          onPullDirect={pullDirectFromGoogle}
          onPushAllDirect={pushAllDirectToGoogle}
          onClose={() => setShowSyncSettings(false)}
          isBusy={isBusy}
          statusMessage={syncSuccessMsg}
        />
      )}
    </div>
  );
}
