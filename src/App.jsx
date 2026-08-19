import React, { useState, useMemo, useRef, useEffect } from "react";
import Papa from "papaparse";
import {
  ShieldCheck, ClipboardList, LayoutGrid, FileText, Sparkles,
  Upload, Download, Search, X, Printer, Copy, Check, AlertCircle,
  ChevronRight, Plus, Loader2, Settings, RefreshCw, CloudOff, Cloud
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
        "You are an AI assistant for the National Children's Commission. Extract structured facts from a child-protection incident narrative for a case intake form. Only use information explicitly present in the text — never invent names, ages, dates or locations. Leave a field as an empty string \"\" if it is not stated.";
      const prompt =
        `Return ONLY a JSON object (no markdown, no preamble) with exactly these keys: ${schema}.\n\n` +
        `Field guidance: reportType is "Initial-Report" or "Follow-up". status is one of ` +
        `${STATUS_OPTIONS.join("/")}. abuseType is one of ${ABUSE_TYPES.join("/")}. ` +
        `victimGender/perpetratorGender is one of ${GENDERS.join("/")}. district must be one of the ` +
        `official Malawi districts if mentioned: ${MALAWI_DISTRICTS.join(", ")}. confidentialityLevel ` +
        `defaults to "High" for any case involving a minor unless stated otherwise.\n\n` +
        `Narrative:\n"""${narrative}"""`;
      const extracted = await callGemini(prompt, { json: true, systemInstruction });
      const diffKeys = {};
      setForm((f) => {
        const next = { ...f };
        Object.keys(extracted).forEach((k) => {
          if (extracted[k] && FIELDS.some((fd) => fd.key === k)) {
            next[k] = extracted[k];
            diffKeys[k] = true;
          }
        });
        return next;
      });
      setChanged(diffKeys);
      setTimeout(() => setChanged({}), 4000);
    } catch (e) {
      setAiError("Couldn't auto-fill from that text. You can still fill the form in manually.");
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
const PIE_COLORS = [COLOR.teal, COLOR.amber, COLOR.rose, COLOR.sage, COLOR.tealDeep, "#B8AA8F"];

function countBy(cases, key) {
  const m = {};
  cases.forEach((c) => {
    const v = (c[key] || "Not stated").trim() || "Not stated";
    m[v] = (m[v] || 0) + 1;
  });
  return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${COLOR.line}`, padding: "16px 18px", flex: "1 1 140px" }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700, color: color || COLOR.ink }}>{value}</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLOR.inkSoft, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${COLOR.line}`, padding: 18, flex: "1 1 380px", minWidth: 0 }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, color: COLOR.tealDeep, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Analytics({ cases }) {
  if (cases.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 20px", color: COLOR.inkSoft, fontFamily: "Inter, sans-serif",
        background: "#fff", borderRadius: 12, border: `1px dashed ${COLOR.line}` }}>
        No data yet — add or import cases to see analytics.
      </div>
    );
  }

  const byAbuse = countBy(cases, "abuseType");
  const byDistrict = countBy(cases, "district").slice(0, 10);
  const byStatus = countBy(cases, "status");
  const byGender = countBy(cases, "victimGender");
  const open = cases.filter((c) => c.status === "Open" || c.status === "In Progress").length;
  const upcoming = cases.filter((c) => c.followUpDate && !["Not stated", "Not started", ""].includes(c.followUpDate.trim())).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        <StatCard label="Total cases" value={cases.length} />
        <StatCard label="Open / in progress" value={open} color={COLOR.rose} />
        <StatCard label="Districts represented" value={new Set(cases.map((c) => c.district).filter(Boolean)).size} color={COLOR.teal} />
        <StatCard label="With a follow-up date set" value={upcoming} color={COLOR.amber} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <ChartCard title="Cases by abuse classification">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byAbuse} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid stroke={COLOR.line} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11.5 }} />
              <Tooltip />
              <Bar dataKey="value" fill={COLOR.teal} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status breakdown">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                {byStatus.map((e, i) => <Cell key={i} fill={STATUS_COLOR[e.name] || PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Legend iconSize={9} wrapperStyle={{ fontSize: 11.5 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top districts by case count">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byDistrict} margin={{ left: -10 }}>
              <CartesianGrid stroke={COLOR.line} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10.5 }} interval={0} angle={-35} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill={COLOR.amber} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Victim gender">
          <ResponsiveContainer width="100%" height={240}>
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
