import React, { useState, useEffect, useMemo, useRef } from "react";
import './App.css';
import { createClient } from '@supabase/supabase-js';

/* ─── Supabase ────────────────────────────────────────────────────────────── */
const sb = createClient(
  "https://ebmwssxsqptnuriituhg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVibXdzc3hzcXB0bnVyaWl0dWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMTk0NzcsImV4cCI6MjA4ODc5NTQ3N30.tflIvMyitoti4BqLqBs-5oAq7-lX4mW1oS6Olv7WRMc"
);

// FIX: 10-second timeout on load so the app doesn't hang indefinitely
const sbLoad = () => Promise.race([
  (async () => {
    const [s, g, b, e, tb] = await Promise.all([
      sb.from("suppliers").select("*").order("id"),
      sb.from("guests").select("*").order("id"),
      sb.from("budget").select("*").eq("id", "main").single(),
      sb.from("events").select("*").order("id"),
      sb.from("settings").select("*").eq("key", "totalBudget").single(),
    ]);
    return {
      suppliers:   s.data?.map(r => r.data) || null,
      guests:      g.data?.map(r => r.data) || null,
      budget:      b.data?.data || null,
      events:      e.data?.map(r => r.data) || null,
      totalBudget: tb.data?.value ?? null,
    };
  })(),
  new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000)),
]);

// FIX: cleanup helper handles the empty-array delete case correctly
// FIX: budget.actual stripped — it's a stale field; spent is computed live from supplier payments
const sbSave = async (suppliers, guests, budget, events, totalBudget) => {
  const cleanup = (table, ids) =>
    ids.length > 0
      ? sb.from(table).delete().not("id", "in", `(${ids.join(",")})`)
      : sb.from(table).delete().gte("id", 0);   // delete all rows when list is empty

  await Promise.all([
    sb.from("suppliers").upsert(suppliers.map(s => ({ id: s.id, data: s }))),
    sb.from("guests").upsert(guests.map(g => ({ id: g.id, data: g }))),
    // Strip the stale `actual` field — spent is derived live from supplier payments
    sb.from("budget").upsert({ id: "main", data: budget.map(({ actual, ...rest }) => rest) }),
    sb.from("events").upsert(events.map(e => ({ id: e.id, data: e }))),
    sb.from("settings").upsert({ key: "totalBudget", value: totalBudget }),
    cleanup("suppliers", suppliers.map(s => s.id)),
    cleanup("guests",    guests.map(g => g.id)),
    cleanup("events",    events.map(e => e.id)),
  ]);
};

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
// FIX: renamed from `php` to `peso` — `php` is ambiguous with the PHP language
const peso = n => `₱${Number(n || 0).toLocaleString("en-PH")}`;
const todayISO = () => new Date().toISOString().split("T")[0];
const toISO = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const num = v => Number(v) || 0;
// FIX: helper for generating safe integer IDs in bulk loops
const newId = (idx = 0) => Date.now() + idx;

const ETYPES = ["Payment Due","Meeting","Milestone","Fitting","Tasting","Personal"];
const MEALS = ["Beef","Fish","Chicken","Vegetarian"];
const RSVPS = ["Pending","Confirmed","Declined"];
const GROUPS = ["Bride","Groom","Mutual"];
const EC = {"Payment Due":"#C47A7A","Meeting":"#7A9EAD","Milestone":"#B8976A","Fitting":"#C4967A","Tasting":"#7A9E8A","Personal":"#7A6E68"};
const SC = {"Unpaid":"#C47A7A","Partial":"#C4A87A","Fully Paid":"#7A9E8A"};
const RC = {"Pending":"#C4A87A","Confirmed":"#7A9E8A","Declined":"#C47A7A"};

/* ─── Supplier total computation ─────────────────────────────────────────── */
const computeSupplierTotal = (f) => {
  const base = num(f.baseAmount);
  const crew = f.hasCrew ? num(f.crewMeals) : 0;
  const oot  = f.hasOOT  ? num(f.ootFee)    : 0;
  return base + crew + oot;
};

const INIT_S = [
  {id:1,name:"Antonio's",category:"Venue",baseAmount:2000000,hasDP:true,dpAmount:20000,dpDueDate:"2026-01-24",dpPaidDate:"2026-01-24",hasCrew:false,crewMeals:0,hasOOT:false,ootFee:0,total:2000000,paid:20000,dueDate:"2026-12-31",status:"Partial",notes:"",payments:[{date:"2026-01-24",amount:20000,note:"Downpayment",mode:"BPI"}]},
  {id:2,name:"Rosa Clara",category:"Wedding Dress",baseAmount:149000,hasDP:true,dpAmount:89400,dpDueDate:"2026-01-31",dpPaidDate:"2026-01-31",hasCrew:false,crewMeals:0,hasOOT:false,ootFee:0,total:149000,paid:89400,dueDate:"2026-12-05",status:"Partial",notes:"",payments:[{date:"2026-01-31",amount:89400,note:"Downpayment",mode:"Bank Transfer"}]},
  {id:3,name:"Mark Qua",category:"Hair and Make Up",baseAmount:105000,hasDP:true,dpAmount:10000,dpDueDate:"2026-02-20",dpPaidDate:"2026-02-20",hasCrew:false,crewMeals:0,hasOOT:false,ootFee:0,total:105000,paid:10000,dueDate:"2026-12-31",status:"Partial",notes:"",payments:[{date:"2026-02-20",amount:10000,note:"Downpayment",mode:"Bank Transfer"}]},
  {id:4,name:"Joseph Pascual",category:"Photography",baseAmount:180000,hasDP:true,dpAmount:90000,dpDueDate:"2026-03-05",dpPaidDate:"2026-03-05",hasCrew:false,crewMeals:0,hasOOT:false,ootFee:0,total:180000,paid:90000,dueDate:"2026-12-05",status:"Partial",notes:"",payments:[{date:"2026-03-05",amount:90000,note:"Downpayment",mode:"Bank Transfer"}]},
  {id:5,name:"Church",category:"Church",baseAmount:32400,hasDP:true,dpAmount:15000,dpDueDate:"2026-02-02",dpPaidDate:"2026-02-02",hasCrew:false,crewMeals:0,hasOOT:false,ootFee:0,total:32400,paid:15000,dueDate:"2026-12-31",status:"Partial",notes:"Our Lady of Lourdes Parish",payments:[{date:"2026-02-02",amount:15000,note:"Downpayment",mode:"Cash"}]},
  {id:6,name:"Bespoke Manila",category:"Coordinator",baseAmount:180000,hasDP:true,dpAmount:30000,dpDueDate:"2026-02-02",dpPaidDate:"2026-02-02",hasCrew:false,crewMeals:0,hasOOT:false,ootFee:0,total:180000,paid:30000,dueDate:"2026-12-31",status:"Partial",notes:"",payments:[{date:"2026-02-02",amount:30000,note:"Downpayment",mode:"BDO"}]},
  {id:7,name:"Nicolai",category:"Photography",baseAmount:106000,hasDP:true,dpAmount:20000,dpDueDate:"2026-03-01",dpPaidDate:"2026-03-01",hasCrew:false,crewMeals:0,hasOOT:false,ootFee:0,total:106000,paid:20000,dueDate:"2026-12-05",status:"Partial",notes:"",payments:[{date:"2026-03-01",amount:20000,note:"Downpayment",mode:"BPI"}]},
  {id:8,name:"Woodstock",category:"Videography",baseAmount:91000,hasDP:true,dpAmount:10000,dpDueDate:"2026-03-02",dpPaidDate:"2026-03-02",hasCrew:false,crewMeals:0,hasOOT:false,ootFee:0,total:91000,paid:10000,dueDate:"2026-12-05",status:"Partial",notes:"",payments:[{date:"2026-03-02",amount:10000,note:"Downpayment",mode:"BPI"}]},
  {id:9,name:"Il Fiore",category:"Styling and Flowers",baseAmount:259000,hasDP:true,dpAmount:77700,dpDueDate:"2026-02-26",dpPaidDate:"2026-02-26",hasCrew:false,crewMeals:0,hasOOT:false,ootFee:0,total:259000,paid:77700,dueDate:"2026-12-05",status:"Partial",notes:"",payments:[{date:"2026-02-26",amount:77700,note:"Downpayment",mode:"BPI"}]},
  {id:10,name:"Artuz",category:"Lights and Sounds",baseAmount:36000,hasDP:true,dpAmount:2000,dpDueDate:"2026-02-26",dpPaidDate:"2026-02-26",hasCrew:false,crewMeals:0,hasOOT:false,ootFee:0,total:36000,paid:2000,dueDate:"2026-12-05",status:"Partial",notes:"Balance split: ₱16,000 due Nov 14 + ₱18,000 due Dec 5",payments:[{date:"2026-02-26",amount:2000,note:"Downpayment",mode:"BPI"},{date:"2026-11-14",amount:16000,note:"2nd payment (pending)",mode:"BPI"},{date:"2026-12-05",amount:18000,note:"3rd payment (pending)",mode:"BPI"}]},
];
const INIT_G = [
  {id:1,name:"Jose Santos",phone:"09171234567",group:"Groom",rsvp:"Confirmed",meal:"Beef",plusOne:false,table:"1",notes:""},
  {id:2,name:"Maria dela Cruz",phone:"09189876543",group:"Bride",rsvp:"Pending",meal:"",plusOne:true,table:"",notes:"Dietary restriction"},
];
const INIT_B = [
  {id:1,  category:"Church",                       estimated:32400},
  {id:2,  category:"Wedding Rings",                estimated:100000},
  {id:3,  category:"Coordinator",                  estimated:180000},
  {id:4,  category:"Venue",                        estimated:2000000},
  {id:5,  category:"Hair and Make Up",             estimated:105000},
  {id:6,  category:"Photography",                  estimated:286000},
  {id:7,  category:"Videography",                  estimated:91000},
  {id:8,  category:"Styling and Flowers",          estimated:259000},
  {id:9,  category:"Entertainment / DJ / Strings", estimated:150000},
  {id:10, category:"Lights and Sounds",            estimated:36000},
  {id:11, category:"Wedding Dress",                estimated:149000},
  {id:12, category:"Barong",                       estimated:100000},
  {id:13, category:"Gown of Mothers",              estimated:150000},
  {id:14, category:"Gown of Entourage",            estimated:350000},
  {id:15, category:"Barong of Fathers",            estimated:100000},
  {id:16, category:"Michelle Shoes",               estimated:20000},
  {id:17, category:"Chicco Shoes",                 estimated:20000},
  {id:18, category:"Invites",                      estimated:20000},
  {id:19, category:"Souvenir",                     estimated:20000},
  {id:20, category:"Others",                       estimated:100000},
];
const INIT_E = [
  {id:1,title:"Artuz – 2nd Payment",date:"2026-11-14",type:"Payment Due",amount:16000,notes:"₱16,000 balance (BPI)"},
  {id:2,title:"Joseph Pascual – Balance",date:"2026-12-05",type:"Payment Due",amount:90000,notes:"₱90,000 balance (Bank Transfer)"},
  {id:3,title:"Nicolai – Balance",date:"2026-12-05",type:"Payment Due",amount:86000,notes:"₱86,000 balance (BPI)"},
  {id:4,title:"Woodstock – Balance",date:"2026-12-05",type:"Payment Due",amount:81000,notes:"₱81,000 balance (BPI)"},
  {id:5,title:"Il Fiore – Balance",date:"2026-12-05",type:"Payment Due",amount:181300,notes:"₱181,300 balance (BPI)"},
  {id:6,title:"Rosa Clara – Balance",date:"2026-12-05",type:"Payment Due",amount:59600,notes:"₱59,600 balance (Bank Transfer)"},
  {id:7,title:"Artuz – 3rd Payment",date:"2026-12-05",type:"Payment Due",amount:18000,notes:"₱18,000 balance (BPI)"},
  {id:8,title:"Antonio's – Balance",date:"2026-12-31",type:"Payment Due",amount:1980000,notes:"₱1,980,000 balance (BPI)"},
  {id:9,title:"Bespoke Manila – Balance",date:"2026-12-31",type:"Payment Due",amount:150000,notes:"₱150,000 balance (BDO)"},
  {id:10,title:"Mark Qua – Balance",date:"2026-12-31",type:"Payment Due",amount:95000,notes:"₱95,000 balance"},
  {id:11,title:"Church – Balance",date:"2026-12-31",type:"Payment Due",amount:17400,notes:"₱17,400 balance (Cash)"},
  {id:12,title:"Bridal Gown Fitting #1",date:"2026-03-20",type:"Fitting",amount:0,notes:""},
  {id:13,title:"Menu Tasting @ Antonio's",date:"2026-05-10",type:"Tasting",amount:0,notes:""},
  {id:14,title:"Prenuptial Shoot",date:"2026-04-05",type:"Milestone",amount:0,notes:"TBD"},
];

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

/* ─── Taal Volcano Sketch ─────────────────────────────────────────────────── */
const TaalSketch = ({ width = 400, color = "#C4967A" }) => (
  <svg viewBox="0 0 400 220" width={width} height={width * 220 / 400} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.82 }}>
    <path d="M60 38 Q72 30 84 36 Q88 26 100 28 Q114 22 118 34 Q126 30 128 38" strokeWidth="1" opacity="0.4"/>
    <path d="M280 28 Q292 20 308 24 Q316 16 330 20 Q344 18 348 28 Q356 24 360 32" strokeWidth="1" opacity="0.4"/>
    <path d="M0 90 Q40 72 80 80 Q120 68 160 75 Q200 65 240 72 Q280 62 320 70 Q360 65 400 75 L400 95 L0 95 Z" strokeWidth="1.2" fill="rgba(196,150,122,.06)" opacity="0.7"/>
    <path d="M30 130 Q100 118 200 122 Q300 118 370 130" strokeWidth="1.4"/>
    <path d="M20 138 Q100 128 200 132 Q300 128 380 138" strokeWidth="0.8" opacity="0.5"/>
    <path d="M40 146 Q120 138 200 140 Q280 138 360 146" strokeWidth="0.6" opacity="0.35"/>
    <path d="M80 134 Q100 131 120 134" strokeWidth="0.7" opacity="0.4"/>
    <path d="M170 128 Q200 125 230 128" strokeWidth="0.7" opacity="0.4"/>
    <path d="M270 133 Q295 130 320 133" strokeWidth="0.7" opacity="0.4"/>
    <path d="M158 122 Q175 100 200 96 Q225 100 242 122" strokeWidth="1.6"/>
    <path d="M178 104 Q190 98 200 97 Q210 98 222 104" strokeWidth="1.2"/>
    <ellipse cx="200" cy="108" rx="12" ry="5" strokeWidth="1" opacity="0.7"/>
    <path d="M165 118 Q170 112 175 108" strokeWidth="0.8" opacity="0.5"/>
    <path d="M235 118 Q230 112 225 108" strokeWidth="0.8" opacity="0.5"/>
    <path d="M172 120 Q176 115 180 111" strokeWidth="0.7" opacity="0.4"/>
    <path d="M228 120 Q224 115 220 111" strokeWidth="0.7" opacity="0.4"/>
    <path d="M0 165 Q50 142 110 155 Q160 145 200 150 Q240 145 290 155 Q340 145 400 160 L400 220 L0 220 Z" strokeWidth="1.6" fill="rgba(196,150,122,.07)"/>
    <path d="M20 168 Q50 158 80 165" strokeWidth="0.8" opacity="0.45"/>
    <path d="M300 162 Q330 155 360 162" strokeWidth="0.8" opacity="0.45"/>
    <path d="M35 165 L35 152 M28 158 Q35 148 42 158" strokeWidth="1.1" opacity="0.6"/>
    <path d="M55 162 L55 150 M48 156 Q55 146 62 156" strokeWidth="1.1" opacity="0.6"/>
    <path d="M18 170 L18 160 M13 165 Q18 157 23 165" strokeWidth="0.9" opacity="0.5"/>
    <path d="M345 162 L345 150 M338 156 Q345 146 352 156" strokeWidth="1.1" opacity="0.6"/>
    <path d="M365 165 L365 154 M358 159 Q365 150 372 159" strokeWidth="1.1" opacity="0.6"/>
    <path d="M380 168 L380 159 M375 163 Q380 155 385 163" strokeWidth="0.9" opacity="0.5"/>
    <path d="M100 170 Q104 162 108 170 M108 170 Q112 163 116 170" strokeWidth="0.9" opacity="0.5"/>
    <path d="M200 155 Q204 148 208 155 M208 155 Q212 149 216 155" strokeWidth="0.9" opacity="0.5"/>
    <path d="M270 165 Q274 158 278 165 M278 165 Q282 159 286 165" strokeWidth="0.9" opacity="0.5"/>
    <path d="M130 178 L270 178" strokeWidth="1" opacity="0.3"/>
    <path d="M135 178 L135 185 M160 178 L160 185 M185 178 L185 185 M210 178 L210 185 M235 178 L235 185 M260 178 L260 185" strokeWidth="0.8" opacity="0.25"/>
  </svg>
);

/* ─── Church Sketch ───────────────────────────────────────────────────────── */
const ChurchSketch = ({ width = 400, color = "#C4967A" }) => (
  <svg viewBox="0 0 400 280" width={width} height={width * 280 / 400} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.82 }}>
    <path d="M0 270 Q200 265 400 270" strokeWidth="1.2" opacity="0.4"/>
    <path d="M120 270 Q200 267 280 270" strokeWidth="0.8" opacity="0.3"/>
    <path d="M130 262 L270 262" strokeWidth="1.2"/>
    <path d="M140 256 L260 256" strokeWidth="1.2"/>
    <path d="M148 250 L252 250" strokeWidth="1.2"/>
    <rect x="148" y="130" width="104" height="120" strokeWidth="1.5"/>
    <path d="M148 155 L252 155 M148 175 L252 175 M148 195 L252 195 M148 215 L252 215" strokeWidth="0.5" opacity="0.2"/>
    <path d="M140 130 L200 90 L260 130" strokeWidth="1.6"/>
    <path d="M200 78 L200 92 M194 84 L206 84" strokeWidth="1.4"/>
    <circle cx="200" cy="148" r="18" strokeWidth="1.3"/>
    <circle cx="200" cy="148" r="10" strokeWidth="0.9"/>
    <circle cx="200" cy="148" r="4" strokeWidth="0.9"/>
    <path d="M200 130 L200 138 M200 158 L200 166 M182 148 L190 148 M210 148 L218 148" strokeWidth="0.9"/>
    <path d="M187 135 L192 140 M208 156 L213 161 M187 161 L192 156 M208 140 L213 135" strokeWidth="0.8"/>
    <path d="M178 250 L178 200 Q178 185 200 185 Q222 185 222 200 L222 250" strokeWidth="1.5"/>
    <path d="M178 220 L222 220" strokeWidth="0.9"/>
    <path d="M200 185 L200 250" strokeWidth="0.9"/>
    <rect x="182" y="222" width="14" height="18" strokeWidth="0.7" opacity="0.5"/>
    <rect x="204" y="222" width="14" height="18" strokeWidth="0.7" opacity="0.5"/>
    <rect x="182" y="200" width="14" height="16" rx="7" strokeWidth="0.7" opacity="0.5"/>
    <rect x="204" y="200" width="14" height="16" rx="7" strokeWidth="0.7" opacity="0.5"/>
    <circle cx="197" cy="235" r="2" strokeWidth="1" fill="none"/>
    <circle cx="203" cy="235" r="2" strokeWidth="1" fill="none"/>
    <path d="M156 180 L156 215 Q156 222 162 222 Q168 222 168 215 L168 180" strokeWidth="1.1"/>
    <path d="M156 195 L168 195" strokeWidth="0.7" opacity="0.5"/>
    <path d="M156 207 L168 207" strokeWidth="0.7" opacity="0.5"/>
    <path d="M232 180 L232 215 Q232 222 238 222 Q244 222 244 215 L244 180" strokeWidth="1.1"/>
    <path d="M232 195 L244 195" strokeWidth="0.7" opacity="0.5"/>
    <path d="M232 207 L244 207" strokeWidth="0.7" opacity="0.5"/>
    <rect x="60" y="140" width="60" height="130" strokeWidth="1.5"/>
    <path d="M60 200 L120 200" strokeWidth="1"/>
    <path d="M60 170 L120 170" strokeWidth="0.8"/>
    <path d="M60 155 L120 155 M60 185 L120 185 M60 215 L120 215" strokeWidth="0.4" opacity="0.2"/>
    <path d="M70 148 L70 165 Q70 172 80 172 Q90 172 90 165 L90 148" strokeWidth="1.1"/>
    <path d="M94 148 L94 165 Q94 172 104 172 Q114 172 114 165 L114 148" strokeWidth="1.1"/>
    <path d="M76 158 Q80 153 84 158 Q84 163 80 165 Q76 163 76 158" strokeWidth="0.9" opacity="0.7"/>
    <path d="M100 158 Q104 153 108 158 Q108 163 104 165 Q100 163 100 158" strokeWidth="0.9" opacity="0.7"/>
    <path d="M60 140 L90 108 L120 140" strokeWidth="1.4"/>
    <path d="M90 95 L90 110 M84 101 L96 101" strokeWidth="1.4"/>
    <path d="M78 270 L78 240 Q78 232 90 232 Q102 232 102 240 L102 270" strokeWidth="1.2"/>
    <path d="M72 210 L72 225 Q72 230 78 230 Q84 230 84 225 L84 210" strokeWidth="1"/>
    <path d="M96 210 L96 225 Q96 230 102 230 Q108 230 108 225 L108 210" strokeWidth="1"/>
    <path d="M30 265 Q38 252 46 265 Q54 252 62 265" strokeWidth="1.1" opacity="0.55"/>
    <path d="M122 265 Q128 256 134 265 Q140 256 146 265" strokeWidth="1.1" opacity="0.55"/>
    <path d="M254 265 Q260 256 266 265 Q272 256 278 265" strokeWidth="1.1" opacity="0.55"/>
    <path d="M338 265 Q346 252 354 265 Q362 252 370 265" strokeWidth="1.1" opacity="0.55"/>
    <path d="M350 270 Q348 230 352 200 Q354 170 350 145" strokeWidth="1.3" opacity="0.6"/>
    <path d="M350 145 Q340 132 328 138 M350 145 Q342 128 335 130 M350 145 Q358 128 368 134 M350 145 Q362 132 372 138" strokeWidth="1.1" opacity="0.55"/>
    <path d="M28 270 Q26 248 30 228" strokeWidth="1.1" opacity="0.5"/>
    <path d="M30 228 Q22 218 14 222 M30 228 Q24 214 18 216 M30 228 Q36 214 44 220" strokeWidth="1" opacity="0.5"/>
  </svg>
);

/* ─── Flower SVG Logo ─────────────────────────────────────────────────────── */
const FlowerLogo = ({ size = 80, color = "#C4967A" }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} fill="none" stroke={color} strokeWidth="1.4">
    <circle cx="50" cy="34" r="18" />
    <circle cx="50" cy="66" r="18" />
    <circle cx="34" cy="50" r="18" />
    <circle cx="66" cy="50" r="18" />
    <circle cx="50" cy="50" r="7" />
    <circle cx="50" cy="50" r="2.5" fill={color} />
  </svg>
);

/* ─── Public Landing Page ─────────────────────────────────────────────────── */
function Landing({ onEnter }) {
  const [adminClicks, setAdminClicks] = useState(0);
  const [rsvpName, setRsvpName] = useState("");
  const [rsvpAttending, setRsvpAttending] = useState(null);
  const [rsvpNote, setRsvpNote] = useState("");
  const [rsvpSent, setRsvpSent] = useState(false);
  const [rsvpError, setRsvpError] = useState("");
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizAns, setQuizAns] = useState(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  const handleLogoClick = () => {
    const next = adminClicks + 1;
    setAdminClicks(next);
    if (next >= 5) { setAdminClicks(0); onEnter(); }
  };

  const handleRsvp = async () => {
    if (!rsvpName.trim()) { setRsvpError("Please enter your name."); return; }
    if (rsvpAttending === null) { setRsvpError("Please select if you'll be attending."); return; }
    const entry = { id: Date.now(), name: rsvpName.trim(), attending: rsvpAttending, note: rsvpNote.trim(), submittedAt: new Date().toISOString() };
    await sb.from("rsvps").insert({ id: entry.id, data: entry });
    setRsvpSent(true);
  };

  const quiz = [
    { q: "Where did Chicco and Michelle first meet?", opts: ["At a coffee shop", "Through mutual friends", "At work", "At a concert"], ans: 1 },
    { q: "What is Chicco's favorite thing to cook?", opts: ["Pasta", "BBQ", "Sinigang", "Breakfast"], ans: 2 },
    { q: "What does Michelle do when she's stressed?", opts: ["Retail therapy", "Binge-watch K-dramas", "Go for a run", "Call her mom"], ans: 1 },
    { q: "How long have Chicco and Michelle been together?", opts: ["2 years", "4 years", "6 years", "8 years"], ans: 2 },
    { q: "What is the couple's dog's name?", opts: ["Coco", "Lulu", "Mocha", "Biscuit"], ans: 1 },
  ];

  const handleQuizAns = (i) => {
    if (quizAns !== null) return;
    setQuizAns(i);
    if (i === quiz[quizIdx].ans) setQuizScore(s => s + 1);
  };

  const nextQuiz = () => {
    if (quizIdx + 1 >= quiz.length) { setQuizDone(true); }
    else { setQuizIdx(q => q + 1); setQuizAns(null); }
  };

  const divider = (
    <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "52px auto", maxWidth: 340 }}>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, #C4967A66)" }} />
      <FlowerLogo size={20} color="#C4967A" />
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, #C4967A66)" }} />
    </div>
  );

  const SectionLabel = ({ children }) => (
    <p style={{ fontSize: 9, letterSpacing: 6, color: "#C4967A", textTransform: "uppercase", marginBottom: 12, fontWeight: 500 }}>{children}</p>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'Jost', sans-serif", color: "#2E2520" }}>

      {/* ── Hero ── */}
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(196,150,122,.13) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(to right, #C4967A, #B8976A, #7A9EAD, #C4967A)" }} />

        <div className="fade" style={{ zIndex: 1, maxWidth: 480 }}>
          <div onClick={handleLogoClick} style={{ cursor: "default", userSelect: "none", marginBottom: 32, display: "flex", justifyContent: "center" }}>
            <FlowerLogo size={76} color="#C4967A" />
          </div>
          <p style={{ fontSize: 9, letterSpacing: 7, color: "#C4967A", textTransform: "uppercase", marginBottom: 22 }}>Together with their families</p>
          <h1 className="sf" style={{ fontSize: 64, fontWeight: 300, lineHeight: 1, color: "#2E2520", marginBottom: 6 }}>Chicco</h1>
          <p className="sf" style={{ fontSize: 28, color: "#B8976A", fontStyle: "italic", margin: "4px 0" }}>&amp;</p>
          <h1 className="sf" style={{ fontSize: 64, fontWeight: 300, lineHeight: 1, color: "#2E2520", marginBottom: 28 }}>Michelle</h1>
          <p style={{ fontSize: 9, letterSpacing: 6, color: "#9A8E88", textTransform: "uppercase", marginBottom: 40 }}>Request the honour of your presence</p>
          <Countdown />
          <div style={{ marginTop: 36, display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(196,150,122,.12)", border: "1px solid rgba(196,150,122,.3)", borderRadius: 3, padding: "10px 24px" }}>
            <span style={{ fontSize: 10, letterSpacing: 4, color: "#C4967A", textTransform: "uppercase" }}>January 15, 2027 · Tagaytay</span>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", fontSize: 9, letterSpacing: 4, color: "#C4B8AC", textTransform: "uppercase" }}>scroll ↓</div>
      </div>

      {/* ── Taal + Quote ── */}
      <div style={{ background: "linear-gradient(135deg, #EDE7D9 0%, #E8DDD0 100%)", padding: "72px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(196,150,122,.08)", pointerEvents: "none" }} />
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <TaalSketch width={Math.min(520, typeof window !== "undefined" ? window.innerWidth - 48 : 460)} />
        </div>
        <p style={{ fontSize: 9, letterSpacing: 5, color: "#C4967A", textTransform: "uppercase", marginBottom: 20 }}>Tagaytay City, Cavite</p>
        <p className="sf" style={{ fontSize: 23, fontWeight: 300, fontStyle: "italic", color: "#6E6258", lineHeight: 2, maxWidth: 500, margin: "0 auto" }}>
          "Join us in celebrating our union beneath the open skies of Tagaytay, where the lake meets the mountains and the evening glows golden."
        </p>
      </div>

      {/* ── The Celebration ── */}
      <div style={{ padding: "80px 24px", textAlign: "center", maxWidth: 540, margin: "0 auto" }}>
        <SectionLabel>The Celebration</SectionLabel>
        <h2 className="sf" style={{ fontSize: 42, fontWeight: 300, color: "#2E2520", marginBottom: 48 }}>January 15, 2027</h2>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <ChurchSketch width={360} />
        </div>

        <div style={{ borderRadius: 8, marginBottom: 16, textAlign: "left", background: "#fff", boxShadow: "0 4px 20px rgba(46,37,32,.07)", overflow: "hidden", border: "1px solid #EDE7D9" }}>
          <div style={{ height: 4, background: "linear-gradient(to right, #C4967A, #B8976A)" }} />
          <div style={{ padding: "22px 26px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 9, letterSpacing: 3, color: "#C4967A", textTransform: "uppercase", fontWeight: 600 }}>3:00 PM</span>
              <div style={{ width: 1, height: 12, background: "#E0D8D0" }} />
              <span style={{ fontSize: 9, letterSpacing: 3, color: "#7A9EAD", textTransform: "uppercase" }}>Wedding Ceremony</span>
            </div>
            <p className="sf" style={{ fontSize: 24, fontWeight: 400, color: "#2E2520", marginBottom: 4 }}>Our Lady of Lourdes Parish</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 12, color: "#9A8E88" }}>Tagaytay City, Cavite</p>
              <a href="https://maps.google.com/?q=Our+Lady+of+Lourdes+Parish+Tagaytay" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, letterSpacing: 2, color: "#C4967A", textTransform: "uppercase", textDecoration: "none", borderBottom: "1px solid rgba(196,150,122,.3)" }}>Get Directions ↗</a>
            </div>
          </div>
        </div>

        <div style={{ borderRadius: 8, textAlign: "left", background: "#fff", boxShadow: "0 4px 20px rgba(46,37,32,.07)", overflow: "hidden", border: "1px solid #EDE7D9" }}>
          <div style={{ height: 4, background: "linear-gradient(to right, #7A9EAD, #8AAEBA)" }} />
          <div style={{ padding: "22px 26px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 9, letterSpacing: 3, color: "#C4967A", textTransform: "uppercase", fontWeight: 600 }}>5:00 PM</span>
              <div style={{ width: 1, height: 12, background: "#E0D8D0" }} />
              <span style={{ fontSize: 9, letterSpacing: 3, color: "#7A9EAD", textTransform: "uppercase" }}>Cocktails &amp; Dinner</span>
            </div>
            <p className="sf" style={{ fontSize: 24, fontWeight: 400, color: "#2E2520", marginBottom: 4 }}>Antonio's Restaurant</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 12, color: "#9A8E88" }}>Tagaytay City, Cavite</p>
              <a href="https://maps.google.com/?q=Antonio%27s+Restaurant+Tagaytay" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, letterSpacing: 2, color: "#7A9EAD", textTransform: "uppercase", textDecoration: "none", borderBottom: "1px solid rgba(122,158,173,.3)" }}>Get Directions ↗</a>
            </div>
          </div>
        </div>

        {divider}

        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(196,150,122,.10)", border: "1px solid rgba(196,150,122,.3)", borderRadius: 4, padding: "12px 28px" }}>
          <span style={{ fontSize: 9, letterSpacing: 4, color: "#C4967A", textTransform: "uppercase" }}>Dress Code</span>
          <div style={{ width: 1, height: 14, background: "#C4967A55" }} />
          <span className="sf" style={{ fontSize: 17, color: "#2E2520", fontStyle: "italic" }}>Barong Tagalog / Formal Gown</span>
        </div>
      </div>

      {/* ── RSVP ── */}
      <div style={{ background: "linear-gradient(135deg, #EDE7D9, #E4DDD2)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 440, margin: "0 auto", textAlign: "center" }}>
          <SectionLabel>Kindly Reply</SectionLabel>
          <h2 className="sf" style={{ fontSize: 42, fontWeight: 300, color: "#2E2520", marginBottom: 14 }}>Will You Join Us?</h2>
          <p style={{ fontSize: 13, color: "#9A8E88", fontStyle: "italic", fontFamily: "Georgia, serif", lineHeight: 1.9, marginBottom: 40 }}>
            Please let us know by July 2026 so we can plan accordingly. We'd love to celebrate with you.
          </p>
          {rsvpSent ? (
            <div style={{ borderRadius: 10, padding: "40px 28px", background: "#fff", border: "1px solid #C4E0D4", boxShadow: "0 4px 20px rgba(46,37,32,.06)", textAlign: "center" }}>
              <FlowerLogo size={44} color="#7A9E8A" />
              <p className="sf" style={{ fontSize: 26, color: "#2E2520", margin: "18px 0 8px" }}>Thank you, {rsvpName}!</p>
              <p style={{ fontSize: 13, color: "#7A9E8A", lineHeight: 1.8 }}>
                {rsvpAttending ? "We're so excited to celebrate with you!" : "We'll miss you, but we understand. Thank you for letting us know."}
              </p>
            </div>
          ) : (
            <div style={{ borderRadius: 10, padding: "36px 32px", background: "#fff", boxShadow: "0 4px 20px rgba(46,37,32,.07)", border: "1px solid #EDE7D9", textAlign: "left" }}>
              <div style={{ marginBottom: 22 }}>
                <p style={{ fontSize: 9, letterSpacing: 4, color: "#9A8E88", textTransform: "uppercase", marginBottom: 8 }}>Your Name</p>
                <input value={rsvpName} onChange={e => { setRsvpName(e.target.value); setRsvpError(""); }}
                  placeholder="Full name"
                  style={{ width: "100%", border: "none", borderBottom: "1.5px solid #E0D8D0", borderRadius: 0, background: "transparent", padding: "8px 0", fontSize: 15, color: "#2E2520", outline: "none", fontFamily: "'Jost', sans-serif" }} />
              </div>
              <div style={{ marginBottom: 22 }}>
                <p style={{ fontSize: 9, letterSpacing: 4, color: "#9A8E88", textTransform: "uppercase", marginBottom: 12 }}>Will you be attending?</p>
                <div style={{ display: "flex", gap: 10 }}>
                  {[{ label: "Joyfully Accepts", val: true, ac: "#7A9E8A" }, { label: "Regretfully Declines", val: false, ac: "#C47A7A" }].map(opt => (
                    <button key={String(opt.val)} onClick={() => { setRsvpAttending(opt.val); setRsvpError(""); }}
                      style={{ flex: 1, padding: "12px 8px", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", border: "1.5px solid", borderRadius: 4, cursor: "pointer", transition: "all .2s", fontFamily: "'Jost', sans-serif", fontWeight: 500,
                        background: rsvpAttending === opt.val ? opt.ac : "transparent",
                        color: rsvpAttending === opt.val ? "#fff" : "#7A6E68",
                        borderColor: rsvpAttending === opt.val ? opt.ac : "#D8CFC4",
                      }}>{opt.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 26 }}>
                <p style={{ fontSize: 9, letterSpacing: 4, color: "#9A8E88", textTransform: "uppercase", marginBottom: 8 }}>A note for the couple <span style={{ color: "#C4B8B0", textTransform: "none", letterSpacing: 0 }}>(optional)</span></p>
                <textarea value={rsvpNote} onChange={e => setRsvpNote(e.target.value)}
                  placeholder="Share a message, well wishes, or dietary notes..."
                  rows={3}
                  style={{ width: "100%", border: "1.5px solid #E0D8D0", borderRadius: 4, background: "transparent", padding: "10px 14px", fontSize: 13, color: "#2E2520", outline: "none", resize: "vertical", fontFamily: "Georgia, serif", fontStyle: "italic" }} />
              </div>
              {rsvpError && <p style={{ fontSize: 12, color: "#C47A7A", marginBottom: 14 }}>{rsvpError}</p>}
              <button onClick={handleRsvp}
                style={{ width: "100%", background: "#2E2520", color: "#F7F2EA", border: "none", padding: "15px", fontSize: 9, letterSpacing: 4, textTransform: "uppercase", borderRadius: 4, cursor: "pointer", fontFamily: "'Jost', sans-serif", fontWeight: 500, transition: "background .2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#C4967A"}
                onMouseLeave={e => e.currentTarget.style.background = "#2E2520"}>
                Send My Reply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── About Us ── */}
      <div style={{ padding: "80px 24px", maxWidth: 720, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <SectionLabel>Our Story</SectionLabel>
          <h2 className="sf" style={{ fontSize: 42, fontWeight: 300, color: "#2E2520" }}>The People Behind the Love</h2>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 48 }}>
          <div style={{ flex: "1 1 260px", background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 4px 20px rgba(46,37,32,.07)", border: "1px solid #EDE7D9" }}>
            <div style={{ height: 8, background: "linear-gradient(to right, #C4967A, #B8976A)" }} />
            <div style={{ padding: 28 }}>
              <div style={{ width: "100%", aspectRatio: "4/3", background: "linear-gradient(135deg, #EDE7D9, #E0D6C8)", borderRadius: 6, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #C4B8AC" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 6, opacity: 0.4 }}>📷</div>
                  <p style={{ fontSize: 10, letterSpacing: 2, color: "#B8A898", textTransform: "uppercase" }}>Photo coming soon</p>
                </div>
              </div>
              <p style={{ fontSize: 9, letterSpacing: 5, color: "#C4967A", textTransform: "uppercase", marginBottom: 8 }}>The Groom</p>
              <h3 className="sf" style={{ fontSize: 28, fontWeight: 300, color: "#2E2520", marginBottom: 12 }}>Manuel Angelo "Chicco" Gomez</h3>
              <p style={{ fontSize: 13, color: "#9A8E88", lineHeight: 1.8, fontStyle: "italic", fontFamily: "Georgia, serif" }}>
                [A few words about Chicco — his personality, what he loves, what makes him laugh. Placeholder until you're ready to fill this in.]
              </p>
              <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["☕ Coffee lover", "🎵 Music", "🐶 Dog dad"].map(t => (
                  <span key={t} style={{ fontSize: 10, padding: "4px 10px", background: "rgba(196,150,122,.10)", border: "1px solid rgba(196,150,122,.2)", borderRadius: 20, color: "#C4967A" }}>{t}</span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ flex: "1 1 260px", background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 4px 20px rgba(46,37,32,.07)", border: "1px solid #EDE7D9" }}>
            <div style={{ height: 8, background: "linear-gradient(to right, #7A9EAD, #8AAEBA)" }} />
            <div style={{ padding: 28 }}>
              <div style={{ width: "100%", aspectRatio: "4/3", background: "linear-gradient(135deg, #E0EAF0, #D4E4EC)", borderRadius: 6, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed #B4CADB" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 6, opacity: 0.4 }}>📷</div>
                  <p style={{ fontSize: 10, letterSpacing: 2, color: "#A4BACC", textTransform: "uppercase" }}>Photo coming soon</p>
                </div>
              </div>
              <p style={{ fontSize: 9, letterSpacing: 5, color: "#7A9EAD", textTransform: "uppercase", marginBottom: 8 }}>The Bride</p>
              <h3 className="sf" style={{ fontSize: 28, fontWeight: 300, color: "#2E2520", marginBottom: 12 }}>Michelle [Surname]</h3>
              <p style={{ fontSize: 13, color: "#9A8E88", lineHeight: 1.8, fontStyle: "italic", fontFamily: "Georgia, serif" }}>
                [A few words about Michelle — her warmth, her passions, her infectious smile. Placeholder until you're ready to fill this in.]
              </p>
              <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["🌸 Flowers", "📚 Reader", "🍜 Foodie"].map(t => (
                  <span key={t} style={{ fontSize: 10, padding: "4px 10px", background: "rgba(122,158,173,.10)", border: "1px solid rgba(122,158,173,.2)", borderRadius: 20, color: "#7A9EAD" }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: "linear-gradient(135deg, rgba(196,150,122,.08), rgba(122,158,173,.08))", borderRadius: 10, padding: "36px 32px", textAlign: "center", border: "1px solid #E8DDD4" }}>
          <FlowerLogo size={32} color="#B8976A" />
          <h3 className="sf" style={{ fontSize: 26, fontWeight: 300, color: "#2E2520", margin: "16px 0 12px" }}>Together</h3>
          <p style={{ fontSize: 13, color: "#9A8E88", lineHeight: 2, fontFamily: "Georgia, serif", fontStyle: "italic", maxWidth: 480, margin: "0 auto" }}>
            [The story of how Chicco and Michelle met, what makes them work, a funny memory, or a line about what their relationship means. To be filled in soon.]
          </p>
        </div>
      </div>

      {/* ── Prenup Gallery ── */}
      <div style={{ background: "linear-gradient(135deg, #2E2520, #3E342E)", padding: "80px 24px", textAlign: "center" }}>
        <SectionLabel>Prenuptial</SectionLabel>
        <h2 className="sf" style={{ fontSize: 42, fontWeight: 300, color: "#F7F2EA", marginBottom: 12 }}>Before the Big Day</h2>
        <p style={{ fontSize: 13, color: "#9A8E88", marginBottom: 48, letterSpacing: 1 }}>Photos coming soon</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", maxWidth: 720, margin: "0 auto" }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ flex: "1 1 180px", maxWidth: 220, aspectRatio: "3/4", background: "rgba(255,255,255,.04)", borderRadius: 6, border: "1px dashed rgba(196,150,122,.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, opacity: 0.25, marginBottom: 6 }}>🖼</div>
                <p style={{ fontSize: 9, color: "rgba(196,150,122,.4)", letterSpacing: 2, textTransform: "uppercase" }}>Soon</p>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "rgba(196,150,122,.4)", marginTop: 32, letterSpacing: 2, textTransform: "uppercase" }}>Prenup shoot — TBD</p>
      </div>

      {/* ── Fun Quiz ── */}
      <div style={{ padding: "80px 24px", maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
        <SectionLabel>How Well Do You Know Us?</SectionLabel>
        <h2 className="sf" style={{ fontSize: 42, fontWeight: 300, color: "#2E2520", marginBottom: 8 }}>The Couple Quiz</h2>
        <p style={{ fontSize: 13, color: "#9A8E88", marginBottom: 40, fontStyle: "italic", fontFamily: "Georgia, serif" }}>Test your knowledge before the big day.</p>

        <div style={{ background: "#fff", borderRadius: 10, padding: "32px 28px", boxShadow: "0 4px 20px rgba(46,37,32,.07)", border: "1px solid #EDE7D9", textAlign: "left" }}>
          {quizDone ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <FlowerLogo size={44} color={quizScore >= 4 ? "#7A9E8A" : quizScore >= 2 ? "#C4967A" : "#C47A7A"} />
              <p className="sf" style={{ fontSize: 28, color: "#2E2520", margin: "16px 0 8px" }}>
                {quizScore >= 4 ? "You really know us!" : quizScore >= 2 ? "Not bad!" : "We'll catch you up at the wedding!"}
              </p>
              <p style={{ fontSize: 14, color: "#9A8E88" }}>You got <strong style={{ color: "#2E2520" }}>{quizScore}/{quiz.length}</strong> correct</p>
              <button onClick={() => { setQuizIdx(0); setQuizAns(null); setQuizScore(0); setQuizDone(false); }}
                style={{ marginTop: 20, background: "#C4967A", color: "#fff", border: "none", padding: "10px 28px", borderRadius: 4, fontSize: 10, letterSpacing: 3, textTransform: "uppercase", cursor: "pointer", fontFamily: "'Jost', sans-serif" }}>
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontSize: 9, letterSpacing: 3, color: "#C4967A", textTransform: "uppercase" }}>Question {quizIdx + 1} of {quiz.length}</span>
                <span style={{ fontSize: 10, color: "#9A8E88" }}>{quizScore} pts</span>
              </div>
              <div style={{ height: 3, background: "#EDE7D9", borderRadius: 2, marginBottom: 24 }}>
                <div style={{ height: "100%", width: `${((quizIdx) / quiz.length) * 100}%`, background: "linear-gradient(to right, #C4967A, #B8976A)", borderRadius: 2, transition: "width .4s" }} />
              </div>
              <p className="sf" style={{ fontSize: 20, color: "#2E2520", marginBottom: 24, lineHeight: 1.5 }}>{quiz[quizIdx].q}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {quiz[quizIdx].opts.map((opt, i) => {
                  let bg = "transparent", border = "#D8CFC4", color = "#2E2520";
                  if (quizAns !== null) {
                    if (i === quiz[quizIdx].ans) { bg = "rgba(122,158,138,.15)"; border = "#7A9E8A"; color = "#4A7A5A"; }
                    else if (i === quizAns && i !== quiz[quizIdx].ans) { bg = "rgba(196,122,122,.10)"; border = "#C47A7A"; color = "#8A4A4A"; }
                  }
                  return (
                    <button key={i} onClick={() => handleQuizAns(i)}
                      style={{ padding: "12px 16px", textAlign: "left", background: bg, border: `1px solid ${border}`, borderRadius: 6, cursor: quizAns !== null ? "default" : "pointer", color, fontSize: 13, fontFamily: "'Jost', sans-serif", transition: "all .2s" }}>
                      <span style={{ fontSize: 10, color: quizAns !== null && i === quiz[quizIdx].ans ? "#7A9E8A" : "#C4B8AC", marginRight: 10 }}>{String.fromCharCode(65 + i)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {quizAns !== null && (
                <button onClick={nextQuiz}
                  style={{ marginTop: 20, width: "100%", background: "#2E2520", color: "#F7F2EA", border: "none", padding: "12px", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", borderRadius: 4, cursor: "pointer", fontFamily: "'Jost', sans-serif" }}>
                  {quizIdx + 1 >= quiz.length ? "See Results" : "Next Question →"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Event Photos Upload Placeholder ── */}
      <div style={{ padding: "80px 24px", background: "#2E2520", textAlign: "center" }}>
        <SectionLabel>Memories</SectionLabel>
        <h2 className="sf" style={{ fontSize: 42, fontWeight: 300, color: "#F7F2EA", marginBottom: 12 }}>Share the Moment</h2>
        <p style={{ fontSize: 13, color: "#7A6E68", lineHeight: 1.9, maxWidth: 420, margin: "0 auto 48px", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
          On the day of the wedding, this space will open for guests to upload and share their photos with us.
        </p>
        <div style={{ maxWidth: 480, margin: "0 auto", border: "2px dashed rgba(196,150,122,.25)", borderRadius: 10, padding: "52px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 36, opacity: 0.3 }}>📸</div>
          <p style={{ fontSize: 10, letterSpacing: 4, color: "rgba(196,150,122,.5)", textTransform: "uppercase" }}>Photo upload — Opens January 15, 2027</p>
          <div style={{ height: 1, width: 60, background: "rgba(196,150,122,.2)" }} />
          <p style={{ fontSize: 12, color: "#5A504A", lineHeight: 1.8 }}>Guests will be able to upload their photos here during and after the event.</p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: "48px 24px", textAlign: "center", background: "#F7F2EA", borderTop: "1px solid #E8DDD4" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ height: 1, width: 60, background: "#D8CFC4" }} />
          <FlowerLogo size={20} color="#C4967A" />
          <div style={{ height: 1, width: 60, background: "#D8CFC4" }} />
        </div>
        <p className="sf" style={{ fontSize: 22, fontWeight: 300, color: "#2E2520", marginBottom: 6 }}>Chicco &amp; Michelle</p>
        <p style={{ fontSize: 10, letterSpacing: 3, color: "#B8A898", textTransform: "uppercase" }}>January 15, 2027 · Tagaytay</p>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 24 }}>
          {["Ceremony · 3:00 PM", "Reception · 5:00 PM", "Barong Tagalog / Formal Gown"].map(t => (
            <span key={t} style={{ fontSize: 9, letterSpacing: 2, color: "#C4B8AC", textTransform: "uppercase" }}>{t}</span>
          ))}
        </div>
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
  // FIX: exact category match instead of fragile partial-includes lookup
  const budgetRow = budget.find(b => b.category === cat);
  const budgeted = budgetRow?.estimated || 0;
  // Spent is computed live from supplier payments (spentByCategory in BudgetTab)
  // Here we show the budgeted amount as context only
  const base = num(form.baseAmount);
  const crew = form.hasCrew ? num(form.crewMeals) : 0;
  const oot  = form.hasOOT  ? num(form.ootFee)    : 0;
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
          Allocated for <strong>{budgetRow.category}</strong>: {peso(budgeted)}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Base Amount (₱)" required><input type="number" value={form.baseAmount || ""} onChange={e => setForm(p => ({ ...p, baseAmount: e.target.value }))} /></Field>
        <Field label="Final Due Date"><input type="date" value={form.dueDate || ""} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} /></Field>
      </div>

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

      <div style={{ background: "var(--l)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, fontWeight: 500 }}>Contract Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, textAlign: "center", marginBottom: 10 }}>
          {[["Base", base], form.hasCrew && ["Crew Meals", crew], form.hasOOT && ["OOT Fee", oot]].filter(Boolean).map(([l, v]) => (
            <div key={l} style={{ background: "var(--wh)", borderRadius: 6, padding: "8px 4px" }}>
              <div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{peso(v)}</div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #D8D0C4", paddingTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>Total Contract</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{peso(total)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>Downpayment</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: form.hasDP ? "var(--su)" : "var(--m)" }}>{form.hasDP ? `− ${peso(dp)}` : "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>Balance Due</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--r)" }}>{peso(balance)}</div>
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
  const tot  = suppliers.reduce((a, s) => a + (s.total || 0), 0);
  const paid = suppliers.reduce((a, s) => a + (s.paid  || 0), 0);

  const payByCat = useMemo(() => {
    const cats = {};
    suppliers.forEach(s => {
      if (!cats[s.category]) cats[s.category] = { total: 0, paid: 0, suppliers: [] };
      cats[s.category].total += s.total || 0;
      cats[s.category].paid  += s.paid  || 0;
      cats[s.category].suppliers.push(s);
    });
    return cats;
  }, [suppliers]);

  const blankForm = () => ({ name: "", category: budget[0]?.category || "Other", baseAmount: "", hasDP: false, dpAmount: "", dpDueDate: "", dpPaidDate: "", hasCrew: false, crewMeals: "", hasOOT: false, ootFee: "", dueDate: "", notes: "", payments: [], attachments: [], contactName: "", contactPhone: "", contactEmail: "" });

  const save = () => {
    if (!form.name || !form.baseAmount) return alert("Name and Base Amount are required");
    if (form.hasDP && (!form.dpAmount || !form.dpDueDate)) return alert("Please fill DP Amount and DP Due Date");
    const total = computeSupplierTotal(form);
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
      // att.id is local only (not a Supabase row key) so float is acceptable but we use Date.now() for consistency
      const att = { id: Date.now(), name: file.name, type: "Contract", dataUrl: ev.target.result, mimeType: file.type, size: file.size };
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

  // FIX: use index-based integer IDs in bulk imports to avoid float collision
  const handleBulkFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCSV(ev.target.result);
      const base = Date.now();
      const added = [];
      rows.forEach((r, idx) => {
        if (!r.name) return;
        const hasCrew = (r.hascrew || r.hasCrew || "").toLowerCase() === "true";
        const hasOOT  = (r.hasoot  || r.hasOOT  || "").toLowerCase() === "true";
        const f = {
          id: base + idx,   // safe integer ID
          name: r.name, category: r.category || "Other",
          baseAmount: num(r.baseamount || r.baseAmount),
          hasDP: (r.hasdp || r.hasDP || "").toLowerCase() === "true",
          dpAmount: num(r.dpamount || r.dpAmount),
          dpDueDate: r.dpduedate || r.dpDueDate || "",
          dpPaidDate: r.dppaiddate || r.dpPaidDate || "",
          hasCrew, crewMeals: hasCrew ? num(r.crewmeals || r.crewMeals) : 0,
          hasOOT,  ootFee:    hasOOT  ? num(r.ootfee   || r.ootFee)    : 0,
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
            <div className="sf" style={{ fontSize: 26, color: c, fontWeight: 300 }}>{peso(v)}</div>
          </Card>
        ))}
      </div>

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
                    <span style={{ color: "var(--m)", fontSize: 12 }}>{peso(data.paid)} / {peso(data.total)}</span>
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
                        <span style={{ color: "var(--r)", fontWeight: 500 }}>{peso(s.total - (s.paid || 0))} left</span>
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
                <td style={{ padding: "11px 12px", fontWeight: 500 }}>{peso(s.total)}</td>
                <td style={{ padding: "11px 12px", fontSize: 12 }}>{s.hasDP ? peso(s.dpAmount) : "—"}</td>
                <td style={{ padding: "11px 12px", color: "var(--su)" }}>{peso(s.paid)}</td>
                <td style={{ padding: "11px 12px", color: "var(--r)", fontWeight: 500 }}>{peso(s.total - (s.paid || 0))}</td>
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
                <span style={{ color: "var(--m)" }}>{l}</span><strong style={{ color: c }}>{peso(v)}</strong>
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
        const liveSel = suppliers.find(s => s.id === sel.id) || sel;
        return (
        <Modal title={liveSel.name} onClose={() => setModal(null)} wide>
          <div style={{ background: "var(--l)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, fontWeight: 500 }}>Contract Breakdown</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, textAlign: "center", marginBottom: 10 }}>
              {[["Base", liveSel.baseAmount || liveSel.total], liveSel.hasCrew && ["Crew Meals", liveSel.crewMeals || 0], liveSel.hasOOT && ["OOT Fee", liveSel.ootFee || 0]].filter(Boolean).map(([l, v]) => (
                <div key={l} style={{ background: "var(--wh)", borderRadius: 6, padding: "8px 4px" }}>
                  <div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{peso(v)}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, textAlign: "center", borderTop: "1px solid #D8D0C4", paddingTop: 10 }}>
              <div>
                <div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>Total Contract</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{peso(liveSel.total)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>Total Paid</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--su)" }}>{peso(liveSel.paid || 0)}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>Balance Due</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--r)" }}>{peso(liveSel.total - (liveSel.paid || 0))}</div>
              </div>
            </div>
          </div>

          {(liveSel.contactName || liveSel.contactPhone || liveSel.contactEmail) && (
            <div style={{ background: "rgba(122,158,173,.08)", borderRadius: 8, padding: 12, marginBottom: 14, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontSize: 10, color: "var(--b)", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500, flexShrink: 0 }}>Contact</div>
              {liveSel.contactName  && <span style={{ fontSize: 13, fontWeight: 500 }}>{liveSel.contactName}</span>}
              {liveSel.contactPhone && <a href={`tel:${liveSel.contactPhone}`} style={{ fontSize: 13, color: "var(--b)", textDecoration: "none" }}>📞 {liveSel.contactPhone}</a>}
              {liveSel.contactEmail && <a href={`mailto:${liveSel.contactEmail}`} style={{ fontSize: 13, color: "var(--r)", textDecoration: "none" }}>✉ {liveSel.contactEmail}</a>}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
            {[["Category", liveSel.category], ["Final Due Date", liveSel.dueDate || "—"], ["Status", liveSel.status],
              liveSel.hasDP && ["Downpayment", peso(liveSel.dpAmount)], liveSel.hasDP && ["DP Due Date", liveSel.dpDueDate || "—"], liveSel.hasDP && ["DP Paid On", liveSel.dpPaidDate || "Not yet"]
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
                      <td style={{ padding: "8px 10px", color: "var(--su)", fontWeight: 600 }}>{peso(p.amount)}</td>
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
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const monthLabel   = new Date(year, month, 1).toLocaleString("default", { month: "long", year: "numeric" });

  const eventMap = useMemo(() => {
    const m = {};
    events.forEach(ev => { if (!m[ev.date]) m[ev.date] = []; m[ev.date].push(ev); });
    return m;
  }, [events]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const openAdd  = dateStr => { setForm({ title: "", date: dateStr, type: "Meeting", amount: "", notes: "" }); setSel(null); setModal(true); };
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

  // FIX: index-based integer IDs for bulk event imports
  const handleBulkFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCSV(ev.target.result);
      const base = Date.now();
      const added = rows.filter(r => r.title && r.date).map((r, idx) => ({
        id: base + idx,
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
              const dayEvs  = eventMap[dateStr] || [];
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
                  {ev.amount > 0 && <div style={{ fontSize: 11, color: "var(--r)", marginTop: 3, fontWeight: 500 }}>{peso(ev.amount)}</div>}
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
function BudgetTab({ budget, setBudget, totalBudget, setTotalBudget, suppliers }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [sel, setSel] = useState(null);
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput] = useState(totalBudget || "");
  const [bSortCol, setBSortCol] = useState("category");
  const [bSortDir, setBSortDir] = useState("asc");
  const toggleBSort = col => { if (bSortCol === col) setBSortDir(d => d === "asc" ? "desc" : "asc"); else { setBSortCol(col); setBSortDir("asc"); } };

  // Spent is computed live from supplier payments — budget.actual is not used
  const spentByCategory = useMemo(() => {
    const map = {};
    (suppliers || []).forEach(s => {
      const cat = s.category || "Other";
      if (!map[cat]) map[cat] = 0;
      map[cat] += s.paid || 0;
    });
    return map;
  }, [suppliers]);

  const tE = budget.reduce((a, b) => a + (b.estimated || 0), 0);
  const tA = budget.reduce((a, b) => a + (spentByCategory[b.category] || 0), 0);

  const save = () => {
    const e = { ...form, id: sel?.id || Date.now(), estimated: num(form.estimated) };
    setBudget(p => sel ? p.map(b => b.id === e.id ? e : b) : [...p, e]);
    setModal(false);
  };

  const saveTotal = () => { setTotalBudget(num(totalInput)); setEditingTotal(false); };

  return (
    <div className="fade">
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
                  <span className="sf" style={{ fontSize: 28, fontWeight: 300, color: "var(--ink)" }}>{totalBudget ? peso(totalBudget) : "Not set"}</span>
                  <Btn v="ghost" onClick={() => { setTotalInput(totalBudget || ""); setEditingTotal(true); }}>Edit</Btn>
                </div>}
          </div>
          {totalBudget > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Allocated vs Cap</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: tE > totalBudget ? "var(--d)" : "var(--su)" }}>{peso(tE)} / {peso(totalBudget)}</div>
              {tE > totalBudget && <div style={{ fontSize: 11, color: "var(--d)" }}>Over budget by {peso(tE - totalBudget)}</div>}
            </div>
          )}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        {[["Allocated", tE, "var(--ink)"], ["Spent", tA, "var(--r)"], ["Remaining", tE - tA, (tE - tA) < 0 ? "var(--d)" : "var(--su)"]].map(([l, v, c]) => (
          <Card key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--m)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{l}</div>
            <div className="sf" style={{ fontSize: 26, color: c, fontWeight: 300 }}>{peso(v)}</div>
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
        <Btn onClick={() => { setForm({ category: "", estimated: "" }); setSel(null); setModal(true); }}>+ Add Category</Btn>
      </div>

      <Card style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
          <thead>
            <tr style={{ background: "var(--l)" }}>
              {[["Category","category"],["Allocated","estimated"],["Spent","spent"],["Variance","variance"],["Progress","pct"],["",""]].map(([label, col]) => (
                <th key={label} onClick={col ? () => toggleBSort(col) : undefined}
                  style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, letterSpacing: 1.5, color: "var(--m)", textTransform: "uppercase", fontWeight: 500, cursor: col ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}>
                  {label}{col && bSortCol === col ? (bSortDir === "asc" ? " ▲" : " ▼") : col ? " ·" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...budget]
              .map(b => ({ ...b, spent: spentByCategory[b.category]||0, variance: b.estimated-(spentByCategory[b.category]||0), pct: b.estimated>0?(spentByCategory[b.category]||0)/b.estimated*100:0 }))
              .sort((a, bx) => {
                const av = a[bSortCol]??"", bv = bx[bSortCol]??"";
                const cmp = typeof av==="number" ? av-bv : String(av).localeCompare(String(bv));
                return bSortDir==="asc" ? cmp : -cmp;
              })
              .map((b, i) => {
              const spent = b.spent;
              const v   = b.estimated - spent;
              const pct = b.estimated > 0 ? Math.min(100, (spent / b.estimated) * 100) : 0;
              return (
                <tr key={b.id} style={{ borderTop: "1px solid var(--l)", background: i % 2 === 0 ? "var(--wh)" : "var(--cr)" }}>
                  <td style={{ padding: "11px 12px", fontWeight: 500 }}>{b.category}</td>
                  <td style={{ padding: "11px 12px" }}>{peso(b.estimated)}</td>
                  <td style={{ padding: "11px 12px", color: "var(--r)" }}>{peso(spent)}</td>
                  <td style={{ padding: "11px 12px", color: v >= 0 ? "var(--su)" : "var(--d)", fontWeight: 500 }}>{v >= 0 ? "+" : ""}{peso(v)}</td>
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
          <Field label="Category Name"><input value={form.category || ""} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></Field>
          <Field label="Allocated Budget (₱)"><input type="number" value={form.estimated || ""} onChange={e => setForm(f => ({ ...f, estimated: e.target.value }))} /></Field>
          <p style={{ fontSize: 11, color: "var(--m)", marginTop: -8, marginBottom: 14 }}>Spent amount is computed automatically from supplier payments.</p>
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
const SPECIAL_ROLES = ["—", "Entourage", "Sponsor", "Best Man", "Maid of Honor", "Principal Sponsor", "Secondary Sponsor", "Flower Girl", "Ring Bearer", "Reader", "Candle", "Veil", "Cord", "Other"];
const VIP_TABLES = ["VIP 1", "VIP 2"];
const TABLE_CAPACITY = t => VIP_TABLES.includes(t) ? 14 : 10;

function GuestsTab({ guests, setGuests }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState("");
  const [fR, setFR] = useState("All");
  const [fG, setFG] = useState("All");
  const [fM, setFM] = useState("All");
  const [sortByTable, setSortByTable] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [activeBreakdown, setActiveBreakdown] = useState("rsvp");
  const fileRef = useRef();
  const [gSortCol, setGSortCol] = useState("name");
  const [gSortDir, setGSortDir] = useState("asc");
  const toggleGSort = col => { if (gSortCol === col) setGSortDir(d => d === "asc" ? "desc" : "asc"); else { setGSortCol(col); setGSortDir("asc"); } };

  const quickRsvp = (id, rsvp) => setGuests(p => p.map(g => g.id === id ? { ...g, rsvp } : g));

  const filtered = guests.filter(g =>
    (fR === "All" || g.rsvp === fR) && (fG === "All" || g.group === fG) &&
    (fM === "All" || g.meal === fM) &&
    (g.name.toLowerCase().includes(q.toLowerCase()) || (g.phone || "").includes(q))
  );

  const list = sortByTable
    ? [...filtered].sort((a, b) => {
        const ta = a.table || "ZZZ", tb = b.table || "ZZZ";
        if (ta !== tb) return ta.localeCompare(tb, undefined, { numeric: true });
        return a.name.localeCompare(b.name);
      })
    : [...filtered].sort((a, b) => {
        const av = a[gSortCol]??"", bv = b[gSortCol]??"";
        const cmp = typeof av==="boolean" ? (av===bv?0:av?-1:1) : typeof av==="number" ? av-bv : String(av).localeCompare(String(bv));
        return gSortDir==="asc" ? cmp : -cmp;
      });

  const conf  = guests.filter(g => g.rsvp === "Confirmed").length;
  const pend  = guests.filter(g => g.rsvp === "Pending").length;
  const decl  = guests.filter(g => g.rsvp === "Declined").length;
  const heads = guests.filter(g => g.rsvp === "Confirmed").reduce((a, g) => a + 1 + (g.plusOne ? 1 : 0), 0);

  const tableCounts = useMemo(() => {
    const m = {};
    guests.forEach(g => {
      const t = g.table || "";
      if (!t) return;
      if (!m[t]) m[t] = 0;
      m[t] += 1 + (g.plusOne ? 1 : 0);
    });
    return m;
  }, [guests]);

  const save = () => {
    const e = { ...form, id: sel?.id || Date.now() };
    setGuests(p => sel ? p.map(g => g.id === e.id ? e : g) : [...p, e]);
    setModal(false);
  };

  const downloadTemplate = () => {
    downloadCSV("guests_template.csv",
      ["name", "phone", "group", "rsvp", "meal", "plusOne", "table", "role", "notes"],
      [["Juan dela Cruz", "09171234567", "Groom", "Confirmed", "Beef", "FALSE", "1", "Best Man", ""],
       ["Ana Santos", "09189876543", "Bride", "Pending", "Fish", "TRUE", "VIP 1", "Principal Sponsor", "Vegetarian option"]]
    );
  };

  // FIX: index-based integer IDs for bulk guest imports
  const handleBulkFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCSV(ev.target.result);
      const base = Date.now();
      const added = rows.filter(r => r.name).map((r, idx) => ({
        id: base + idx,
        name: r.name, phone: r.phone || "",
        group: GROUPS.includes(r.group) ? r.group : "Mutual",
        rsvp:  RSVPS.includes(r.rsvp)   ? r.rsvp  : "Pending",
        meal:  MEALS.includes(r.meal)    ? r.meal  : "",
        plusOne: (r.plusone || r.plusOne || "").toLowerCase() === "true",
        table: r.table || "",
        role:  r.role  || "",
        notes: r.notes || "",
      }));
      setGuests(p => [...p, ...added]);
      setBulkResult(`${added.length} guest(s) imported.`);
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const breakdowns = {
    rsvp:  RSVPS.map(r => ({ label: r, count: guests.filter(g => g.rsvp === r).length, color: RC[r] })),
    group: GROUPS.map(g => ({ label: g, count: guests.filter(x => x.group === g).length, color: g === "Bride" ? "var(--r)" : g === "Groom" ? "var(--b)" : "var(--m)" })),
    meal:  [...MEALS, ""].map(m => ({ label: m || "Unset", count: guests.filter(g => g.meal === m).length, color: "var(--g)" })).filter(x => x.count > 0),
    table: [...new Set(guests.map(g => g.table || "Unassigned"))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(t => {
      const cap = TABLE_CAPACITY(t);
      const cnt = tableCounts[t] || (t === "Unassigned" ? guests.filter(g => !g.table).length : 0);
      const over = t !== "Unassigned" && cnt > cap;
      return { label: t === "Unassigned" ? "Unassigned" : `Table ${t}`, count: cnt, cap: t !== "Unassigned" ? cap : null, over, color: over ? "var(--d)" : "var(--b)" };
    }),
  };

  const tableGroups = useMemo(() => {
    if (!sortByTable) return null;
    const groups = {};
    list.forEach(g => {
      const t = g.table || "Unassigned";
      if (!groups[t]) groups[t] = [];
      groups[t].push(g);
    });
    return groups;
  }, [list, sortByTable]);

  const guestRow = (g, i) => (
    <tr key={g.id} style={{ borderTop: "1px solid var(--l)", background: i % 2 === 0 ? "var(--wh)" : "var(--cr)" }}>
      <td style={{ padding: "10px 12px" }}>
        <div style={{ fontWeight: 500 }}>{g.name}</div>
        {g.role && g.role !== "—" && <div style={{ fontSize: 10, color: "var(--r)", marginTop: 2, fontWeight: 500, letterSpacing: 0.5 }}>{g.role}</div>}
      </td>
      <td style={{ padding: "10px 12px", color: "var(--m)", fontSize: 12 }}>{g.phone || "—"}</td>
      <td style={{ padding: "10px 12px" }}><Badge label={g.group} color={g.group === "Bride" ? "var(--r)" : g.group === "Groom" ? "var(--b)" : "var(--m)"} /></td>
      <td style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <Badge label={g.rsvp} color={RC[g.rsvp]} />
          {g.rsvp !== "Confirmed" && <button title="Confirm" onClick={() => quickRsvp(g.id, "Confirmed")} style={{ background: "var(--su)", border: "none", color: "var(--wh)", borderRadius: 4, padding: "2px 6px", fontSize: 10, cursor: "pointer", fontWeight: 600 }}>✓</button>}
          {g.rsvp !== "Declined"  && <button title="Decline"  onClick={() => quickRsvp(g.id, "Declined")}  style={{ background: "var(--d)",  border: "none", color: "var(--wh)", borderRadius: 4, padding: "2px 6px", fontSize: 10, cursor: "pointer", fontWeight: 600 }}>✗</button>}
        </div>
      </td>
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
  );

  const tableHead = (
    <tr style={{ background: "var(--l)" }}>
      {[["Name / Role","name"],["Phone","phone"],["Group","group"],["RSVP","rsvp"],["Meal","meal"],["+1","plusOne"],["Table","table"],["",""]].map(([label, col]) => (
        <th key={label} onClick={!sortByTable && col ? () => toggleGSort(col) : undefined}
          style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, letterSpacing: 1.5, color: "var(--m)", textTransform: "uppercase", fontWeight: 500, cursor: !sortByTable && col ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}>
          {label}{!sortByTable && col && gSortCol === col ? (gSortDir === "asc" ? " ▲" : " ▼") : !sortByTable && col ? " ·" : ""}
        </th>
      ))}
    </tr>
  );

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

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {[["rsvp", "RSVP"], ["group", "Group"], ["meal", "Meal"], ["table", "Tables"]].map(([k, l]) => (
            <button key={k} onClick={() => setActiveBreakdown(k)} style={{ padding: "5px 14px", borderRadius: 20, border: "none", fontSize: 11, fontWeight: 500, cursor: "pointer", background: activeBreakdown === k ? "var(--r)" : "var(--l)", color: activeBreakdown === k ? "var(--wh)" : "var(--m)" }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {breakdowns[activeBreakdown].map(item => (
            <div key={item.label} style={{ background: item.over ? "rgba(196,122,122,.12)" : "var(--l)", borderRadius: 8, padding: "10px 14px", textAlign: "center", minWidth: 80, border: item.over ? "1px solid var(--d)" : "1px solid transparent" }}>
              <div style={{ fontSize: 20, fontWeight: 300, color: item.color }}>{item.count}{item.cap ? <span style={{ fontSize: 11, color: "var(--m)" }}>/{item.cap}</span> : ""}</div>
              <div style={{ fontSize: 10, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>{item.label}</div>
              {item.over && <div style={{ fontSize: 9, color: "var(--d)", marginTop: 2, fontWeight: 600 }}>OVER LIMIT</div>}
            </div>
          ))}
        </div>
        {activeBreakdown === "table" && <p style={{ fontSize: 11, color: "var(--m)", marginTop: 10 }}>VIP 1 &amp; VIP 2: max 14 seats · All other tables: max 10 seats</p>}
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
        <button onClick={() => setSortByTable(p => !p)} style={{ padding: "7px 12px", borderRadius: 6, border: "1px solid #D8D0C4", fontSize: 11, cursor: "pointer", background: sortByTable ? "var(--ink)" : "var(--wh)", color: sortByTable ? "var(--wh)" : "var(--m)", fontFamily: "'Jost',sans-serif", fontWeight: 500 }}>
          {sortByTable ? "⊞ By Table" : "⊟ By Table"}
        </button>
        <Btn onClick={() => { setForm({ name: "", phone: "", group: "Mutual", rsvp: "Pending", meal: "", plusOne: false, table: "", role: "", notes: "" }); setSel(null); setModal(true); }}>+ Add</Btn>
        <Btn v="ghost" onClick={downloadTemplate}>↓ Template</Btn>
        <Btn v="secondary" onClick={() => fileRef.current.click()}>↑ Bulk</Btn>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleBulkFile} />
      </div>
      {bulkResult && <div style={{ fontSize: 12, color: "var(--su)", marginBottom: 10, padding: "8px 12px", background: "rgba(122,158,138,.1)", borderRadius: 6 }}>{bulkResult} <button onClick={() => setBulkResult(null)} style={{ background: "none", border: "none", color: "var(--m)", cursor: "pointer", marginLeft: 8 }}>×</button></div>}

      <Card style={{ padding: 0, overflow: "auto" }}>
        {sortByTable && tableGroups ? (
          Object.entries(tableGroups).map(([tbl, tGuests]) => {
            const cap  = TABLE_CAPACITY(tbl);
            const cnt  = tGuests.reduce((a, g) => a + 1 + (g.plusOne ? 1 : 0), 0);
            const over = tbl !== "Unassigned" && cnt > cap;
            return (
              <div key={tbl}>
                <div style={{ padding: "8px 14px", background: over ? "rgba(196,122,122,.15)" : "rgba(122,158,173,.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: over ? "var(--d)" : "var(--b)" }}>
                    {tbl === "Unassigned" ? "No Table Assigned" : `Table ${tbl}`}
                    {tbl !== "Unassigned" && <span style={{ fontWeight: 400, color: "var(--m)", fontSize: 11, marginLeft: 8 }}>{VIP_TABLES.includes(tbl) ? "VIP" : "Regular"}</span>}
                  </span>
                  <span style={{ fontSize: 12, color: over ? "var(--d)" : "var(--m)", fontWeight: over ? 600 : 400 }}>
                    {cnt} / {tbl === "Unassigned" ? "—" : cap} seats{over ? " — OVER LIMIT" : ""}
                  </span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
                  <thead>{tableHead}</thead>
                  <tbody>{tGuests.map((g, i) => guestRow(g, i))}</tbody>
                </table>
              </div>
            );
          })
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
            <thead>{tableHead}</thead>
            <tbody>
              {list.map((g, i) => guestRow(g, i))}
              {list.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--m)" }}>No guests found.</td></tr>}
            </tbody>
          </table>
        )}
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
            <Field label="Table No."><input value={form.table || ""} onChange={e => setForm(f => ({ ...f, table: e.target.value }))} placeholder="e.g. 3 or VIP 1" /></Field>
            <Field label="Special Role" style={{ gridColumn: "1/-1" }}>
              <select value={form.role || "—"} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {SPECIAL_ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
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
  const tD   = suppliers.reduce((a, s) => a + (s.total || 0), 0);
  const tP   = suppliers.reduce((a, s) => a + (s.paid  || 0), 0);
  const conf = guests.filter(g => g.rsvp === "Confirmed").length;
  const tB   = totalBudget || budget.reduce((a, b) => a + b.estimated, 0);
  const tS   = suppliers.reduce((a, s) => a + (s.paid  || 0), 0);
  const ts   = todayISO();
  const up   = [...events].filter(e => e.date >= ts).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  const dl   = Math.ceil((WEDDING - new Date()) / 86400000);
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
          [`${peso(tP)} paid`, "Payments", `of ${peso(tD)}`, "var(--r)", tD > 0 ? (tP / tD) * 100 : 0],
          [`${conf} confirmed`, "RSVPs", `of ${guests.length}`, "var(--su)", guests.length > 0 ? (conf / guests.length) * 100 : 0],
          [`${tB > 0 ? Math.round((tS / tB) * 100) : 0}% used`, "Budget", `${peso(tS)} of ${peso(tB)}`, "var(--b)", tB > 0 ? Math.min(100, (tS / tB) * 100) : 0],
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
                {ev.amount > 0 && <div style={{ fontSize: 12, color: "var(--r)", fontWeight: 500 }}>{peso(ev.amount)}</div>}
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
                  <div style={{ fontSize: 13, color: "var(--r)", fontWeight: 500 }}>{peso(s.total - (s.paid || 0))}</div>
                  <Badge label={s.status} color={SC[s.status]} />
                </div>
              </div>
            ))}
        </Card>
        <Card style={{ marginTop: 14 }}>
          <h3 className="sf" style={{ fontSize: 19, fontWeight: 400, marginBottom: 14 }}>OOT & Crew Meals Tracker</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ background: "var(--l)", borderRadius: 8, padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "var(--m)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Total OOT Fees</div>
              <div className="sf" style={{ fontSize: 26, color: "var(--b)", fontWeight: 300 }}>
                {peso(suppliers.filter(s => s.hasOOT).reduce((a, s) => a + (s.ootFee || 0), 0))}
              </div>
            </div>
            <div style={{ background: "var(--l)", borderRadius: 8, padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "var(--m)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Total Crew Meals</div>
              <div className="sf" style={{ fontSize: 26, color: "var(--g)", fontWeight: 300 }}>
                {peso(suppliers.filter(s => s.hasCrew).reduce((a, s) => a + (s.crewMeals || 0), 0))}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "var(--m)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10, fontWeight: 500 }}>Breakdown by Supplier</div>
          {suppliers.filter(s => s.hasOOT || s.hasCrew).map(s => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 10px", background: "var(--cr)", borderRadius: 6, marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "var(--m)" }}>{s.category}</div>
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                {s.hasOOT && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9, color: "var(--b)", letterSpacing: 1, textTransform: "uppercase" }}>OOT</div>
                    <div style={{ fontSize: 13, color: "var(--b)", fontWeight: 500 }}>{peso(s.ootFee)}</div>
                  </div>
                )}
                {s.hasCrew && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9, color: "var(--g)", letterSpacing: 1, textTransform: "uppercase" }}>Meals</div>
                    <div style={{ fontSize: 13, color: "var(--g)", fontWeight: 500 }}>{peso(s.crewMeals)}</div>
                  </div>
                )}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, color: "var(--m)", letterSpacing: 1, textTransform: "uppercase" }}>Subtotal</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{peso((s.hasOOT ? s.ootFee || 0 : 0) + (s.hasCrew ? s.crewMeals || 0 : 0))}</div>
                </div>
              </div>
            </div>
          ))}
          {suppliers.filter(s => s.hasOOT || s.hasCrew).length === 0 && (
            <p style={{ fontSize: 13, color: "var(--m)", textAlign: "center", padding: 12 }}>No OOT or crew meal costs logged yet.</p>
          )}
          <div style={{ borderTop: "1px solid var(--l)", marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
            <span>Combined Total</span>
            <span style={{ color: "var(--r)" }}>
              {peso(suppliers.reduce((a, s) => a + (s.hasOOT ? s.ootFee || 0 : 0) + (s.hasCrew ? s.crewMeals || 0 : 0), 0))}
            </span>
          </div>
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
  const [loading, setLoading] = useState(true);
  // FIX: surface load errors as a dismissible banner instead of a silent fallback
  const [loadError, setLoadError] = useState(false);
  const initDone = useRef(false);

  useEffect(() => {
    sbLoad().then(d => {
      if (d.suppliers?.length) setSuppliers(d.suppliers);
      if (d.guests?.length)    setGuests(d.guests);
      if (d.budget)            setBudget(d.budget);
      if (d.events?.length)    setEvents(d.events);
      if (d.totalBudget !== null) setTotalBudget(d.totalBudget);
      setLoading(false);
      initDone.current = true;
    }).catch(() => {
      setLoadError(true);
      setLoading(false);
      initDone.current = true;
    });
  }, []);

  useEffect(() => {
    if (!initDone.current) return;
    setSaved(false);
    const t = setTimeout(() => {
      sbSave(suppliers, guests, budget, events, totalBudget)
        .then(() => setSaved(true))
        .catch(() => setSaved(true));
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

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--cr)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <FlowerLogo size={48} color="#C4967A" />
      <p style={{ fontSize: 10, letterSpacing: 4, color: "var(--m)", textTransform: "uppercase" }}>Loading your data…</p>
    </div>
  );

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
          {/* FIX: load error banner — visible but non-blocking */}
          {loadError && (
            <div style={{ background: "rgba(196,122,122,.12)", border: "1px solid var(--d)", borderRadius: 8, padding: "10px 16px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--d)" }}>⚠ Could not reach server — showing default data. Your changes will still be saved when connectivity returns.</span>
              <button onClick={() => setLoadError(false)} style={{ background: "none", border: "none", color: "var(--d)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
          )}
          <div style={{ marginBottom: 18 }}>
            <h1 className="sf" style={{ fontSize: 28, fontWeight: 300, color: "var(--ink)" }}>{tabs.find(t => t.id === tab)?.label}</h1>
            <p style={{ fontSize: 12, color: "var(--m)" }}>Chicco &amp; Michelle · January 15, 2027</p>
          </div>
          {tab === "overview"  && <OverviewTab  suppliers={suppliers} guests={guests} budget={budget} events={events} totalBudget={totalBudget} />}
          {tab === "suppliers" && <SuppliersTab suppliers={suppliers} setSuppliers={setSuppliers} budget={budget} />}
          {tab === "calendar"  && <CalendarTab  events={events} setEvents={setEvents} />}
          {tab === "budget"    && <BudgetTab    budget={budget} setBudget={setBudget} totalBudget={totalBudget} setTotalBudget={setTotalBudget} suppliers={suppliers} />}
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
