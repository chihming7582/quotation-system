import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAofc5wnrwfrml5WtjZGIfJkydhstfmfRs",
  authDomain: "quotation-system-1c2fb.firebaseapp.com",
  projectId: "quotation-system-1c2fb",
  storageBucket: "quotation-system-1c2fb.firebasestorage.app",
  messagingSenderId: "865094658053",
  appId: "1:865094658053:web:9c7a8cb4a5d424551b146c"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const QNUM_KEY = "qs_qnum_v3";
function genQNum() {
  const n = parseInt(localStorage.getItem(QNUM_KEY) || "1000") + 1;
  localStorage.setItem(QNUM_KEY, n);
  return `QT-${new Date().getFullYear()}-${String(n).padStart(4,"0")}`;
}

const CURRENCIES = { TWD:"NT$", USD:"US$", CNY:"¥", EUR:"€", JPY:"¥", HKD:"HK$" };
const UNITS = ["式","個","件","台","組","批","月","次","小時","天","項","套","瓶","箱","公斤"];
const BLANK = {
  quoteNumber:"", quoteDate: new Date().toISOString().split("T")[0],
  validDays:"30", currency:"TWD",
  companyName:"", companyAddress:"", companyPhone:"", companyEmail:"",
  clientName:"", clientCompany:"", clientAddress:"", clientPhone:"", clientEmail:"",
  items:[{ id:1, description:"", qty:1, unit:"式", unitPrice:0, note:"" }],
  taxRate:"5", paymentTerms:"30天內付清", bankInfo:"", notes:""
};

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
  html, body { height:100%; }
  body { font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif; background:#0b0f1a; }
  :root { --bg:#0b0f1a; --surface:#111827; --card:#1a2236; --border:#1e2d45; --accent:#e8a020; --text:#f0f4ff; --muted:#64748b; --sub:#94a3b8; }
  .qs-root { background:var(--bg); min-height:100vh; color:var(--text); font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif; }
  .inp { width:100%; background:#0d1526; border:1.5px solid var(--border); border-radius:8px; padding:9px 12px; font-size:13px; color:var(--text); font-family:inherit; transition:border-color .2s; outline:none; }
  .inp:focus { border-color:var(--accent); }
  .inp::placeholder { color:#3d5066; }
  textarea.inp { resize:vertical; }
  select.inp { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M0 0l6 8 6-8z' fill='%2364748b'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; padding-right:28px; }
  .btn { border:none; border-radius:8px; cursor:pointer; font-family:inherit; font-weight:600; transition:all .2s; display:inline-flex; align-items:center; justify-content:center; gap:6px; }
  .btn-primary { background:linear-gradient(135deg,#e8a020,#c97d10); color:#0b0f1a; }
  .btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(232,160,32,.4); }
  .btn-ghost { background:transparent; border:1.5px solid var(--border); color:var(--sub); }
  .btn-ghost:hover { border-color:var(--accent); color:var(--accent); }
  .btn-success { background:linear-gradient(135deg,#059669,#047857); color:white; }
  .btn-danger { background:#450a0a; border:1px solid #7f1d1d; color:#fca5a5; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:16px; }
  .field-label { font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.8px; margin-bottom:5px; display:block; }
  .section-title { font-size:11px; font-weight:700; color:var(--accent); text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; }
  .mob-nav { display:flex; background:var(--surface); border-top:1px solid var(--border); position:fixed; bottom:0; left:0; right:0; z-index:100; }
  .mob-nav-item { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px 4px 14px; cursor:pointer; transition:all .2s; border:none; background:none; color:var(--muted); font-family:inherit; font-size:10px; gap:3px; }
  .mob-nav-item.active { color:var(--accent); }
  .mob-nav-item .nav-icon { font-size:20px; }
  .toast { position:fixed; top:70px; left:50%; transform:translateX(-50%); background:#064e3b; color:#6ee7b7; border:1px solid #065f46; border-radius:10px; padding:10px 20px; font-size:13px; font-weight:600; z-index:9999; animation:fadeInOut 2.5s forwards; white-space:nowrap; pointer-events:none; }
  .toast-err { background:#450a0a; color:#fca5a5; border-color:#7f1d1d; }
  @keyframes fadeInOut { 0%{opacity:0;transform:translateX(-50%) translateY(-8px)} 15%{opacity:1;transform:translateX(-50%) translateY(0)} 80%{opacity:1} 100%{opacity:0} }
  .sync-dot { width:7px; height:7px; border-radius:50%; background:#22c55e; display:inline-block; margin-right:5px; box-shadow:0 0 6px #22c55e; }
  .sync-dot.syncing { background:#f59e0b; box-shadow:0 0 6px #f59e0b; animation:pulse .8s infinite; }
  .sync-dot.err { background:#ef4444; box-shadow:0 0 6px #ef4444; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }
  @media print {
    @page { size:A4; margin:10mm; }
    body > * { display:none !important; }
    #qs-printable { display:block !important; position:fixed; top:0; left:0; width:100%; background:white; z-index:99999; padding:20px; }
  }
  #qs-printable { display:none; }
`;

function QuotePreview({ form }) {
  const sym = CURRENCIES[form.currency] || "NT$";
  const fmt = (n) => `${sym} ${Number(n).toLocaleString("zh-TW",{minimumFractionDigits:0})}`;
  const subtotal = form.items.reduce((s,i) => s + (+i.qty||0)*(+i.unitPrice||0), 0);
  const tax = subtotal * (+form.taxRate||0) / 100;
  const total = subtotal + tax;
  return (
    <div style={{background:"white",color:"#1a1a1a",fontFamily:"'Noto Sans TC','Microsoft JhengHei',sans-serif",fontSize:12,lineHeight:1.6}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,paddingBottom:16,borderBottom:"3px solid #1d3461"}}>
        <div>
          <div style={{fontSize:22,fontWeight:800,color:"#1d3461"}}>{form.companyName||"公司名稱"}</div>
          {form.companyAddress&&<div style={{fontSize:10,color:"#666",marginTop:3}}>{form.companyAddress}</div>}
          {(form.companyPhone||form.companyEmail)&&<div style={{fontSize:10,color:"#666"}}>{[form.companyPhone,form.companyEmail].filter(Boolean).join(" · ")}</div>}
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:20,fontWeight:800,color:"#1d3461",letterSpacing:3}}>報 價 單</div>
          <div style={{fontSize:9,color:"#999",letterSpacing:2}}>QUOTATION</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={{background:"#f0f4f8",borderRadius:8,padding:"10px 12px",borderLeft:"4px solid #1d3461"}}>
          <div style={{fontSize:9,color:"#777",fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>報價對象</div>
          <div style={{fontWeight:700,fontSize:13}}>{form.clientCompany||form.clientName||"客戶名稱"}</div>
          {form.clientCompany&&form.clientName&&<div style={{fontSize:11,color:"#555",marginTop:2}}>聯絡人：{form.clientName}</div>}
          {form.clientAddress&&<div style={{fontSize:10,color:"#666"}}>{form.clientAddress}</div>}
          {form.clientPhone&&<div style={{fontSize:10,color:"#666"}}>Tel: {form.clientPhone}</div>}
          {form.clientEmail&&<div style={{fontSize:10,color:"#666"}}>{form.clientEmail}</div>}
        </div>
        <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}>
          {[["報價單號",form.quoteNumber],["報價日期",form.quoteDate],["有效天數",form.validDays?`${form.validDays} 天`:""],["幣別",form.currency],["付款條件",form.paymentTerms]].filter(([,v])=>v).map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
              <span style={{color:"#888"}}>{k}：</span><span style={{fontWeight:600}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <table style={{width:"100%",borderCollapse:"collapse",marginBottom:12}}>
        <thead>
          <tr style={{background:"#1d3461",color:"white"}}>
            {["#","品項說明","數量","單位","單價","小計"].map((h,i)=>(
              <th key={h} style={{padding:"8px",fontSize:10,fontWeight:700,textAlign:i>=2?"right":i===0?"center":"left"}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {form.items.map((item,idx)=>(
            <tr key={item.id} style={{background:idx%2===0?"white":"#f8fafc",borderBottom:"1px solid #e5e7eb"}}>
              <td style={{padding:"8px",textAlign:"center",color:"#aaa",fontSize:11}}>{idx+1}</td>
              <td style={{padding:"8px",fontSize:12}}>
                <div style={{fontWeight:500}}>{item.description||<span style={{color:"#ccc"}}>—</span>}</div>
                {item.note&&<div style={{fontSize:10,color:"#888",fontStyle:"italic"}}>※ {item.note}</div>}
              </td>
              <td style={{padding:"8px",textAlign:"right",fontSize:12}}>{item.qty}</td>
              <td style={{padding:"8px",textAlign:"right",fontSize:11,color:"#666"}}>{item.unit}</td>
              <td style={{padding:"8px",textAlign:"right",fontSize:11}}>{fmt(+item.unitPrice||0)}</td>
              <td style={{padding:"8px",textAlign:"right",fontWeight:700,color:"#1d3461",fontSize:12}}>{fmt((+item.qty||0)*(+item.unitPrice||0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <div style={{minWidth:220}}>
          <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #e5e7eb",fontSize:12}}><span style={{color:"#666"}}>小計</span><span style={{fontWeight:500}}>{fmt(subtotal)}</span></div>
          {(+form.taxRate)>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #e5e7eb",fontSize:12}}><span style={{color:"#666"}}>稅金（{form.taxRate}%）</span><span style={{fontWeight:500}}>{fmt(tax)}</span></div>}
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 12px",background:"#1d3461",borderRadius:6,marginTop:6}}>
            <span style={{color:"white",fontWeight:700,fontSize:13}}>總計</span>
            <span style={{color:"#fbbf24",fontWeight:800,fontSize:15}}>{fmt(total)}</span>
          </div>
        </div>
      </div>
      {(form.bankInfo||form.notes)&&(
        <div style={{display:"grid",gridTemplateColumns:form.bankInfo&&form.notes?"1fr 1fr":"1fr",gap:10,marginBottom:14}}>
          {form.bankInfo&&<div style={{background:"#eff6ff",borderRadius:8,padding:"10px 12px",border:"1px solid #bfdbfe"}}>
            <div style={{fontSize:9,color:"#1d4ed8",fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>匯款資訊</div>
            <div style={{fontSize:10,whiteSpace:"pre-line",lineHeight:1.7}}>{form.bankInfo}</div>
          </div>}
          {form.notes&&<div style={{background:"#fffbeb",borderRadius:8,padding:"10px 12px",border:"1px solid #fde68a"}}>
            <div style={{fontSize:9,color:"#92400e",fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>備註說明</div>
            <div style={{fontSize:10,whiteSpace:"pre-line",lineHeight:1.7}}>{form.notes}</div>
          </div>}
        </div>
      )}
      <div style={{borderTop:"2px solid #e5e7eb",paddingTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:9,color:"#bbb"}}>此報價單由系統產生 · {form.quoteNumber}</div>
        <div style={{display:"flex",gap:32}}>
          {["客戶簽名","業務簽名"].map(l=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{borderTop:"1px solid #aaa",paddingTop:4,width:90,fontSize:9,color:"#999"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const isMobile = useIsMobile();
  const [form, setForm] = useState({...BLANK, quoteNumber: genQNum()});
  const [clients, setClients] = useState([]);
  const [selClient, setSelClient] = useState("");
  const [mobileTab, setMobileTab] = useState("form");
  const [formSection, setFormSection] = useState("basic");
  const [toast, setToast] = useState("");
  const [toastKey, setToastKey] = useState(0);
  const [toastErr, setToastErr] = useState(false);
  const [syncStatus, setSyncStatus] = useState("syncing");
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "clients"),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
        setClients(data);
        setDbReady(true);
        setSyncStatus("synced");
      },
      () => { setSyncStatus("error"); }
    );
    return () => unsub();
  }, []);

  const showToast = (msg, err=false) => {
    setToast(msg); setToastErr(err); setToastKey(k=>k+1);
    setTimeout(()=>setToast(""), 2500);
  };

  const sym = CURRENCIES[form.currency] || "NT$";
  const fmt = (n) => `${sym} ${Number(n).toLocaleString("zh-TW")}`;
  const subtotal = form.items.reduce((s,i) => s + (+i.qty||0)*(+i.unitPrice||0), 0);
  const tax = subtotal*(+form.taxRate||0)/100;
  const total = subtotal+tax;

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const setItem = (idx,k,v) => setForm(f=>({...f,items:f.items.map((it,i)=>i===idx?{...it,[k]:v}:it)}));
  const addItem = () => setForm(f=>({...f,items:[...f.items,{id:Date.now(),description:"",qty:1,unit:"式",unitPrice:0,note:""}]}));
  const removeItem = (idx) => setForm(f=>({...f,items:f.items.filter((_,i)=>i!==idx)}));

  const selectClient = (id) => {
    setSelClient(id);
    if(!id) return;
    const c = clients.find(c=>c.id===id);
    if(c) setForm(f=>({...f,clientName:c.name||"",clientCompany:c.company||"",clientAddress:c.address||"",clientPhone:c.phone||"",clientEmail:c.email||""}));
  };

  const saveClient = async () => {
    if(!form.clientName&&!form.clientCompany) { showToast("⚠️ 請先填入客戶姓名或公司",true); return; }
    setSyncStatus("syncing");
    try {
      const existing = clients.find(c=>c.company===form.clientCompany&&c.name===form.clientName);
      const data = { name:form.clientName, company:form.clientCompany, address:form.clientAddress, phone:form.clientPhone, email:form.clientEmail, updatedAt: Date.now() };
      if(existing) {
        await updateDoc(doc(db,"clients",existing.id), data);
        showToast("✅ 客戶資料已更新");
      } else {
        const ref = await addDoc(collection(db,"clients"), {...data, createdAt: Date.now()});
        setSelClient(ref.id);
        showToast("✅ 已儲存新客戶（雲端同步）");
      }
      setSyncStatus("synced");
    } catch { setSyncStatus("error"); showToast("❌ 儲存失敗，請重試",true); }
  };

  const deleteClient = async (id) => {
    if(!window.confirm("確定要刪除此客戶嗎？")) return;
    setSyncStatus("syncing");
    try {
      await deleteDoc(doc(db,"clients",id));
      if(selClient===id) setSelClient("");
      showToast("🗑 已刪除客戶");
      setSyncStatus("synced");
    } catch { setSyncStatus("error"); showToast("❌ 刪除失敗",true); }
  };

  const handlePrint = () => {
    const el = document.getElementById("qs-printable");
    if(el){ el.style.display="block"; setTimeout(()=>{ window.print(); setTimeout(()=>{ el.style.display="none"; },800); },150); }
  };

  const newQuote = () => {
    if(!window.confirm("確定要建立新報價單？目前資料將會清空。")) return;
    setForm({...BLANK, quoteNumber:genQNum()});
    setSelClient("");
    showToast("📄 新報價單已建立");
  };

  const Inp = ({label, children}) => (
    <div style={{marginBottom:12}}>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );

  const sectionTabs = [
    {k:"basic",icon:"📋",label:"基本"},
    {k:"client",icon:"👤",label:"客戶"},
    {k:"items",icon:"📦",label:"項目"},
    {k:"other",icon:"⚙️",label:"其他"},
  ];

  const FormPanel = () => (
    <div style={{padding:isMobile?"14px 14px 100px":"20px",overflowY:"auto",height:"100%"}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:12,fontSize:11,color:"var(--muted)"}}>
        <span className={`sync-dot${syncStatus==="syncing"?" syncing":syncStatus==="error"?" err":""}`}/>
        {syncStatus==="synced"&&"雲端同步正常 ✓"}
        {syncStatus==="syncing"&&"同步中..."}
        {syncStatus==="error"&&"同步異常，請檢查網路"}
      </div>
      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#e8a020",marginBottom:10}}>📁 舊客戶快速填入</div>
        <select className="inp" value={selClient} onChange={e=>selectClient(e.target.value)}>
          <option value="">— 選擇舊客戶 —</option>
          {clients.map(c=>(
            <option key={c.id} value={c.id}>{c.company||c.name}{c.company&&c.name?` (${c.name})`:""}</option>
          ))}
        </select>
        {clients.length===0&&dbReady&&<div style={{fontSize:11,color:"var(--muted)",marginTop:8,textAlign:"center"}}>尚無儲存的客戶</div>}
        {!dbReady&&<div style={{fontSize:11,color:"var(--muted)",marginTop:8,textAlign:"center"}}>載入客戶資料中...</div>}
      </div>
      <div style={{display:"flex",gap:4,marginBottom:14,background:"var(--surface)",borderRadius:10,padding:4}}>
        {sectionTabs.map(({k,icon,label})=>(
          <button key={k} onClick={()=>setFormSection(k)} className="btn" style={{flex:1,padding:"8px 2px",borderRadius:7,border:"none",background:formSection===k?"var(--accent)":"transparent",color:formSection===k?"#0b0f1a":"var(--muted)",fontSize:11,fontWeight:formSection===k?700:400,flexDirection:"column",gap:2}}>
            <span style={{fontSize:15}}>{icon}</span><span>{label}</span>
          </button>
        ))}
      </div>
      {formSection==="basic"&&<>
        <div className="section-title">報價單資訊</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="報價單號"><input className="inp" value={form.quoteNumber} onChange={e=>set("quoteNumber",e.target.value)}/></Inp>
          <Inp label="報價日期"><input type="date" className="inp" value={form.quoteDate} onChange={e=>set("quoteDate",e.target.value)}/></Inp>
          <Inp label="有效天數"><input type="number" className="inp" value={form.validDays} onChange={e=>set("validDays",e.target.value)}/></Inp>
          <Inp label="幣別"><select className="inp" value={form.currency} onChange={e=>set("currency",e.target.value)}>{Object.entries(CURRENCIES).map(([k,v])=><option key={k} value={k}>{k} {v}</option>)}</select></Inp>
        </div>
        <div className="section-title" style={{marginTop:4}}>我方公司資訊</div>
        <Inp label="公司名稱"><input className="inp" placeholder="您的公司名稱" value={form.companyName} onChange={e=>set("companyName",e.target.value)}/></Inp>
        <Inp label="地址"><input className="inp" placeholder="公司地址" value={form.companyAddress} onChange={e=>set("companyAddress",e.target.value)}/></Inp>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="電話"><input className="inp" placeholder="電話" value={form.companyPhone} onChange={e=>set("companyPhone",e.target.value)}/></Inp>
          <Inp label="Email"><input className="inp" placeholder="Email" value={form.companyEmail} onChange={e=>set("companyEmail",e.target.value)}/></Inp>
        </div>
      </>}
      {formSection==="client"&&<>
        <div className="section-title">客戶資料</div>
        <Inp label="聯絡人姓名"><input className="inp" placeholder="聯絡人" value={form.clientName} onChange={e=>set("clientName",e.target.value)}/></Inp>
        <Inp label="客戶公司"><input className="inp" placeholder="公司名稱" value={form.clientCompany} onChange={e=>set("clientCompany",e.target.value)}/></Inp>
        <Inp label="地址"><input className="inp" placeholder="地址" value={form.clientAddress} onChange={e=>set("clientAddress",e.target.value)}/></Inp>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="電話"><input className="inp" placeholder="電話" value={form.clientPhone} onChange={e=>set("clientPhone",e.target.value)}/></Inp>
          <Inp label="Email"><input className="inp" placeholder="Email" value={form.clientEmail} onChange={e=>set("clientEmail",e.target.value)}/></Inp>
        </div>
        <button onClick={saveClient} className="btn btn-success" style={{width:"100%",padding:"11px",fontSize:13,marginTop:4}}>☁️ 儲存至雲端</button>
        {clients.length>0&&<>
          <div style={{fontSize:11,color:"var(--muted)",marginTop:18,marginBottom:10,fontWeight:700}}>已儲存客戶（{clients.length} 位）— 雲端同步</div>
          {clients.map(c=>(
            <div key={c.id} className="card" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,padding:"10px 12px"}}>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>{c.company||c.name}</div>
                {c.company&&c.name&&<div style={{fontSize:11,color:"var(--muted)"}}>{c.name}</div>}
                {c.phone&&<div style={{fontSize:10,color:"var(--sub)"}}>{c.phone}</div>}
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>selectClient(c.id)} className="btn btn-ghost" style={{padding:"5px 10px",fontSize:11}}>選用</button>
                <button onClick={()=>deleteClient(c.id)} className="btn btn-danger" style={{padding:"5px 8px",fontSize:11}}>×</button>
              </div>
            </div>
          ))}
        </>}
      </>}
      {formSection==="items"&&<>
        <div className="section-title">報價項目</div>
        {form.items.map((item,idx)=>(
          <div key={item.id} className="card" style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:12,fontWeight:700,color:"var(--accent)"}}>項目 {idx+1}</span>
              {form.items.length>1&&<button onClick={()=>removeItem(idx)} className="btn btn-danger" style={{padding:"3px 10px",fontSize:11}}>刪除</button>}
            </div>
            <Inp label="品項說明"><input className="inp" placeholder="產品 / 服務說明" value={item.description} onChange={e=>setItem(idx,"description",e.target.value)}/></Inp>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <Inp label="數量"><input type="number" className="inp" min="0" value={item.qty} onChange={e=>setItem(idx,"qty",e.target.value)}/></Inp>
              <Inp label="單位"><select className="inp" value={item.unit} onChange={e=>setItem(idx,"unit",e.target.value)}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select></Inp>
              <Inp label="單價"><input type="number" className="inp" min="0" value={item.unitPrice} onChange={e=>setItem(idx,"unitPrice",e.target.value)}/></Inp>
            </div>
            <div style={{textAlign:"right",fontSize:12,color:"var(--sub)",marginBottom:8}}>小計：<span style={{color:"var(--accent)",fontWeight:700}}>{fmt((+item.qty||0)*(+item.unitPrice||0))}</span></div>
            <Inp label="備註（選填）"><input className="inp" placeholder="此項備註" value={item.note} onChange={e=>setItem(idx,"note",e.target.value)}/></Inp>
          </div>
        ))}
        <button onClick={addItem} className="btn btn-ghost" style={{width:"100%",padding:"11px",fontSize:13,borderStyle:"dashed"}}>＋ 新增項目</button>
        <div className="card" style={{marginTop:14,background:"#0d1a2d"}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--sub)",marginBottom:6}}><span>小計</span><span>{fmt(subtotal)}</span></div>
          {(+form.taxRate)>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--sub)",marginBottom:6}}><span>稅金（{form.taxRate}%）</span><span>{fmt(tax)}</span></div>}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:15,fontWeight:800,color:"var(--accent)"}}><span>總計</span><span>{fmt(total)}</span></div>
        </div>
      </>}
      {formSection==="other"&&<>
        <div className="section-title">其他設定</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Inp label="稅率 (%)"><input type="number" className="inp" min="0" max="100" value={form.taxRate} onChange={e=>set("taxRate",e.target.value)}/></Inp>
          <Inp label="付款條件"><input className="inp" placeholder="例：30天內" value={form.paymentTerms} onChange={e=>set("paymentTerms",e.target.value)}/></Inp>
        </div>
        <Inp label="銀行匯款資訊"><textarea className="inp" rows={3} placeholder="銀行名稱、帳號、戶名..." value={form.bankInfo} onChange={e=>set("bankInfo",e.target.value)}/></Inp>
        <Inp label="備註說明"><textarea className="inp" rows={4} placeholder="其他說明、注意事項..." value={form.notes} onChange={e=>set("notes",e.target.value)}/></Inp>
      </>}
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      <div id="qs-printable"><QuotePreview form={form}/></div>
      {toast&&<div key={toastKey} className={`toast${toastErr?" toast-err":""}`}>{toast}</div>}
      <div className="qs-root">
        <div style={{background:"#111827",borderBottom:"1px solid #1e2d45",padding:isMobile?"12px 14px":"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:9,background:"linear-gradient(135deg,#e8a020,#c97d10)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>📋</div>
            <div>
              <div style={{fontSize:isMobile?15:18,fontWeight:800,letterSpacing:-.5}}>報價單系統</div>
              {!isMobile&&<div style={{fontSize:10,color:"var(--muted)"}}>☁️ 雲端同步版</div>}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={newQuote} className="btn btn-ghost" style={{padding:isMobile?"7px 10px":"8px 14px",fontSize:12}}>{isMobile?"＋":"＋ 新報價單"}</button>
            <button onClick={handlePrint} className="btn btn-primary" style={{padding:isMobile?"7px 12px":"8px 16px",fontSize:12}}>{isMobile?"⬇ PDF":"⬇ 匯出 PDF"}</button>
          </div>
        </div>
        {!isMobile&&(
          <div style={{display:"flex",height:"calc(100vh - 65px)"}}>
            <div style={{width:"46%",minWidth:340,borderRight:"1px solid var(--border)",overflow:"hidden",display:"flex",flexDirection:"column"}}><FormPanel/></div>
            <div style={{flex:1,overflowY:"auto",background:"#0d1117",padding:20}}>
              <div style={{fontSize:11,color:"var(--muted)",marginBottom:12,textAlign:"center",fontWeight:600,letterSpacing:1}}>📄 即時預覽</div>
              <div style={{background:"white",borderRadius:10,padding:"28px 32px",boxShadow:"0 8px 40px rgba(0,0,0,.5)"}}><QuotePreview form={form}/></div>
            </div>
          </div>
        )}
        {isMobile&&(
          <>
            <div style={{height:"calc(100vh - 57px)",overflowY:"auto"}}>
              {mobileTab==="form"&&<FormPanel/>}
              {mobileTab==="preview"&&(
                <div style={{padding:"14px 14px 100px",background:"#0d1117",minHeight:"100%"}}>
                  <div style={{fontSize:11,color:"var(--muted)",marginBottom:12,textAlign:"center",fontWeight:600,letterSpacing:1}}>📄 報價單預覽</div>
                  <div style={{background:"white",borderRadius:10,padding:"16px",boxShadow:"0 8px 40px rgba(0,0,0,.5)"}}><QuotePreview form={form}/></div>
                  <button onClick={handlePrint} className="btn btn-primary" style={{width:"100%",marginTop:16,padding:14,fontSize:14}}>⬇ 匯出 PDF</button>
                </div>
              )}
              {mobileTab==="clients"&&(
                <div style={{padding:"14px 14px 100px"}}>
                  <div className="section-title">客戶資料庫（雲端同步）</div>
                  <div className="card" style={{marginBottom:14}}>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--accent)",marginBottom:10}}>快速填入</div>
                    <select className="inp" value={selClient} onChange={e=>{ selectClient(e.target.value); if(e.target.value){ showToast("✅ 已填入客戶資料"); setMobileTab("form"); } }}>
                      <option value="">— 選擇舊客戶 —</option>
                      {clients.map(c=><option key={c.id} value={c.id}>{c.company||c.name}{c.company&&c.name?` (${c.name})`:""}</option>)}
                    </select>
                  </div>
                  {clients.length===0&&dbReady&&(
                    <div style={{textAlign:"center",color:"var(--muted)",fontSize:13,padding:"30px 0"}}>
                      <div style={{fontSize:32,marginBottom:10}}>📂</div>
                      <div>尚無儲存的客戶</div>
                      <div style={{fontSize:11,marginTop:4}}>在「填寫」→「客戶」分頁儲存</div>
                    </div>
                  )}
                  {clients.map(c=>(
                    <div key={c.id} className="card" style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:14}}>{c.company||c.name}</div>
                          {c.company&&c.name&&<div style={{fontSize:12,color:"var(--sub)"}}>{c.name}</div>}
                          {c.phone&&<div style={{fontSize:11,color:"var(--muted)"}}>{c.phone}</div>}
                          {c.email&&<div style={{fontSize:11,color:"var(--muted)"}}>{c.email}</div>}
                        </div>
                        <button onClick={()=>deleteClient(c.id)} className="btn btn-danger" style={{padding:"5px 10px",fontSize:11}}>×</button>
                      </div>
                      <button onClick={()=>{ selectClient(c.id); setMobileTab("form"); showToast(`✅ 已填入 ${c.company||c.name}`); }} className="btn btn-ghost" style={{width:"100%",marginTop:10,padding:"8px",fontSize:12}}>選用此客戶 →</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <nav className="mob-nav">
              {[{k:"form",icon:"✏️",label:"填寫"},{k:"preview",icon:"👁️",label:"預覽"},{k:"clients",icon:"👥",label:`客戶${clients.length>0?`(${clients.length})`:""}`}].map(({k,icon,label})=>(
                <button key={k} className={`mob-nav-item${mobileTab===k?" active":""}`} onClick={()=>setMobileTab(k)}>
                  <span className="nav-icon">{icon}</span><span>{label}</span>
                </button>
              ))}
            </nav>
          </>
        )}
      </div>
    </>
  );
}
