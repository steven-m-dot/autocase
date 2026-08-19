import React, { useState, useMemo, useRef, useEffect } from "react";
import Papa from "papaparse";
import {
  ShieldCheck, ClipboardList, LayoutGrid, FileText, Sparkles,
  Upload, Download, Search, X, Printer, Copy, Check, AlertCircle,
  ChevronRight, Plus, Loader2, Settings, RefreshCw, CloudOff, Cloud,
  Filter, TrendingUp, Users, ShieldAlert, CheckCircle2, UserCheck,
  Building, AlertTriangle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

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
/*  Gemini API helper — calls /api/gemini/generate server endpoint so the */
/*  API key remains safely on the server. (structured extraction only —    */
/*  reports stay grounded in what was actually typed, never fabricated)    */
/* ---------------------------------------------------------------------- */
async function callGemini(prompt, { json = false, systemInstruction } = {}) {
  const res = await fetch("/api/gemini/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      json,
      systemInstruction,
    }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "AI request failed");
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
/*  Google Sheet sync (via a deployed Apps Script web app)                 */
/* ---------------------------------------------------------------------- */
async function sheetPull(url) {
  const res = await fetch(`${url}?action=list`);
  if (!res.ok) throw new Error("Sheet returned an error");
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Sheet returned an error");
  return data.cases || [];
}

async function sheetPush(url, action, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids a CORS preflight Apps Script can't handle
    body: JSON.stringify(action === "delete" ? { action, caseId: payload } : { action, case: payload }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Sheet rejected the write");
  return data;
}

function SyncSettingsModal({ url, onSave, onClose }) {
  const [val, setVal] = useState(url || "");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,18,23,.55)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16, zIndex: 70 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 520, padding: 22 }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Google Sheet sync</div>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: COLOR.inkSoft, lineHeight: 1.5, marginBottom: 12 }}>
          Paste the Web App URL from your deployed Apps Script (ends in <code>/exec</code>). Every save, edit,
          and delete will write straight to your sheet, and the app pulls the latest data whenever you open it.
        </p>
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLOR.line}`,
            fontFamily: "IBM Plex Mono, monospace", fontSize: 12.5, marginBottom: 14 }} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="ghost" small onClick={onClose}>Cancel</Btn>
          <Btn small icon={Check} onClick={() => { onSave(val.trim()); onClose(); }}>Save &amp; connect</Btn>
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
/*  Entry form + AI auto-fill                                              */
/* ---------------------------------------------------------------------- */
function EntryForm({ cases, onSave }) {
  const [form, setForm] = useState(() => ({ ...emptyCase(), caseId: generateCaseId(cases) }));
  const [narrative, setNarrative] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [changed, setChanged] = useState({});
  const [savedFlash, setSavedFlash] = useState(false);

  const setVal = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const runAutofill = async () => {
    if (!narrative.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const schema = FIELDS.filter((f) => !f.auto).map((f) => f.key).join(", ");
      const systemInstruction =
        "You are an expert child protection caseworker AI for the National Children's Commission of Malawi. " +
        "You extract structured facts from incident narratives, police blotters, news bulletins (e.g., Mibawa News, Zodiak, MBC), community reports, or field worker notes for official case intake registration. " +
        "The narrative may be written in Chichewa, Tumbuka, Yao, English, or a mix of languages. " +
        "Recognize Chichewa terms (e.g., 'mwana' = child, 'zaka' = years/age, 'ku simba / dambwe' = initiation camp, 'kumwalira / kufa' = died/death, 'Boma' = district, 'Mfumu yayikulu' = Traditional Authority / Senior Chief, 'Mudzi' = Village, 'wodulidwa' = circumcised, 'apilisi' = police). " +
        "Translate facts into clear, professional English for the case record fields. " +
        "Only extract facts explicitly stated or directly implied by the text. Leave any field as an empty string \"\" if not mentioned.";
      const prompt =
        `Extract case information from the narrative into a JSON object with these exact keys: ${schema}.\n\n` +
        `Field Rules & Allowed Values:\n` +
        `- reportType: "Initial-Report" or "Follow-up" (default "Initial-Report")\n` +
        `- status: "Open", "In Progress", "Referred", or "Closed" (use "In Progress" if investigation is underway, or "Open")\n` +
        `- abuseType: "Physical", "Sexual", "Emotional", "Exploitation", "Neglect", or "Other"\n` +
        `- victimGender / perpetratorGender: "Female", "Male", or "Not disclosed / Not stated"\n` +
        `- district: Must be one of the official Malawi districts if mentioned: ${MALAWI_DISTRICTS.join(", ")}\n` +
        `- confidentialityLevel: "High", "Medium", or "Low" (default "High" for minors or fatalities)\n` +
        `- consentObtained: "Yes", "No", or "N/A"\n` +
        `- description: Comprehensive English summary of the incident\n\n` +
        `Narrative:\n"""\n${narrative}\n"""\n\n` +
        `Return ONLY a valid JSON object matching the requested keys.`;
      const extracted = await callGemini(prompt, { json: true, systemInstruction });
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
      setAiError(e?.message || "Couldn't auto-fill from that text. You can still fill the form in manually.");
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
  };

  const groups = [...new Set(FIELDS.map((f) => f.group))];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 920 }}>
      <div style={{
        background: COLOR.tealDeep, borderRadius: 14, padding: "18px 20px",
        display: "flex", flexDirection: "column", gap: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
          <Sparkles size={16} color={COLOR.amber} />
          <span style={{ fontWeight: 600, fontSize: 13.5, fontFamily: "Inter, sans-serif" }}>
            Paste a field note, police report, or verbal account to auto-fill the form
          </span>
        </div>
        <textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="e.g. A 12-year-old girl from Machinga, GVH Maunde, was reportedly abused by a neighbour on 3 March 2026. Reported by the guardian to the local CPW…"
          style={{
            width: "100%", minHeight: 74, borderRadius: 8, border: "none", padding: "10px 12px",
            fontFamily: "Inter, sans-serif", fontSize: 13, resize: "vertical", outline: "none"
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Btn onClick={runAutofill} disabled={aiLoading || !narrative.trim()} icon={aiLoading ? Loader2 : Sparkles}>
            {aiLoading ? "Reading narrative…" : "Auto-fill form"}
          </Btn>
          <span style={{ color: "#C9D6D5", fontSize: 11.5, fontFamily: "Inter, sans-serif" }}>
            Only fills what's explicitly stated — nothing is invented.
          </span>
        </div>
        {aiError && (
          <div style={{ color: COLOR.amberSoft, fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <AlertCircle size={13} /> {aiError}
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

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22, paddingTop: 16, borderTop: `1px solid ${COLOR.line}` }}>
          <Btn variant="danger" small onClick={() => { onDelete(c); onClose(); }}>Delete case</Btn>
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
      setBriefingError("Could not generate AI briefing right now. Please verify your API connection.");
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
        <div style={{ background: "#FDF2F2", color: COLOR.rose, padding: "10px 14px", borderRadius: 8, fontSize: 12.5 }}>
          {briefingError}
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
  const [syncUrl, setSyncUrl] = useState(null);
  const [syncState, setSyncState] = useState("disconnected"); // disconnected | syncing | connected | error
  const [syncError, setSyncError] = useState("");
  const [showSyncSettings, setShowSyncSettings] = useState(false);

  // Load saved sync URL (per-browser convenience — case data itself lives in the Sheet)
  useEffect(() => {
    (async () => {
      try {
        const stored = await storage.get("gsheet_sync_url");
        if (stored && stored.value) {
          setSyncUrl(stored.value);
          pullFromSheet(stored.value);
        }
      } catch (e) { /* no saved URL yet */ }
    })();
  }, []);

  const pullFromSheet = async (url) => {
    setSyncState("syncing");
    setSyncError("");
    try {
      const remote = await sheetPull(url);
      setCases(remote);
      setSyncState("connected");
    } catch (e) {
      setSyncState("error");
      setSyncError("Couldn't reach the sheet. Check the Web App URL and that it's deployed with 'Anyone' access.");
    }
  };

  const saveSyncUrl = async (url) => {
    setSyncUrl(url || null);
    try { await storage.set("gsheet_sync_url", url); } catch (e) {}
    if (url) pullFromSheet(url);
    else setSyncState("disconnected");
  };

  const pushToSheet = async (action, payload) => {
    if (!syncUrl) return;
    setSyncState("syncing");
    try {
      await sheetPush(syncUrl, action, payload);
      setSyncState("connected");
    } catch (e) {
      setSyncState("error");
      setSyncError("Saved locally, but the write to the sheet failed. Try 'Pull latest' once it's reachable again.");
    }
  };

  const addCase = (c) => {
    setCases((cs) => [...cs, c]);
    pushToSheet("upsert", c);
  };
  const updateCase = (updated) => {
    setCases((cs) => cs.map((c) => (c.caseId === updated.caseId ? updated : c)));
    pushToSheet("upsert", updated);
  };
  const deleteCase = (target) => {
    setCases((cs) => cs.filter((c) => c.caseId !== target.caseId));
    pushToSheet("delete", target.caseId);
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
        setCases((cs) => [...cs, ...imported]);
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

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: COLOR.paper, minHeight: "100%", color: COLOR.ink }}>
      <style>{FONTS_IMPORT}</style>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 24px", borderBottom: `1px solid ${COLOR.line}`, background: "#fff"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: COLOR.tealDeep, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: 16.5, lineHeight: 1.1 }}>National Children's Commission</div>
            <div style={{ fontSize: 11, color: COLOR.inkSoft }}>Child Protection Case Register &amp; Tracking</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
              border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13,
              background: tab === n.id ? COLOR.tealSoft : "transparent",
              color: tab === n.id ? COLOR.tealDeep : COLOR.inkSoft,
            }}>
              <n.icon size={15} /> {n.label}
            </button>
          ))}
          <div style={{ width: 1, background: COLOR.line, margin: "0 4px" }} />
          <Btn small variant="outline" icon={FileText} onClick={() => setReportTarget("ALL")} disabled={cases.length === 0}>
            All-cases report
          </Btn>
          {syncUrl && (
            <Btn small variant="outline" icon={RefreshCw} onClick={() => pullFromSheet(syncUrl)}>
              Pull latest
            </Btn>
          )}
          <button onClick={() => setShowSyncSettings(true)} title="Google Sheet sync settings" style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8,
            border: `1px solid ${COLOR.line}`, background: "#fff", cursor: "pointer",
            fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600,
            color: syncState === "connected" ? COLOR.sage : syncState === "error" ? COLOR.rose : COLOR.inkSoft,
          }}>
            {syncState === "syncing" ? <Loader2 size={14} className="animate-spin" /> :
             syncState === "connected" ? <Cloud size={14} /> :
             syncState === "error" ? <CloudOff size={14} /> : <Settings size={14} />}
            {syncState === "connected" ? "Synced to Sheet" :
             syncState === "syncing" ? "Syncing…" :
             syncState === "error" ? "Sync error" : "Connect Sheet"}
          </button>
        </div>
      </div>

      {syncError && (
        <div style={{ background: COLOR.roseSoft, color: COLOR.rose, padding: "8px 24px", fontSize: 12.5 }}>{syncError}</div>
      )}

      {importMsg && (
        <div style={{ background: COLOR.tealSoft, color: COLOR.tealDeep, padding: "8px 24px", fontSize: 12.5 }}>{importMsg}</div>
      )}

      <div style={{ padding: "22px 24px 60px" }}>
        {cases.length === 0 && tab !== "entry" && (
          <div style={{
            background: COLOR.amberSoft, color: "#7A4B14", borderRadius: 10, padding: "10px 14px",
            fontSize: 12.5, marginBottom: 16, display: "flex", alignItems: "center", gap: 8
          }}>
            <AlertCircle size={14} />
            {syncUrl
              ? "No cases found in the connected sheet yet, or still loading."
              : "No cases loaded. Connect your Google Sheet (top right) for live sync, or import a CSV from the Registry tab."}
          </div>
        )}
        {tab === "entry" && <EntryForm cases={cases} onSave={addCase} />}
        {tab === "registry" && (
          <Registry cases={cases} onOpen={setOpenCase} onImport={handleImport} onExport={handleExport} onDelete={deleteCase} />
        )}
        {tab === "analytics" && <Analytics cases={cases} />}
      </div>

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, background: COLOR.tealDeep, color: "#DCE9E7",
        fontSize: 11.5, padding: "8px 24px", display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif"
      }}>
        <span>{syncUrl ? "Connected — every change writes to your Google Sheet automatically." : "Not connected to your Sheet yet — click 'Connect Sheet' above, or export CSV before closing to keep your records."}</span>
        <span>{cases.length} case{cases.length === 1 ? "" : "s"} in session</span>
      </div>

      {openCase && (
        <CaseModal c={openCase} onClose={() => setOpenCase(null)} onUpdate={updateCase} onDelete={deleteCase}
          onReport={(c) => setReportTarget(c)} />
      )}
      {reportTarget && (
        <ReportModal target={reportTarget} cases={reportTarget === "ALL" ? cases : cases}
          onClose={() => setReportTarget(null)} />
      )}
      {showSyncSettings && (
        <SyncSettingsModal url={syncUrl} onSave={saveSyncUrl} onClose={() => setShowSyncSettings(false)} />
      )}
    </div>
  );
}
