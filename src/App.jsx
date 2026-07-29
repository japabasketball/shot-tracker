import { useState, useEffect, useRef } from "react";

const DEFAULT_ZONES = [
  { id: "three_corner_l", label: "左コーナー3",  type: "3P", x: 14,  y: 148 },
  { id: "three_wing_l",   label: "左ウィング3",  type: "3P", x: 14,  y: 90  },
  { id: "three_top",      label: "トップ3",      type: "3P", x: 100, y: 26  },
  { id: "three_wing_r",   label: "右ウィング3",  type: "3P", x: 186, y: 90  },
  { id: "three_corner_r", label: "右コーナー3",  type: "3P", x: 186, y: 148 },
  { id: "mid_elbow_l",    label: "左エルボー",   type: "2P", x: 69,  y: 100 },
  { id: "mid_elbow_r",    label: "右エルボー",   type: "2P", x: 131, y: 100 },
  { id: "paint_left",     label: "ペイント左",   type: "2P", x: 65,  y: 148 },
  { id: "paint_right",    label: "ペイント右",   type: "2P", x: 135, y: 148 },
  { id: "under_basket",   label: "ゴール下",     type: "2P", x: 100, y: 133 },
  { id: "freethrow",      label: "フリースロー", type: "FT", x: 100, y: 100 },
];

const TYPE_COLOR = { "3P": "#818cf8", "2P": "#F4A200", "FT": "#4CAF50" };
const TYPE_OPTIONS = ["2P", "3P", "FT"];
const SVG_W = 200, SVG_H = 170;
const RANGE_OPTIONS = [
  { label: "1週間", days: 7 },
  { label: "1ヶ月", days: 30 },
  { label: "3ヶ月", days: 90 },
  { label: "半年",  days: 180 },
  { label: "1年",   days: 365 },
];

function uid() { return "zone_" + Date.now() + "_" + Math.random().toString(36).slice(2,7); }
function toKey(date) {
  return date.getFullYear() + "-" + String(date.getMonth()+1).padStart(2,"0") + "-" + String(date.getDate()).padStart(2,"0");
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
function fmtDate(d) {
  const days = "日月火水木金土";
  return (d.getMonth()+1) + "/" + d.getDate() + "（" + days[d.getDay()] + "）";
}

// ── Shared UI ──────────────────────────────────────────────────────────────────
function Btn({ onClick, children, style }) {
  return (
    <button onClick={onClick} style={{ width:32, height:32, background:"#3D3D5C", color:"#E8E8E8", border:"none", borderRadius:8, fontSize:18, cursor:"pointer", ...style }}>
      {children}
    </button>
  );
}

function ConfirmModal({ message, subMessage, onOk, onCancel, okLabel, okColor }) {
  okLabel = okLabel || "削除";
  okColor = okColor || "#ef4444";
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 24px" }}>
      <div style={{ background:"#2D2D44", borderRadius:16, padding:"24px 20px", width:"100%", maxWidth:360 }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#E8E8E8", marginBottom: subMessage ? 8 : 20 }}>{message}</div>
        {subMessage && <div style={{ fontSize:13, color:"#888", marginBottom:20, lineHeight:1.6 }}>{subMessage}</div>}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:"11px 0", background:"#1A1A2E", border:"1px solid #3D3D5C", color:"#888", borderRadius:8, fontSize:13, cursor:"pointer" }}>キャンセル</button>
          <button onClick={onOk} style={{ flex:1, padding:"11px 0", background:okColor, border:"none", color:"#fff", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>{okLabel}</button>
        </div>
      </div>
    </div>
  );
}

function AddZoneModal({ onAdd, onClose }) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("2P");
  const submit = () => {
    onAdd({ id: uid(), label: label.trim() || ("ゾーン" + Date.now().toString().slice(-3)), type, x: 100, y: 85 });
    onClose();
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:100, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
      <div style={{ background:"#2D2D44", borderRadius:"20px 20px 0 0", padding:"24px 20px 40px", width:"100%" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>ゾーンを追加</div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:"#888", marginBottom:6 }}>ゾーン名</div>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="例：右45度"
            style={{ width:"100%", background:"#1A1A2E", border:"1px solid #3D3D5C", borderRadius:8, padding:"10px 12px", color:"#E8E8E8", fontSize:14, boxSizing:"border-box" }} />
        </div>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, color:"#888", marginBottom:8 }}>種類</div>
          <div style={{ display:"flex", gap:8 }}>
            {TYPE_OPTIONS.map(t => (
              <button key={t} onClick={() => setType(t)} style={{ flex:1, padding:"10px 0", borderRadius:8, border:"none", cursor:"pointer", fontWeight:700, fontSize:14, background: type===t ? TYPE_COLOR[t] : "#1A1A2E", color: type===t ? "#fff" : "#666" }}>{t}</button>
            ))}
          </div>
        </div>
        <button onClick={submit} style={{ width:"100%", background:"#F4A200", color:"#1A1A2E", border:"none", borderRadius:10, padding:"13px 0", fontWeight:800, fontSize:15, cursor:"pointer" }}>追加する</button>
      </div>
    </div>
  );
}

// ── Court SVG ──────────────────────────────────────────────────────────────────
function CourtSVG({ zones, zoneCounts, selectedZone, editMode, onSelect, onMove, goals }) {
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
    e.preventDefault();
    e.stopPropagation();
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
    <svg ref={svgRef} viewBox={"0 0 " + SVG_W + " " + SVG_H}
      style={{ width:"100%", height:"auto", display:"block", touchAction: editMode ? "none" : "auto" }}
      onPointerMove={onPointerMove} onPointerUp={onPointerUp}>

      <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#1e1b14" rx={4} />
      <rect x={2} y={2} width={SVG_W-4} height={SVG_H-4} fill="none" stroke="#5a4a2a" strokeWidth={1.2} rx={3} />
      <rect x={69} y={100} width={62} height={68} fill="#261f0f" stroke="#5a4a2a" strokeWidth={1} />
      <path d="M 69 100 A 31 31 0 0 1 131 100" fill="none" stroke="#5a4a2a" strokeWidth={1} strokeDasharray="3 2" />
      <line x1={69} y1={100} x2={131} y2={100} stroke="#5a4a2a" strokeWidth={1} />
      <line x1={82} y1={165} x2={118} y2={165} stroke="#F4A200" strokeWidth={2.5} />
      <line x1={100} y1={165} x2={100} y2={158} stroke="#F4A200" strokeWidth={1.5} />
      <circle cx={100} cy={152} r={7} fill="none" stroke="#F4A200" strokeWidth={2} />
      <path d="M 14 170 L 14 112 A 86 86 0 0 1 186 112 L 186 170" fill="none" stroke="#5a4a2a" strokeWidth={1} strokeDasharray="3 2" />
      {[112, 124, 136, 148].map(y => (
        <g key={y}>
          <line x1={61} y1={y} x2={69} y2={y} stroke="#5a4a2a" strokeWidth={0.8} />
          <line x1={131} y1={y} x2={139} y2={y} stroke="#5a4a2a" strokeWidth={0.8} />
        </g>
      ))}

      {zones.map(z => {
        const d = zoneCounts?.[z.id] || { made: 0, att: 0 };
        const p = pct(d.made, d.att);
        const isSel = selectedZone === z.id;
        const base  = TYPE_COLOR[z.type];
        const isPending = !!z.pending;
        const goal = goals?.[z.id] ?? null;
        const achieved = goal !== null && p !== null && p >= goal;
        const notAchieved = goal !== null && p !== null && p < goal;

        const fill = editMode
          ? (isPending ? "#ffffff" : "#2D2D44")
          : p === null ? "#2D2D44"
          : achieved ? "#4CAF50"
          : notAchieved ? "#ef4444"
          : pctColor(p);

        const strokeC = editMode
          ? (isPending ? "#ffffff" : base)
          : isSel ? base
          : p !== null ? (achieved ? "#4CAF50" : notAchieved ? "#ef4444" : pctColor(p))
          : "#4a4a6a";
        return (
          <g key={z.id}
            onPointerDown={e => { onPointerDown(e, z.id); if (editMode) onSelect(z.id); }}
            onClick={() => !editMode && onSelect(z.id)}
            style={{ cursor: editMode ? "grab" : "pointer" }}>
            {editMode && isSel  && <circle cx={z.x} cy={z.y} r={15} fill="none" stroke={isPending ? "#fff" : base} strokeWidth={2} opacity={0.5} />}
            {editMode && !isSel && <circle cx={z.x} cy={z.y} r={15} fill="none" stroke={isPending ? "#fff" : base} strokeWidth={1.5} opacity={0.2} />}
            {isSel && !editMode && <circle cx={z.x} cy={z.y} r={14} fill={base + "22"} stroke={base} strokeWidth={2} style={{ filter: "drop-shadow(0 0 4px " + base + ")" }} />}
            <circle cx={z.x} cy={z.y} r={9} fill={fill} stroke={strokeC} strokeWidth={1.2} opacity={0.95} />
            {p !== null && !isPending && !editMode
              ? <text x={z.x} y={z.y+3.5} textAnchor="middle" fontSize={6.5} fill="#fff" fontWeight="700" style={{ pointerEvents:"none" }}>{p}%</text>
              : <text x={z.x} y={z.y+3.5} textAnchor="middle" fontSize={7} fill={isPending ? "#555" : "#666"} style={{ pointerEvents:"none" }}>{editMode ? "✥" : "+"}</text>
            }
          </g>
        );
      })}
    </svg>
  );
}

// ── Zone Input ─────────────────────────────────────────────────────────────────
function ZoneInput({ zone, counts, goals, onGoalChange, onChange, onDelete }) {
  const d = counts?.[zone.id] || { made: 0, att: 0 };
  const p = pct(d.made, d.att);
  const goal = goals?.[zone.id] ?? null;
  const achieved = goal !== null && p !== null && p >= goal;
  const set = (made, att) => onChange(zone.id, { made: Math.max(0, Math.min(att, made)), att: Math.max(0, att) });
  const base = TYPE_COLOR[zone.type];

  return (
    <div style={{ background:"#2D2D44", borderRadius:14, padding:16, border: "1px solid " + (achieved ? "#4CAF50" : base) + "44" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:10, fontWeight:700, color:base, background:base+"22", borderRadius:4, padding:"2px 6px" }}>{zone.type}</span>
          <span style={{ fontWeight:700, fontSize:15 }}>{zone.label}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {p !== null && <span style={{ fontSize:22, fontWeight:800, color: achieved ? "#4CAF50" : pctColor(p) }}>{p}%{achieved ? " ✓" : ""}</span>}
          <button onClick={() => onDelete(zone.id)} style={{ background:"#ef444422", border:"1px solid #ef444444", color:"#ef4444", borderRadius:6, padding:"4px 8px", fontSize:12, cursor:"pointer" }}>削除</button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {[["シュート数", d.att, v => set(d.made, v), "#E8E8E8"], ["成功数", d.made, v => set(v, d.att), "#4CAF50"]].map(([label, val, fn, col]) => (
          <div key={label}>
            <div style={{ fontSize:10, color:"#888", marginBottom:5 }}>{label}</div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Btn onClick={() => fn(val-1)}>−</Btn>
              <input
                type="number" inputMode="numeric" min={0} max={999}
                value={val === 0 ? "" : val}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  fn(isNaN(v) ? 0 : Math.max(0, v));
                }}
                onFocus={e => { e.target.select(); setTimeout(() => e.target.scrollIntoView({ behavior:"smooth", block:"center" }), 300); }}
                placeholder="0"
                style={{ flex:1, textAlign:"center", fontSize:22, fontWeight:800, color:col, background:"#1A1A2E", border:"1px solid #3D3D5C", borderRadius:8, padding:"6px 4px", width:"100%", boxSizing:"border-box" }}
              />
              <Btn onClick={() => fn(val+1)}>＋</Btn>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop:10, display:"flex", gap:6, flexWrap:"wrap" }}>
        {[[5,3],[10,5],[10,7],[20,10]].map(([a,m]) => (
          <button key={a+"-"+m} onClick={() => set(m, a)} style={{ fontSize:11, color:"#aaa", background:"#1A1A2E", border:"1px solid #3D3D5C", borderRadius:6, padding:"4px 8px", cursor:"pointer" }}>{m}/{a}</button>
        ))}
        <button onClick={() => onChange(zone.id, { made:0, att:0 })} style={{ fontSize:11, color:"#666", background:"transparent", border:"1px solid #2a2a3a", borderRadius:6, padding:"4px 8px", cursor:"pointer" }}>クリア</button>
      </div>

      <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #3a3a4a" }}>
        <div style={{ fontSize:10, color:"#888", marginBottom:6 }}>目標確率</div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:8 }}>
          {[30,40,50,60,70,80].map(g => (
            <button key={g} onClick={() => onGoalChange(zone.id, goal === g ? null : g)} style={{ padding:"4px 8px", borderRadius:6, border:"none", fontSize:12, fontWeight:600, cursor:"pointer", background: goal===g ? base : "#1A1A2E", color: goal===g ? "#fff" : "#666" }}>{g}%</button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <input type="number" min={1} max={100} value={goal ?? ""} onChange={e => { const v = parseInt(e.target.value); onGoalChange(zone.id, isNaN(v) ? null : Math.min(100, Math.max(1, v))); }} placeholder="直接入力"
            style={{ flex:1, background:"#1A1A2E", border:"1px solid #3D3D5C", borderRadius:8, padding:"7px 10px", color:"#E8E8E8", fontSize:13 }} />
          <span style={{ fontSize:13, color:"#666" }}>%</span>
          {goal !== null && <button onClick={() => onGoalChange(zone.id, null)} style={{ background:"transparent", border:"1px solid #3a3a4a", color:"#666", borderRadius:6, padding:"6px 10px", fontSize:12, cursor:"pointer" }}>クリア</button>}
        </div>
      </div>
    </div>
  );
}

// ── Calendar Picker ────────────────────────────────────────────────────────────
function CalendarPicker({ allData, zones, selectedDate, onSelect }) {
  const [viewYear, setViewYear]   = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const todayKey = toKey(new Date());
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i+1)];
  const prev = () => { if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); } else setViewMonth(m => m-1); };
  const next = () => { if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); } else setViewMonth(m => m+1); };
  const navS = { background:"#2D2D44", border:"none", color:"#E8E8E8", fontSize:18, width:34, height:34, borderRadius:8, cursor:"pointer" };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <button onClick={prev} style={navS}>‹</button>
        <span style={{ fontWeight:700, fontSize:15 }}>{viewYear}年 {viewMonth+1}月</span>
        <button onClick={next} style={navS}>›</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:6 }}>
        {["日","月","火","水","木","金","土"].map((d,i) => (
          <div key={d} style={{ textAlign:"center", fontSize:11, color: i===0?"#ef6060":i===6?"#6090ef":"#666", paddingBottom:4 }}>{d}</div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={"e"+i} />;
          const key = viewYear + "-" + String(viewMonth+1).padStart(2,"0") + "-" + String(day).padStart(2,"0");
          const { att } = dayTotal(zones, allData[key]);
          const { made, att: a } = dayTotal(zones, allData[key]);
          const p = pct(made, a);
          const isSel = toKey(selectedDate) === key;
          const isToday = todayKey === key;
          const col = i % 7;
          return (
            <button key={key} onClick={() => onSelect(new Date(viewYear, viewMonth, day))} style={{ aspectRatio:"1", borderRadius:8, border:"none", cursor:"pointer", padding:2, background: isSel ? "#F4A200" : att>0 ? "#2D2D44" : "transparent", outline: isToday && !isSel ? "1.5px solid #F4A200" : "none", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:12, fontWeight: isSel||isToday ? 700 : 400, color: isSel ? "#1A1A2E" : col===0 ? "#ef6060" : col===6 ? "#6090ef" : "#E8E8E8" }}>{day}</span>
              {att > 0 && <span style={{ fontSize:9, fontWeight:700, color: isSel ? "#1A1A2E" : pctColor(p), lineHeight:1.2 }}>{p}%</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Today Screen ───────────────────────────────────────────────────────────────
function TodayScreen({ allData, zones, goals, overallGoal, onDataChange, onGoalChange, onZonesChange }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedZone, setSelectedZone] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showCal, setShowCal] = useState(false);

  const dateKey = toKey(selectedDate);
  const dayData = allData[dateKey] || {};
  const { made, att } = dayTotal(zones, dayData);
  const p = pct(made, att);
  const isToday = toKey(selectedDate) === toKey(new Date());
  const achieved = overallGoal !== null && p !== null && p >= overallGoal;

  const handleChange = (zoneId, val) => onDataChange(dateKey, zoneId, val);
  const handleMove = (id, x, y) => onZonesChange(prev => prev.map(z => z.id === id ? { ...z, x, y } : z));
  const handleAdd = (zone) => { onZonesChange(prev => [...prev, { ...zone, pending: true }]); setEditMode(true); };
  const finishEdit = () => { onZonesChange(prev => prev.map(z => { const { pending, ...r } = z; return r; })); setEditMode(false); setSelectedZone(null); };
  const handleDelete = (id) => {
    const zone = zones.find(z => z.id === id);
    setConfirmModal({
      message: "「" + (zone?.label) + "」を削除しますか？", okLabel:"削除", okColor:"#ef4444",
      onOk: () => { onZonesChange(prev => prev.filter(z => z.id !== id)); setSelectedZone(null); setConfirmModal(null); }
    });
  };
  const handleDayReset = () => {
    setConfirmModal({
      message: fmtDate(selectedDate) + "の記録をリセットしますか？", okLabel:"リセット", okColor:"#ef4444",
      onOk: () => { onDataChange(dateKey, null, null); setSelectedZone(null); setConfirmModal(null); }
    });
  };

  const zoneInputRef = useRef(null);

  const handleZoneSelect = (id) => {
    setSelectedZone(prev => prev === id ? null : id);
    if (id) {
      setTimeout(() => {
        zoneInputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  const totalAtt = Object.values(allData).reduce((s, d) => {
    return s + zones.reduce((ss, z) => ss + (d[z.id]?.att || 0), 0);
  }, 0);

  const memo = allData[dateKey]?._memo || "";
  const handleMemo = (text) => {
    setAllData(prev => ({
      ...prev,
      [dateKey]: { ...prev[dateKey], _memo: text }
    }));
  };

  const recentDays = Object.keys(allData)
    .filter(k => dayTotal(zones, allData[k]).att > 0)
    .sort().reverse().slice(0, 10);

  const navBtnStyle = { background:"#2D2D44", border:"none", color:"#E8E8E8", fontSize:18, width:32, height:32, borderRadius:8, cursor:"pointer" };

  return (
    <div>
      {/* Date bar */}
      <div style={{ padding:"14px 20px 10px", background:"#22223a", borderBottom:"1px solid #2D2D44" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button style={navBtnStyle} onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d); setSelectedZone(null); }}>‹</button>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color: isToday ? "#F4A200" : "#E8E8E8" }}>
                {isToday ? "今日" : fmtDate(selectedDate)}
              </div>
              {isToday && <div style={{ fontSize:11, color:"#555" }}>{fmtDate(selectedDate)}</div>}
            </div>
            <button style={navBtnStyle} onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d); setSelectedZone(null); }}>›</button>
            <button onClick={() => setShowCal(true)} style={{ background:"#2D2D44", border:"none", color:"#F4A200", fontSize:16, width:32, height:32, borderRadius:8, cursor:"pointer" }}>📅</button>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:26, fontWeight:800, color: achieved ? "#4CAF50" : p === null ? "#444" : pctColor(p) }}>
              {p === null ? "−" : p + "%"}{achieved ? " ✓" : ""}
            </div>
            <div style={{ fontSize:11, color:"#666" }}>{made}/{att}本</div>
          </div>
        </div>
        {overallGoal !== null && (
          <div style={{ marginTop:6, fontSize:11, color: achieved ? "#4CAF50" : "#666" }}>
            目標 {overallGoal}%{achieved ? " ✓ 達成！" : ""}
          </div>
        )}
        {/* 本数表示 */}
        <div style={{ display:"flex", gap:16, marginTop:8 }}>
          <div style={{ fontSize:11, color:"#555" }}>
            今日 <span style={{ color:"#E8E8E8", fontWeight:700 }}>{att}本</span>
          </div>
          <div style={{ fontSize:11, color:"#555" }}>
            累計 <span style={{ color:"#F4A200", fontWeight:700 }}>{totalAtt.toLocaleString()}本</span>
          </div>
        </div>
      </div>

      {/* Court area */}
      <div style={{ padding:"12px 20px 0" }}>
        <div style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
          {Object.entries(TYPE_COLOR).map(([t, c]) => (
            <span key={t} style={{ display:"flex", alignItems:"center", gap:3, fontSize:11, color:"#888" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:c, display:"inline-block" }} />{t}
            </span>
          ))}
          <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
            <button onClick={() => setShowAddModal(true)} style={{ fontSize:11, fontWeight:700, padding:"4px 9px", borderRadius:6, border:"none", cursor:"pointer", background:"#4CAF5022", color:"#4CAF50" }}>＋ 追加</button>
            <button onClick={() => { editMode ? finishEdit() : (setEditMode(true), setSelectedZone(null)); }} style={{ fontSize:11, fontWeight:600, padding:"4px 9px", borderRadius:6, border:"none", cursor:"pointer", background: editMode ? "#F4A200" : "#2D2D44", color: editMode ? "#1A1A2E" : "#aaa" }}>
              {editMode ? "✓ 完了" : "✥ 編集"}
            </button>
          </div>
        </div>

        {editMode && <div style={{ fontSize:11, color:"#F4A200", textAlign:"center", marginBottom:8, background:"#F4A20011", borderRadius:8, padding:5 }}>ドラッグして位置を調整</div>}

        <div style={{ borderRadius:12, overflow:"hidden", border: editMode ? "1px solid #F4A200" : "1px solid #2D2D44" }}>
          <CourtSVG zones={zones} zoneCounts={dayData} selectedZone={selectedZone} editMode={editMode}
            onSelect={id => handleZoneSelect(id)} onMove={handleMove} goals={goals} />
        </div>

        {!editMode && (
          <div style={{ display:"flex", gap:6, marginTop:5, fontSize:10, color:"#555", justifyContent:"flex-end" }}>
            <span style={{ color:"#4CAF50" }}>■ 50%+</span>
            <span style={{ color:"#F4A200" }}>■ 33–49%</span>
            <span style={{ color:"#ef4444" }}>■ 32%未満</span>
          </div>
        )}

        {!editMode && selectedZone && zones.find(z => z.id === selectedZone) && (
          <div style={{ marginTop:12 }} ref={zoneInputRef}>
            <ZoneInput zone={zones.find(z => z.id === selectedZone)} counts={dayData} goals={goals}
              onGoalChange={onGoalChange} onChange={handleChange} onDelete={handleDelete} />
          </div>
        )}
        {!editMode && !selectedZone && (
          <div style={{ marginTop:10, textAlign:"center", color:"#444", fontSize:13 }}>ゾーンをタップして記録</div>
        )}
      </div>

      {/* Day summary */}
      {att > 0 && (
        <div style={{ margin:"14px 20px 0", background:"#2D2D44", borderRadius:12, padding:"12px 14px" }}>
          <div style={{ fontSize:11, color:"#888", marginBottom:10 }}>今日のサマリー</div>
          <div style={{ display:"flex", gap:6 }}>
            {["2P","3P","FT"].map(type => {
              const zz = zones.filter(z => z.type === type);
              const m = zz.reduce((s, z) => s + (dayData[z.id]?.made || 0), 0);
              const a = zz.reduce((s, z) => s + (dayData[z.id]?.att  || 0), 0);
              const pp = pct(m, a);
              return (
                <div key={type} style={{ flex:1, textAlign:"center", background:"#1e1e30", borderRadius:8, padding:"8px 4px" }}>
                  <div style={{ fontSize:10, color:TYPE_COLOR[type], fontWeight:700, marginBottom:3 }}>{type}</div>
                  <div style={{ fontSize:16, fontWeight:800, color: pp === null ? "#444" : pctColor(pp) }}>{pp === null ? "−" : pp + "%"}</div>
                  <div style={{ fontSize:10, color:"#555" }}>{m}/{a}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* メモ */}
      <div style={{ margin:"10px 20px 0" }}>
        <div style={{ fontSize:11, color:"#666", marginBottom:5 }}>📝 練習メモ</div>
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={e => handleMemo(e.currentTarget.innerText)}
          onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior:"smooth", block:"center" }), 300)}
          data-placeholder="例：今日は調子良かった、疲れてた…"
          style={{ width:"100%", minHeight:60, background:"#2D2D44", border:"1px solid #3D3D5C", borderRadius:10, padding:"10px 12px", color:"#E8E8E8", fontSize:14, boxSizing:"border-box", lineHeight:1.6, outline:"none", whiteSpace:"pre-wrap" }}
        >{memo}</div>
      </div>

      {/* Reset / history */}
      <div style={{ padding:"12px 20px" }}>
        {att > 0 && (
          <button onClick={handleDayReset} style={{ width:"100%", marginBottom:8, background:"transparent", color:"#444", border:"1px solid #2D2D44", borderRadius:10, padding:"10px 0", fontSize:13, cursor:"pointer" }}>
            🔄 この日のデータをリセット
          </button>
        )}
        <button onClick={() => setShowHistory(p => !p)} style={{ width:"100%", background:"transparent", color:"#555", border:"1px solid #2D2D44", borderRadius:10, padding:"10px 0", fontSize:13, cursor:"pointer" }}>
          📅 過去の記録 {showHistory ? "▲" : "▼"}
        </button>
        {showHistory && (
          <div style={{ marginTop:8 }}>
            {recentDays.length === 0
              ? <div style={{ textAlign:"center", color:"#444", fontSize:13, padding:"16px 0" }}>まだ記録がありません</div>
              : recentDays.map(k => {
                  const { made: m, att: a } = dayTotal(zones, allData[k]);
                  const pp = pct(m, a);
                  const [y, mo, dd] = k.split("-").map(Number);
                  return (
                    <button key={k} onClick={() => { setSelectedDate(new Date(y, mo-1, dd)); setShowHistory(false); setSelectedZone(null); }}
                      style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#2D2D44", border:"none", borderRadius:10, padding:"10px 14px", marginBottom:5, cursor:"pointer", color:"#E8E8E8" }}>
                      <span style={{ fontSize:13 }}>{k}</span>
                      <span style={{ fontSize:12, color:"#888" }}>{m}/{a}本</span>
                      <span style={{ fontSize:15, fontWeight:800, color: pctColor(pp) }}>{pp}%</span>
                    </button>
                  );
                })
            }
          </div>
        )}
      </div>

      {showCal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:100, display:"flex", alignItems:"flex-end" }} onClick={() => setShowCal(false)}>
          <div style={{ background:"#1e1e30", borderRadius:"20px 20px 0 0", padding:"20px 20px 40px", width:"100%" }} onClick={e => e.stopPropagation()}>
            <CalendarPicker allData={allData} zones={zones} selectedDate={selectedDate}
              onSelect={date => { setSelectedDate(date); setSelectedZone(null); setShowCal(false); }} />
          </div>
        </div>
      )}
      {showAddModal && <AddZoneModal onAdd={handleAdd} onClose={() => setShowAddModal(false)} />}
      {confirmModal && <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal(null)} />}
    </div>
  );
}

// ── Trend Screen ───────────────────────────────────────────────────────────────
function TrendScreen({ allData, zones, overallGoal }) {
  const [rangeDays, setRangeDays] = useState(30);
  const [filterType, setFilterType] = useState("TOTAL"); // TOTAL / 2P / 3P / FT / zone:{id}
  const [showZonePicker, setShowZonePicker] = useState(false);

  const selectedZoneObj = filterType.startsWith("zone:")
    ? zones.find(z => z.id === filterType.replace("zone:", ""))
    : null;

  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - rangeDays);

  const points = Object.keys(allData)
    .filter(k => {
      const [y, m, d] = k.split("-").map(Number);
      const dt = new Date(y, m-1, d);
      return dt >= cutoff && dt <= today;
    })
    .sort()
    .map(k => {
      const [y, m, d] = k.split("-").map(Number);
      const date = new Date(y, m-1, d);
      let made = 0, att = 0;
      if (selectedZoneObj) {
        made = allData[k][selectedZoneObj.id]?.made || 0;
        att  = allData[k][selectedZoneObj.id]?.att  || 0;
      } else {
        const filtered = filterType === "TOTAL" ? zones : zones.filter(z => z.type === filterType);
        filtered.forEach(z => { made += allData[k][z.id]?.made || 0; att += allData[k][z.id]?.att || 0; });
      }
      return { k, date, made, att, p: pct(made, att) };
    })
    .filter(pt => pt.p !== null);

  const hasData = points.length > 0;
  const firstP  = points[0]?.p ?? null;
  const latestP = points[points.length - 1]?.p ?? null;
  const avgP    = points.length ? Math.round(points.reduce((s, p) => s + p.p, 0) / points.length) : null;
  const maxP_val = points.length ? Math.max(...points.map(p => p.p)) : null;
  const minP_val = points.length ? Math.min(...points.map(p => p.p)) : null;
  const diff    = firstP !== null && latestP !== null ? latestP - firstP : null;
  const remain  = overallGoal !== null && latestP !== null ? overallGoal - latestP : null;

  // Graph sizing
  const GW = 340, GH = 220;
  const PAD = { top: 20, right: 20, bottom: 36, left: 40 };
  const graphW = GW - PAD.left - PAD.right;
  const graphH = GH - PAD.top - PAD.bottom;

  // Y axis: fit to data range with padding
  const yMin = hasData ? Math.max(0,  Math.floor((minP_val - 10) / 5) * 5) : 0;
  const yMax = hasData ? Math.min(100, Math.ceil((Math.max(maxP_val, overallGoal ?? 0) + 10) / 5) * 5) : 100;
  const yRange = yMax - yMin;

  const toY = v => PAD.top + (1 - (v - yMin) / yRange) * graphH;
  const toX = (idx) => PAD.left + (points.length === 1 ? graphW / 2 : (idx / (points.length - 1)) * graphW);

  const linePoints = points.map((pt, idx) => ({ x: toX(idx), y: toY(pt.p), pt }));
  const polyline   = linePoints.map(p => p.x + "," + p.y).join(" ");

  // Y grid lines
  const step = yRange <= 20 ? 5 : yRange <= 50 ? 10 : 25;
  const gridVals = [];
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) gridVals.push(v);

  // X axis labels
  const labelStep = points.length <= 7 ? 1 : points.length <= 15 ? 2 : points.length <= 30 ? 5 : 10;
  const xLabels = points.filter((_, i) => i % labelStep === 0);

  // Today marker (rightmost point)
  const todayX = linePoints.length > 0 ? linePoints[linePoints.length - 1].x : null;

  const [selectedDot, setSelectedDot] = useState(null);
  const typeColor = selectedZoneObj
    ? TYPE_COLOR[selectedZoneObj.type]
    : filterType === "TOTAL" ? "#64b5f6" : (TYPE_COLOR[filterType] || "#64b5f6");

  return (
    <div style={{ background:"#1A1A2E", minHeight:"100%" }}>

      {/* 期間・種類選択 */}
      <div style={{ padding:"12px 16px 0" }}>
        <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
          {RANGE_OPTIONS.map(r => (
            <button key={r.days} onClick={() => setRangeDays(r.days)} style={{ padding:"5px 12px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, background: rangeDays===r.days ? "#F4A200" : "#2D2D44", color: rangeDays===r.days ? "#1A1A2E" : "#888" }}>{r.label}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {["TOTAL","2P","3P","FT"].map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{ padding:"4px 10px", borderRadius:6, border:"none", cursor:"pointer", fontSize:11, fontWeight:600, background: filterType===t ? (t==="TOTAL" ? "#64b5f6" : TYPE_COLOR[t]) : "#2D2D44", color: filterType===t ? "#fff" : "#666" }}>{t}</button>
          ))}
          <button onClick={() => setShowZonePicker(true)} style={{ padding:"4px 10px", borderRadius:6, border:"none", cursor:"pointer", fontSize:11, fontWeight:600, background: selectedZoneObj ? "#F4A200" : "#2D2D44", color: selectedZoneObj ? "#1A1A2E" : "#888" }}>
            {selectedZoneObj ? selectedZoneObj.label : "ゾーン▾"}
          </button>
        </div>
      </div>

      {/* ゾーン選択モーダル */}
      {showZonePicker && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:100, display:"flex", alignItems:"flex-end" }} onClick={() => setShowZonePicker(false)}>
          <div style={{ background:"#2D2D44", borderRadius:"20px 20px 0 0", padding:"20px 20px 40px", width:"100%", maxHeight:"60vh", overflowY:"auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>ゾーンを選択</div>
            <button onClick={() => { setFilterType("TOTAL"); setShowZonePicker(false); }} style={{ width:"100%", display:"flex", alignItems:"center", padding:"11px 14px", marginBottom:6, background: !selectedZoneObj && filterType==="TOTAL" ? "#F4A200" : "#1A1A2E", border:"none", borderRadius:10, cursor:"pointer", color: !selectedZoneObj && filterType==="TOTAL" ? "#1A1A2E" : "#E8E8E8", fontSize:13, fontWeight:600 }}>全体 (TOTAL)</button>
            {["2P","3P","FT"].map(t => (
              <button key={t} onClick={() => { setFilterType(t); setShowZonePicker(false); }} style={{ width:"100%", display:"flex", alignItems:"center", padding:"11px 14px", marginBottom:6, background: filterType===t ? TYPE_COLOR[t] : "#1A1A2E", border:"none", borderRadius:10, cursor:"pointer", color:"#E8E8E8", fontSize:13, fontWeight:600 }}>{t}</button>
            ))}
            <div style={{ fontSize:11, color:"#666", margin:"12px 0 8px" }}>ゾーン別</div>
            {zones.map(z => (
              <button key={z.id} onClick={() => { setFilterType("zone:" + z.id); setShowZonePicker(false); }} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"11px 14px", marginBottom:6, background: filterType === "zone:" + z.id ? "#F4A200" : "#1A1A2E", border:"none", borderRadius:10, cursor:"pointer", color: filterType === "zone:" + z.id ? "#1A1A2E" : "#E8E8E8", fontSize:13 }}>
                <span style={{ fontSize:10, fontWeight:700, color: filterType === "zone:" + z.id ? "#1A1A2E" : TYPE_COLOR[z.type], background: TYPE_COLOR[z.type] + "22", borderRadius:4, padding:"2px 6px" }}>{z.type}</span>
                {z.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 上部統計 */}
      <div style={{ display:"flex", justifyContent:"space-between", padding:"16px 20px 8px" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:11, color:"#666", marginBottom:2 }}>最初</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#E8E8E8" }}>{firstP !== null ? firstP + "%" : "−"}</div>
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:11, color:"#666", marginBottom:2 }}>
            {selectedDot
              ? (selectedDot.date.getMonth()+1) + "/" + selectedDot.date.getDate()
              : points.length > 0 ? (points[points.length-1].date.getMonth()+1) + "/" + points[points.length-1].date.getDate() : "現在"}
          </div>
          <div style={{ fontSize:28, fontWeight:800, color: typeColor }}>
            {selectedDot ? selectedDot.p + "%" : latestP !== null ? latestP + "%" : "−"}
          </div>
          {selectedDot && allData[selectedDot.k]?._memo && (
            <div style={{ fontSize:11, color:"#888", marginTop:4, fontStyle:"italic" }}>
              "{allData[selectedDot.k]._memo}"
            </div>
          )}
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:11, color:"#666", marginBottom:2 }}>目標</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#E8E8E8" }}>{overallGoal !== null ? overallGoal + "%" : "−"}</div>
        </div>
      </div>

      {/* Graph */}
      {!hasData ? (
        <div style={{ textAlign:"center", color:"#444", fontSize:13, padding:"60px 0" }}>この期間の記録がありません</div>
      ) : (
        <div style={{ padding:"0 8px", overflowX:"auto" }}>
          <svg width={GW} height={GH} style={{ display:"block", minWidth:GW }}>

            {/* Grid lines */}
            {gridVals.map(v => {
              const y = toY(v);
              return (
                <g key={v}>
                  <line x1={PAD.left} y1={y} x2={GW-PAD.right} y2={y} stroke="#2a2a3a" strokeWidth={0.8} />
                  <text x={PAD.left-6} y={y+4} textAnchor="end" fontSize={10} fill="#555">{v}%</text>
                </g>
              );
            })}

            {/* Goal line (green solid) */}
            {overallGoal !== null && overallGoal >= yMin && overallGoal <= yMax && (
              <g>
                <line x1={PAD.left} y1={toY(overallGoal)} x2={GW-PAD.right} y2={toY(overallGoal)} stroke="#4CAF50" strokeWidth={1.5} />
                <text x={PAD.left+4} y={toY(overallGoal)-4} fontSize={10} fill="#4CAF50" fontWeight="700">目標</text>
              </g>
            )}

            {/* Selected dot vertical line */}
            {selectedDot !== null && (
              <line x1={selectedDot.x} y1={PAD.top} x2={selectedDot.x} y2={GH-PAD.bottom} stroke={typeColor} strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
            )}

            {/* Today vertical dashed line */}
            {todayX !== null && !selectedDot && (
              <line x1={todayX} y1={PAD.top} x2={todayX} y2={GH-PAD.bottom} stroke="#555" strokeWidth={1} strokeDasharray="4 3" />
            )}

            {/* Area fill */}
            {linePoints.length > 1 && (
              <polygon
                points={PAD.left + "," + (PAD.top+graphH) + " " + polyline + " " + (GW-PAD.right) + "," + (PAD.top+graphH)}
                fill={typeColor} opacity={0.07} />
            )}

            {/* Line */}
            {linePoints.length > 1 && (
              <polyline points={polyline} fill="none" stroke={typeColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            )}

            {/* Dots */}
            {linePoints.map(({ x, y, pt }, i) => {
              const isSel = selectedDot?.x === x;
              return (
                <g key={i} onClick={() => setSelectedDot(isSel ? null : { x, y, p: pt.p, date: pt.date, k: pt.k })} style={{ cursor:"pointer" }}>
                  <circle cx={x} cy={y} r={isSel ? 7 : 4} fill={typeColor} stroke="#1A1A2E" strokeWidth={1.5} />
                  {isSel && <circle cx={x} cy={y} r={11} fill="none" stroke={typeColor} strokeWidth={1} opacity={0.4} />}
                  <circle cx={x} cy={y} r={18} fill="transparent" />
                </g>
              );
            })}

            {/* X axis labels */}
            {xLabels.map(({ date, k }) => {
              const idx = points.findIndex(p => p.k === k);
              const x = toX(idx);
              const label = rangeDays <= 30
                ? (date.getMonth()+1) + "/" + date.getDate()
                : (date.getMonth()+1) + "月";
              return <text key={k} x={x} y={GH-6} textAnchor="middle" fontSize={10} fill="#555">{label}</text>;
            })}
          </svg>
        </div>
      )}

      {/* 統計カード */}
      {hasData && (
        <div style={{ display:"flex", gap:8, padding:"12px 16px 16px" }}>
          {[
            { label:"平均",     v: avgP + "%" },
            { label:"最高",     v: maxP_val + "%" },
            { label:"最低",     v: minP_val + "%" },
            { label:"練習日数", v: points.length + "日" },
          ].map(({ label, v }) => (
            <div key={label} style={{ flex:1, background:"#2D2D44", borderRadius:10, padding:"10px 6px", textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#666", marginBottom:3 }}>{label}</div>
              <div style={{ fontSize:15, fontWeight:800, color:"#E8E8E8" }}>{v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Settings Screen ────────────────────────────────────────────────────────────
function SettingsScreen({ zones, goals, overallGoal, onOverallGoalChange, onZonesChange, onGoalChange }) {
  const [confirmModal, setConfirmModal] = useState(null);

  const resetZones = () => setConfirmModal({
    message: "ゾーンをリセットしますか？",
    subMessage: "全てのゾーンが最初の位置に戻ります。追加したゾーンは削除されます。",
    okLabel: "リセット", okColor: "#F4A200",
    onOk: () => { onZonesChange(() => DEFAULT_ZONES); setConfirmModal(null); }
  });

  return (
    <div style={{ padding:"16px 20px" }}>
      {/* 全体目標 */}
      <div style={{ background:"#2D2D44", borderRadius:12, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>🎯 全体の目標確率</div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
          {[30,40,50,60,70,80].map(g => (
            <button key={g} onClick={() => onOverallGoalChange(overallGoal === g ? null : g)} style={{ padding:"6px 12px", borderRadius:8, border:"none", fontSize:13, fontWeight:600, cursor:"pointer", background: overallGoal===g ? "#F4A200" : "#1A1A2E", color: overallGoal===g ? "#1A1A2E" : "#666" }}>{g}%</button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <input type="number" min={1} max={100} value={overallGoal ?? ""} onChange={e => { const v = parseInt(e.target.value); onOverallGoalChange(isNaN(v) ? null : Math.min(100, Math.max(1, v))); }} placeholder="直接入力 (1〜100)"
            style={{ flex:1, background:"#1A1A2E", border:"1px solid #3D3D5C", borderRadius:8, padding:"9px 12px", color:"#E8E8E8", fontSize:14 }} />
          <span style={{ color:"#666" }}>%</span>
          {overallGoal !== null && <button onClick={() => onOverallGoalChange(null)} style={{ background:"transparent", border:"1px solid #3a3a4a", color:"#666", borderRadius:6, padding:"8px 12px", fontSize:12, cursor:"pointer" }}>クリア</button>}
        </div>
        {overallGoal !== null && <div style={{ fontSize:11, color:"#555", marginTop:8 }}>現在の目標：{overallGoal}%</div>}
      </div>

      {/* ゾーン管理 */}
      <div style={{ background:"#2D2D44", borderRadius:12, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:10 }}>📍 ゾーン管理</div>
        <div style={{ fontSize:12, color:"#888", marginBottom:12, lineHeight:1.6 }}>ゾーンの追加・削除・位置調整は「今日」画面の右上から行えます。</div>
        <button onClick={resetZones} style={{ width:"100%", background:"#F4A20011", color:"#F4A200", border:"1px solid #F4A20044", borderRadius:8, padding:"10px 0", fontSize:13, fontWeight:600, cursor:"pointer" }}>
          ↩ ゾーンを初期位置に戻す
        </button>
      </div>

      {/* ゾーン別目標一覧 */}
      <div style={{ background:"#2D2D44", borderRadius:12, padding:16 }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:10 }}>🎯 ゾーン別の目標確率</div>
        <div style={{ fontSize:12, color:"#888", marginBottom:12 }}>各ゾーンをタップして個別に設定できます。</div>
        {zones.filter(z => goals[z.id] != null).length === 0
          ? <div style={{ fontSize:12, color:"#444", textAlign:"center", padding:"8px 0" }}>まだ設定されていません</div>
          : zones.filter(z => goals[z.id] != null).map(z => (
            <div key={z.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 10px", marginBottom:4, background:"#1e1e30", borderRadius:8 }}>
              <span style={{ fontSize:12, color:TYPE_COLOR[z.type], fontWeight:600, width:24 }}>{z.type}</span>
              <span style={{ flex:1, fontSize:12, color:"#ccc" }}>{z.label}</span>
              <span style={{ fontSize:14, fontWeight:700, color:"#F4A200" }}>{goals[z.id]}%</span>
              <button onClick={() => onGoalChange(z.id, null)} style={{ marginLeft:8, background:"transparent", border:"none", color:"#555", fontSize:12, cursor:"pointer" }}>✕</button>
            </div>
          ))
        }
      </div>

      {confirmModal && <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal(null)} />}

      {/* バージョン情報 */}
      <div style={{ textAlign:"center", padding:"24px 0 8px" }}>
        <div style={{ fontSize:13, color:"#555" }}>🏀 HoopLog</div>
        <div style={{ fontSize:12, color:"#444", marginTop:4 }}>バージョン 1.0.0</div>
      </div>
    </div>
  );
}

// ── Tutorial ───────────────────────────────────────────────────────────────────
const TUTORIAL_STEPS = [
  {
    icon: "🏀",
    title: "HoopLogへようこそ！",
    desc: "シューティング練習のシュート確率を記録・分析するアプリです。",
    sub: "スワイプして次へ",
  },
  {
    icon: "📍",
    title: "ゾーンをタップして記録",
    desc: "コート図のゾーンをタップするとシュート数・成功数を入力できます。",
    sub: "練習後にサクッと記録しよう",
  },
  {
    icon: "📅",
    title: "カレンダーで日別管理",
    desc: "日付ごとに記録が保存されます。過去の練習もいつでも確認できます。",
    sub: "📅ボタンでカレンダーを開けます",
  },
  {
    icon: "📈",
    title: "推移グラフで成長を確認",
    desc: "1週間〜1年の確率推移をグラフで可視化。ゾーンごとの推移も見られます。",
    sub: "ドットをタップすると詳細が表示されます",
  },
  {
    icon: "🎯",
    title: "目標を設定しよう",
    desc: "設定タブから全体の目標確率を設定できます。ゾーンごとの目標も設定可能です。",
    sub: "目標達成で ✓ マークが表示されます",
  },
  {
    icon: "✥",
    title: "ゾーンをカスタマイズ",
    desc: "「✥ 編集」でドットの位置を自由に移動。「＋ 追加」で新しいゾーンも追加できます。",
    sub: "自分のチームに合わせて自由にカスタマイズ！",
  },
];

function Tutorial({ onFinish }) {
  const [step, setStep] = useState(0);
  const [startX, setStartX] = useState(null);
  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  const next = () => { if (!isLast) setStep(s => s + 1); else onFinish(); };
  const prev = () => { if (step > 0) setStep(s => s - 1); };

  return (
    <div style={{ position:"fixed", inset:0, background:"#1A1A2E", zIndex:300, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 32px" }}
      onTouchStart={e => setStartX(e.touches[0].clientX)}
      onTouchEnd={e => {
        if (startX === null) return;
        const diff = startX - e.changedTouches[0].clientX;
        if (diff > 50) next();
        else if (diff < -50) prev();
        setStartX(null);
      }}>

      {/* Skip */}
      <button onClick={onFinish} style={{ position:"absolute", top:20, right:20, background:"transparent", border:"none", color:"#555", fontSize:13, cursor:"pointer" }}>スキップ</button>

      {/* Icon */}
      <div style={{ fontSize:72, marginBottom:24 }}>{current.icon}</div>

      {/* Title */}
      <div style={{ fontSize:22, fontWeight:800, color:"#E8E8E8", textAlign:"center", marginBottom:16, lineHeight:1.4 }}>{current.title}</div>

      {/* Desc */}
      <div style={{ fontSize:15, color:"#888", textAlign:"center", lineHeight:1.7, marginBottom:12 }}>{current.desc}</div>

      {/* Sub */}
      <div style={{ fontSize:12, color:"#555", textAlign:"center", marginBottom:48 }}>{current.sub}</div>

      {/* Dots */}
      <div style={{ display:"flex", gap:8, marginBottom:40 }}>
        {TUTORIAL_STEPS.map((_, i) => (
          <div key={i} onClick={() => setStep(i)} style={{ width: i===step ? 24 : 8, height:8, borderRadius:4, background: i===step ? "#F4A200" : "#2D2D44", cursor:"pointer", transition:"width 0.2s" }} />
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display:"flex", gap:12, width:"100%" }}>
        {step > 0 && (
          <button onClick={prev} style={{ flex:1, padding:"14px 0", background:"#2D2D44", border:"none", color:"#E8E8E8", borderRadius:12, fontSize:15, fontWeight:600, cursor:"pointer" }}>戻る</button>
        )}
        <button onClick={next} style={{ flex:2, padding:"14px 0", background:"#F4A200", border:"none", color:"#1A1A2E", borderRadius:12, fontSize:15, fontWeight:800, cursor:"pointer" }}>
          {isLast ? "はじめる！" : "次へ"}
        </button>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [allData, setAllData]   = useState(() => { try { return JSON.parse(localStorage.getItem("bball-cal") || "{}"); } catch { return {}; } });
  const [zones, setZones]       = useState(DEFAULT_ZONES);
  const [goals, setGoals]       = useState(() => { try { return JSON.parse(localStorage.getItem("bball-goals") || "{}"); } catch { return {}; } });
  const [overallGoal, setOverallGoal] = useState(() => { try { return JSON.parse(localStorage.getItem("bball-overall-goal") || "null"); } catch { return null; } });
  const [tab, setTab] = useState("today");
  const [showTutorial, setShowTutorial] = useState(() => {
    return localStorage.getItem("bball-tutorial-done") !== "1";
  });

  useEffect(() => { localStorage.setItem("bball-cal",          JSON.stringify(allData));     }, [allData]);
  useEffect(() => { localStorage.setItem("bball-zones-v2",     JSON.stringify(zones));       }, [zones]);
  useEffect(() => { localStorage.setItem("bball-goals",        JSON.stringify(goals));       }, [goals]);
  useEffect(() => { localStorage.setItem("bball-overall-goal", JSON.stringify(overallGoal)); }, [overallGoal]);

  const finishTutorial = () => {
    localStorage.setItem("bball-tutorial-done", "1");
    setShowTutorial(false);
  };

  const handleDataChange = (dateKey, zoneId, val) => {
    if (zoneId === null) {
      setAllData(prev => { const n = { ...prev }; delete n[dateKey]; return n; });
    } else {
      setAllData(prev => ({ ...prev, [dateKey]: { ...prev[dateKey], [zoneId]: val } }));
    }
  };

  const NAV = [
    { id:"today",    icon:"🏀", label:"今日" },
    { id:"trend",    icon:"📈", label:"推移" },
    { id:"settings", icon:"⚙️",  label:"設定" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#1A1A2E", color:"#E8E8E8", fontFamily:"'Inter','Hiragino Sans',sans-serif", paddingBottom:80 }}>

      {/* Tutorial */}
      {showTutorial && <Tutorial onFinish={finishTutorial} />}

      {/* Header */}
      <div style={{ padding:"18px 20px 14px", borderBottom:"1px solid #2D2D44", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontSize:18, fontWeight:800, color:"#F4A200" }}>🏀 HoopLog</div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {overallGoal !== null && (
            <div style={{ fontSize:11, color:"#555" }}>目標 <span style={{ color:"#ef4444", fontWeight:700 }}>{overallGoal}%</span></div>
          )}
          <button onClick={() => setShowTutorial(true)} style={{ background:"#2D2D44", border:"none", color:"#888", borderRadius:8, padding:"5px 10px", fontSize:11, cursor:"pointer" }}>？ ヘルプ</button>
        </div>
      </div>

      {/* Screens */}
      {tab === "today"    && <TodayScreen allData={allData} zones={zones} goals={goals} overallGoal={overallGoal} onDataChange={handleDataChange} onGoalChange={(id,v) => setGoals(p => ({ ...p, [id]: v }))} onZonesChange={setZones} />}
      {tab === "trend"    && <TrendScreen allData={allData} zones={zones} overallGoal={overallGoal} />}
      {tab === "settings" && <SettingsScreen zones={zones} goals={goals} overallGoal={overallGoal} onOverallGoalChange={setOverallGoal} onZonesChange={setZones} onGoalChange={(id,v) => setGoals(p => ({ ...p, [id]: v }))} />}

      {/* Bottom Nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#16162a", borderTop:"1px solid #2D2D44", display:"flex", justifyContent:"space-around", padding:"10px 0 20px" }}>
        {NAV.map(({ id, icon, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            <span style={{ fontSize:22 }}>{icon}</span>
            <span style={{ fontSize:10, color: tab===id ? "#F4A200" : "#555", fontWeight: tab===id ? 700 : 400 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
