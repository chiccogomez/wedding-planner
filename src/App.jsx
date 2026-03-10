import React, { useState, useEffect, useMemo, useRef } from "react";
import './App.css';

/* ─── Style injection ─────────────────────────────────────────────────────── */
const injectStyles = () => {
  if (document.getElementById("wp5")) return;
  const s = document.createElement("style");
  s.id = "wp5";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,400&family=Jost:wght@300;400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    :root{--r:#C4967A;--b:#7A9EAD;--cr:#F7F2EA;--l:#EDE7D9;--ink:#2E2520;--m:#7A6E68;--g:#B8976A;--su:#7A9E8A;--wa:#C4A87A;--d:#C47A7A;--wh:#FDFAF5;}
    body{background:var(--cr);color:var(--ink);font-family:'Jost',sans-serif;}
    .sf{font-family:'Cormorant Garamond',serif;}
    input,select,textarea{font-family:'Jost',sans-serif;background:var(--wh);border:1px solid #D8D0C4;border-radius:6px;padding:8px 12px;font-size:13px;color:var(--ink);outline:none;width:100%;}
    input:focus,select:focus,textarea:focus{border-color:var(--r);}
    input[type=checkbox]{width:auto;}
    button{cursor:pointer;font-family:'Jost',sans-serif;}
    .fade{animation:fi .3s ease;}
    @keyframes fi{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:translateY(0);}}
    @keyframes shake{0%,100%{transform:translateX(0);}25%,75%{transform:translateX(-6px);}50%{transform:translateX(6px);}}
    .cal-day{min-height:58px;padding:4px 5px;border-radius:6px;background:var(--l);cursor:pointer;border:1.5px solid transparent;transition:border-color .15s;}
    .cal-day:hover{border-color:var(--r);}
    .cal-day.today{background:rgba(196,150,122,.18);border-color:var(--r);}
    .toggle-box{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--l);border-radius:8px;cursor:pointer;font-size:13px;}
    .budget-hint{font-size:11px;color:var(--m);background:var(--l);border-radius:6px;padding:8px 12px;margin-bottom:14px;}
    .budget-hint strong{color:var(--r);}
    .req{color:var(--d);margin-left:2px;}
  `;
  document.head.appendChild(s);
};

/* ─── Constants ───────────────────────────────────────────────────────────── */
const WEDDING = new Date("2027-01-15T15:00:00+08:00");
const php = n => `₱${Number(n || 0).toLocaleString("en-PH")}`;
const todayISO = () => new Date().toISOString().split("T")[0];
const toISO = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const num = v => Number(v) || 0;

// Supplier categories are derived from budget categories (edit them in the Budget tab)
const ETYPES = ["Payment Due","Meeting","Milestone","Fitting","Tasting","Personal"];
const MEALS = ["Beef","Fish","Chicken","Vegetarian"];
const RSVPS = ["Pending","Confirmed","Declined"];
const GROUPS = ["Bride","Groom","Mutual"];
const EC = {"Payment Due":"#C47A7A","Meeting":"#7A9EAD","Milestone":"#B8976A","Fitting":"#C4967A","Tasting":"#7A9E8A","Personal":"#7A6E68"};
const SC = {"Unpaid":"#C47A7A","Partial":"#C4A87A","Fully Paid":"#7A9E8A"};
const RC = {"Pending":"#C4A87A","Confirmed":"#7A9E8A","Declined":"#C47A7A"};

/* ─── Supplier total computation ─────────────────────────────────────────── */
// Total contract = base + crew meals (if applicable) + OOT fee (if applicable)
// DP is a payment toward the total — it reduces the balance, not adds to it
const computeSupplierTotal = (f) => {
  const base = num(f.baseAmount);
  const crew = f.hasCrew ? num(f.crewMeals) : 0;
  const oot = f.hasOOT ? num(f.ootFee) : 0;
  return base + crew + oot;
};

const INIT_S = [
  {id:1,name:"Antonio's Restaurant",category:"Venue",baseAmount:250000,hasDP:true,dpAmount:50000,dpDueDate:"2025-12-01",dpPaidDate:"2025-11-15",hasCrew:false,crewMeals:0,hasOOT:false,ootFee:0,total:250000,paid:50000,dueDate:"2026-10-01",status:"Partial",notes:"Cocktail @ Lanai + Main Dining",payments:[{date:"2025-11-15",amount:50000,note:"Downpayment"}]},
  {id:2,name:"Our Lady of Lourdes Parish",category:"Venue",baseAmount:15000,hasDP:false,dpAmount:0,dpDueDate:"",dpPaidDate:"",hasCrew:false,crewMeals:0,hasOOT:false,ootFee:0,total:15000,paid:0,dueDate:"2026-12-01",status:"Unpaid",notes:"Church fee + stipend",payments:[]},
  {id:3,name:"Photo/Video Team",category:"Photography",baseAmount:120000,hasDP:true,dpAmount:30000,dpDueDate:"2025-11-01",dpPaidDate:"2025-12-01",hasCrew:true,crewMeals:5000,hasOOT:true,ootFee:3000,total:128000,paid:30000,dueDate:"2026-11-15",status:"Partial",notes:"Full day + SDE",payments:[{date:"2025-12-01",amount:30000,note:"Downpayment"}]},
];
const INIT_G = [
  {id:1,name:"Jose Santos",phone:"09171234567",group:"Groom",rsvp:"Confirmed",meal:"Beef",plusOne:false,table:"1",notes:""},
  {id:2,name:"Maria dela Cruz",phone:"09189876543",group:"Bride",rsvp:"Pending",meal:"",plusOne:true,table:"",notes:"Dietary restriction"},
];
const INIT_B = [
  {id:1,  category:"Church",                    estimated:32400,   actual:0},
  {id:2,  category:"Wedding Rings",             estimated:100000,  actual:0},
  {id:3,  category:"Coordinator",               estimated:200000,  actual:0},
  {id:4,  category:"Venue",                     estimated:2000000, actual:0},
  {id:5,  category:"Hair and Make Up",          estimated:105000,  actual:0},
  {id:6,  category:"Photography",               estimated:300000,  actual:0},
  {id:7,  category:"Videography",               estimated:100000,  actual:0},
  {id:8,  category:"Styling and Flowers",       estimated:400000,  actual:0},
  {id:9,  category:"Entertainment / DJ / Strings", estimated:150000, actual:0},
  {id:10, category:"Lights and Sounds",         estimated:50000,   actual:0},
  {id:11, category:"Wedding Dress",             estimated:149000,  actual:0},
  {id:12, category:"Barong",                    estimated:100000,  actual:0},
  {id:13, category:"Gown of Mothers",           estimated:150000,  actual:0},
  {id:14, category:"Gown of Entourage",         estimated:350000,  actual:0},
  {id:15, category:"Barong of Fathers",         estimated:100000,  actual:0},
  {id:16, category:"Michelle Shoes",            estimated:20000,   actual:0},
  {id:17, category:"Chicco Shoes",              estimated:20000,   actual:0},
  {id:18, category:"Invites",                   estimated:20000,   actual:0},
  {id:19, category:"Souvenir",                  estimated:20000,   actual:0},
  {id:20, category:"Others",                    estimated:100000,  actual:0},
];
const INIT_E = [
  {id:1,title:"Antonio's 2nd Payment",date:"2026-06-15",type:"Payment Due",amount:100000,notes:""},
  {id:2,title:"Bridal Gown Fitting #1",date:"2026-03-20",type:"Fitting",amount:0,notes:""},
  {id:3,title:"Menu Tasting @ Antonio's",date:"2026-05-10",type:"Tasting",amount:0,notes:""},
  {id:4,title:"Prenuptial Shoot",date:"2026-04-05",type:"Milestone",amount:0,notes:"TBD"},
];

/* ─── localStorage helpers ────────────────────────────────────────────────── */
const store = {
  get: (key) => { try { return localStorage.getItem(key); } catch { return null; } },
  set: (key, value) => { try { localStorage.setItem(key, value); } catch {} },
};

/* ─── CSV/Excel download helper ───────────────────────────────────────────── */
const downloadCSV = (filename, headers, rows) => {
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

/* ─── CSV parse helper ────────────────────────────────────────────────────── */
const parseCSV = (text) => {
  const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    vals.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").replace(/^"|"$/g, ""); });
    return obj;
  });
};

/* ─── Shared UI components ────────────────────────────────────────────────── */
const Btn = ({ children, onClick, v = "primary", style: sx = {} }) => {
  const base = { border: "none", borderRadius: 6, fontWeight: 500, letterSpacing: 1, textTransform: "uppercase", fontSize: 10, padding: "7px 14px", transition: "opacity .15s", cursor: "pointer" };
  const vs = {
    primary:   { background: "var(--r)",  color: "var(--wh)" },
    secondary: { background: "var(--l)",  color: "var(--ink)" },
    ghost:     { background: "transparent", color: "var(--m)", border: "1px solid #D8D0C4" },
    danger:    { background: "var(--d)",  color: "var(--wh)" },
    success:   { background: "var(--su)", color: "var(--wh)" },
  };
  return <button style={{ ...base, ...vs[v], ...sx }} onClick={onClick}>{children}</button>;
};

const Card = ({ children, style: sx = {} }) => (
  <div style={{ background: "var(--wh)", borderRadius: 10, padding: 20, boxShadow: "0 2px 12px rgba(46,37,32,.06)", ...sx }}>
    {children}
  </div>
);

const Badge = ({ label, color }) => (
  <span style={{ background: color + "22", color, fontSize: 10, padding: "3px 8px", borderRadius: 20, fontWeight: 500, whiteSpace: "nowrap" }}>
    {label}
  </span>
);

const Field = ({ label, required, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--m)", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
      {label}{required && <span className="req">*</span>}
    </label>
    {children}
  </div>
);

const Modal = ({ title, children, onClose, wide }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(46,37,32,.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
    <div style={{ background: "var(--wh)", borderRadius: 12, padding: 28, width: "100%", maxWidth: wide ? 680 : 460, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(46,37,32,.2)" }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 className="sf" style={{ fontSize: 22, fontWeight: 400 }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, color: "var(--m)", lineHeight: 1, padding: "0 4px", cursor: "pointer" }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

/* ─── Dog sketch SVG ──────────────────────────────────────────────────────── */
const DogSketch = () => (
  <svg viewBox="0 0 120 110" width="90" height="82" fill="none" stroke="#C4967A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}>
    <path d="M28 42 Q18 18 32 10 Q38 28 42 38" /><path d="M92 42 Q102 18 88 10 Q82 28 78 38" />
    <ellipse cx="60" cy="52" rx="28" ry="24" />
    <circle cx="50" cy="46" r="4" /><circle cx="70" cy="46" r="4" />
    <circle cx="51.5" cy="44.5" r="1.2" fill="#C4967A" /><circle cx="71.5" cy="44.5" r="1.2" fill="#C4967A" />
    <ellipse cx="60" cy="57" rx="5" ry="3.5" fill="#C4967A" fillOpacity="0.3" />
    <path d="M55 60 Q60 65 65 60" />
    <path d="M40 36 Q44 28 50 32" /><path d="M50 30 Q55 22 62 28" /><path d="M62 27 Q68 20 75 30" /><path d="M75 31 Q80 26 80 36" />
    <path d="M38 70 Q32 90 38 102 Q48 108 60 106 Q72 108 82 102 Q88 90 82 70" />
    <path d="M46 90 Q44 100 44 106" /><path d="M74 90 Q76 100 76 106" />
    <path d="M40 106 Q44 110 48 106" /><path d="M72 106 Q76 110 80 106" />
    <path d="M82 80 Q96 70 98 58 Q96 50 90 56" />
    <path d="M50 72 Q54 68 58 72" strokeWidth="1" /><path d="M62 72 Q66 68 70 72" strokeWidth="1" />
    <path d="M46 80 Q50 76 54 80" strokeWidth="1" /><path d="M66 80 Q70 76 74 80" strokeWidth="1" />
  </svg>
);

/* ─── Countdown ───────────────────────────────────────────────────────────── */
function Countdown() {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = WEDDING - Date.now();
      if (diff <= 0) return setT({ d: 0, h: 0, m: 0, s: 0 });
      setT({ d: Math.floor(diff / 86400000), h: Math.floor(diff % 86400000 / 3600000), m: Math.floor(diff % 3600000 / 60000), s: Math.floor(diff % 60000 / 1000) });
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
      {[["Days", t.d], ["Hours", t.h], ["Mins", t.m], ["Secs", t.s]].map(([l, v]) => (
        <div key={l} style={{ textAlign: "center" }}>
          <div className="sf" style={{ fontSize: 42, lineHeight: 1, color: "var(--r)", fontWeight: 300 }}>{String(v).padStart(2, "0")}</div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "var(--m)", marginTop: 4, textTransform: "uppercase" }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Landing ─────────────────────────────────────────────────────────────── */
function Landing({ onEnter }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--cr)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, position: "relative", overflow: "hidden" }}>
      {[180, 320, 460].map((sz, i) => (
        <div key={i} style={{ position: "absolute", width: sz, height: sz, borderRadius: "50%", border: `1px solid rgba(196,150,122,${.12 - i * .04})`, top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />
      ))}
      <div className="fade" style={{ textAlign: "center", maxWidth: 500, zIndex: 1 }}>
        <p style={{ fontSize: 10, letterSpacing: 5, color: "var(--m)", textTransform: "uppercase", marginBottom: 18 }}>January 15, 2027 · Tagaytay</p>
        <h1 className="sf" style={{ fontSize: 62, fontWeight: 300, lineHeight: 1.1, color: "var(--ink)" }}>Chicco<br /><span style={{ fontSize: 40, color: "var(--g)" }}>&amp;</span><br />Michelle</h1>
        <div style={{ width: 50, height: 1, background: "var(--g)", margin: "22px auto" }} />
        <p style={{ fontFamily: "Georgia,serif", fontSize: 14, color: "var(--m)", fontStyle: "italic", marginBottom: 34, lineHeight: 1.9 }}>Our Lady of Lourdes Parish · Antonio's Restaurant</p>
        <div style={{ marginBottom: 44 }}><Countdown /></div>
        <button onClick={onEnter} style={{ background: "var(--ink)", color: "var(--cr)", border: "none", padding: "13px 38px", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", borderRadius: 2, cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--r)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--ink)"}>
          Enter Planning Dashboard
        </button>
        <p style={{ marginTop: 14, fontSize: 11, color: "#BFB5AB" }}>Private · Chicco &amp; Michelle only</p>
      </div>
    </div>
  );
}

/* ─── Gate ────────────────────────────────────────────────────────────────── */
function Gate({ onOk }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [shake, setShake] = useState(false);
  const go = () => {
    if (pw === "lulubear") { onOk(); }
    else { setErr(true); setShake(true); setTimeout(() => setShake(false), 500); }
  };
  return (
    <div style={{ minHeight: "100vh", background: "var(--cr)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="fade" style={{ background: "var(--wh)", borderRadius: 12, padding: "44px 38px", width: 340, boxShadow: "0 8px 40px rgba(46,37,32,.1)", textAlign: "center", animation: shake ? "shake .5s" : undefined }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><DogSketch /></div>
        <h2 className="sf" style={{ fontSize: 26, fontWeight: 400, marginBottom: 6 }}>Private Dashboard</h2>
        <p style={{ fontSize: 13, color: "var(--m)", marginBottom: 26 }}>Chicco &amp; Michelle only</p>
        <input type="password" placeholder="Password" value={pw}
          onChange={e => { setPw(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && go()}
          style={{ textAlign: "center", fontSize: 14, letterSpacing: 2, marginBottom: 8 }} />
        {err && <p style={{ fontSize: 12, color: "var(--d)", margin: "6px 0" }}>Incorrect password</p>}
        <button onClick={go} style={{ width: "100%", background: "var(--r)", color: "var(--wh)", border: "none", padding: 12, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", borderRadius: 6, marginTop: 6, cursor: "pointer" }}>Enter</button>
        <p style={{ fontSize: 11, color: "#C9B9A8", marginTop: 14 }}>Hint: Lulu's nickname</p>
      </div>
    </div>
  );
}

/* ─── Supplier form ───────────────────────────────────────────────────────── */
function SupplierForm({ form, setForm, budget, onSave, onCancel }) {
  const scats = budget.map(b => b.category);
  const cat = form.category || scats[0] || "Other";
  const budgetRow = budget.find(b => b.category.toLowerCase().includes(cat.toLowerCase().split("/")[0]));
  const budgeted = budgetRow?.estimated || 0;
  const spent = budgetRow?.actual || 0;
  const remaining = budgeted - spent;

  const base = num(form.baseAmount);
  const crew = form.hasCrew ? num(form.crewMeals) : 0;
  const oot = form.hasOOT ? num(form.ootFee) : 0;
  const total = base + crew + oot;
  const dp = form.hasDP ? num(form.dpAmount) : 0;
  const balance = total - dp;

  return (
    <>
      <Field label="Supplier / Company Name" required><input value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Field>
      <Field label="Category" required>
        <select value={cat} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
          {scats.map(c => <option key={c}>{c}</option>)}
        </select>
      </Field>

      {/* Contact details */}
      <div style={{ background: "rgba(122,158,173,.08)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--b)", textTransform: "uppercase", marginBottom: 10, fontWeight: 500 }}>Contact Person</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Contact Name"><input value={form.contactName || ""} onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))} placeholder="e.g. Maria Santos" /></Field>
          <Field label="Mobile / CP"><input value={form.contactPhone || ""} onChange={e => setForm(p => ({ ...p, contactPhone: e.target.value }))} placeholder="09XX XXX XXXX" /></Field>
          <Field label="Email" style={{ gridColumn: "1/-1" }}><input type="email" value={form.contactEmail || ""} onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))} placeholder="supplier@email.com" /></Field>
        </div>
      </div>

      {budgeted > 0 && (
        <div className="budget-hint">
          Budget for <strong>{budgetRow.category}</strong>: {php(budgeted)} &nbsp;·&nbsp; Spent: {php(spent)} &nbsp;·&nbsp; Remaining: <strong style={{ color: remaining < 0 ? "var(--d)" : "var(--su)" }}>{php(remaining)}</strong>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Base Amount (₱)" required><input type="number" value={form.baseAmount || ""} onChange={e => setForm(p => ({ ...p, baseAmount: e.target.value }))} /></Field>
        <Field label="Final Due Date"><input type="date" value={form.dueDate || ""} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} /></Field>
      </div>

      {/* Down payment toggle */}
      <div style={{ marginBottom: 14 }}>
        <label className="toggle-box" onClick={() => setForm(p => ({ ...p, hasDP: !p.hasDP }))}>
          <input type="checkbox" checked={!!form.hasDP} onChange={() => {}} style={{ accentColor: "var(--r)" }} />
          <span>Has Downpayment / Deposit</span>
        </label>
      </div>

      {form.hasDP && (
        <div style={{ background: "rgba(196,150,122,.08)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--r)", textTransform: "uppercase", marginBottom: 10, fontWeight: 500 }}>Downpayment Details</div>
          <p style={{ fontSize: 11, color: "var(--m)", marginBottom: 10 }}>DP is counted as your first payment — it reduces the remaining balance.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="DP Amount (₱)" required><input type="number" value={form.dpAmount || ""} onChange={e => setForm(p => ({ ...p, dpAmount: e.target.value }))} /></Field>
            <Field label="DP Due Date" required><input type="date" value={form.dpDueDate || ""} onChange={e => setForm(p => ({ ...p, dpDueDate: e.target.value }))} /></Field>
            <Field label="DP Date Paid"><input type="date" value={form.dpPaidDate || ""} onChange={e => setForm(p => ({ ...p, dpPaidDate: e.target.value }))} /></Field>
          </div>
        </div>
      )}

      {/* Crew meals toggle */}
      <div style={{ marginBottom: 8 }}>
        <label className="toggle-box" onClick={() => setForm(p => ({ ...p, hasCrew: !p.hasCrew }))}>
          <input type="checkbox" checked={!!form.hasCrew} onChange={() => {}} style={{ accentColor: "var(--b)" }} />
          <span>Includes Crew Meals</span>
        </label>
      </div>
      {form.hasCrew && (
        <div style={{ marginBottom: 14, paddingLeft: 4 }}>
          <Field label="Crew Meals (₱)"><input type="number" value={form.crewMeals || ""} onChange={e => setForm(p => ({ ...p, crewMeals: e.target.value }))} placeholder="0" /></Field>
        </div>
      )}

      {/* OOT toggle */}
      <div style={{ marginBottom: 8 }}>
        <label className="toggle-box" onClick={() => setForm(p => ({ ...p, hasOOT: !p.hasOOT }))}>
          <input type="checkbox" checked={!!form.hasOOT} onChange={() => {}} style={{ accentColor: "var(--b)" }} />
          <span>Includes Out-of-Town Fee</span>
        </label>
      </div>
      {form.hasOOT && (
        <div style={{ marginBottom: 14, paddingLeft: 4 }}>
          <Field label="Out-of-Town Fee (₱)"><input type="number" value={form.ootFee || ""} onChange={e => setForm(p => ({ ...p, ootFee: e.target.value }))} placeholder="0" /></Field>
        </div>
      )}

      {/* Total preview */}
      <div style={{ background: "var(--l)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, fontWeight: 500 }}>Contract Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, textAlign: "center", marginBottom: 10 }}>
          {[["Base", base], form.hasCrew && ["Crew Meals", crew], form.hasOOT && ["OOT Fee", oot]].filter(Boolean).map(([l, v]) => (
            <div key={l} style={{ background: "var(--wh)", borderRadius: 6, padding: "8px 4px" }}>
              <div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{php(v)}</div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #D8D0C4", paddingTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>Total Contract</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{php(total)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>Downpayment</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: form.hasDP ? "var(--su)" : "var(--m)" }}>{form.hasDP ? `− ${php(dp)}` : "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>Balance Due</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--r)" }}>{php(balance)}</div>
          </div>
        </div>
      </div>

      <Field label="Notes"><textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={{ minHeight: 55, resize: "vertical" }} /></Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn v="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={onSave}>Save Supplier</Btn>
      </div>
    </>
  );
}

/* ─── Suppliers tab ───────────────────────────────────────────────────────── */
function SuppliersTab({ suppliers, setSuppliers, budget }) {
  const [modal, setModal] = useState(null);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState({});
  const [pf, setPf] = useState({ date: todayISO(), amount: "", note: "", mode: "Bank Transfer" });
  const [editPayIdx, setEditPayIdx] = useState(null);
  const [sortCol, setSortCol] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [bulkResult, setBulkResult] = useState(null);
  const [showPayCats, setShowPayCats] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();
  const attachRef = useRef();
  const PAYMENT_MODES = ["Cash", "Bank Transfer", "GCash", "Maya", "Check", "Other"];
  const ATTACH_TYPES = ["Contract", "Draft", "Receipt", "QR"];

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const sortVal = (s, col) => {
    if (col === "name") return s.name.toLowerCase();
    if (col === "category") return s.category.toLowerCase();
    if (col === "total") return s.total || 0;
    if (col === "dp") return s.hasDP ? (s.dpAmount || 0) : -1;
    if (col === "paid") return s.paid || 0;
    if (col === "balance") return (s.total || 0) - (s.paid || 0);
    if (col === "dueDate") return s.dueDate || "";
    if (col === "status") return s.status || "";
    return "";
  };
  const filtered = suppliers.filter(s => (cat === "All" || s.category === cat) && s.name.toLowerCase().includes(q.toLowerCase()));
  const list = [...filtered].sort((a, b) => {
    const av = sortVal(a, sortCol), bv = sortVal(b, sortCol);
    const cmp = typeof av === "number" ? av - bv : av.localeCompare(bv);
    return sortDir === "asc" ? cmp : -cmp;
  });
  const tot = suppliers.reduce((a, s) => a + (s.total || 0), 0);
  const paid = suppliers.reduce((a, s) => a + (s.paid || 0), 0);

  // Payments grouped by category
  const payByCat = useMemo(() => {
    const cats = {};
    suppliers.forEach(s => {
      if (!cats[s.category]) cats[s.category] = { total: 0, paid: 0, suppliers: [] };
      cats[s.category].total += s.total || 0;
      cats[s.category].paid += s.paid || 0;
      cats[s.category].suppliers.push(s);
    });
    return cats;
  }, [suppliers]);

  const blankForm = () => ({ name: "", category: budget[0]?.category || "Other", baseAmount: "", hasDP: false, dpAmount: "", dpDueDate: "", dpPaidDate: "", hasCrew: false, crewMeals: "", hasOOT: false, ootFee: "", dueDate: "", notes: "", payments: [], attachments: [], contactName: "", contactPhone: "", contactEmail: "" });

  const save = () => {
    if (!form.name || !form.baseAmount) return alert("Name and Base Amount are required");
    if (form.hasDP && (!form.dpAmount || !form.dpDueDate)) return alert("Please fill DP Amount and DP Due Date");
    const total = computeSupplierTotal(form);
    // Build payments list — DP paid date adds it as first payment
    let finalPayments = [...(form.payments || [])];
    if (form.hasDP && form.dpPaidDate && form.dpAmount) {
      const alreadyLogged = finalPayments.some(p => p.note === "Downpayment");
      if (!alreadyLogged) finalPayments.unshift({ date: form.dpPaidDate, amount: num(form.dpAmount), note: "Downpayment" });
    }
    const paid = finalPayments.reduce((a, p) => a + num(p.amount), 0);
    const status = paid === 0 ? "Unpaid" : paid >= total ? "Fully Paid" : "Partial";
    const e = { ...form, id: sel?.id || Date.now(), total, paid, status, payments: finalPayments };
    setSuppliers(p => sel ? p.map(s => s.id === e.id ? e : s) : [...p, e]);
    setModal(null);
  };

  const recomputeSupplier = (s, newPayments) => {
    const pd = newPayments.reduce((a, x) => a + num(x.amount), 0);
    return { ...s, payments: newPayments, paid: pd, status: pd === 0 ? "Unpaid" : pd >= s.total ? "Fully Paid" : "Partial" };
  };

  const logPay = () => {
    if (!pf.amount) return;
    const p = { date: pf.date, amount: num(pf.amount), note: pf.note, mode: pf.mode };
    setSuppliers(prev => prev.map(s => {
      if (s.id !== sel.id) return s;
      let ps;
      if (editPayIdx !== null) {
        ps = s.payments.map((x, i) => i === editPayIdx ? p : x);
      } else {
        ps = [...(s.payments || []), p];
      }
      return recomputeSupplier(s, ps);
    }));
    setEditPayIdx(null);
    setPf({ date: todayISO(), amount: "", note: "", mode: "Bank Transfer" });
    setModal("view");
  };

  const delPayment = (payIdx) => {
    if (!window.confirm("Delete this payment?")) return;
    setSuppliers(prev => prev.map(s => {
      if (s.id !== sel.id) return s;
      const ps = s.payments.filter((_, i) => i !== payIdx);
      return recomputeSupplier(s, ps);
    }));
  };

  const del = id => { if (window.confirm("Delete supplier?")) setSuppliers(p => p.filter(s => s.id !== id)); };

  const addAttachment = (supplierId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const att = { id: Date.now() + Math.random(), name: file.name, type: "Contract", dataUrl: ev.target.result, mimeType: file.type, size: file.size };
      setSuppliers(prev => prev.map(s => s.id !== supplierId ? s : { ...s, attachments: [...(s.attachments || []), att] }));
    };
    reader.readAsDataURL(file);
  };

  const downloadTemplate = () => {
    downloadCSV("suppliers_template.csv",
      ["name","category","baseAmount","hasDP","dpAmount","dpDueDate","dpPaidDate","hasCrew","crewMeals","hasOOT","ootFee","dueDate","notes"],
      [["Antonio's Restaurant","Venue","250000","TRUE","50000","2025-12-01","2025-11-15","FALSE","0","FALSE","0","2026-10-01","Cocktail + Main Dining"],
       ["Photo Team","Photography","120000","TRUE","30000","2025-11-01","","TRUE","5000","TRUE","3000","2026-11-15","Full day SDE"]]
    );
  };

  const handleBulkFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCSV(ev.target.result);
      const added = [];
      rows.forEach(r => {
        if (!r.name) return;
        const hasCrew = (r.hascrew || r.hasCrew || "").toLowerCase() === "true";
        const hasOOT = (r.hasoot || r.hasOOT || "").toLowerCase() === "true";
        const f = {
          id: Date.now() + Math.random(),
          name: r.name, category: r.category || "Other",
          baseAmount: num(r.baseamount || r.baseAmount),
          hasDP: (r.hasdp || r.hasDP || "").toLowerCase() === "true",
          dpAmount: num(r.dpamount || r.dpAmount),
          dpDueDate: r.dpduedate || r.dpDueDate || "",
          dpPaidDate: r.dppaiddate || r.dpPaidDate || "",
          hasCrew, crewMeals: hasCrew ? num(r.crewmeals || r.crewMeals) : 0,
          hasOOT, ootFee: hasOOT ? num(r.ootfee || r.ootFee) : 0,
          dueDate: r.duedate || r.dueDate || "",
          notes: r.notes || "", payments: [],
        };
        f.total = computeSupplierTotal(f);
        if (f.hasDP && f.dpPaidDate && f.dpAmount) f.payments.push({ date: f.dpPaidDate, amount: f.dpAmount, note: "Downpayment" });
        f.paid = f.payments.reduce((a, p) => a + num(p.amount), 0);
        f.status = f.paid === 0 ? "Unpaid" : f.paid >= f.total ? "Fully Paid" : "Partial";
        added.push(f);
      });
      setSuppliers(p => [...p, ...added]);
      setBulkResult(`${added.length} supplier(s) imported.`);
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="fade">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
        {[["Total Contracts", tot, "var(--ink)"], ["Total Paid", paid, "var(--su)"], ["Outstanding", tot - paid, "var(--r)"]].map(([l, v, c]) => (
          <Card key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--m)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{l}</div>
            <div className="sf" style={{ fontSize: 26, color: c, fontWeight: 300 }}>{php(v)}</div>
          </Card>
        ))}
      </div>

      {/* Payments by category panel */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowPayCats(p => !p)}>
          <h4 style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--m)", fontWeight: 500 }}>Payments by Category</h4>
          <span style={{ fontSize: 12, color: "var(--m)" }}>{showPayCats ? "▲" : "▼"}</span>
        </div>
        {showPayCats && (
          <div style={{ marginTop: 14 }}>
            {Object.entries(payByCat).map(([catName, data]) => {
              const pct = data.total > 0 ? Math.min(100, (data.paid / data.total) * 100) : 0;
              return (
                <div key={catName} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>{catName}</span>
                    <span style={{ color: "var(--m)", fontSize: 12 }}>{php(data.paid)} / {php(data.total)}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--l)", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "var(--su)" : "var(--r)", borderRadius: 3 }} />
                  </div>
                  {data.suppliers.map(s => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "5px 8px", marginBottom: 2, background: "var(--cr)", borderRadius: 5 }}>
                      <span style={{ color: "var(--ink)" }}>{s.name}</span>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {(s.payments || []).length > 0 && (
                          <span style={{ fontSize: 11, color: "var(--m)" }}>{s.payments.length} payment{s.payments.length !== 1 ? "s" : ""}</span>
                        )}
                        <span style={{ color: "var(--r)", fontWeight: 500 }}>{php(s.total - (s.paid || 0))} left</span>
                        <Badge label={s.status} color={SC[s.status]} />
                        <Btn v="ghost" onClick={() => { setSel(s); setModal("view"); }} style={{ padding: "4px 8px", fontSize: 10 }}>View</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {Object.keys(payByCat).length === 0 && <p style={{ color: "var(--m)", fontSize: 13, textAlign: "center" }}>No suppliers yet.</p>}
          </div>
        )}
      </Card>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 130 }} />
        <select value={cat} onChange={e => setCat(e.target.value)} style={{ minWidth: 130 }}>
          <option value="All">All Categories</option>
          {budget.map(b => <option key={b.category}>{b.category}</option>)}
        </select>
        <Btn onClick={() => { setForm(blankForm()); setSel(null); setModal("form"); }}>+ Add</Btn>
        <Btn v="ghost" onClick={downloadTemplate}>↓ Template</Btn>
        <Btn v="secondary" onClick={() => fileRef.current.click()}>↑ Bulk Upload</Btn>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleBulkFile} />
      </div>
      {bulkResult && <div style={{ fontSize: 12, color: "var(--su)", marginBottom: 10, padding: "8px 12px", background: "rgba(122,158,138,.1)", borderRadius: 6 }}>{bulkResult} <button onClick={() => setBulkResult(null)} style={{ background: "none", border: "none", color: "var(--m)", cursor: "pointer", marginLeft: 8 }}>×</button></div>}

      <Card style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 780 }}>
          <thead>
            <tr style={{ background: "var(--l)" }}>
              {[["Supplier","name"],["Category","category"],["Contract","total"],["DP","dp"],["Paid","paid"],["Balance","balance"],["Due Date","dueDate"],["Status","status"],["",""]].map(([label, col]) => (
                <th key={label} onClick={col ? () => toggleSort(col) : undefined}
                  style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, letterSpacing: 1.5, color: "var(--m)", textTransform: "uppercase", fontWeight: 500, whiteSpace: "nowrap", cursor: col ? "pointer" : "default", userSelect: "none" }}>
                  {label}{col && sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : col ? " ·" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((s, i) => (
              <tr key={s.id} style={{ borderTop: "1px solid var(--l)", background: i % 2 === 0 ? "var(--wh)" : "var(--cr)" }}>
                <td style={{ padding: "11px 12px", fontWeight: 500 }}>{s.name}</td>
                <td style={{ padding: "11px 12px", color: "var(--m)", fontSize: 12 }}>{s.category}</td>
                <td style={{ padding: "11px 12px", fontWeight: 500 }}>{php(s.total)}</td>
                <td style={{ padding: "11px 12px", fontSize: 12 }}>{s.hasDP ? php(s.dpAmount) : "—"}</td>
                <td style={{ padding: "11px 12px", color: "var(--su)" }}>{php(s.paid)}</td>
                <td style={{ padding: "11px 12px", color: "var(--r)", fontWeight: 500 }}>{php(s.total - (s.paid || 0))}</td>
                <td style={{ padding: "11px 12px", color: "var(--m)", fontSize: 12 }}>{s.dueDate || "—"}</td>
                <td style={{ padding: "11px 12px" }}><Badge label={s.status} color={SC[s.status]} /></td>
                <td style={{ padding: "11px 12px" }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                    <Btn onClick={() => { setSel(s); setModal("view"); }} v="ghost">View{(s.attachments?.length) ? ` (${s.attachments.length})` : ""}</Btn>
                    <Btn onClick={() => { setSel(s); setEditPayIdx(null); setPf({ date: todayISO(), amount: "", note: "", mode: "Bank Transfer" }); setModal("pay"); }} v="success">+Pay</Btn>
                    <Btn onClick={() => { setForm({ ...s }); setSel(s); setModal("form"); }} v="secondary">Edit</Btn>
                    <Btn onClick={() => del(s.id)} v="danger">Del</Btn>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--m)" }}>No suppliers yet.</td></tr>}
          </tbody>
        </table>
      </Card>

      {modal === "form" && (
        <Modal title={sel ? "Edit Supplier" : "Add Supplier"} onClose={() => setModal(null)} wide>
          <SupplierForm form={form} setForm={setForm} budget={budget} onSave={save} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {modal === "pay" && sel && (
        <Modal title={editPayIdx !== null ? `Edit Payment — ${sel.name}` : `Log Payment — ${sel.name}`} onClose={() => { setModal("view"); setEditPayIdx(null); }}>
          <div style={{ background: "var(--l)", borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13 }}>
            {[["Contract", sel.total, "var(--ink)"], ["Paid", sel.paid, "var(--su)"], ["Remaining", sel.total - (sel.paid || 0), "var(--r)"]].map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "var(--m)" }}>{l}</span><strong style={{ color: c }}>{php(v)}</strong>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Date"><input type="date" value={pf.date} onChange={e => setPf(f => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="Amount (₱)"><input type="number" value={pf.amount} onChange={e => setPf(f => ({ ...f, amount: e.target.value }))} placeholder="0" /></Field>
            <Field label="Mode of Payment">
              <select value={pf.mode || "Bank Transfer"} onChange={e => setPf(f => ({ ...f, mode: e.target.value }))}>
                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Note"><input value={pf.note} onChange={e => setPf(f => ({ ...f, note: e.target.value }))} placeholder="e.g. 2nd tranche" /></Field>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn v="ghost" onClick={() => { setModal("view"); setEditPayIdx(null); }}>Cancel</Btn>
            <Btn v="success" onClick={logPay}>{editPayIdx !== null ? "Save Changes" : "Log Payment"}</Btn>
          </div>
        </Modal>
      )}

      {modal === "view" && sel && (() => {
        // Keep sel in sync with latest supplier data (payments may have changed)
        const liveSel = suppliers.find(s => s.id === sel.id) || sel;
        return (
        <Modal title={liveSel.name} onClose={() => setModal(null)} wide>
          {/* Contract breakdown */}
          <div style={{ background: "var(--l)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, fontWeight: 500 }}>Contract Breakdown</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, textAlign: "center", marginBottom: 10 }}>
              {[["Base", liveSel.baseAmount || liveSel.total], liveSel.hasCrew && ["Crew Meals", liveSel.crewMeals || 0], liveSel.hasOOT && ["OOT Fee", liveSel.ootFee || 0]].filter(Boolean).map(([l, v]) => (
                <div key={l} style={{ background: "var(--wh)", borderRadius: 6, padding: "8px 4px" }}>
                  <div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{php(v)}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, textAlign: "center", borderTop: "1px solid #D8D0C4", paddingTop: 10 }}>
              <div>
                <div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>Total Contract</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{php(liveSel.total)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>Total Paid</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--su)" }}>{php(liveSel.paid || 0)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>Balance Due</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--r)" }}>{php(liveSel.total - (liveSel.paid || 0))}</div>
              </div>
            </div>
          </div>

          {/* Contact details */}
          {(liveSel.contactName || liveSel.contactPhone || liveSel.contactEmail) && (
            <div style={{ background: "rgba(122,158,173,.08)", borderRadius: 8, padding: 12, marginBottom: 14, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontSize: 10, color: "var(--b)", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500, flexShrink: 0 }}>Contact</div>
              {liveSel.contactName && <span style={{ fontSize: 13, fontWeight: 500 }}>{liveSel.contactName}</span>}
              {liveSel.contactPhone && <a href={`tel:${liveSel.contactPhone}`} style={{ fontSize: 13, color: "var(--b)", textDecoration: "none" }}>📞 {liveSel.contactPhone}</a>}
              {liveSel.contactEmail && <a href={`mailto:${liveSel.contactEmail}`} style={{ fontSize: 13, color: "var(--r)", textDecoration: "none" }}>✉ {liveSel.contactEmail}</a>}
            </div>
          )}

          {/* Details grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
            {[["Category", liveSel.category], ["Final Due Date", liveSel.dueDate || "—"], ["Status", liveSel.status],
              liveSel.hasDP && ["Downpayment", php(liveSel.dpAmount)], liveSel.hasDP && ["DP Due Date", liveSel.dpDueDate || "—"], liveSel.hasDP && ["DP Paid On", liveSel.dpPaidDate || "Not yet"]
            ].filter(Boolean).map(([l, v]) => (
              <div key={l} style={{ background: "var(--l)", padding: 10, borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{l}</div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{v}</div>
              </div>
            ))}
          </div>

          {liveSel.notes && <p style={{ fontSize: 13, color: "var(--m)", background: "var(--l)", padding: 10, borderRadius: 6, marginBottom: 14 }}>{liveSel.notes}</p>}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h4 style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--m)" }}>Payment History</h4>
            <Btn v="success" onClick={() => { setEditPayIdx(null); setPf({ date: todayISO(), amount: "", note: "" }); setModal("pay"); }}>+ Log Payment</Btn>
          </div>
          {!(liveSel.payments?.length)
            ? <p style={{ fontSize: 13, color: "var(--m)", textAlign: "center", padding: 12 }}>No payments logged yet.</p>
            : <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--l)" }}>
                    {["Date", "Amount", "Mode", "Note", ""].map(h => <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 10, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {liveSel.payments.map((p, i) => (
                    <tr key={i} style={{ borderTop: "1px solid var(--l)" }}>
                      <td style={{ padding: "8px 10px" }}>{p.date}</td>
                      <td style={{ padding: "8px 10px", color: "var(--su)", fontWeight: 600 }}>{php(p.amount)}</td>
                      <td style={{ padding: "8px 10px" }}>{p.mode ? <Badge label={p.mode} color="var(--b)" /> : "—"}</td>
                      <td style={{ padding: "8px 10px", color: "var(--m)" }}>{p.note || "—"}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <Btn v="secondary" onClick={() => { setEditPayIdx(i); setPf({ date: p.date, amount: p.amount, note: p.note || "", mode: p.mode || "Bank Transfer" }); setModal("pay"); }}>Edit</Btn>
                          <Btn v="danger" onClick={() => delPayment(i)}>Del</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>}

          {/* Attachments section */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h4 style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--m)" }}>
                Attachments {liveSel.attachments?.length ? `(${liveSel.attachments.length})` : ""}
              </h4>
              <Btn v="ghost" onClick={() => attachRef.current.click()}>+ Attach File</Btn>
              <input ref={attachRef} type="file" accept="image/*,.pdf" multiple style={{ display: "none" }} onChange={e => {
                Array.from(e.target.files).forEach(f => addAttachment(liveSel.id, f));
                e.target.value = "";
              }} />
            </div>

            {/* Drag-and-drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false);
                Array.from(e.dataTransfer.files).forEach(f => addAttachment(liveSel.id, f));
              }}
              onClick={() => attachRef.current.click()}
              style={{
                border: `2px dashed ${dragOver ? "var(--r)" : "#D8D0C4"}`,
                borderRadius: 10, padding: "18px 12px", textAlign: "center",
                marginBottom: 12, cursor: "pointer", transition: "border-color .15s",
                background: dragOver ? "rgba(196,150,122,.06)" : "transparent",
              }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>📎</div>
              <div style={{ fontSize: 12, color: "var(--m)" }}>
                {dragOver ? "Drop to attach" : "Drag & drop files here, or click to browse"}
              </div>
              <div style={{ fontSize: 10, color: "#C9B9A8", marginTop: 4 }}>Images & PDFs supported · multiple files OK</div>
            </div>

            {!(liveSel.attachments?.length)
              ? <p style={{ fontSize: 13, color: "var(--m)", textAlign: "center", padding: 6 }}>No attachments yet.</p>
              : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {liveSel.attachments.map((att, i) => (
                    <div key={att.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--l)", borderRadius: 8, padding: "8px 12px" }}>
                      {att.mimeType?.startsWith("image/")
                        ? <img src={att.dataUrl} alt={att.name} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 4, flexShrink: 0, cursor: "pointer" }} onClick={() => window.open(att.dataUrl)} />
                        : <div style={{ width: 44, height: 44, background: "var(--r)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--wh)", fontWeight: 600, flexShrink: 0 }}>PDF</div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</div>
                        <select value={att.type} onChange={e => {
                          setSuppliers(prev => prev.map(s => s.id !== liveSel.id ? s : { ...s, attachments: s.attachments.map((a, j) => j === i ? { ...a, type: e.target.value } : a) }));
                        }} style={{ fontSize: 11, padding: "2px 6px", marginTop: 3, width: "auto" }}>
                          {ATTACH_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <Badge label={att.type} color="var(--g)" />
                      <a href={att.dataUrl} download={att.name} style={{ fontSize: 11, color: "var(--b)", textDecoration: "none", fontWeight: 500 }}>↓</a>
                      <button onClick={() => {
                        if (window.confirm("Remove attachment?"))
                          setSuppliers(prev => prev.map(s => s.id !== liveSel.id ? s : { ...s, attachments: s.attachments.filter((_, j) => j !== i) }));
                      }} style={{ background: "none", border: "none", color: "var(--d)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>}
          </div>
        </Modal>
        );
      })()}
    </div>
  );
}

/* ─── Calendar tab ────────────────────────────────────────────────────────── */
function CalendarTab({ events, setEvents }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [sel, setSel] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const fileRef = useRef();
  const todayStr = todayISO();

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month, 1).toLocaleString("default", { month: "long", year: "numeric" });

  const eventMap = useMemo(() => {
    const m = {};
    events.forEach(ev => { if (!m[ev.date]) m[ev.date] = []; m[ev.date].push(ev); });
    return m;
  }, [events]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const openAdd = dateStr => { setForm({ title: "", date: dateStr, type: "Meeting", amount: "", notes: "" }); setSel(null); setModal(true); };
  const openEdit = (ev, e) => { e.stopPropagation(); setForm({ ...ev }); setSel(ev); setModal(true); };
  const delEvent = id => { if (window.confirm("Delete?")) setEvents(p => p.filter(e => e.id !== id)); };
  const save = () => {
    const e = { ...form, id: sel?.id || Date.now(), amount: num(form.amount) };
    setEvents(p => sel ? p.map(x => x.id === e.id ? e : x) : [...p, e]);
    setModal(false);
  };

  const downloadTemplate = () => {
    downloadCSV("events_template.csv",
      ["title", "date", "type", "amount", "notes"],
      [["Bridal Gown Fitting #2", "2026-04-15", "Fitting", "0", ""],
       ["2nd Payment Antonio's", "2026-06-15", "Payment Due", "100000", "2nd tranche"]]
    );
  };

  const handleBulkFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCSV(ev.target.result);
      const added = rows.filter(r => r.title && r.date).map(r => ({
        id: Date.now() + Math.random(),
        title: r.title, date: r.date,
        type: ETYPES.includes(r.type) ? r.type : "Meeting",
        amount: num(r.amount), notes: r.notes || "",
      }));
      setEvents(p => [...p, ...added]);
      setBulkResult(`${added.length} event(s) imported.`);
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const upcoming = [...events].filter(e => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="fade">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16, alignItems: "start" }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button onClick={prevMonth} style={{ background: "var(--l)", border: "none", borderRadius: 6, width: 32, height: 32, fontSize: 18, color: "var(--m)", cursor: "pointer" }}>‹</button>
            <h3 className="sf" style={{ fontSize: 21, fontWeight: 400 }}>{monthLabel}</h3>
            <button onClick={nextMonth} style={{ background: "var(--l)", border: "none", borderRadius: 6, width: 32, height: 32, fontSize: 18, color: "var(--m)", cursor: "pointer" }}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 4 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 9, color: "var(--m)", letterSpacing: 1, textTransform: "uppercase", padding: "2px 0" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
            {cells.map((day, idx) => {
              if (day === null) return <div key={"b" + idx} />;
              const dateStr = toISO(year, month, day);
              const dayEvs = eventMap[dateStr] || [];
              const isToday = dateStr === todayStr;
              return (
                <div key={dateStr} className={"cal-day" + (isToday ? " today" : "")} onClick={() => openAdd(dateStr)}>
                  <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? "var(--r)" : "var(--ink)", marginBottom: 2 }}>{day}</div>
                  {dayEvs.slice(0, 2).map(ev => (
                    <div key={ev.id} onClick={e => openEdit(ev, e)} title={ev.title}
                      style={{ fontSize: 8, background: EC[ev.type] || "#999", color: "#fff", borderRadius: 3, padding: "1px 4px", marginBottom: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {ev.title}
                    </div>
                  ))}
                  {dayEvs.length > 2 && <div style={{ fontSize: 8, color: "var(--m)" }}>+{dayEvs.length - 2}</div>}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--l)" }}>
            {Object.entries(EC).map(([t, c]) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--m)" }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0 }} />{t}
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn onClick={() => openAdd(todayStr)} style={{ width: "100%" }}>+ Add Event</Btn>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn v="ghost" onClick={downloadTemplate} style={{ flex: 1, textAlign: "center" }}>↓ Template</Btn>
            <Btn v="secondary" onClick={() => fileRef.current.click()} style={{ flex: 1, textAlign: "center" }}>↑ Bulk</Btn>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleBulkFile} />
          </div>
          {bulkResult && <div style={{ fontSize: 11, color: "var(--su)", padding: "6px 10px", background: "rgba(122,158,138,.1)", borderRadius: 6 }}>{bulkResult}</div>}
          <Card style={{ padding: 16 }}>
            <h4 className="sf" style={{ fontSize: 17, fontWeight: 400, marginBottom: 12 }}>Upcoming</h4>
            {upcoming.length === 0
              ? <p style={{ fontSize: 12, color: "var(--m)", textAlign: "center" }}>No upcoming events</p>
              : upcoming.map(ev => (
                <div key={ev.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--l)", cursor: "pointer" }} onClick={e => openEdit(ev, e)}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, flex: 1, paddingRight: 6, lineHeight: 1.3 }}>{ev.title}</span>
                    <button onClick={e => { e.stopPropagation(); delEvent(ev.id); }} style={{ background: "none", border: "none", color: "#C9B9A8", fontSize: 16, cursor: "pointer", lineHeight: 1 }}>×</button>
                  </div>
                  <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                    <Badge label={ev.type} color={EC[ev.type]} />
                    <span style={{ fontSize: 10, color: "var(--m)" }}>{ev.date}</span>
                  </div>
                  {ev.amount > 0 && <div style={{ fontSize: 11, color: "var(--r)", marginTop: 3, fontWeight: 500 }}>{php(ev.amount)}</div>}
                </div>
              ))}
          </Card>
        </div>
      </div>

      {modal && (
        <Modal title={sel ? "Edit Event" : "Add Event"} onClose={() => setModal(false)}>
          <Field label="Title"><input value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Gown fitting" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Date"><input type="date" value={form.date || ""} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="Type">
              <select value={form.type || "Meeting"} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {ETYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Amount (₱)"><input type="number" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" /></Field>
          <Field label="Notes"><textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ minHeight: 55, resize: "vertical" }} /></Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {sel && <Btn v="danger" onClick={() => { delEvent(sel.id); setModal(false); }}>Delete</Btn>}
            <Btn v="ghost" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── Budget tab ──────────────────────────────────────────────────────────── */
function BudgetTab({ budget, setBudget, totalBudget, setTotalBudget }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [sel, setSel] = useState(null);
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput] = useState(totalBudget || "");

  const tE = budget.reduce((a, b) => a + (b.estimated || 0), 0);
  const tA = budget.reduce((a, b) => a + (b.actual || 0), 0);

  const save = () => {
    const e = { ...form, id: sel?.id || Date.now(), estimated: num(form.estimated), actual: num(form.actual) };
    setBudget(p => sel ? p.map(b => b.id === e.id ? e : b) : [...p, e]);
    setModal(false);
  };

  const saveTotal = () => { setTotalBudget(num(totalInput)); setEditingTotal(false); };

  return (
    <div className="fade">
      {/* Total budget cap */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--m)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Overall Budget Cap</div>
            {editingTotal
              ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="number" value={totalInput} onChange={e => setTotalInput(e.target.value)} style={{ width: 160 }} autoFocus />
                  <Btn onClick={saveTotal}>Set</Btn>
                  <Btn v="ghost" onClick={() => setEditingTotal(false)}>Cancel</Btn>
                </div>
              : <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="sf" style={{ fontSize: 28, fontWeight: 300, color: "var(--ink)" }}>{totalBudget ? php(totalBudget) : "Not set"}</span>
                  <Btn v="ghost" onClick={() => { setTotalInput(totalBudget || ""); setEditingTotal(true); }}>Edit</Btn>
                </div>}
          </div>
          {totalBudget > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Allocated vs Cap</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: tE > totalBudget ? "var(--d)" : "var(--su)" }}>{php(tE)} / {php(totalBudget)}</div>
              {tE > totalBudget && <div style={{ fontSize: 11, color: "var(--d)" }}>Over budget by {php(tE - totalBudget)}</div>}
            </div>
          )}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        {[["Allocated", tE, "var(--ink)"], ["Spent", tA, "var(--r)"], ["Remaining", tE - tA, (tE - tA) < 0 ? "var(--d)" : "var(--su)"]].map(([l, v, c]) => (
          <Card key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--m)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{l}</div>
            <div className="sf" style={{ fontSize: 26, color: c, fontWeight: 300 }}>{php(v)}</div>
          </Card>
        ))}
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 13 }}>
          <span style={{ color: "var(--m)" }}>Overall Spent</span>
          <span style={{ fontWeight: 500 }}>{tE > 0 ? Math.round((tA / tE) * 100) : 0}%</span>
        </div>
        <div style={{ height: 7, background: "var(--l)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, tE > 0 ? (tA / tE) * 100 : 0)}%`, background: "var(--r)", borderRadius: 4 }} />
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
        <Btn v="ghost" onClick={() => {
          if (window.confirm("This will replace all current budget categories with the default list. Actual spent amounts will be kept if the category name matches, otherwise reset to 0. Continue?")) {
            setBudget(INIT_B.map(b => {
              const existing = budget.find(x => x.category === b.category);
              return { ...b, actual: existing?.actual || 0 };
            }));
          }
        }}>↺ Reset to Defaults</Btn>
        <Btn onClick={() => { setForm({ category: "", estimated: "", actual: "" }); setSel(null); setModal(true); }}>+ Add Category</Btn>
      </div>

      <Card style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
          <thead>
            <tr style={{ background: "var(--l)" }}>
              {["Category", "Allocated", "Spent", "Variance", "Progress", ""].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, letterSpacing: 1.5, color: "var(--m)", textTransform: "uppercase", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {budget.map((b, i) => {
              const v = b.estimated - b.actual;
              const pct = b.estimated > 0 ? Math.min(100, (b.actual / b.estimated) * 100) : 0;
              return (
                <tr key={b.id} style={{ borderTop: "1px solid var(--l)", background: i % 2 === 0 ? "var(--wh)" : "var(--cr)" }}>
                  <td style={{ padding: "11px 12px", fontWeight: 500 }}>{b.category}</td>
                  <td style={{ padding: "11px 12px" }}>{php(b.estimated)}</td>
                  <td style={{ padding: "11px 12px", color: "var(--r)" }}>{php(b.actual)}</td>
                  <td style={{ padding: "11px 12px", color: v >= 0 ? "var(--su)" : "var(--d)", fontWeight: 500 }}>{v >= 0 ? "+" : ""}{php(v)}</td>
                  <td style={{ padding: "11px 12px", minWidth: 90 }}>
                    <div style={{ height: 5, background: "var(--l)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: pct > 100 ? "var(--d)" : pct > 80 ? "var(--wa)" : "var(--r)", borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 9, color: "var(--m)", marginTop: 2 }}>{Math.round(pct)}%</div>
                  </td>
                  <td style={{ padding: "11px 12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn onClick={() => { setForm({ ...b }); setSel(b); setModal(true); }} v="secondary">Edit</Btn>
                      <Btn onClick={() => { if (window.confirm("Remove category?")) setBudget(p => p.filter(x => x.id !== b.id)); }} v="danger">Del</Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {modal && (
        <Modal title={sel ? "Edit Category" : "Add Category"} onClose={() => setModal(false)}>
          <Field label="Category"><input value={form.category || ""} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Allocated (₱)"><input type="number" value={form.estimated || ""} onChange={e => setForm(f => ({ ...f, estimated: e.target.value }))} /></Field>
            <Field label="Actual Spent (₱)"><input type="number" value={form.actual || ""} onChange={e => setForm(f => ({ ...f, actual: e.target.value }))} /></Field>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn v="ghost" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── Guests tab ──────────────────────────────────────────────────────────── */
function GuestsTab({ guests, setGuests }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState("");
  const [fR, setFR] = useState("All");
  const [fG, setFG] = useState("All");
  const [fM, setFM] = useState("All");
  const [bulkResult, setBulkResult] = useState(null);
  const [activeBreakdown, setActiveBreakdown] = useState("rsvp");
  const fileRef = useRef();

  const list = guests.filter(g =>
    (fR === "All" || g.rsvp === fR) && (fG === "All" || g.group === fG) &&
    (fM === "All" || g.meal === fM) &&
    (g.name.toLowerCase().includes(q.toLowerCase()) || (g.phone || "").includes(q))
  );

  const conf = guests.filter(g => g.rsvp === "Confirmed").length;
  const pend = guests.filter(g => g.rsvp === "Pending").length;
  const decl = guests.filter(g => g.rsvp === "Declined").length;
  const heads = guests.filter(g => g.rsvp === "Confirmed").reduce((a, g) => a + 1 + (g.plusOne ? 1 : 0), 0);

  const save = () => {
    const e = { ...form, id: sel?.id || Date.now() };
    setGuests(p => sel ? p.map(g => g.id === e.id ? e : g) : [...p, e]);
    setModal(false);
  };

  const downloadTemplate = () => {
    downloadCSV("guests_template.csv",
      ["name", "phone", "group", "rsvp", "meal", "plusOne", "table", "notes"],
      [["Juan dela Cruz", "09171234567", "Groom", "Confirmed", "Beef", "FALSE", "1", ""],
       ["Ana Santos", "09189876543", "Bride", "Pending", "Fish", "TRUE", "2", "Vegetarian option"]]
    );
  };

  const handleBulkFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCSV(ev.target.result);
      const added = rows.filter(r => r.name).map(r => ({
        id: Date.now() + Math.random(),
        name: r.name, phone: r.phone || "",
        group: GROUPS.includes(r.group) ? r.group : "Mutual",
        rsvp: RSVPS.includes(r.rsvp) ? r.rsvp : "Pending",
        meal: MEALS.includes(r.meal) ? r.meal : "",
        plusOne: (r.plusone || r.plusOne || "").toLowerCase() === "true",
        table: r.table || "", notes: r.notes || "",
      }));
      setGuests(p => [...p, ...added]);
      setBulkResult(`${added.length} guest(s) imported.`);
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  // Breakdown data
  const breakdowns = {
    rsvp: RSVPS.map(r => ({ label: r, count: guests.filter(g => g.rsvp === r).length, color: RC[r] })),
    group: GROUPS.map(g => ({ label: g, count: guests.filter(x => x.group === g).length, color: g === "Bride" ? "var(--r)" : g === "Groom" ? "var(--b)" : "var(--m)" })),
    meal: [...MEALS, ""].map(m => ({ label: m || "Unset", count: guests.filter(g => g.meal === m).length, color: "var(--g)" })).filter(x => x.count > 0),
    table: [...new Set(guests.map(g => g.table || "Unassigned"))].sort().map(t => ({ label: `Table ${t}`, count: guests.filter(g => (g.table || "Unassigned") === t).length, color: "var(--b)" })),
  };

  return (
    <div className="fade">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        {[["Total", guests.length, "var(--ink)"], ["Confirmed", conf, "var(--su)"], ["Pending", pend, "var(--wa)"], ["Total Heads", heads, "var(--b)"]].map(([l, v, c]) => (
          <Card key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--m)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{l}</div>
            <div className="sf" style={{ fontSize: 30, color: c, fontWeight: 300 }}>{v}</div>
          </Card>
        ))}
      </div>

      {/* Breakdown panel */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {[["rsvp", "RSVP"], ["group", "Group"], ["meal", "Meal"], ["table", "Table"]].map(([k, l]) => (
            <button key={k} onClick={() => setActiveBreakdown(k)} style={{ padding: "5px 14px", borderRadius: 20, border: "none", fontSize: 11, fontWeight: 500, cursor: "pointer", background: activeBreakdown === k ? "var(--r)" : "var(--l)", color: activeBreakdown === k ? "var(--wh)" : "var(--m)" }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {breakdowns[activeBreakdown].map(item => (
            <div key={item.label} style={{ background: "var(--l)", borderRadius: 8, padding: "10px 16px", textAlign: "center", minWidth: 80 }}>
              <div style={{ fontSize: 22, fontWeight: 300, color: item.color }}>{item.count}</div>
              <div style={{ fontSize: 10, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 130 }} />
        <select value={fR} onChange={e => setFR(e.target.value)} style={{ minWidth: 100 }}>
          <option value="All">All RSVP</option>{RSVPS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={fG} onChange={e => setFG(e.target.value)} style={{ minWidth: 100 }}>
          <option value="All">All Groups</option>{GROUPS.map(g => <option key={g}>{g}</option>)}
        </select>
        <select value={fM} onChange={e => setFM(e.target.value)} style={{ minWidth: 100 }}>
          <option value="All">All Meals</option>{MEALS.map(m => <option key={m}>{m}</option>)}
        </select>
        <Btn onClick={() => { setForm({ name: "", phone: "", group: "Mutual", rsvp: "Pending", meal: "", plusOne: false, table: "", notes: "" }); setSel(null); setModal(true); }}>+ Add</Btn>
        <Btn v="ghost" onClick={downloadTemplate}>↓ Template</Btn>
        <Btn v="secondary" onClick={() => fileRef.current.click()}>↑ Bulk</Btn>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleBulkFile} />
      </div>
      {bulkResult && <div style={{ fontSize: 12, color: "var(--su)", marginBottom: 10, padding: "8px 12px", background: "rgba(122,158,138,.1)", borderRadius: 6 }}>{bulkResult} <button onClick={() => setBulkResult(null)} style={{ background: "none", border: "none", color: "var(--m)", cursor: "pointer", marginLeft: 8 }}>×</button></div>}

      <Card style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 620 }}>
          <thead>
            <tr style={{ background: "var(--l)" }}>
              {["Name", "Phone", "Group", "RSVP", "Meal", "+1", "Table", ""].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, letterSpacing: 1.5, color: "var(--m)", textTransform: "uppercase", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((g, i) => (
              <tr key={g.id} style={{ borderTop: "1px solid var(--l)", background: i % 2 === 0 ? "var(--wh)" : "var(--cr)" }}>
                <td style={{ padding: "10px 12px", fontWeight: 500 }}>{g.name}</td>
                <td style={{ padding: "10px 12px", color: "var(--m)", fontSize: 12 }}>{g.phone || "—"}</td>
                <td style={{ padding: "10px 12px" }}><Badge label={g.group} color={g.group === "Bride" ? "var(--r)" : g.group === "Groom" ? "var(--b)" : "var(--m)"} /></td>
                <td style={{ padding: "10px 12px" }}><Badge label={g.rsvp} color={RC[g.rsvp]} /></td>
                <td style={{ padding: "10px 12px", color: "var(--m)", fontSize: 12 }}>{g.meal || "—"}</td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>{g.plusOne ? "✓" : "—"}</td>
                <td style={{ padding: "10px 12px", color: "var(--m)", fontSize: 12 }}>{g.table || "—"}</td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    <Btn onClick={() => { setForm({ ...g }); setSel(g); setModal(true); }} v="secondary">Edit</Btn>
                    <Btn onClick={() => { if (window.confirm("Remove?")) setGuests(p => p.filter(x => x.id !== g.id)); }} v="danger">Del</Btn>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--m)" }}>No guests found.</td></tr>}
          </tbody>
        </table>
      </Card>

      {modal && (
        <Modal title={sel ? "Edit Guest" : "Add Guest"} onClose={() => setModal(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Full Name" required><input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Phone"><input value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="09XX XXX XXXX" /></Field>
            <Field label="Group">
              <select value={form.group || "Mutual"} onChange={e => setForm(f => ({ ...f, group: e.target.value }))}>
                {GROUPS.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="RSVP">
              <select value={form.rsvp || "Pending"} onChange={e => setForm(f => ({ ...f, rsvp: e.target.value }))}>
                {RSVPS.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Meal">
              <select value={form.meal || ""} onChange={e => setForm(f => ({ ...f, meal: e.target.value }))}>
                <option value="">—</option>{MEALS.map(m => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Table No."><input value={form.table || ""} onChange={e => setForm(f => ({ ...f, table: e.target.value }))} placeholder="e.g. 3" /></Field>
          </div>
          <Field label="+1?">
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={!!form.plusOne} onChange={e => setForm(f => ({ ...f, plusOne: e.target.checked }))} style={{ width: 15, height: 15 }} />
              Bringing a plus-one
            </label>
          </Field>
          <Field label="Notes"><textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ minHeight: 55, resize: "vertical" }} /></Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn v="ghost" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── Overview tab ────────────────────────────────────────────────────────── */
function OverviewTab({ suppliers, guests, budget, events, totalBudget }) {
  const tD = suppliers.reduce((a, s) => a + (s.total || 0), 0);
  const tP = suppliers.reduce((a, s) => a + (s.paid || 0), 0);
  const conf = guests.filter(g => g.rsvp === "Confirmed").length;
  const tB = totalBudget || budget.reduce((a, b) => a + b.estimated, 0);
  const tS = budget.reduce((a, b) => a + b.actual, 0);
  const ts = todayISO();
  const up = [...events].filter(e => e.date >= ts).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const dl = Math.ceil((WEDDING - new Date()) / 86400000);
  const unpaid = suppliers.filter(s => s.status !== "Fully Paid");
  return (
    <div className="fade">
      <Card style={{ marginBottom: 14, background: "linear-gradient(135deg,var(--ink) 0%,#4A3830 100%)", textAlign: "center", padding: "30px 20px" }}>
        <p style={{ fontSize: 9, letterSpacing: 4, textTransform: "uppercase", marginBottom: 7, color: "var(--g)" }}>Chicco &amp; Michelle</p>
        <h2 className="sf" style={{ fontSize: 32, fontWeight: 300, marginBottom: 3, color: "var(--cr)" }}>January 15, 2027</h2>
        <p style={{ fontSize: 12, color: "#A89880", marginBottom: 20 }}>Our Lady of Lourdes · Antonio's · Tagaytay</p>
        <div className="sf" style={{ fontSize: 52, fontWeight: 300, color: "var(--r)" }}>{dl}</div>
        <p style={{ fontSize: 9, letterSpacing: 4, textTransform: "uppercase", color: "#A89880" }}>Days to Go</p>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
        {[
          [`${php(tP)} paid`, "Payments", `of ${php(tD)}`, "var(--r)", tD > 0 ? (tP / tD) * 100 : 0],
          [`${conf} confirmed`, "RSVPs", `of ${guests.length}`, "var(--su)", guests.length > 0 ? (conf / guests.length) * 100 : 0],
          [`${tB > 0 ? Math.round((tS / tB) * 100) : 0}% used`, "Budget", `${php(tS)} of ${php(tB)}`, "var(--b)", tB > 0 ? Math.min(100, (tS / tB) * 100) : 0],
        ].map(([v, l, sub, c, pct]) => (
          <Card key={l}>
            <div style={{ fontSize: 10, color: "var(--m)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>{l}</div>
            <div className="sf" style={{ fontSize: 20, color: c, fontWeight: 300, marginBottom: 2 }}>{v}</div>
            <div style={{ fontSize: 11, color: "var(--m)", marginBottom: 9 }}>{sub}</div>
            <div style={{ height: 4, background: "var(--l)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: 2 }} />
            </div>
          </Card>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <h3 className="sf" style={{ fontSize: 19, fontWeight: 400, marginBottom: 12 }}>Upcoming Events</h3>
          {up.length === 0
            ? <p style={{ fontSize: 13, color: "var(--m)", textAlign: "center", padding: 14 }}>No upcoming events</p>
            : up.map(ev => (
              <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9, padding: "7px 9px", background: "var(--l)", borderRadius: 6 }}>
                <div style={{ width: 3, height: 32, borderRadius: 2, background: EC[ev.type], flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: "var(--m)" }}>{ev.date} · {ev.type}</div>
                </div>
                {ev.amount > 0 && <div style={{ fontSize: 12, color: "var(--r)", fontWeight: 500 }}>{php(ev.amount)}</div>}
              </div>
            ))}
        </Card>
        <Card>
          <h3 className="sf" style={{ fontSize: 19, fontWeight: 400, marginBottom: 12 }}>Pending Balances</h3>
          {unpaid.length === 0
            ? <p style={{ fontSize: 13, color: "var(--su)", textAlign: "center", padding: 14 }}>All paid! 🎉</p>
            : unpaid.map(s => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9, padding: "7px 9px", background: "var(--l)", borderRadius: 6 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: "var(--m)" }}>{s.category}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, color: "var(--r)", fontWeight: 500 }}>{php(s.total - (s.paid || 0))}</div>
                  <Badge label={s.status} color={SC[s.status]} />
                </div>
              </div>
            ))}
        </Card>
      </div>
    </div>
  );
}

/* ─── Dashboard ───────────────────────────────────────────────────────────── */
function Dashboard({ onLogout }) {
  const [tab, setTab] = useState("overview");
  const [suppliers, setSuppliers] = useState(INIT_S);
  const [guests, setGuests] = useState(INIT_G);
  const [budget, setBudget] = useState(INIT_B);
  const [events, setEvents] = useState(INIT_E);
  const [totalBudget, setTotalBudget] = useState(0);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    const s = store.get("cS"); if (s) setSuppliers(JSON.parse(s));
    const g = store.get("cG"); if (g) setGuests(JSON.parse(g));
    const b = store.get("cB"); if (b) setBudget(JSON.parse(b));
    const e = store.get("cE"); if (e) setEvents(JSON.parse(e));
    const tb = store.get("cTB"); if (tb) setTotalBudget(JSON.parse(tb));
  }, []);

  useEffect(() => {
    setSaved(false);
    const t = setTimeout(() => {
      store.set("cS", JSON.stringify(suppliers));
      store.set("cG", JSON.stringify(guests));
      store.set("cB", JSON.stringify(budget));
      store.set("cE", JSON.stringify(events));
      store.set("cTB", JSON.stringify(totalBudget));
      setSaved(true);
    }, 700);
    return () => clearTimeout(t);
  }, [suppliers, guests, budget, events, totalBudget]);

  const tabs = [
    { id: "overview",  label: "Overview",  icon: "◈" },
    { id: "suppliers", label: "Suppliers", icon: "₱" },
    { id: "calendar",  label: "Calendar",  icon: "◷" },
    { id: "budget",    label: "Budget",    icon: "◉" },
    { id: "guests",    label: "Guests",    icon: "◎" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--cr)", display: "flex" }}>
      <div style={{ width: 200, background: "var(--ink)", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "22px 16px 14px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
          <p style={{ fontSize: 8, letterSpacing: 4, color: "var(--g)", textTransform: "uppercase", marginBottom: 3 }}>Wedding Planner</p>
          <h2 className="sf" style={{ fontSize: 17, fontWeight: 300, color: "var(--cr)", lineHeight: 1.35 }}>Chicco &amp;<br />Michelle</h2>
          <p style={{ fontSize: 10, color: "#6A5E58", marginTop: 3 }}>Jan 15, 2027</p>
        </div>
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 11px",
              borderRadius: 7, border: "none", marginBottom: 2, fontSize: 12,
              fontFamily: "'Jost',sans-serif", transition: "all .15s",
              background: tab === t.id ? "rgba(196,150,122,.15)" : "transparent",
              color: tab === t.id ? "var(--r)" : "#8A7E78",
              borderLeft: tab === t.id ? "2px solid var(--r)" : "2px solid transparent",
            }}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ fontSize: 10, color: "#6A5E58", marginBottom: 7, paddingLeft: 10 }}>{saved ? "✓ Saved" : "Saving…"}</div>
          <button onClick={onLogout} style={{ width: "100%", padding: "8px 11px", border: "none", borderRadius: 7, background: "rgba(255,255,255,.04)", color: "#8A7E78", fontSize: 11, cursor: "pointer", textAlign: "left", fontFamily: "'Jost',sans-serif" }}>← Lock</button>
        </div>
      </div>
      <div style={{ flex: 1, padding: "22px", overflow: "auto" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 18 }}>
            <h1 className="sf" style={{ fontSize: 28, fontWeight: 300, color: "var(--ink)" }}>{tabs.find(t => t.id === tab)?.label}</h1>
            <p style={{ fontSize: 12, color: "var(--m)" }}>Chicco &amp; Michelle · January 15, 2027</p>
          </div>
          {tab === "overview"  && <OverviewTab  suppliers={suppliers} guests={guests} budget={budget} events={events} totalBudget={totalBudget} />}
          {tab === "suppliers" && <SuppliersTab suppliers={suppliers} setSuppliers={setSuppliers} budget={budget} />}
          {tab === "calendar"  && <CalendarTab  events={events} setEvents={setEvents} />}
          {tab === "budget"    && <BudgetTab    budget={budget} setBudget={setBudget} totalBudget={totalBudget} setTotalBudget={setTotalBudget} />}
          {tab === "guests"    && <GuestsTab    guests={guests} setGuests={setGuests} />}
        </div>
      </div>
    </div>
  );
}

/* ─── Root ────────────────────────────────────────────────────────────────── */
export default function App() {
  useEffect(() => { injectStyles(); }, []);
  const [page, setPage] = useState("landing");
  return (
    <div>
      {page === "landing"   && <Landing   onEnter={() => setPage("gate")} />}
      {page === "gate"      && <Gate      onOk={() => setPage("dashboard")} />}
      {page === "dashboard" && <Dashboard onLogout={() => setPage("landing")} />}
    </div>
  );
}
