import { useState, useEffect } from "react";

// ─── SUPABASE ────────────────────────────────────────────────
const SUPABASE_URL = "https://ftbyhvfiljbjvvsurcsv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0YnlodmZpbGpianZ2c3VyY3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NTcxNjIsImV4cCI6MjA5NzAzMzE2Mn0.ZawO0j3JvmOvTLCwVJSN-Rw-lAGAY5BI86DXtYukidE";

const sb = async (path, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
    },
    ...options,
  });
  if (!res.ok) { const e = await res.text(); console.error("Supabase error:", e); return null; }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const dbGetReports = async () => {
  const data = await sb("reports?select=*&order=date_key.asc");
  if (!data) return {};
  const result = {};
  data.forEach(row => {
    if (!result[row.date_key]) result[row.date_key] = {};
    result[row.date_key][row.shift] = {
      manager: row.manager,
      diners: row.diners,
      avgPerDiner: row.avg_per_diner,
      staffMeals: row.staff_meals,
      deliveries: { total: row.deliveries_total, wolt: row.deliveries_wolt, private: row.deliveries_private||0, ta: row.deliveries_ta||0 },
      cancelRestaurant: row.cancel_restaurant || [],
      cancelDelivery: row.cancel_delivery || [],
      topDishes: row.top_dishes || [],
      operationalIssues: row.operational_issues || [],
    };
  });
  return result;
};

const dbSaveReport = async (dateKey, shift, data) => {
  const row = {
    date_key: dateKey,
    shift: shift,
    manager: data.manager || "",
    diners: data.diners || 0,
    avg_per_diner: data.avgPerDiner || 0,
    staff_meals: data.staffMeals || 0,
    deliveries_total: data.deliveries?.total || 0,
    deliveries_wolt: data.deliveries?.wolt || 0,
    deliveries_private: data.deliveries?.private || 0,
    deliveries_ta: data.deliveries?.ta || 0,
    cancel_restaurant: data.cancelRestaurant || [],
    cancel_delivery: data.cancelDelivery || [],
    top_dishes: data.topDishes || [],
    operational_issues: data.operationalIssues || [],
  };
  await sb("reports?on_conflict=date_key,shift", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify(row),
  });
};

const dbGetRevenue = async () => {
  const data = await sb("daily_revenue?select=*");
  if (!data) return {};
  const result = {};
  data.forEach(row => { result[row.date_key] = row.revenue; });
  return result;
};

const dbSaveRevenue = async (dateKey, revenue) => {
  await sb("daily_revenue?on_conflict=date_key", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify({ date_key: dateKey, revenue }),
  });
};



// ─── CONSTANTS ────────────────────────────────────────────────
const PIN = "1234";
const DAYS_SHORT = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
const DAYS_HE    = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
const MANAGERS   = ["אווה","יובל","מיכל"];
const OPS_OPTIONS = ["מחסור במלאי","עיכוב במטבח","תקלת ציוד","בעיית כוח אדם","אחר"];
const MENU_CATEGORIES = {
  "מנות פתיחה": ["נקניקיות מרגז","חציל מדורה","חלת בצל","סיגרים","כנפים","קרפצ׳יו","נאגטס עוף","ציפס אמריקאי","לחם הבית","אחר"],
  "המבורגרים":  ["המבורג 250","המבורג 330","בורגר 160","קלאסי 220","לארגו 340","טריפל המבורג","המבורגר אנטריקוט","בורגר רידיפיין (טבעוני)","שחיתות 250","אנטריקוט טלה 250","אחר"],
  "לא רק המבורגרים": ["שניצל עוף","טורטיה עוף","כריך אסאדו","כריך סינטה","כריך חזה עוף","חזה עוף במרינדה","כבד עוף","קבבוני טלה","סטייק אנטריקוט מיושן","אחר"],
  "סלטים":  ["סלט פורטובלו","סלט סינטה","סלט קיסר","אחר"],
  "קינוחים": ["מסקרפונה קדאיף","פרמידת ברולה","וופל בלגי","סופלה שוקולד","בר שוקולד","כדור גלידה","אחר"],
};

const fmt  = (n) => "₪" + Math.round(n).toLocaleString("he-IL");
const fmtK = (n) => n >= 1000 ? (n/1000).toFixed(0)+"k" : Math.round(n);
const getMonthName = (d) => ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"][d.getMonth()];
const dateKey = (d) => d.toISOString().split("T")[0];

// ─── MOCK SEED DATA ───────────────────────────────────────────
const seedReports = () => {
  return {
  "2026-06-01": {
    lunch: { manager:"אווה", diners:37, avgPerDiner:0, staffMeals:0, deliveries:{total:28,wolt:10}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
    dinner: { manager:"אווה", diners:85, avgPerDiner:0, staffMeals:0, deliveries:{total:21,wolt:11}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
  },
  "2026-06-02": {
    lunch: { manager:"אווה", diners:26, avgPerDiner:0, staffMeals:0, deliveries:{total:28,wolt:12}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
    dinner: { manager:"מיכל", diners:86, avgPerDiner:0, staffMeals:0, deliveries:{total:25,wolt:14}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
  },
  "2026-06-03": {
    lunch: { manager:"אווה", diners:25, avgPerDiner:0, staffMeals:0, deliveries:{total:41,wolt:22}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
    dinner: { manager:"אווה", diners:98, avgPerDiner:0, staffMeals:0, deliveries:{total:21,wolt:14}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
  },
  "2026-06-04": {
    lunch: { manager:"", diners:55, avgPerDiner:0, staffMeals:0, deliveries:{total:32,wolt:12}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
    dinner: { manager:"אווה", diners:177, avgPerDiner:0, staffMeals:0, deliveries:{total:22,wolt:16}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
  },
  "2026-06-05": {
    lunch: { manager:"מיכל", diners:94, avgPerDiner:0, staffMeals:0, deliveries:{total:18,wolt:13}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
    dinner: { manager:"מיכל", diners:217, avgPerDiner:0, staffMeals:0, deliveries:{total:56,wolt:33}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
  },
  "2026-06-06": {
    lunch: { manager:"יובל", diners:182, avgPerDiner:0, staffMeals:0, deliveries:{total:59,wolt:42}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
    dinner: { manager:"אווה", diners:179, avgPerDiner:0, staffMeals:0, deliveries:{total:42,wolt:33}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
  },
  "2026-06-07": {
    lunch: { manager:"", diners:15, avgPerDiner:0, staffMeals:0, deliveries:{total:26,wolt:18}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
    dinner: { manager:"מיכל", diners:69, avgPerDiner:0, staffMeals:0, deliveries:{total:24,wolt:15}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
  },
  "2026-06-08": {
    lunch: { manager:"", diners:28, avgPerDiner:0, staffMeals:0, deliveries:{total:45,wolt:21}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
    dinner: { manager:"", diners:48, avgPerDiner:0, staffMeals:0, deliveries:{total:19,wolt:9}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
  },
  "2026-06-09": {
    lunch: { manager:"", diners:49, avgPerDiner:0, staffMeals:0, deliveries:{total:33,wolt:9}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
    dinner: { manager:"", diners:112, avgPerDiner:0, staffMeals:0, deliveries:{total:21,wolt:10}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
  },
  "2026-06-10": {
    lunch: { manager:"", diners:34, avgPerDiner:0, staffMeals:0, deliveries:{total:43,wolt:19}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
    dinner: { manager:"מיכל", diners:81, avgPerDiner:0, staffMeals:0, deliveries:{total:26,wolt:15}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
  },
  "2026-06-11": {
    lunch: { manager:"אווה", diners:46, avgPerDiner:0, staffMeals:0, deliveries:{total:38,wolt:15}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
    dinner: { manager:"מיכל", diners:182, avgPerDiner:0, staffMeals:0, deliveries:{total:40,wolt:28}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
  },
  "2026-06-12": {
    lunch: { manager:"יובל", diners:42, avgPerDiner:0, staffMeals:0, deliveries:{total:28,wolt:12}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
    dinner: { manager:"אווה", diners:242, avgPerDiner:0, staffMeals:0, deliveries:{total:55,wolt:31}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
  },
  "2026-06-13": {
    lunch: { manager:"יובל", diners:171, avgPerDiner:0, staffMeals:0, deliveries:{total:30,wolt:22}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
    dinner: { manager:"אווה", diners:190, avgPerDiner:0, staffMeals:0, deliveries:{total:43,wolt:27}, cancelRestaurant:[], cancelDelivery:[], topDishes:[], operationalIssues:[] },
  },
  };
};

// ─── EMPTY FORM ───────────────────────────────────────────────
const emptyForm = () => ({
  manager:"", diners:"", avgPerDiner:"", woltDeliveries:"", privateDeliveries:"", taDeliveries:"",
  staffMeals:"",
  cancelRestaurant: Array(5).fill(null).map(()=>({item:"",reason:"",amount:""})),
  cancelDelivery:   Array(5).fill(null).map(()=>({item:"",reason:"",amount:""})),
  topDishes:["",""], topDishesOther:["",""],
  operationalIssues:[], operationalNotes:{},
});

// ═══════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const isStaff = window.location.pathname === "/staff";

  const [reports, setReports] = useState(seedReports());
  const [manualRev, setManualRev] = useState({});
  const [loading, setLoading] = useState(!isStaff);

  useEffect(() => {
    if (isStaff) return;
    const load = async () => {
      try {
        const [reps, revs] = await Promise.all([dbGetReports(), dbGetRevenue()]);
        setReports(prev => ({ ...prev, ...reps }));
        setManualRev(revs);
      } catch(e) { console.error("Load error:", e); }
      setLoading(false);
    };
    load();
  }, []);

  const submitShift = async (dateStr, shift, data) => {
    setReports(prev => ({ ...prev, [dateStr]: { ...(prev[dateStr]||{}), [shift]: data } }));
    await dbSaveReport(dateStr, shift, data);
  };

  const saveRevenue = async (dateKey, revenue) => {
    setManualRev(prev => ({ ...prev, [dateKey]: revenue }));
    await dbSaveRevenue(dateKey, revenue);
  };

  if (isStaff) return (
    <ShiftApp reports={reports} onSubmit={submitShift} onBack={null} staffMode />
  );

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#1a2e1a",flexDirection:"column",gap:16}}>
      <div style={{fontSize:48}}>🍔</div>
      <div style={{color:"#fff",fontSize:18,fontWeight:700}}>Hamburg</div>
      <div style={{color:"#9cb89a",fontSize:14}}>טוען נתונים...</div>
    </div>
  );

  return (
    <OwnerDashboard
      reports={reports} manualRev={manualRev} setManualRev={setManualRev}
      onSubmit={submitShift} onSaveRevenue={saveRevenue} onBack={null} noPinRequired
    />
  );
}


function OwnerDashboard({ reports, manualRev, setManualRev, onSubmit, onSaveRevenue, onBack, noPinRequired }) {
  const [authed,    setAuthed]    = useState(noPinRequired || false);
  const [pin,       setPin]       = useState("");
  const [pinError,  setPinError]  = useState(false);
  const [view,      setView]      = useState("dashboard");
  const [selDay,    setSelDay]    = useState(null);
  const [editRev,   setEditRev]   = useState(null);
  const [tempRev,   setTempRev]   = useState("");

  const today   = new Date();
  const todayK  = dateKey(today);
  const [viewDate, setViewDate] = useState(new Date());
  const viewDateKey = dateKey(viewDate);

  const allRev = {};
  Object.keys(reports).forEach(k => {
    allRev[k] = manualRev[k] !== undefined ? manualRev[k] : null;
  });

  // Month
  const monthStr  = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
  const monthDays = Object.keys(allRev).filter(k=>k.startsWith(monthStr)&&k!==todayK&&allRev[k]).sort();
  const monthTotal   = monthDays.reduce((s,k)=>s+(allRev[k]||0),0);
  const daysInMonth  = new Date(today.getFullYear(),today.getMonth()+1,0).getDate();
  const daysPassed   = monthDays.length;
  const avgDaily     = daysPassed>0 ? monthTotal/daysPassed : 0;
  const projected    = Math.round(avgDaily*daysInMonth);
  const monthDiners  = monthDays.reduce((s,k)=>s+(reports[k]?.lunch?.diners||0)+(reports[k]?.dinner?.diners||0),0);
  const monthDinerAvg= monthDiners>0 ? monthTotal/monthDiners : 0;
  const monthWolt    = monthDays.reduce((s,k)=>s+(reports[k]?.lunch?.deliveries?.wolt||0)+(reports[k]?.dinner?.deliveries?.wolt||0),0);
  const monthTA      = monthDays.reduce((s,k)=>s+(parseInt(reports[k]?.lunch?.deliveries?.ta)||0)+(parseInt(reports[k]?.dinner?.deliveries?.ta)||0),0);
  const monthDel     = monthDays.reduce((s,k)=>s+(reports[k]?.lunch?.deliveries?.total||0)+(reports[k]?.dinner?.deliveries?.total||0),0);

  // Weekly
  const weekDays = [];
  for (let i=6;i>=0;i--) { const d=new Date(today); d.setDate(today.getDate()-i); weekDays.push({key:dateKey(d),date:d,rev:allRev[dateKey(d)]||0}); }
  const weekTotal   = weekDays.filter(d=>d.key!==todayK).reduce((s,d)=>s+d.rev,0);
  const weekDiners  = weekDays.reduce((s,{key})=>s+(reports[key]?.lunch?.diners||0)+(reports[key]?.dinner?.diners||0),0);
  const weekDinerAvg= weekDiners>0 ? weekTotal/weekDiners : 0;
  const weekWolt    = weekDays.reduce((s,{key})=>s+(reports[key]?.lunch?.deliveries?.wolt||0)+(reports[key]?.dinner?.deliveries?.wolt||0),0);
  const weekTA      = weekDays.reduce((s,{key})=>s+(reports[key]?.lunch?.deliveries?.ta||0)+(reports[key]?.dinner?.deliveries?.ta||0),0);
  const weekDel     = weekDays.reduce((s,{key})=>s+(reports[key]?.lunch?.deliveries?.total||0)+(reports[key]?.dinner?.deliveries?.total||0),0);
  const weekStaff   = weekDays.reduce((s,{key})=>s+(reports[key]?.lunch?.staffMeals||0)+(reports[key]?.dinner?.staffMeals||0),0);
  const weekOps     = weekDays.reduce((s,{key})=>s+(reports[key]?.lunch?.operationalIssues?.length||0)+(reports[key]?.dinner?.operationalIssues?.length||0),0);
  const weekOpsMonthTA = weekTA; // keep for reference
  const weekCancelRest = weekDays.reduce((s,{key})=>{
    const r=reports[key];
    return s+(r?.lunch?.cancelRestaurant||[]).reduce((a,c)=>a+(c.amount||0),0)+(r?.dinner?.cancelRestaurant||[]).reduce((a,c)=>a+(c.amount||0),0);
  },0);
  const weekCancelDel = weekDays.reduce((s,{key})=>{
    const r=reports[key];
    return s+(r?.lunch?.cancelDelivery||[]).reduce((a,c)=>a+(c.amount||0),0)+(r?.dinner?.cancelDelivery||[]).reduce((a,c)=>a+(c.amount||0),0);
  },0);
  const weekCancelAmt = weekCancelRest + weekCancelDel;
  const weekCancelCount = weekDays.reduce((s,{key})=>{
    const r=reports[key];
    return s+(r?.lunch?.cancelRestaurant?.length||0)+(r?.lunch?.cancelDelivery?.length||0)+(r?.dinner?.cancelRestaurant?.length||0)+(r?.dinner?.cancelDelivery?.length||0);
  },0);
  const weekCancelPct = weekTotal>0 ? (weekCancelAmt/weekTotal*100).toFixed(1) : "0.0";

  // DoW averages
  const dowAvg={};
  for (let dow=0;dow<7;dow++) {
    const vals=[];
    for (let w=1;w<=4;w++) { const d=new Date(today); d.setDate(today.getDate()-w*7-today.getDay()+dow); const k=dateKey(d); if(allRev[k]) vals.push(allRev[k]); }
    dowAvg[dow]=vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
  }

  // Today
  const todayRep   = reports[viewDateKey];
  const todayDiners= (todayRep?.lunch?.diners||0)+(todayRep?.dinner?.diners||0);
  const todayWolt  = (todayRep?.lunch?.deliveries?.wolt||0)+(todayRep?.dinner?.deliveries?.wolt||0);
  const todayTA    = (todayRep?.lunch?.deliveries?.ta||0)+(todayRep?.dinner?.deliveries?.ta||0);
  const todayDel   = (todayRep?.lunch?.deliveries?.total||0)+(todayRep?.dinner?.deliveries?.total||0);
  const todayStaff = (todayRep?.lunch?.staffMeals||0)+(todayRep?.dinner?.staffMeals||0);
  const todayRev   = manualRev[viewDateKey]||null;
  const todayDinerAvg = todayRev&&todayDiners>0 ? todayRev/todayDiners : null;

  // Delivery breakdown
  const dlv = {
    lunchWolt:  weekDays.reduce((s,{key})=>s+(reports[key]?.lunch?.deliveries?.wolt||0),0),
    lunchTotal: weekDays.reduce((s,{key})=>s+(reports[key]?.lunch?.deliveries?.total||0),0),
    dinnerWolt: weekDays.reduce((s,{key})=>s+(reports[key]?.dinner?.deliveries?.wolt||0),0),
    dinnerTotal:weekDays.reduce((s,{key})=>s+(reports[key]?.dinner?.deliveries?.total||0),0),
  };
  const mdlv = {
    lunchWolt:  monthDays.reduce((s,k)=>s+(reports[k]?.lunch?.deliveries?.wolt||0),0),
    lunchTotal: monthDays.reduce((s,k)=>s+(reports[k]?.lunch?.deliveries?.total||0),0),
    dinnerWolt: monthDays.reduce((s,k)=>s+(reports[k]?.dinner?.deliveries?.wolt||0),0),
    dinnerTotal:monthDays.reduce((s,k)=>s+(reports[k]?.dinner?.deliveries?.total||0),0),
  };

  const avg4wDel = (() => {
    const lw=[],dw=[],lt=[],dt=[];
    for (let w=1;w<=4;w++) {
      let lW=0,dW=0,lT=0,dT=0,days=0;
      for (let i=0;i<7;i++) { const d=new Date(today); d.setDate(today.getDate()-w*7+i-today.getDay()); const k=dateKey(d); if(reports[k]){lW+=reports[k]?.lunch?.deliveries?.wolt||0;dW+=reports[k]?.dinner?.deliveries?.wolt||0;lT+=reports[k]?.lunch?.deliveries?.total||0;dT+=reports[k]?.dinner?.deliveries?.total||0;days++;} }
      if(days>0){lw.push(lW);dw.push(dW);lt.push(lT);dt.push(dT);}
    }
    const avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):0;
    return {lunchWolt:avg(lw),dinnerWolt:avg(dw),lunchTotal:avg(lt),dinnerTotal:avg(dt)};
  })();

  const saveRev = async (key) => { const v=parseInt(tempRev.replace(/,/g,"").replace(/₪/g,"")); if(!isNaN(v)) { setManualRev(p=>({...p,[key]:v})); if(onSaveRevenue) await onSaveRevenue(key,v); } setEditRev(null); setTempRev(""); };
  const handlePin = (d) => {
    if(d==="⌫"){setPin(p=>p.slice(0,-1));return;}
    const n=pin+d; setPin(n);
    if(n.length===4){ if(n===PIN){setAuthed(true);setPin("");setPinError(false);}else{setPinError(true);setTimeout(()=>{setPin("");setPinError(false);},600);} }
  };

  if (!authed) return <PinScreen pin={pin} onDigit={handlePin} error={pinError} onBack={onBack} />;
  if (view==="shift") return <ShiftApp reports={reports} onSubmit={onSubmit} onBack={()=>setView("dashboard")} ownerMode editDate={viewDateKey} />;
  if (view==="history") return <HistoryView reports={reports} manualRev={manualRev} onSelectDay={(k)=>{setSelDay(k);setView("day");}} onBack={()=>setView("dashboard")} />;
  if (view==="excel") return <ExcelImport onSubmit={onSubmit} setManualRev={setManualRev} onBack={()=>setView("dashboard")} />;
  if (view==="day"&&selDay) return <DayView dayKey={selDay} report={reports[selDay]} revenue={manualRev[selDay]||null} onBack={()=>setView("dashboard")} allReports={reports} allRev={manualRev} onSelectDay={(k)=>setSelDay(k)} onSubmit={onSubmit} />;

  const mn = getMonthName(today);
  const prevWeekTotal = (()=>{let t=0;for(let i=13;i>=7;i--){const d=new Date(today);d.setDate(today.getDate()-i);t+=allRev[dateKey(d)]||0;}return t;})();
  const weekVsPrev = prevWeekTotal>0 ? ((weekTotal/prevWeekTotal-1)*100).toFixed(1) : null;
  const lmSame = (()=>{const lm=new Date(today.getFullYear(),today.getMonth()-1,1);const lmS=`${lm.getFullYear()}-${String(lm.getMonth()+1).padStart(2,"0")}`;return Object.keys(allRev).filter(k=>k.startsWith(lmS)).sort().slice(0,daysPassed).reduce((s,k)=>s+(allRev[k]||0),0);})();
  const monthVsLast = lmSame>0 ? ((monthTotal/lmSame-1)*100).toFixed(1) : null;

  return (
    <div style={S.app}>
      <div style={S.header}>
        {onBack ? <button style={{background:"none",border:"none",color:"#fff",fontSize:20,cursor:"pointer"}} onClick={onBack}>←</button> : <span style={{width:30}}/>}
        <span style={S.headerTitle}>Hamburg 🍔</span>
        <span style={S.headerSub}>בעלים</span>
      </div>

      {/* TODAY */}
      <div style={S.card}>
        <div style={{...S.cardHdr, background:"#1a2e1a"}}>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{...S.shiftBadge, background:todayRep?.lunch?"#4a7c3f":"#555"}}>🌅 {todayRep?.lunch?"✓":"—"}</span>
            <span style={{...S.shiftBadge, background:todayRep?.dinner?"#4a7c3f":"#555"}}>🌙 {todayRep?.dinner?"✓":"—"}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{color:"#fff",fontWeight:700,fontSize:15}}>{DAYS_HE[viewDate.getDay()]}, {viewDate.getDate()}/{viewDate.getMonth()+1}</span>
            <div style={{display:"flex",gap:4}}>
              <button style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:14}} onClick={()=>setViewDate(d=>{const n=new Date(d);n.setDate(n.getDate()-1);return n;})}>←</button>
              {viewDateKey!==todayK&&<button style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11}} onClick={()=>setViewDate(new Date())}>היום</button>}
              {viewDateKey!==todayK&&<button style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:14}} onClick={()=>setViewDate(d=>{const n=new Date(d);n.setDate(n.getDate()+1);return n;})}>→</button>}
            </div>
          </div>
        </div>
        <div style={S.cardBody}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {editRev===viewDateKey ? <>
                <button style={S.saveBtn} onClick={()=>saveRev(viewDateKey)}>✓</button>
                <input autoFocus style={{...S.revInput,width:100}} value={tempRev} onChange={e=>setTempRev(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveRev(viewDateKey);}} placeholder="פדיון" />
              </> : <>
                <button style={S.editBtn} onClick={()=>{setEditRev(viewDateKey);setTempRev(todayRev?String(todayRev):"");}}>✏️</button>
                {todayRev&&todayDiners>0&&<span style={{fontSize:12,color:"#666"}}>ממוצע {fmt(todayDinerAvg)}</span>}
              </>}
            </div>
            <div style={{textAlign:"right"}}>
              {todayRev ? <div style={S.bigNum}>{fmt(todayRev)}</div> : <div style={{fontSize:15,color:"#aaa"}}>פדיון לא הוזן</div>}
            </div>
          </div>
          <div style={S.divLine}/>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <span style={S.sub}>עובדים: {todayStaff}</span>
            <span style={S.sub}>{todayDiners} סועדים 👤</span>
          </div>
          <span style={S.sub}>וולט: {todayWolt} | פרטי: {Math.max(0,todayDel-todayWolt-todayTA)} | TA: {todayTA} | סה״כ: {todayDel} 🛵</span>
        </div>
      </div>

      {/* WEEKLY SUMMARY */}
      <GreenCard title={`מכירות השבוע, ${today.getDate()}/${today.getMonth()+1}`}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{display:"flex",flexDirection:"column",gap:5,paddingTop:4}}>
            <SL label="🍽️ ביטולים מסעדה" val={`₪${weekCancelRest}`} down={weekCancelRest>0} neutral={weekCancelRest===0} />
            <SL label="🛵 ביטולים משלוחים" val={`₪${weekCancelDel}`} down={weekCancelDel>0} neutral={weekCancelDel===0} />
            <SL label="בעיות תפעול" val={weekOps} down={weekOps>=1} up={weekOps===0} />
            <SL label="ארוחות עובדים" val={weekStaff} neutral />
          </div>
          <div style={{textAlign:"right"}}>
            <div style={S.bigNum}>{fmt(weekTotal)}</div>
            {weekVsPrev!==null&&<Trend val={weekVsPrev} label="ממוצע 4 שב׳"/>}
          </div>
        </div>
        <div style={S.divLine}/>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
          <span style={S.sub}>{weekDiners} סועדים 👤</span>
          <span style={S.sub}>ממוצע {fmt(weekDinerAvg)}</span>
        </div>
        <span style={S.sub}>וולט: {weekWolt} | פרטי: {Math.max(0,weekDel-weekWolt-weekTA)} | TA: {weekTA} | סה״כ: {weekDel} 🛵</span>
      </GreenCard>

      {/* MONTH PROJECTED */}
      <GreenCard title={`${mn} צפוי`}>
        <div style={S.bigNum}>{fmt(projected)}</div>
        {monthVsLast!==null&&<Trend val={monthVsLast} label="לעומת חודש קודם"/>}
        <div style={S.divLine}/>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
          <span style={S.sub}>{monthDiners.toLocaleString()} סועדים 👤</span>
          <span style={S.sub}>ממוצע {fmt(monthDinerAvg)}</span>
        </div>
        <span style={S.sub}>וולט: {Math.round(monthWolt/daysPassed*daysInMonth)} | פרטי: {Math.round((monthDel-monthWolt)/daysPassed*daysInMonth)} | סה״כ: {Math.round(monthDel/daysPassed*daysInMonth)} 🛵</span>
      </GreenCard>

      {/* MONTH TO DATE */}
      <GreenCard title={`${mn} עד כה`}>
        <div style={S.bigNum}>{fmt(monthTotal)}</div>
        <div style={S.divLine}/>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
          <span style={S.sub}>{monthDiners.toLocaleString()} סועדים 👤</span>
          <span style={S.sub}>ממוצע {fmt(monthDinerAvg)}</span>
        </div>
        <span style={S.sub}>וולט: {monthWolt} | פרטי: {Math.max(0,monthDel-monthWolt-monthTA)} | TA: {monthTA} | סה״כ: {monthDel} 🛵</span>
      </GreenCard>

      {/* WEEKLY TABLE */}
      <div style={S.card}>
        <div style={{...S.cardHdr,background:"#2c5f8a"}}>
          <span style={{color:"#fff",fontSize:18}}>‹</span>
          <span style={{color:"#fff",fontWeight:700,fontSize:15}}>שבוע נוכחי</span>
        </div>
        <div style={S.cardBody}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
            <span style={S.sub}>השוואה לממוצע 4 שבועות</span>
            <span style={{fontSize:20,fontWeight:800}}>{fmt(weekTotal)}</span>
          </div>
          {weekDays.map(({key,date,rev})=>{
            const dow=date.getDay(), avg=dowAvg[dow], isToday=key===todayK;
            const dispRev=isToday?(manualRev[todayK]||0):rev;
            const pct=avg>0&&dispRev>0?Math.round((dispRev/avg)*100):null;
            const good=pct!==null&&pct>=100, editing=editRev===key;
            return (
              <div key={key} style={{...S.uniRow,background:isToday?"#f0f7f0":"transparent"}}
                onClick={()=>{if(!editing&&(dispRev>0||isToday)){setSelDay(key);setView("day");}}}>
                <div style={S.uniDay}>
                  <span style={{fontSize:13,fontWeight:isToday?700:500,color:isToday?"#1a2e1a":"#333"}}>{DAYS_SHORT[dow]}</span>
                  <span style={{fontSize:10,color:"#aaa"}}>{date.getDate()}/{date.getMonth()+1}</span>
                </div>
                <div style={S.uniBar}>
                  {pct!==null?<>
                    <div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:good?"#4a7c3f":"#c0392b",borderRadius:3}}/>
                    <span style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",fontSize:11,fontWeight:700,color:"#fff",background:good?"#4a7c3f":"#c0392b",padding:"1px 5px",borderRadius:3}}>{pct}%</span>
                  </>:<span style={{fontSize:11,color:isToday?"#4a7c3f":"#bbb",paddingRight:6}}>{isToday?"היום":"אין נתון"}</span>}
                </div>
                <div style={S.uniRight} onClick={e=>e.stopPropagation()}>
                  {editing?<div style={{display:"flex",gap:4,alignItems:"center"}}>
                    <button style={S.saveBtn} onClick={()=>saveRev(key)}>✓</button>
                    <input autoFocus style={S.revInput} value={tempRev} onChange={e=>setTempRev(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveRev(key);if(e.key==="Escape")setEditRev(null);}} placeholder="סכום"/>
                  </div>:<div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <button style={S.editBtn} onClick={()=>{setEditRev(key);setTempRev(dispRev?String(dispRev):"");}}>✏️</button>
                    <span style={{fontSize:12,fontWeight:600,color:dispRev?"#111":"#bbb",minWidth:72,textAlign:"left"}}>{dispRev?fmt(dispRev):"—"}</span>
                  </div>}
                </div>
              </div>
            );
          })}
          <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid #eee",display:"flex"}}>
            {[0,1,2,3,4,5,6].map(dow=>(
              <div key={dow} style={{textAlign:"center",flex:1}}>
                <div style={{fontSize:10,color:"#aaa"}}>{DAYS_SHORT[dow]}</div>
                <div style={{fontSize:10,fontWeight:600,color:"#666"}}>{dowAvg[dow]>0?fmtK(dowAvg[dow]):"—"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TOP DISHES */}
      <TopDishesCard reports={reports} weekDays={weekDays} monthDays={monthDays}/>

      {/* DELIVERY BREAKDOWN */}
      <DeliveryCard weekDays={weekDays} reports={reports}/>

      {/* SHIFT REPORT + HISTORY BUTTONS */}
      <div style={{margin:"12px 12px 0",display:"flex",gap:8}}>
        <button style={{flex:1,padding:"12px",background:"#4a7c3f",border:"none",borderRadius:10,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={()=>setView("shift")}>
          <span>📝</span> דוח משמרת
        </button>
        <button style={{flex:1,padding:"12px",background:"#fff",border:"1.5px solid #4a7c3f",borderRadius:10,color:"#4a7c3f",fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}} onClick={()=>setView("history")}>
          <span>🗂️</span> היסטוריה
        </button>
      </div>

      {/* EXCEL IMPORT BUTTON */}
      <div style={{margin:"8px 12px 0"}}>
        <button
          style={{width:"100%",padding:"12px",background:"#fff",border:"1.5px solid #2c5f8a",borderRadius:10,color:"#2c5f8a",fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
          onClick={()=>setView("excel")}
        >
          <span>XLS</span> העלאת דוח אקסל
        </button>
      </div>

      <div style={{height:40}}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHIFT APP
// ═══════════════════════════════════════════════════════════════
function ShiftApp({ reports, onSubmit, onBack, staffMode, ownerMode, editMode }) {
  const [shift,     setShift]    = useState(editMode?.shift || null);
  const [selDate,   setSelDate]  = useState("today");
  const [form,      setForm]     = useState(() => {
    if (editMode?.existing) {
      const e = editMode.existing;
      return {
        ...emptyForm(),
        manager: e.manager||"",
        diners: String(e.diners||""),
        avgPerDiner: String(e.avgPerDiner||""),
        totalDeliveries: String(e.deliveries?.total||""),
        woltDeliveries: String(e.deliveries?.wolt||""),
        staffMeals: String(e.staffMeals||""),
        cancelRestaurant: e.cancelRestaurant?.length ? e.cancelRestaurant.map(c=>({item:c.item||"",reason:c.reason||"",amount:String(c.amount||"")})).concat(Array(Math.max(0,5-e.cancelRestaurant.length)).fill({item:"",reason:"",amount:""})) : emptyForm().cancelRestaurant,
        cancelDelivery: e.cancelDelivery?.length ? e.cancelDelivery.map(c=>({item:c.item||"",reason:c.reason||"",amount:String(c.amount||"")})).concat(Array(Math.max(0,5-e.cancelDelivery.length)).fill({item:"",reason:"",amount:""})) : emptyForm().cancelDelivery,
        topDishes: e.topDishes?.length ? [...e.topDishes,...Array(Math.max(0,3-e.topDishes.length)).fill("")] : ["","",""],
        operationalIssues: e.operationalIssues||[],
      };
    }
    return emptyForm();
  });
  const [step,      setStep]     = useState(1);
  const [submitted, setSubmitted]= useState(false);

  const today     = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
  const activeDate= selDate==="today" ? today : yesterday;
  const dateStr   = `${activeDate.getDate()}/${activeDate.getMonth()+1}/${activeDate.getFullYear()}`;
  const dayStr    = DAYS_HE[activeDate.getDay()];
  const activeDateKey = dateKey(activeDate);

  const up  = (f,v) => setForm(p=>({...p,[f]:v}));
  const upC = (arr,i,f,v)=> setForm(p=>{const c=[...p[arr]];c[i]={...c[i],[f]:v};return{...p,[arr]:c};});
  const upD = (i,v)  => setForm(p=>{const d=[...p.topDishes];d[i]=v;return{...p,topDishes:d};});
  const togOps = o   => setForm(p=>({...p,operationalIssues:p.operationalIssues.includes(o)?p.operationalIssues.filter(x=>x!==o):[...p.operationalIssues,o]}));

  const handleSubmit = () => {
    const data = {
      manager: form.manager,
      diners:  parseInt(form.diners)||0,
      avgPerDiner: parseInt(form.avgPerDiner)||0,
      deliveries: { wolt: parseInt(form.woltDeliveries)||0, total: parseInt(form.totalDeliveries)||0 },
      staffMeals: parseInt(form.staffMeals)||0,
      cancelRestaurant: form.cancelRestaurant.filter(c=>c.item||c.amount).map(c=>({item:c.item,reason:c.reason,amount:parseInt(c.amount)||0})),
      cancelDelivery:   form.cancelDelivery.filter(c=>c.item||c.amount).map(c=>({item:c.item,reason:c.reason,amount:parseInt(c.amount)||0})),
      topDishes: form.topDishes.map((d,i)=>d==="אחר"?(form.topDishesOther?.[i]||"אחר"):d).filter(Boolean).slice(0,2),
      operationalIssues: form.operationalIssues.map(issue => ({
        type: issue,
        notes: form.operationalNotes?.[issue] || ""
      })),
    };
    onSubmit(editMode?.dateKey || activeDateKey, shift, data);
    setSubmitted(true);
  };

  if (submitted) return (
    <div style={{...S.app,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{fontSize:64}}>✅</div>
      <div style={{fontSize:22,fontWeight:800,color:"#1a2e1a",marginTop:16}}>הדוח נשלח!</div>
      <div style={{fontSize:14,color:"#888",marginTop:8}}>משמרת {shift==="lunch"?"צהריים":"ערב"} — {dateStr}</div>
      <button style={{marginTop:24,...S.nextBtn,width:200}} onClick={onBack}>חזרה לתפריט</button>
    </div>
  );

  if (!shift) return (
    <div style={S.app}>
      <div style={S.header}>
        <button style={{background:"none",border:"none",color:"#fff",fontSize:20,cursor:"pointer"}} onClick={onBack}>←</button>
        <span style={S.headerTitle}>Hamburg 🍔</span>
        <span style={S.headerSub}>דוח משמרת</span>
      </div>
      <div style={{padding:20,display:"flex",flexDirection:"column",gap:14,alignItems:"center"}}>
        <div style={{width:"100%",maxWidth:320}}>
          <div style={{fontSize:13,fontWeight:600,color:"#888",marginBottom:8,textAlign:"center"}}>תאריך הדוח</div>
          <div style={{display:"flex",gap:8}}>
            {["today","yesterday"].map(d=>(
              <button key={d} onClick={()=>setSelDate(d)} style={{flex:1,padding:"10px 0",borderRadius:10,border:"2px solid",borderColor:selDate===d?"#4a7c3f":"#ddd",background:selDate===d?"#4a7c3f":"#fff",color:selDate===d?"#fff":"#555",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                {d==="today"?"היום":"אתמול"}<br/>
                <span style={{fontSize:11,fontWeight:400}}>{d==="today"?`${today.getDate()}/${today.getMonth()+1}`:`${yesterday.getDate()}/${yesterday.getMonth()+1}`}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{fontSize:17,fontWeight:700,color:"#333",marginTop:8}}>איזו משמרת?</div>
        <button style={{...S.shiftBtn,background:"#e8f4fd",borderColor:"#2c5f8a"}} onClick={()=>setShift("lunch")}>
          <span style={{fontSize:32}}>🌅</span><span style={{fontSize:18,fontWeight:700,color:"#2c5f8a"}}>משמרת צהריים</span>
        </button>
        <button style={{...S.shiftBtn,background:"#1a2e1a",borderColor:"#4a7c3f"}} onClick={()=>setShift("dinner")}>
          <span style={{fontSize:32}}>🌙</span><span style={{fontSize:18,fontWeight:700,color:"#9cb89a"}}>משמרת ערב</span>
        </button>
      </div>
    </div>
  );

  const shiftColor = shift==="lunch" ? "#2c5f8a" : "#4a7c3f";
  const canNext1 = form.manager && form.diners;
  const canNext2 = form.woltDeliveries !== "" || form.privateDeliveries !== "" || form.taDeliveries !== "";
  const canSubmit = form.topDishes.filter(Boolean).length >= 1;

  return (
    <div style={S.app}>
      <div style={S.header}>
        <button style={{background:"none",border:"none",color:"#fff",fontSize:20,cursor:"pointer"}} onClick={()=>setShift(null)}>←</button>
        <span style={S.headerTitle}>Hamburg 🍔</span>
        <span style={S.headerSub}>{editMode ? `עריכה — ${editMode.shift==="lunch"?"צהריים":"ערב"}` : `${dayStr}, ${dateStr}`}</span>
      </div>
      <div style={{background:shift==="lunch"?"#e8f4fd":"#1a2e1a",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:6}}>
          {[1,2,3,4].map(s=><div key={s} style={{width:28,height:4,borderRadius:2,background:s<=step?shiftColor:"rgba(128,128,128,0.3)"}}/>)}
        </div>
        <span style={{color:shift==="lunch"?"#2c5f8a":"#9cb89a",fontWeight:700,fontSize:14}}>{shift==="lunch"?"🌅 צהריים":"🌙 ערב"}</span>
      </div>

      <div style={{padding:"12px 12px 40px"}}>
        {/* STEP 1 */}
        {step===1&&<div style={S.section}>
          <div style={S.secTitle}>פרטי משמרת</div>
          <Label>שם האחמש</Label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:4}}>
            {MANAGERS.map(m=><Pill key={m} active={form.manager===m} onSelect={()=>up("manager",m)}>{m}</Pill>)}
          </div>
          <Label>כמות סועדים</Label>
          <input style={S.inp} type="number" inputMode="numeric" placeholder="מספר סועדים" value={form.diners} onChange={e=>up("diners",e.target.value)}/>
          <Label>ממוצע לסועד (₪)</Label>
          <input style={S.inp} type="number" inputMode="numeric" placeholder="מהמחשן" value={form.avgPerDiner} onChange={e=>up("avgPerDiner",e.target.value)}/>
          <Label>ארוחות עובדים</Label>
          <input style={S.inp} type="number" inputMode="numeric" placeholder="כמות" value={form.staffMeals} onChange={e=>up("staffMeals",e.target.value)}/>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button style={{...S.nextBtn,background:"#eee",color:"#333",flex:1}} onClick={()=>setShift(null)}>← חזור</button>
            <button style={{...S.nextBtn,flex:2,opacity:canNext1?1:0.4}} disabled={!canNext1} onClick={()=>setStep(2)}>המשך ←</button>
          </div>
        </div>}

        {/* STEP 2 */}
        {step===2&&<div style={S.section}>
          <div style={S.secTitle}>משלוחים</div>

          <Label>וולט 🛵</Label>
          <input style={S.inp} type="number" inputMode="numeric" placeholder="כמות משלוחי וולט" value={form.woltDeliveries} onChange={e=>up("woltDeliveries",e.target.value)}/>
          <Label>פרטי 🚗</Label>
          <input style={S.inp} type="number" inputMode="numeric" placeholder="כמות משלוחים פרטיים" value={form.privateDeliveries} onChange={e=>up("privateDeliveries",e.target.value)}/>
          <Label>TA 🥡</Label>
          <input style={S.inp} type="number" inputMode="numeric" placeholder="כמות Take Away" value={form.taDeliveries} onChange={e=>up("taDeliveries",e.target.value)}/>
          {(form.woltDeliveries||form.privateDeliveries||form.taDeliveries)&&(
            <div style={{background:"#f0f7f0",border:"1px solid #c3e0c3",borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-around",fontSize:13,marginTop:10,flexWrap:"wrap",gap:4}}>
              <span>וולט: <b>{form.woltDeliveries||0}</b></span>
              <span>פרטי: <b>{form.privateDeliveries||0}</b></span>
              <span>TA: <b>{form.taDeliveries||0}</b></span>
              <span>סה״כ: <b>{(parseInt(form.woltDeliveries)||0)+(parseInt(form.privateDeliveries)||0)+(parseInt(form.taDeliveries)||0)}</b></span>
            </div>
          )}
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button style={{...S.nextBtn,background:"#eee",color:"#333",flex:1}} onClick={()=>setStep(1)}>← חזור</button>
            <button style={{...S.nextBtn,flex:2,opacity:canNext2?1:0.4}} disabled={!canNext2} onClick={()=>setStep(3)}>המשך ←</button>
          </div>
        </div>}

        {/* STEP 3 */}
        {step===3&&<div style={S.section}>
          <div style={S.secTitle}>ביטולים והחזרות</div>

          {/* Restaurant cancellations */}
          <div style={{background:"#fff0f0",borderRadius:8,padding:12,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:700,color:"#c0392b",marginBottom:10}}>🍽️ ביטולים במסעדה</div>
            {form.cancelRestaurant.map((c,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:"#f5c6c6",color:"#c0392b",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>{i+1}</div>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
                  <input style={S.inpSm} placeholder="שם מנה" value={c.item} onChange={e=>upC("cancelRestaurant",i,"item",e.target.value)}/>
                  <input style={S.inpSm} placeholder="סיבה" value={c.reason} onChange={e=>upC("cancelRestaurant",i,"reason",e.target.value)}/>
                  <input style={{...S.inpSm,borderColor:c.amount?"#c0392b":"#ddd"}} type="number" inputMode="numeric" placeholder="סכום ₪" value={c.amount} onChange={e=>upC("cancelRestaurant",i,"amount",e.target.value)}/>
                </div>
              </div>
            ))}
            {form.cancelRestaurant.some(c=>c.amount)&&(
              <div style={{textAlign:"center",fontSize:13,color:"#c0392b",fontWeight:700,marginTop:6}}>
                סה״כ: ₪{form.cancelRestaurant.reduce((s,c)=>s+(parseInt(c.amount)||0),0)}
              </div>
            )}
          </div>

          {/* Delivery cancellations */}
          <div style={{background:"#fff8f0",borderRadius:8,padding:12}}>
            <div style={{fontSize:14,fontWeight:700,color:"#e67e22",marginBottom:10}}>🛵 ביטולים במשלוחים</div>
            {form.cancelDelivery.map((c,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"flex-start"}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:"#fde3c0",color:"#e67e22",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>{i+1}</div>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
                  <input style={S.inpSm} placeholder="שם מנה" value={c.item} onChange={e=>upC("cancelDelivery",i,"item",e.target.value)}/>
                  <input style={S.inpSm} placeholder="סיבה" value={c.reason} onChange={e=>upC("cancelDelivery",i,"reason",e.target.value)}/>
                  <input style={{...S.inpSm,borderColor:c.amount?"#e67e22":"#ddd"}} type="number" inputMode="numeric" placeholder="סכום ₪" value={c.amount} onChange={e=>upC("cancelDelivery",i,"amount",e.target.value)}/>
                </div>
              </div>
            ))}
            {form.cancelDelivery.some(c=>c.amount)&&(
              <div style={{textAlign:"center",fontSize:13,color:"#e67e22",fontWeight:700,marginTop:6}}>
                סה״כ: ₪{form.cancelDelivery.reduce((s,c)=>s+(parseInt(c.amount)||0),0)}
              </div>
            )}
          </div>

          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button style={{...S.nextBtn,background:"#eee",color:"#333",flex:1}} onClick={()=>setStep(2)}>← חזור</button>
            <button style={{...S.nextBtn,flex:2}} onClick={()=>setStep(4)}>המשך ←</button>
          </div>
        </div>}

        {/* STEP 4 */}
        {step===4&&<div style={S.section}>
          <div style={S.secTitle}>מנות ובעיות תפעול</div>
          <Label>3 מנות הכי נמכרות</Label>
          {[0,1,2].map(i=>(
            <div key={i} style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:700,color:"#333",marginBottom:6}}>מקום {i+1} {form.topDishes[i]?`— ${form.topDishes[i]}`:""}</div>
              {Object.entries(MENU_CATEGORIES).map(([cat,dishes])=>(
                <div key={cat} style={{marginBottom:8}}>
                  <div style={{fontSize:11,color:"#aaa",marginBottom:4}}>{cat}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {dishes.map(dish=><Pill key={dish} active={form.topDishes[i]===dish} onSelect={()=>upD(i,dish)} small>{dish}</Pill>)}
                  </div>
                </div>
              ))}
              {form.topDishes[i]==="אחר"&&<input style={{...S.inpSm,marginTop:4}} placeholder="שם המנה..." value={form.topDishesOther?.[i]||""} onChange={e=>{const o=[...(form.topDishesOther||["","",""])];o[i]=e.target.value;up("topDishesOther",o);}}/>}
            </div>
          ))}
          <div style={{height:1,background:"#f0f0f0",margin:"14px 0"}}/>
          <Label>בעיות תפעול</Label>
          {OPS_OPTIONS.map(opt=>(
            <div key={opt} style={{borderBottom:"1px solid #f5f5f5",paddingBottom:8,marginBottom:4}}>
              <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",cursor:"pointer"}} onClick={()=>togOps(opt)}>
                <div style={{width:22,height:22,borderRadius:6,border:"2px solid",borderColor:form.operationalIssues.includes(opt)?"#e67e22":"#ddd",background:form.operationalIssues.includes(opt)?"#e67e22":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {form.operationalIssues.includes(opt)&&<span style={{color:"#fff",fontSize:14}}>✓</span>}
                </div>
                <span style={{fontSize:14,color:"#333"}}>{opt}</span>
              </div>
              {form.operationalIssues.includes(opt)&&(
                <div style={{display:"flex",flexDirection:"column",gap:4,paddingRight:34}}>
                  {[0,1,2].map(n=>(
                    <input key={n} style={{...S.inpSm,borderColor:"#f0a050"}}
                      placeholder={`פירוט ${n+1}...`}
                      value={(form.operationalNotes?.[opt]?.[n])||""}
                      onChange={e=>{
                        const notes={...(form.operationalNotes||{})};
                        if(!notes[opt]) notes[opt]=["","",""];
                        else notes[opt]=[...notes[opt]];
                        notes[opt][n]=e.target.value;
                        up("operationalNotes",notes);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:20}}>
            <button style={{...S.nextBtn,background:"#eee",color:"#333",flex:1}} onClick={()=>setStep(3)}>← חזור</button>
            <button style={{...S.nextBtn,flex:2,background:"#1a2e1a",opacity:canSubmit?1:0.5}} disabled={!canSubmit} onClick={handleSubmit}>שלח דוח ✓</button>
          </div>
        </div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DAY VIEW
// ═══════════════════════════════════════════════════════════════
function DayView({ dayKey, report, revenue, onBack, allReports, allRev, onSelectDay }) {
  const d = new Date(dayKey);
  const lD=(report?.lunch?.diners||0)+(report?.dinner?.diners||0);

  // Find prev/next days with data
  const allKeys = Object.keys(allReports||{}).sort();
  const idx = allKeys.indexOf(dayKey);
  const prevKey = idx > 0 ? allKeys[idx-1] : null;
  const nextKey = idx < allKeys.length-1 ? allKeys[idx+1] : null;

  return (
    <div style={S.app}>
      <div style={S.header}>
        <button style={{background:"none",border:"none",color:"#fff",fontSize:20,cursor:"pointer"}} onClick={onBack}>← דשבורד</button>
        <span style={S.headerTitle}>{DAYS_HE[d.getDay()]}, {d.getDate()}/{d.getMonth()+1}</span>
        <span style={S.headerSub}>Hamburg 🍔</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:"#f8f8f8",borderBottom:"1px solid #eee"}}>
        <button style={{background:"none",border:"1px solid #ddd",borderRadius:8,padding:"6px 12px",cursor:prevKey?"pointer":"default",color:prevKey?"#333":"#ccc",fontSize:13}} onClick={()=>prevKey&&onSelectDay(prevKey)}>
          {prevKey ? `← ${new Date(prevKey).getDate()}/${new Date(prevKey).getMonth()+1}` : "—"}
        </button>
        <span style={{fontSize:12,color:"#888",alignSelf:"center"}}>ניווט בין ימים</span>
        <button style={{background:"none",border:"1px solid #ddd",borderRadius:8,padding:"6px 12px",cursor:nextKey?"pointer":"default",color:nextKey?"#333":"#ccc",fontSize:13}} onClick={()=>nextKey&&onSelectDay(nextKey)}>
          {nextKey ? `${new Date(nextKey).getDate()}/${new Date(nextKey).getMonth()+1} →` : "—"}
        </button>
      </div>
      {!report?<div style={{padding:40,textAlign:"center",color:"#888"}}>אין דוח ליום זה</div>:<>
        <div style={{padding:"12px 16px",background:"#1a2e1a",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:14,opacity:0.8}}>{lD} סועדים</span>
          <span style={{fontSize:22,fontWeight:700}}>{revenue?fmt(revenue):"לא הוזן פדיון"}</span>
        </div>
        {report.lunch&&<ShiftCard title="משמרת צהריים 🌅" shift={report.lunch}/>}
        {report.dinner&&<ShiftCard title="משמרת ערב 🌙" shift={report.dinner}/>}
        {!report.dinner&&<div style={{margin:"12px",padding:16,background:"#fff",borderRadius:10,textAlign:"center",color:"#aaa",fontSize:14}}>משמרת ערב — טרם הוזנה</div>}
      </>}
      <div style={{height:40}}/>
    </div>
  );
}

function ShiftCard({ title, shift }) {
  const totalDel = shift.deliveries?.total||0;
  const woltDel  = shift.deliveries?.wolt||0;
  return (
    <div style={{margin:"12px 12px 0",background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",paddingBottom:12}}>
      <div style={{background:"#2c5f8a",color:"#fff",padding:"10px 14px",fontWeight:700,fontSize:15}}>{title}</div>
      <R label="אחמש" val={shift.manager}/>
      <R label="סועדים" val={shift.diners}/>
      <R label="ממוצע לסועד" val={`₪${shift.avgPerDiner}`}/>
      <div style={{height:1,background:"#f0f0f0",margin:"4px 14px"}}/>
      <R label="וולט" val={woltDel}/>
      <R label="פרטי" val={shift.deliveries?.private||Math.max(0,totalDel-woltDel-(shift.deliveries?.ta||0))}/>
      <R label="TA" val={shift.deliveries?.ta||0}/>
      <R label="סה״כ משלוחים" val={totalDel}/>
      <div style={{height:1,background:"#f0f0f0",margin:"4px 14px"}}/>
      <R label="ארוחות עובדים" val={shift.staffMeals}/>
      {shift.topDishes?.length>0&&<><div style={{height:1,background:"#f0f0f0",margin:"4px 14px"}}/><div style={{padding:"6px 14px 2px",color:"#888",fontSize:13}}>מנות מובילות:</div>{shift.topDishes.map((d,i)=><div key={i} style={{padding:"3px 14px",fontSize:14}}>#{i+1} {d}</div>)}</>}
      {shift.cancelRestaurant?.length>0&&<><div style={{height:1,background:"#f0f0f0",margin:"4px 14px"}}/><div style={{display:"flex",justifyContent:"space-between",padding:"6px 14px 2px"}}><span style={{color:"#c0392b",fontWeight:600,fontSize:13}}>סה״כ: ₪{shift.cancelRestaurant.reduce((s,c)=>s+(c.amount||0),0)}</span><span style={{color:"#888",fontSize:13}}>🍽️ ביטולים במסעדה</span></div>{shift.cancelRestaurant.map((c,i)=><div key={i} style={{padding:"3px 14px",fontSize:13,color:"#c0392b"}}>• {c.item}{c.reason?` — ${c.reason}`:""}{c.amount?` (₪${c.amount})`:""}</div>)}</>}
      {shift.cancelDelivery?.length>0&&<><div style={{height:1,background:"#f0f0f0",margin:"4px 14px"}}/><div style={{display:"flex",justifyContent:"space-between",padding:"6px 14px 2px"}}><span style={{color:"#e67e22",fontWeight:600,fontSize:13}}>סה״כ: ₪{shift.cancelDelivery.reduce((s,c)=>s+(c.amount||0),0)}</span><span style={{color:"#888",fontSize:13}}>🛵 ביטולים במשלוחים</span></div>{shift.cancelDelivery.map((c,i)=><div key={i} style={{padding:"3px 14px",fontSize:13,color:"#e67e22"}}>• {c.item}{c.reason?` — ${c.reason}`:""}{c.amount?` (₪${c.amount})`:""}</div>)}</>}
      {shift.operationalIssues?.length>0&&<><div style={{height:1,background:"#f0f0f0",margin:"4px 14px"}}/><div style={{padding:"6px 14px 2px",color:"#888",fontSize:13}}>בעיות תפעול:</div>{shift.operationalIssues.map((o,i)=>{
        const type = typeof o === "object" ? o.type : o;
        const notes = typeof o === "object" ? o.notes : "";
        return <div key={i} style={{padding:"3px 14px 6px",fontSize:13,color:"#e67e22"}}>⚠️ {type}{notes&&<div style={{fontSize:12,color:"#888",paddingRight:16}}>{notes}</div>}</div>;
      })}</>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════
function PinScreen({ pin, onDigit, error, onBack }) {
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#1a2e1a",direction:"rtl"}}>
      <div style={{fontSize:52}}>🍔</div>
      <div style={{color:"#fff",fontSize:26,fontWeight:800,marginTop:8}}>Hamburg</div>
      <div style={{color:"#9cb89a",fontSize:14,marginTop:4}}>כניסת בעלים</div>
      <div style={{display:"flex",gap:14,margin:"24px 0"}}>
        {[0,1,2,3].map(i=><div key={i} style={{width:14,height:14,borderRadius:"50%",background:pin.length>i?(error?"#c0392b":"#4a7c3f"):"#444",transition:"background 0.2s"}}/>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3, 72px)",gap:12}}>
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=>(
          <button key={i} style={{height:72,borderRadius:12,border:"none",background:d===""?"transparent":"#2d4a2d",color:"#fff",fontSize:24,fontWeight:600,cursor:d===""?"default":"pointer"}}
            disabled={d===""} onClick={()=>d!==""&&onDigit(String(d))}>{d}</button>
        ))}
      </div>
      <button style={{marginTop:24,background:"none",border:"1px solid #4a7c3f",color:"#9cb89a",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontSize:14}} onClick={onBack}>← חזרה</button>
    </div>
  );
}

function HistoryView({ reports, manualRev, onSelectDay, onBack }) {
  const [search, setSearch] = useState("");
  const allKeys = Object.keys(reports).sort().reverse();
  const filtered = search
    ? allKeys.filter(k => k.includes(search))
    : allKeys;

  return (
    <div style={S.app}>
      <div style={S.header}>
        <button style={{background:"none",border:"none",color:"#fff",fontSize:20,cursor:"pointer"}} onClick={onBack}>← דשבורד</button>
        <span style={S.headerTitle}>היסטוריה</span>
        <span style={S.headerSub}>Hamburg 🍔</span>
      </div>
      <div style={{padding:12}}>
        <input
          style={{width:"100%",border:"1.5px solid #ddd",borderRadius:8,padding:"10px 12px",fontSize:14,boxSizing:"border-box",direction:"rtl",marginBottom:12,outline:"none"}}
          placeholder="חפש תאריך (לדוגמה: 2025-06)"
          value={search} onChange={e=>setSearch(e.target.value)}
        />
        {filtered.length===0 && <div style={{textAlign:"center",color:"#aaa",padding:40}}>לא נמצאו ימים</div>}
        {filtered.map(k=>{
          const d=new Date(k);
          const r=reports[k];
          const rev=manualRev[k];
          const totalDiners=(r?.lunch?.diners||0)+(r?.dinner?.diners||0);
          const hasLunch=!!r?.lunch, hasDinner=!!r?.dinner;
          return (
            <div key={k} style={{background:"#fff",borderRadius:10,padding:"12px 14px",marginBottom:8,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",cursor:"pointer"}} onClick={()=>onSelectDay(k)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{display:"flex",gap:6}}>
                  <span style={{fontSize:11,background:hasLunch?"#4a7c3f":"#ddd",color:"#fff",borderRadius:4,padding:"2px 6px"}}>🌅{hasLunch?"✓":"—"}</span>
                  <span style={{fontSize:11,background:hasDinner?"#2c5f8a":"#ddd",color:"#fff",borderRadius:4,padding:"2px 6px"}}>🌙{hasDinner?"✓":"—"}</span>
                </div>
                <span style={{fontWeight:700,fontSize:15,color:"#1a2e1a"}}>{DAYS_HE[d.getDay()]}, {d.getDate()}/{d.getMonth()+1}/{d.getFullYear()}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:13,color:"#666"}}>{totalDiners} סועדים</span>
                <span style={{fontSize:13,fontWeight:600,color:rev?"#111":"#aaa"}}>{rev?fmt(rev):"לא הוזן פדיון"}</span>
              </div>
              {(r?.lunch?.deliveries?.wolt||r?.dinner?.deliveries?.wolt||r?.lunch?.deliveries?.private||r?.dinner?.deliveries?.private||r?.lunch?.deliveries?.ta||r?.dinner?.deliveries?.ta) ? (
                <div style={{fontSize:12,color:"#888"}}>
                  🛵 וולט: {(r?.lunch?.deliveries?.wolt||0)+(r?.dinner?.deliveries?.wolt||0)} | פרטי: {(r?.lunch?.deliveries?.private||0)+(r?.dinner?.deliveries?.private||0)} | TA: {(r?.lunch?.deliveries?.ta||0)+(r?.dinner?.deliveries?.ta||0)} | סה״כ: {(r?.lunch?.deliveries?.total||0)+(r?.dinner?.deliveries?.total||0)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopDishesCard({ reports, weekDays, monthDays }) {
  const [period, setPeriod] = useState("week");
  const days = period === "week" ? weekDays.map(d=>d.key) : monthDays;

  const counts = {};
  days.forEach(key => {
    const r = reports[key];
    if (!r) return;
    ["lunch","dinner"].forEach(shift => {
      (r[shift]?.topDishes||[]).forEach((dish,idx) => {
        if (!dish) return;
        if (!counts[dish]) counts[dish] = {total:0, p1:0, p2:0, p3:0};
        counts[dish].total += (3-idx);
        counts[dish][`p${idx+1}`] = (counts[dish][`p${idx+1}`]||0)+1;
      });
    });
  });

  const sorted = Object.entries(counts).sort((a,b)=>b[1].total-a[1].total).slice(0,8);

  return (
    <div style={{...S.card,marginTop:12}}>
      <div style={{...S.cardHdr,background:"#6b4c9a"}}>
        <div style={{display:"flex",gap:6}}>
          {["week","month"].map(p=><button key={p} onClick={()=>setPeriod(p)} style={{fontSize:12,padding:"3px 10px",borderRadius:6,border:"none",cursor:"pointer",background:period===p?"#fff":"rgba(255,255,255,0.2)",color:period===p?"#6b4c9a":"#fff",fontWeight:600}}>{p==="week"?"שבוע":"חודש"}</button>)}
        </div>
        <span style={{color:"#fff",fontWeight:700,fontSize:15}}>מנות מובילות</span>
      </div>
      <div style={{padding:"12px 14px"}}>
        {sorted.length===0 ? (
          <div style={{textAlign:"center",color:"#aaa",padding:20,fontSize:14}}>אין נתונים עדיין</div>
        ) : sorted.map(([dish, data], i) => {
          const max = sorted[0][1].total;
          const pct = Math.round((data.total/max)*100);
          return (
            <div key={dish} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid #f5f5f5"}}>
              <span style={{width:20,fontSize:13,fontWeight:700,color:"#6b4c9a",flexShrink:0}}>#{i+1}</span>
              <span style={{flex:1,fontSize:13,color:"#333"}}>{dish}</span>
              <div style={{width:80,height:8,background:"#eee",borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:"#6b4c9a",borderRadius:4}}/>
              </div>
              <span style={{fontSize:12,color:"#888",width:20,textAlign:"left"}}>{data.p1||""}</span>
            </div>
          );
        })}
        <div style={{fontSize:11,color:"#bbb",marginTop:8,textAlign:"center"}}>מספר הופעות במקום 1</div>
      </div>
    </div>
  );
}

function DeliveryCard({ weekDays, reports }) {
  const DAYS_SHORT_L = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
  const today = new Date();

  // 4-week avg total deliveries per day-of-week
  const dowDelAvg = {};
  for (let dow=0; dow<7; dow++) {
    const vals = [];
    for (let w=1; w<=4; w++) {
      const d = new Date(today); d.setDate(today.getDate()-w*7-today.getDay()+dow);
      const k = d.toISOString().split("T")[0];
      const r = reports[k];
      if (r) {
        const tot=(parseInt(r.lunch?.deliveries?.total)||0)+(parseInt(r.dinner?.deliveries?.total)||0);
        if(tot>0) vals.push(tot);
      }
    }
    dowDelAvg[dow]=vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
  }

  const rows = weekDays.map(({key,date})=>{
    const r=reports[key]||{};
    const lW=parseInt(r.lunch?.deliveries?.wolt)||0;
    const lT=parseInt(r.lunch?.deliveries?.total)||0;
    const lP=Math.max(0,lT-lW);
    const dW=parseInt(r.dinner?.deliveries?.wolt)||0;
    const dT=parseInt(r.dinner?.deliveries?.total)||0;
    const dP=Math.max(0,dT-dW);
    const total=lT+dT;
    const avg=dowDelAvg[date.getDay()];
    const trend=avg>0&&total>0?(total>=avg?"up":"down"):null;
    return {label:DAYS_SHORT_L[date.getDay()]+" "+date.getDate()+"/"+(date.getMonth()+1),lW,lP,lT,dW,dP,dT,total,trend};
  });

  const tot={lW:rows.reduce((s,r)=>s+r.lW,0),lP:rows.reduce((s,r)=>s+r.lP,0),dW:rows.reduce((s,r)=>s+r.dW,0),dP:rows.reduce((s,r)=>s+r.dP,0),total:rows.reduce((s,r)=>s+r.total,0)};

  return (
    <div style={{...S.card,marginTop:12}}>
      <div style={{...S.cardHdr,background:"#2c5f8a"}}>
        <span style={{color:"#fff",fontSize:18}}>‹</span>
        <span style={{color:"#fff",fontWeight:700,fontSize:15}}>פירוט משלוחים יומי</span>
      </div>
      <div style={{padding:"12px 10px 14px"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,direction:"rtl"}}>
          <thead>
            <tr style={{borderBottom:"2px solid #eee"}}>
              <th style={{textAlign:"right",padding:"4px 6px",color:"#888",fontWeight:600}}>יום</th>
              <th style={{textAlign:"center",padding:"4px 2px",color:"#2c5f8a",fontWeight:600,fontSize:9}}>וולט צ׳</th>
              <th style={{textAlign:"center",padding:"4px 2px",color:"#666",fontWeight:600,fontSize:9}}>פרטי צ׳</th>
              <th style={{textAlign:"center",padding:"4px 2px",color:"#888",fontWeight:600,fontSize:9}}>TA צ׳</th>
              <th style={{textAlign:"center",padding:"4px 2px",color:"#2c5f8a",fontWeight:600,fontSize:9}}>וולט ע׳</th>
              <th style={{textAlign:"center",padding:"4px 2px",color:"#666",fontWeight:600,fontSize:9}}>פרטי ע׳</th>
              <th style={{textAlign:"center",padding:"4px 2px",color:"#888",fontWeight:600,fontSize:9}}>TA ע׳</th>
              <th style={{textAlign:"center",padding:"4px 2px",color:"#111",fontWeight:700,fontSize:9}}>סה״כ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>{
              const isEmpty=r.total===0;
              const tc=r.trend==="up"?"#4a7c3f":r.trend==="down"?"#c0392b":"#111";
              const lTA = parseInt(reports[r.key]?.lunch?.deliveries?.ta)||0;
              const dTA = parseInt(reports[r.key]?.dinner?.deliveries?.ta)||0;
              return (
                <tr key={i} style={{borderBottom:"1px solid #f5f5f5",opacity:isEmpty?0.3:1}}>
                  <td style={{padding:"7px 6px",fontWeight:600,color:"#333",fontSize:12}}>{r.label}</td>
                  <td style={{padding:"7px 2px",textAlign:"center",color:"#2c5f8a",fontSize:12}}>{isEmpty?"—":r.lW}</td>
                  <td style={{padding:"7px 2px",textAlign:"center",color:"#888",fontSize:12}}>{isEmpty?"—":Math.max(0,r.lP-lTA)}</td>
                  <td style={{padding:"7px 2px",textAlign:"center",color:"#555",fontSize:12}}>{isEmpty?"—":lTA}</td>
                  <td style={{padding:"7px 2px",textAlign:"center",color:"#2c5f8a",fontSize:12}}>{isEmpty?"—":r.dW}</td>
                  <td style={{padding:"7px 2px",textAlign:"center",color:"#888",fontSize:12}}>{isEmpty?"—":Math.max(0,r.dP-dTA)}</td>
                  <td style={{padding:"7px 2px",textAlign:"center",color:"#555",fontSize:12}}>{isEmpty?"—":dTA}</td>
                  <td style={{padding:"7px 2px",textAlign:"center",fontWeight:700,color:tc,fontSize:13}}>{isEmpty?"—":r.total}</td>
                </tr>
              );
            })}
            <tr style={{borderTop:"2px solid #eee",fontWeight:700,background:"#f9f9f9"}}>
              <td style={{padding:"7px 6px",color:"#111"}}>סה״כ</td>
              <td style={{padding:"7px 2px",textAlign:"center",color:"#2c5f8a",fontSize:12}}>{tot.lW}</td>
              <td style={{padding:"7px 2px",textAlign:"center",color:"#888",fontSize:12}}>{Math.max(0,tot.lP-rows.reduce((s,r)=>s+(parseInt(reports[r.key]?.lunch?.deliveries?.ta)||0),0))}</td>
              <td style={{padding:"7px 2px",textAlign:"center",color:"#555",fontSize:12}}>{rows.reduce((s,r)=>s+(parseInt(reports[r.key]?.lunch?.deliveries?.ta)||0),0)}</td>
              <td style={{padding:"7px 2px",textAlign:"center",color:"#2c5f8a",fontSize:12}}>{tot.dW}</td>
              <td style={{padding:"7px 2px",textAlign:"center",color:"#888",fontSize:12}}>{Math.max(0,tot.dP-rows.reduce((s,r)=>s+(parseInt(reports[r.key]?.dinner?.deliveries?.ta)||0),0))}</td>
              <td style={{padding:"7px 2px",textAlign:"center",color:"#555",fontSize:12}}>{rows.reduce((s,r)=>s+(parseInt(reports[r.key]?.dinner?.deliveries?.ta)||0),0)}</td>
              <td style={{padding:"7px 2px",textAlign:"center",color:"#111",fontSize:14}}>{tot.total}</td>
            </tr>
          </tbody>
        </table>
        <div style={{marginTop:8,display:"flex",gap:16,justifyContent:"center"}}>
          <span style={{fontSize:11,color:"#4a7c3f"}}>● מעל ממוצע</span>
          <span style={{fontSize:11,color:"#c0392b"}}>● מתחת לממוצע</span>
        </div>
      </div>
    </div>
  );
}


function GreenCard({ title, children }) {
  return (
    <div style={S.card}>
      <div style={{...S.cardHdr,background:"#4a7c3f"}}><span style={{color:"#fff",fontSize:18}}>‹</span><span style={{color:"#fff",fontWeight:700,fontSize:15}}>{title}</span></div>
      <div style={S.cardBody}>{children}</div>
    </div>
  );
}
function Trend({ val, label }) { const up=parseFloat(val)>=0; return <div style={{color:up?"#4a7c3f":"#c0392b",fontSize:13,fontWeight:600,marginTop:2,textAlign:"right"}}>{up?"▲":"▼"} {Math.abs(val)}% {label}</div>; }
function SL({ label, val, down, up, neutral }) { const color=neutral?"#888":down?"#c0392b":"#4a7c3f"; const arrow=neutral?"":down?"▼":"▲"; return <div style={{display:"flex",gap:6,alignItems:"center",fontSize:13}}><span style={{color:"#555"}}>{label}</span><span style={{color,fontWeight:700}}>{arrow} {val}</span></div>; }
function Pill({ children, active, onSelect, small }) { return <button onClick={onSelect} style={{padding:small?"5px 10px":"7px 14px",borderRadius:20,border:`2px solid ${active?"#4a7c3f":"#ddd"}`,background:active?"#4a7c3f":"#fff",color:active?"#fff":"#333",fontSize:small?12:14,fontWeight:active?700:400,cursor:"pointer",marginBottom:4}}>{children}</button>; }
function Label({ children }) { return <div style={{fontSize:13,fontWeight:600,color:"#555",marginBottom:8,marginTop:14}}>{children}</div>; }
function R({ label, val }) { return <div style={{display:"flex",justifyContent:"space-between",padding:"7px 14px"}}><span style={{fontWeight:600,fontSize:14}}>{val}</span><span style={{color:"#666",fontSize:14}}>{label}</span></div>; }

// ═══════════════════════════════════════════════════════════════
// EXCEL IMPORT
// ═══════════════════════════════════════════════════════════════
function ExcelImport({ onSubmit, setManualRev, onBack }) {
  const [status, setStatus] = useState("idle"); // idle | parsing | success | error
  const [result, setResult] = useState(null);
  const [errMsg, setErrMsg] = useState("");

  const parseDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString().split("T")[0];
    if (typeof v === "number") { // Excel serial date
      const d = new Date((v - 25569) * 86400 * 1000);
      return d.toISOString().split("T")[0];
    }
    const s = String(v).trim();
    if (s.includes("/")) { const [d,m,y] = s.split("/"); return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`; }
    if (s.includes("-")) return s;
    return null;
  };

  const parseExcel = async (file) => {
    setStatus("parsing");
    try {
      const XLSX = await import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: false });

      // Try monthly sheet first, fallback to daily
      const wsMonthly = wb.Sheets["דוח חודשי"];
      const wsDaily   = wb.Sheets["דוח יומי"];

      const days = [];

      if (wsMonthly) {
        // Monthly format: row per day, rows 4-34
        const g = (r,c) => { const k=`${String.fromCharCode(64+c)}${r}`; const cell=wsMonthly[k]; return cell?cell.v:null; };
        const gs = (r,c) => { const v=g(r,c); return v!==null&&v!==undefined ? String(v).trim() : ""; };
        const gn = (r,c) => { const v=g(r,c); return v ? parseFloat(v)||0 : 0; };

        for (let row=4; row<=34; row++) {
          const dk = parseDate(g(row,1));
          if (!dk) continue;
          // Check if at least something is filled
          const lunchDiners=gn(row,3), dinnerDiners=gn(row,19);
          if (lunchDiners===0 && dinnerDiners===0) continue;

          const lunch = lunchDiners > 0 ? {
            manager: gs(row,2), diners: lunchDiners, avgPerDiner: gn(row,4),
            staffMeals: gn(row,5),
            deliveries: { total: gn(row,6), wolt: gn(row,7) },
            cancellations: [9,10,11].map(c=>({item:"",reason:"",amount:gn(row,c)})).filter(c=>c.amount>0),
            topDishes: [gs(row,13),gs(row,14),gs(row,15)].filter(Boolean),
            operationalIssues: gs(row,16)?[gs(row,16)]:[],
          } : null;

          const dinner = dinnerDiners > 0 ? {
            manager: gs(row,18), diners: dinnerDiners, avgPerDiner: gn(row,20),
            staffMeals: gn(row,21),
            deliveries: { total: gn(row,22), wolt: gn(row,23) },
            cancellations: [25,26,27].map(c=>({item:"",reason:"",amount:gn(row,c)})).filter(c=>c.amount>0),
            topDishes: [gs(row,29),gs(row,30),gs(row,31)].filter(Boolean),
            operationalIssues: gs(row,32)?[gs(row,32)]:[],
          } : null;

          days.push({ dateKey: dk, lunch, dinner });
        }
      } else if (wsDaily) {
        // Daily format (legacy)
        const g = (cell) => { const c=wsDaily[cell]; return c?c.v:null; };
        const gs = (cell) => { const v=g(cell); return v?String(v).trim():""; };
        const gn = (cell) => { const v=g(cell); return v?parseInt(v)||0:0; };
        const dk = parseDate(g("B2")) || new Date().toISOString().split("T")[0];
        const manager = gs("D2");
        days.push({
          dateKey: dk,
          lunch: { manager, diners:gn("B5"), avgPerDiner:gn("B6"), staffMeals:gn("B7"), deliveries:{total:gn("B8"),wolt:gn("B9")}, cancellations:[], topDishes:[gs("B21"),gs("B22"),gs("B23")].filter(Boolean), operationalIssues:[] },
          dinner: { manager, diners:gn("B32"), avgPerDiner:gn("B33"), staffMeals:gn("B34"), deliveries:{total:gn("B35"),wolt:gn("B36")}, cancellations:[], topDishes:[gs("B49"),gs("B50"),gs("B51")].filter(Boolean), operationalIssues:[] },
        });
      } else {
        throw new Error("לא נמצא גיליון מתאים. ודא שאתה משתמש בתבנית של Hamburg");
      }

      if (days.length === 0) throw new Error("לא נמצאו ימים עם נתונים בקובץ");
      setResult(days);
      setStatus("success");
    } catch(e) {
      setErrMsg(e.message || "שגיאה בקריאת הקובץ");
      setStatus("error");
    }
  };

  const confirmImport = () => {
    if (!result) return;
    result.forEach(({ dateKey, lunch, dinner }) => {
      if (lunch)  onSubmit(dateKey, "lunch",  lunch);
      if (dinner) onSubmit(dateKey, "dinner", dinner);
    });
    onBack();
  };

  return (
    <div style={S.app}>
      <div style={S.header}>
        <button style={{background:"none",border:"none",color:"#fff",fontSize:20,cursor:"pointer"}} onClick={onBack}>←</button>
        <span style={S.headerTitle}>Hamburg 🍔</span>
        <span style={S.headerSub}>העלאת אקסל</span>
      </div>
      <div style={{padding:16}}>

        {/* Upload box */}
        {(status==="idle"||status==="error") && (
          <div
            style={{background:"#fff",borderRadius:12,padding:28,boxShadow:"0 1px 4px rgba(0,0,0,0.1)",textAlign:"center",border:"2px dashed #ccc",transition:"border 0.2s"}}
            onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="#2c5f8a";}}
            onDragLeave={e=>{e.currentTarget.style.borderColor="#ccc";}}
            onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor="#ccc";const f=e.dataTransfer.files[0];if(f)parseExcel(f);}}
          >
            <div style={{fontSize:32,fontWeight:800,color:"#2c5f8a",marginBottom:12,fontFamily:"Arial"}}>XLS</div>
            <div style={{fontSize:16,fontWeight:700,color:"#1a2e1a",marginBottom:6}}>גרור קובץ אקסל לכאן</div>
            <div style={{fontSize:13,color:"#aaa",marginBottom:16}}>או לחץ לבחירה</div>
            <label style={{display:"inline-block",background:"#2c5f8a",color:"#fff",borderRadius:10,padding:"12px 24px",fontSize:15,fontWeight:700,cursor:"pointer"}}>
              בחר קובץ
              <input type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={e=>{ if(e.target.files[0]) parseExcel(e.target.files[0]); }}/>
            </label>
            <div style={{fontSize:12,color:"#bbb",marginTop:10}}>דוח חודשי / דוח יומי</div>
            {status==="error" && <div style={{marginTop:12,color:"#c0392b",fontSize:14}}>⚠️ {errMsg}</div>}
          </div>
        )}

        {status==="parsing" && (
          <div style={{background:"#fff",borderRadius:12,padding:40,textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.1)"}}>
            <div style={{fontSize:32}}>⏳</div>
            <div style={{fontSize:16,color:"#666",marginTop:12}}>קורא את הקובץ...</div>
          </div>
        )}

        {status==="success" && result && (
          <div>
            <div style={{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.1)",marginBottom:12}}>
              <div style={{fontSize:16,fontWeight:800,color:"#1a2e1a",marginBottom:8}}>✅ נמצאו {result.length} ימים:</div>
              <div style={{maxHeight:320,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
                {result.map(({dateKey,lunch,dinner})=>(
                  <div key={dateKey} style={{background:"#f8f8f8",borderRadius:8,padding:10,fontSize:13}}>
                    <div style={{fontWeight:700,color:"#1a2e1a",marginBottom:4}}>{dateKey}</div>
                    {lunch&&<div style={{color:"#2c5f8a"}}>🌅 {lunch.diners} סועדים | וולט {lunch.deliveries.wolt}/{lunch.deliveries.total} משלוחים</div>}
                    {dinner&&<div style={{color:"#555"}}>🌙 {dinner.diners} סועדים | וולט {dinner.deliveries.wolt}/{dinner.deliveries.total} משלוחים</div>}
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button style={{...S.nextBtn,background:"#eee",color:"#333",flex:1}} onClick={()=>setStatus("idle")}>← חזור</button>
              <button style={{...S.nextBtn,flex:2,background:"#1a2e1a"}} onClick={confirmImport}>ייבא {result.length} ימים לדשבורד ✓</button>
            </div>
          </div>
        )}

        {/* Download template note */}
        <div style={{marginTop:16,background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",textAlign:"center"}}>
          <div style={{fontSize:13,color:"#888",marginBottom:6}}>📎 הורד תבנית אקסל</div>
          <div style={{fontSize:12,color:"#aaa"}}>כנס מהמחשב לאפליקציה ← העלאת אקסל ← הורד תבנית</div>
        </div>
      </div>
    </div>
  );
}

const S = {
  app: { minHeight:"100vh", background:"#f0f0f0", fontFamily:"Arial, sans-serif", direction:"rtl" },
  header: { background:"#1a2e1a", color:"#fff", padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  headerTitle: { fontSize:18, fontWeight:700 },
  headerSub: { fontSize:12, opacity:0.7 },
  card: { margin:"12px 12px 0", borderRadius:10, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.1)", background:"#fff" },
  cardHdr: { padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  cardBody: { padding:"14px 14px 16px" },
  bigNum: { fontSize:34, fontWeight:800, color:"#111", textAlign:"right" },
  sub: { fontSize:13, color:"#666" },
  divLine: { height:1, background:"#eee", margin:"10px 0" },
  shiftBadge: { fontSize:11, color:"#fff", borderRadius:4, padding:"2px 6px" },
  uniRow: { display:"flex", alignItems:"center", gap:8, padding:"8px 4px", borderBottom:"1px solid #f0f0f0", cursor:"pointer", borderRadius:6 },
  uniDay: { display:"flex", flexDirection:"column", alignItems:"center", width:28, flexShrink:0 },
  uniBar: { flex:1, height:22, background:"#eee", borderRadius:4, overflow:"visible", position:"relative" },
  uniRight: { flexShrink:0 },
  editBtn: { background:"none", border:"none", cursor:"pointer", fontSize:14, padding:"0 2px" },
  saveBtn: { background:"#4a7c3f", color:"#fff", border:"none", borderRadius:4, padding:"3px 8px", cursor:"pointer", fontSize:13 },
  revInput: { width:76, border:"1px solid #4a7c3f", borderRadius:4, padding:"3px 6px", fontSize:12, direction:"ltr" },
  section: { background:"#fff", borderRadius:12, padding:16, marginBottom:12, boxShadow:"0 1px 4px rgba(0,0,0,0.08)" },
  secTitle: { fontSize:16, fontWeight:800, color:"#111", marginBottom:14, paddingBottom:10, borderBottom:"2px solid #f0f0f0" },
  inp: { width:"100%", border:"1.5px solid #ddd", borderRadius:8, padding:"11px 12px", fontSize:15, boxSizing:"border-box", direction:"rtl", outline:"none", marginBottom:4 },
  inpSm: { width:"100%", border:"1.5px solid #ddd", borderRadius:8, padding:"8px 10px", fontSize:13, boxSizing:"border-box", direction:"rtl", outline:"none" },
  nextBtn: { flex:1, background:"#4a7c3f", color:"#fff", border:"none", borderRadius:10, padding:"13px", fontSize:15, fontWeight:700, cursor:"pointer" },
  shiftBtn: { width:"100%", maxWidth:300, border:"2px solid", borderRadius:16, padding:"24px 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:8, cursor:"pointer" },
  homeBtn: { width:240, border:"none", borderRadius:16, padding:"20px 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:8, cursor:"pointer" },
};
