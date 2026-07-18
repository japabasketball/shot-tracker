import { useState, useEffect, useRef } from "react";

const DEFAULT_ZONES = [
  // 3P
  { id: "three_corner_l", label: "左コーナー3",  type: "3P", x: 14,  y: 148 },
  { id: "three_wing_l",   label: "左ウィング3",  type: "3P", x: 14,  y: 90  },
  { id: "three_top",      label: "トップ3",      type: "3P", x: 100, y: 26  },
  { id: "three_wing_r",   label: "右ウィング3",  type: "3P", x: 186, y: 90  },
  { id: "three_corner_r", label: "右コーナー3",  type: "3P", x: 186, y: 148 },
  // FTライン上横並び3つ
  { id: "mid_elbow_l",    label: "左エルボー",   type: "2P", x: 69,  y: 100 },
  { id: "freethrow",      label: "フリースロー", type: "FT", x: 100, y: 100 },
  { id: "mid_elbow_r",    label: "右エルボー",   type: "2P", x: 131, y: 100 },
  // ペイント内
  { id: "paint_left",     label: "ペイント左",   type: "2P", x: 65,  y: 148 },
  { id: "under_basket",   label: "ゴール下",     type: "2P", x: 100, y: 133 },
  { id: "paint_right",    label: "ペイント右",   type: "2P", x: 135, y: 148 },
];

const TYPE_COLOR = { "3P": "#818cf8", "2P": "#F4A200", "FT": "#4CAF50" };
const TYPE_OPTIONS = ["2P", "3P", "FT"];
const SVG_W = 200, SVG_H = 170;

function uid() { return `zone_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }
function toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function pct(made, att) { return att === 0 ? null : Math.round((made / att) * 100); }
function pctColor(p) {
  if (p === null) return "#555";
  return p >= 50 ? "#4CAF50" : p >= 33 ? "#F4A200" : "#ef4444";
}
function dayTotal(zones, dayData) {
  if (!dayData) return { made: 0, att: 0 };
  return {
    made: zones.reduce((s, z) => s + (dayData[z.id]?.made || 0), 0),
    att:  zones.reduce((s, z) => s + (dayData[z.id]?.att  || 0), 0),
  };
}

// ── Court SVG ─────────────────────────────────────────────────────────────────
function CourtSVG({ zones, zoneCounts, selectedZone, editMode, onSelect, onMove }) {
  const svgRef = useRef(null);
  const dragRef = useRef(null);

  const getSVGCoords = (clientX, clientY) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 100, y: 85 };
    return {
      x: Math.round(Math.max(10, Math.min(SVG_W-10, (clientX - rect.left) * SVG_W / rect.width))),
      y: Math.round(Math.max(10, Math.min(SVG_H-10, (clientY - rect.top)  * SVG_H / rect.height))),
    };
  };

  const onPointerDown = (e, id) => {
    if (!editMode) return;
    e.preventDefault(); e.stopPropagation();
    dragRef.current = { id };
    svgRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const { x, y } = getSVGCoords(e.clientX, e.clientY);
    onMove(dragRef.current.id, x, y);
  };
  const onPointerUp = () => { dragRef.current = null; };

  return (
    <svg ref={svgRef} viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width:"100%", height:"auto", display:"block", touchAction: editMode ? "none" : "auto" }}
      onPointerMove={onPointerMove} onPointerUp={onPointerUp}>

      <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#1e1b14" rx={4}/>
      <rect x={2} y={2} width={SVG_W-4} height={SVG_H-4} fill="none" stroke="#5a4a2a" strokeWidth={1.2} rx={3}/>
      {/* Paint box */}
      <rect x={69} y={100} width={62} height={68} fill="#261f0f" stroke="#5a4a2a" strokeWidth={1}/>
      {/* FT circle top (dashed, above FT line) */}
      <path d="M 69 100 A 31 31 0 0 1 131 100" fill="none" stroke="#5a4a2a" strokeWidth={1} strokeDasharray="3 2"/>
      {/* FT line */}
      <line x1={69} y1={100} x2={131} y2={100} stroke="#5a4a2a" strokeWidth={1}/>
      {/* Backboard */}
      <line x1={82} y1={165} x2={118} y2={165} stroke="#F4A200" strokeWidth={2.5}/>
      {/* Rim */}
      <ellipse cx={100} cy={158} rx={8} ry={3} fill="none" stroke="#F4A200" strokeWidth={1.8}/>
      {/* 3P arc */}
      <path d="M 14 170 L 14 112 A 86 86 0 0 1 186 112 L 186 170" fill="none" stroke="#5a4a2a" strokeWidth={1} strokeDasharray="3 2"/>
      {/* Hash marks */}
      {[112,124,136,148].map(y=>(
        <g key={y}>
          <line x1={61} y1={y} x2={69} y2={y} stroke="#5a4a2a" strokeWidth={0.8}/>
          <line x1={131} y1={y} x2={139} y2={y} stroke="#5a4a2a" strokeWidth={0.8}/>
        </g>
      ))}

      {zones.map(z => {
        const d      = zoneCounts?.[z.id] || { made:0, att:0 };
        const p      = pct(d.made, d.att);
        const isSel  = selectedZone === z.id;
        const base   = TYPE_COLOR[z.type];
        const isPending = !!z.pending;

        // pending(未確定)なら白、それ以外は元の表示
        const fill = isPending
          ? "#ffffff"
          : (p === null ? "#2D2D44" : pctColor(p));
        const strokeColor = isPending
          ? "#ffffff"
          : (isSel ? base : p !== null ? pctColor(p) : "#4a4a6a");

        return (
          <g key={z.id}
            onPointerDown={e => { onPointerDown(e, z.id); if(editMode) onSelect(z.id); }}
            onClick={() => !editMode && onSelect(z.id)}
            style={{ cursor: editMode ? "grab" : "pointer" }}>
            {editMode && isSel && <circle cx={z.x} cy={z.y} r={15} fill="none" stroke={isPending?"#fff":base} strokeWidth={2} opacity={0.5}/>}
            {editMode && !isSel && <circle cx={z.x} cy={z.y} r={15} fill="none" stroke={isPending?"#fff":base} strokeWidth={1.5} opacity={0.2}/>}
            {isSel && !editMode && <circle cx={z.x} cy={z.y} r={14} fill={base+"22"} stroke={base} strokeWidth={2} style={{ filter:`drop-shadow(0 0 4px ${base})` }}/>}
            <circle cx={z.x} cy={z.y} r={9} fill={fill} stroke={strokeColor} strokeWidth={1.2} opacity={0.95}/>
            {p !== null && !isPending && !editMode
              ? <text x={z.x} y={z.y+3.5} textAnchor="middle" fontSize={6.5} fill="#fff" fontWeight="700" style={{ pointerEvents:"none" }}>{p}%</text>
              : <text x={z.x} y={z.y+3.5} textAnchor="middle" fontSize={7} fill={isPending?"#555":"#666"} style={{ pointerEvents:"none" }}>{editMode?"✥":"+"}</text>
            }
          </g>
        );
      })}
    </svg>
  );
}

// ── Add Zone Modal ─────────────────────────────────────────────────────────────
function AddZoneModal({ onAdd, onClose }) {
  const [label, setLabel] = useState("");
  const [type,  setType]  = useState("2P");

  const submit = () => {
    const name = label.trim() || `ゾーン${Date.now().toString().slice(-3)}`;
    onAdd({ id: uid(), label: name, type, x: 100, y: 85 });
    onClose();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:100, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={onClose}>
      <div style={{ background:"#2D2D44", borderRadius:"20px 20px 0 0", padding:"24px 20px 40px", width:"100%", maxWidth:480 }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>ゾーンを追加</div>

        {/* Name input */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:"#888", marginBottom:6 }}>ゾーン名</div>
          <input value={label} onChange={e=>setLabel(e.target.value)}
            placeholder="例：右45度、ミドル左 …"
            style={{ width:"100%", background:"#1A1A2E", border:"1px solid #3D3D5C", borderRadius:8, padding:"10px 12px", color:"#E8E8E8", fontSize:14, boxSizing:"border-box" }}/>
        </div>

        {/* Type selector */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, color:"#888", marginBottom:8 }}>種類</div>
          <div style={{ display:"flex", gap:8 }}>
            {TYPE_OPTIONS.map(t=>(
              <button key={t} onClick={()=>setType(t)} style={{
                flex:1, padding:"10px 0", borderRadius:8, border:"none", cursor:"pointer", fontWeight:700, fontSize:14,
                background: type===t ? TYPE_COLOR[t] : "#1A1A2E",
                color:      type===t ? "#fff" : "#666",
              }}>{t}</button>
            ))}
          </div>
        </div>

        <button onClick={submit} style={{ width:"100%", background:"#F4A200", color:"#1A1A2E", border:"none", borderRadius:10, padding:"13px 0", fontWeight:800, fontSize:15, cursor:"pointer" }}>
          追加する
        </button>
        <div style={{ fontSize:11, color:"#555", textAlign:"center", marginTop:10 }}>追加後、コート上でドラッグして位置を調整できます</div>
      </div>
    </div>
  );
}

// ── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ message, subMessage, onOk, onCancel, okLabel="削除", okColor="#ef4444" }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#000b", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 24px" }}>
      <div style={{ background:"#2D2D44", borderRadius:16, padding:"24px 20px", width:"100%", maxWidth:360 }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#E8E8E8", marginBottom: subMessage ? 8 : 20 }}>{message}</div>
        {subMessage && <div style={{ fontSize:13, color:"#888", marginBottom:20, lineHeight:1.6 }}>{subMessage}</div>}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:"11px 0", background:"#1A1A2E", border:"1px solid #3D3D5C", color:"#888", borderRadius:8, fontSize:13, cursor:"pointer" }}>キャンセル</button>
          <button onClick={onOk}     style={{ flex:1, padding:"11px 0", background:okColor, border:"none", color:"#fff", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>{okLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Zone Input ─────────────────────────────────────────────────────────────────
function ZoneInput({ zone, counts, onChange, onDelete }) {
  const d = counts?.[zone.id] || { made:0, att:0 };
  const p = pct(d.made, d.att);
  const set = (made, att) => onChange(zone.id, { made:Math.max(0,Math.min(att,made)), att:Math.max(0,att) });
  const base = TYPE_COLOR[zone.type];
  return (
    <div style={{ background:"#2D2D44", borderRadius:14, padding:"16px", border:`1px solid ${base}44` }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:1, color:base, background:base+"22", borderRadius:4, padding:"2px 6px" }}>{zone.type}</span>
          <span style={{ fontWeight:700, fontSize:15 }}>{zone.label}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {p !== null && <span style={{ fontSize:22, fontWeight:800, color:pctColor(p) }}>{p}%</span>}
          <button onClick={()=> onDelete(zone.id)}
            style={{ background:"#ef444422", border:"1px solid #ef444444", color:"#ef4444", borderRadius:6, padding:"4px 8px", fontSize:12, cursor:"pointer" }}>削除</button>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {[["シュート数",d.att,v=>set(d.made,v),"#E8E8E8"],["成功数",d.made,v=>set(v,d.att),"#4CAF50"]].map(([label,val,fn,col])=>(
          <div key={label}>
            <div style={{ fontSize:10, color:"#888", marginBottom:5 }}>{label}</div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Btn onClick={()=>fn(val-1)}>−</Btn>
              <span style={{ flex:1, textAlign:"center", fontSize:22, fontWeight:800, color:col }}>{val}</span>
              <Btn onClick={()=>fn(val+1)}>＋</Btn>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:10, display:"flex", gap:6, flexWrap:"wrap" }}>
        {[[5,3],[10,5],[10,7],[20,10]].map(([a,m])=>(
          <button key={`${a}-${m}`} onClick={()=>set(m,a)} style={{ fontSize:11, color:"#aaa", background:"#1A1A2E", border:"1px solid #3D3D5C", borderRadius:6, padding:"4px 8px", cursor:"pointer" }}>{m}/{a}</button>
        ))}
        <button onClick={()=>onChange(zone.id,{made:0,att:0})} style={{ fontSize:11, color:"#666", background:"transparent", border:"1px solid #2a2a3a", borderRadius:6, padding:"4px 8px", cursor:"pointer" }}>クリア</button>
      </div>
    </div>
  );
}
function Btn({ onClick, children }) {
  return <button onClick={onClick} style={{ width:32, height:32, background:"#3D3D5C", color:"#E8E8E8", border:"none", borderRadius:8, fontSize:18, cursor:"pointer" }}>{children}</button>;
}

// ── Calendar ───────────────────────────────────────────────────────────────────
const navBtn = { background:"#2D2D44", border:"none", color:"#E8E8E8", fontSize:20, width:36, height:36, borderRadius:8, cursor:"pointer" };

function Calendar({ allData, zones, selectedDate, onSelect }) {
  const [viewYear,  setViewYear]  = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const today = toKey(new Date());
  const cells = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  const prev = ()=>{ if(viewMonth===0){setViewYear(y=>y-1);setViewMonth(11);}else setViewMonth(m=>m-1); };
  const next = ()=>{ if(viewMonth===11){setViewYear(y=>y+1);setViewMonth(0);}else setViewMonth(m=>m+1); };
  return (
    <div style={{ padding:"16px 20px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <button onClick={prev} style={navBtn}>‹</button>
        <span style={{ fontWeight:700, fontSize:16 }}>{viewYear}年 {viewMonth+1}月</span>
        <button onClick={next} style={navBtn}>›</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {["日","月","火","水","木","金","土"].map((d,i)=>(
          <div key={d} style={{ textAlign:"center", fontSize:11, color:i===0?"#ef6060":i===6?"#6090ef":"#666", paddingBottom:4 }}>{d}</div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
        {cells.map((day,i)=>{
          if(!day) return <div key={`e${i}`}/>;
          const key=`${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const {made,att}=dayTotal(zones, allData[key]);
          const p=pct(made,att);
          const isSel=toKey(selectedDate)===key, isToday=today===key, col=i%7;
          return (
            <button key={key} onClick={()=>onSelect(new Date(viewYear,viewMonth,day))} style={{ aspectRatio:"1", borderRadius:8, border:"none", cursor:"pointer", padding:2, background:isSel?"#F4A200":att>0?"#2D2D44":"transparent", outline:isToday&&!isSel?"1.5px solid #F4A200":"none", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:12, fontWeight:isSel||isToday?700:400, color:isSel?"#1A1A2E":col===0?"#ef6060":col===6?"#6090ef":"#E8E8E8" }}>{day}</span>
              {att>0&&<span style={{ fontSize:9, fontWeight:700, color:isSel?"#1A1A2E":pctColor(p), lineHeight:1.2 }}>{p}%</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Day Summary ────────────────────────────────────────────────────────────────
function DaySummary({ zones, dayData }) {
  const byType=["2P","3P","FT"].map(type=>{ const zz=zones.filter(z=>z.type===type); return {type, made:zz.reduce((s,z)=>s+(dayData?.[z.id]?.made||0),0), att:zz.reduce((s,z)=>s+(dayData?.[z.id]?.att||0),0)}; });
  const tm=byType.reduce((s,r)=>s+r.made,0), ta=byType.reduce((s,r)=>s+r.att,0);
  return (
    <div>
      {[...byType,{type:"TOTAL",made:tm,att:ta}].map(({type,made,att})=>{
        const p=pct(made,att), color=type==="TOTAL"?"#E8E8E8":TYPE_COLOR[type]||"#E8E8E8";
        return (
          <div key={type} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", marginBottom:5, background:type==="TOTAL"?"#2D2D44":"#22223a", borderRadius:10, borderLeft:`3px solid ${color}` }}>
            <span style={{ color, fontWeight:type==="TOTAL"?800:600, fontSize:13 }}>{type}</span>
            <span style={{ color:"#888", fontSize:13 }}>{made}/{att}本</span>
            <span style={{ fontWeight:800, fontSize:type==="TOTAL"?20:16, color:pctColor(p) }}>{p===null?"−":`${p}%`}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [allData, setAllData] = useState(()=>{ try{return JSON.parse(localStorage.getItem("bball-cal")||"{}");}catch{return {};} });
  // ゾーンは常にDEFAULT_ZONESから開始（localStorageの古いデータを無視）
  const [zones, setZones] = useState(DEFAULT_ZONES);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView]         = useState("calendar");
  const [selectedZone, setSelectedZone] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); // { message, onOk }

  useEffect(()=>{ localStorage.setItem("bball-cal",      JSON.stringify(allData)); }, [allData]);
  useEffect(()=>{ localStorage.setItem("bball-zones-v2", JSON.stringify(zones));   }, [zones]);

  const dateKey = toKey(selectedDate);
  const dayData = allData[dateKey] || {};
  const {made:dMade, att:dAtt} = dayTotal(zones, dayData);
  const dPct = pct(dMade, dAtt);
  const fmt  = d=>`${d.getMonth()+1}/${d.getDate()}（${"日月火水木金土"[d.getDay()]}）`;

  const handleChange     = (zoneId, val) => setAllData(prev=>({...prev,[dateKey]:{...prev[dateKey],[zoneId]:val}}));
  const handleSelectDate = date => { setSelectedDate(date); setSelectedZone(null); setEditMode(false); setView("court"); };
  const handleMove       = (id, x, y) => setZones(prev=>prev.map(z=>z.id===id?{...z,x,y}:z));
  const handleAdd  = (zone) => { setZones(prev=>[...prev, { ...zone, pending: true }]); setEditMode(true); };
  const finishEdit = () => {
    const confirmed = zones.map(z=>{ const {pending,...rest}=z; return rest; });
    setZones(confirmed);
    setEditMode(false);
    setSelectedZone(null);
  };
  const handleDelete     = (id) => {
    const zone = zones.find(z=>z.id===id);
    setConfirmModal({
      message: `「${zone?.label}」を削除しますか？`,
      onOk: () => {
        setZones(prev=>prev.filter(z=>z.id!==id));
        setSelectedZone(null);
        setAllData(prev=>{
          const n={...prev};
          Object.keys(n).forEach(k=>{ if(n[k]?.[id]){ n[k]={...n[k]}; delete n[k][id]; } });
          return n;
        });
        setConfirmModal(null);
      }
    });
  };
  const resetZones = () => {
    setConfirmModal({
      message: "位置をリセットしますか？",
      subMessage: "全てのゾーンが最初の位置に戻ります。追加したゾーンは削除されます。",
      okLabel: "リセット",
      okColor: "#F4A200",
      onOk: () => { setZones(DEFAULT_ZONES); setSelectedZone(null); setConfirmModal(null); }
    });
  };
  const handleDayReset = () => {
    setConfirmModal({
      message: `${fmt(selectedDate)}のデータをリセットしますか？`,
      onOk: () => { setAllData(prev=>{const n={...prev};delete n[dateKey];return n;}); setSelectedZone(null); setConfirmModal(null); }
    });
  };

  return (
    <div style={{ minHeight:"100vh", background:"#1A1A2E", color:"#E8E8E8", fontFamily:"'Inter','Hiragino Sans',sans-serif", maxWidth:480, margin:"0 auto", paddingBottom:40 }}>

      {/* Header */}
      <div style={{ padding:"20px 20px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #2D2D44" }}>
        <div>
          <div style={{ fontSize:18, fontWeight:800, color:"#F4A200" }}>🏀 ShotTracker</div>
          <div style={{ fontSize:11, color:"#555" }}>日別シューティング記録</div>
        </div>
        {view!=="calendar" && (
          <button onClick={()=>{ setView("calendar"); setEditMode(false); }} style={{ background:"#2D2D44", border:"none", color:"#F4A200", borderRadius:8, padding:"6px 12px", fontSize:12, cursor:"pointer", fontWeight:600 }}>📅 カレンダー</button>
        )}
      </div>

      {/* Calendar */}
      {view==="calendar" && (
        <>
          <Calendar allData={allData} zones={zones} selectedDate={selectedDate} onSelect={handleSelectDate}/>
          <div style={{ padding:"0 20px" }}>
            <div style={{ fontSize:11, color:"#555", textAlign:"center", marginBottom:12 }}>日付をタップして記録を開く</div>
            {Object.keys(allData).filter(k=>dayTotal(zones,allData[k]).att>0).sort().reverse().slice(0,5).map(k=>{
              const {made,att}=dayTotal(zones,allData[k]); const p=pct(made,att);
              const [y,m,d]=k.split("-").map(Number);
              return (
                <button key={k} onClick={()=>handleSelectDate(new Date(y,m-1,d))} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#2D2D44", border:"none", borderRadius:10, padding:"10px 14px", marginBottom:6, cursor:"pointer", color:"#E8E8E8" }}>
                  <span style={{ fontSize:13 }}>{k}</span>
                  <span style={{ fontSize:12, color:"#888" }}>{made}/{att}本</span>
                  <span style={{ fontSize:16, fontWeight:800, color:pctColor(p) }}>{p}%</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Court / Summary */}
      {view!=="calendar" && (
        <>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px", background:"#22223a", borderBottom:"1px solid #2D2D44" }}>
            <button onClick={()=>{ const d=new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d); setSelectedZone(null); }} style={navBtn}>‹</button>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontWeight:700, fontSize:15 }}>{fmt(selectedDate)}</div>
              <div style={{ fontSize:11, color:dPct===null?"#555":pctColor(dPct) }}>{dAtt===0?"未記録":`${dMade}/${dAtt}本 · ${dPct}%`}</div>
            </div>
            <button onClick={()=>{ const d=new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d); setSelectedZone(null); }} style={navBtn}>›</button>
          </div>

          <div style={{ display:"flex", borderBottom:"1px solid #2D2D44" }}>
            {[["court","コート入力"],["summary","サマリー"]].map(([id,label])=>(
              <button key={id} onClick={()=>{ setView(id); setEditMode(false); setSelectedZone(null); }} style={{ flex:1, padding:"12px 0", background:"none", border:"none", borderBottom:view===id?"2px solid #F4A200":"2px solid transparent", color:view===id?"#F4A200":"#666", fontWeight:view===id?700:400, fontSize:13, cursor:"pointer" }}>{label}</button>
            ))}
          </div>

          {view==="court" && (
            <div style={{ padding:"14px 20px" }}>
              {/* Toolbar */}
              <div style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
                {Object.entries(TYPE_COLOR).map(([t,c])=>(
                  <span key={t} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#888" }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:c, display:"inline-block" }}/>{t}
                  </span>
                ))}
                <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
                  {/* Add button */}
                  <button onClick={()=>setShowAddModal(true)} style={{ fontSize:11, fontWeight:700, padding:"5px 10px", borderRadius:6, border:"none", cursor:"pointer", background:"#4CAF5022", color:"#4CAF50" }}>
                    ＋ 追加
                  </button>
                  {/* Edit toggle */}
                  <button onClick={()=>{ editMode ? finishEdit() : (setEditMode(true), setSelectedZone(null)); }} style={{ fontSize:11, fontWeight:600, padding:"5px 10px", borderRadius:6, border:"none", cursor:"pointer", background:editMode?"#F4A200":"#2D2D44", color:editMode?"#1A1A2E":"#aaa" }}>
                    {editMode ? "✓ 完了" : "✥ 編集"}
                  </button>
                </div>
              </div>

              {editMode && (
                <div style={{ fontSize:11, color:"#F4A200", textAlign:"center", marginBottom:8, background:"#F4A20011", borderRadius:8, padding:"6px" }}>
                  ドットをドラッグして位置を調整 · タップしたゾーンは入力パネルで削除できます
                </div>
              )}

              <div style={{ borderRadius:12, overflow:"hidden", border: editMode?"1px solid #F4A200":"1px solid #2D2D44" }}>
                <CourtSVG zones={zones} zoneCounts={dayData} selectedZone={selectedZone} editMode={editMode}
                  onSelect={id=>setSelectedZone(p=>p===id?null:id)} onMove={handleMove}/>
              </div>

              {!editMode && (
                <div style={{ display:"flex", gap:8, marginTop:6, fontSize:10, color:"#555", justifyContent:"flex-end" }}>
                  <span style={{ color:"#4CAF50" }}>■ 50%+</span>
                  <span style={{ color:"#F4A200" }}>■ 33–49%</span>
                  <span style={{ color:"#ef4444" }}>■ 32%未満</span>
                </div>
              )}

              {/* Reset position button — always visible below court */}
              <button onClick={resetZones} style={{ width:"100%", marginTop:10, background:"#F4A20011", color:"#F4A200", border:"1px solid #F4A20044", borderRadius:8, padding:"9px 0", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                ↩ 位置をリセット
              </button>

              {!editMode && selectedZone && zones.find(z=>z.id===selectedZone) && (
                <div style={{ marginTop:12 }}>
                  <ZoneInput zone={zones.find(z=>z.id===selectedZone)} counts={dayData} onChange={handleChange} onDelete={handleDelete}/>
                </div>
              )}
              {!editMode && !selectedZone && (
                <div style={{ marginTop:12, textAlign:"center", color:"#444", fontSize:13 }}>コート上のゾーンをタップして入力</div>
              )}

              <button onClick={handleDayReset} style={{ width:"100%", marginTop:16, background:"transparent", color:"#444", border:"1px solid #2D2D44", borderRadius:10, padding:"11px 0", fontSize:13, cursor:"pointer" }}>
                🔄 この日のデータをリセット
              </button>
            </div>
          )}

          {view==="summary" && (
            <div style={{ padding:"16px 20px" }}>
              <DaySummary zones={zones} dayData={dayData}/>
              {zones.filter(z=>(dayData?.[z.id]?.att||0)>0).length>0 && (
                <>
                  <div style={{ fontSize:12, color:"#888", margin:"14px 0 8px", letterSpacing:1 }}>ゾーン別</div>
                  {zones.filter(z=>(dayData?.[z.id]?.att||0)>0).map(z=>{
                    const d=dayData[z.id]; const p=pct(d.made,d.att);
                    return (
                      <div key={z.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 10px", marginBottom:4, background:"#1e1e30", borderRadius:8 }}>
                        <span style={{ fontSize:11, color:TYPE_COLOR[z.type], fontWeight:600, width:24 }}>{z.type}</span>
                        <span style={{ flex:1, fontSize:12, color:"#ccc" }}>{z.label}</span>
                        <span style={{ fontSize:12, color:"#888", marginRight:8 }}>{d.made}/{d.att}</span>
                        <span style={{ fontSize:13, fontWeight:700, width:40, textAlign:"right", color:pctColor(p) }}>{p}%</span>
                      </div>
                    );
                  })}
                </>
              )}
              {dAtt===0&&<div style={{ textAlign:"center", color:"#444", fontSize:13, padding:"30px 0" }}>この日の記録はありません</div>}
            </div>
          )}
        </>
      )}

      {/* Add Zone Modal */}
      {showAddModal && <AddZoneModal onAdd={handleAdd} onClose={()=>setShowAddModal(false)}/>}

      {/* Confirm Modal */}
      {confirmModal && <ConfirmModal message={confirmModal.message} subMessage={confirmModal.subMessage} okLabel={confirmModal.okLabel} okColor={confirmModal.okColor} onOk={confirmModal.onOk} onCancel={()=>setConfirmModal(null)}/>}
    </div>
  );
}
