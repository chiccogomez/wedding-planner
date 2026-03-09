import React, { useState, useEffect, useMemo } from "react";
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
    button{cursor:pointer;font-family:'Jost',sans-serif;}
    .fade{animation:fi .3s ease;}
    @keyframes fi{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:translateY(0);}}
    @keyframes shake{0%,100%{transform:translateX(0);}25%,75%{transform:translateX(-6px);}50%{transform:translateX(6px);}}
    .cal-day{min-height:58px;padding:4px 5px;border-radius:6px;background:var(--l);cursor:pointer;border:1.5px solid transparent;transition:border-color .15s;}
    .cal-day:hover{border-color:var(--r);}
    .cal-day.today{background:rgba(196,150,122,.18);border-color:var(--r);}
  `;
  document.head.appendChild(s);
};

/* ─── Constants ───────────────────────────────────────────────────────────── */
const WEDDING = new Date("2027-01-15T15:00:00+08:00");
const php = n => `₱${Number(n || 0).toLocaleString("en-PH")}`;
const todayISO = () => new Date().toISOString().split("T")[0];
const toISO = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const SCATS = ["Venue","Catering","Photography","Videography","Florist","Hair & Makeup","Music/Band","Coordination","Attire","Invitations","Transportation","Cake","Other"];
const ETYPES = ["Payment Due","Meeting","Milestone","Fitting","Tasting","Personal"];
const MEALS = ["Beef","Fish","Chicken","Vegetarian"];
const RSVPS = ["Pending","Confirmed","Declined"];
const EC = {"Payment Due":"#C47A7A","Meeting":"#7A9EAD","Milestone":"#B8976A","Fitting":"#C4967A","Tasting":"#7A9E8A","Personal":"#7A6E68"};
const SC = {"Unpaid":"#C47A7A","Partial":"#C4A87A","Fully Paid":"#7A9E8A"};
const RC = {"Pending":"#C4A87A","Confirmed":"#7A9E8A","Declined":"#C47A7A"};

const INIT_S = [
  {id:1,name:"Antonio's Restaurant",category:"Venue",total:250000,paid:50000,dueDate:"2026-10-01",status:"Partial",notes:"Cocktail @ Lanai + Main Dining",payments:[{date:"2025-11-15",amount:50000,note:"Deposit"}]},
  {id:2,name:"Our Lady of Lourdes Parish",category:"Venue",total:15000,paid:0,dueDate:"2026-12-01",status:"Unpaid",notes:"Church fee + stipend",payments:[]},
  {id:3,name:"Photo/Video Team",category:"Photography",total:120000,paid:30000,dueDate:"2026-11-15",status:"Partial",notes:"Full day + SDE",payments:[{date:"2025-12-01",amount:30000,note:"Booking fee"}]},
];
const INIT_G = [
  {id:1,name:"Jose Santos",phone:"09171234567",group:"Groom",rsvp:"Confirmed",meal:"Beef",plusOne:false,table:"1",notes:""},
  {id:2,name:"Maria dela Cruz",phone:"09189876543",group:"Bride",rsvp:"Pending",meal:"",plusOne:true,table:"",notes:"Dietary restriction"},
];
const INIT_B = [
  {id:1,category:"Venue & Catering",estimated:320000,actual:0},
  {id:2,category:"Photography & Video",estimated:120000,actual:30000},
  {id:3,category:"Florals & Styling",estimated:80000,actual:0},
  {id:4,category:"Hair & Makeup",estimated:35000,actual:0},
  {id:5,category:"Music & Entertainment",estimated:50000,actual:0},
  {id:6,category:"Attire (Bride)",estimated:60000,actual:0},
  {id:7,category:"Attire (Groom)",estimated:25000,actual:0},
  {id:8,category:"Invitations",estimated:15000,actual:0},
  {id:9,category:"Transportation",estimated:20000,actual:0},
  {id:10,category:"Miscellaneous",estimated:30000,actual:0},
];
const INIT_E = [
  {id:1,title:"Antonio's 2nd Payment",date:"2026-06-15",type:"Payment Due",amount:100000,notes:""},
  {id:2,title:"Bridal Gown Fitting #1",date:"2026-03-20",type:"Fitting",amount:0,notes:""},
  {id:3,title:"Menu Tasting @ Antonio's",date:"2026-05-10",type:"Tasting",amount:0,notes:""},
  {id:4,title:"Prenuptial Shoot",date:"2026-04-05",type:"Milestone",amount:0,notes:"TBD"},
];

/* ─── localStorage helpers ────────────────────────────────────────────────── */
const store = {
  get: (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, value); } catch {}
  },
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

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--m)", textTransform: "uppercase", display: "block", marginBottom: 5 }}>{label}</label>
    {children}
  </div>
);

const Modal = ({ title, children, onClose }) => (
  <div
    style={{ position: "fixed", inset: 0, background: "rgba(46,37,32,.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    onClick={onClose}
  >
    <div
      style={{ background: "var(--wh)", borderRadius: 12, padding: 28, width: "100%", maxWidth: 460, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(46,37,32,.2)" }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 className="sf" style={{ fontSize: 22, fontWeight: 400 }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, color: "var(--m)", lineHeight: 1, padding: "0 4px", cursor: "pointer" }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

/* ─── Dog sketch SVG (Michelle's dog) ────────────────────────────────────── */
const DogSketch = () => (
  <svg viewBox="0 0 120 110" width="90" height="82" fill="none" stroke="#C4967A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}>
    <path d="M28 42 Q18 18 32 10 Q38 28 42 38" />
    <path d="M92 42 Q102 18 88 10 Q82 28 78 38" />
    <ellipse cx="60" cy="52" rx="28" ry="24" />
    <circle cx="50" cy="46" r="4" />
    <circle cx="70" cy="46" r="4" />
    <circle cx="51.5" cy="44.5" r="1.2" fill="#C4967A" />
    <circle cx="71.5" cy="44.5" r="1.2" fill="#C4967A" />
    <ellipse cx="60" cy="57" rx="5" ry="3.5" fill="#C4967A" fillOpacity="0.3" />
    <path d="M55 60 Q60 65 65 60" />
    <path d="M40 36 Q44 28 50 32" />
    <path d="M50 30 Q55 22 62 28" />
    <path d="M62 27 Q68 20 75 30" />
    <path d="M75 31 Q80 26 80 36" />
    <path d="M38 70 Q32 90 38 102 Q48 108 60 106 Q72 108 82 102 Q88 90 82 70" />
    <path d="M46 90 Q44 100 44 106" />
    <path d="M74 90 Q76 100 76 106" />
    <path d="M40 106 Q44 110 48 106" />
    <path d="M72 106 Q76 110 80 106" />
    <path d="M82 80 Q96 70 98 58 Q96 50 90 56" />
    <path d="M50 72 Q54 68 58 72" strokeWidth="1" />
    <path d="M62 72 Q66 68 70 72" strokeWidth="1" />
    <path d="M46 80 Q50 76 54 80" strokeWidth="1" />
    <path d="M66 80 Q70 76 74 80" strokeWidth="1" />
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
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
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

/* ─── Landing page ────────────────────────────────────────────────────────── */
function Landing({ onEnter }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--cr)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, position: "relative", overflow: "hidden" }}>
      {[180, 320, 460].map((sz, i) => (
        <div key={i} style={{ position: "absolute", width: sz, height: sz, borderRadius: "50%", border: `1px solid rgba(196,150,122,${.12 - i * .04})`, top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />
      ))}
      <div className="fade" style={{ textAlign: "center", maxWidth: 500, zIndex: 1 }}>
        <p style={{ fontSize: 10, letterSpacing: 5, color: "var(--m)", textTransform: "uppercase", marginBottom: 18 }}>January 15, 2027 · Tagaytay</p>
        <h1 className="sf" style={{ fontSize: 62, fontWeight: 300, lineHeight: 1.1, color: "var(--ink)" }}>
          Chicco<br />
          <span style={{ fontSize: 40, color: "var(--g)" }}>&amp;</span><br />
          Michelle
        </h1>
        <div style={{ width: 50, height: 1, background: "var(--g)", margin: "22px auto" }} />
        <p style={{ fontFamily: "Georgia,serif", fontSize: 14, color: "var(--m)", fontStyle: "italic", marginBottom: 34, lineHeight: 1.9 }}>
          Our Lady of Lourdes Parish · Antonio's Restaurant
        </p>
        <div style={{ marginBottom: 44 }}><Countdown /></div>
        <button
          onClick={onEnter}
          style={{ background: "var(--ink)", color: "var(--cr)", border: "none", padding: "13px 38px", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", borderRadius: 2, cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--r)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--ink)"}
        >
          Enter Planning Dashboard
        </button>
        <p style={{ marginTop: 14, fontSize: 11, color: "#BFB5AB" }}>Private · Chicco &amp; Michelle only</p>
      </div>
    </div>
  );
}

/* ─── Gate (password) ─────────────────────────────────────────────────────── */
function Gate({ onOk }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [shake, setShake] = useState(false);
  const go = () => {
    if (pw === "michelle2027") { onOk(); }
    else { setErr(true); setShake(true); setTimeout(() => setShake(false), 500); }
  };
  return (
    <div style={{ minHeight: "100vh", background: "var(--cr)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="fade" style={{ background: "var(--wh)", borderRadius: 12, padding: "44px 38px", width: 340, boxShadow: "0 8px 40px rgba(46,37,32,.1)", textAlign: "center", animation: shake ? "shake .5s" : undefined }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <DogSketch />
        </div>
        <h2 className="sf" style={{ fontSize: 26, fontWeight: 400, marginBottom: 6 }}>Private Dashboard</h2>
        <p style={{ fontSize: 13, color: "var(--m)", marginBottom: 26 }}>Chicco &amp; Michelle only</p>
        <input
          type="password"
          placeholder="Password"
          value={pw}
          onChange={e => { setPw(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && go()}
          style={{ textAlign: "center", fontSize: 14, letterSpacing: 2, marginBottom: 8 }}
        />
        {err && <p style={{ fontSize: 12, color: "var(--d)", margin: "6px 0" }}>Incorrect password</p>}
        <button onClick={go} style={{ width: "100%", background: "var(--r)", color: "var(--wh)", border: "none", padding: 12, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", borderRadius: 6, marginTop: 6, cursor: "pointer" }}>Enter</button>
        <p style={{ fontSize: 11, color: "#C9B9A8", marginTop: 14 }}>Hint: michelle + wedding year</p>
      </div>
    </div>
  );
}

/* ─── Suppliers tab ───────────────────────────────────────────────────────── */
function SuppliersTab({ suppliers, setSuppliers }) {
  const [modal, setModal] = useState(null);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState({});
  const [pf, setPf] = useState({ date: todayISO(), amount: "", note: "" });
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const list = suppliers.filter(s => (cat === "All" || s.category === cat) && s.name.toLowerCase().includes(q.toLowerCase()));
  const tot = suppliers.reduce((a, s) => a + s.total, 0);
  const paid = suppliers.reduce((a, s) => a + (s.paid || 0), 0);
  const save = () => {
    const e = { ...form, id: sel?.id || Date.now(), total: Number(form.total), payments: form.payments || [] };
    e.paid = e.payments.reduce((a, p) => a + Number(p.amount), 0);
    e.status = e.paid === 0 ? "Unpaid" : e.paid >= e.total ? "Fully Paid" : "Partial";
    setSuppliers(p => sel ? p.map(s => s.id === e.id ? e : s) : [...p, e]);
    setModal(null);
  };
  const logPay = () => {
    const p = { date: pf.date, amount: Number(pf.amount), note: pf.note };
    setSuppliers(prev => prev.map(s => {
      if (s.id !== sel.id) return s;
      const ps = [...(s.payments || []), p];
      const pd = ps.reduce((a, x) => a + x.amount, 0);
      return { ...s, payments: ps, paid: pd, status: pd === 0 ? "Unpaid" : pd >= s.total ? "Fully Paid" : "Partial" };
    }));
    setModal(null);
  };
  const del = id => { if (window.confirm("Delete?")) setSuppliers(p => p.filter(s => s.id !== id)); };
  return (
    <div className="fade">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[["Total Contracts", tot, "var(--ink)"], ["Total Paid", paid, "var(--su)"], ["Outstanding", tot - paid, "var(--r)"]].map(([l, v, c]) => (
          <Card key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--m)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{l}</div>
            <div className="sf" style={{ fontSize: 26, color: c, fontWeight: 300 }}>{php(v)}</div>
          </Card>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 130 }} />
        <select value={cat} onChange={e => setCat(e.target.value)} style={{ minWidth: 130 }}>
          <option value="All">All Categories</option>
          {SCATS.map(c => <option key={c}>{c}</option>)}
        </select>
        <Btn onClick={() => { setForm({ name: "", category: "Venue", total: "", dueDate: "", notes: "", payments: [] }); setSel(null); setModal("form"); }}>+ Add</Btn>
      </div>
      <Card style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 680 }}>
          <thead>
            <tr style={{ background: "var(--l)" }}>
              {["Supplier", "Category", "Total", "Paid", "Balance", "Due", "Status", ""].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, letterSpacing: 1.5, color: "var(--m)", textTransform: "uppercase", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((s, i) => (
              <tr key={s.id} style={{ borderTop: "1px solid var(--l)", background: i % 2 === 0 ? "var(--wh)" : "var(--cr)" }}>
                <td style={{ padding: "11px 12px", fontWeight: 500 }}>{s.name}</td>
                <td style={{ padding: "11px 12px", color: "var(--m)", fontSize: 12 }}>{s.category}</td>
                <td style={{ padding: "11px 12px" }}>{php(s.total)}</td>
                <td style={{ padding: "11px 12px", color: "var(--su)" }}>{php(s.paid)}</td>
                <td style={{ padding: "11px 12px", color: "var(--r)", fontWeight: 500 }}>{php(s.total - (s.paid || 0))}</td>
                <td style={{ padding: "11px 12px", color: "var(--m)", fontSize: 12 }}>{s.dueDate || "—"}</td>
                <td style={{ padding: "11px 12px" }}><Badge label={s.status} color={SC[s.status]} /></td>
                <td style={{ padding: "11px 12px" }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <Btn onClick={() => { setSel(s); setModal("view"); }} v="ghost">View</Btn>
                    <Btn onClick={() => { setSel(s); setPf({ date: todayISO(), amount: "", note: "" }); setModal("pay"); }} v="success">+Pay</Btn>
                    <Btn onClick={() => { setForm({ ...s }); setSel(s); setModal("form"); }} v="secondary">Edit</Btn>
                    <Btn onClick={() => del(s.id)} v="danger">Del</Btn>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--m)" }}>No suppliers yet.</td></tr>}
          </tbody>
        </table>
      </Card>
      {modal === "form" && (
        <Modal title={sel ? "Edit Supplier" : "Add Supplier"} onClose={() => setModal(null)}>
          <Field label="Name"><input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Category">
            <select value={form.category || "Venue"} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {SCATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Total (₱)"><input type="number" value={form.total || ""} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} /></Field>
            <Field label="Due Date"><input type="date" value={form.dueDate || ""} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></Field>
          </div>
          <Field label="Notes"><textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ minHeight: 60, resize: "vertical" }} /></Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn v="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>Save</Btn>
          </div>
        </Modal>
      )}
      {modal === "pay" && sel && (
        <Modal title={`Log Payment — ${sel.name}`} onClose={() => setModal(null)}>
          <div style={{ background: "var(--l)", borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13 }}>
            {[["Contract", sel.total, "var(--ink)"], ["Paid", sel.paid, "var(--su)"], ["Remaining", sel.total - (sel.paid || 0), "var(--r)"]].map(([l, v, c]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "var(--m)" }}>{l}</span><strong style={{ color: c }}>{php(v)}</strong>
              </div>
            ))}
          </div>
          <Field label="Date"><input type="date" value={pf.date} onChange={e => setPf(f => ({ ...f, date: e.target.value }))} /></Field>
          <Field label="Amount (₱)"><input type="number" value={pf.amount} onChange={e => setPf(f => ({ ...f, amount: e.target.value }))} placeholder="0" /></Field>
          <Field label="Note"><input value={pf.note} onChange={e => setPf(f => ({ ...f, note: e.target.value }))} placeholder="e.g. 2nd tranche" /></Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn v="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn v="success" onClick={logPay}>Log Payment</Btn>
          </div>
        </Modal>
      )}
      {modal === "view" && sel && (
        <Modal title={sel.name} onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[["Category", sel.category], ["Total", php(sel.total)], ["Paid", php(sel.paid)], ["Balance", php(sel.total - sel.paid)], ["Due", sel.dueDate || "—"], ["Status", sel.status]].map(([l, v]) => (
              <div key={l} style={{ background: "var(--l)", padding: 10, borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{l}</div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{v}</div>
              </div>
            ))}
          </div>
          {sel.notes && <p style={{ fontSize: 13, color: "var(--m)", background: "var(--l)", padding: 10, borderRadius: 6, marginBottom: 14 }}>{sel.notes}</p>}
          <h4 style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--m)", marginBottom: 10 }}>Payment History</h4>
          {!(sel.payments?.length)
            ? <p style={{ fontSize: 13, color: "var(--m)", textAlign: "center", padding: 12 }}>No payments logged.</p>
            : (
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "var(--l)" }}>{["Date", "Amount", "Note"].map(h => <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 10, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>)}</tr></thead>
                <tbody>
                  {sel.payments.map((p, i) => (
                    <tr key={i} style={{ borderTop: "1px solid var(--l)" }}>
                      <td style={{ padding: "8px 10px" }}>{p.date}</td>
                      <td style={{ padding: "8px 10px", color: "var(--su)", fontWeight: 600 }}>{php(p.amount)}</td>
                      <td style={{ padding: "8px 10px", color: "var(--m)" }}>{p.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </Modal>
      )}
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
  const todayStr = todayISO();

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month, 1).toLocaleString("default", { month: "long", year: "numeric" });

  const eventMap = useMemo(() => {
    const m = {};
    events.forEach(ev => { if (!m[ev.date]) m[ev.date] = []; m[ev.date].push(ev); });
    return m;
  }, [events]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else { setMonth(m => m - 1); }
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else { setMonth(m => m + 1); }
  };

  const openAdd = dateStr => { setForm({ title: "", date: dateStr, type: "Meeting", amount: "", notes: "" }); setSel(null); setModal(true); };
  const openEdit = (ev, e) => { e.stopPropagation(); setForm({ ...ev }); setSel(ev); setModal(true); };
  const delEvent = id => { if (window.confirm("Delete?")) setEvents(p => p.filter(e => e.id !== id)); };
  const save = () => {
    const e = { ...form, id: sel?.id || Date.now(), amount: Number(form.amount) || 0 };
    setEvents(p => sel ? p.map(x => x.id === e.id ? e : x) : [...p, e]);
    setModal(false);
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
function BudgetTab({ budget, setBudget }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [sel, setSel] = useState(null);
  const tE = budget.reduce((a, b) => a + (b.estimated || 0), 0);
  const tA = budget.reduce((a, b) => a + (b.actual || 0), 0);
  const save = () => {
    const e = { ...form, id: sel?.id || Date.now(), estimated: Number(form.estimated) || 0, actual: Number(form.actual) || 0 };
    setBudget(p => sel ? p.map(b => b.id === e.id ? e : b) : [...p, e]);
    setModal(false);
  };
  return (
    <div className="fade">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        {[["Budget", tE, "var(--ink)"], ["Spent", tA, "var(--r)"], ["Remaining", tE - tA, (tE - tA) < 0 ? "var(--d)" : "var(--su)"]].map(([l, v, c]) => (
          <Card key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--m)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{l}</div>
            <div className="sf" style={{ fontSize: 26, color: c, fontWeight: 300 }}>{php(v)}</div>
          </Card>
        ))}
      </div>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 13 }}>
          <span style={{ color: "var(--m)" }}>Overall Used</span>
          <span style={{ fontWeight: 500 }}>{tE > 0 ? Math.round((tA / tE) * 100) : 0}%</span>
        </div>
        <div style={{ height: 7, background: "var(--l)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(100, tE > 0 ? (tA / tE) * 100 : 0)}%`, background: "var(--r)", borderRadius: 4 }} />
        </div>
      </Card>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn onClick={() => { setForm({ category: "", estimated: "", actual: "" }); setSel(null); setModal(true); }}>+ Add Category</Btn>
      </div>
      <Card style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
          <thead>
            <tr style={{ background: "var(--l)" }}>
              {["Category", "Budget", "Actual", "Variance", "Progress", ""].map(h => (
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
                      <Btn onClick={() => { if (window.confirm("Remove?")) setBudget(p => p.filter(x => x.id !== b.id)); }} v="danger">Del</Btn>
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
            <Field label="Budget (₱)"><input type="number" value={form.estimated || ""} onChange={e => setForm(f => ({ ...f, estimated: e.target.value }))} /></Field>
            <Field label="Actual (₱)"><input type="number" value={form.actual || ""} onChange={e => setForm(f => ({ ...f, actual: e.target.value }))} /></Field>
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
  const list = guests.filter(g =>
    (fR === "All" || g.rsvp === fR) && (fG === "All" || g.group === fG) &&
    (g.name.toLowerCase().includes(q.toLowerCase()) || (g.phone || "").includes(q))
  );
  const conf = guests.filter(g => g.rsvp === "Confirmed").length;
  const pend = guests.filter(g => g.rsvp === "Pending").length;
  const heads = guests.filter(g => g.rsvp === "Confirmed").reduce((a, g) => a + 1 + (g.plusOne ? 1 : 0), 0);
  const save = () => {
    const e = { ...form, id: sel?.id || Date.now() };
    setGuests(p => sel ? p.map(g => g.id === e.id ? e : g) : [...p, e]);
    setModal(false);
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
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 130 }} />
        <select value={fR} onChange={e => setFR(e.target.value)} style={{ minWidth: 110 }}>
          <option value="All">All RSVP</option>{RSVPS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={fG} onChange={e => setFG(e.target.value)} style={{ minWidth: 110 }}>
          {["All", "Bride", "Groom", "Mutual"].map(g => <option key={g}>{g}</option>)}
        </select>
        <Btn onClick={() => { setForm({ name: "", phone: "", group: "Mutual", rsvp: "Pending", meal: "", plusOne: false, table: "", notes: "" }); setSel(null); setModal(true); }}>+ Add Guest</Btn>
      </div>
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
            <Field label="Full Name"><input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Phone"><input value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="09XX XXX XXXX" /></Field>
            <Field label="Group">
              <select value={form.group || "Mutual"} onChange={e => setForm(f => ({ ...f, group: e.target.value }))}>
                {["Bride", "Groom", "Mutual"].map(g => <option key={g}>{g}</option>)}
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
function OverviewTab({ suppliers, guests, budget, events }) {
  const tD = suppliers.reduce((a, s) => a + s.total, 0);
  const tP = suppliers.reduce((a, s) => a + (s.paid || 0), 0);
  const conf = guests.filter(g => g.rsvp === "Confirmed").length;
  const tB = budget.reduce((a, b) => a + b.estimated, 0);
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

/* ─── Dashboard shell ─────────────────────────────────────────────────────── */
function Dashboard({ onLogout }) {
  const [tab, setTab] = useState("overview");
  const [suppliers, setSuppliers] = useState(INIT_S);
  const [guests, setGuests] = useState(INIT_G);
  const [budget, setBudget] = useState(INIT_B);
  const [events, setEvents] = useState(INIT_E);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    const s = store.get("cS");
    const g = store.get("cG");
    const b = store.get("cB");
    const e = store.get("cE");
    if (s) setSuppliers(JSON.parse(s));
    if (g) setGuests(JSON.parse(g));
    if (b) setBudget(JSON.parse(b));
    if (e) setEvents(JSON.parse(e));
  }, []);

  useEffect(() => {
    setSaved(false);
    const t = setTimeout(() => {
      store.set("cS", JSON.stringify(suppliers));
      store.set("cG", JSON.stringify(guests));
      store.set("cB", JSON.stringify(budget));
      store.set("cE", JSON.stringify(events));
      setSaved(true);
    }, 700);
    return () => clearTimeout(t);
  }, [suppliers, guests, budget, events]);

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
          <h2 className="sf" style={{ fontSize: 17, fontWeight: 300, color: "var(--cr)", lineHeight: 1.35 }}>
            Chicco &amp;<br />Michelle
          </h2>
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
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ marginBottom: 18 }}>
            <h1 className="sf" style={{ fontSize: 28, fontWeight: 300, color: "var(--ink)" }}>{tabs.find(t => t.id === tab)?.label}</h1>
            <p style={{ fontSize: 12, color: "var(--m)" }}>Chicco &amp; Michelle · January 15, 2027</p>
          </div>
          {tab === "overview"  && <OverviewTab  suppliers={suppliers} guests={guests} budget={budget} events={events} />}
          {tab === "suppliers" && <SuppliersTab suppliers={suppliers} setSuppliers={setSuppliers} />}
          {tab === "calendar"  && <CalendarTab  events={events} setEvents={setEvents} />}
          {tab === "budget"    && <BudgetTab    budget={budget} setBudget={setBudget} />}
          {tab === "guests"    && <GuestsTab    guests={guests} setGuests={setGuests} />}
        </div>
      </div>
    </div>
  );
}

/* ─── Root app ────────────────────────────────────────────────────────────── */
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
