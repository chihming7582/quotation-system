import { useState, useEffect, useRef, useCallback } from "react";
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

/* ── IME-safe input: handles Chinese composition correctly ── */
function ImeInput({ value, onChange, className, placeholder, type="text", min, max, style }) {
  const composing = useRef(false);
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      ref.current.value = value ?? "";
    }
  }, [value]);

  return (
    <input
      ref={ref}
      type={type}
      min={min}
      max={max}
      className={className}
      placeholder={placeholder}
      style={style}
      defaultValue={value}
      onCompositionStart={() => { composing.current = true; }}
      onCompositionEnd={(e) => { composing.current = false; onChange(e.target.value); }}
      onChange={(e) => { if (!composing.current) onChange(e.target.value); }}
    />
  );
}

function ImeTextarea({ value, onChange, className, placeholder, rows, style }) {
  const composing = useRef(false);
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      ref.current.value = value ?? "";
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={rows}
      className={className}
      placeholder={placeholder}
      style={style}
      defaultValue={value}
      onCompositionStart={() => { composing.current = true; }}
      onCompositionEnd={(e) => { composing.current = false; onChange(e.target.value); }}
      onChange={(e) => { if (!composing.current) onChange(e.target.value); }}
    />
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  html,body { height:100%; }
  body { font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif; background:#0b0f1a; }
  :root { --bg:#0b0f1a; --surface:#111827; --card:#1a2236; --border:#1e2d45; --accent:#e8a020; --text:#f0f4ff; --muted:#64748b; --sub:#94a3b8; }
  .qs-root { background:var(--bg); min-height:100vh; color:var(--text); }
  .inp { width:100%; background:#0d1526; border:1.5px solid var(--border); border-radius:8px; padding:9px 12px; font-size:13px; color:var(--text); font-family:inherit; transition:border-color .2s; outline:none; }
  .inp:focus { border-color:var(--accent); }
  .inp::placeholder { color:#3d5066; }
  textarea.inp { resize:vertical; }
  select.inp { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M0 0l6 8 6-8z' fill='%2364748b'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; padding-right:28px; }
  .btn { border:none; border-radius:8px; cursor:pointer; font-family:inherit; font-weight:600; transition:all .2s; display:inline-flex; align-items:center; justify-content:center; gap:6px; }
  .btn-primary { background:linear-gradient(135deg,#e8a020,#c97d10); color:#0b0f1a; }
  .btn-ghost { background:transparent; border:1.5px solid var(--border); color:var(--sub); }
  .btn-ghost:hover { border-color:var(--accent); color:var(--accent); }
  .btn-success { background:linear-gradient(135deg,#059669,#047857); color:white; }
  .btn-danger { background:#450a0a; border:1px solid #7f1d1d; color:#fca5a5; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:16px; }
  .flabel { font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.8px; margin-bottom:5px; display:block; }
  .stitle { font-size:11px; font-weight:700; color:var(--accent); text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; }
  .mob-nav { display:flex; background:var(--surface); border-top:1px solid var(--border); position:fixed; bottom:0; left:0; right:0; z-index:100; }
  .mob-nav-btn { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px 4px 14px; cursor:pointer; border:none; background:none; color:var(--muted); font-family:inherit; font-size:10px; gap:3px; transition:color .2s; }
  .mob-nav-btn.on { color:var(--accent); }
  .mob-nav-btn .ni { font-size:20px; }
  .toast { position:fixed; top:70px; left:50%; transform:translateX(-50%); background:#064e3b; color:#6ee7b7; border:1px solid #065f46; border-radius:10px; padding:10px 20px; font-size:13px; font-weight:600; z-index:9999; animation:fadeInOut 2.5s forwards; white-space:nowrap; pointer-events:none; }
  .toast.err { background:#450a0a; color:#fca5a5; border-color:#7f1d1d; }
  @keyframes fadeInOut { 0%{opacity:0;transform:translateX(-50%) translateY(-8px)} 15%{opacity:1;transform:translateX(-50%) translateY(0)} 80%{opacity:1} 100%{opacity:0} }
  .sdot { width:7px; height:7px; border-radius:50%; background:#22c55e; display:inline-block; margin-right:5px; box-shadow:0 0 6px #22c55e; }
  .sdot.spin { background:#f59e0b; box-shadow:0 0 6px #f59e0b; animation:pulse .8s infinite; }
  .sdot.bad { background:#ef4444; box-shadow:0 0 6px #ef4444; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:var(--border); border-radius:2px; }
  @media print {
    @page { size:A4; margin:10mm; }
    body > * { display:none !important; }
    #qsp { display:block !important; position:fixed; top:0; left:0; width:100%; background:white; z-index:99999; padding:20px; }
  }
  #qsp { display:none; }
`;

function Preview({ f }) {
  const sym = CURRENCIES[f.currency]||"NT$";
  const n = (v) => `${sym} ${Number(v).toLocaleString("zh-TW",{minimumFractionDigits:0})}`;
  const sub = f.items.reduce((s,i)=>s+(+i.qty||0)*(+i.unitPrice||0),0);
  const tax = sub*(+f.taxRate||0)/100;
  const tot = sub+tax;
  return (
    <div style={{background:"white",color:"#1a1a1a",fontFamily:"'Noto Sans TC','Microsoft JhengHei',sans-serif",fontSize:12,lineHeight:1.6}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,paddingBottom:16,borderBottom:"3px solid #1d3461"}}>
        <div>
          <div style={{fontSize:22,fontWeight:800,color:"#1d3461"}}>{f.companyName||"公司名稱"}</div>
          {f.companyAddress&&<div style={{fontSize:10,color:"#666",marginTop:3}}>{f.companyAddress}</div>}
          {(f.companyPhone||f.companyEmail)&&<div style={{fontSize:10,color:"#666"}}>{[f.companyPhone,f.companyEmail].filter(Boolean).join(" · ")}</div>}
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:20,fontWeight:800,color:"#1d3461",letterSpacing:3}}>報 價 單</div>
          <div style={{fontSize:9,color:"#999",letterSpacing:2}}>QUOTATION</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={{background:"#f0f4f8",borderRadius:8,padding:"10px 12px",borderLeft:"4px solid #1d3461"}}>
          <div style={{fontSize:9,color:"#777",fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>報價對象</div>
          <div style={{fontWeight:700,fontSize:13}}>{f.clientCompany||f.clientName||"客戶名稱"}</div>
          {f.clientCompany&&f.clientName&&<div style={{fontSize:11,color:"#555",marginTop:2}}>聯絡人：{f.clientName}</div>}
          {f.clientAddress&&<div style={{fontSize:10,color:"#666"}}>{f.clientAddress}</div>}
          {f.clientPhone&&<div style={{fontSize:10,color:"#666"}}>Tel: {f.clientPhone}</div>}
          {f.clientEmail&&<div style={{fontSize:10,color:"#666"}}>{f.clientEmail}</div>}
        </div>
        <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}>
          {[["報價單號",f.quoteNumber],["報價日期",f.quoteDate],["有效天數",f.validDays?`${f.validDays} 天`:""],["幣別",f.currency],["付款條件",f.paymentTerms]].filter(([,v])=>v).map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
              <span style={{color:"#888"}}>{k}：</span><span style={{fontWeight:600}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <table style={{width:"100%",borderCollapse:"collapse",marginBottom:12}}>
        <thead><tr style={{background:"#1d3461",color:"white"}}>
          {["#","品項說明","數量","單位","單價","小計"].map((h,i)=>(
            <th key={h} style={{padding:"8px",fontSize:10,fontWeight:700,textAlign:i>=2?"right":i===0?"center":"left"}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {f.items.map((item,idx)=>(
            <tr key={item.id} style={{background:idx%2===0?"white":"#f8fafc",borderBottom:"1px solid #e5e7eb"}}>
              <td style={{padding:"8px",textAlign:"center",color:"#aaa",fontSize:11}}>{idx+1}</td>
              <td style={{padding:"8px",fontSize:12}}>
                <div style={{fontWeight:500}}>{item.description||<span style={{color:"#ccc"}}>—</span>}</div>
                {item.note&&<div style={{fontSize:10,color:"#888",fontStyle:"italic"}}>※ {item.note}</div>}
              </td>
              <td style={{padding:"8px",textAlign:"right",fontSize:12}}>{item.qty}</td>
              <td style={{padding:"8px",textAlign:"right",fontSize:11,color:"#666"}}>{item.unit}</td>
              <td style={{padding:"8px",textAlign:"right",fontSize:11}}>{n(+item.unitPrice||0)}</td>
              <td style={{padding:"8px",textAlign:"right",fontWeight:700,color:"#1d3461",fontSize:12}}>{n((+item.qty||0)*(+item.unitPrice||0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <div style={{minWidth:220}}>
          <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #e5e7eb",fontSize:12}}><span style={{color:"#666"}}>小計</span><span style={{fontWeight:500}}>{n(sub)}</span></div>
          {(+f.taxRate)>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #e5e7eb",fontSize:12}}><span style={{color:"#666"}}>稅金（{f.taxRate}%）</span><span style={{fontWeight:500}}>{n(tax)}</span></div>}
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 12px",background:"#1d3461",borderRadius:6,marginTop:6}}>
            <span style={{color:"white",fontWeight:700,fontSize:13}}>總計</span>
            <span style={{color:"#fbbf24",fontWeight:800,fontSize:15}}>{n(tot)}</span>
          </div>
        </div>
      </div>
      {(f.bankInfo||f.notes)&&(
        <div style={{display:"grid",gridTemplateColumns:f.bankInfo&&f.notes?"1fr 1fr":"1fr",gap:10,marginBottom:14}}>
          {f.bankInfo&&<div style={{background:"#eff6ff",borderRadius:8,padding:"10px 12px",border:"1px solid #bfdbfe"}}>
            <div style={{fontSize:9,color:"#1d4ed8",fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>匯款資訊</div>
            <div style={{fontSize:10,whiteSpace:"pre-line",lineHeight:1.7}}>{f.bankInfo}</div>
          </div>}
          {f.notes&&<div style={{background:"#fffbeb",borderRadius:8,padding:"10px 12px",border:"1px solid #fde68a"}}>
            <div style={{fontSize:9,color:"#92400e",fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>備註說明</div>
            <div style={{fontSize:10,whiteSpace:"pre-line",lineHeight:1.7}}>{f.notes}</div>
          </div>}
        </div>
      )}
      <div style={{borderTop:"2px solid #e5e7eb",paddingTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:9,color:"#bbb"}}>此報價單由系統產生 · {f.quoteNumber}</div>
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(()=>{ const h=()=>setIsMobile(window.innerWidth<768); window.addEventListener("resize",h); return ()=>window.removeEventListener("resize",h); },[]);

  const [quoteNumber, setQuoteNumber] = useState(genQNum());
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [validDays, setValidDays] = useState("30");
  const [currency, setCurrency] = useState("TWD");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [items, setItems] = useState([{id:1,description:"",qty:1,unit:"式",unitPrice:0,note:""}]);
  const [taxRate, setTaxRate] = useState("5");
  const [paymentTerms, setPaymentTerms] = useState("30天內付清");
  const [bankInfo, setBankInfo] = useState("");
  const [notes, setNotes] = useState("");

  const form = { quoteNumber,quoteDate,validDays,currency,companyName,companyAddress,companyPhone,companyEmail,clientName,clientCompany,clientAddress,clientPhone,clientEmail,items,taxRate,paymentTerms,bankInfo,notes };

  const resetForm = () => {
    setQuoteNumber(genQNum()); setQuoteDate(new Date().toISOString().split("T")[0]);
    setValidDays("30"); setCurrency("TWD");
    setCompanyName(""); setCompanyAddress(""); setCompanyPhone(""); setCompanyEmail("");
    setClientName(""); setClientCompany(""); setClientAddress(""); setClientPhone(""); setClientEmail("");
    setItems([{id:1,description:"",qty:1,unit:"式",unitPrice:0,note:""}]);
    setTaxRate("5"); setPaymentTerms("30天內付清"); setBankInfo(""); setNotes("");
  };

  const [clients, setClients] = useState([]);
  const [selClient, setSelClient] = useState("");
  const [mobileTab, setMobileTab] = useState("form");
  const [section, setSection] = useState("basic");
  const [toast, setToast] = useState(""); const [toastKey, setToastKey] = useState(0); const [toastErr, setToastErr] = useState(false);
  const [sync, setSync] = useState("syncing");
  const [dbReady, setDbReady] = useState(false);

  useEffect(()=>{
    const unsub = onSnapshot(collection(db,"clients"),(snap)=>{
      const data = snap.docs.map(d=>({id:d.id,...d.data()}));
      data.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
      setClients(data); setDbReady(true); setSync("synced");
    },()=>setSync("error"));
    return ()=>unsub();
  },[]);

  const showToast = (msg,err=false) => { setToast(msg); setToastErr(err); setToastKey(k=>k+1); setTimeout(()=>setToast(""),2500); };

  const sym = CURRENCIES[currency]||"NT$";
  const fmtN = (v) => `${sym} ${Number(v).toLocaleString("zh-TW")}`;
  const subtotal = items.reduce((s,i)=>s+(+i.qty||0)*(+i.unitPrice||0),0);
  const tax = subtotal*(+taxRate||0)/100;
  const total = subtotal+tax;

  const setItem = (idx,k,v) => setItems(prev=>prev.map((it,i)=>i===idx?{...it,[k]:v}:it));
  const addItem = () => setItems(prev=>[...prev,{id:Date.now(),description:"",qty:1,unit:"式",unitPrice:0,note:""}]);
  const removeItem = (idx) => setItems(prev=>prev.filter((_,i)=>i!==idx));

  const selectClient = (id) => {
    setSelClient(id);
    if(!id) return;
    const c = clients.find(c=>c.id===id);
    if(c){ setClientName(c.name||""); setClientCompany(c.company||""); setClientAddress(c.address||""); setClientPhone(c.phone||""); setClientEmail(c.email||""); }
  };

  const saveClient = async () => {
    if(!clientName&&!clientCompany){ showToast("⚠️ 請先填入客戶姓名或公司",true); return; }
    setSync("syncing");
    try {
      const data = {name:clientName,company:clientCompany,address:clientAddress,phone:clientPhone,email:clientEmail,updatedAt:Date.now()};
      const existing = clients.find(c=>c.company===clientCompany&&c.name===clientName);
      if(existing){ await updateDoc(doc(db,"clients",existing.id),data); showToast("✅ 客戶資料已更新"); }
      else { const ref = await addDoc(collection(db,"clients"),{...data,createdAt:Date.now()}); setSelClient(ref.id); showToast("✅ 已儲存新客戶（雲端同步）"); }
      setSync("synced");
    } catch { setSync("error"); showToast("❌ 儲存失敗，請重試",true); }
  };

  const deleteClient = async (id) => {
    if(!window.confirm("確定要刪除此客戶嗎？")) return;
    setSync("syncing");
    try { await deleteDoc(doc(db,"clients",id)); if(selClient===id) setSelClient(""); showToast("🗑 已刪除客戶"); setSync("synced"); }
    catch { setSync("error"); showToast("❌ 刪除失敗",true); }
  };

  const handlePrint = () => {
    const el = document.getElementById("qsp");
    if(el){ el.style.display="block"; setTimeout(()=>{ window.print(); setTimeout(()=>{ el.style.display="none"; },800); },150); }
  };

  const newQuote = () => {
    if(!window.confirm("確定要建立新報價單？目前資料將會清空。")) return;
    resetForm(); setSelClient(""); showToast("📄 新報價單已建立");
  };

  const F = ({label,children}) => <div style={{marginBottom:12}}><label className="flabel">{label}</label>{children}</div>;
  const tabs = [{k:"basic",i:"📋",l:"基本"},{k:"client",i:"👤",l:"客戶"},{k:"items",i:"📦",l:"項目"},{k:"other",i:"⚙️",l:"其他"}];

  const FormArea = (
    <div style={{padding:isMobile?"14px 14px 100px":"20px",overflowY:"auto",height:"100%"}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:12,fontSize:11,color:"var(--muted)"}}>
        <span className={`sdot${sync==="syncing"?" spin":sync==="error"?" bad":""}`}/>
        {sync==="synced"&&"雲端同步正常 ✓"}{sync==="syncing"&&"同步中..."}{sync==="error"&&"同步異常"}
      </div>
      <div className="card" style={{marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#e8a020",marginBottom:10}}>📁 舊客戶快速填入</div>
        <select className="inp" value={selClient} onChange={e=>selectClient(e.target.value)}>
          <option value="">— 選擇舊客戶 —</option>
          {clients.map(c=><option key={c.id} value={c.id}>{c.company||c.name}{c.company&&c.name?` (${c.name})`:""}</option>)}
        </select>
        {!dbReady&&<div style={{fontSize:11,color:"var(--muted)",marginTop:8,textAlign:"center"}}>載入中...</div>}
        {dbReady&&clients.length===0&&<div style={{fontSize:11,color:"var(--muted)",marginTop:8,textAlign:"center"}}>尚無儲存的客戶</div>}
      </div>
      <div style={{display:"flex",gap:4,marginBottom:14,background:"var(--surface)",borderRadius:10,padding:4}}>
        {tabs.map(({k,i,l})=>(
          <button key={k} onClick={()=>setSection(k)} className="btn" style={{flex:1,padding:"8px 2px",borderRadius:7,border:"none",background:section===k?"var(--accent)":"transparent",color:section===k?"#0b0f1a":"var(--muted)",fontSize:11,fontWeight:section===k?700:400,flexDirection:"column",gap:2}}>
            <span style={{fontSize:15}}>{i}</span><span>{l}</span>
          </button>
        ))}
      </div>

      {section==="basic"&&<>
        <div className="stitle">報價單資訊</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <F label="報價單號"><ImeInput className="inp" value={quoteNumber} onChange={setQuoteNumber}/></F>
          <F label="報價日期"><input type="date" className="inp" value={quoteDate} onChange={e=>setQuoteDate(e.target.value)}/></F>
          <F label="有效天數"><input type="number" className="inp" value={validDays} onChange={e=>setValidDays(e.target.value)}/></F>
          <F label="幣別"><select className="inp" value={currency} onChange={e=>setCurrency(e.target.value)}>{Object.entries(CURRENCIES).map(([k,v])=><option key={k} value={k}>{k} {v}</option>)}</select></F>
        </div>
        <div className="stitle" style={{marginTop:4}}>我方公司資訊</div>
        <F label="公司名稱"><ImeInput className="inp" placeholder="您的公司名稱" value={companyName} onChange={setCompanyName}/></F>
        <F label="地址"><ImeInput className="inp" placeholder="公司地址" value={companyAddress} onChange={setCompanyAddress}/></F>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <F label="電話"><ImeInput className="inp" placeholder="電話" value={companyPhone} onChange={setCompanyPhone}/></F>
          <F label="Email"><ImeInput className="inp" placeholder="Email" value={companyEmail} onChange={setCompanyEmail}/></F>
        </div>
      </>}

      {section==="client"&&<>
        <div className="stitle">客戶資料</div>
        <F label="聯絡人姓名"><ImeInput className="inp" placeholder="聯絡人" value={clientName} onChange={setClientName}/></F>
        <F label="客戶公司"><ImeInput className="inp" placeholder="公司名稱" value={clientCompany} onChange={setClientCompany}/></F>
        <F label="地址"><ImeInput className="inp" placeholder="地址" value={clientAddress} onChange={setClientAddress}/></F>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <F label="電話"><ImeInput className="inp" placeholder="電話" value={clientPhone} onChange={setClientPhone}/></F>
          <F label="Email"><ImeInput className="inp" placeholder="Email" value={clientEmail} onChange={setClientEmail}/></F>
        </div>
        <button onClick={saveClient} className="btn btn-success" style={{width:"100%",padding:"11px",fontSize:13,marginTop:4}}>☁️ 儲存至雲端</button>
        {clients.length>0&&<>
          <div style={{fontSize:11,color:"var(--muted)",marginTop:18,marginBottom:10,fontWeight:700}}>已儲存客戶（{clients.length} 位）</div>
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

      {section==="items"&&<>
        <div className="stitle">報價項目</div>
        {items.map((item,idx)=>(
          <div key={item.id} className="card" style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:12,fontWeight:700,color:"var(--accent)"}}>項目 {idx+1}</span>
              {items.length>1&&<button onClick={()=>removeItem(idx)} className="btn btn-danger" style={{padding:"3px 10px",fontSize:11}}>刪除</button>}
            </div>
            <F label="品項說明"><ImeInput className="inp" placeholder="產品 / 服務說明" value={item.description} onChange={v=>setItem(idx,"description",v)}/></F>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <F label="數量"><input type="number" className="inp" min="0" value={item.qty} onChange={e=>setItem(idx,"qty",e.target.value)}/></F>
              <F label="單位"><select className="inp" value={item.unit} onChange={e=>setItem(idx,"unit",e.target.value)}>{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select></F>
              <F label="單價"><input type="number" className="inp" min="0" value={item.unitPrice} onChange={e=>setItem(idx,"unitPrice",e.target.value)}/></F>
            </div>
            <div style={{textAlign:"right",fontSize:12,color:"var(--sub)",marginBottom:8}}>小計：<span style={{color:"var(--accent)",fontWeight:700}}>{fmtN((+item.qty||0)*(+item.unitPrice||0))}</span></div>
            <F label="備註（選填）"><ImeInput className="inp" placeholder="此項備註" value={item.note} onChange={v=>setItem(idx,"note",v)}/></F>
          </div>
        ))}
        <button onClick={addItem} className="btn btn-ghost" style={{width:"100%",padding:"11px",fontSize:13,borderStyle:"dashed"}}>＋ 新增項目</button>
        <div className="card" style={{marginTop:14,background:"#0d1a2d"}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--sub)",marginBottom:6}}><span>小計</span><span>{fmtN(subtotal)}</span></div>
          {(+taxRate)>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--sub)",marginBottom:6}}><span>稅金（{taxRate}%）</span><span>{fmtN(tax)}</span></div>}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:15,fontWeight:800,color:"var(--accent)"}}><span>總計</span><span>{fmtN(total)}</span></div>
        </div>
      </>}

      {section==="other"&&<>
        <div className="stitle">其他設定</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <F label="稅率 (%)"><input type="number" className="inp" min="0" max="100" value={taxRate} onChange={e=>setTaxRate(e.target.value)}/></F>
          <F label="付款條件"><ImeInput className="inp" placeholder="例：30天內" value={paymentTerms} onChange={setPaymentTerms}/></F>
        </div>
        <F label="銀行匯款資訊"><ImeTextarea className="inp" rows={3} placeholder="銀行名稱、帳號、戶名..." value={bankInfo} onChange={setBankInfo}/></F>
        <F label="備註說明"><ImeTextarea className="inp" rows={4} placeholder="其他說明、注意事項..." value={notes} onChange={setNotes}/></F>
      </>}
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      <div id="qsp"><Preview f={form}/></div>
      {toast&&<div key={toastKey} className={`toast${toastErr?" err":""}`}>{toast}</div>}
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
            <button onClick={handlePrint} className="btn btn-primary" style={{padding:isMobile?"7px 12px":"8px 16px",fontSize:12}}>{isMobile?"⬇PDF":"⬇ 匯出 PDF"}</button>
          </div>
        </div>

        {!isMobile&&(
          <div style={{display:"flex",height:"calc(100vh - 65px)"}}>
            <div style={{width:"46%",minWidth:340,borderRight:"1px solid var(--border)",overflow:"hidden",display:"flex",flexDirection:"column"}}>{FormArea}</div>
            <div style={{flex:1,overflowY:"auto",background:"#0d1117",padding:20}}>
              <div style={{fontSize:11,color:"var(--muted)",marginBottom:12,textAlign:"center",fontWeight:600,letterSpacing:1}}>📄 即時預覽</div>
              <div style={{background:"white",borderRadius:10,padding:"28px 32px",boxShadow:"0 8px 40px rgba(0,0,0,.5)"}}><Preview f={form}/></div>
            </div>
          </div>
        )}

        {isMobile&&(
          <>
            <div style={{height:"calc(100vh - 57px)",overflowY:"auto"}}>
              {mobileTab==="form"&&FormArea}
              {mobileTab==="preview"&&(
                <div style={{padding:"14px 14px 100px",background:"#0d1117",minHeight:"100%"}}>
                  <div style={{fontSize:11,color:"var(--muted)",marginBottom:12,textAlign:"center",fontWeight:600}}>📄 報價單預覽</div>
                  <div style={{background:"white",borderRadius:10,padding:"16px",boxShadow:"0 8px 40px rgba(0,0,0,.5)"}}><Preview f={form}/></div>
                  <button onClick={handlePrint} className="btn btn-primary" style={{width:"100%",marginTop:16,padding:14,fontSize:14}}>⬇ 匯出 PDF</button>
                </div>
              )}
              {mobileTab==="clients"&&(
                <div style={{padding:"14px 14px 100px"}}>
                  <div className="stitle">客戶資料庫（雲端同步）</div>
                  <div className="card" style={{marginBottom:14}}>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--accent)",marginBottom:10}}>快速填入</div>
                    <select className="inp" value={selClient} onChange={e=>{ selectClient(e.target.value); if(e.target.value){ showToast("✅ 已填入客戶資料"); setMobileTab("form"); } }}>
                      <option value="">— 選擇舊客戶 —</option>
                      {clients.map(c=><option key={c.id} value={c.id}>{c.company||c.name}{c.company&&c.name?` (${c.name})`:""}</option>)}
                    </select>
                  </div>
                  {clients.length===0&&dbReady&&<div style={{textAlign:"center",color:"var(--muted)",fontSize:13,padding:"30px 0"}}><div style={{fontSize:32,marginBottom:10}}>📂</div><div>尚無儲存的客戶</div></div>}
                  {clients.map(c=>(
                    <div key={c.id} className="card" style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:14}}>{c.company||c.name}</div>
                          {c.company&&c.name&&<div style={{fontSize:12,color:"var(--sub)"}}>{c.name}</div>}
                          {c.phone&&<div style={{fontSize:11,color:"var(--muted)"}}>{c.phone}</div>}
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
              {[{k:"form",i:"✏️",l:"填寫"},{k:"preview",i:"👁️",l:"預覽"},{k:"clients",i:"👥",l:`客戶${clients.length>0?`(${clients.length})`:""}`}].map(({k,i,l})=>(
                <button key={k} className={`mob-nav-btn${mobileTab===k?" on":""}`} onClick={()=>setMobileTab(k)}>
                  <span className="ni">{i}</span><span>{l}</span>
                </button>
              ))}
            </nav>
          </>
        )}
      </div>
    </>
  );
}
