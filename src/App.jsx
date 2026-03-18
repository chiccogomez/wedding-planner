import React, { useState, useEffect, useMemo } from "react";

const getStyles = (dark) => `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,400&family=Jost:wght@300;400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Jost',sans-serif;}
  .sf{font-family:'Cormorant Garamond',serif;}
  input,select,textarea{font-family:'Jost',sans-serif;border-radius:6px;padding:8px 12px;font-size:13px;outline:none;width:100%;border:1px solid ${dark?"#3D3550":"#D8D0C4"};background:${dark?"#2A2438":"#FDFAF5"};color:${dark?"#F0EBE3":"#2E2520"};}
  input:focus,select:focus,textarea:focus{border-color:${dark?"#E8956D":"#C4967A"};}
  button{cursor:pointer;font-family:'Jost',sans-serif;}
  .fade{animation:fi .3s ease;}
  @keyframes fi{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:translateY(0);}}
  @keyframes shake{0%,100%{transform:translateX(0);}25%,75%{transform:translateX(-6px);}50%{transform:translateX(6px);}}
  .cal-day{min-height:58px;padding:4px 5px;border-radius:6px;cursor:pointer;border:1.5px solid transparent;transition:border-color .15s;background:${dark?"#2A2438":"#EDE7D9"};}
  .cal-day:hover{border-color:${dark?"#E8956D":"#C4967A"};}
  .cal-day.today{background:${dark?"rgba(232,149,109,.2)":"rgba(196,150,122,.18)"};border-color:${dark?"#E8956D":"#C4967A"};}
  .sort-th{cursor:pointer;user-select:none;}
  .sort-th:hover{opacity:.75;}
`;

const DAY = {
  r:"#C4967A",b:"#7A9EAD",cr:"#F7F2EA",l:"#EDE7D9",ink:"#2E2520",
  m:"#7A6E68",g:"#B8976A",su:"#7A9E8A",wa:"#C4A87A",d:"#C47A7A",wh:"#FDFAF5",
  sidebar:"#2E2520",sideText:"#F7F2EA",sideSubtext:"#6A5E58",sideActive:"rgba(196,150,122,.15)",navMuted:"#8A7E78",
};
const NIGHT = {
  r:"#E8956D",b:"#6BBDD4",cr:"#13111A",l:"#1F1B2E",ink:"#F0EBE3",
  m:"#9B94B8",g:"#D4A853",su:"#6BC49A",wa:"#D4B06A",d:"#E87A7A",wh:"#1A1726",
  sidebar:"#0E0C14",sideText:"#F0EBE3",sideSubtext:"#5A5470",sideActive:"rgba(232,149,109,.15)",navMuted:"#6A6480",
};

const WEDDING = new Date("2027-01-15T15:00:00+08:00");
const php = n => `‚Ç±${Number(n||0).toLocaleString("en-PH")}`;
const todayISO = () => new Date().toISOString().split("T")[0];
const toISO = (y,m,d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const useTheme = dark => dark ? NIGHT : DAY;

const SCATS = ["Venue","Catering","Photography","Videography","Florist","Hair & Makeup","Music/Band","Coordination","Attire","Invitations","Transportation","Cake","Other"];
const ETYPES = ["Payment Due","Meeting","Milestone","Fitting","Tasting","Personal"];
const MEALS = ["Beef","Fish","Chicken","Vegetarian"];
const RSVPS = ["Pending","Confirmed","Declined"];
const EC = {"Payment Due":"#E87A7A","Meeting":"#6BBDD4","Milestone":"#D4A853","Fitting":"#E8956D","Tasting":"#6BC49A","Personal":"#9B94B8"};
const SC = {"Unpaid":"#E87A7A","Partial":"#D4B06A","Fully Paid":"#6BC49A"};
const RC = {"Pending":"#D4B06A","Confirmed":"#6BC49A","Declined":"#E87A7A"};

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

function useSort(data, defaultCol = null) {
  const [sortCol, setSortCol] = useState(defaultCol);
  const [sortDir, setSortDir] = useState("asc");
  const toggleSort = col => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const sorted = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      let av = a[sortCol], bv = b[sortCol];
      if (av == null) av = ""; if (bv == null) bv = "";
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortCol, sortDir]);
  const Th = ({ col, label, style: sx = {} }) => (
    <th className="sort-th" onClick={() => toggleSort(col)}
      style={{ padding:"10px 12px", textAlign:"left", fontSize:10, letterSpacing:1.5, textTransform:"uppercase", fontWeight:500, whiteSpace:"nowrap", ...sx }}>
      {label} {sortCol === col ? (sortDir === "asc" ? "‚ñ≤" : "‚ñº") : <span style={{opacity:.3}}>‚áÖ</span>}
    </th>
  );
  return { sorted, Th };
}

function ThemeToggle({dark, onToggle}) {
  return (
    <div onClick={onToggle} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"8px 12px",borderRadius:30,margin:"8px 10px",background:dark?"linear-gradient(135deg,#1F1B2E,#2A2438)":"linear-gradient(135deg,#FFF3C4,#FFD97D)",border:dark?"1px solid #3D3550":"1px solid #F0C040",transition:"all .4s",boxShadow:dark?"0 0 12px rgba(107,189,212,.2)":"0 0 12px rgba(255,200,0,.25)"}}>
      <div style={{position:"relative",width:36,height:20,borderRadius:10,background:dark?"#6BBDD4":"#FFB347",transition:"background .4s",flexShrink:0}}>
        <div style={{position:"absolute",top:2,left:dark?18:2,width:16,height:16,borderRadius:"50%",background:dark?"#1A1726":"#FFF",transition:"left .3s",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,boxShadow:dark?"0 0 6px #6BBDD4":"0 2px 4px rgba(0,0,0,.2)"}}>{dark?"üåô":"‚òÄÔ∏è"}</div>
      </div>
      <span style={{fontSize:11,fontWeight:500,letterSpacing:1,color:dark?"#9B94B8":"#8B6914",textTransform:"uppercase"}}>{dark?"Night":"Day"}</span>
    </div>
  );
}

const Btn = ({children,onClick,v="primary",dark=false,style:sx={}}) => {
  const T=dark?NIGHT:DAY;
  const base={border:"none",borderRadius:6,fontWeight:500,letterSpacing:1,textTransform:"uppercase",fontSize:10,padding:"7px 14px",cursor:"pointer"};
  const vs={primary:{background:T.r,color:"#fff"},secondary:{background:T.l,color:T.ink},ghost:{background:"transparent",color:T.m,border:`1px solid ${dark?"#3D3550":"#D8D0C4"}`},danger:{background:T.d,color:"#fff"},success:{background:T.su,color:"#fff"}};
  return <button style={{...base,...vs[v],...sx}} onClick={onClick}>{children}</button>;
};
const Card = ({children,dark=false,style:sx={}}) => {
  const T=dark?NIGHT:DAY;
  return <div style={{background:T.wh,borderRadius:10,padding:20,boxShadow:dark?"0 2px 16px rgba(0,0,0,.3)":"0 2px 12px rgba(46,37,32,.06)",...sx}}>{children}</div>;
};
const Badge = ({label,color}) => <span style={{background:color+"33",color,fontSize:10,padding:"3px 8px",borderRadius:20,fontWeight:500,whiteSpace:"nowrap"}}>{label}</span>;
const Field = ({label,children,dark=false}) => {
  const T=dark?NIGHT:DAY;
  return <div style={{marginBottom:14}}><label style={{fontSize:11,letterSpacing:1.5,color:T.m,textTransform:"uppercase",display:"block",marginBottom:5}}>{label}</label>{children}</div>;
};
const Modal = ({title,children,onClose,dark=false}) => {
  const T=dark?NIGHT:DAY;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
      <div style={{background:T.wh,borderRadius:12,padding:28,width:"100%",maxWidth:460,maxHeight:"88vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 className="sf" style={{fontSize:22,fontWeight:400,color:T.ink}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:24,color:T.m,lineHeight:1,cursor:"pointer"}}>√ó</button>
        </div>
        {children}
      </div>
    </div>
  );
};

function Countdown({dark}) {
  const T=useTheme(dark);
  const [t,setT]=useState({d:0,h:0,m:0,s:0});
  useEffect(()=>{
    const tick=()=>{const diff=WEDDING-Date.now();diff<=0?setT({d:0,h:0,m:0,s:0}):setT({d:Math.floor(diff/86400000),h:Math.floor(diff%86400000/3600000),m:Math.floor(diff%3600000/60000),s:Math.floor(diff%60000/1000)});};
    tick();const id=setInterval(tick,1000);return()=>clearInterval(id);
  },[]);
  return (
    <div style={{display:"flex",gap:24,justifyContent:"center"}}>
      {[["Days",t.d],["Hours",t.h],["Mins",t.m],["Secs",t.s]].map(([l,v])=>(
        <div key={l} style={{textAlign:"center"}}>
          <div className="sf" style={{fontSize:42,lineHeight:1,color:T.r,fontWeight:300}}>{String(v).padStart(2,"0")}</div>
          <div style={{fontSize:9,letterSpacing:3,color:T.m,marginTop:4,textTransform:"uppercase"}}>{l}</div>
        </div>
      ))}
    </div>
  );
}

function Landing({onEnter,dark}) {
  const T=useTheme(dark);
  return (
    <div style={{minHeight:"100vh",background:T.cr,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,position:"relative",overflow:"hidden",transition:"background .4s"}}>
      {[180,320,460].map((sz,i)=><div key={i} style={{position:"absolute",width:sz,height:sz,borderRadius:"50%",border:`1px solid ${T.r}${dark?"44":"22"}`,top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none"}}/>)}
      {dark&&<div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 60% 20%, rgba(107,189,212,.08) 0%, transparent 60%)",pointerEvents:"none"}}/>}
      <div className="fade" style={{textAlign:"center",maxWidth:500,zIndex:1}}>
        <p style={{fontSize:10,letterSpacing:5,color:T.m,textTransform:"uppercase",marginBottom:18}}>January 15, 2027 ¬∑ Tagaytay</p>
        <h1 className="sf" style={{fontSize:62,fontWeight:300,lineHeight:1.1,color:T.ink}}>Chicco<br/><span style={{fontSize:40,color:T.g}}>{"&"}</span><br/>Michelle</h1>
        <div style={{width:50,height:1,background:T.g,margin:"22px auto"}}/>
        <p style={{fontFamily:"Georgia,serif",fontSize:14,color:T.m,fontStyle:"italic",marginBottom:34,lineHeight:1.9}}>Our Lady of Lourdes Parish ¬∑ Antonio's Restaurant</p>
        <div style={{marginBottom:44}}><Countdown dark={dark}/></div>
        <button onClick={onEnter} style={{background:dark?"linear-gradient(135deg,#E8956D,#D4A853)":T.ink,color:"#fff",border:"none",padding:"13px 38px",fontSize:10,letterSpacing:3,textTransform:"uppercase",borderRadius:2,cursor:"pointer"}}
          onMouseEnter={e=>e.currentTarget.style.opacity=".85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
          Enter Planning Dashboard
        </button>
        <p style={{marginTop:14,fontSize:11,color:T.m}}>Private ¬∑ Chicco & Michelle only</p>
      </div>
    </div>
  );
}

function Gate({onOk,dark}) {
  const T=useTheme(dark);
  const [pw,setPw]=useState("");const [err,setErr]=useState(false);const [shake,setShake]=useState(false);
  const go=()=>pw==="michelle2027"?onOk():(setErr(true),setShake(true),setTimeout(()=>setShake(false),500));
  return (
    <div style={{minHeight:"100vh",background:T.cr,display:"flex",alignItems:"center",justifyContent:"center",transition:"background .4s"}}>
      <div className="fade" style={{background:T.wh,borderRadius:12,padding:"44px 38px",width:340,boxShadow:dark?"0 8px 40px rgba(0,0,0,.4)":"0 8px 40px rgba(46,37,32,.1)",textAlign:"center",animation:shake?"shake .5s":undefined,border:dark?"1px solid #2A2438":"none"}}>
        <div style={{fontSize:26,marginBottom:10}}>üå∏</div>
        <h2 className="sf" style={{fontSize:26,fontWeight:400,marginBottom:6,color:T.ink}}>Private Dashboard</h2>
        <p style={{fontSize:13,color:T.m,marginBottom:26}}>Chicco & Michelle only</p>
        <input type="password" placeholder="Password" value={pw} onChange={e=>{setPw(e.target.value);setErr(false);}} onKeyDown={e=>e.key==="Enter"&&go()} style={{textAlign:"center",fontSize:14,letterSpacing:2,marginBottom:8}}/>
        {err&&<p style={{fontSize:12,color:T.d,margin:"6px 0"}}>Incorrect password</p>}
        <button onClick={go} style={{width:"100%",background:dark?"linear-gradient(135deg,#E8956D,#D4A853)":T.r,color:"#fff",border:"none",padding:12,fontSize:11,letterSpacing:2,textTransform:"uppercase",borderRadius:6,marginTop:6,cursor:"pointer"}}>Enter</button>
        <p style={{fontSize:11,color:T.m,marginTop:14}}>Hint: michelle + wedding year</p>
      </div>
    </div>
  );
}

function SuppliersTab({suppliers,setSuppliers,dark}) {
  const T=useTheme(dark);
  const [modal,setModal]=useState(null);const [sel,setSel]=useState(null);const [form,setForm]=useState({});
  const [pf,setPf]=useState({date:todayISO(),amount:"",note:""});const [q,setQ]=useState("");const [cat,setCat]=useState("All");
  const filtered=suppliers.filter(s=>(cat==="All"||s.category===cat)&&s.name.toLowerCase().includes(q.toLowerCase()));
  const {sorted:list,Th}=useSort(filtered,"name");
  const tot=suppliers.reduce((a,s)=>a+s.total,0),paid=suppliers.reduce((a,s)=>a+(s.paid||0),0);
  const save=()=>{
    const e={...form,id:sel?.id||Date.now(),total:Number(form.total),payments:form.payments||[]};
    e.paid=e.payments.reduce((a,p)=>a+Number(p.amount),0);
    e.status=e.paid===0?"Unpaid":e.paid>=e.total?"Fully Paid":"Partial";
    setSuppliers(p=>sel?p.map(s=>s.id===e.id?e:s):[...p,e]);setModal(null);
  };
  const logPay=()=>{
    const p={date:pf.date,amount:Number(pf.amount),note:pf.note};
    setSuppliers(prev=>prev.map(s=>{if(s.id!==sel.id)return s;const ps=[...(s.payments||[]),p],pd=ps.reduce((a,x)=>a+x.amount,0);return{...s,payments:ps,paid:pd,status:pd===0?"Unpaid":pd>=s.total?"Fully Paid":"Partial"};}));
    setModal(null);
  };
  const del=id=>{if(window.confirm("Delete?"))setSuppliers(p=>p.filter(s=>s.id!==id));};
  const ts={color:T.m};
  return (
    <div className="fade">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[["Total Contracts",tot,T.ink],["Total Paid",paid,T.su],["Outstanding",tot-paid,T.r]].map(([l,v,c])=>(
          <Card key={l} dark={dark} style={{textAlign:"center"}}><div style={{fontSize:10,color:T.m,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{l}</div><div className="sf" style={{fontSize:26,color:c,fontWeight:300}}>{php(v)}</div></Card>
        ))}
      </div>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input placeholder="Search‚Ä¶" value={q} onChange={e=>setQ(e.target.value)} style={{flex:1,minWidth:130}}/>
        <select value={cat} onChange={e=>setCat(e.target.value)} style={{minWidth:130}}><option value="All">All Categories</option>{SCATS.map(c=><option key={c}>{c}</option>)}</select>
        <Btn dark={dark} onClick={()=>{setForm({name:"",category:"Venue",total:"",dueDate:"",notes:"",payments:[]});setSel(null);setModal("form");}}>+ Add</Btn>
      </div>
      <Card dark={dark} style={{padding:0,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700}}>
          <thead><tr style={{background:T.l}}>
            <Th col="name" label="Supplier" style={ts}/><Th col="category" label="Category" style={ts}/>
            <Th col="total" label="Total" style={ts}/><Th col="paid" label="Paid" style={ts}/>
            <th style={{padding:"10px 12px",textAlign:"left",fontSize:10,letterSpacing:1.5,color:T.m,textTransform:"uppercase",fontWeight:500}}>Balance</th>
            <Th col="dueDate" label="Due" style={ts}/><Th col="status" label="Status" style={ts}/>
            <th style={{padding:"10px 12px"}}/>
          </tr></thead>
          <tbody>
            {list.map((s,i)=>(
              <tr key={s.id} style={{borderTop:`1px solid ${T.l}`,background:i%2===0?T.wh:T.cr}}>
                <td style={{padding:"11px 12px",fontWeight:500,color:T.ink}}>{s.name}</td>
                <td style={{padding:"11px 12px",color:T.m,fontSize:12}}>{s.category}</td>
                <td style={{padding:"11px 12px",color:T.ink}}>{php(s.total)}</td>
                <td style={{padding:"11px 12px",color:T.su}}>{php(s.paid)}</td>
                <td style={{padding:"11px 12px",color:T.r,fontWeight:500}}>{php(s.total-(s.paid||0))}</td>
                <td style={{padding:"11px 12px",color:T.m,fontSize:12}}>{s.dueDate||"‚Äî"}</td>
                <td style={{padding:"11px 12px"}}><Badge label={s.status} color={SC[s.status]}/></td>
                <td style={{padding:"11px 12px"}}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  <Btn dark={dark} onClick={()=>{setSel(s);setModal("view");}} v="ghost">View</Btn>
                  <Btn dark={dark} onClick={()=>{setSel(s);setPf({date:todayISO(),amount:"",note:""});setModal("pay");}} v="success">+Pay</Btn>
                  <Btn dark={dark} onClick={()=>{setForm({...s});setSel(s);setModal("form");}} v="secondary">Edit</Btn>
                  <Btn dark={dark} onClick={()=>del(s.id)} v="danger">Del</Btn>
                </div></td>
              </tr>
            ))}
            {list.length===0&&<tr><td colSpan={8} style={{padding:40,textAlign:"center",color:T.m}}>No suppliers yet.</td></tr>}
          </tbody>
        </table>
      </Card>
      {modal==="form"&&<Modal title={sel?"Edit Supplier":"Add Supplier"} onClose={()=>setModal(null)} dark={dark}>
        <Field label="Name" dark={dark}><input value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
        <Field label="Category" dark={dark}><select value={form.category||"Venue"} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{SCATS.map(c=><option key={c}>{c}</option>)}</select></Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Total (‚Ç±)" dark={dark}><input type="number" value={form.total||""} onChange={e=>setForm(f=>({...f,total:e.target.value}))}/></Field>
          <Field label="Due Date" dark={dark}><input type="date" value={form.dueDate||""} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/></Field>
        </div>
        <Field label="Notes" dark={dark}><textarea value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{minHeight:60,resize:"vertical"}}/></Field>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn dark={dark} v="ghost" onClick={()=>setModal(null)}>Cancel</Btn><Btn dark={dark} onClick={save}>Save</Btn></div>
      </Modal>}
      {modal==="pay"&&sel&&<Modal title={`Log Payment ‚Äî ${sel.name}`} onClose={()=>setModal(null)} dark={dark}>
        <div style={{background:T.l,borderRadius:8,padding:14,marginBottom:16,fontSize:13}}>
          {[["Contract",sel.total,T.ink],["Paid",sel.paid,T.su],["Remaining",sel.total-(sel.paid||0),T.r]].map(([l,v,c])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:T.m}}>{l}</span><strong style={{color:c}}>{php(v)}</strong></div>
          ))}
        </div>
        <Field label="Date" dark={dark}><input type="date" value={pf.date} onChange={e=>setPf(f=>({...f,date:e.target.value}))}/></Field>
        <Field label="Amount (‚Ç±)" dark={dark}><input type="number" value={pf.amount} onChange={e=>setPf(f=>({...f,amount:e.target.value}))} placeholder="0"/></Field>
        <Field label="Note" dark={dark}><input value={pf.note} onChange={e=>setPf(f=>({...f,note:e.target.value}))} placeholder="e.g. 2nd tranche"/></Field>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn dark={dark} v="ghost" onClick={()=>setModal(null)}>Cancel</Btn><Btn dark={dark} v="success" onClick={logPay}>Log Payment</Btn></div>
      </Modal>}
      {modal==="view"&&sel&&<Modal title={sel.name} onClose={()=>setModal(null)} dark={dark}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          {[["Category",sel.category],["Total",php(sel.total)],["Paid",php(sel.paid)],["Balance",php(sel.total-sel.paid)],["Due",sel.dueDate||"‚Äî"],["Status",sel.status]].map(([l,v])=>(
            <div key={l} style={{background:T.l,padding:10,borderRadius:6}}><div style={{fontSize:10,color:T.m,textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>{l}</div><div style={{fontWeight:500,fontSize:13,color:T.ink}}>{v}</div></div>
          ))}
        </div>
        {sel.notes&&<p style={{fontSize:13,color:T.m,background:T.l,padding:10,borderRadius:6,marginBottom:14}}>{sel.notes}</p>}
        <h4 style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",color:T.m,marginBottom:10}}>Payment History</h4>
        {!(sel.payments?.length)?<p style={{fontSize:13,color:T.m,textAlign:"center",padding:12}}>No payments logged.</p>:(
          <table style={{width:"100%",fontSize:13,borderCollapse:"collapse"}}>
            <thead><tr style={{background:T.l}}>{["Date","Amount","Note"].map(h=><th key={h} style={{padding:"7px 10px",textAlign:"left",fontSize:10,color:T.m,textTransform:"uppercase",letterSpacing:1}}>{h}</th>)}</tr></thead>
            <tbody>{sel.payments.map((p,i)=><tr key={i} style={{borderTop:`1px solid ${T.l}`}}><td style={{padding:"8px 10px",color:T.ink}}>{p.date}</td><td style={{padding:"8px 10px",color:T.su,fontWeight:600}}>{php(p.amount)}</td><td style={{padding:"8px 10px",color:T.m}}>{p.note||"‚Äî"}</td></tr>)}</tbody>
          </table>
        )}
      </Modal>}
    </div>
  );
}

function CalendarTab({events,setEvents,dark}) {
  const T=useTheme(dark);
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());const [month,setMonth]=useState(now.getMonth());
  const [modal,setModal]=useState(false);const [form,setForm]=useState({});const [sel,setSel]=useState(null);
  const todayStr=todayISO();
  const firstWeekday=new Date(year,month,1).getDay(),daysInMonth=new Date(year,month+1,0).getDate();
  const monthLabel=new Date(year,month,1).toLocaleString("default",{month:"long",year:"numeric"});
  const eventMap=useMemo(()=>{const m={};events.forEach(ev=>{if(!m[ev.date])m[ev.date]=[];m[ev.date].push(ev);});return m;},[events]);
  const prevMonth=()=>month===0?(setMonth(11),setYear(y=>y-1)):setMonth(m=>m-1);
  const nextMonth=()=>month===11?(setMonth(0),setYear(y=>y+1)):setMonth(m=>m+1);
  const openAdd=ds=>{setForm({title:"",date:ds,type:"Meeting",amount:"",notes:""});setSel(null);setModal(true);};
  const openEdit=(ev,e)=>{e.stopPropagation();setForm({...ev});setSel(ev);setModal(true);};
  const delEv=id=>{if(window.confirm("Delete?"))setEvents(p=>p.filter(e=>e.id!==id));};
  const save=()=>{const e={...form,id:sel?.id||Date.now(),amount:Number(form.amount)||0};setEvents(p=>sel?p.map(x=>x.id===e.id?e:x):[...p,e]);setModal(false);};
  const upcoming=[...events].filter(e=>e.date>=todayStr).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,8);
  const cells=[...Array(firstWeekday).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)];
  return (
    <div className="fade">
      <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:16,alignItems:"start"}}>
        <Card dark={dark}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <button onClick={prevMonth} style={{background:T.l,border:"none",borderRadius:6,width:32,height:32,fontSize:18,color:T.m,cursor:"pointer"}}>‚Äπ</button>
            <h3 className="sf" style={{fontSize:21,fontWeight:400,color:T.ink}}>{monthLabel}</h3>
            <button onClick={nextMonth} style={{background:T.l,border:"none",borderRadius:6,width:32,height:32,fontSize:18,color:T.m,cursor:"pointer"}}>‚Ä∫</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4}}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:T.m,letterSpacing:1,textTransform:"uppercase",padding:"2px 0"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
            {cells.map((day,idx)=>{
              if(day===null)return <div key={"b"+idx}/>;
              const ds=toISO(year,month,day),dayEvs=eventMap[ds]||[],isToday=ds===todayStr;
              return(
                <div key={ds} className={"cal-day"+(isToday?" today":"")} onClick={()=>openAdd(ds)}>
                  <div style={{fontSize:11,fontWeight:isToday?700:400,color:isToday?T.r:T.ink,marginBottom:2}}>{day}</div>
                  {dayEvs.slice(0,2).map(ev=><div key={ev.id} onClick={e=>openEdit(ev,e)} title={ev.title} style={{fontSize:8,background:EC[ev.type],color:"#fff",borderRadius:3,padding:"1px 4px",marginBottom:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{ev.title}</div>)}
                  {dayEvs.length>2&&<div style={{fontSize:8,color:T.m}}>+{dayEvs.length-2}</div>}
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:14,paddingTop:12,borderTop:`1px solid ${T.l}`}}>
            {Object.entries(EC).map(([t,c])=><div key={t} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.m}}><div style={{width:8,height:8,borderRadius:2,background:c,flexShrink:0}}/>{t}</div>)}
          </div>
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <Btn dark={dark} onClick={()=>openAdd(todayStr)} style={{width:"100%"}}>+ Add Event</Btn>
          <Card dark={dark} style={{padding:16}}>
            <h4 className="sf" style={{fontSize:17,fontWeight:400,marginBottom:12,color:T.ink}}>Upcoming</h4>
            {upcoming.length===0?<p style={{fontSize:12,color:T.m,textAlign:"center"}}>No upcoming events</p>:
              upcoming.map(ev=>(
                <div key={ev.id} style={{marginBottom:10,paddingBottom:10,borderBottom:`1px solid ${T.l}`,cursor:"pointer"}} onClick={e=>openEdit(ev,e)}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:12,fontWeight:500,flex:1,paddingRight:6,lineHeight:1.3,color:T.ink}}>{ev.title}</span>
                    <button onClick={e=>{e.stopPropagation();delEv(ev.id);}} style={{background:"none",border:"none",color:T.m,fontSize:16,cursor:"pointer",lineHeight:1}}>√ó</button>
                  </div>
                  <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
                    <Badge label={ev.type} color={EC[ev.type]}/><span style={{fontSize:10,color:T.m}}>{ev.date}</span>
                  </div>
                  {ev.amount>0&&<div style={{fontSize:11,color:T.r,marginTop:3,fontWeight:500}}>{php(ev.amount)}</div>}
                </div>
              ))}
          </Card>
        </div>
      </div>
      {modal&&<Modal title={sel?"Edit Event":"Add Event"} onClose={()=>setModal(false)} dark={dark}>
        <Field label="Title" dark={dark}><input value={form.title||""} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Gown fitting"/></Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Date" dark={dark}><input type="date" value={form.date||""} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></Field>
          <Field label="Type" dark={dark}><select value={form.type||"Meeting"} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{ETYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
        </div>
        <Field label="Amount (‚Ç±)" dark={dark}><input type="number" value={form.amount||""} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0"/></Field>
        <Field label="Notes" dark={dark}><textarea value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{minHeight:55,resize:"vertical"}}/></Field>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          {sel&&<Btn dark={dark} v="danger" onClick={()=>{delEv(sel.id);setModal(false);}}>Delete</Btn>}
          <Btn dark={dark} v="ghost" onClick={()=>setModal(false)}>Cancel</Btn><Btn dark={dark} onClick={save}>Save</Btn>
        </div>
      </Modal>}
    </div>
  );
}

function BudgetTab({budget,setBudget,dark}) {
  const T=useTheme(dark);
  const [modal,setModal]=useState(false);const [form,setForm]=useState({});const [sel,setSel]=useState(null);
  const tE=budget.reduce((a,b)=>a+(b.estimated||0),0),tA=budget.reduce((a,b)=>a+(b.actual||0),0);
  const enriched=budget.map(b=>({...b,variance:b.estimated-b.actual,pct:b.estimated>0?(b.actual/b.estimated)*100:0}));
  const {sorted:list,Th}=useSort(enriched,"category");
  const save=()=>{const e={...form,id:sel?.id||Date.now(),estimated:Number(form.estimated)||0,actual:Number(form.actual)||0};setBudget(p=>sel?p.map(b=>b.id===e.id?e:b):[...p,e]);setModal(false);};
  const ts={color:T.m};
  return(
    <div className="fade">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18}}>
        {[["Budget",tE,T.ink],["Spent",tA,T.r],["Remaining",tE-tA,(tE-tA)<0?T.d:T.su]].map(([l,v,c])=>(
          <Card key={l} dark={dark} style={{textAlign:"center"}}><div style={{fontSize:10,color:T.m,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{l}</div><div className="sf" style={{fontSize:26,color:c,fontWeight:300}}>{php(v)}</div></Card>
        ))}
      </div>
      <Card dark={dark} style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:7,fontSize:13}}><span style={{color:T.m}}>Overall Used</span><span style={{fontWeight:500,color:T.ink}}>{tE>0?Math.round((tA/tE)*100):0}%</span></div>
        <div style={{height:7,background:T.l,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,tE>0?(tA/tE)*100:0)}%`,background:dark?"linear-gradient(90deg,#E8956D,#D4A853)":T.r,borderRadius:4}}/></div>
      </Card>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
        <Btn dark={dark} onClick={()=>{setForm({category:"",estimated:"",actual:""});setSel(null);setModal(true);}}>+ Add Category</Btn>
      </div>
      <Card dark={dark} style={{padding:0,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:560}}>
          <thead><tr style={{background:T.l}}>
            <Th col="category" label="Category" style={ts}/><Th col="estimated" label="Budget" style={ts}/>
            <Th col="actual" label="Actual" style={ts}/><Th col="variance" label="Variance" style={ts}/>
            <Th col="pct" label="Progress" style={ts}/><th style={{padding:"10px 12px"}}/>
          </tr></thead>
          <tbody>
            {list.map((b,i)=>{
              const v=b.estimated-b.actual,pct=b.estimated>0?Math.min(100,(b.actual/b.estimated)*100):0;
              return(
                <tr key={b.id} style={{borderTop:`1px solid ${T.l}`,background:i%2===0?T.wh:T.cr}}>
                  <td style={{padding:"11px 12px",fontWeight:500,color:T.ink}}>{b.category}</td>
                  <td style={{padding:"11px 12px",color:T.ink}}>{php(b.estimated)}</td>
                  <td style={{padding:"11px 12px",color:T.r}}>{php(b.actual)}</td>
                  <td style={{padding:"11px 12px",color:v>=0?T.su:T.d,fontWeight:500}}>{v>=0?"+":""}{php(v)}</td>
                  <td style={{padding:"11px 12px",minWidth:100}}>
                    <div style={{height:5,background:T.l,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:pct>100?T.d:pct>80?T.wa:T.r,borderRadius:3}}/></div>
                    <div style={{fontSize:9,color:T.m,marginTop:2}}>{Math.round(pct)}%</div>
                  </td>
                  <td style={{padding:"11px 12px"}}><div style={{display:"flex",gap:6}}>
                    <Btn dark={dark} onClick={()=>{setForm({...b});setSel(b);setModal(true);}} v="secondary">Edit</Btn>
                    <Btn dark={dark} onClick={()=>{if(window.confirm("Remove?"))setBudget(p=>p.filter(x=>x.id!==b.id));}} v="danger">Del</Btn>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      {modal&&<Modal title={sel?"Edit Category":"Add Category"} onClose={()=>setModal(false)} dark={dark}>
        <Field label="Category" dark={dark}><input value={form.category||""} onChange={e=>setForm(f=>({...f,category:e.target.value}))}/></Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Budget (‚Ç±)" dark={dark}><input type="number" value={form.estimated||""} onChange={e=>setForm(f=>({...f,estimated:e.target.value}))}/></Field>
          <Field label="Actual (‚Ç±)" dark={dark}><input type="number" value={form.actual||""} onChange={e=>setForm(f=>({...f,actual:e.target.value}))}/></Field>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn dark={dark} v="ghost" onClick={()=>setModal(false)}>Cancel</Btn><Btn dark={dark} onClick={save}>Save</Btn></div>
      </Modal>}
    </div>
  );
}

function GuestsTab({guests,setGuests,dark}) {
  const T=useTheme(dark);
  const [modal,setModal]=useState(false);const [form,setForm]=useState({});const [sel,setSel]=useState(null);
  const [q,setQ]=useState("");const [fR,setFR]=useState("All");const [fG,setFG]=useState("All");
  const filtered=guests.filter(g=>(fR==="All"||g.rsvp===fR)&&(fG==="All"||g.group===fG)&&(g.name.toLowerCase().includes(q.toLowerCase())||(g.phone||"").includes(q)));
  const {sorted:list,Th}=useSort(filtered,"name");
  const conf=guests.filter(g=>g.rsvp==="Confirmed").length,pend=guests.filter(g=>g.rsvp==="Pending").length;
  const heads=guests.filter(g=>g.rsvp==="Confirmed").reduce((a,g)=>a+1+(g.plusOne?1:0),0);
  const save=()=>{const e={...form,id:sel?.id||Date.now()};setGuests(p=>sel?p.map(g=>g.id===e.id?e:g):[...p,e]);setModal(false);};
  const ts={color:T.m};
  return(
    <div className="fade">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
        {[["Total",guests.length,T.ink],["Confirmed",conf,T.su],["Pending",pend,T.wa],["Total Heads",heads,T.b]].map(([l,v,c])=>(
          <Card key={l} dark={dark} style={{textAlign:"center"}}><div style={{fontSize:10,color:T.m,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{l}</div><div className="sf" style={{fontSize:30,color:c,fontWeight:300}}>{v}</div></Card>
        ))}
      </div>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input placeholder="Search‚Ä¶" value={q} onChange={e=>setQ(e.target.value)} style={{flex:1,minWidth:130}}/>
        <select value={fR} onChange={e=>setFR(e.target.value)} style={{minWidth:110}}><option value="All">All RSVP</option>{RSVPS.map(s=><option key={s}>{s}</option>)}</select>
        <select value={fG} onChange={e=>setFG(e.target.value)} style={{minWidth:110}}>{["All","Bride","Groom","Mutual"].map(g=><option key={g}>{g}</option>)}</select>
        <Btn dark={dark} onClick={()=>{setForm({name:"",phone:"",group:"Mutual",rsvp:"Pending",meal:"",plusOne:false,table:"",notes:""});setSel(null);setModal(true);}}>+ Add Guest</Btn>
      </div>
      <Card dark={dark} style={{padding:0,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:640}}>
          <thead><tr style={{background:T.l}}>
            <Th col="name" label="Name" style={ts}/><Th col="phone" label="Phone" style={ts}/>
            <Th col="group" label="Group" style={ts}/><Th col="rsvp" label="RSVP" style={ts}/>
            <Th col="meal" label="Meal" style={ts}/><Th col="plusOne" label="+1" style={ts}/>
            <Th col="table" label="Table" style={ts}/><th style={{padding:"10px 12px"}}/>
          </tr></thead>
          <tbody>
            {list.map((g,i)=>(
              <tr key={g.id} style={{borderTop:`1px solid ${T.l}`,background:i%2===0?T.wh:T.cr}}>
                <td style={{padding:"10px 12px",fontWeight:500,color:T.ink}}>{g.name}</td>
                <td style={{padding:"10px 12px",color:T.m,fontSize:12}}>{g.phone||"‚Äî"}</td>
                <td style={{padding:"10px 12px"}}><Badge label={g.group} color={g.group==="Bride"?T.r:g.group==="Groom"?T.b:T.m}/></td>
                <td style={{padding:"10px 12px"}}><Badge label={g.rsvp} color={RC[g.rsvp]}/></td>
                <td style={{padding:"10px 12px",color:T.m,fontSize:12}}>{g.meal||"‚Äî"}</td>
                <td style={{padding:"10px 12px",textAlign:"center",color:T.ink}}>{g.plusOne?"‚úì":"‚Äî"}</td>
                <td style={{padding:"10px 12px",color:T.m,fontSize:12}}>{g.table||"‚Äî"}</td>
                <td style={{padding:"10px 12px"}}><div style={{display:"flex",gap:5}}>
                  <Btn dark={dark} onClick={()=>{setForm({...g});setSel(g);setModal(true);}} v="secondary">Edit</Btn>
                  <Btn dark={dark} onClick={()=>{if(window.confirm("Remove?"))setGuests(p=>p.filter(x=>x.id!==g.id));}} v="danger">Del</Btn>
                </div></td>
              </tr>
            ))}
            {list.length===0&&<tr><td colSpan={8} style={{padding:40,textAlign:"center",color:T.m}}>No guests found.</td></tr>}
          </tbody>
        </table>
      </Card>
      {modal&&<Modal title={sel?"Edit Guest":"Add Guest"} onClose={()=>setModal(false)} dark={dark}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Full Name" dark={dark}><input value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>
          <Field label="Phone" dark={dark}><input value={form.phone||""} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="09XX XXX XXXX"/></Field>
          <Field label="Group" dark={dark}><select value={form.group||"Mutual"} onChange={e=>setForm(f=>({...f,group:e.target.value}))}>{["Bride","Groom","Mutual"].map(g=><option key={g}>{g}</option>)}</select></Field>
          <Field label="RSVP" dark={dark}><select value={form.rsvp||"Pending"} onChange={e=>setForm(f=>({...f,rsvp:e.target.value}))}>{RSVPS.map(s=><option key={s}>{s}</option>)}</select></Field>
          <Field label="Meal" dark={dark}><select value={form.meal||""} onChange={e=>setForm(f=>({...f,meal:e.target.value}))}><option value="">‚Äî</option>{MEALS.map(m=><option key={m}>{m}</option>)}</select></Field>
          <Field label="Table No." dark={dark}><input value={form.table||""} onChange={e=>setForm(f=>({...f,table:e.target.value}))} placeholder="e.g. 3"/></Field>
        </div>
        <Field label="+1?" dark={dark}><label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",color:T.ink}}><input type="checkbox" checked={!!form.plusOne} onChange={e=>setForm(f=>({...f,plusOne:e.target.checked}))} style={{width:15,height:15}}/>Bringing a plus-one</label></Field>
        <Field label="Notes" dark={dark}><textarea value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{minHeight:55,resize:"vertical"}}/></Field>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn dark={dark} v="ghost" onClick={()=>setModal(false)}>Cancel</Btn><Btn dark={dark} onClick={save}>Save</Btn></div>
      </Modal>}
    </div>
  );
}

function OverviewTab({suppliers,guests,budget,events,dark}) {
  const T=useTheme(dark);
  const tD=suppliers.reduce((a,s)=>a+s.total,0),tP=suppliers.reduce((a,s)=>a+(s.paid||0),0);
  const conf=guests.filter(g=>g.rsvp==="Confirmed").length;
  const tB=budget.reduce((a,b)=>a+b.estimated,0),tS=budget.reduce((a,b)=>a+b.actual,0);
  const ts=todayISO();
  const up=[...events].filter(e=>e.date>=ts).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  const dl=Math.ceil((WEDDING-new Date())/86400000);
  const unpaid=suppliers.filter(s=>s.status!=="Fully Paid");
  const heroBg=dark?"linear-gradient(135deg,#0E0C14 0%,#1F1B2E 50%,#13111A 100%)":"linear-gradient(135deg,#2E2520 0%,#4A3830 100%)";
  return(
    <div className="fade">
      <Card dark={dark} style={{marginBottom:14,background:heroBg,textAlign:"center",padding:"30px 20px",position:"relative",overflow:"hidden"}}>
        {dark&&<div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 0%, rgba(107,189,212,.15) 0%, transparent 60%)",pointerEvents:"none"}}/>}
        <p style={{fontSize:9,letterSpacing:4,textTransform:"uppercase",marginBottom:7,color:T.g,position:"relative"}}>Chicco & Michelle</p>
        <h2 className="sf" style={{fontSize:32,fontWeight:300,marginBottom:3,color:"#F0EBE3",position:"relative"}}>January 15, 2027</h2>
        <p style={{fontSize:12,color:"#A89880",marginBottom:20,position:"relative"}}>Our Lady of Lourdes ¬∑ Antonio's ¬∑ Tagaytay</p>
        <div className="sf" style={{fontSize:52,fontWeight:300,color:T.r,position:"relative"}}>{dl}</div>
        <p style={{fontSize:9,letterSpacing:4,textTransform:"uppercase",color:"#A89880",position:"relative"}}>Days to Go</p>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
        {[
          [`${php(tP)} paid`,"Payments",`of ${php(tD)}`,T.r,tD>0?(tP/tD)*100:0],
          [`${conf} confirmed`,"RSVPs",`of ${guests.length}`,T.su,guests.length>0?(conf/guests.length)*100:0],
          [`${tB>0?Math.round((tS/tB)*100):0}% used`,"Budget",`${php(tS)} of ${php(tB)}`,T.b,tB>0?Math.min(100,(tS/tB)*100):0],
        ].map(([v,l,sub,c,pct])=>(
          <Card key={l} dark={dark}>
            <div style={{fontSize:10,color:T.m,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>{l}</div>
            <div className="sf" style={{fontSize:20,color:c,fontWeight:300,marginBottom:2}}>{v}</div>
            <div style={{fontSize:11,color:T.m,marginBottom:9}}>{sub}</div>
            <div style={{height:4,background:T.l,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:c,borderRadius:2}}/></div>
          </Card>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card dark={dark}>
          <h3 className="sf" style={{fontSize:19,fontWeight:400,marginBottom:12,color:T.ink}}>Upcoming Events</h3>
          {up.length===0?<p style={{fontSize:13,color:T.m,textAlign:"center",padding:14}}>No upcoming events</p>:
            up.map(ev=><div key={ev.id} style={{display:"flex",alignItems:"center",gap:9,marginBottom:9,padding:"7px 9px",background:T.l,borderRadius:6}}>
              <div style={{width:3,height:32,borderRadius:2,background:EC[ev.type],flexShrink:0}}/>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:T.ink}}>{ev.title}</div><div style={{fontSize:11,color:T.m}}>{ev.date} ¬∑ {ev.type}</div></div>
              {ev.amount>0&&<div style={{fontSize:12,color:T.r,fontWeight:500}}>{php(ev.amount)}</div>}
            </div>)}
        </Card>
        <Card dark={dark}>
          <h3 className="sf" style={{fontSize:19,fontWeight:400,marginBottom:12,color:T.ink}}>Pending Balances</h3>
          {unpaid.length===0?<p style={{fontSize:13,color:T.su,textAlign:"center",padding:14}}>All paid! üéâ</p>:
            unpaid.map(s=><div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9,padding:"7px 9px",background:T.l,borderRadius:6}}>
              <div><div style={{fontSize:13,fontWeight:500,color:T.ink}}>{s.name}</div><div style={{fontSize:11,color:T.m}}>{s.category}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:13,color:T.r,fontWeight:500}}>{php(s.total-(s.paid||0))}</div><Badge label={s.status} color={SC[s.status]}/></div>
            </div>)}
        </Card>
      </div>
    </div>
  );
}

function Dashboard({onLogout,dark,onToggleDark}) {
  const T=useTheme(dark);
  const [tab,setTab]=useState("overview");
  const [suppliers,setSuppliers]=useState(INIT_S);
  const [guests,setGuests]=useState(INIT_G);
  const [budget,setBudget]=useState(INIT_B);
  const [events,setEvents]=useState(INIT_E);
  const [saved,setSaved]=useState(true);
  useEffect(()=>{
    const stored={s:localStorage.getItem("cS"),g:localStorage.getItem("cG"),b:localStorage.getItem("cB"),e:localStorage.getItem("cE")};
    if(stored.s)setSuppliers(JSON.parse(stored.s));
    if(stored.g)setGuests(JSON.parse(stored.g));
    if(stored.b)setBudget(JSON.parse(stored.b));
    if(stored.e)setEvents(JSON.parse(stored.e));
  },[]);
  useEffect(()=>{
    setSaved(false);
    const t=setTimeout(()=>{
      localStorage.setItem("cS",JSON.stringify(suppliers));
      localStorage.setItem("cG",JSON.stringify(guests));
      localStorage.setItem("cB",JSON.stringify(budget));
      localStorage.setItem("cE",JSON.stringify(events));
      setSaved(true);
    },700);
    return()=>clearTimeout(t);
  },[suppliers,guests,budget,events]);
  const tabs=[{id:"overview",label:"Overview",icon:"‚óà"},{id:"suppliers",label:"Suppliers",icon:"‚Ç±"},{id:"calendar",label:"Calendar",icon:"‚ó∑"},{id:"budget",label:"Budget",icon:"‚óâ"},{id:"guests",label:"Guests",icon:"‚óé"}];
  return(
    <div style={{minHeight:"100vh",background:T.cr,display:"flex",transition:"background .4s"}}>
      <div style={{width:210,background:T.sidebar,display:"flex",flexDirection:"column",flexShrink:0,position:"sticky",top:0,height:"100vh",overflowY:"auto",transition:"background .4s"}}>
        <div style={{padding:"22px 16px 14px",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
          <p style={{fontSize:8,letterSpacing:4,color:T.g,textTransform:"uppercase",marginBottom:3}}>Wedding Planner</p>
          <h2 className="sf" style={{fontSize:17,fontWeight:300,color:T.sideText,lineHeight:1.35}}>Chicco &amp;<br/>Michelle</h2>
          <p style={{fontSize:10,color:T.sideSubtext,marginTop:3}}>Jan 15, 2027</p>
        </div>
        <nav style={{flex:1,padding:"12px 8px"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 11px",borderRadius:7,border:"none",marginBottom:2,fontSize:12,fontFamily:"'Jost',sans-serif",transition:"all .15s",background:tab===t.id?T.sideActive:"transparent",color:tab===t.id?T.r:T.navMuted,borderLeft:tab===t.id?`2px solid ${T.r}`:"2px solid transparent"}}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>
        <ThemeToggle dark={dark} onToggle={onToggleDark}/>
        <div style={{padding:"8px 10px 14px",borderTop:"1px solid rgba(255,255,255,.07)"}}>
          <div style={{fontSize:10,color:T.sideSubtext,marginBottom:7,paddingLeft:12}}>{saved?"‚úì Saved":"Saving‚Ä¶"}</div>
          <button onClick={onLogout} style={{width:"100%",padding:"8px 11px",border:"none",borderRadius:7,background:"rgba(255,255,255,.04)",color:T.navMuted,fontSize:11,cursor:"pointer",textAlign:"left",fontFamily:"'Jost',sans-serif"}}>‚Üê Lock</button>
        </div>
      </div>
      <div style={{flex:1,padding:"22px",overflow:"auto"}}>
        <div style={{maxWidth:1080,margin:"0 auto"}}>
          <div style={{marginBottom:18}}>
            <h1 className="sf" style={{fontSize:28,fontWeight:300,color:T.ink}}>{tabs.find(t=>t.id===tab)?.label}</h1>
            <p style={{fontSize:12,color:T.m}}>Chicco & Michelle ¬∑ January 15, 2027</p>
          </div>
          {tab==="overview"&&<OverviewTab suppliers={suppliers} guests={guests} budget={budget} events={events} dark={dark}/>}
          {tab==="suppliers"&&<SuppliersTab suppliers={suppliers} setSuppliers={setSuppliers} dark={dark}/>}
          {tab==="calendar"&&<CalendarTab events={events} setEvents={setEvents} dark={dark}/>}
          {tab==="budget"&&<BudgetTab budget={budget} setBudget={setBudget} dark={dark}/>}
          {tab==="guests"&&<GuestsTab guests={guests} setGuests={setGuests} dark={dark}/>}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page,setPage]=useState("landing");
  const [dark,setDark]=useState(false);
  useEffect(()=>{
    const id="wp6";let el=document.getElementById(id);if(el)el.remove();
    const s=document.createElement("style");s.id=id;s.textContent=getStyles(dark);document.head.appendChild(s);
  },[dark]);
  return(
    <div style={{transition:"background .4s"}}>
      {page==="landing"&&<Landing onEnter={()=>setPage("gate")} dark={dark}/>}
      {page==="gate"&&<Gate onOk={()=>setPage("dashboard")} dark={dark}/>}
      {page==="dashboard"&&<Dashboard onLogout={()=>setPage("landing")} dark={dark} onToggleDark={()=>setDark(d=>!d)}/>}
    </div>
  );
}

