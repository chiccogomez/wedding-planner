// Chicco & Michelle — Wedding Dashboard PWA
// All data persisted to localStorage. Password: michelle2027

const { useState, useEffect, useCallback, useRef } = React;

// ── CONSTANTS ─────────────────────────────────────────────────────────────
const PASS = "michelle2027";
const WEDDING = new Date("2027-01-15T15:00:00+08:00");

const php = (n) => {
  if (n === null || n === undefined || n === "") return "TBD";
  const num = Number(n);
  if (isNaN(num)) return "TBD";
  if (num === 0) return "₱0";
  return "₱" + num.toLocaleString();
};

// ── THEMES ────────────────────────────────────────────────────────────────
const T = {
  day: {
    pageBg:"#F5F0E8", cardBg:"#FFFFFF", altBg:"#F0EAD8", border:"#DDD5C0",
    text:"#1A1612", muted:"#7A6E60", accent:"#A0785A", gold:"#C8A96E",
    green:"#3D6038", greenBg:"#EBF3E8", greenBd:"#B8D5B0",
    red:"#8B3A2A",   redBg:"#F7EDEA",   redBd:"#D5A898",
    amber:"#7A5C18", amberBg:"#FAF3E0", amberBd:"#E0C878",
    mutedBg:"#EDE8E0", mutedBd:"#C8C0B0",
    purple:"#6050A0", purpleBg:"#EEE8FA", purpleBd:"#C0B0E8",
    tabActive:"#1A1612", tabInactive:"#7A6E60",
    inputBg:"#F0EAD8",
  },
  night: {
    pageBg:"#16131E", cardBg:"#211D2C", altBg:"#2C2840", border:"#3A3550",
    text:"#EEE8D8", muted:"#9888A8", accent:"#C8A96E", gold:"#D8BC80",
    green:"#7AAD70", greenBg:"#1C2E1A", greenBd:"#3A5838",
    red:"#D07868",   redBg:"#2E1A18",   redBd:"#5A3028",
    amber:"#D0AA50", amberBg:"#2A2010", amberBd:"#5A4818",
    mutedBg:"#2A2840", mutedBd:"#4A4860",
    purple:"#9880D0", purpleBg:"#221840", purpleBd:"#4A3870",
    tabActive:"#EEE8D8", tabInactive:"#9888A8",
    inputBg:"#2C2840",
  }
};

// ── DEFAULT DATA ──────────────────────────────────────────────────────────
const defaultVendors = () => ([
  {
    id:"bespoke", category:"Wedding Coordination", signed:true,
    name:"Bespoke Manila", contact:"Ernest Pascual · 0917-521-5447 · bespokemanila@gmail.com",
    package:"Full Wedding Coordination · 150 pax",
    serviceTotal:185000, ootFee:30000, crewMeals:0,
    crewMealsNote:"6 meals min — rate not stated in contract",
    payments:[
      {id:"b1",milestone:"Down Payment",amount:30000,due:"Upon signing",status:"upcoming",type:"service"},
      {id:"b2",milestone:"OOT Fee",amount:30000,due:"Jan 8, 2027",status:"outstanding",type:"oot"},
      {id:"b3",milestone:"Full Balance",amount:155000,due:"Jan 8 or day-of",status:"outstanding",type:"service"},
    ],
    notes:"Ernest personally present throughout. Guest list + seating plan due 2 weeks before event.",
  },
  {
    id:"hmu", category:"Hair & Makeup", signed:true,
    name:"Mark Kingson Qua", contact:"09178065782 · markkingsonqua@yahoo.com",
    package:"Bride (3 looks) + 2 pax + Groom grooming",
    serviceTotal:90000, ootFee:15000, crewMeals:0, crewMealsNote:"",
    payments:[
      {id:"h1",milestone:"Down Payment",amount:10000,due:"Upon booking",status:"paid",type:"service"},
      {id:"h2",milestone:"OOT Fee (Tagaytay)",amount:15000,due:"Jan 15, 2027",status:"outstanding",type:"oot"},
      {id:"h3",milestone:"Balance",amount:80000,due:"Jan 15, 2027 (day-of)",status:"outstanding",type:"service"},
    ],
    notes:"Cancellation fee ₱10,000 anytime; full balance if cancelled within 30 days.",
  },
  {
    id:"woodstock", category:"Videography", signed:true,
    name:"Woodstock Cinema", contact:"Sam Mante · BPI 1969093053 (Ayala Vertis North)",
    package:"LIGHT BROWN · Wedding Film / Prenup · Aerial free (weather permitting)",
    serviceTotal:83000, ootFee:8000, crewMeals:0,
    crewMealsNote:"Food, gas, toll & accommodation — amounts TBD",
    payments:[
      {id:"w1",milestone:"Down Payment",amount:10000,due:"Upon signing",status:"paid",type:"service"},
      {id:"w2",milestone:"OOT Fee",amount:8000,due:"TBD",status:"outstanding",type:"oot"},
      {id:"w3",milestone:"Balance",amount:73000,due:"Jan 15, 2027 (day-of)",status:"outstanding",type:"service"},
    ],
    notes:"Provide 500GB+ exFAT hard drive. Overtime ₱4,000/hr after 12 hrs. 1 revision within 1 week of delivery.",
  },
  {
    id:"artuz", category:"Lights & Sound", signed:true,
    name:"Artuz 101", contact:"Nelson Pendon · 09177123224 · BDO 0075-2015-9180",
    package:"Full Band Setup (Reception) + Cocktails PA + Chef's Room Speaker",
    serviceTotal:57000, ootFee:0, crewMeals:5000,
    crewMealsNote:"10 pax × ₱500 (2 meals each) — included in contract total",
    payments:[
      {id:"a1",milestone:"Reservation Fee",amount:2000,due:"Upon signing",status:"paid",type:"service"},
      {id:"a2",milestone:"Crew Allowance",amount:5000,due:"Included in contract total",status:"outstanding",type:"meals"},
      {id:"a3",milestone:"50% Down Payment",amount:29000,due:"Nov 15, 2026",status:"upcoming",type:"service"},
      {id:"a4",milestone:"Remaining Balance",amount:26000,due:"Jan 8, 2027",status:"outstanding",type:"service"},
    ],
    notes:"Cocktail 5:00–11:00pm. Extension ₱4,000/hr. Transfer fee ₱5,000 if setup relocated mid-event.",
  },
  {
    id:"nicolai", category:"Photography", signed:false,
    name:"Nicolai Melicor", contact:"nicolaimelicor@gmail.com · IG @nicolaimelicor",
    package:"Package TBD — Nicolai + 3 photographers",
    serviceTotal:0, ootFee:0, crewMeals:0, crewMealsNote:"TBD",
    payments:[],
    packageOptions:[
      {id:"p1",name:"You & Me",    price:80000,  inclusions:"500 post-processed photos + flashdrive"},
      {id:"p2",name:"To Hold Dear",price:93000,  inclusions:"500 edited + 100 4R prints + 12×12in album"},
      {id:"p3",name:"Adore",       price:115000, inclusions:"500 edited + 100 prints + engagement session (4 hrs)"},
      {id:"p4",name:"Just Love ★", price:135000, inclusions:"500 edited + album + on-site slideshow + engagement"},
    ],
    notes:"Add-ons: on-site slideshow ₱12,000 · parent album ₱17,000 · after-party crew ₱8,500.",
  },
]);

const defaultGuests    = () => [];
const defaultPayLog    = () => [];
const defaultCalEvents = () => ([
  {id:"e1",date:"2026-11-15",title:"Artuz 101 — 50% Down Payment Due",type:"payment"},
  {id:"e2",date:"2027-01-08",title:"Final vendor balances due",type:"payment"},
  {id:"e3",date:"2027-01-15",title:"Wedding Day 🎉",type:"wedding"},
]);
const defaultBudget = () => ({
  totalBudget:1500000,
  categories:[
    {id:"coord",   name:"Coordination",    budgeted:215000, actual:0},
    {id:"photo",   name:"Photography",     budgeted:135000, actual:0},
    {id:"video",   name:"Videography",     budgeted:91000,  actual:0},
    {id:"hmu",     name:"Hair & Makeup",   budgeted:105000, actual:0},
    {id:"ls",      name:"Lights & Sound",  budgeted:62000,  actual:0},
    {id:"catering",name:"Catering",        budgeted:400000, actual:0},
    {id:"flowers", name:"Flowers & Décor", budgeted:200000, actual:0},
    {id:"ent",     name:"Live Band",       budgeted:150000, actual:0},
    {id:"misc",    name:"Miscellaneous",   budgeted:141000, actual:0},
  ]
});

// ── LOCAL STORAGE HOOK ────────────────────────────────────────────────────
function useStorage(key, init) {
  const [val, setVal] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : init;
    } catch(_) { return init; }
  });
  const save = useCallback((v) => {
    setVal(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch(_) {}
  }, [key]);
  return [val, save];
}

// ── SMALL UI COMPONENTS ───────────────────────────────────────────────────
function Badge({ status, t }) {
  const C = {
    paid:        {label:"✓ Paid",      bg:t.greenBg,  color:t.green,  bd:t.greenBd},
    upcoming:    {label:"Upcoming",    bg:t.amberBg,  color:t.amber,  bd:t.amberBd},
    outstanding: {label:"Outstanding",bg:t.redBg,    color:t.red,    bd:t.redBd},
    tbd:         {label:"TBD",         bg:t.mutedBg,  color:t.muted,  bd:t.mutedBd},
  };
  const c = C[status] || C.tbd;
  return (
    <span style={{display:"inline-block",padding:"2px 8px",borderRadius:2,fontSize:10,fontWeight:600,
      letterSpacing:"0.16em",textTransform:"uppercase",fontFamily:"Cormorant Garamond,serif",
      background:c.bg,color:c.color,border:`1px solid ${c.bd}`}}>{c.label}</span>
  );
}

function TypeTag({ type, t }) {
  const C = {
    service:{label:"Service", color:t.accent},
    oot:    {label:"OOT",     color:t.purple},
    meals:  {label:"Meals",   color:t.green},
  };
  const c = C[type] || {label:type, color:t.muted};
  return (
    <span style={{fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",
      fontFamily:"Cormorant Garamond,serif",color:c.color,
      background:c.color+"18",border:`1px solid ${c.color}44`,
      borderRadius:2,padding:"1px 5px",marginLeft:6}}>{c.label}</span>
  );
}

function SectionTitle({ children, t }) {
  return (
    <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:11,letterSpacing:"0.35em",
      textTransform:"uppercase",color:t.muted,marginBottom:14,paddingBottom:8,
      borderBottom:`1px solid ${t.border}`}}>{children}</div>
  );
}

// ── INPUT STYLE HELPER ────────────────────────────────────────────────────
const inpStyle = (t) => ({
  background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:2,
  padding:"6px 10px", color:t.text, fontSize:14,
  fontFamily:"EB Garamond, serif", width:"100%", boxSizing:"border-box", outline:"none",
  WebkitAppearance:"none",
});

// ── PASSWORD SCREEN ───────────────────────────────────────────────────────
function PasswordScreen({ onAuth }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const try_ = () => {
    if (pw === PASS) onAuth();
    else { setErr(true); setTimeout(() => setErr(false), 1500); }
  };
  return (
    <div style={{minHeight:"100dvh",display:"flex",alignItems:"center",justifyContent:"center",
      background:"#F5F0E8",padding:"20px"}}>
      <div style={{textAlign:"center",width:"100%",maxWidth:360,padding:"44px 36px",
        background:"#fff",border:"1px solid #DDD5C0"}}>
        <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:10,letterSpacing:"0.38em",
          textTransform:"uppercase",color:"#A0785A",marginBottom:8}}>January 15, 2027</div>
        <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:30,fontWeight:300,
          letterSpacing:"0.1em",color:"#1A1612",marginBottom:4}}>Chicco & Michelle</div>
        <div style={{fontFamily:"Cormorant Garamond,serif",fontStyle:"italic",fontSize:15,
          color:"#7A6E60",marginBottom:24}}>Wedding Dashboard</div>
        <div style={{height:1,background:"linear-gradient(to right,transparent,#C8A96E,transparent)",marginBottom:28}}/>
        <input type="password" placeholder="Enter password" value={pw}
          onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && try_()}
          style={{width:"100%",padding:"11px 14px",border:`1px solid ${err?"#D5A898":"#DDD5C0"}`,
            borderRadius:2,fontSize:16,fontFamily:"EB Garamond,serif",background:"#F5F0E8",
            color:"#1A1612",outline:"none",marginBottom:10,boxSizing:"border-box",
            WebkitAppearance:"none"}}/>
        {err && <div style={{color:"#8B3A2A",fontSize:13,fontStyle:"italic",marginBottom:8}}>Incorrect password</div>}
        <button onClick={try_} style={{width:"100%",padding:"11px",background:"#1A1612",color:"#F5F0E8",
          border:"none",borderRadius:2,fontFamily:"Cormorant Garamond,serif",fontSize:12,
          letterSpacing:"0.28em",textTransform:"uppercase",cursor:"pointer"}}>Enter</button>
      </div>
    </div>
  );
}

// ── COUNTDOWN ─────────────────────────────────────────────────────────────
function Countdown({ t }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const diff = WEDDING - now;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const unit = (n, l) => (
    <div style={{textAlign:"center",minWidth:60}}>
      <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:38,fontWeight:300,color:t.text,lineHeight:1}}>
        {String(n).padStart(2,"0")}
      </div>
      <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:9,letterSpacing:"0.32em",
        textTransform:"uppercase",color:t.muted,marginTop:4}}>{l}</div>
    </div>
  );
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"center",flexWrap:"wrap"}}>
      {unit(d,"Days")}
      <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:26,color:t.gold,marginBottom:14}}>·</div>
      {unit(h,"Hrs")}
      <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:26,color:t.gold,marginBottom:14}}>·</div>
      {unit(m,"Min")}
      <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:26,color:t.gold,marginBottom:14}}>·</div>
      {unit(s,"Sec")}
    </div>
  );
}

// ── OVERVIEW TAB ──────────────────────────────────────────────────────────
function OverviewTab({ vendors, guests, budget, calEvents, t }) {
  const signed     = vendors.filter(v => v.signed);
  const svcTotal   = signed.reduce((s,v) => s + (v.serviceTotal||0), 0);
  const ootTotal   = signed.reduce((s,v) => s + (v.ootFee||0), 0);
  const mealsTotal = signed.reduce((s,v) => s + (v.crewMeals||0), 0);
  const grand      = svcTotal + ootTotal + mealsTotal;
  const paid       = signed.reduce((s,v) => s + v.payments.filter(p=>p.status==="paid").reduce((x,p)=>x+Number(p.amount),0), 0);
  const confirmed  = guests.filter(g => g.rsvp === "confirmed").length;
  const upcoming   = calEvents.filter(e => e.date >= new Date().toISOString().slice(0,10))
                       .sort((a,b) => a.date > b.date ? 1 : -1).slice(0,4);

  const card = (t_, val, sub, color) => (
    <div style={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:2,padding:"18px 18px"}}>
      <div style={{fontSize:9,letterSpacing:"0.28em",textTransform:"uppercase",fontFamily:"Cormorant Garamond,serif",color:t.muted,marginBottom:4}}>{t_}</div>
      <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:24,fontWeight:500,color:color||t.text}}>{val}</div>
      {sub && <div style={{fontSize:11,color:t.muted,marginTop:2,fontStyle:"italic"}}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <div style={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:2,padding:"28px 20px",textAlign:"center",marginBottom:16}}>
        <div style={{fontFamily:"Cormorant Garamond,serif",fontStyle:"italic",fontSize:14,color:t.muted,marginBottom:14}}>Until the big day</div>
        <Countdown t={t}/>
        <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:11,letterSpacing:"0.2em",textTransform:"uppercase",color:t.muted,marginTop:14}}>January 15, 2027 · Our Lady of Lourdes, Tagaytay</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {card("Vendors",      `${signed.length} of ${vendors.length}`, "Nicolai TBD")}
        {card("Grand Total",  php(grand),  `Svc ${php(svcTotal)} + OOT ${php(ootTotal)}`)}
        {card("Total Paid",   php(paid),   `Outstanding ${php(grand-paid)}`, t.green)}
        {card("Guests",       confirmed||"—", `of ${guests.length} added`, t.accent)}
      </div>
      {upcoming.length > 0 && (
        <div style={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:2,padding:"18px 18px"}}>
          <SectionTitle t={t}>Upcoming Dates</SectionTitle>
          {upcoming.map(e => {
            const cols = {payment:t.amber,wedding:t.red,document:t.green,other:t.muted};
            return (
              <div key={e.id} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:cols[e.type]||t.muted,flexShrink:0}}/>
                <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:11,letterSpacing:"0.14em",textTransform:"uppercase",color:t.muted,width:84,flexShrink:0}}>{e.date}</div>
                <div style={{fontSize:14,color:t.text}}>{e.title}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CONTRACTS TAB ─────────────────────────────────────────────────────────
function ContractsTab({ vendors, setVendors, t }) {
  const [editingId, setEditingId] = useState(null);
  const signed     = vendors.filter(v => v.signed);
  const svcTotal   = signed.reduce((s,v) => s + (v.serviceTotal||0), 0);
  const ootTotal   = signed.reduce((s,v) => s + (v.ootFee||0), 0);
  const mealsTotal = signed.reduce((s,v) => s + (v.crewMeals||0), 0);
  const grand      = svcTotal + ootTotal + mealsTotal;
  const paid       = signed.reduce((s,v) => s + v.payments.filter(p=>p.status==="paid").reduce((x,p)=>x+Number(p.amount),0), 0);
  const updateVendor = (id, changes) => setVendors(vendors.map(v => v.id===id ? {...v,...changes} : v));

  const summCell = (label, value, color, note) => (
    <div style={{padding:"14px 16px",background:t.cardBg,borderRight:`1px solid ${t.border}`}}>
      <div style={{fontSize:9,letterSpacing:"0.24em",textTransform:"uppercase",fontFamily:"Cormorant Garamond,serif",color:t.muted,marginBottom:2}}>{label}</div>
      <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:18,fontWeight:500,color:color||t.text}}>{value}</div>
      {note && <div style={{fontSize:10,color:t.muted,marginTop:1,fontStyle:"italic"}}>{note}</div>}
    </div>
  );

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",border:`1px solid ${t.border}`,borderRadius:2,overflow:"hidden",marginBottom:20}}>
        {summCell("Services",   php(svcTotal))}
        {summCell("OOT Fees",   php(ootTotal),   t.purple,"excl. TBD")}
        {summCell("Crew Meals", php(mealsTotal), t.green, "known only")}
        {summCell("Grand Total",php(grand))}
        {summCell("Paid",       php(paid),       t.green)}
        {summCell("Outstanding",php(grand-paid), t.red)}
      </div>
      {vendors.map(v =>
        editingId === v.id
          ? <VendorEditCard key={v.id} vendor={v} t={t}
              onSave={ch => { updateVendor(v.id, ch); setEditingId(null); }}
              onCancel={() => setEditingId(null)}/>
          : <VendorViewCard key={v.id} vendor={v} t={t} onEdit={() => setEditingId(v.id)}/>
      )}
    </div>
  );
}

function VendorViewCard({ vendor:v, t, onEdit }) {
  const [open, setOpen] = useState(true);
  const svc   = v.serviceTotal||0;
  const oot   = v.ootFee||0;
  const meals = v.crewMeals||0;
  const grand = svc+oot+meals;
  const paid  = v.payments.filter(p=>p.status==="paid").reduce((s,p)=>s+Number(p.amount),0);
  const prog  = grand>0 ? Math.round((paid/grand)*100) : 0;

  return (
    <div style={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:2,marginBottom:14,overflow:"hidden",position:"relative"}}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:`linear-gradient(to bottom,${t.gold},${t.accent})`}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
        padding:"16px 16px 14px 20px",borderBottom: open ? `1px solid ${t.border}` : "none",cursor:"pointer"}}
        onClick={() => setOpen(!open)}>
        <div style={{flex:1}}>
          <div style={{fontSize:10,letterSpacing:"0.28em",textTransform:"uppercase",
            fontFamily:"Cormorant Garamond,serif",color:t.accent,marginBottom:2,display:"flex",alignItems:"center",gap:8}}>
            {v.category}
            {!v.signed && <span style={{color:t.amber,background:t.amberBg,border:`1px solid ${t.amberBd}`,
              borderRadius:2,padding:"0 5px",fontSize:9}}>UNSIGNED</span>}
          </div>
          <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:20,color:t.text,marginBottom:1}}>{v.name}</div>
          <div style={{fontSize:12,color:t.muted,fontStyle:"italic"}}>{v.package}</div>
        </div>
        <div style={{textAlign:"right",marginLeft:12,flexShrink:0}}>
          <div style={{fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase",fontFamily:"Cormorant Garamond,serif",color:t.muted,marginBottom:2}}>Total</div>
          <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:20,color:t.text}}>{grand>0?php(grand):"TBD"}</div>
          <div style={{fontSize:10,color:t.muted,marginTop:2}}>
            {svc>0&&<span style={{color:t.accent}}>Svc {php(svc)}</span>}
            {oot>0&&<span style={{color:t.purple}}> OOT {php(oot)}</span>}
          </div>
          <div style={{fontSize:18,color:t.muted,lineHeight:1,marginTop:4}}>{open?"−":"+"}</div>
        </div>
      </div>

      {open && (
        <div style={{padding:"14px 16px 0 20px"}}>
          {/* Package options for Nicolai */}
          {v.packageOptions?.length > 0 && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:9,letterSpacing:"0.24em",textTransform:"uppercase",fontFamily:"Cormorant Garamond,serif",color:t.muted,marginBottom:8}}>Package Options</div>
              {v.packageOptions.map(p => (
                <div key={p.id} style={{display:"flex",gap:12,paddingBottom:8,marginBottom:8,borderBottom:`1px solid ${t.border}`}}>
                  <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:15,color:t.text,width:100,flexShrink:0}}>{p.name}</div>
                  <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:16,color:t.text,width:80,flexShrink:0}}>{php(p.price)}</div>
                  <div style={{fontSize:12,color:t.muted,fontStyle:"italic"}}>{p.inclusions}</div>
                </div>
              ))}
            </div>
          )}

          {/* Payment milestones */}
          {v.payments.length > 0 && v.payments.map(p => (
            <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"9px 0",borderBottom:`1px solid ${t.border}`}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,color:t.text}}>{p.milestone}<TypeTag type={p.type} t={t}/></div>
                <div style={{fontSize:11,color:t.muted,fontStyle:"italic",marginTop:2}}>{p.due}</div>
              </div>
              <div style={{textAlign:"right",marginLeft:12,flexShrink:0}}>
                <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:16,color:t.text,marginBottom:3}}>{php(p.amount)}</div>
                <Badge status={p.status} t={t}/>
              </div>
            </div>
          ))}

          {/* Notes */}
          {(v.notes||v.crewMealsNote) && (
            <div style={{margin:"10px 0 0",padding:"10px 12px",background:t.altBg,
              borderLeft:`2px solid ${t.gold}`,fontSize:12,color:t.muted,fontStyle:"italic"}}>
              {v.crewMealsNote&&<span><strong style={{color:t.text,fontStyle:"normal"}}>Crew meals: </strong>{v.crewMealsNote}{v.notes?" · ":""}</span>}
              {v.notes}
            </div>
          )}

          {/* Progress + Edit */}
          {grand > 0 && (
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0"}}>
              <div style={{fontSize:9,letterSpacing:"0.18em",textTransform:"uppercase",fontFamily:"Cormorant Garamond,serif",color:t.muted,width:40}}>Paid</div>
              <div style={{flex:1,height:3,background:t.border,borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${prog}%`,background:`linear-gradient(to right,${t.gold},${t.accent})`,borderRadius:2}}/>
              </div>
              <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:12,color:t.accent,width:30,textAlign:"right"}}>{prog}%</div>
            </div>
          )}
          <div style={{paddingBottom:14}}>
            <button onClick={e => { e.stopPropagation(); onEdit(); }}
              style={{fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",fontFamily:"Cormorant Garamond,serif",
                color:t.accent,background:"transparent",border:`1px solid ${t.border}`,borderRadius:2,
                padding:"4px 14px",cursor:"pointer"}}>Edit</button>
          </div>
        </div>
      )}
    </div>
  );
}

function VendorEditCard({ vendor:v, t, onSave, onCancel }) {
  const [form, setForm] = useState({...v, payments:v.payments.map(p=>({...p})), packageOptions:(v.packageOptions||[]).map(o=>({...o}))});
  const set  = (f,val) => setForm(p => ({...p,[f]:val}));
  const setP = (id,f,val) => setForm(p => ({...p,payments:p.payments.map(pm=>pm.id===id?{...pm,[f]:f==="amount"?Number(val)||0:val}:pm)}));
  const addPay = () => setForm(f => ({...f,payments:[...f.payments,{id:`p${Date.now()}`,milestone:"",amount:0,due:"",status:"outstanding",type:"service"}]}));
  const rmPay  = (id) => setForm(f => ({...f,payments:f.payments.filter(p=>p.id!==id)}));
  const inp = inpStyle(t);
  const lbl = {fontSize:9,letterSpacing:"0.24em",textTransform:"uppercase",fontFamily:"Cormorant Garamond,serif",color:t.muted,display:"block",marginBottom:3};

  return (
    <div style={{background:t.cardBg,border:`2px solid ${t.gold}`,borderRadius:2,marginBottom:14,padding:"18px 18px"}}>
      <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:12,letterSpacing:"0.22em",textTransform:"uppercase",color:t.accent,marginBottom:16}}>Editing: {v.name}</div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <div><label style={lbl}>Vendor Name</label><input style={inp} value={form.name} onChange={e=>set("name",e.target.value)}/></div>
        <div><label style={lbl}>Category</label><input style={inp} value={form.category} onChange={e=>set("category",e.target.value)}/></div>
      </div>
      <div style={{marginBottom:12}}><label style={lbl}>Package Description</label><input style={inp} value={form.package} onChange={e=>set("package",e.target.value)}/></div>
      <div style={{marginBottom:12}}><label style={lbl}>Contact</label><input style={inp} value={form.contact} onChange={e=>set("contact",e.target.value)}/></div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
        <div><label style={lbl}>Service Total (₱)</label><input type="number" style={inp} value={form.serviceTotal} onChange={e=>set("serviceTotal",Number(e.target.value))}/></div>
        <div><label style={lbl}>OOT Fee (₱)</label><input type="number" style={inp} value={form.ootFee} onChange={e=>set("ootFee",Number(e.target.value))}/></div>
        <div><label style={lbl}>Crew Meals (₱)</label><input type="number" style={inp} value={form.crewMeals} onChange={e=>set("crewMeals",Number(e.target.value))}/></div>
      </div>
      <div style={{marginBottom:12}}><label style={lbl}>Crew Meals Note</label><input style={inp} value={form.crewMealsNote||""} onChange={e=>set("crewMealsNote",e.target.value)}/></div>

      <div style={{marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
        <input type="checkbox" id="signed" checked={form.signed} onChange={e=>set("signed",e.target.checked)} style={{accentColor:t.gold,width:16,height:16}}/>
        <label htmlFor="signed" style={{fontSize:14,color:t.text,fontFamily:"EB Garamond,serif",cursor:"pointer"}}>Contract Signed</label>
      </div>

      <div style={{marginBottom:14}}>
        <div style={{fontSize:9,letterSpacing:"0.24em",textTransform:"uppercase",fontFamily:"Cormorant Garamond,serif",color:t.muted,marginBottom:10}}>Payment Milestones</div>
        {form.payments.map(p => (
          <div key={p.id} style={{marginBottom:8,padding:"10px",background:t.altBg,borderRadius:2}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:6}}>
              <div><label style={{...lbl,marginBottom:2}}>Milestone</label><input style={inp} value={p.milestone} onChange={e=>setP(p.id,"milestone",e.target.value)}/></div>
              <div><label style={{...lbl,marginBottom:2}}>Amount (₱)</label><input type="number" style={inp} value={p.amount} onChange={e=>setP(p.id,"amount",e.target.value)}/></div>
            </div>
            <div style={{marginBottom:6}}><label style={{...lbl,marginBottom:2}}>Due</label><input style={inp} value={p.due} onChange={e=>setP(p.id,"due",e.target.value)}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"end"}}>
              <div><label style={{...lbl,marginBottom:2}}>Status</label>
                <select style={{...inp,cursor:"pointer"}} value={p.status} onChange={e=>setP(p.id,"status",e.target.value)}>
                  <option value="paid">Paid</option><option value="upcoming">Upcoming</option>
                  <option value="outstanding">Outstanding</option><option value="tbd">TBD</option>
                </select>
              </div>
              <div><label style={{...lbl,marginBottom:2}}>Type</label>
                <select style={{...inp,cursor:"pointer"}} value={p.type} onChange={e=>setP(p.id,"type",e.target.value)}>
                  <option value="service">Service</option><option value="oot">OOT</option><option value="meals">Meals</option>
                </select>
              </div>
              <button onClick={()=>rmPay(p.id)} style={{background:t.redBg,border:`1px solid ${t.redBd}`,color:t.red,borderRadius:2,padding:"6px 10px",cursor:"pointer",fontSize:12,height:36}}>✕</button>
            </div>
          </div>
        ))}
        <button onClick={addPay} style={{fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",
          fontFamily:"Cormorant Garamond,serif",color:t.accent,background:"transparent",
          border:`1px solid ${t.border}`,borderRadius:2,padding:"5px 14px",cursor:"pointer",marginTop:4}}>
          + Add Milestone
        </button>
      </div>

      <div style={{marginBottom:16}}>
        <label style={lbl}>Notes</label>
        <textarea style={{...inp,resize:"vertical",minHeight:56}} value={form.notes||""} onChange={e=>set("notes",e.target.value)}/>
      </div>

      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>onSave(form)} style={{fontFamily:"Cormorant Garamond,serif",fontSize:11,
          letterSpacing:"0.22em",textTransform:"uppercase",background:t.gold,color:"#1A1612",
          border:"none",borderRadius:2,padding:"10px 20px",cursor:"pointer"}}>Save</button>
        <button onClick={onCancel} style={{fontFamily:"Cormorant Garamond,serif",fontSize:11,
          letterSpacing:"0.22em",textTransform:"uppercase",background:"transparent",color:t.muted,
          border:`1px solid ${t.border}`,borderRadius:2,padding:"10px 16px",cursor:"pointer"}}>Cancel</button>
      </div>
    </div>
  );
}

// ── PAYMENTS TAB ──────────────────────────────────────────────────────────
function PaymentsTab({ log, setLog, vendors, t }) {
  const [form, setForm] = useState({vendor:"",amount:"",date:"",note:"",method:""});
  const set = (f,v) => setForm(p => ({...p,[f]:v}));
  const add = () => {
    if (!form.vendor||!form.amount||!form.date) return;
    setLog([{id:Date.now(),...form,amount:Number(form.amount)},...log]);
    setForm({vendor:"",amount:"",date:"",note:"",method:""});
  };
  const total = log.reduce((s,l) => s + Number(l.amount), 0);
  const inp = inpStyle(t);
  const lbl = {fontSize:9,letterSpacing:"0.24em",textTransform:"uppercase",fontFamily:"Cormorant Garamond,serif",color:t.muted,display:"block",marginBottom:3};

  return (
    <div>
      <div style={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:2,padding:"18px",marginBottom:16}}>
        <SectionTitle t={t}>Log a Payment</SectionTitle>
        <div style={{marginBottom:10}}>
          <label style={lbl}>Vendor</label>
          <select style={{...inp,cursor:"pointer"}} value={form.vendor} onChange={e=>set("vendor",e.target.value)}>
            <option value="">Select vendor…</option>
            {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
          </select>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><label style={lbl}>Amount (₱)</label><input type="number" style={inp} value={form.amount} onChange={e=>set("amount",e.target.value)} placeholder="0"/></div>
          <div><label style={lbl}>Date</label><input type="date" style={inp} value={form.date} onChange={e=>set("date",e.target.value)}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div>
            <label style={lbl}>Method</label>
            <select style={{...inp,cursor:"pointer"}} value={form.method} onChange={e=>set("method",e.target.value)}>
              <option value="">Select…</option>
              <option>Bank Transfer</option><option>GCash</option><option>Cash</option><option>Check</option>
            </select>
          </div>
          <div><label style={lbl}>Reference / Note</label><input style={inp} value={form.note} onChange={e=>set("note",e.target.value)} placeholder="Optional"/></div>
        </div>
        <button onClick={add} style={{fontFamily:"Cormorant Garamond,serif",fontSize:11,letterSpacing:"0.22em",textTransform:"uppercase",background:t.gold,color:"#1A1612",border:"none",borderRadius:2,padding:"10px 20px",cursor:"pointer"}}>Add Payment</button>
      </div>

      <div style={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:2,padding:"18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <SectionTitle t={t}>Payment History</SectionTitle>
          <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:18,color:t.green}}>Total: {php(total)}</div>
        </div>
        {log.length === 0
          ? <div style={{fontSize:14,color:t.muted,fontStyle:"italic"}}>No payments logged yet.</div>
          : log.map(l => (
              <div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${t.border}`}}>
                <div>
                  <div style={{fontSize:14,color:t.text}}>{l.vendor}</div>
                  <div style={{fontSize:12,color:t.muted,fontStyle:"italic"}}>{l.date}{l.method?` · ${l.method}`:""}{l.note?` · ${l.note}`:""}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:18,color:t.green}}>{php(l.amount)}</div>
                  <button onClick={()=>setLog(log.filter(x=>x.id!==l.id))} style={{background:"transparent",border:`1px solid ${t.border}`,color:t.muted,borderRadius:2,padding:"2px 8px",cursor:"pointer",fontSize:12}}>✕</button>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  );
}

// ── BUDGET TAB ────────────────────────────────────────────────────────────
function BudgetTab({ budget, setBudget, t }) {
  const totalBudgeted = budget.categories.reduce((s,c) => s+(c.budgeted||0), 0);
  const totalActual   = budget.categories.reduce((s,c) => s+(c.actual||0),   0);
  const remaining     = budget.totalBudget - totalActual;
  const inp = inpStyle(t);
  const updateCat = (id,f,val) => setBudget({...budget,categories:budget.categories.map(c=>c.id===id?{...c,[f]:Number(val)||0}:c)});

  const statCard = (label, value, color) => (
    <div style={{padding:"14px",background:t.altBg,borderRadius:2}}>
      <div style={{fontSize:9,letterSpacing:"0.26em",textTransform:"uppercase",fontFamily:"Cormorant Garamond,serif",color:t.muted,marginBottom:3}}>{label}</div>
      <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:18,color:color||t.text}}>{value}</div>
    </div>
  );

  return (
    <div>
      <div style={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:2,padding:"18px",marginBottom:16}}>
        <SectionTitle t={t}>Total Wedding Budget</SectionTitle>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
          <span style={{fontFamily:"Cormorant Garamond,serif",fontSize:22,color:t.muted}}>₱</span>
          <input type="number" style={{...inp,fontSize:20,width:180}} value={budget.totalBudget} onChange={e=>setBudget({...budget,totalBudget:Number(e.target.value)})}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {statCard("Budgeted",php(totalBudgeted),t.amber)}
          {statCard("Spent",php(totalActual),t.red)}
          {statCard("Remaining",php(remaining),remaining>=0?t.green:t.red)}
          {statCard("Variance",php(Math.abs(totalBudgeted-totalActual)),(totalBudgeted-totalActual)>=0?t.green:t.red)}
        </div>
      </div>

      <div style={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:2,padding:"18px"}}>
        <SectionTitle t={t}>Category Breakdown</SectionTitle>
        {budget.categories.map(c => {
          const diff = (c.budgeted||0)-(c.actual||0);
          return (
            <div key={c.id} style={{marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${t.border}`}}>
              <div style={{fontSize:13,color:t.text,marginBottom:6}}>{c.name}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div>
                  <div style={{fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase",fontFamily:"Cormorant Garamond,serif",color:t.muted,marginBottom:2}}>Budgeted</div>
                  <input type="number" style={inp} value={c.budgeted} onChange={e=>updateCat(c.id,"budgeted",e.target.value)}/>
                </div>
                <div>
                  <div style={{fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase",fontFamily:"Cormorant Garamond,serif",color:t.muted,marginBottom:2}}>Actual</div>
                  <input type="number" style={inp} value={c.actual} onChange={e=>updateCat(c.id,"actual",e.target.value)}/>
                </div>
              </div>
              <div style={{fontSize:12,color:diff>=0?t.green:t.red,marginTop:4,textAlign:"right",fontFamily:"Cormorant Garamond,serif"}}>
                {diff>=0?`${php(diff)} under`:`${php(Math.abs(diff))} over`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CALENDAR TAB ──────────────────────────────────────────────────────────
function CalendarTab({ events, setEvents, t }) {
  const [view, setView] = useState(() => { const d=new Date(); return {month:d.getMonth(),year:d.getFullYear()}; });
  const [form, setForm] = useState({date:"",title:"",type:"other"});
  const [showAdd, setShowAdd] = useState(false);
  const setF = (f,v) => setForm(p=>({...p,[f]:v}));
  const add = () => {
    if (!form.date||!form.title) return;
    setEvents([...events,{id:Date.now(),...form}]);
    setForm({date:"",title:"",type:"other"});
    setShowAdd(false);
  };
  const typeCols = {payment:t.amber,wedding:t.red,document:t.green,other:t.muted};
  const monthName = new Date(view.year,view.month,1).toLocaleString("en",{month:"long"});
  const firstDay  = new Date(view.year,view.month,1).getDay();
  const daysInMo  = new Date(view.year,view.month+1,0).getDate();
  const inp = inpStyle(t);
  const lbl = {fontSize:9,letterSpacing:"0.24em",textTransform:"uppercase",fontFamily:"Cormorant Garamond,serif",color:t.muted,display:"block",marginBottom:3};

  return (
    <div>
      <div style={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:2,padding:"16px",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <button onClick={()=>setView(v=>({...v,month:v.month===0?11:v.month-1,year:v.month===0?v.year-1:v.year}))}
            style={{background:"transparent",border:`1px solid ${t.border}`,color:t.muted,borderRadius:2,padding:"4px 12px",cursor:"pointer",fontSize:18}}>‹</button>
          <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:18,color:t.text,letterSpacing:"0.06em"}}>{monthName} {view.year}</div>
          <button onClick={()=>setView(v=>({...v,month:v.month===11?0:v.month+1,year:v.month===11?v.year+1:v.year}))}
            style={{background:"transparent",border:`1px solid ${t.border}`,color:t.muted,borderRadius:2,padding:"4px 12px",cursor:"pointer",fontSize:18}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
          {["S","M","T","W","T","F","S"].map((d,i) => (
            <div key={i} style={{textAlign:"center",fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:"Cormorant Garamond,serif",color:t.muted,padding:"4px 0"}}>{d}</div>
          ))}
          {Array.from({length:firstDay}).map((_,i) => <div key={`e${i}`}/>)}
          {Array.from({length:daysInMo}).map((_,i) => {
            const dn  = i+1;
            const ds  = `${view.year}-${String(view.month+1).padStart(2,"0")}-${String(dn).padStart(2,"0")}`;
            const evs = events.filter(e => e.date===ds);
            const isToday = ds === new Date().toISOString().slice(0,10);
            const isWed   = ds === "2027-01-15";
            return (
              <div key={dn} style={{minHeight:48,padding:"3px 4px",
                background:isWed?t.gold+"28":isToday?t.altBg:"transparent",
                border:`1px solid ${isWed?t.gold:isToday?t.accent+44:t.border+"55"}`,borderRadius:2}}>
                <div style={{fontSize:10,color:isWed?t.accent:isToday?t.accent:t.muted,fontFamily:"Cormorant Garamond,serif",fontWeight:isToday?"600":"400"}}>{dn}</div>
                {evs.map(ev => (
                  <div key={ev.id} style={{fontSize:8,color:typeCols[ev.type]||t.muted,marginTop:2,lineHeight:1.2,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}} title={ev.title}>● {ev.title}</div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={()=>setShowAdd(!showAdd)} style={{fontFamily:"Cormorant Garamond,serif",fontSize:11,letterSpacing:"0.22em",textTransform:"uppercase",background:t.gold,color:"#1A1612",border:"none",borderRadius:2,padding:"9px 20px",cursor:"pointer",marginBottom:14,width:"100%"}}>
        {showAdd ? "— Cancel" : "+ Add Event"}
      </button>

      {showAdd && (
        <div style={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:2,padding:"18px",marginBottom:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={lbl}>Date</label><input type="date" style={inp} value={form.date} onChange={e=>setF("date",e.target.value)}/></div>
            <div><label style={lbl}>Type</label>
              <select style={{...inp,cursor:"pointer"}} value={form.type} onChange={e=>setF("type",e.target.value)}>
                <option value="payment">Payment</option><option value="wedding">Wedding</option>
                <option value="document">Document</option><option value="other">Other</option>
              </select>
            </div>
          </div>
          <div style={{marginBottom:12}}><label style={lbl}>Title</label><input style={inp} value={form.title} onChange={e=>setF("title",e.target.value)} placeholder="Event title"/></div>
          <button onClick={add} style={{fontFamily:"Cormorant Garamond,serif",fontSize:11,letterSpacing:"0.22em",textTransform:"uppercase",background:t.gold,color:"#1A1612",border:"none",borderRadius:2,padding:"9px 18px",cursor:"pointer"}}>Add Event</button>
        </div>
      )}

      <div style={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:2,padding:"18px"}}>
        <SectionTitle t={t}>All Events</SectionTitle>
        {[...events].sort((a,b)=>a.date>b.date?1:-1).map(e => (
          <div key={e.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${t.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:typeCols[e.type]||t.muted,flexShrink:0}}/>
              <div>
                <div style={{fontSize:13,color:t.text}}>{e.title}</div>
                <div style={{fontSize:11,color:t.muted,fontStyle:"italic"}}>{e.date}</div>
              </div>
            </div>
            <button onClick={()=>setEvents(events.filter(x=>x.id!==e.id))} style={{background:"transparent",border:`1px solid ${t.border}`,color:t.muted,borderRadius:2,padding:"2px 8px",cursor:"pointer",fontSize:12}}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── GUESTS TAB ────────────────────────────────────────────────────────────
function GuestsTab({ guests, setGuests, t }) {
  const [form, setForm] = useState({name:"",rsvp:"pending",meal:"",table:"",plusOne:"",notes:""});
  const [search, setSearch] = useState("");
  const setF = (f,v) => setForm(p=>({...p,[f]:v}));
  const add = () => {
    if (!form.name) return;
    setGuests([{id:Date.now(),...form},...guests]);
    setForm({name:"",rsvp:"pending",meal:"",table:"",plusOne:"",notes:""});
  };
  const update = (id,f,v) => setGuests(guests.map(g=>g.id===id?{...g,[f]:v}:g));
  const rsvpCols = {confirmed:t.green,pending:t.amber,declined:t.red};
  const filtered = guests.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
  const inp = inpStyle(t);
  const lbl = {fontSize:9,letterSpacing:"0.24em",textTransform:"uppercase",fontFamily:"Cormorant Garamond,serif",color:t.muted,display:"block",marginBottom:3};

  const confirmed = guests.filter(g=>g.rsvp==="confirmed").length;
  const pending   = guests.filter(g=>g.rsvp==="pending").length;

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
        {[["Total",guests.length,t.text],["Confirmed",confirmed,t.green],["Pending",pending,t.amber]].map(([l,v,c])=>(
          <div key={l} style={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:2,padding:"14px 14px"}}>
            <div style={{fontSize:9,letterSpacing:"0.26em",textTransform:"uppercase",fontFamily:"Cormorant Garamond,serif",color:t.muted,marginBottom:3}}>{l}</div>
            <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:24,color:c}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      <div style={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:2,padding:"18px",marginBottom:14}}>
        <SectionTitle t={t}>Add Guest</SectionTitle>
        <div style={{marginBottom:10}}><label style={lbl}>Full Name</label><input style={inp} value={form.name} onChange={e=>setF("name",e.target.value)} placeholder="Guest name"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><label style={lbl}>RSVP</label>
            <select style={{...inp,cursor:"pointer"}} value={form.rsvp} onChange={e=>setF("rsvp",e.target.value)}>
              <option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="declined">Declined</option>
            </select>
          </div>
          <div><label style={lbl}>Table #</label><input style={inp} value={form.table} onChange={e=>setF("table",e.target.value)}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div><label style={lbl}>Meal Preference</label>
            <select style={{...inp,cursor:"pointer"}} value={form.meal} onChange={e=>setF("meal",e.target.value)}>
              <option value="">Select…</option><option>Beef</option><option>Fish</option><option>Chicken</option><option>Vegetarian</option>
            </select>
          </div>
          <div><label style={lbl}>Plus-one Name</label><input style={inp} value={form.plusOne} onChange={e=>setF("plusOne",e.target.value)}/></div>
        </div>
        <div style={{marginBottom:12}}><label style={lbl}>Notes</label><input style={inp} value={form.notes} onChange={e=>setF("notes",e.target.value)} placeholder="Dietary needs, seating requests…"/></div>
        <button onClick={add} style={{fontFamily:"Cormorant Garamond,serif",fontSize:11,letterSpacing:"0.22em",textTransform:"uppercase",background:t.gold,color:"#1A1612",border:"none",borderRadius:2,padding:"10px 20px",cursor:"pointer"}}>Add Guest</button>
      </div>

      {/* Search + list */}
      {guests.length > 0 && (
        <div style={{background:t.cardBg,border:`1px solid ${t.border}`,borderRadius:2,padding:"18px"}}>
          <SectionTitle t={t}>Guest List ({guests.length})</SectionTitle>
          <input style={{...inp,marginBottom:12}} placeholder="Search guests…" value={search} onChange={e=>setSearch(e.target.value)}/>
          {filtered.map(g => (
            <div key={g.id} style={{padding:"10px 0",borderBottom:`1px solid ${t.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{fontSize:14,color:t.text,fontWeight:500}}>{g.name}{g.plusOne&&<span style={{fontSize:12,color:t.muted,fontWeight:400}}> + {g.plusOne}</span>}</div>
                <button onClick={()=>setGuests(guests.filter(x=>x.id!==g.id))} style={{background:"transparent",border:`1px solid ${t.border}`,color:t.muted,borderRadius:2,padding:"2px 8px",cursor:"pointer",fontSize:12}}>✕</button>
              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <select value={g.rsvp} onChange={e=>update(g.id,"rsvp",e.target.value)} style={{...inp,width:"auto",color:rsvpCols[g.rsvp]||t.muted,cursor:"pointer",fontSize:12,padding:"3px 8px"}}>
                  <option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="declined">Declined</option>
                </select>
                <select value={g.meal} onChange={e=>update(g.id,"meal",e.target.value)} style={{...inp,width:"auto",cursor:"pointer",fontSize:12,padding:"3px 8px"}}>
                  <option value="">No meal pref</option><option>Beef</option><option>Fish</option><option>Chicken</option><option>Vegetarian</option>
                </select>
                <input value={g.table} onChange={e=>update(g.id,"table",e.target.value)} placeholder="Table #" style={{...inp,width:80,fontSize:12,padding:"3px 8px"}}/>
              </div>
              {g.notes && <div style={{fontSize:11,color:t.muted,fontStyle:"italic",marginTop:4}}>{g.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────
function Dashboard() {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("cm-dark")==="1"; } catch(_) { return false; }
  });
  const [tab, setTab]           = useState("overview");
  const [vendors, setVendors]   = useStorage("cm-vendors3",   defaultVendors());
  const [payLog,  setPayLog]    = useStorage("cm-paylog3",    defaultPayLog());
  const [budget,  setBudget]    = useStorage("cm-budget3",    defaultBudget());
  const [guests,  setGuests]    = useStorage("cm-guests3",    defaultGuests());
  const [calEvts, setCalEvts]   = useStorage("cm-calevts3",   defaultCalEvents());

  useEffect(() => {
    try { localStorage.setItem("cm-dark", isDark?"1":"0"); } catch(_) {}
  }, [isDark]);

  // Hide loading screen once React mounts
  useEffect(() => {
    const el = document.getElementById("loading");
    if (el) {
      el.classList.add("hidden");
      setTimeout(() => { el.style.display="none"; }, 400);
    }
    document.getElementById("root").style.display = "block";
  }, []);

  const t = isDark ? T.night : T.day;
  const TABS = [
    {id:"overview",  label:"Overview"},
    {id:"contracts", label:"Contracts"},
    {id:"payments",  label:"Payments"},
    {id:"budget",    label:"Budget"},
    {id:"calendar",  label:"Calendar"},
    {id:"guests",    label:"Guests"},
  ];

  return (
    <div style={{minHeight:"100dvh",background:t.pageBg,color:t.text,fontFamily:"EB Garamond, serif",transition:"background 0.3s"}}>
      {/* Header */}
      <div style={{background:t.cardBg,borderBottom:`1px solid ${t.border}`,padding:"16px 18px",
        display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <div>
          <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:9,letterSpacing:"0.36em",textTransform:"uppercase",color:t.accent,marginBottom:1}}>Jan 15, 2027 · Tagaytay</div>
          <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:21,fontWeight:300,letterSpacing:"0.09em",color:t.text}}>Chicco & Michelle</div>
        </div>
        <button onClick={()=>setIsDark(!isDark)} style={{background:"transparent",border:`1px solid ${t.border}`,borderRadius:2,padding:"6px 12px",cursor:"pointer",fontFamily:"Cormorant Garamond,serif",fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",color:t.muted}}>
          {isDark?"☀":"☾"}
        </button>
      </div>

      {/* Tab bar — scrollable */}
      <div style={{background:t.cardBg,borderBottom:`1px solid ${t.border}`,display:"flex",
        overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",
        position:"sticky",top:"56px",zIndex:99}}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={()=>setTab(tb.id)} style={{
            fontFamily:"Cormorant Garamond,serif",fontSize:10,letterSpacing:"0.24em",textTransform:"uppercase",
            padding:"12px 14px",border:"none",borderBottom:`2px solid ${tab===tb.id?t.gold:"transparent"}`,
            background:"transparent",color:tab===tb.id?t.tabActive:t.tabInactive,
            cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"color 0.2s"
          }}>{tb.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{maxWidth:680,margin:"0 auto",padding:"20px 16px 80px"}}>
        {tab==="overview"  && <OverviewTab vendors={vendors} guests={guests} budget={budget} calEvents={calEvts} t={t}/>}
        {tab==="contracts" && <ContractsTab vendors={vendors} setVendors={setVendors} t={t}/>}
        {tab==="payments"  && <PaymentsTab log={payLog} setLog={setPayLog} vendors={vendors} t={t}/>}
        {tab==="budget"    && <BudgetTab budget={budget} setBudget={setBudget} t={t}/>}
        {tab==="calendar"  && <CalendarTab events={calEvts} setEvents={setCalEvts} t={t}/>}
        {tab==="guests"    && <GuestsTab guests={guests} setGuests={setGuests} t={t}/>}
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────
function App() {
  const [authed, setAuthed] = useState(() => {
    try { return localStorage.getItem("cm-authed")==="1"; } catch(_) { return false; }
  });
  const auth = () => {
    try { localStorage.setItem("cm-authed","1"); } catch(_) {}
    setAuthed(true);
  };
  return authed ? React.createElement(Dashboard) : React.createElement(PasswordScreen, {onAuth:auth});
}

// Mount
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
