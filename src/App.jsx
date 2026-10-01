import React, { useState, useEffect, useMemo, useRef } from "react";
import './App.css';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const sb = createClient(
  "https://ebmwssxsqptnuriituhg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVibXdzc3hzcXB0bnVyaWl0dWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMTk0NzcsImV4cCI6MjA4ODc5NTQ3N30.tflIvMyitoti4BqLqBs-5oAq7-lX4mW1oS6Olv7WRMc"
);

const sbLoad = () => Promise.race([
  (async () => {
    const [s, g, b, e, tb] = await Promise.all([
      sb.from("suppliers").select("*").order("id"),
      sb.from("guests").select("*").order("id"),
      sb.from("budget").select("*").eq("id", "main").single(),
      sb.from("events").select("*").order("id"),
      sb.from("settings").select("*").eq("key", "totalBudget").single(),
    ]);
    const li = await sb.from("settings").select("*").eq("key", "lastImport").maybeSingle();
    const firstErr = [s, g, b, e, tb].find(r => r.error && r.error.code !== "PGRST116")?.error;
    if (firstErr) throw new Error(firstErr.message);
    return {
      suppliers:   s.data?.map(r => r.data) || null,
      guests:      g.data?.map(r => r.data) || null,
      budget:      b.data?.data || null,
      events:      e.data?.map(r => r.data) || null,
      totalBudget: tb.data?.value ?? null,
      lastImport:  li.data?.value ?? null,
    };
  })(),
  new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 25000)),
]);

const sbSave = async (suppliers, guests, budget, events, totalBudget, lastImport) => {
  const cleanup = (table, ids) =>
    ids.length > 0
      ? sb.from(table).delete().not("id", "in", `(${ids.join(",")})`)
      : sb.from(table).delete().gte("id", 0);
  const results = await Promise.all([
    sb.from("suppliers").upsert(suppliers.map(s => ({ id: s.id, data: s }))),
    sb.from("guests").upsert(guests.map(g => ({ id: g.id, data: g }))),
    sb.from("budget").upsert({ id: "main", data: budget.map(({ actual, ...rest }) => rest) }),
    sb.from("events").upsert(events.map(e => ({ id: e.id, data: e }))),
    sb.from("settings").upsert({ key: "totalBudget", value: totalBudget }),
    sb.from("settings").upsert({ key: "lastImport", value: lastImport || 0 }),
    cleanup("suppliers", suppliers.map(s => s.id)),
    cleanup("guests",    guests.map(g => g.id)),
    cleanup("events",    events.map(e => e.id)),
  ]);
  const bad = results.find(r => r?.error);
  if (bad) throw new Error(bad.error.message);
};

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
    .bottom-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:var(--ink);border-top:1px solid rgba(255,255,255,.1);z-index:200;padding-bottom:env(safe-area-inset-bottom);}
    .bottom-nav button{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border:none;background:transparent;color:#8A7E78;font-size:9px;letter-spacing:1px;text-transform:uppercase;font-family:'Jost',sans-serif;cursor:pointer;}
    .bottom-nav button.active{color:var(--r);}
    .bottom-nav .bn-icon{font-size:17px;}

    /* ── Landing page: photo-led ── */
    @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400&family=Figtree:wght@300;400;500;600&display=swap');
    html{scroll-behavior:smooth;}
    .lp{--forest:#2C4536;--moss:#7D9470;--amber:#D9A55A;--wood:#1E1915;--wood2:#2A231D;--ivory:#F4EFE6;--sand:#E7E0D1;--ink:#2A2521;--ink2:#7B716A;--rule:#DDD5C6;
        background:var(--ivory);color:var(--ink);font-family:'Figtree',system-ui,sans-serif;font-size:16px;line-height:1.65;-webkit-font-smoothing:antialiased;}
    .lp *{box-sizing:border-box;}
    .lp h1,.lp h2,.lp h3,.lp .serif{font-family:'Bodoni Moda','Bodoni 72',Didot,serif;font-weight:400;letter-spacing:-.005em;}
    .lp a{color:inherit;text-decoration:none;border-bottom:1px solid currentColor;padding-bottom:1px;opacity:.85;}
    .lp a:hover{opacity:1;}
    .lp p{margin:0 0 1em;max-width:58ch;}
    .lp .wrap{max-width:1160px;margin:0 auto;padding:0 clamp(20px,5vw,56px);}
    .lp .small{font-size:11px;letter-spacing:.26em;text-transform:uppercase;font-weight:500;opacity:.8;}
    .lp .tag{font-family:'Figtree',sans-serif;font-weight:600;letter-spacing:.02em;}
    .lp button,.lp input,.lp textarea{font-family:'Figtree',system-ui,sans-serif;}
    .lp img{display:block;max-width:100%;}
    /* hero */
    .lp-hero{position:relative;min-height:100svh;display:flex;align-items:flex-end;color:#fff;overflow:hidden;background:var(--forest);}
    .lp-hero .bgwrap{position:absolute;inset:0;will-change:transform;}
    .lp-hero .bg{position:absolute;inset:0;background-size:cover;background-position:var(--pos);opacity:0;transition:opacity 1.8s ease;animation:lp-kb 14s ease-out both;}
    .lp-hero .bg.on{opacity:1;}
    .lp-hero .veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,30,22,.10) 0%,rgba(20,30,22,0) 40%,rgba(20,30,22,.78) 100%);}
    .lp-hero .in{position:relative;width:100%;padding:0 clamp(20px,5vw,56px) clamp(36px,6vw,72px);}
    .lp-hero .flower{position:absolute;top:clamp(20px,4vw,40px);left:clamp(20px,5vw,56px);cursor:default;user-select:none;-webkit-user-select:none;}
    .lp-hero .names{font-size:clamp(64px,11vw,150px);line-height:.92;margin:0 0 18px;text-shadow:0 2px 24px rgba(0,0,0,.25);}
    .lp-hero .names em{font-style:italic;color:var(--amber);font-size:.5em;display:inline-block;margin:0 .08em;vertical-align:.18em;}
    .lp-hero .row{display:flex;flex-wrap:wrap;gap:12px 40px;align-items:flex-end;justify-content:space-between;}
    .lp-hero .when{font-size:clamp(15px,1.6vw,19px);margin:0;max-width:none;}
    .lp-hero .when b{display:block;font-weight:600;font-size:1.05em;}
    .lp-hero .when .tag{color:var(--amber);display:block;margin-top:6px;}
    .lp-hero .inf svg path{stroke-dasharray:1;stroke-dashoffset:1;animation:lp-draw 2.4s .6s ease-out forwards;}
    .lp-count{display:flex;gap:clamp(14px,2.4vw,28px);}
    .lp-count span{display:block;font-family:'Bodoni Moda',serif;font-size:clamp(30px,3.6vw,46px);line-height:1;color:#fff;}
    .lp-count small{display:block;font-size:10px;letter-spacing:.2em;text-transform:uppercase;opacity:.75;margin-top:6px;}
    .lp-forever .inf svg{display:block;height:clamp(22px,2.6vw,32px);width:auto;transform:skewX(-14deg);}
    /* sections */
    .lp-sec{padding:clamp(64px,8vw,112px) 0;}
    .lp-sec.dark{background:var(--wood);color:var(--ivory);}
    .lp-sec.dark .small{color:var(--amber);}
    .lp-sec.sand{background:var(--sand);}
    .lp-sec h2{font-size:clamp(36px,4.6vw,60px);line-height:1.02;margin:10px 0 30px;}
    .lp-sec h2 em{font-style:italic;color:var(--amber);}
    .lp-sec.light h2 em,.lp-sec.sand h2 em{color:var(--moss);}
    /* the day: timeline + window photo */
    .lp-day{display:grid;grid-template-columns:1.15fr .85fr;gap:clamp(28px,6vw,80px);align-items:center;}
    .lp-tl{list-style:none;margin:0;padding:0;position:relative;}
    .lp-tl::before{content:"";position:absolute;left:0;top:0;bottom:0;width:1px;background:var(--amber);opacity:.7;}
    .lp-tl li{position:relative;padding:0 0 26px 30px;}
    .lp-tl li::before{content:"";position:absolute;left:-3px;top:13px;width:7px;height:7px;border-radius:50%;background:var(--amber);}
    .lp-tl .t{font-family:'Bodoni Moda',serif;font-size:30px;line-height:1;color:var(--amber);display:inline-block;min-width:96px;}
    .lp-tl .t small{font-family:'Figtree',sans-serif;font-size:11px;letter-spacing:.12em;margin-left:4px;vertical-align:.35em;opacity:.8;}
    .lp-tl .w{display:inline;font-size:17px;font-weight:500;}
    .lp-tl .n{display:block;font-size:14px;opacity:.7;margin-top:2px;max-width:46ch;}
    .lp-frame{position:relative;overflow:hidden;background:var(--wood2);}
    .lp-frame img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s cubic-bezier(.2,.7,.2,1);}
    .lp-frame:hover img{transform:scale(1.04);}
    .lp-frame.tall{aspect-ratio:3/4;}
    .lp-frame.wide{aspect-ratio:16/9;}
    .lp-frame .cap{position:absolute;left:14px;bottom:12px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#fff;opacity:.8;}
    /* getting there */
    .lp-there{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,5vw,64px);align-items:stretch;}
    .lp-there>div:first-child{display:flex;flex-direction:column;}
    .there-photo{flex:1;min-height:260px;}
    .there-photo img{position:absolute;inset:0;}
    @media(max-width:820px){.there-photo{aspect-ratio:4/3;flex:none;}}
    .lp-venue{padding:22px 0;border-top:1px solid var(--rule);}
    .lp-venue h3{font-size:28px;margin:0 0 2px;line-height:1.15;}
    .lp-venue .where{font-size:13px;color:var(--ink2);margin-bottom:8px;}
    .lp-venue p{font-size:14px;margin-bottom:8px;}
    .lp-note{border-left:2px solid var(--moss);padding:4px 0 4px 16px;font-size:14px;color:var(--ink2);margin-top:8px;max-width:56ch;}
    .lp-wear{display:flex;flex-direction:column;align-items:flex-start;gap:4px;margin:0;}
    .lp-wear b{font-family:'Bodoni Moda',serif;font-weight:400;font-style:italic;font-size:17px;}
    .lp-wear span{font-size:13px;}
    .lp-wear .pair{white-space:nowrap;display:inline-flex;align-items:baseline;gap:8px;}
    /* entourage */
    .lp-ent-sec-wrap{position:relative;overflow:hidden;}
    .lp-ent-bg{position:absolute;inset:0;background-size:cover;background-position:center 28%;opacity:.16;filter:grayscale(1) contrast(.9);}
    .lp-ent-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,var(--ivory) 0%,rgba(244,239,230,.35) 30%,rgba(244,239,230,.35) 70%,var(--ivory) 100%);}
    .lp-ent{max-width:820px;margin:0 auto;text-align:center;font-size:15px;line-height:1.9;}
    .lp-ent-title{font-family:'Bodoni Moda',serif;font-style:italic;font-size:22px;color:var(--forest);margin:0 0 6px;line-height:1.2;}
    .lp-ent-div{display:flex;align-items:center;justify-content:center;gap:14px;margin:6px 0 30px;}
    .lp-ent-div::before,.lp-ent-div::after{content:"";width:54px;height:1px;background:var(--moss);opacity:.5;}
    .lp-ent-block{margin-bottom:34px;}
    .lp-ent-pairs{display:grid;grid-template-columns:1fr 1fr;column-gap:28px;}
    .lp-ent-pairs .r,.lp-ent-col.r{text-align:right;}
    .lp-ent-pairs span:nth-child(even){text-align:left;}
    .lp-ent-row{display:grid;grid-template-columns:1fr 1fr;column-gap:28px;margin-bottom:30px;align-items:start;}
    .lp-ent-col{text-align:left;}
    .lp-ent-sec{display:flex;justify-content:center;gap:clamp(24px,5vw,64px);flex-wrap:wrap;}
    .lp-ent-sub{font-family:'Bodoni Moda',serif;font-style:italic;font-size:19px;color:var(--forest);margin-bottom:2px;}
    @media(max-width:560px){.lp-ent{font-size:14px;}.lp-ent-pairs{grid-template-columns:1fr;}.lp-ent-pairs .r{text-align:center;}.lp-ent-pairs span:nth-child(even){text-align:center;margin-bottom:6px;}.lp-ent-row{grid-template-columns:1fr;}.lp-ent-col,.lp-ent-col.r{text-align:center;margin-bottom:22px;}}
    /* the two of us */
    .lp-us{display:grid;grid-template-columns:1fr 1fr;gap:clamp(14px,2.5vw,28px);}
    .lp-us .lp-frame{aspect-ratio:4/5;}
    .lp-people{display:grid;grid-template-columns:1fr 1fr;gap:clamp(20px,4vw,44px);margin-top:36px;}
    .lp-trip{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(10px,1.6vw,18px);}
    .lp-trip .lp-frame{aspect-ratio:3/4;}
    @media(max-width:820px){.lp-trip{grid-template-columns:repeat(3,1fr);gap:8px;}.lp-trip .lp-frame{aspect-ratio:2/3;}}
    .lp-person h3{font-size:30px;margin:0 0 2px;}
    .lp-person .who{color:var(--ink2);font-size:13px;margin-bottom:10px;}
    .lp-person p{font-size:15px;}
    .lp-hash{margin-top:44px;padding:clamp(22px,3vw,34px);background:var(--forest);color:var(--ivory);display:flex;flex-wrap:wrap;gap:12px 32px;align-items:center;justify-content:space-between;}
    .lp-hash .h{font-family:'Bodoni Moda',serif;font-size:clamp(26px,3.6vw,44px);color:var(--amber);line-height:1;}
    .lp-hash p{margin:0;font-size:14px;opacity:.85;max-width:40ch;}
    /* hero nav */
    .lp-hero-nav{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:clamp(18px,3vw,28px);}
    .lp-hero-nav button{background:transparent;border:0;color:#fff;cursor:pointer;padding:4px;font-size:22px;line-height:1;opacity:.75;}
    .lp-hero-nav button:hover{opacity:1;}
    .lp-hero-nav .dot{width:7px;height:7px;border-radius:50%;background:#fff;opacity:.4;padding:0;}
    .lp-hero-nav .dot.on{opacity:1;background:var(--amber);}
    /* strip arrows + lightbox */
    .lp-strip-wrap{position:relative;}
    .lp-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:2;width:30px;height:30px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(30,25,21,.6);color:var(--ivory);font-size:18px;line-height:1;cursor:pointer;display:none;align-items:center;justify-content:center;backdrop-filter:blur(4px);opacity:.8;}
    .lp-arrow.l{left:clamp(8px,2vw,24px);} .lp-arrow.r{right:clamp(8px,2vw,24px);}
    .lp-arrow:hover{background:rgba(30,25,21,.95);border-color:var(--amber);opacity:1;}
    @media(min-width:821px){.lp-arrow{display:flex;}}
    .lp-strip .lp-frame{cursor:zoom-in;}
    .lp-lb{position:fixed;inset:0;z-index:1000;background:rgba(20,16,13,.94);display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));animation:lp-tick .25s ease-out;}
    .lp-lb img{max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 20px 60px rgba(0,0,0,.5);}
    .lp-lb-x{position:absolute;top:max(12px,env(safe-area-inset-top));right:16px;background:transparent;border:0;color:#fff;font-size:34px;line-height:1;cursor:pointer;opacity:.8;}
    .lp-lb-arrow{position:absolute;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font-size:30px;line-height:1;cursor:pointer;}
    .lp-lb-arrow.l{left:12px;} .lp-lb-arrow.r{right:12px;}
    .lp-lb-count{position:absolute;bottom:max(14px,env(safe-area-inset-bottom));left:0;right:0;text-align:center;color:#fff;opacity:.7;font-size:12px;letter-spacing:.16em;text-transform:uppercase;}
    /* gallery strip */
    .lp-strip{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:0 clamp(20px,5vw,56px) 12px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
    .lp-strip::-webkit-scrollbar{display:none;}
    .lp-strip .lp-frame{flex:0 0 auto;width:min(72vw,420px);aspect-ratio:3/4;scroll-snap-align:start;}
    .lp-strip .lp-frame.wide{width:min(88vw,640px);aspect-ratio:16/10;}
    /* rsvp */
    .lp-form{max-width:460px;}
    .lp-form label{display:block;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink2);margin:20px 0 6px;}
    .lp-form input,.lp-form textarea{width:100%;border:0;border-bottom:1px solid #C9BFAD;background:transparent;border-radius:0;padding:10px 0;font-size:16px;color:var(--ink);outline:none;}
    .lp-form input:focus,.lp-form textarea:focus{border-bottom-color:var(--forest);}
    .lp-form textarea{resize:vertical;min-height:70px;}
    .lp-choice{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;}
    .lp-choice button{padding:13px 10px;border:1px solid var(--forest);background:transparent;color:var(--forest);font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;cursor:pointer;border-radius:0;}
    .lp-choice button.on{background:var(--forest);color:#fff;}
    .lp-btn{display:inline-block;margin-top:26px;padding:14px 30px;background:var(--forest);color:#fff;border:0;font-size:12px;letter-spacing:.2em;text-transform:uppercase;font-weight:600;cursor:pointer;border-radius:0;}
    .lp-btn:hover{background:#213629;}
    .lp-field{width:100%;border-bottom:1px solid #C9BFAD;padding:10px 0;font-size:16px;color:var(--ink);}
    .lp-choice a.as-btn{display:flex;align-items:center;justify-content:center;padding:13px 10px;border:1px solid var(--forest);background:transparent;color:var(--forest);font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;opacity:1;border-bottom:1px solid var(--forest);}
    .lp-choice a.as-btn:hover{background:var(--forest);color:#fff;}
    .lp-phone{display:inline-block;font-family:'Bodoni Moda',serif;font-size:clamp(26px,3vw,34px);color:var(--forest);border-bottom:0;opacity:1;margin:6px 0 10px;letter-spacing:.01em;}
    .lp-rsvp-links{display:flex;gap:22px;}
    .lp-rsvp-links a{font-size:12px;letter-spacing:.2em;text-transform:uppercase;font-weight:600;color:var(--forest);border-bottom:1px solid var(--moss);padding-bottom:2px;opacity:1;}
    .lp-rsvp-links a:hover{border-bottom-color:var(--forest);}
    .lp a.lp-btn{color:#fff;opacity:1;border-bottom:0;}
    .lp a.lp-btn.amber{color:var(--wood);}
    .lp-btn.amber{background:var(--amber);color:var(--wood);}
    .lp-btn.amber:hover{background:#E4B56E;}
    .lp-choice button:focus-visible,.lp-btn:focus-visible,.lp-opt:focus-visible{outline:2px solid var(--amber);outline-offset:3px;}
    .lp-err{color:#9A4B3A;font-size:13px;margin-top:12px;}
    /* quiz */
    .lp-quiz{max-width:520px;border:1px solid rgba(255,255,255,.18);padding:clamp(22px,3vw,34px);}
    .lp-quiz .meta{display:flex;justify-content:space-between;font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:.7;margin-bottom:12px;}
    .lp-quiz .bar{height:1px;background:rgba(255,255,255,.18);margin-bottom:22px;}
    .lp-quiz .bar i{display:block;height:100%;background:var(--amber);transition:width .3s;}
    .lp-quiz .q{font-family:'Bodoni Moda',serif;font-size:clamp(22px,2.6vw,27px);line-height:1.3;margin:0 0 18px;}
    .lp-opt{display:block;width:100%;text-align:left;padding:12px 14px;margin-bottom:8px;background:transparent;border:1px solid rgba(255,255,255,.22);color:var(--ivory);font-size:15px;cursor:pointer;border-radius:0;}
    .lp-opt:hover:not(:disabled){border-color:var(--amber);}
    .lp-opt.right{background:var(--amber);border-color:var(--amber);color:var(--wood);font-weight:600;}
    .lp-opt.wrong{opacity:.35;text-decoration:line-through;}
    /* footer */
    .lp-foot{background:var(--forest);color:var(--ivory);padding:clamp(48px,7vw,88px) 0;text-align:center;}
    .lp-foot .big{font-family:'Bodoni Moda',serif;font-size:clamp(36px,5vw,64px);line-height:1;margin:10px auto 8px;text-align:center;}
    .lp-foot .big em{color:var(--amber);}
    .lp-foot .amp-center{display:grid;grid-template-columns:1fr auto 1fr;align-items:baseline;column-gap:.22em;max-width:none;}
    .lp-foot .amp-center .l{text-align:right;} .lp-foot .amp-center .r{text-align:left;}
    .lp-foot .tag{font-size:clamp(18px,2.4vw,26px);color:var(--amber);margin:8px 0 22px;}
    .lp-foot p{margin:0 auto;font-size:14px;opacity:.85;max-width:60ch;text-align:center;line-height:1.7;}
    .lp-foot .foot-line{margin:0 auto;}
    .lp-foot .tag{margin:6px 0 26px;}
    .lp-song{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:50;background:rgba(30,25,21,.9);color:var(--ivory);border:1px solid rgba(255,255,255,.2);padding:10px 16px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;cursor:pointer;border-radius:999px;display:flex;align-items:center;gap:10px;backdrop-filter:blur(6px);}
    .lp-song .dot{width:8px;height:8px;border-radius:50%;background:var(--amber);}
    .lp-song[aria-pressed="true"] .dot{animation:lp-pulse 1.4s infinite;}
    @media(max-width:820px){
      .lp-day,.lp-there,.lp-us,.lp-people{grid-template-columns:1fr;}
      .lp-hero{min-height:92svh;}
      .lp-hero .bg{background-position:var(--posm);}
      .lp-hero .in{padding-bottom:40px;}
      .lp-hero .names{font-size:clamp(52px,15vw,88px);}
      .lp-hero .when{font-size:14px;}
      .lp-hero .row{flex-direction:column;align-items:flex-start;}
      .lp-day .lp-frame.tall{aspect-ratio:4/3;}
    }
    /* ── motion ── */
    @keyframes lp-kb{from{transform:scale(1.08);}to{transform:scale(1);}}
    @keyframes lp-draw{to{stroke-dashoffset:0;}}
    @keyframes lp-rise{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:none;}}
    @keyframes lp-tick{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
    @keyframes lp-bloom{0%{transform:scale(.2) rotate(-40deg);opacity:0;}60%{transform:scale(1.08) rotate(4deg);opacity:1;}100%{transform:scale(1) rotate(0);}}
    @keyframes lp-pulse{0%,100%{box-shadow:0 0 0 0 rgba(122,92,67,.35);}50%{box-shadow:0 0 0 6px rgba(122,92,67,0);}}
    .lp .draw svg *{stroke-dasharray:1;stroke-dashoffset:1;animation:lp-draw 2.2s ease-out forwards;}
    .lp .draw svg *:nth-child(2n){animation-duration:2.8s;animation-delay:.3s;}
    .lp .draw svg *:nth-child(3n){animation-duration:3.2s;animation-delay:.7s;}
    .lp .draw svg *:nth-child(5n){animation-delay:1.1s;}
    .lp .draw svg *[fill]:not([fill="none"]){animation:lp-rise 1.2s 1.6s both;}
    .lp-hero .flower svg circle{stroke-dasharray:1;stroke-dashoffset:1;animation:lp-draw 1.4s ease-out forwards;}
    .lp-hero .flower svg circle:nth-child(2){animation-delay:.15s}.lp-hero .flower svg circle:nth-child(3){animation-delay:.3s}.lp-hero .flower svg circle:nth-child(4){animation-delay:.45s}.lp-hero .flower svg circle:nth-child(5){animation-delay:.7s}.lp-hero .flower svg circle:nth-child(6){animation:lp-rise .6s 1.1s both;}
    .lp .rise{animation:lp-rise 1s cubic-bezier(.2,.7,.2,1) both;}
    .lp .rise.d1{animation-delay:.4s}.lp .rise.d2{animation-delay:.7s}.lp .rise.d3{animation-delay:1s}.lp .rise.d4{animation-delay:1.2s}
    .lp-side .taal{transition:transform .1s linear;will-change:transform;}
    .lp-count span i{display:inline-block;font-style:normal;animation:lp-tick .35s ease-out;}
    .lp .rv{opacity:0;transform:translateY(22px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1);}
    .lp .rv.in{opacity:1;transform:none;}
    .lp-tl{border-left:0;position:relative;}
    .lp-tl::before{content:"";position:absolute;left:0;top:0;bottom:0;width:1px;background:var(--olive);transform:scaleY(0);transform-origin:top;transition:transform 1.6s cubic-bezier(.2,.7,.2,1);}
    .lp-tl.in::before{transform:scaleY(1);}
    .lp-tl li::before{transform:scale(0);transition:transform .4s cubic-bezier(.3,1.4,.5,1);}
    .lp-tl.in li::before{transform:scale(1);}
    .lp-tl li{transition:transform .3s;}
    .lp-tl li:hover{transform:translateX(4px);}
    .lp-tl li:hover::before{animation:lp-pulse 1.2s infinite;}
    .lp-toc a{transition:color .2s,padding-left .25s;}
    .lp-toc a.active{color:var(--olive2);padding-left:6px;}
    .lp-toc a.active::before{width:28px;opacity:1;}
    .lp-toc a::before{transition:width .25s;}
    .lp-choice button,.lp-btn,.lp-opt{transition:background .2s,color .2s,border-color .2s,transform .15s;}
    .lp-choice button:active,.lp-btn:active{transform:scale(.97);}
    .lp-opt.right{animation:lp-tick .35s ease-out;}
    .lp .bloom svg{animation:lp-bloom 1s cubic-bezier(.3,1.3,.5,1) both;}
    .lp-photo{transition:transform .5s;}
    .lp-person:hover .lp-photo{transform:translateY(-4px);}
    @media(prefers-reduced-motion:reduce){
      .lp *{transition:none!important;animation:none!important;}
      .lp .draw svg *,.lp-hero .flower svg circle{stroke-dashoffset:0!important;}
      .lp .rv{opacity:1;transform:none;}
      .lp-tl::before{transform:none;} .lp-tl li::before{transform:none;}
      html{scroll-behavior:auto;}
    }
    @media(max-width:768px){
      .dash-sidebar{display:none!important;}
      .dash-content{padding:14px 12px 80px!important;}
      .bottom-nav{display:flex!important;}
      .modal-wrap{align-items:flex-end!important;padding:0!important;}
      .modal-box{max-width:100%!important;width:100%!important;border-radius:16px 16px 0 0!important;max-height:92vh!important;}
      .dash-content div[style*="grid-template-columns: 1fr 1fr"],.dash-content div[style*="grid-template-columns: 3fr 2fr"],.dash-content div[style*="grid-template-columns: 1fr 260px"]{grid-template-columns:1fr!important;}
      .dash-content div[style*="grid-template-columns: repeat(4,1fr)"],.dash-content div[style*="grid-template-columns: repeat(3,1fr)"]{grid-template-columns:1fr 1fr!important;}
    }
  `;
  document.head.appendChild(s);
};

const WEDDING = new Date("2027-01-15T15:00:00+08:00");
const peso = n => `₱${Number(n || 0).toLocaleString("en-PH")}`;
const todayISO = () => new Date().toISOString().split("T")[0];
const WEDDING_ISO = "2027-01-15";
const daysUntil = iso => Math.ceil((new Date(iso + "T00:00:00") - new Date(todayISO() + "T00:00:00")) / 86400000);
const monthLabel = ym => new Date(ym + "-01T00:00:00").toLocaleString("en-PH", { month: "short", year: "numeric" });
const toISO = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const num = v => Number(v) || 0;
const newId = (idx = 0) => Date.now() + idx;

const ETYPES = ["Payment Due","Deadline","Meeting","Milestone","Fitting","Tasting","Personal"];
const MEALS = ["Beef","Fish","Chicken","Vegetarian"];
const RSVPS = ["Pending","Confirmed","Declined"];
const GROUPS = ["Bride","Groom","Mutual"];
const EC = {"Payment Due":"#C47A7A","Deadline":"#8A6FA8","Meeting":"#7A9EAD","Milestone":"#B8976A","Fitting":"#C4967A","Tasting":"#7A9E8A","Personal":"#7A6E68"};
const SC = {"Unpaid":"#C47A7A","Partial":"#C4A87A","Fully Paid":"#7A9E8A"};
const RC = {"Pending":"#C4A87A","Confirmed":"#7A9E8A","Declined":"#C47A7A"};

// If misc costs (crew meals / OOT) are already inside the contract price, they are tracked but not added again.
const computeSupplierTotal = (f) => {
  const base = num(f.baseAmount);
  if (f.inContract) return base;
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
  {id:1,category:"Church",estimated:32400},{id:2,category:"Wedding Rings",estimated:100000},
  {id:3,category:"Coordinator",estimated:180000},{id:4,category:"Venue",estimated:2000000},
  {id:5,category:"Hair and Make Up",estimated:105000},{id:6,category:"Photography",estimated:286000},
  {id:7,category:"Videography",estimated:91000},{id:8,category:"Styling and Flowers",estimated:259000},
  {id:9,category:"Entertainment / DJ / Strings",estimated:150000},{id:10,category:"Lights and Sounds",estimated:36000},
  {id:11,category:"Wedding Dress",estimated:149000},{id:12,category:"Barong",estimated:100000},
  {id:13,category:"Gown of Mothers",estimated:150000},{id:14,category:"Gown of Entourage",estimated:350000},
  {id:15,category:"Barong of Fathers",estimated:100000},{id:16,category:"Michelle Shoes",estimated:20000},
  {id:17,category:"Chicco Shoes",estimated:20000},{id:18,category:"Invites",estimated:20000},
  {id:19,category:"Souvenir",estimated:20000},{id:20,category:"Others",estimated:100000},
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

const downloadCSV = (filename, headers, rows) => {
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

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


/* ─── Excel import (Wedding Budget Planner.xlsx is the source of truth) ───── */
const xlDate = v => {
  if (!v) return "";
  if (v instanceof Date) return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,"0")}-${String(v.getDate()).padStart(2,"0")}`;
  if (typeof v === "number") { const d = XLSX.SSF.parse_date_code(v); return d ? `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}` : ""; }
  const s = String(v).trim(); const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0];
  const d = new Date(s); return isNaN(d) ? "" : xlDate(d);
};
const clean = v => (v == null ? "" : String(v).trim());
const rowsOf = (wb, name) => { const ws = wb.Sheets[name]; return ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) : null; };
const findHeader = (rows, mustHave) => rows.findIndex(r => r && r.some(c => clean(c).toLowerCase() === mustHave.toLowerCase()));
const colIdx = (hdr, label) => hdr.findIndex(c => clean(c).toLowerCase().startsWith(label.toLowerCase()));

const importFromExcel = (wb, prev) => {
  const errors = [];

  /* ── PaymentSchedule → suppliers + payment-due events ── */
  const ps = rowsOf(wb, "PaymentSchedule");
  if (!ps) throw new Error("Sheet 'PaymentSchedule' not found");
  const h = findHeader(ps, "Vendor Name");
  if (h < 0) throw new Error("PaymentSchedule: header row with 'Vendor Name' not found");
  const H = ps[h];
  const cV = colIdx(H, "Vendor Name"), cC = colIdx(H, "Category"), cD = colIdx(H, "Due Date"), cA = colIdx(H, "Amount"),
        cS = colIdx(H, "Status"), cT = colIdx(H, "Payment Type"), cM = colIdx(H, "Payment Method"), cP = colIdx(H, "Date Paid"), cN = colIdx(H, "Notes");

  const groups = {};
  ps.slice(h + 1).forEach((r, i) => {
    if (!r) return;
    const vendor = clean(r[cV]); if (!vendor) return;
    const category = clean(r[cC]) || "Others";
    const amount = num(r[cA]); if (!amount) { errors.push(`Row ${h + i + 2}: ${vendor} has no amount — skipped`); return; }
    const key = `${vendor.toLowerCase()}||${category.toLowerCase()}`;
    if (!groups[key]) groups[key] = { vendor, category, rows: [] };
    groups[key].rows.push({
      dueDate: xlDate(r[cD]), amount,
      paid: clean(r[cS]).toLowerCase() === "paid",
      type: clean(r[cT]), mode: clean(r[cM]), datePaid: xlDate(r[cP]), notes: clean(r[cN]),
    });
  });

  /* ── VendorList → misc costs (crew meals, OOT, in-contract flag) + optional contacts ── */
  const vendorInfo = {};
  const vl = rowsOf(wb, "VendorList");
  if (vl) {
    const vh = findHeader(vl, "Vendor Name");
    if (vh >= 0) {
      const VH = vl[vh];
      const vN = colIdx(VH, "Vendor Name"), vC = colIdx(VH, "Category"),
            vPax = colIdx(VH, "Crew Pax"), vRate = colIdx(VH, "Meal Rate"), vMeals = colIdx(VH, "Crew Meals"),
            vOOT = colIdx(VH, "OOT"), vIn = colIdx(VH, "In Contract"), vNotes = colIdx(VH, "Notes"),
            vP = colIdx(VH, "Contact Person"), vPh = colIdx(VH, "Phone"), vE = colIdx(VH, "Email");
      vl.slice(vh + 1).forEach(r => {
        const n = clean(r?.[vN]).toLowerCase(); if (!n) return;
        const cat = vC >= 0 ? clean(r[vC]).toLowerCase() : "";
        const pax = vPax >= 0 ? num(r[vPax]) : 0, rate = vRate >= 0 ? num(r[vRate]) : 0;
        const meals = vMeals >= 0 && num(r[vMeals]) ? num(r[vMeals]) : pax * rate;
        const info = {
          crewPax: pax, mealRate: rate, crewMeals: meals,
          ootFee: vOOT >= 0 ? num(r[vOOT]) : 0,
          inContract: vIn >= 0 ? /^y/i.test(clean(r[vIn])) : false,
          vendorNotes: vNotes >= 0 ? clean(r[vNotes]) : "",
          contactName: vP >= 0 ? clean(r[vP]) : "", contactPhone: vPh >= 0 ? clean(r[vPh]) : "", contactEmail: vE >= 0 ? clean(r[vE]) : "",
        };
        vendorInfo[`${n}||${cat}`] = vendorInfo[`${n}||${cat}`] || info;
        vendorInfo[n] = vendorInfo[n] || info;
      });
    }
  }

  const prevByKey = {};
  (prev.suppliers || []).forEach(s => { prevByKey[`${s.name.toLowerCase()}||${(s.category || "").toLowerCase()}`] = s; if (!prevByKey[s.name.toLowerCase()]) prevByKey[s.name.toLowerCase()] = s; });

  const suppliers = []; const payEvents = []; let idBase = Date.now();
  Object.values(groups).forEach(g => {
    g.rows.sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
    const old = prevByKey[`${g.vendor.toLowerCase()}||${g.category.toLowerCase()}`] || prevByKey[g.vendor.toLowerCase()] || {};
    const base = g.rows.reduce((a, r) => a + r.amount, 0);
    const paidRows = g.rows.filter(r => r.paid);
    const paid = paidRows.reduce((a, r) => a + r.amount, 0);
    const payments = paidRows.map(r => ({ date: r.datePaid || r.dueDate, amount: r.amount, note: [r.type, r.notes].filter(Boolean).join(" — "), mode: r.mode || "" }));
    const pending = g.rows.filter(r => !r.paid);
    const dp = g.rows.find(r => /deposit|dp|reservation/i.test(r.type));
    const vi = vendorInfo[`${g.vendor.toLowerCase()}||${g.category.toLowerCase()}`] || vendorInfo[g.vendor.toLowerCase()] || {};
    const s = {
      id: old.id || idBase++,
      name: g.vendor, category: g.category, baseAmount: base,
      hasDP: !!dp, dpAmount: dp ? dp.amount : "", dpDueDate: dp ? dp.dueDate : "", dpPaidDate: dp?.paid ? (dp.datePaid || dp.dueDate) : "",
      crewPax: vi.crewPax || 0, mealRate: vi.mealRate || 0,
      hasCrew: (vi.crewMeals || 0) > 0, crewMeals: vi.crewMeals || 0,
      hasOOT: (vi.ootFee || 0) > 0, ootFee: vi.ootFee || 0,
      inContract: !!vi.inContract,
      dueDate: pending.length ? pending[pending.length - 1].dueDate : (g.rows[g.rows.length - 1]?.dueDate || ""),
      notes: vi.vendorNotes || old.notes || "", payments, attachments: old.attachments || [],
      contactName: vi.contactName || old.contactName || "",
      contactPhone: vi.contactPhone || old.contactPhone || "",
      contactEmail: vi.contactEmail || old.contactEmail || "",
    };
    s.total = computeSupplierTotal(s); s.paid = paid;
    s.status = paid === 0 ? "Unpaid" : paid >= s.total ? "Fully Paid" : "Partial";
    suppliers.push(s);
    pending.forEach(r => { if (r.dueDate) payEvents.push({ id: idBase++, title: `${g.vendor} – ${r.type || "Payment"}`, date: r.dueDate, type: "Payment Due", amount: r.amount, supplier: g.vendor, notes: r.mode ? `${peso(r.amount)} (${r.mode})` : peso(r.amount) }); });
  });
  suppliers.sort((a, b) => a.name.localeCompare(b.name));

  /* ── BudgetSetup → categories + total cap ── */
  let budget = prev.budget, totalBudget = prev.totalBudget;
  const bs = rowsOf(wb, "BudgetSetup");
  if (bs) {
    const tRow = bs.find(r => r && r.some(c => /total wedding budget/i.test(clean(c))));
    if (tRow) { const n = tRow.find(c => typeof c === "number"); if (n) totalBudget = n; }
    const bh = findHeader(bs, "Category");
    if (bh >= 0) {
      const BH = bs[bh]; const bC = colIdx(BH, "Category"), bA = colIdx(BH, "Budget Amount");
      const prevBudget = {}; (prev.budget || []).forEach(b => prevBudget[b.category.toLowerCase()] = b);
      const cats = [];
      for (let i = bh + 1; i < bs.length; i++) {
        const r = bs[i]; if (!r) continue;
        const c = clean(r[bC]); if (!c) continue;
        if (/^total|^unallocated|^note/i.test(c)) break;
        cats.push({ id: prevBudget[c.toLowerCase()]?.id || idBase++, category: c, estimated: num(r[bA]) });
      }
      if (cats.length) budget = cats;
    }
  }

  /* ── Deadlines → calendar events (type "Deadline") ── */
  const dlEvents = [];
  const dl = rowsOf(wb, "Deadlines");
  if (dl) {
    const dh = findHeader(dl, "Task");
    if (dh >= 0) {
      const DH = dl[dh]; const dT = colIdx(DH, "Task"), dV = colIdx(DH, "Vendor"), dD = colIdx(DH, "Due Date"), dS = colIdx(DH, "Status"), dN = colIdx(DH, "Notes");
      dl.slice(dh + 1).forEach((r, i) => {
        const task = clean(r?.[dT]); if (!task) return;
        const date = xlDate(r[dD]);
        if (!date) { errors.push(`Deadlines row ${dh + i + 2}: "${task}" has no due date — skipped`); return; }
        const status = clean(r[dS]).toLowerCase();
        dlEvents.push({ id: idBase++, title: task, date, type: "Deadline", amount: 0, supplier: dV >= 0 ? clean(r[dV]) : "", notes: dN >= 0 ? clean(r[dN]) : "", done: /done|complete|paid|submitted/.test(status) });
      });
    }
  }

  const events = [...(prev.events || []).filter(e => e.type !== "Payment Due" && e.type !== "Deadline"), ...payEvents, ...dlEvents];
  return { suppliers, budget, events, totalBudget, errors, deadlineCount: dlEvents.length, summary: `${suppliers.length} suppliers · ${suppliers.filter(s => s.hasCrew || s.hasOOT).length} with crew/OOT · ${budget.length} budget categories · ${payEvents.length} payment-due events · ${dlEvents.length} deadlines` };
};

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
  <div className="modal-wrap" style={{ position: "fixed", inset: 0, background: "rgba(46,37,32,.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
    <div className="modal-box" style={{ background: "var(--wh)", borderRadius: 12, padding: 28, width: "100%", maxWidth: wide ? 680 : 460, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(46,37,32,.2)" }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 className="sf" style={{ fontSize: 22, fontWeight: 400 }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, color: "var(--m)", lineHeight: 1, padding: "0 4px", cursor: "pointer" }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

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

function Countdown() {
  const [t, setT] = useState(null);
  useEffect(() => {
    const tick = () => { const diff = Math.max(0, WEDDING - Date.now()); setT({ d: Math.floor(diff / 86400000), h: Math.floor(diff % 86400000 / 3600000), m: Math.floor(diff % 3600000 / 60000), s: Math.floor(diff % 60000 / 1000) }); };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);
  if (!t) return null;
  if (WEDDING - Date.now() <= 0 || window.__FORCE_AFTER__) return (
    <div className="lp-count lp-forever" aria-label="Married">
      <div className="inf"><InfinityMark width={78} stroke={1.3} /></div>
    </div>
  );
  return (
    <div className="lp-count" aria-label="Countdown to the wedding">
      {[["days", t.d], ["hrs", t.h], ["min", t.m], ["sec", t.s]].map(([l, v]) => <div key={l}><span><i key={v}>{String(v).padStart(2, "0")}</i></span><small>{l}</small></div>)}
    </div>
  );
}

const TaalSketch = ({ width = 400, color = "#C4967A" }) => (
  <svg viewBox="0 0 400 220" width={width} height={width * 220 / 400} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.82 }}>
    <path pathLength="1" d="M60 38 Q72 30 84 36 Q88 26 100 28 Q114 22 118 34 Q126 30 128 38" strokeWidth="1" opacity="0.4"/>
    <path pathLength="1" d="M280 28 Q292 20 308 24 Q316 16 330 20 Q344 18 348 28 Q356 24 360 32" strokeWidth="1" opacity="0.4"/>
    <path pathLength="1" d="M0 90 Q40 72 80 80 Q120 68 160 75 Q200 65 240 72 Q280 62 320 70 Q360 65 400 75 L400 95 L0 95 Z" strokeWidth="1.2" fill="rgba(196,150,122,.06)" opacity="0.7"/>
    <path pathLength="1" d="M30 130 Q100 118 200 122 Q300 118 370 130" strokeWidth="1.4"/>
    <path pathLength="1" d="M20 138 Q100 128 200 132 Q300 128 380 138" strokeWidth="0.8" opacity="0.5"/>
    <path pathLength="1" d="M40 146 Q120 138 200 140 Q280 138 360 146" strokeWidth="0.6" opacity="0.35"/>
    <path pathLength="1" d="M158 122 Q175 100 200 96 Q225 100 242 122" strokeWidth="1.6"/>
    <path pathLength="1" d="M178 104 Q190 98 200 97 Q210 98 222 104" strokeWidth="1.2"/>
    <ellipse pathLength="1" cx="200" cy="108" rx="12" ry="5" strokeWidth="1" opacity="0.7"/>
    <path pathLength="1" d="M0 165 Q50 142 110 155 Q160 145 200 150 Q240 145 290 155 Q340 145 400 160 L400 220 L0 220 Z" strokeWidth="1.6" fill="rgba(196,150,122,.07)"/>
    <path pathLength="1" d="M35 165 L35 152 M28 158 Q35 148 42 158" strokeWidth="1.1" opacity="0.6"/>
    <path pathLength="1" d="M55 162 L55 150 M48 156 Q55 146 62 156" strokeWidth="1.1" opacity="0.6"/>
    <path pathLength="1" d="M345 162 L345 150 M338 156 Q345 146 352 156" strokeWidth="1.1" opacity="0.6"/>
    <path pathLength="1" d="M365 165 L365 154 M358 159 Q365 150 372 159" strokeWidth="1.1" opacity="0.6"/>
  </svg>
);

const ChurchSketch = ({ width = 400, color = "#C4967A" }) => (
  <svg viewBox="0 0 400 280" width={width} height={width * 280 / 400} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.82 }}>
    <path d="M0 270 Q200 265 400 270" strokeWidth="1.2" opacity="0.4"/>
    <path d="M130 262 L270 262" strokeWidth="1.2"/><path d="M140 256 L260 256" strokeWidth="1.2"/><path d="M148 250 L252 250" strokeWidth="1.2"/>
    <rect x="148" y="130" width="104" height="120" strokeWidth="1.5"/>
    <path d="M140 130 L200 90 L260 130" strokeWidth="1.6"/>
    <path d="M200 78 L200 92 M194 84 L206 84" strokeWidth="1.4"/>
    <circle cx="200" cy="148" r="18" strokeWidth="1.3"/><circle cx="200" cy="148" r="10" strokeWidth="0.9"/><circle cx="200" cy="148" r="4" strokeWidth="0.9"/>
    <path d="M178 250 L178 200 Q178 185 200 185 Q222 185 222 200 L222 250" strokeWidth="1.5"/>
    <path d="M178 220 L222 220" strokeWidth="0.9"/><path d="M200 185 L200 250" strokeWidth="0.9"/>
    <rect x="60" y="140" width="60" height="130" strokeWidth="1.5"/>
    <path d="M60 140 L90 108 L120 140" strokeWidth="1.4"/>
    <path d="M90 95 L90 110 M84 101 L96 101" strokeWidth="1.4"/>
    <path d="M78 270 L78 240 Q78 232 90 232 Q102 232 102 240 L102 270" strokeWidth="1.2"/>
  </svg>
);

const InfinityMark = ({ width = 120, color = "#D9A55A", stroke = 1.4 }) => (
  <svg viewBox="0 0 120 56" width={width} height={width * 56 / 120} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" aria-hidden="true">
    <path pathLength="1" d="M60 28 C 48 8, 8 8, 8 28 C 8 48, 48 48, 60 28 C 72 8, 112 8, 112 28 C 112 48, 72 48, 60 28 Z" />
  </svg>
);

const FlowerLogo = ({ size = 80, color = "#C4967A" }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} fill="none" stroke={color} strokeWidth="1.4">
    <circle pathLength="1" cx="50" cy="34" r="18" /><circle pathLength="1" cx="50" cy="66" r="18" />
    <circle pathLength="1" cx="34" cy="50" r="18" /><circle pathLength="1" cx="66" cy="50" r="18" />
    <circle pathLength="1" cx="50" cy="50" r="7" /><circle pathLength="1" cx="50" cy="50" r="2.5" fill={color} />
  </svg>
);

/* ─── Site content: everything below is editable in public/site.json ─────── */
const SITE_DEFAULTS = {
  "guestCode": "mc",
  "guestPrompt": "We’re so glad you’re here.\nA little more of the day is waiting inside.\nEnter the word from your invitation to continue.",
  "hashtag": "#naCuaNaSiChicco",
  "date": "Friday, 15 January 2027",
  "venuesLine": "Our Lady of Lourdes and Antonio's, Tagaytay",
  "hero": [
    {
      "file": "bridge.jpg",
      "desktop": "center 60%",
      "mobile": "70% 62%"
    },
    {
      "file": "hero.jpg",
      "desktop": "center 32%",
      "mobile": "48% 30%"
    },
    {
      "file": "close.jpg",
      "desktop": "center 28%",
      "mobile": "52% 26%"
    },
    {
      "file": "lanai.jpg",
      "desktop": "center 72%",
      "mobile": "68% 72%"
    }
  ],
  "heroVideo": "",
  "dayHeading": "And it all begins\nwith",
  "dayHeadingEm": "“I do.”",
  "timeline": [
    {
      "time": "3:00",
      "ampm": "PM",
      "what": "Ceremony",
      "note": "God’s blessing, a lifetime of promises, a solemn “I do.”"
    },
    {
      "time": "4:30",
      "ampm": "PM",
      "what": "Photos at the Church",
      "note": "A little proof we all looked this good."
    },
    {
      "time": "5:00",
      "ampm": "PM",
      "what": "Cocktails at the Lanai",
      "note": "Her favorite place at his favorite time of day."
    },
    {
      "time": "6:30",
      "ampm": "PM",
      "what": "Dinner",
      "note": "Stories are shared. Glasses are raised."
    },
    {
      "time": "9:00",
      "ampm": "PM",
      "what": "The Night Goes On",
      "note": "We settle into the night."
    }
  ],
  "dayPhoto": "kiss.jpg",
  "therePhoto": "house.jpg",
  "therePhoto2": "wall.jpg",
  "thereHeading": "Meet us in",
  "thereHeadingEm": "Tagaytay",
  "thereNote": "Just far enough from the city to slow things down — an afternoon away, a familiar favorite, and two places we’d love to share with you.",
  "dressCode": {
    "gentlemen": "Barong Tagalog",
    "ladies": "Cocktail Attire",
    "note": "Kindly avoid black or white dresses."
  },
  "venues": [
    {
      "name": "Our Lady of Lourdes Parish",
      "when": "Ceremony, 3:00 PM",
      "address": "Silang Crossing East, Tagaytay City",
      "maps": "https://maps.google.com/?q=Our+Lady+of+Lourdes+Parish+Tagaytay"
    },
    {
      "name": "Antonio’s",
      "when": "Reception, from 5:00 PM",
      "address": "Purok 138, Barangay Neogan, Tagaytay City",
      "maps": "https://maps.google.com/?q=Antonio%27s+Restaurant+Tagaytay"
    }
  ],
  "chicco": {
    "photo": "chicco.jpg",
    "name": "Chicco",
    "who": "Manuel Angelo Gomez, the groom",
    "blurb": "A few lines about Chicco go here: what he's like at a table, what he cooks on a Sunday, what makes him laugh."
  },
  "michelle": {
    "photo": "michelle.jpg",
    "name": "Michelle",
    "who": "Michelle Cua, the bride",
    "blurb": "A few lines about Michelle: her warmth, the things she can't stop reading, the smile everyone mentions."
  },
  "togetherPhotos": [
    "laugh1.jpg",
    "laugh2.jpg",
    "laughbw.jpg"
  ],
  "hashtagBlurb": "Tag your photos and stories so we can find them all afterwards. Lulu the dog will be reviewing every one.",
  "entourage": {
    "bg": "ring.jpg",
    "heading": "Standing with",
    "headingEm": "us",
    "parents": {
      "groom": [
        "Mr. Manuel A. Gomez",
        "Mrs. Aida C. Gomez"
      ],
      "bride": [
        "Mr. John T. Cua",
        "Mrs. Lilian L. Cua"
      ]
    },
    "principal": [
      [
        "Mr. Gerardo C. Ablaza, Jr.",
        "Mrs. Ma. Lourdes L. Ablaza"
      ],
      [
        "Mr. Clemente A. Aurelio",
        "Mrs. Doris G. Aurelio"
      ],
      [
        "Mr. Alfonso L. Salcedo, Jr.",
        "Mrs. Clarabelle L. Salcedo"
      ],
      [
        "Mr. Antonio R. Samson",
        "Mrs. Lourdes K. Samson"
      ],
      [
        "Mr. James D. Chuaunsu",
        "Mrs. Alice D. Chuaunsu"
      ],
      [
        "Mr. Jose C. Jose",
        "Mrs. Adela P. Jose"
      ],
      [
        "Mr. Alexander G. Tan",
        "Mrs. Jocelyn E. Tan"
      ]
    ],
    "groups": [
      {
        "left": {
          "title": "Best Man",
          "names": [
            "Michelangelo K. Samson"
          ]
        },
        "right": {
          "title": "Maids of Honor",
          "names": [
            "Magdalene L. Ngo",
            "Charlene C. Siason"
          ]
        }
      },
      {
        "left": {
          "title": "Groomsmen",
          "names": [
            "Michael Stephen G. Aurelio",
            "Avelino P. Cruz III",
            "Alberto B. Gomez, Jr.",
            "Jaime Juan R. Paz III",
            "Pablito C. Tolosa"
          ]
        },
        "right": {
          "title": "Bridesmaids",
          "names": [
            "Ana Carmela C. Gomez",
            "Taskeen K. Lih",
            "Catherine Anne G. Aurelio",
            "Charmaine R. Go",
            "Sheryl L. Ang"
          ]
        }
      },
      {
        "left": {
          "title": "Junior Groomsmen",
          "names": [
            "John Colin C. Cua",
            "Kenzo Daniel C. Lin"
          ]
        },
        "right": {
          "title": "Junior Bridesmaids",
          "names": [
            "Lauren Isabelle C. Cua",
            "Kayla Rizza C. Lin"
          ]
        }
      }
    ],
    "secondary": [
      {
        "title": "Candle",
        "names": [
          "Wen-Szu Lin",
          "Karen C. Lin"
        ]
      },
      {
        "title": "Veil",
        "names": [
          "Laurence L. Cua",
          "Coleen C. Cua"
        ]
      },
      {
        "title": "Cord",
        "names": [
          "Julian L. Cua",
          "Steffi G. Cua"
        ]
      }
    ]
  },
  "video": {
    "youtube": "",
    "title": "",
    "caption": ""
  },
  "gallery": [
    {
      "file": "dogs.jpg"
    },
    {
      "file": "lattice.jpg"
    },
    {
      "file": "hug.jpg"
    },
    {
      "file": "fieldwide.jpg",
      "wide": true
    },
    {
      "file": "profiles.jpg"
    },
    {
      "file": "ringback.jpg"
    },
    {
      "file": "garden.jpg"
    },
    {
      "file": "heads.jpg"
    },
    {
      "file": "walk.jpg"
    }
  ],
  "galleryNote": "Swipe for more. Photos from the day will be gathered here afterwards.",
  "rsvpPhoto": "bouquet2.jpg",
  "rsvpMode": "message",
  "rsvpDeadline": "1 December 2026",
  "rsvpLine": "Kindly let us know by {date}, so we can make sure there’s a seat with your name on it.",
  "rsvpMessage": "Prefer to send us a message instead?\nRia Pascual of Bespoke Manila will be happy to assist.",
  "rsvpContact": {
    "name": "Ria Pascual",
    "phone": "+63 915 850 7644",
    "viber": true,
    "whatsapp": true
  },
  "song": {
    "file": "",
    "title": ""
  },
  "contact": "Questions? Message either of us or\nRia Pascual at Bespoke Manila, +63 915 850 7644",
  "spotify": {
    "url": "https://open.spotify.com/playlist/0NtPuMtvDFj8pZfPxue9z2",
    "title": "The soundtrack",
    "caption": "Songs that got us here, and a few we'll be dancing to."
  },
  "albumUrl": "",
  "albumNote": "Photo drop opens on the day."
};
const photoUrl = f => !f ? "" : (/^(https?:)?\/\//.test(f) || f.startsWith("data:")) ? f : (window.__PHOTO_MAP__?.[f] || `/photos/${f}`);
function useSiteConfig() {
  const [cfg, setCfg] = useState(window.__SITE__ ? { ...SITE_DEFAULTS, ...window.__SITE__ } : SITE_DEFAULTS);
  useEffect(() => {
    if (window.__SITE__) return;
    fetch(`/site.json?t=${Date.now()}`).then(r => r.ok ? r.json() : null).then(j => { if (j) setCfg({ ...SITE_DEFAULTS, ...j }); }).catch(() => {});
  }, []);
  /* chiccoandmichelle.com/photos → the album (printed on the QR cards) */
  useEffect(() => {
    if (!/^\/photos\/?$/.test(window.location.pathname)) return;
    if (cfg.albumUrl) { window.location.replace(cfg.albumUrl); }
    else if (cfg !== SITE_DEFAULTS || window.__SITE__) { window.history.replaceState(null, "", "/#share"); setTimeout(() => document.getElementById("share")?.scrollIntoView(), 300); }
  }, [cfg]);
  return cfg;
}
const spotifyEmbed = v => { if (!v) return null; const m = String(v).match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track|artist)\/([A-Za-z0-9]+)/) || String(v).match(/spotify:(playlist|album|track|artist):([A-Za-z0-9]+)/); return m ? { type: m[1], id: m[2] } : null; };
const ytId = v => { if (!v) return ""; const m = String(v).match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : (/^[\w-]{11}$/.test(v) ? v : ""); };

/* reveal-on-scroll + scrollspy */
function useReveal(dep) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".lp .rv:not(.in), .lp .lp-tl:not(.in)"));
    if (!("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("in")); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .15, rootMargin: "0px 0px -8% 0px" });
    els.forEach(e => io.observe(e)); return () => io.disconnect();
  }, [dep]);
}
function useScrollSpy(ids, setActive) {
  useEffect(() => {
    const secs = ids.map(id => document.getElementById(id)).filter(Boolean);
    if (!secs.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(es => { const v = es.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]; if (v) setActive(v.target.id); }, { threshold: [.25, .5, .75] });
    secs.forEach(s => io.observe(s)); return () => io.disconnect();
  }, []);
}
function useParallax(ref, factor = .06) {
  useEffect(() => {
    const el = ref.current; if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { el.style.transform = `translateY(${window.scrollY * factor}px)`; }); };
    window.addEventListener("scroll", onScroll, { passive: true }); return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
}

function Landing({ onEnter }) {
  const cfg = useSiteConfig();
  const HASHTAG = cfg.hashtag;
  const HERO_SHOTS = (cfg.hero || []).map(h => ({ src: photoUrl(h.file), pos: h.desktop || "center", mobile: h.mobile || h.desktop || "center" }));
  const [adminClicks, setAdminClicks] = useState(0);
  const heroRef = useRef(null);
  useParallax(heroRef, .25);
  const [heroIdx, setHeroIdx] = useState(() => Math.floor(Math.random() * 8));
  const heroPause = useRef(0);
  useEffect(() => { if (HERO_SHOTS.length < 2) return; const id = setInterval(() => { if (Date.now() > heroPause.current) setHeroIdx(i => i + 1); }, 8000); return () => clearInterval(id); }, [HERO_SHOTS.length]);
  const heroOn = HERO_SHOTS.length ? ((heroIdx % HERO_SHOTS.length) + HERO_SHOTS.length) % HERO_SHOTS.length : 0;
  const heroGo = n => { heroPause.current = Date.now() + 20000; setHeroIdx(n); };
  const [lb, setLb] = useState(-1);   /* lightbox index into gallery */
  const gal = cfg.gallery || [];
  useEffect(() => { if (lb < 0) return; const k = e => { if (e.key === "Escape") setLb(-1); if (e.key === "ArrowRight") setLb(i => (i + 1) % gal.length); if (e.key === "ArrowLeft") setLb(i => (i - 1 + gal.length) % gal.length); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [lb, gal.length]);
  const stripRef = useRef(null);
  const codeOk = s => !cfg.guestCode || String(s || "").trim().toLowerCase() === String(cfg.guestCode).trim().toLowerCase();
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => { try { const q = new URLSearchParams(window.location.search).get("code"); if (q && codeOk(q)) setUnlocked(true); } catch {} }, [cfg.guestCode]);
  const [codeIn, setCodeIn] = useState(""); const [codeErr, setCodeErr] = useState(false);
  const tryCode = () => { if (codeOk(codeIn)) { setUnlocked(true); setTimeout(() => document.getElementById("day")?.scrollIntoView({ behavior: "smooth" }), 150); } else { setCodeErr(true); } };
  const gated = !!cfg.guestCode && !unlocked;
  useReveal(gated);
  const stripScroll = dir => { const el = stripRef.current; if (!el) return; const card = el.querySelector(".lp-frame"); el.scrollBy({ left: dir * ((card?.getBoundingClientRect().width || 300) + 14), behavior: "smooth" }); };
  const yt = ytId(cfg.video?.youtube);
  const [playing, setPlaying] = useState(false); const audioRef = useRef(null);
  const toggleSong = () => { const a = audioRef.current; if (!a) return; if (a.paused) { a.play().then(() => setPlaying(true)).catch(() => {}); } else { a.pause(); setPlaying(false); } };
  const [rsvpName, setRsvpName] = useState("");
  const [rsvpAttending, setRsvpAttending] = useState(null);
  const [rsvpNote, setRsvpNote] = useState("");
  const [rsvpDiet, setRsvpDiet] = useState("");
  const [rsvpSent, setRsvpSent] = useState(false);
  const [rsvpError, setRsvpError] = useState("");
  const [rsvpHp, setRsvpHp] = useState("");
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizAns, setQuizAns] = useState(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  const handleLogoClick = () => { const n = adminClicks + 1; setAdminClicks(n); if (n >= 5) { setAdminClicks(0); onEnter(); } };
  const handleRsvp = async () => {
    if (!rsvpName.trim()) { setRsvpError("Add your name so we know who's replying."); return; }
    if (rsvpAttending === null) { setRsvpError("Let us know whether you can make it."); return; }
    if (rsvpHp) { setRsvpSent(true); return; } /* honeypot filled → bot; pretend success */
    const { error } = await sb.rpc("submit_rsvp", { p_name: rsvpName.trim(), p_attending: rsvpAttending, p_note: rsvpNote.trim(), p_diet: rsvpDiet.trim() });
    if (error) { setRsvpError("Something went wrong sending that. Please try again, or message us directly."); return; }
    setRsvpSent(true);
  };
  const quiz = [
    { q: "Where did Chicco and Michelle first meet?", opts: ["At a coffee shop", "Through mutual friends", "At work", "At a concert"], ans: 1 },
    { q: "What is Chicco's favourite thing to cook?", opts: ["Pasta", "Barbecue", "Sinigang", "Breakfast"], ans: 2 },
    { q: "What does Michelle do when she's stressed?", opts: ["Retail therapy", "Binge a K-drama", "Go for a run", "Call her mom"], ans: 1 },
    { q: "How long have they been together?", opts: ["2 years", "4 years", "6 years", "8 years"], ans: 2 },
    { q: "What is their dog's name?", opts: ["Coco", "Lulu", "Mocha", "Biscuit"], ans: 1 },
  ];
  const handleQuizAns = i => { if (quizAns !== null) return; setQuizAns(i); if (i === quiz[quizIdx].ans) setQuizScore(s => s + 1); };
  const nextQuiz = () => { if (quizIdx + 1 >= quiz.length) setQuizDone(true); else { setQuizIdx(q => q + 1); setQuizAns(null); } };

  return (
    <div className="lp">
      {/* Hero: the bridge */}
      <header className="lp-hero">
        <div className="bgwrap" ref={heroRef}>
          {cfg.heroVideo
            ? <video className="bg on" src={photoUrl(cfg.heroVideo)} autoPlay muted loop playsInline poster={HERO_SHOTS[0]?.src} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
            : HERO_SHOTS.map((s, i) => <div key={s.src} className={"bg" + (i === heroOn ? " on" : "")} style={{ backgroundImage: `url(${s.src})`, "--pos": s.pos, "--posm": s.mobile }} />)}
        </div>
        <div className="veil" />
        <div className="flower" onClick={handleLogoClick} aria-hidden="true"><FlowerLogo size={40} color="#FFFFFF" /></div>
        <div className="in">
          <div className="small rise d1">Together with their families</div>
          <h1 className="names rise d2">Chicco<em>&amp;</em>Michelle</h1>
          <div className="row">
            <p className="when rise d3"><b>{cfg.date}</b>{cfg.venuesLine}<span className="tag">{HASHTAG}</span></p>
            <div className="rise d4"><Countdown /></div>
          </div>
          {HERO_SHOTS.length > 1 && !cfg.heroVideo && (
            <div className="lp-hero-nav rise d4" aria-label="Choose photo">
              <button onClick={() => heroGo(heroIdx - 1)} aria-label="Previous photo">‹</button>
              {HERO_SHOTS.map((_, i) => <button key={i} className={"dot" + (i === heroOn ? " on" : "")} onClick={() => heroGo(i)} aria-label={`Photo ${i + 1}`} />)}
              <button onClick={() => heroGo(heroIdx + 1)} aria-label="Next photo">›</button>
            </div>
          )}
        </div>
      </header>

      {gated && (
        <section className="lp-sec light" id="gate">
          <div className="wrap">
            <div className="lp-form" style={{ maxWidth: 420 }}>
              <div className="small">For our guests</div>
              <p style={{ color: "var(--ink2)", fontSize: 15, marginTop: 10, lineHeight: 1.8 }}>{String(cfg.guestPrompt || "").split("\n").map((l, i, arr) => <React.Fragment key={i}>{l}{i < arr.length - 1 && <br />}</React.Fragment>)}</p>
              <label htmlFor="guest-code">The word on your invitation</label>
              <input id="guest-code" value={codeIn} onChange={e => { setCodeIn(e.target.value); setCodeErr(false); }} onKeyDown={e => e.key === "Enter" && tryCode()} autoComplete="off" autoCapitalize="none" placeholder="" />
              {codeErr && <div className="lp-err">That's not it. Check the invitation and try again.</div>}
              <button className="lp-btn" onClick={tryCode}>Open</button>
            </div>
          </div>
        </section>
      )}
      {!gated && <>
      {/* The day: candlelight */}
      <section className="lp-sec dark" id="day">
        <div className="wrap lp-day">
          <div>
            <div className="small rv">The day</div>
            <h2 className="rv" style={{ transitionDelay: ".1s" }}>{String(cfg.dayHeading || "").split("\n").map((l, i, arr) => <React.Fragment key={i}>{l}{i < arr.length - 1 && <br />}</React.Fragment>)} <em>{cfg.dayHeadingEm}</em></h2>
            <ol className="lp-tl">
              {(cfg.timeline || []).map((t, i) => <li key={i}><span className="t">{t.time}{t.ampm && <small>{t.ampm}</small>}</span><span className="w">{t.what}</span>{t.note && <span className="n">{String(t.note).split("\n").map((l, j, arr) => <React.Fragment key={j}>{l}{j < arr.length - 1 && <br />}</React.Fragment>)}</span>}</li>)}
            </ol>
          </div>
          <div className="lp-frame tall rv" style={{ transitionDelay: ".2s" }}><img src={photoUrl(cfg.dayPhoto)} alt="" loading="lazy" /></div>
        </div>
      </section>

      {/* Getting there */}
      <section className="lp-sec sand light" id="there">
        <div className="wrap">
          <div className="lp-frame wide rv" style={{ marginBottom: 44 }}><img src={photoUrl(cfg.therePhoto)} alt="" loading="lazy" /></div>
          <div className="lp-there">
            <div>
              <div className="small rv">Getting there</div>
              <h2 className="rv" style={{ transitionDelay: ".1s" }}>{cfg.thereHeading} <em>{cfg.thereHeadingEm}</em></h2>
              <div className="lp-note rv" style={{ transitionDelay: ".2s" }}>{cfg.thereNote}</div>
              {cfg.therePhoto2 && <div className="lp-frame rv there-photo" style={{ transitionDelay: ".3s", marginTop: 32 }}><img src={photoUrl(cfg.therePhoto2)} alt="" loading="lazy" /></div>}
            </div>
            <div className="rv" style={{ transitionDelay: ".2s" }}>
              {(cfg.venues || []).map((v, i) => (
                <div className="lp-venue" key={i}>
                  <h3>{v.name}</h3>
                  <div className="where">{v.when}</div>
                  {v.address && <p>{v.address}</p>}
                  {v.maps && <a href={v.maps} target="_blank" rel="noopener noreferrer">Open in Maps</a>}
                </div>
              ))}
              <div className="lp-venue">
                <h3>Dress code</h3>
                <div className="where">What to wear</div>
                {typeof cfg.dressCode === "string" ? <div className="lp-wear"><b>{cfg.dressCode}</b></div> : (
                  <>
                    <div className="lp-wear"><span className="pair"><b>{cfg.dressCode?.gentlemen}</b> <span style={{ color: "var(--ink2)" }}>for the gentlemen</span></span><span className="pair"><b>{cfg.dressCode?.ladies}</b> <span style={{ color: "var(--ink2)" }}>for the ladies</span></span></div>
                    {cfg.dressCode?.note && <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 8 }}>{cfg.dressCode.note}</div>}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RSVP */}
      <section className="lp-sec light" id="rsvp">
        <div className="wrap lp-there" style={{ alignItems: "center" }}>
          <div>
          <div className="small rv">Kindly reply</div>
          <h2 className="rv" style={{ transitionDelay: ".1s" }}>Will you <em>join us?</em></h2>
          {cfg.rsvpMode === "message" ? (() => { const c = cfg.rsvpContact || {}; const digits = String(c.phone || "").replace(/\D/g, ""); return (
            <div className="lp-form rv" style={{ transitionDelay: ".2s" }}>
              <p style={{ color: "var(--ink2)", fontSize: 15 }}>{String(cfg.rsvpLine || "").replace("{date}", cfg.rsvpDeadline || "")}</p>
              <label>Reply by</label>
              <div className="lp-field">{cfg.rsvpDeadline}</div>
              <label>Send a message to</label>
              <div className="lp-field">{c.name}{c.org ? `, ${c.org}` : ", Bespoke Manila"}</div>
              <label>Mobile</label>
              <div className="lp-field"><a href={`tel:+${digits}`} style={{ border: 0, opacity: 1, color: "var(--ink)" }}>{c.phone}</a></div>
              <label>Message on</label>
              <div className="lp-choice">
                {c.viber && <a className="as-btn" href={`viber://chat?number=%2B${digits}`}>Viber</a>}
                {c.whatsapp && <a className="as-btn" href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
              </div>
            </div>
          ); })() : rsvpSent ? (
            <div className="lp-form">
              <div className="bloom" style={{ marginBottom: 14 }}><FlowerLogo size={48} color="#2C4536" /></div>
              <p className="serif" style={{ fontSize: 28 }}>Thank you, {rsvpName}.</p>
              <p>{rsvpAttending ? "We can't wait to celebrate with you." : "We'll miss you, and we're grateful you let us know."}</p>
            </div>
          ) : (
            <div className="lp-form rv" style={{ transitionDelay: ".2s" }}>
              <p style={{ color: "var(--ink2)", fontSize: 15 }}>{String(cfg.rsvpLine || "").replace("{date}", cfg.rsvpDeadline || "")}</p>
              <input type="text" value={rsvpHp} onChange={e => setRsvpHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
              <label htmlFor="rsvp-name">Your name</label>
              <input id="rsvp-name" value={rsvpName} onChange={e => { setRsvpName(e.target.value); setRsvpError(""); }} placeholder="First and last name" autoComplete="name" />
              <label>Will you be there?</label>
              <div className="lp-choice">
                <button className={rsvpAttending === true ? "on" : ""} onClick={() => { setRsvpAttending(true); setRsvpError(""); }}>Joyfully accepts</button>
                <button className={rsvpAttending === false ? "on" : ""} onClick={() => { setRsvpAttending(false); setRsvpError(""); }}>Regretfully declines</button>
              </div>
              <label htmlFor="rsvp-note">A note for us (optional)</label>
              <textarea id="rsvp-note" value={rsvpNote} onChange={e => setRsvpNote(e.target.value)} placeholder="Well wishes, or anything you’d like us to know" style={{ minHeight: 56 }} />
              <label htmlFor="rsvp-diet">Dietary needs</label>
              <input id="rsvp-diet" value={rsvpDiet} onChange={e => setRsvpDiet(e.target.value)} placeholder="Allergies, vegetarian, halal, none" />
              {rsvpError && <div className="lp-err">{rsvpError}</div>}
              <button className="lp-btn" onClick={handleRsvp}>Send reply</button>
              {cfg.rsvpAlt && <p style={{ fontSize: 13, color: "var(--ink2)", marginTop: 22 }}>{cfg.rsvpAlt}</p>}
            </div>
          )}
          </div>
          <div className="lp-frame rv" style={{ aspectRatio: "4/3", transitionDelay: ".2s" }}><img src={photoUrl(cfg.rsvpPhoto)} alt="" loading="lazy" /></div>
        </div>
      </section>

      {/* The two of us */}
      <section className="lp-sec sand light" id="us">
        <div className="wrap">
          <div className="small rv">Our story</div>
          <h2 className="rv" style={{ transitionDelay: ".1s" }}>The <em>two</em> of us</h2>
          <div className="lp-people" style={{ marginTop: 0 }}>
            <div className="lp-person rv">
              <div className="lp-frame" style={{ aspectRatio: "4/5", marginBottom: 18 }}><img src={photoUrl(cfg.chicco?.photo)} alt={cfg.chicco?.name} loading="lazy" /></div>
              <h3>{cfg.chicco?.name}</h3><div className="who">{cfg.chicco?.who}</div>
              <p>{cfg.chicco?.blurb}</p>
            </div>
            <div className="lp-person rv" style={{ transitionDelay: ".15s" }}>
              <div className="lp-frame" style={{ aspectRatio: "4/5", marginBottom: 18 }}><img src={photoUrl(cfg.michelle?.photo)} alt={cfg.michelle?.name} loading="lazy" /></div>
              <h3>{cfg.michelle?.name}</h3><div className="who">{cfg.michelle?.who}</div>
              <p>{cfg.michelle?.blurb}</p>
            </div>
          </div>
          {(() => { const arr = Array.isArray(cfg.togetherPhotos) ? cfg.togetherPhotos : (cfg.togetherPhoto ? [cfg.togetherPhoto] : []); if (!arr.length) return null;
  return arr.length === 1
    ? <div className="lp-frame rv" style={{ aspectRatio: "3/2", marginTop: 36 }}><img src={photoUrl(arr[0])} alt="" loading="lazy" style={{ objectPosition: "center 30%" }} /></div>
    : <div className="lp-trip" style={{ marginTop: 36 }}>{arr.map((f, i) => <div key={i} className="lp-frame rv" style={{ transitionDelay: `${.1 * i}s` }}><img src={photoUrl(f)} alt="" loading="lazy" style={{ objectPosition: "center 35%" }} /></div>)}</div>; })()}
          <div className="lp-hash rv" id="share">
            <div><div className="small">Share the day</div><div className="h tag">{HASHTAG}</div></div>
            <div>
              <p>{cfg.hashtagBlurb}</p>
              {cfg.albumUrl
                ? <a className="lp-btn amber" href={cfg.albumUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: 14 }}>Add your photos</a>
                : cfg.albumNote && <p style={{ marginTop: 10, fontSize: 13, opacity: .7 }}>{cfg.albumNote}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* Entourage */}
      {cfg.entourage && (
        <section className="lp-sec light lp-ent-sec-wrap" id="entourage">
          {cfg.entourage.bg && <div className="lp-ent-bg" style={{ backgroundImage: `url(${photoUrl(cfg.entourage.bg)})` }} aria-hidden="true" />}
          <div className="wrap" style={{ position: "relative" }}>
            <div className="small rv">The entourage</div>
            <h2 className="rv" style={{ transitionDelay: ".1s" }}>{cfg.entourage.heading} <em>{cfg.entourage.headingEm}</em></h2>
            <div className="lp-ent">
              {cfg.entourage.parents && (<>
                <div className="lp-ent-row rv" style={{ marginBottom: 6 }}>
                  <div className="lp-ent-col r"><div className="lp-ent-title">Parents of the Groom</div>{(cfg.entourage.parents.groom || []).map((n, j) => <div key={j}>{n}</div>)}</div>
                  <div className="lp-ent-col"><div className="lp-ent-title">Parents of the Bride</div>{(cfg.entourage.parents.bride || []).map((n, j) => <div key={j}>{n}</div>)}</div>
                </div>
                <div className="lp-ent-div rv" aria-hidden="true"><FlowerLogo size={18} color="#7D9470" /></div>
              </>)}
              {cfg.entourage.principal?.length > 0 && (
                <div className="lp-ent-block rv">
                  <div className="lp-ent-title">Principal Sponsors</div>
                  <div className="lp-ent-pairs">
                    {cfg.entourage.principal.map((p, i) => <React.Fragment key={i}><span className="r">{p[0]}</span><span>{p[1]}</span></React.Fragment>)}
                  </div>
                </div>
              )}
              <div className="lp-ent-div rv" aria-hidden="true"><FlowerLogo size={18} color="#7D9470" /></div>
              {(cfg.entourage.groups || []).map((g, i) => (
                <div className="lp-ent-row rv" key={i} style={{ transitionDelay: `${.05 * i}s` }}>
                  <div className="lp-ent-col r"><div className="lp-ent-title">{g.left?.title}</div>{(g.left?.names || []).map((n, j) => <div key={j}>{n}</div>)}</div>
                  <div className="lp-ent-col"><div className="lp-ent-title">{g.right?.title}</div>{(g.right?.names || []).map((n, j) => <div key={j}>{n}</div>)}</div>
                </div>
              ))}
              {cfg.entourage.secondary?.length > 0 && (<>
                <div className="lp-ent-div rv" aria-hidden="true"><FlowerLogo size={18} color="#7D9470" /></div>
                <div className="lp-ent-block rv">
                  <div className="lp-ent-title">Secondary Sponsors</div>
                  <div className="lp-ent-sec">
                    {cfg.entourage.secondary.map((s, i) => <div key={i}><div className="lp-ent-sub">{s.title}</div>{s.names.map((n, j) => <div key={j}>{n}</div>)}</div>)}
                  </div>
                </div>
              </>)}
            </div>
          </div>
        </section>
      )}

      {/* Gallery strip */}
      <section className="lp-sec dark" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <div className="wrap"><div className="small rv">Before the big day</div><h2 className="rv" style={{ transitionDelay: ".1s" }}>A few from the <em>prenup</em></h2></div>
        <div className="lp-strip-wrap">
          <button className="lp-arrow l" onClick={() => stripScroll(-1)} aria-label="Scroll left">‹</button>
          <div className="lp-strip" ref={stripRef}>
            {gal.map((g, i) => <div key={i} className={"lp-frame" + (g.wide ? " wide" : "")} onClick={() => setLb(i)} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && setLb(i)}><img src={photoUrl(g.file)} alt={g.caption || ""} loading="lazy" />{g.caption && <span className="cap">{g.caption}</span>}</div>)}
          </div>
          <button className="lp-arrow r" onClick={() => stripScroll(1)} aria-label="Scroll right">›</button>
        </div>
        {lb >= 0 && gal[lb] && (
          <div className="lp-lb" onClick={() => setLb(-1)} role="dialog" aria-modal="true">
            <button className="lp-lb-x" onClick={() => setLb(-1)} aria-label="Close">×</button>
            <button className="lp-lb-arrow l" onClick={e => { e.stopPropagation(); setLb((lb - 1 + gal.length) % gal.length); }} aria-label="Previous">‹</button>
            <img src={photoUrl(gal[lb].file)} alt={gal[lb].caption || ""} onClick={e => e.stopPropagation()} />
            <button className="lp-lb-arrow r" onClick={e => { e.stopPropagation(); setLb((lb + 1) % gal.length); }} aria-label="Next">›</button>
            <div className="lp-lb-count">{lb + 1} / {gal.length}{gal[lb].caption ? ` · ${gal[lb].caption}` : ""}</div>
          </div>
        )}
        <div className="wrap"><p style={{ fontSize: 13, opacity: .6, marginTop: 18 }}>{cfg.galleryNote} {HASHTAG}</p></div>
      </section>

      {/* Video (shows only when site.json has a YouTube link) */}
      {yt && (
        <section className="lp-sec light" id="film">
          <div className="wrap">
            <div className="small rv">{cfg.video?.title ? "Watch" : "Film"}</div>
            <h2 className="rv" style={{ transitionDelay: ".1s" }}>{cfg.video?.title || <>A short <em>film</em></>}</h2>
            <div className="lp-frame rv" style={{ aspectRatio: "16/9", transitionDelay: ".2s", background: "#000" }}>
              <iframe src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0&modestbranding=1`} title={cfg.video?.title || "Film"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen style={{ width: "100%", height: "100%", border: 0, display: "block" }} />
            </div>
            {cfg.video?.caption && <p style={{ fontSize: 14, color: "var(--ink2)", marginTop: 14 }}>{cfg.video.caption}</p>}
          </div>
        </section>
      )}

      {/* Soundtrack (shows only when site.json has a Spotify link) */}
      {(() => { const sp = spotifyEmbed(cfg.spotify?.url); if (!sp) return null; const tall = sp.type !== "track"; return (
        <section className="lp-sec sand light" id="music">
          <div className="wrap">
            <div className="small rv">Listen</div>
            <h2 className="rv" style={{ transitionDelay: ".1s" }}>{cfg.spotify?.title || <>The <em>soundtrack</em></>}</h2>
            {cfg.spotify?.caption && <p className="rv" style={{ color: "var(--ink2)", fontSize: 15, transitionDelay: ".15s" }}>{cfg.spotify.caption}</p>}
            <div className="rv" style={{ transitionDelay: ".2s", maxWidth: 720 }}>
              <iframe src={`https://open.spotify.com/embed/${sp.type}/${sp.id}?utm_source=generator&theme=0`} width="100%" height={tall ? 380 : 152} frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Spotify" style={{ borderRadius: 12, display: "block" }} />
            </div>
          </div>
        </section>
      ); })()}

      {/* Quiz */}
      <section className="lp-sec dark" id="quiz">
        <div className="wrap">
          <div className="small rv">Before you come</div>
          <h2 className="rv" style={{ transitionDelay: ".1s" }}>How well do you <em>know us?</em></h2>
          <div className="lp-quiz rv" style={{ transitionDelay: ".2s" }}>
            {quizDone ? (
              <div>
                <p className="q">{quizScore >= 4 ? "You really do know us." : quizScore >= 2 ? "Not bad at all." : "We'll fill you in at the wedding."}</p>
                <p style={{ opacity: .7, fontSize: 14 }}>{quizScore} of {quiz.length} correct</p>
                <button className="lp-btn amber" onClick={() => { setQuizIdx(0); setQuizAns(null); setQuizScore(0); setQuizDone(false); }}>Play again</button>
              </div>
            ) : (
              <div>
                <div className="meta"><span>Question {quizIdx + 1} of {quiz.length}</span><span>{quizScore} right</span></div>
                <div className="bar"><i style={{ width: `${quizIdx / quiz.length * 100}%` }} /></div>
                <p className="q">{quiz[quizIdx].q}</p>
                {quiz[quizIdx].opts.map((opt, i) => {
                  let cls = "lp-opt";
                  if (quizAns !== null) { if (i === quiz[quizIdx].ans) cls += " right"; else if (i === quizAns) cls += " wrong"; }
                  return <button key={i} className={cls} onClick={() => handleQuizAns(i)} disabled={quizAns !== null}>{opt}</button>;
                })}
                {quizAns !== null && <button className="lp-btn amber" onClick={nextQuiz}>{quizIdx + 1 >= quiz.length ? "See my score" : "Next question"}</button>}
              </div>
            )}
          </div>
        </div>
      </section>

      </>}
      <footer className="lp-foot">
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}><FlowerLogo size={30} color="#D9A55A" /></div>
          <p className="big amp-center"><span className="l">Chicco</span><em>&amp;</em><span className="r">Michelle</span></p>
          <div className="tag">{HASHTAG}</div>
          <p className="foot-line">{cfg.date}</p>
          <p className="foot-line">{cfg.venuesLine}</p>
          <p className="foot-line" style={{ marginTop: 22 }}>{String(cfg.contact || "").split("\n").map((l, i, arr) => <React.Fragment key={i}>{l}{i < arr.length - 1 && <br />}</React.Fragment>)}</p>
        </div>
      </footer>
      {cfg.song?.file && (
        <>
          <audio ref={audioRef} src={photoUrl(cfg.song.file)} loop preload="none" />
          <button className="lp-song" onClick={toggleSong} aria-pressed={playing} aria-label={playing ? "Pause music" : "Play music"}>
            <span className="dot" />{playing ? "Pause" : "Play"}{cfg.song.title ? ` · ${cfg.song.title}` : ""}
          </button>
        </>
      )}
    </div>
  );
}

function Gate({ onOk, onBack }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const go = async () => {
    if (!email || !pw) { setErr("Enter your email and password."); return; }
    setBusy(true); setErr("");
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) { setErr(error.message === "Invalid login credentials" ? "That email or password isn't right." : error.message); setShake(true); setTimeout(() => setShake(false), 500); return; }
    onOk();
  };
  return (
    <div style={{ minHeight: "100vh", background: "var(--cr)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="fade" style={{ background: "var(--wh)", borderRadius: 12, padding: "44px 38px", width: 360, maxWidth: "100%", boxShadow: "0 8px 40px rgba(46,37,32,.1)", textAlign: "center", animation: shake ? "shake .5s" : undefined }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><DogSketch /></div>
        <h2 className="sf" style={{ fontSize: 26, fontWeight: 400, marginBottom: 6 }}>Private Dashboard</h2>
        <p style={{ fontSize: 13, color: "var(--m)", marginBottom: 26 }}>Chicco &amp; Michelle only</p>
        <input type="email" placeholder="Email" value={email} autoComplete="username" onChange={e => { setEmail(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && go()} style={{ fontSize: 14, marginBottom: 8 }} />
        <input type="password" placeholder="Password" value={pw} autoComplete="current-password" onChange={e => { setPw(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && go()} style={{ fontSize: 14, marginBottom: 8 }} />
        {err && <p style={{ fontSize: 12, color: "var(--d)", margin: "6px 0" }}>{err}</p>}
        <button onClick={go} disabled={busy} style={{ width: "100%", background: "var(--r)", color: "var(--wh)", border: "none", padding: 12, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", borderRadius: 6, marginTop: 6, cursor: "pointer", opacity: busy ? .6 : 1 }}>{busy ? "Signing in…" : "Sign in"}</button>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--m)", fontSize: 12, marginTop: 16, cursor: "pointer" }}>← Back to the invitation</button>
      </div>
    </div>
  );
}

function SupplierForm({ form, setForm, budget, onSave, onCancel }) {
  const scats = budget.map(b => b.category);
  const cat = form.category || scats[0] || "Other";
  const budgetRow = budget.find(b => b.category === cat);
  const budgeted = budgetRow?.estimated || 0;
  const base = num(form.baseAmount); const crew = form.hasCrew ? num(form.crewMeals) : 0; const oot = form.hasOOT ? num(form.ootFee) : 0;
  const total = base + crew + oot; const dp = form.hasDP ? num(form.dpAmount) : 0; const balance = total - dp;
  return (
    <>
      <Field label="Supplier / Company Name" required><input value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Field>
      <Field label="Category" required><select value={cat} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>{scats.map(c => <option key={c}>{c}</option>)}</select></Field>
      <div style={{ background: "rgba(122,158,173,.08)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--b)", textTransform: "uppercase", marginBottom: 10, fontWeight: 500 }}>Contact Person</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Contact Name"><input value={form.contactName || ""} onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))} placeholder="e.g. Maria Santos" /></Field>
          <Field label="Mobile / CP"><input value={form.contactPhone || ""} onChange={e => setForm(p => ({ ...p, contactPhone: e.target.value }))} placeholder="09XX XXX XXXX" /></Field>
          <Field label="Email" style={{ gridColumn: "1/-1" }}><input type="email" value={form.contactEmail || ""} onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))} placeholder="supplier@email.com" /></Field>
        </div>
      </div>
      {budgeted > 0 && <div className="budget-hint">Allocated for <strong>{budgetRow.category}</strong>: {peso(budgeted)}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Base Amount (₱) — from Excel" required><input type="number" value={form.baseAmount || ""} onChange={e => setForm(p => ({ ...p, baseAmount: e.target.value }))} /></Field>
        <Field label="Final Due Date"><input type="date" value={form.dueDate || ""} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} /></Field>
      </div>
      <div style={{ marginBottom: 14 }}><label className="toggle-box" onClick={() => setForm(p => ({ ...p, hasDP: !p.hasDP }))}><input type="checkbox" checked={!!form.hasDP} onChange={() => {}} style={{ accentColor: "var(--r)" }} /><span>Has Downpayment / Deposit</span></label></div>
      {form.hasDP && (<div style={{ background: "rgba(196,150,122,.08)", borderRadius: 8, padding: 14, marginBottom: 14 }}><div style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--r)", textTransform: "uppercase", marginBottom: 10, fontWeight: 500 }}>Downpayment Details</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="DP Amount (₱)" required><input type="number" value={form.dpAmount || ""} onChange={e => setForm(p => ({ ...p, dpAmount: e.target.value }))} /></Field><Field label="DP Due Date" required><input type="date" value={form.dpDueDate || ""} onChange={e => setForm(p => ({ ...p, dpDueDate: e.target.value }))} /></Field><Field label="DP Date Paid"><input type="date" value={form.dpPaidDate || ""} onChange={e => setForm(p => ({ ...p, dpPaidDate: e.target.value }))} /></Field></div></div>)}
      <div style={{ marginBottom: 8 }}><label className="toggle-box" onClick={() => setForm(p => ({ ...p, hasCrew: !p.hasCrew }))}><input type="checkbox" checked={!!form.hasCrew} onChange={() => {}} style={{ accentColor: "var(--b)" }} /><span>Includes Crew Meals</span></label></div>
      {form.hasCrew && <div style={{ marginBottom: 14, paddingLeft: 4 }}><Field label="Crew Meals (₱)"><input type="number" value={form.crewMeals || ""} onChange={e => setForm(p => ({ ...p, crewMeals: e.target.value }))} placeholder="0" /></Field></div>}
      <div style={{ marginBottom: 8 }}><label className="toggle-box" onClick={() => setForm(p => ({ ...p, hasOOT: !p.hasOOT }))}><input type="checkbox" checked={!!form.hasOOT} onChange={() => {}} style={{ accentColor: "var(--b)" }} /><span>Includes Out-of-Town Fee</span></label></div>
      {form.hasOOT && <div style={{ marginBottom: 14, paddingLeft: 4 }}><Field label="Out-of-Town Fee (₱)"><input type="number" value={form.ootFee || ""} onChange={e => setForm(p => ({ ...p, ootFee: e.target.value }))} placeholder="0" /></Field></div>}
      {(form.hasCrew || form.hasOOT) && (
        <div style={{ marginBottom: 14 }}>
          <label className="toggle-box" onClick={() => setForm(p => ({ ...p, inContract: !p.inContract }))} style={{ background: form.inContract ? "rgba(122,158,138,.12)" : "rgba(196,168,122,.15)" }}>
            <input type="checkbox" checked={!!form.inContract} onChange={() => {}} style={{ accentColor: "var(--su)" }} />
            <span>{form.inContract ? "Crew / OOT already inside the contract price (tracked, not added)" : "Crew / OOT are on top of the contract (added to total)"}</span>
          </label>
        </div>
      )}
      <div style={{ background: "var(--l)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, fontWeight: 500 }}>Contract Summary</div>
        <div style={{ borderTop: "1px solid #D8D0C4", paddingTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
          <div><div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>Total</div><div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{peso(total)}</div></div>
          <div><div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>DP</div><div style={{ fontSize: 15, fontWeight: 600, color: form.hasDP ? "var(--su)" : "var(--m)" }}>{form.hasDP ? `− ${peso(dp)}` : "—"}</div></div>
          <div><div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>Balance</div><div style={{ fontSize: 15, fontWeight: 600, color: "var(--r)" }}>{peso(balance)}</div></div>
        </div>
      </div>
      <Field label="Notes"><textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={{ minHeight: 55, resize: "vertical" }} /></Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn v="ghost" onClick={onCancel}>Cancel</Btn><Btn onClick={onSave}>Save Supplier</Btn></div>
    </>
  );
}


function SuppliersTab({ suppliers, setSuppliers, budget, setBudget, events, setEvents, totalBudget, setTotalBudget, lastImport, setLastImport }) {
  const xlsRef = useRef();
  const [importing, setImporting] = useState(false);
  const handleExcelFile = e => {
    const file = e.target.files[0]; if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "array", cellDates: true });
        const res = importFromExcel(wb, { suppliers, budget, events, totalBudget });
        const warn = res.errors.length ? `\n\nWarnings:\n${res.errors.join("\n")}` : "";
        if (!window.confirm(`Import from Excel?\n\n${res.summary}\n\nThis replaces suppliers, payments, crew meals, OOT fees, budget categories, payment-due events and deadlines. Guests, attachments and events you added by hand are kept.${warn}`)) { setImporting(false); return; }
        setSuppliers(res.suppliers); setBudget(res.budget); setEvents(res.events); setTotalBudget(res.totalBudget);
        setLastImport(Date.now());
        setBulkResult(`Imported from Excel — ${res.summary}`);
      } catch (err) {
        alert(`Import failed: ${err.message}`);
      }
      setImporting(false);
      e.target.value = "";
    };
    reader.readAsArrayBuffer(file);
  };
  const [modal, setModal] = useState(null);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState({});
  const [sortCol, setSortCol] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [bulkResult, setBulkResult] = useState(null);
  const [showPayCats, setShowPayCats] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const attachRef = useRef();
  const ATTACH_TYPES = ["Contract", "Draft", "Receipt", "QR"];

  const toggleSort = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const sortVal = (s, col) => {
    if (col === "name") return s.name.toLowerCase(); if (col === "category") return s.category.toLowerCase();
    if (col === "total") return s.total || 0; if (col === "dp") return s.hasDP ? (s.dpAmount || 0) : -1;
    if (col === "paid") return s.paid || 0; if (col === "balance") return (s.total || 0) - (s.paid || 0);
    if (col === "dueDate") return s.dueDate || ""; if (col === "status") return s.status || ""; return "";
  };
  const filtered = suppliers.filter(s => (cat === "All" || s.category === cat) && s.name.toLowerCase().includes(q.toLowerCase()));
  const list = [...filtered].sort((a, b) => { const av = sortVal(a, sortCol), bv = sortVal(b, sortCol); const cmp = typeof av === "number" ? av - bv : av.localeCompare(bv); return sortDir === "asc" ? cmp : -cmp; });
  const tot = suppliers.reduce((a, s) => a + (s.total || 0), 0);
  const paid = suppliers.reduce((a, s) => a + (s.paid || 0), 0);
  const payByCat = useMemo(() => { const cats = {}; suppliers.forEach(s => { if (!cats[s.category]) cats[s.category] = { total: 0, paid: 0, suppliers: [] }; cats[s.category].total += s.total || 0; cats[s.category].paid += s.paid || 0; cats[s.category].suppliers.push(s); }); return cats; }, [suppliers]);
  const blankForm = () => ({ name: "", category: budget[0]?.category || "Other", baseAmount: "", hasDP: false, dpAmount: "", dpDueDate: "", dpPaidDate: "", hasCrew: false, crewMeals: "", hasOOT: false, ootFee: "", dueDate: "", notes: "", payments: [], attachments: [], contactName: "", contactPhone: "", contactEmail: "" });

  const save = () => {
    if (!form.name || !form.baseAmount) return alert("Name and Base Amount are required");
    if (form.hasDP && (!form.dpAmount || !form.dpDueDate)) return alert("Please fill DP Amount and DP Due Date");
    const total = computeSupplierTotal(form);
    let finalPayments = [...(form.payments || [])];
    if (form.hasDP && form.dpPaidDate && form.dpAmount) { const alreadyLogged = finalPayments.some(p => p.note === "Downpayment"); if (!alreadyLogged) finalPayments.unshift({ date: form.dpPaidDate, amount: num(form.dpAmount), note: "Downpayment" }); }
    const paid = finalPayments.reduce((a, p) => a + num(p.amount), 0);
    const status = paid === 0 ? "Unpaid" : paid >= total ? "Fully Paid" : "Partial";
    const e = { ...form, id: sel?.id || Date.now(), total, paid, status, payments: finalPayments };
    setSuppliers(p => sel ? p.map(s => s.id === e.id ? e : s) : [...p, e]);
    setModal(null);
  };

  const del = id => { if (window.confirm("Delete supplier?")) setSuppliers(p => p.filter(s => s.id !== id)); };

  const addAttachment = (supplierId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { const att = { id: Date.now(), name: file.name, type: "Contract", dataUrl: ev.target.result, mimeType: file.type, size: file.size }; setSuppliers(prev => prev.map(s => s.id !== supplierId ? s : { ...s, attachments: [...(s.attachments || []), att] })); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fade">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
        {[["Total Contracts", tot, "var(--ink)"], ["Total Paid", paid, "var(--su)"], ["Outstanding", tot - paid, "var(--r)"]].map(([l, v, c]) => (
          <Card key={l} style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: "var(--m)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{l}</div><div className="sf" style={{ fontSize: 26, color: c, fontWeight: 300 }}>{peso(v)}</div></Card>
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
              return (<div key={catName} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}><span style={{ fontWeight: 500 }}>{catName}</span><span style={{ color: "var(--m)", fontSize: 12 }}>{peso(data.paid)} / {peso(data.total)}</span></div>
                <div style={{ height: 6, background: "var(--l)", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}><div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "var(--su)" : "var(--r)", borderRadius: 3 }} /></div>
                {data.suppliers.map(s => (<div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "5px 8px", marginBottom: 2, background: "var(--cr)", borderRadius: 5 }}><span>{s.name}</span><div style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ color: "var(--r)", fontWeight: 500 }}>{peso(s.total - (s.paid || 0))} left</span><Badge label={s.status} color={SC[s.status]} /><Btn v="ghost" onClick={() => { setSel(s); setModal("view"); }} style={{ padding: "4px 8px", fontSize: 10 }}>View</Btn></div></div>))}
              </div>);
            })}
            {Object.keys(payByCat).length === 0 && <p style={{ color: "var(--m)", fontSize: 13, textAlign: "center" }}>No suppliers yet.</p>}
          </div>
        )}
      </Card>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 130 }} />
        <select value={cat} onChange={e => setCat(e.target.value)} style={{ minWidth: 130 }}><option value="All">All Categories</option>{budget.map(b => <option key={b.category}>{b.category}</option>)}</select>
        <Btn onClick={() => xlsRef.current.click()} style={{ background: "var(--ink)" }}>{importing ? "Importing…" : "⇅ Import Excel"}</Btn>
        <input ref={xlsRef} type="file" accept=".xlsx,.xlsm" style={{ display: "none" }} onChange={handleExcelFile} />
        <Btn v="ghost" onClick={() => { setForm(blankForm()); setSel(null); setModal("form"); }}>+ Add</Btn>
      </div>
      <div style={{ fontSize: 11, color: "var(--m)", marginBottom: 12, padding: "8px 12px", background: "var(--l)", borderRadius: 6 }}>
        <strong style={{ color: "var(--ink)" }}>Excel is the source of truth.</strong> Log payments in <em>Wedding Budget Planner.xlsx</em> (PaymentSchedule tab) crew/OOT in VendorList, and tasks in Deadlines, then Import Excel here.
        {lastImport ? ` Last import: ${new Date(lastImport).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}.` : " Not yet imported."}
      </div>
      {bulkResult && <div style={{ fontSize: 12, color: "var(--su)", marginBottom: 10, padding: "8px 12px", background: "rgba(122,158,138,.1)", borderRadius: 6 }}>{bulkResult} <button onClick={() => setBulkResult(null)} style={{ background: "none", border: "none", color: "var(--m)", cursor: "pointer", marginLeft: 8 }}>×</button></div>}
      <Card style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 780 }}>
          <thead><tr style={{ background: "var(--l)" }}>
            {[["Supplier","name"],["Category","category"],["Contract","total"],["DP","dp"],["Paid","paid"],["Balance","balance"],["Due Date","dueDate"],["Status","status"],["",""]].map(([label, col]) => (
              <th key={label} onClick={col ? () => toggleSort(col) : undefined} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, letterSpacing: 1.5, color: "var(--m)", textTransform: "uppercase", fontWeight: 500, whiteSpace: "nowrap", cursor: col ? "pointer" : "default", userSelect: "none" }}>
                {label}{col && sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : col ? " ·" : ""}
              </th>
            ))}
          </tr></thead>
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
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <Btn onClick={() => { setSel(s); setModal("view"); }} v="ghost">View{s.attachments?.length ? ` (${s.attachments.length})` : ""}</Btn>
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
      {modal === "form" && (<Modal title={sel ? "Edit Supplier" : "Add Supplier"} onClose={() => setModal(null)} wide><SupplierForm form={form} setForm={setForm} budget={budget} onSave={save} onCancel={() => setModal(null)} /></Modal>)}
      {modal === "view" && sel && (() => {
        const liveSel = suppliers.find(s => s.id === sel.id) || sel;
        return (
          <Modal title={liveSel.name} onClose={() => setModal(null)} wide>
            <div style={{ background: "var(--l)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
              {(liveSel.hasCrew || liveSel.hasOOT) && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10, fontSize: 12 }}>
                  {liveSel.hasCrew && <span>Crew meals <strong style={{ color: "var(--g)" }}>{peso(liveSel.crewMeals)}</strong>{liveSel.crewPax ? <span style={{ color: "var(--m)" }}> ({liveSel.crewPax} × {peso(liveSel.mealRate)})</span> : null}</span>}
                  {liveSel.hasOOT && <span>OOT <strong style={{ color: "var(--b)" }}>{peso(liveSel.ootFee)}</strong></span>}
                  <Badge label={liveSel.inContract ? "Inside contract price" : "On top of contract"} color={liveSel.inContract ? "var(--su)" : "var(--r)"} />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, textAlign: "center", borderTop: "1px solid #D8D0C4", paddingTop: 10 }}>
                <div><div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>Total Contract</div><div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>{peso(liveSel.total)}</div></div>
                <div><div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>Total Paid</div><div style={{ fontSize: 16, fontWeight: 700, color: "var(--su)" }}>{peso(liveSel.paid || 0)}</div></div>
                <div><div style={{ fontSize: 9, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>Balance Due</div><div style={{ fontSize: 16, fontWeight: 700, color: "var(--r)" }}>{peso(liveSel.total - (liveSel.paid || 0))}</div></div>
              </div>
            </div>
            {(liveSel.contactName || liveSel.contactPhone || liveSel.contactEmail) && (<div style={{ background: "rgba(122,158,173,.08)", borderRadius: 8, padding: 12, marginBottom: 14, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}><div style={{ fontSize: 10, color: "var(--b)", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500 }}>Contact</div>{liveSel.contactName && <span style={{ fontSize: 13, fontWeight: 500 }}>{liveSel.contactName}</span>}{liveSel.contactPhone && <a href={`tel:${liveSel.contactPhone}`} style={{ fontSize: 13, color: "var(--b)", textDecoration: "none" }}>📞 {liveSel.contactPhone}</a>}{liveSel.contactEmail && <a href={`mailto:${liveSel.contactEmail}`} style={{ fontSize: 13, color: "var(--r)", textDecoration: "none" }}>✉ {liveSel.contactEmail}</a>}</div>)}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
              {[["Category", liveSel.category], ["Due Date", liveSel.dueDate || "—"], ["Status", liveSel.status]].map(([l, v]) => (<div key={l} style={{ background: "var(--l)", padding: 10, borderRadius: 6 }}><div style={{ fontSize: 10, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{l}</div><div style={{ fontWeight: 500, fontSize: 13 }}>{v}</div></div>))}
            </div>
            {liveSel.notes && <p style={{ fontSize: 13, color: "var(--m)", background: "var(--l)", padding: 10, borderRadius: 6, marginBottom: 14 }}>{liveSel.notes}</p>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h4 style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--m)" }}>Payment History</h4>
              <span style={{ fontSize: 10, color: "var(--m)" }}>from Excel</span>
            </div>
            {!(liveSel.payments?.length) ? <p style={{ fontSize: 13, color: "var(--m)", textAlign: "center", padding: 12 }}>No payments logged yet.</p> : (
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "var(--l)" }}>{["Date","Amount","Mode","Note"].map(h => <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 10, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>)}</tr></thead>
                <tbody>{liveSel.payments.map((p, i) => (<tr key={i} style={{ borderTop: "1px solid var(--l)" }}><td style={{ padding: "8px 10px" }}>{p.date}</td><td style={{ padding: "8px 10px", color: "var(--su)", fontWeight: 600 }}>{peso(p.amount)}</td><td style={{ padding: "8px 10px" }}>{p.mode ? <Badge label={p.mode} color="var(--b)" /> : "—"}</td><td style={{ padding: "8px 10px", color: "var(--m)" }}>{p.note || "—"}</td></tr>))}</tbody>
              </table>
            )}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h4 style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--m)" }}>Attachments {liveSel.attachments?.length ? `(${liveSel.attachments.length})` : ""}</h4>
                <Btn v="ghost" onClick={() => attachRef.current.click()}>+ Attach File</Btn>
                <input ref={attachRef} type="file" accept="image/*,.pdf" multiple style={{ display: "none" }} onChange={e => { Array.from(e.target.files).forEach(f => addAttachment(liveSel.id, f)); e.target.value = ""; }} />
              </div>
              <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); Array.from(e.dataTransfer.files).forEach(f => addAttachment(liveSel.id, f)); }} onClick={() => attachRef.current.click()} style={{ border: `2px dashed ${dragOver ? "var(--r)" : "#D8D0C4"}`, borderRadius: 10, padding: "18px 12px", textAlign: "center", marginBottom: 12, cursor: "pointer" }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>📎</div>
                <div style={{ fontSize: 12, color: "var(--m)" }}>{dragOver ? "Drop to attach" : "Drag & drop files here, or click to browse"}</div>
              </div>
              {!(liveSel.attachments?.length) ? <p style={{ fontSize: 13, color: "var(--m)", textAlign: "center" }}>No attachments yet.</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {liveSel.attachments.map((att, i) => (
                    <div key={att.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--l)", borderRadius: 8, padding: "8px 12px" }}>
                      {att.mimeType?.startsWith("image/") ? <img src={att.dataUrl} alt={att.name} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 4, flexShrink: 0, cursor: "pointer" }} onClick={() => window.open(att.dataUrl)} /> : <div style={{ width: 44, height: 44, background: "var(--r)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--wh)", fontWeight: 600, flexShrink: 0 }}>PDF</div>}
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</div><select value={att.type} onChange={e => { setSuppliers(prev => prev.map(s => s.id !== liveSel.id ? s : { ...s, attachments: s.attachments.map((a, j) => j === i ? { ...a, type: e.target.value } : a) })); }} style={{ fontSize: 11, padding: "2px 6px", marginTop: 3, width: "auto" }}>{ATTACH_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                      <Badge label={att.type} color="var(--g)" />
                      <a href={att.dataUrl} download={att.name} style={{ fontSize: 11, color: "var(--b)", textDecoration: "none", fontWeight: 500 }}>↓</a>
                      <button onClick={() => { if (window.confirm("Remove attachment?")) setSuppliers(prev => prev.map(s => s.id !== liveSel.id ? s : { ...s, attachments: s.attachments.filter((_, j) => j !== i) })); }} style={{ background: "none", border: "none", color: "var(--d)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

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
  const eventMap = useMemo(() => { const m = {}; events.forEach(ev => { if (!m[ev.date]) m[ev.date] = []; m[ev.date].push(ev); }); return m; }, [events]);
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const openAdd = dateStr => { setForm({ title: "", date: dateStr, type: "Meeting", amount: "", notes: "" }); setSel(null); setModal(true); };
  const openEdit = (ev, e) => { e.stopPropagation(); setForm({ ...ev }); setSel(ev); setModal(true); };
  const delEvent = id => { if (window.confirm("Delete?")) setEvents(p => p.filter(e => e.id !== id)); };
  const save = () => { const e = { ...form, id: sel?.id || Date.now(), amount: num(form.amount) }; setEvents(p => sel ? p.map(x => x.id === e.id ? e : x) : [...p, e]); setModal(false); };
  const downloadTemplate = () => { downloadCSV("events_template.csv", ["title","date","type","amount","notes"], [["Bridal Gown Fitting #2","2026-04-15","Fitting","0",""]]); };
  const handleBulkFile = e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = ev => { const rows = parseCSV(ev.target.result); const base = Date.now(); const added = rows.filter(r => r.title && r.date).map((r, idx) => ({ id: base + idx, title: r.title, date: r.date, type: ETYPES.includes(r.type) ? r.type : "Meeting", amount: num(r.amount), notes: r.notes || "" })); setEvents(p => [...p, ...added]); setBulkResult(`${added.length} event(s) imported.`); e.target.value = ""; }; reader.readAsText(file); };
  const upcoming = [...events].filter(e => e.date >= todayStr && !e.done).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 4 }}>{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (<div key={d} style={{ textAlign: "center", fontSize: 9, color: "var(--m)", letterSpacing: 1, textTransform: "uppercase", padding: "2px 0" }}>{d}</div>))}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
            {cells.map((day, idx) => {
              if (day === null) return <div key={"b"+idx} />;
              const dateStr = toISO(year, month, day); const dayEvs = eventMap[dateStr] || []; const isToday = dateStr === todayStr;
              return (<div key={dateStr} className={"cal-day" + (isToday ? " today" : "")} onClick={() => openAdd(dateStr)}><div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? "var(--r)" : "var(--ink)", marginBottom: 2 }}>{day}</div>{dayEvs.slice(0, 2).map(ev => (<div key={ev.id} onClick={e => openEdit(ev, e)} title={ev.title} style={{ fontSize: 8, background: EC[ev.type] || "#999", color: "#fff", borderRadius: 3, padding: "1px 4px", marginBottom: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", opacity: ev.done ? 0.4 : 1, textDecoration: ev.done ? "line-through" : "none" }}>{ev.title}</div>))}{dayEvs.length > 2 && <div style={{ fontSize: 8, color: "var(--m)" }}>+{dayEvs.length - 2}</div>}</div>);
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--l)" }}>{Object.entries(EC).map(([t, c]) => (<div key={t} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--m)" }}><div style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0 }} />{t}</div>))}</div>
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn onClick={() => openAdd(todayStr)} style={{ width: "100%" }}>+ Add Event</Btn>
          <div style={{ display: "flex", gap: 6 }}><Btn v="ghost" onClick={downloadTemplate} style={{ flex: 1 }}>↓ Template</Btn><Btn v="secondary" onClick={() => fileRef.current.click()} style={{ flex: 1 }}>↑ Bulk</Btn><input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleBulkFile} /></div>
          {bulkResult && <div style={{ fontSize: 11, color: "var(--su)", padding: "6px 10px", background: "rgba(122,158,138,.1)", borderRadius: 6 }}>{bulkResult}</div>}
          <Card style={{ padding: 16 }}>
            <h4 className="sf" style={{ fontSize: 17, fontWeight: 400, marginBottom: 12 }}>Upcoming</h4>
            {upcoming.length === 0 ? <p style={{ fontSize: 12, color: "var(--m)", textAlign: "center" }}>No upcoming events</p> : upcoming.map(ev => (
              <div key={ev.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--l)", cursor: "pointer" }} onClick={e => openEdit(ev, e)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 12, fontWeight: 500, flex: 1, paddingRight: 6, lineHeight: 1.3 }}>{ev.title}</span><button onClick={e => { e.stopPropagation(); delEvent(ev.id); }} style={{ background: "none", border: "none", color: "#C9B9A8", fontSize: 16, cursor: "pointer", lineHeight: 1 }}>×</button></div>
                <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}><Badge label={ev.type} color={EC[ev.type]} /><span style={{ fontSize: 10, color: "var(--m)" }}>{ev.date}</span></div>
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
            <Field label="Type"><select value={form.type || "Meeting"} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{ETYPES.map(t => <option key={t}>{t}</option>)}</select></Field>
          </div>
          <Field label="Amount (₱)"><input type="number" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" /></Field>
          {form.type === "Deadline" && (
            <label className="toggle-box" style={{ marginBottom: 14 }} onClick={() => setForm(f => ({ ...f, done: !f.done }))}>
              <input type="checkbox" checked={!!form.done} onChange={() => {}} style={{ accentColor: "var(--su)" }} /><span>Done{form.supplier ? ` · ${form.supplier}` : ""}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--m)" }}>from Excel — also mark Done there</span>
            </label>
          )}
          <Field label="Notes"><textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ minHeight: 55, resize: "vertical" }} /></Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>{sel && <Btn v="danger" onClick={() => { delEvent(sel.id); setModal(false); }}>Delete</Btn>}<Btn v="ghost" onClick={() => setModal(false)}>Cancel</Btn><Btn onClick={save}>Save</Btn></div>
        </Modal>
      )}
    </div>
  );
}

function BudgetTab({ budget, setBudget, totalBudget, setTotalBudget, suppliers }) {
  const [modal, setModal] = useState(false); const [form, setForm] = useState({}); const [sel, setSel] = useState(null);
  const [editingTotal, setEditingTotal] = useState(false); const [totalInput, setTotalInput] = useState(totalBudget || "");
  const [bSortCol, setBSortCol] = useState("category"); const [bSortDir, setBSortDir] = useState("asc");
  const toggleBSort = col => { if (bSortCol === col) setBSortDir(d => d === "asc" ? "desc" : "asc"); else { setBSortCol(col); setBSortDir("asc"); } };
  const spentByCategory = useMemo(() => { const map = {}; (suppliers || []).forEach(s => { const cat = s.category || "Other"; if (!map[cat]) map[cat] = 0; map[cat] += s.paid || 0; }); return map; }, [suppliers]);
  const tE = budget.reduce((a, b) => a + (b.estimated || 0), 0);
  const tA = budget.reduce((a, b) => a + (spentByCategory[b.category] || 0), 0);
  const save = () => { const e = { ...form, id: sel?.id || Date.now(), estimated: num(form.estimated) }; setBudget(p => sel ? p.map(b => b.id === e.id ? e : b) : [...p, e]); setModal(false); };
  const saveTotal = () => { setTotalBudget(num(totalInput)); setEditingTotal(false); };
  return (
    <div className="fade">
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--m)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Overall Budget Cap</div>
            {editingTotal ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="number" value={totalInput} onChange={e => setTotalInput(e.target.value)} style={{ width: 160 }} autoFocus /><Btn onClick={saveTotal}>Set</Btn><Btn v="ghost" onClick={() => setEditingTotal(false)}>Cancel</Btn></div>
              : <div style={{ display: "flex", alignItems: "center", gap: 12 }}><span className="sf" style={{ fontSize: 28, fontWeight: 300, color: "var(--ink)" }}>{totalBudget ? peso(totalBudget) : "Not set"}</span><Btn v="ghost" onClick={() => { setTotalInput(totalBudget || ""); setEditingTotal(true); }}>Edit</Btn></div>}
          </div>
          {totalBudget > 0 && <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: "var(--m)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Allocated vs Cap</div><div style={{ fontSize: 18, fontWeight: 500, color: tE > totalBudget ? "var(--d)" : "var(--su)" }}>{peso(tE)} / {peso(totalBudget)}</div></div>}
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
        {[["Allocated", tE, "var(--ink)"], ["Spent", tA, "var(--r)"], ["Remaining", tE - tA, (tE - tA) < 0 ? "var(--d)" : "var(--su)"]].map(([l, v, c]) => (<Card key={l} style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: "var(--m)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{l}</div><div className="sf" style={{ fontSize: 26, color: c, fontWeight: 300 }}>{peso(v)}</div></Card>))}
      </div>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 13 }}><span style={{ color: "var(--m)" }}>Overall Spent</span><span style={{ fontWeight: 500 }}>{tE > 0 ? Math.round((tA / tE) * 100) : 0}%</span></div>
        <div style={{ height: 7, background: "var(--l)", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, tE > 0 ? (tA / tE) * 100 : 0)}%`, background: "var(--r)", borderRadius: 4 }} /></div>
      </Card>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}><Btn onClick={() => { setForm({ category: "", estimated: "" }); setSel(null); setModal(true); }}>+ Add Category</Btn></div>
      <Card style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
          <thead><tr style={{ background: "var(--l)" }}>{[["Category","category"],["Allocated","estimated"],["Spent","spent"],["Variance","variance"],["Progress","pct"],["",""]].map(([label, col]) => (<th key={label} onClick={col ? () => toggleBSort(col) : undefined} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, letterSpacing: 1.5, color: "var(--m)", textTransform: "uppercase", fontWeight: 500, cursor: col ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}>{label}{col && bSortCol === col ? (bSortDir === "asc" ? " ▲" : " ▼") : col ? " ·" : ""}</th>))}</tr></thead>
          <tbody>
            {[...budget].map(b => ({ ...b, spent: spentByCategory[b.category]||0, variance: b.estimated-(spentByCategory[b.category]||0), pct: b.estimated>0?(spentByCategory[b.category]||0)/b.estimated*100:0 })).sort((a, bx) => { const av = a[bSortCol]??"", bv = bx[bSortCol]??""; const cmp = typeof av==="number" ? av-bv : String(av).localeCompare(String(bv)); return bSortDir==="asc" ? cmp : -cmp; }).map((b, i) => {
              const spent = b.spent; const v = b.estimated - spent; const pct = b.estimated > 0 ? Math.min(100, (spent / b.estimated) * 100) : 0;
              return (<tr key={b.id} style={{ borderTop: "1px solid var(--l)", background: i % 2 === 0 ? "var(--wh)" : "var(--cr)" }}><td style={{ padding: "11px 12px", fontWeight: 500 }}>{b.category}</td><td style={{ padding: "11px 12px" }}>{peso(b.estimated)}</td><td style={{ padding: "11px 12px", color: "var(--r)" }}>{peso(spent)}</td><td style={{ padding: "11px 12px", color: v >= 0 ? "var(--su)" : "var(--d)", fontWeight: 500 }}>{v >= 0 ? "+" : ""}{peso(v)}</td><td style={{ padding: "11px 12px", minWidth: 90 }}><div style={{ height: 5, background: "var(--l)", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: pct > 100 ? "var(--d)" : pct > 80 ? "var(--wa)" : "var(--r)", borderRadius: 3 }} /></div><div style={{ fontSize: 9, color: "var(--m)", marginTop: 2 }}>{Math.round(pct)}%</div></td><td style={{ padding: "11px 12px" }}><div style={{ display: "flex", gap: 6 }}><Btn onClick={() => { setForm({ ...b }); setSel(b); setModal(true); }} v="secondary">Edit</Btn><Btn onClick={() => { if (window.confirm("Remove category?")) setBudget(p => p.filter(x => x.id !== b.id)); }} v="danger">Del</Btn></div></td></tr>);
            })}
          </tbody>
        </table>
      </Card>
      {modal && (<Modal title={sel ? "Edit Category" : "Add Category"} onClose={() => setModal(false)}><Field label="Category Name"><input value={form.category || ""} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></Field><Field label="Allocated Budget (₱)"><input type="number" value={form.estimated || ""} onChange={e => setForm(f => ({ ...f, estimated: e.target.value }))} /></Field><p style={{ fontSize: 11, color: "var(--m)", marginTop: -8, marginBottom: 14 }}>Spent is computed automatically from supplier payments.</p><div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn v="ghost" onClick={() => setModal(false)}>Cancel</Btn><Btn onClick={save}>Save</Btn></div></Modal>)}
    </div>
  );
}

const SPECIAL_ROLES = ["—","Entourage","Sponsor","Best Man","Maid of Honor","Principal Sponsor","Secondary Sponsor","Flower Girl","Ring Bearer","Reader","Candle","Veil","Cord","Other"];
const VIP_TABLES = ["VIP 1","VIP 2"];
const TABLE_CAPACITY = t => VIP_TABLES.includes(t) ? 14 : 10;

function RsvpReplies({ guests, setGuests }) {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(true);
  const load = () => sb.from("rsvps").select("*").order("id", { ascending: false }).then(r => setRows((r.data || []).map(x => x.data)));
  useEffect(() => { load(); }, []);
  const addAsGuest = r => {
    const g = { id: Date.now(), name: r.name, phone: "", group: "Mutual", rsvp: r.attending ? "Confirmed" : "Declined", meal: "", plusOne: false, table: "", role: "", notes: [r.note, r.diet && `Dietary: ${r.diet}`].filter(Boolean).join(" · ") };
    setGuests(p => [...p, g]);
    sb.from("rsvps").update({ data: { ...r, matched: true, guestId: g.id } }).eq("id", r.id).then(load);
  };
  const del = r => { if (!window.confirm("Delete this reply?")) return; sb.from("rsvps").delete().eq("id", r.id).then(load); };
  const unmatched = (rows || []).filter(r => !r.matched);
  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
        <h4 style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--m)", fontWeight: 500, display: "flex", gap: 8, alignItems: "center" }}>
          Replies from the website {rows ? `(${rows.length})` : ""}{unmatched.length ? <Badge label={`${unmatched.length} to review`} color="var(--wa)" /> : null}
        </h4>
        <span style={{ fontSize: 12, color: "var(--m)" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (rows === null ? <p style={{ fontSize: 12, color: "var(--m)", marginTop: 10 }}>Loading…</p> : rows.length === 0 ? <p style={{ fontSize: 13, color: "var(--m)", marginTop: 10 }}>No replies yet. They appear here as guests use the RSVP form.</p> : (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map(r => (
            <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", background: r.matched ? "var(--cr)" : "rgba(196,168,122,.15)", borderRadius: 6, fontSize: 13 }}>
              <Badge label={r.attending ? "Accepts" : "Declines"} color={r.attending ? "var(--su)" : "var(--d)"} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{r.name} <span style={{ fontSize: 11, color: "var(--m)", fontWeight: 400 }}>· {String(r.submittedAt || "").slice(0, 10)}</span></div>
                {r.note && <div style={{ fontSize: 12, color: "var(--m)", fontStyle: "italic" }}>{r.note}</div>}
                {r.diet && <div style={{ fontSize: 12, color: "var(--b)" }}>Dietary: {r.diet}</div>}
                {!r.matched && <div style={{ fontSize: 11, color: "var(--wa)", marginTop: 2 }}>Name not on the guest list</div>}
              </div>
              {!r.matched && <Btn v="secondary" onClick={() => addAsGuest(r)}>Add as guest</Btn>}
              <Btn v="danger" onClick={() => del(r)}>Del</Btn>
            </div>
          ))}
        </div>
      ))}
    </Card>
  );
}

function GuestsTab({ guests, setGuests }) {
  const [modal, setModal] = useState(false); const [form, setForm] = useState({}); const [sel, setSel] = useState(null);
  const [q, setQ] = useState(""); const [fR, setFR] = useState("All"); const [fG, setFG] = useState("All"); const [fM, setFM] = useState("All");
  const [sortByTable, setSortByTable] = useState(false); const [bulkResult, setBulkResult] = useState(null); const [activeBreakdown, setActiveBreakdown] = useState("rsvp");
  const fileRef = useRef(); const [gSortCol, setGSortCol] = useState("name"); const [gSortDir, setGSortDir] = useState("asc");
  const toggleGSort = col => { if (gSortCol === col) setGSortDir(d => d === "asc" ? "desc" : "asc"); else { setGSortCol(col); setGSortDir("asc"); } };
  const quickRsvp = (id, rsvp) => setGuests(p => p.map(g => g.id === id ? { ...g, rsvp } : g));
  const filtered = guests.filter(g => (fR === "All" || g.rsvp === fR) && (fG === "All" || g.group === fG) && (fM === "All" || g.meal === fM) && (g.name.toLowerCase().includes(q.toLowerCase()) || (g.phone || "").includes(q)));
  const list = sortByTable ? [...filtered].sort((a, b) => { const ta = a.table||"ZZZ", tb = b.table||"ZZZ"; if (ta !== tb) return ta.localeCompare(tb, undefined, { numeric: true }); return a.name.localeCompare(b.name); }) : [...filtered].sort((a, b) => { const av = a[gSortCol]??"", bv = b[gSortCol]??""; const cmp = typeof av==="boolean" ? (av===bv?0:av?-1:1) : typeof av==="number" ? av-bv : String(av).localeCompare(String(bv)); return gSortDir==="asc" ? cmp : -cmp; });
  const conf = guests.filter(g => g.rsvp === "Confirmed").length; const pend = guests.filter(g => g.rsvp === "Pending").length;
  const heads = guests.filter(g => g.rsvp === "Confirmed").reduce((a, g) => a + 1 + (g.plusOne ? 1 : 0), 0);
  const tableCounts = useMemo(() => { const m = {}; guests.forEach(g => { const t = g.table||""; if (!t) return; if (!m[t]) m[t] = 0; m[t] += 1 + (g.plusOne ? 1 : 0); }); return m; }, [guests]);
  const save = () => { const e = { ...form, id: sel?.id || Date.now() }; setGuests(p => sel ? p.map(g => g.id === e.id ? e : g) : [...p, e]); setModal(false); };
  const downloadTemplate = () => { downloadCSV("guests_template.csv", ["name","phone","group","rsvp","meal","plusOne","table","role","notes"], [["Juan dela Cruz","09171234567","Groom","Confirmed","Beef","FALSE","1","Best Man",""]]); };
  const handleBulkFile = e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = ev => { const rows = parseCSV(ev.target.result); const base = Date.now(); const added = rows.filter(r => r.name).map((r, idx) => ({ id: base+idx, name: r.name, phone: r.phone||"", group: GROUPS.includes(r.group)?r.group:"Mutual", rsvp: RSVPS.includes(r.rsvp)?r.rsvp:"Pending", meal: MEALS.includes(r.meal)?r.meal:"", plusOne: (r.plusone||r.plusOne||"").toLowerCase()==="true", table: r.table||"", role: r.role||"", notes: r.notes||"" })); setGuests(p => [...p, ...added]); setBulkResult(`${added.length} guest(s) imported.`); e.target.value = ""; }; reader.readAsText(file); };
  const breakdowns = {
    rsvp: RSVPS.map(r => ({ label: r, count: guests.filter(g => g.rsvp===r).length, color: RC[r] })),
    group: GROUPS.map(g => ({ label: g, count: guests.filter(x => x.group===g).length, color: g==="Bride"?"var(--r)":g==="Groom"?"var(--b)":"var(--m)" })),
    meal: [...MEALS,""].map(m => ({ label: m||"Unset", count: guests.filter(g => g.meal===m).length, color: "var(--g)" })).filter(x => x.count>0),
    table: [...new Set(guests.map(g => g.table||"Unassigned"))].sort((a,b) => a.localeCompare(b,undefined,{numeric:true})).map(t => { const cap=TABLE_CAPACITY(t); const cnt=tableCounts[t]||(t==="Unassigned"?guests.filter(g=>!g.table).length:0); const over=t!=="Unassigned"&&cnt>cap; return { label: t==="Unassigned"?"Unassigned":`Table ${t}`, count: cnt, cap: t!=="Unassigned"?cap:null, over, color: over?"var(--d)":"var(--b)" }; }),
  };
  const tableGroups = useMemo(() => { if (!sortByTable) return null; const groups = {}; list.forEach(g => { const t = g.table||"Unassigned"; if (!groups[t]) groups[t] = []; groups[t].push(g); }); return groups; }, [list, sortByTable]);
  const guestRow = (g, i) => (
    <tr key={g.id} style={{ borderTop: "1px solid var(--l)", background: i%2===0?"var(--wh)":"var(--cr)" }}>
      <td style={{ padding: "10px 12px" }}><div style={{ fontWeight: 500 }}>{g.name}</div>{g.role&&g.role!=="—"&&<div style={{ fontSize: 10, color: "var(--r)", marginTop: 2, fontWeight: 500 }}>{g.role}</div>}</td>
      <td style={{ padding: "10px 12px", color: "var(--m)", fontSize: 12 }}>{g.phone||"—"}</td>
      <td style={{ padding: "10px 12px" }}><Badge label={g.group} color={g.group==="Bride"?"var(--r)":g.group==="Groom"?"var(--b)":"var(--m)"} /></td>
      <td style={{ padding: "10px 12px" }}><div style={{ display: "flex", gap: 4, alignItems: "center" }}><Badge label={g.rsvp} color={RC[g.rsvp]} />{g.rsvp!=="Confirmed"&&<button title="Confirm" onClick={()=>quickRsvp(g.id,"Confirmed")} style={{ background:"var(--su)",border:"none",color:"var(--wh)",borderRadius:4,padding:"2px 6px",fontSize:10,cursor:"pointer",fontWeight:600 }}>✓</button>}{g.rsvp!=="Declined"&&<button title="Decline" onClick={()=>quickRsvp(g.id,"Declined")} style={{ background:"var(--d)",border:"none",color:"var(--wh)",borderRadius:4,padding:"2px 6px",fontSize:10,cursor:"pointer",fontWeight:600 }}>✗</button>}</div></td>
      <td style={{ padding: "10px 12px", color: "var(--m)", fontSize: 12 }}>{g.meal||"—"}</td>
      <td style={{ padding: "10px 12px", textAlign: "center" }}>{g.plusOne?"✓":"—"}</td>
      <td style={{ padding: "10px 12px", color: "var(--m)", fontSize: 12 }}>{g.table||"—"}</td>
      <td style={{ padding: "10px 12px" }}><div style={{ display: "flex", gap: 5 }}><Btn onClick={()=>{ setForm({...g}); setSel(g); setModal(true); }} v="secondary">Edit</Btn><Btn onClick={()=>{ if(window.confirm("Remove?")) setGuests(p=>p.filter(x=>x.id!==g.id)); }} v="danger">Del</Btn></div></td>
    </tr>
  );
  const tableHead = (<tr style={{ background: "var(--l)" }}>{[["Name / Role","name"],["Phone","phone"],["Group","group"],["RSVP","rsvp"],["Meal","meal"],["+1","plusOne"],["Table","table"],["",""]].map(([label,col])=>(<th key={label} onClick={!sortByTable&&col?()=>toggleGSort(col):undefined} style={{ padding:"10px 12px",textAlign:"left",fontSize:10,letterSpacing:1.5,color:"var(--m)",textTransform:"uppercase",fontWeight:500,cursor:!sortByTable&&col?"pointer":"default",userSelect:"none",whiteSpace:"nowrap" }}>{label}{!sortByTable&&col&&gSortCol===col?(gSortDir==="asc"?" ▲":" ▼"):!sortByTable&&col?" ·":""}</th>))}</tr>);
  return (
    <div className="fade">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        {[["Total",guests.length,"var(--ink)"],["Confirmed",conf,"var(--su)"],["Pending",pend,"var(--wa)"],["Heads",heads,"var(--b)"]].map(([l,v,c])=>(<Card key={l} style={{ textAlign:"center" }}><div style={{ fontSize:10,color:"var(--m)",letterSpacing:1,textTransform:"uppercase",marginBottom:6 }}>{l}</div><div className="sf" style={{ fontSize:30,color:c,fontWeight:300 }}>{v}</div></Card>))}
      </div>
      <RsvpReplies guests={guests} setGuests={setGuests} />
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>{[["rsvp","RSVP"],["group","Group"],["meal","Meal"],["table","Tables"]].map(([k,l])=>(<button key={k} onClick={()=>setActiveBreakdown(k)} style={{ padding:"5px 14px",borderRadius:20,border:"none",fontSize:11,fontWeight:500,cursor:"pointer",background:activeBreakdown===k?"var(--r)":"var(--l)",color:activeBreakdown===k?"var(--wh)":"var(--m)" }}>{l}</button>))}</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{breakdowns[activeBreakdown].map(item=>(<div key={item.label} style={{ background:item.over?"rgba(196,122,122,.12)":"var(--l)",borderRadius:8,padding:"10px 14px",textAlign:"center",minWidth:80,border:item.over?"1px solid var(--d)":"1px solid transparent" }}><div style={{ fontSize:20,fontWeight:300,color:item.color }}>{item.count}{item.cap?<span style={{ fontSize:11,color:"var(--m)" }}>/{item.cap}</span>:""}</div><div style={{ fontSize:10,color:"var(--m)",textTransform:"uppercase",letterSpacing:1 }}>{item.label}</div>{item.over&&<div style={{ fontSize:9,color:"var(--d)",marginTop:2,fontWeight:600 }}>OVER LIMIT</div>}</div>))}</div>
        {activeBreakdown==="table"&&<p style={{ fontSize:11,color:"var(--m)",marginTop:10 }}>VIP 1 &amp; VIP 2: max 14 · All other tables: max 10</p>}
      </Card>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} style={{ flex:1,minWidth:130 }} />
        <select value={fR} onChange={e=>setFR(e.target.value)} style={{ minWidth:100 }}><option value="All">All RSVP</option>{RSVPS.map(s=><option key={s}>{s}</option>)}</select>
        <select value={fG} onChange={e=>setFG(e.target.value)} style={{ minWidth:100 }}><option value="All">All Groups</option>{GROUPS.map(g=><option key={g}>{g}</option>)}</select>
        <select value={fM} onChange={e=>setFM(e.target.value)} style={{ minWidth:100 }}><option value="All">All Meals</option>{MEALS.map(m=><option key={m}>{m}</option>)}</select>
        <button onClick={()=>setSortByTable(p=>!p)} style={{ padding:"7px 12px",borderRadius:6,border:"1px solid #D8D0C4",fontSize:11,cursor:"pointer",background:sortByTable?"var(--ink)":"var(--wh)",color:sortByTable?"var(--wh)":"var(--m)",fontFamily:"'Jost',sans-serif",fontWeight:500 }}>{sortByTable?"⊞ By Table":"⊟ By Table"}</button>
        <Btn onClick={()=>{ setForm({name:"",phone:"",group:"Mutual",rsvp:"Pending",meal:"",plusOne:false,table:"",role:"",notes:""}); setSel(null); setModal(true); }}>+ Add</Btn>
        <Btn v="ghost" onClick={downloadTemplate}>↓ Template</Btn>
        <Btn v="secondary" onClick={()=>fileRef.current.click()}>↑ Bulk</Btn>
        <input ref={fileRef} type="file" accept=".csv" style={{ display:"none" }} onChange={handleBulkFile} />
      </div>
      {bulkResult&&<div style={{ fontSize:12,color:"var(--su)",marginBottom:10,padding:"8px 12px",background:"rgba(122,158,138,.1)",borderRadius:6 }}>{bulkResult} <button onClick={()=>setBulkResult(null)} style={{ background:"none",border:"none",color:"var(--m)",cursor:"pointer",marginLeft:8 }}>×</button></div>}
      <Card style={{ padding:0,overflow:"auto" }}>
        {sortByTable&&tableGroups ? Object.entries(tableGroups).map(([tbl,tGuests])=>{ const cap=TABLE_CAPACITY(tbl); const cnt=tGuests.reduce((a,g)=>a+1+(g.plusOne?1:0),0); const over=tbl!=="Unassigned"&&cnt>cap; return (<div key={tbl}><div style={{ padding:"8px 14px",background:over?"rgba(196,122,122,.15)":"rgba(122,158,173,.1)",display:"flex",justifyContent:"space-between",alignItems:"center" }}><span style={{ fontWeight:600,fontSize:13,color:over?"var(--d)":"var(--b)" }}>{tbl==="Unassigned"?"No Table Assigned":`Table ${tbl}`}</span><span style={{ fontSize:12,color:over?"var(--d)":"var(--m)",fontWeight:over?600:400 }}>{cnt}/{tbl==="Unassigned"?"—":cap}{over?" — OVER LIMIT":""}</span></div><table style={{ width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700 }}><thead>{tableHead}</thead><tbody>{tGuests.map((g,i)=>guestRow(g,i))}</tbody></table></div>); }) : (<table style={{ width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700 }}><thead>{tableHead}</thead><tbody>{list.map((g,i)=>guestRow(g,i))}{list.length===0&&<tr><td colSpan={8} style={{ padding:40,textAlign:"center",color:"var(--m)" }}>No guests found.</td></tr>}</tbody></table>)}
      </Card>
      {modal&&(
        <Modal title={sel?"Edit Guest":"Add Guest"} onClose={()=>setModal(false)}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <Field label="Full Name" required><input value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></Field>
            <Field label="Phone"><input value={form.phone||""} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="09XX XXX XXXX" /></Field>
            <Field label="Group"><select value={form.group||"Mutual"} onChange={e=>setForm(f=>({...f,group:e.target.value}))}>{GROUPS.map(g=><option key={g}>{g}</option>)}</select></Field>
            <Field label="RSVP"><select value={form.rsvp||"Pending"} onChange={e=>setForm(f=>({...f,rsvp:e.target.value}))}>{RSVPS.map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="Meal"><select value={form.meal||""} onChange={e=>setForm(f=>({...f,meal:e.target.value}))}><option value="">—</option>{MEALS.map(m=><option key={m}>{m}</option>)}</select></Field>
            <Field label="Table No."><input value={form.table||""} onChange={e=>setForm(f=>({...f,table:e.target.value}))} placeholder="e.g. 3 or VIP 1" /></Field>
            <Field label="Special Role" style={{ gridColumn:"1/-1" }}><select value={form.role||"—"} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>{SPECIAL_ROLES.map(r=><option key={r}>{r}</option>)}</select></Field>
          </div>
          <Field label="+1?"><label style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer" }}><input type="checkbox" checked={!!form.plusOne} onChange={e=>setForm(f=>({...f,plusOne:e.target.checked}))} style={{ width:15,height:15 }} />Bringing a plus-one</label></Field>
          <Field label="Notes"><textarea value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{ minHeight:55,resize:"vertical" }} /></Field>
          <div style={{ display:"flex",gap:8,justifyContent:"flex-end" }}><Btn v="ghost" onClick={()=>setModal(false)}>Cancel</Btn><Btn onClick={save}>Save</Btn></div>
        </Modal>
      )}
    </div>
  );
}

function OverviewTab({ suppliers, guests, budget, events, totalBudget }) {
  const tD = suppliers.reduce((a,s)=>a+(s.total||0),0); const tP = suppliers.reduce((a,s)=>a+(s.paid||0),0);
  const conf = guests.filter(g=>g.rsvp==="Confirmed").length; const tB = totalBudget||budget.reduce((a,b)=>a+b.estimated,0);
  const tS = suppliers.reduce((a,s)=>a+(s.paid||0),0); const ts = todayISO();
  const up = [...events].filter(e=>e.date>=ts && !e.done && e.type!=="Deadline").sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  const dls = [...events].filter(e=>e.type==="Deadline" && !e.done).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,8);
  const dl = Math.ceil((WEDDING-new Date())/86400000);
  const unpaid = suppliers.filter(s=>s.status!=="Fully Paid");
  return (
    <div className="fade">
      <Card style={{ marginBottom:14,background:"linear-gradient(135deg,var(--ink) 0%,#4A3830 100%)",textAlign:"center",padding:"30px 20px" }}>
        <p style={{ fontSize:9,letterSpacing:4,textTransform:"uppercase",marginBottom:7,color:"var(--g)" }}>Chicco &amp; Michelle</p>
        <h2 className="sf" style={{ fontSize:32,fontWeight:300,marginBottom:3,color:"var(--cr)" }}>January 15, 2027</h2>
        <p style={{ fontSize:12,color:"#A89880",marginBottom:20 }}>Our Lady of Lourdes · Antonio's · Tagaytay</p>
        <div className="sf" style={{ fontSize:52,fontWeight:300,color:"var(--r)" }}>{dl}</div>
        <p style={{ fontSize:9,letterSpacing:4,textTransform:"uppercase",color:"#A89880" }}>Days to Go</p>
      </Card>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14 }}>
        {[[`${peso(tP)} paid`,"Payments",`of ${peso(tD)}`,"var(--r)",tD>0?(tP/tD)*100:0],[`${conf} confirmed`,"RSVPs",`of ${guests.length}`,"var(--su)",guests.length>0?(conf/guests.length)*100:0],[`${tB>0?Math.round((tS/tB)*100):0}% used`,"Budget",`${peso(tS)} of ${peso(tB)}`,"var(--b)",tB>0?Math.min(100,(tS/tB)*100):0]].map(([v,l,sub,c,pct])=>(
          <Card key={l}><div style={{ fontSize:10,color:"var(--m)",letterSpacing:1,textTransform:"uppercase",marginBottom:5 }}>{l}</div><div className="sf" style={{ fontSize:20,color:c,fontWeight:300,marginBottom:2 }}>{v}</div><div style={{ fontSize:11,color:"var(--m)",marginBottom:9 }}>{sub}</div><div style={{ height:4,background:"var(--l)",borderRadius:2,overflow:"hidden" }}><div style={{ height:"100%",width:`${pct}%`,background:c,borderRadius:2 }} /></div></Card>
        ))}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
        <Card>
          <h3 className="sf" style={{ fontSize:19,fontWeight:400,marginBottom:12 }}>Upcoming Events</h3>
          {up.length===0?<p style={{ fontSize:13,color:"var(--m)",textAlign:"center",padding:14 }}>No upcoming events</p>:up.map(ev=>(
            <div key={ev.id} style={{ display:"flex",alignItems:"center",gap:9,marginBottom:9,padding:"7px 9px",background:"var(--l)",borderRadius:6 }}>
              <div style={{ width:3,height:32,borderRadius:2,background:EC[ev.type],flexShrink:0 }} />
              <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:500 }}>{ev.title}</div><div style={{ fontSize:11,color:"var(--m)" }}>{ev.date} · {ev.type}</div></div>
              {ev.amount>0&&<div style={{ fontSize:12,color:"var(--r)",fontWeight:500 }}>{peso(ev.amount)}</div>}
            </div>
          ))}
        </Card>
        <Card>
          <h3 className="sf" style={{ fontSize:19,fontWeight:400,marginBottom:12 }}>Pending Balances</h3>
          {unpaid.length===0?<p style={{ fontSize:13,color:"var(--su)",textAlign:"center",padding:14 }}>All paid! 🎉</p>:unpaid.map(s=>(
            <div key={s.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9,padding:"7px 9px",background:"var(--l)",borderRadius:6 }}>
              <div><div style={{ fontSize:13,fontWeight:500 }}>{s.name}</div><div style={{ fontSize:11,color:"var(--m)" }}>{s.category}</div></div>
              <div style={{ textAlign:"right" }}><div style={{ fontSize:13,color:"var(--r)",fontWeight:500 }}>{peso(s.total-(s.paid||0))}</div><Badge label={s.status} color={SC[s.status]} /></div>
            </div>
          ))}
        </Card>
        <Card style={{ gridColumn:"1/-1" }}>
          <h3 className="sf" style={{ fontSize:19,fontWeight:400,marginBottom:12 }}>Deadlines</h3>
          {dls.length===0 ? <p style={{ fontSize:13,color:"var(--m)",textAlign:"center",padding:14 }}>No open deadlines. Add a Deadlines tab to the Excel to track tasks here.</p> : (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:8 }}>
              {dls.map(e => { const d = daysUntil(e.date); const c = d < 0 ? "var(--d)" : d <= 14 ? "var(--wa)" : "var(--su)"; return (
                <div key={e.id} style={{ display:"flex",gap:10,alignItems:"center",padding:"8px 10px",background:"var(--l)",borderRadius:6,borderLeft:`3px solid ${c}` }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{e.title}</div>
                    <div style={{ fontSize:11,color:"var(--m)" }}>{e.date}{e.supplier ? ` · ${e.supplier}` : ""}</div>
                  </div>
                  <div style={{ textAlign:"right",flexShrink:0 }}>
                    <div style={{ fontSize:16,fontWeight:600,color:c,lineHeight:1 }}>{d < 0 ? Math.abs(d) : d}</div>
                    <div style={{ fontSize:9,color:"var(--m)",textTransform:"uppercase",letterSpacing:1 }}>{d < 0 ? "days late" : d === 0 ? "today" : "days"}</div>
                  </div>
                </div>); })}
            </div>
          )}
        </Card>
        <Card style={{ gridColumn:"1/-1" }}>
          <h3 className="sf" style={{ fontSize:19,fontWeight:400,marginBottom:14 }}>OOT & Crew Meals Tracker</h3>
          {(() => {
            const misc = suppliers.filter(s => s.hasOOT || s.hasCrew);
            const sum = (arr, f) => arr.reduce((a, s) => a + f(s), 0);
            const crewOf = s => s.hasCrew ? num(s.crewMeals) : 0, ootOf = s => s.hasOOT ? num(s.ootFee) : 0;
            const onTop = misc.filter(s => !s.inContract), inside = misc.filter(s => s.inContract);
            const totalCrew = sum(misc, crewOf), totalOOT = sum(misc, ootOf);
            const cashOnDay = sum(onTop, s => crewOf(s) + ootOf(s)), insideAmt = sum(inside, s => crewOf(s) + ootOf(s));
            const totalPax = sum(misc, s => num(s.crewPax));
            return (
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16 }}>
                {[["Crew Meals", totalCrew, "var(--g)", `${totalPax} pax`], ["OOT Fees", totalOOT, "var(--b)", `${misc.filter(s=>s.hasOOT).length} suppliers`], ["Cash on the day", cashOnDay, "var(--r)", "on top of contracts"], ["Inside contracts", insideAmt, "var(--su)", "already committed"]].map(([l, v, c, sub]) => (
                  <div key={l} style={{ background:"var(--l)",borderRadius:8,padding:12,textAlign:"center" }}>
                    <div style={{ fontSize:9,color:"var(--m)",letterSpacing:1,textTransform:"uppercase",marginBottom:4 }}>{l}</div>
                    <div className="sf" style={{ fontSize:22,color:c,fontWeight:300 }}>{peso(v)}</div>
                    <div style={{ fontSize:10,color:"var(--m)" }}>{sub}</div>
                  </div>
                ))}
              </div>
            );
          })()}
          <div style={{ fontSize:10,color:"var(--m)",letterSpacing:1.5,textTransform:"uppercase",marginBottom:10,fontWeight:500 }}>Breakdown by Supplier</div>
          {suppliers.filter(s=>s.hasOOT||s.hasCrew).map(s=>(
            <div key={s.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 10px",background:"var(--cr)",borderRadius:6,marginBottom:6 }}>
              <div>
                <div style={{ fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:6 }}>{s.name}<Badge label={s.inContract ? "In contract" : "On top"} color={s.inContract ? "var(--su)" : "var(--r)"} /></div>
                <div style={{ fontSize:11,color:"var(--m)" }}>{s.category}{s.crewPax ? ` · ${s.crewPax} pax × ${peso(s.mealRate)}` : ""}</div>
              </div>
              <div style={{ display:"flex",gap:16,alignItems:"center" }}>
                {s.hasOOT&&<div style={{ textAlign:"right" }}><div style={{ fontSize:9,color:"var(--b)",letterSpacing:1,textTransform:"uppercase" }}>OOT</div><div style={{ fontSize:13,color:"var(--b)",fontWeight:500 }}>{peso(s.ootFee)}</div></div>}
                {s.hasCrew&&<div style={{ textAlign:"right" }}><div style={{ fontSize:9,color:"var(--g)",letterSpacing:1,textTransform:"uppercase" }}>Meals</div><div style={{ fontSize:13,color:"var(--g)",fontWeight:500 }}>{peso(s.crewMeals)}</div></div>}
                <div style={{ textAlign:"right" }}><div style={{ fontSize:9,color:"var(--m)",letterSpacing:1,textTransform:"uppercase" }}>Subtotal</div><div style={{ fontSize:13,fontWeight:600 }}>{peso((s.hasOOT?num(s.ootFee):0)+(s.hasCrew?num(s.crewMeals):0))}</div></div>
              </div>
            </div>
          ))}
          {suppliers.filter(s=>s.hasOOT||s.hasCrew).length===0&&<p style={{ fontSize:13,color:"var(--m)",textAlign:"center",padding:12 }}>No OOT or crew meal costs logged yet.</p>}
          <div style={{ borderTop:"1px solid var(--l)",marginTop:10,paddingTop:10,display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600 }}>
            <span>All misc costs (in contract + on top)</span>
            <span style={{ color:"var(--r)" }}>{peso(suppliers.reduce((a,s)=>a+(s.hasOOT?num(s.ootFee):0)+(s.hasCrew?num(s.crewMeals):0),0))}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}


/* ─── Analysis tab ────────────────────────────────────────────────────────── */
function AnalysisTab({ suppliers, budget, events, totalBudget }) {
  const today = todayISO();
  const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);

  /* Budget vs committed vs paid */
  const byCat = useMemo(() => {
    const m = {};
    suppliers.forEach(s => { const c = s.category || "Others"; if (!m[c]) m[c] = { committed: 0, paid: 0, n: 0 }; m[c].committed += num(s.total); m[c].paid += num(s.paid); m[c].n++; });
    return m;
  }, [suppliers]);
  const rows = budget.map(b => { const x = byCat[b.category] || { committed: 0, paid: 0, n: 0 }; return { ...b, ...x, variance: num(b.estimated) - x.committed }; });
  const orphan = Object.keys(byCat).filter(c => !budget.some(b => b.category === c)).map(c => ({ id: "o-" + c, category: c, estimated: 0, ...byCat[c], variance: -byCat[c].committed }));
  const all = [...rows, ...orphan];
  const overs = all.filter(r => r.variance < 0).sort((a, b) => a.variance - b.variance);
  const unders = all.filter(r => r.variance > 0 && r.committed > 0).sort((a, b) => b.variance - a.variance);
  const tAlloc = sum(budget, b => num(b.estimated)), tCommit = sum(suppliers, s => num(s.total)), tPaid = sum(suppliers, s => num(s.paid));
  const cap = num(totalBudget);

  /* Payment schedule */
  const pay = events.filter(e => e.type === "Payment Due");
  const overdue = pay.filter(e => e.date < today).sort((a, b) => a.date.localeCompare(b.date));
  const byMonth = useMemo(() => { const m = {}; pay.forEach(e => { const k = e.date.slice(0, 7); m[k] = (m[k] || 0) + num(e.amount); }); return Object.entries(m).sort(([a], [b]) => a.localeCompare(b)); }, [pay]);
  const maxMonth = Math.max(1, ...byMonth.map(([, v]) => v));
  const supplierOf = e => e.supplier || (e.title || "").split(" – ")[0];
  const scheduled = {}; pay.forEach(e => { const k = supplierOf(e).toLowerCase(); scheduled[k] = (scheduled[k] || 0) + num(e.amount); });
  const unscheduled = suppliers.map(s => ({ s, gap: (num(s.total) - num(s.paid)) - (scheduled[s.name.toLowerCase()] || 0) })).filter(x => x.gap > 0.5).sort((a, b) => b.gap - a.gap);
  const tOutstanding = tCommit - tPaid, tScheduled = sum(pay, e => num(e.amount)), tUnscheduled = sum(unscheduled, x => x.gap);

  /* Deadlines */
  const dls = events.filter(e => e.type === "Deadline");
  const dlOpen = dls.filter(e => !e.done).sort((a, b) => a.date.localeCompare(b.date));
  const dlLate = dlOpen.filter(e => e.date < today), dlSoon = dlOpen.filter(e => e.date >= today && daysUntil(e.date) <= 30);

  /* Wedding-day cash */
  const onTop = suppliers.filter(s => !s.inContract && (s.hasCrew || s.hasOOT)).map(s => ({ name: s.name, what: [s.hasCrew && `crew meals${s.crewPax ? ` (${s.crewPax} pax)` : ""}`, s.hasOOT && "OOT"].filter(Boolean).join(" + "), amt: (s.hasCrew ? num(s.crewMeals) : 0) + (s.hasOOT ? num(s.ootFee) : 0) }));
  const onDay = pay.filter(e => e.date === WEDDING_ISO).map(e => ({ name: supplierOf(e), what: e.title.split(" – ")[1] || "balance", amt: num(e.amount) }));
  const dayCash = [...onDay, ...onTop];

  const H = ({ children, sub }) => <div style={{ marginBottom: 12 }}><h3 className="sf" style={{ fontSize: 19, fontWeight: 400 }}>{children}</h3>{sub && <p style={{ fontSize: 11, color: "var(--m)" }}>{sub}</p>}</div>;
  const Stat = ({ l, v, c, sub }) => <div style={{ background: "var(--l)", borderRadius: 8, padding: 12, textAlign: "center" }}><div style={{ fontSize: 9, color: "var(--m)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{l}</div><div className="sf" style={{ fontSize: 22, color: c || "var(--ink)", fontWeight: 300 }}>{v}</div>{sub && <div style={{ fontSize: 10, color: "var(--m)" }}>{sub}</div>}</div>;

  return (
    <div className="fade">
      {/* headline */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
        <Stat l="Budget cap" v={cap ? peso(cap) : "—"} />
        <Stat l="Allocated" v={peso(tAlloc)} c={cap && tAlloc > cap ? "var(--d)" : "var(--ink)"} sub={cap ? `${Math.round(tAlloc / cap * 100)}% of cap` : ""} />
        <Stat l="Committed" v={peso(tCommit)} c={tCommit > tAlloc ? "var(--d)" : "var(--b)"} sub={`${tCommit > tAlloc ? "over" : "under"} allocation by ${peso(Math.abs(tAlloc - tCommit))}`} />
        <Stat l="Paid" v={peso(tPaid)} c="var(--su)" sub={`${tCommit ? Math.round(tPaid / tCommit * 100) : 0}% of committed`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* over budget */}
        <Card>
          <H sub="Contract totals vs your allocation. Red rows are already committed beyond budget.">Over Budget</H>
          {overs.length === 0 ? <p style={{ fontSize: 13, color: "var(--su)", textAlign: "center", padding: 14 }}>Nothing over allocation.</p> : overs.map(r => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "rgba(196,122,122,.10)", borderRadius: 6, marginBottom: 6, borderLeft: "3px solid var(--d)" }}>
              <div><div style={{ fontSize: 13, fontWeight: 500 }}>{r.category}</div><div style={{ fontSize: 11, color: "var(--m)" }}>{peso(r.committed)} committed vs {peso(r.estimated)} allocated{r.estimated === 0 ? " (no budget line)" : ""}</div></div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--d)" }}>+{peso(-r.variance)}</div>
            </div>
          ))}
          {overs.length > 0 && <div style={{ fontSize: 12, marginTop: 8, textAlign: "right", color: "var(--d)", fontWeight: 500 }}>Total overrun {peso(sum(overs, r => -r.variance))}</div>}
        </Card>
        {/* headroom */}
        <Card>
          <H sub="Where allocation exceeds what's been committed.">Headroom</H>
          {unders.slice(0, 8).map(r => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "var(--l)", borderRadius: 6, marginBottom: 4 }}>
              <div style={{ fontSize: 13 }}>{r.category}</div><div style={{ fontSize: 13, fontWeight: 500, color: "var(--su)" }}>{peso(r.variance)}</div>
            </div>
          ))}
          {unders.length > 8 && <div style={{ fontSize: 11, color: "var(--m)", marginTop: 6 }}>+{unders.length - 8} more with headroom · total {peso(sum(unders, r => r.variance))}</div>}
        </Card>
      </div>

      {/* full category table */}
      <Card style={{ padding: 0, overflow: "auto", marginBottom: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
          <thead><tr style={{ background: "var(--l)" }}>{["Category", "Allocated", "Committed", "Paid", "Variance", ""].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: h === "Category" ? "left" : "right", fontSize: 10, letterSpacing: 1.5, color: "var(--m)", textTransform: "uppercase", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
          <tbody>
            {[...all].sort((a, b) => a.variance - b.variance).map((r, i) => {
              const pct = r.estimated > 0 ? Math.min(100, r.committed / r.estimated * 100) : (r.committed > 0 ? 100 : 0);
              return (<tr key={r.id} style={{ borderTop: "1px solid var(--l)", background: i % 2 === 0 ? "var(--wh)" : "var(--cr)" }}>
                <td style={{ padding: "9px 12px", fontWeight: 500 }}>{r.category}<span style={{ color: "var(--m)", fontWeight: 400, fontSize: 11 }}>{r.n ? ` · ${r.n}` : ""}</span></td>
                <td style={{ padding: "9px 12px", textAlign: "right" }}>{peso(r.estimated)}</td>
                <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--b)" }}>{peso(r.committed)}</td>
                <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--su)" }}>{peso(r.paid)}</td>
                <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: r.variance < 0 ? "var(--d)" : "var(--su)" }}>{r.variance < 0 ? "−" : "+"}{peso(Math.abs(r.variance))}</td>
                <td style={{ padding: "9px 12px", minWidth: 90 }}><div style={{ height: 5, background: "var(--l)", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: r.variance < 0 ? "var(--d)" : pct > 85 ? "var(--wa)" : "var(--r)" }} /></div></td>
              </tr>);
            })}
          </tbody>
        </table>
      </Card>

      {/* cash flow */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14, marginBottom: 14 }}>
        <Card>
          <H sub={`${peso(tOutstanding)} outstanding · ${peso(tScheduled)} scheduled · ${peso(tUnscheduled)} not yet dated`}>Cash Needed by Month</H>
          {byMonth.length === 0 ? <p style={{ fontSize: 13, color: "var(--m)", textAlign: "center", padding: 14 }}>No pending payments dated.</p> : (() => { let cum = 0; return byMonth.map(([k, v]) => { cum += v; const late = k < today.slice(0, 7); return (
            <div key={k} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span style={{ fontWeight: 500, color: late ? "var(--d)" : "var(--ink)" }}>{monthLabel(k)}{late ? " · overdue" : ""}</span>
                <span><strong>{peso(v)}</strong> <span style={{ color: "var(--m)", fontSize: 11 }}>· cum {peso(cum)}</span></span>
              </div>
              <div style={{ height: 10, background: "var(--l)", borderRadius: 5, overflow: "hidden" }}><div style={{ height: "100%", width: `${v / maxMonth * 100}%`, background: late ? "var(--d)" : "var(--r)", borderRadius: 5 }} /></div>
            </div>); }); })()}
          {tUnscheduled > 0 && <p style={{ fontSize: 11, color: "var(--wa)", marginTop: 8 }}>⚠ {peso(tUnscheduled)} of balances have no due date in Excel and are not in these bars.</p>}
        </Card>
        <Card>
          <H sub="Pending rows past their due date — pay, or update the date in Excel.">Overdue Payments</H>
          {overdue.length === 0 ? <p style={{ fontSize: 13, color: "var(--su)", textAlign: "center", padding: 14 }}>Nothing overdue.</p> : overdue.map(e => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 10px", background: "rgba(196,122,122,.10)", borderRadius: 6, marginBottom: 5 }}>
              <div><div style={{ fontSize: 13, fontWeight: 500 }}>{supplierOf(e)}</div><div style={{ fontSize: 11, color: "var(--m)" }}>{e.date} · {Math.abs(daysUntil(e.date))} days late</div></div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--d)" }}>{peso(e.amount)}</div>
            </div>
          ))}
          {overdue.length > 0 && <div style={{ fontSize: 12, textAlign: "right", color: "var(--d)", fontWeight: 500, marginTop: 6 }}>{peso(sum(overdue, e => num(e.amount)))}</div>}
          {unscheduled.length > 0 && <>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--m)", margin: "14px 0 6px" }}>Balance with no due date</div>
            {unscheduled.map(({ s, gap }) => <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 10px", background: "var(--l)", borderRadius: 5, marginBottom: 3 }}><span>{s.name}</span><span style={{ color: "var(--wa)", fontWeight: 500 }}>{peso(gap)}</span></div>)}
          </>}
        </Card>
      </div>

      {/* deadlines + day cash */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <H sub={`${dlOpen.length} open · ${dlLate.length} late · ${dlSoon.length} due within 30 days`}>Deadline Watch</H>
          {dlOpen.length === 0 ? <p style={{ fontSize: 13, color: "var(--m)", textAlign: "center", padding: 14 }}>No deadlines loaded.</p> : [...dlLate, ...dlOpen.filter(e => e.date >= today)].slice(0, 12).map(e => { const d = daysUntil(e.date); const c = d < 0 ? "var(--d)" : d <= 14 ? "var(--wa)" : "var(--m)"; return (
            <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 10px", background: d < 0 ? "rgba(196,122,122,.10)" : "var(--l)", borderRadius: 6, marginBottom: 4 }}>
              <div style={{ width: 44, textAlign: "center", flexShrink: 0 }}><div style={{ fontSize: 15, fontWeight: 600, color: c, lineHeight: 1 }}>{Math.abs(d)}</div><div style={{ fontSize: 8, color: "var(--m)", textTransform: "uppercase" }}>{d < 0 ? "late" : "days"}</div></div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</div><div style={{ fontSize: 10, color: "var(--m)" }}>{e.date}{e.supplier ? ` · ${e.supplier}` : ""}</div></div>
            </div>); })}
        </Card>
        <Card>
          <H sub="Balances dated on the wedding day plus crew meals / OOT that are on top of contracts.">Wedding-Day Cash Sheet</H>
          {dayCash.length === 0 ? <p style={{ fontSize: 13, color: "var(--m)", textAlign: "center", padding: 14 }}>Nothing due on the day.</p> : dayCash.map((x, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "var(--l)", borderRadius: 6, marginBottom: 4, fontSize: 12 }}>
              <span><strong>{x.name}</strong> <span style={{ color: "var(--m)" }}>· {x.what}</span></span><span style={{ fontWeight: 600 }}>{peso(x.amt)}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--l)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}><span>Bring on the day</span><span style={{ color: "var(--r)" }}>{peso(sum(dayCash, x => x.amt))}</span></div>
        </Card>
      </div>
    </div>
  );
}

function Dashboard({ onLogout, onAuthLost }) {
  const [tab, setTab] = useState("overview");
  const [suppliers, setSuppliers] = useState(INIT_S);
  const [guests, setGuests] = useState(INIT_G);
  const [budget, setBudget] = useState(INIT_B);
  const [events, setEvents] = useState(INIT_E);
  const [totalBudget, setTotalBudget] = useState(0);
  const [lastImport, setLastImport] = useState(null);
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const initDone = useRef(false);

  useEffect(() => {
    sbLoad().then(d => {
      if (d.suppliers?.length) setSuppliers(d.suppliers);
      if (d.guests?.length) setGuests(d.guests);
      if (d.budget) setBudget(d.budget);
      if (d.events?.length) setEvents(d.events);
      if (d.totalBudget !== null) setTotalBudget(d.totalBudget);
      if (d.lastImport) setLastImport(Number(d.lastImport));
      setLoading(false); initDone.current = true;
    }).catch(err => {
      if (/JWT|401|permission|row-level|RLS|not authenticated/i.test(String(err?.message))) { onAuthLost(); return; }
      setLoadError(true); setLoading(false); initDone.current = true;
    });
  }, []);

  const [saveErr, setSaveErr] = useState("");
  const [retryTick, setRetryTick] = useState(0);
  useEffect(() => {
    if (!initDone.current) return;
    setSaved(false);
    const t = setTimeout(() => {
      sbSave(suppliers, guests, budget, events, totalBudget, lastImport)
        .then(() => { setSaved(true); setSaveErr(""); })
        .catch(err => { setSaved("error"); setSaveErr(err?.message || "unknown"); setTimeout(() => setRetryTick(n => n + 1), 15000); });
    }, 700);
    return () => clearTimeout(t);
  }, [suppliers, guests, budget, events, totalBudget, lastImport, retryTick]);

  const tabs = [
    { id:"overview",  label:"Overview",  icon:"◈" },
    { id:"suppliers", label:"Suppliers", icon:"₱" },
    { id:"calendar",  label:"Calendar",  icon:"◷" },
    { id:"budget",    label:"Budget",    icon:"◉" },
    { id:"analysis",  label:"Analysis",  icon:"◬" },
    { id:"guests",    label:"Guests",    icon:"◎" },
  ];

  if (loading) return (
    <div style={{ minHeight:"100vh",background:"var(--cr)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16 }}>
      <FlowerLogo size={48} color="#C4967A" />
      <p style={{ fontSize:10,letterSpacing:4,color:"var(--m)",textTransform:"uppercase" }}>Loading your data…</p>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:"var(--cr)",display:"flex" }}>
      {/* Desktop sidebar */}
      <div className="dash-sidebar" style={{ width:200,background:"var(--ink)",display:"flex",flexDirection:"column",flexShrink:0,position:"sticky",top:0,height:"100vh",overflowY:"auto" }}>
        <div style={{ padding:"22px 16px 14px",borderBottom:"1px solid rgba(255,255,255,.07)" }}>
          <p style={{ fontSize:8,letterSpacing:4,color:"var(--g)",textTransform:"uppercase",marginBottom:3 }}>Wedding Planner</p>
          <h2 className="sf" style={{ fontSize:17,fontWeight:300,color:"var(--cr)",lineHeight:1.35 }}>Chicco &amp;<br />Michelle</h2>
          <p style={{ fontSize:10,color:"#6A5E58",marginTop:3 }}>Jan 15, 2027</p>
        </div>
        <nav style={{ flex:1,padding:"12px 8px" }}>
          {tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{ width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 11px",borderRadius:7,border:"none",marginBottom:2,fontSize:12,fontFamily:"'Jost',sans-serif",transition:"all .15s",background:tab===t.id?"rgba(196,150,122,.15)":"transparent",color:tab===t.id?"var(--r)":"#8A7E78",borderLeft:tab===t.id?"2px solid var(--r)":"2px solid transparent" }}><span>{t.icon}</span>{t.label}</button>))}
        </nav>
        <div style={{ padding:"12px 10px",borderTop:"1px solid rgba(255,255,255,.07)" }}>
          <div style={{ fontSize:10,color:saved==="error"?"var(--d)":"#6A5E58",marginBottom:3,paddingLeft:10 }} title={saveErr}>{saved===true?"✓ Saved":saved==="error"?"⚠ Not saved — retrying":"Saving…"}</div>
          {lastImport && <div style={{ fontSize:9,color:"#6A5E58",marginBottom:7,paddingLeft:10 }}>Excel: {new Date(lastImport).toLocaleDateString("en-PH",{month:"short",day:"numeric"})}</div>}
          <button onClick={onLogout} style={{ width:"100%",padding:"8px 11px",border:"none",borderRadius:7,background:"rgba(255,255,255,.04)",color:"#8A7E78",fontSize:11,cursor:"pointer",textAlign:"left",fontFamily:"'Jost',sans-serif" }}>← Lock</button>
        </div>
      </div>

      {/* Main content */}
      <div className="dash-content" style={{ flex:1,padding:"22px",overflow:"auto" }}>
        <div style={{ maxWidth:1100,margin:"0 auto" }}>
          {loadError&&(<div style={{ background:"rgba(196,122,122,.12)",border:"1px solid var(--d)",borderRadius:8,padding:"10px 16px",marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12 }}><span style={{ fontSize:12,color:"var(--d)" }}>⚠ Could not reach the database — showing default data. If the Supabase project is paused, restore it at supabase.com, then reload before importing.</span><button onClick={()=>setLoadError(false)} style={{ background:"none",border:"none",color:"var(--d)",fontSize:18,cursor:"pointer",lineHeight:1 }}>×</button></div>)}
          {saved==="error"&&(<div style={{ background:"rgba(196,122,122,.12)",border:"1px solid var(--d)",borderRadius:8,padding:"10px 16px",marginBottom:18,fontSize:12,color:"var(--d)" }}>⚠ Changes are NOT being saved ({saveErr}). Retrying automatically — do not close this page until it says Saved.</div>)}
          <div style={{ marginBottom:18 }}>
            <h1 className="sf" style={{ fontSize:28,fontWeight:300,color:"var(--ink)" }}>{tabs.find(t=>t.id===tab)?.label}</h1>
            <p style={{ fontSize:12,color:"var(--m)" }}>Chicco &amp; Michelle · January 15, 2027</p>
          </div>
          {tab==="overview"  && <OverviewTab  suppliers={suppliers} guests={guests} budget={budget} events={events} totalBudget={totalBudget} />}
          {tab==="suppliers" && <SuppliersTab suppliers={suppliers} setSuppliers={setSuppliers} budget={budget} setBudget={setBudget} events={events} setEvents={setEvents} totalBudget={totalBudget} setTotalBudget={setTotalBudget} lastImport={lastImport} setLastImport={setLastImport} />}
          {tab==="calendar"  && <CalendarTab  events={events} setEvents={setEvents} />}
          {tab==="budget"    && <BudgetTab    budget={budget} setBudget={setBudget} totalBudget={totalBudget} setTotalBudget={setTotalBudget} suppliers={suppliers} />}
          {tab==="guests"    && <GuestsTab    guests={guests} setGuests={setGuests} />}
          {tab==="analysis"  && <AnalysisTab  suppliers={suppliers} budget={budget} events={events} totalBudget={totalBudget} />}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={tab===t.id?"active":""}>
            <span className="bn-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  useEffect(() => { injectStyles(); }, []);
  const [page, setPage] = useState("landing");
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s || null));
    return () => sub.subscription.unsubscribe();
  }, []);
  const enter = () => setPage(session ? "dashboard" : "gate");
  const logout = async () => { await sb.auth.signOut(); setPage("landing"); };
  return (
    <div>
      {page === "landing"   && <Landing   onEnter={enter} />}
      {page === "gate"      && <Gate      onOk={() => setPage("dashboard")} onBack={() => setPage("landing")} />}
      {page === "dashboard" && (session ? <Dashboard onLogout={logout} onAuthLost={() => setPage("gate")} /> : <Gate onOk={() => setPage("dashboard")} onBack={() => setPage("landing")} />)}
    </div>
  );
}
