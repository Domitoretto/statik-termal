import React from "react";
import { Layers, Thermometer, Wind, Package, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { CARGO_PROFILES, INSULATION_MATERIALS, PROFILE_MATERIALS } from "../constants";
import { ThermalContourView } from "./ThermalContourView";

interface ThermalControlPanelProps {
  design: any;
  onDesignChange: (design: any) => void;
  refrigerantOptions: string[];
  selectedWall: "leftSide" | "rightSide" | "front" | "back" | "roof" | "floor";
  onSelectedWallChange: (wall: "leftSide" | "rightSide" | "front" | "back" | "roof" | "floor") => void;
  results?: any;
}

/* ─────────────────────────────────────────────────────── */
/*  Isometric Box Skeleton SVG                             */
/* ─────────────────────────────────────────────────────── */
/*  Isometric Box Skeleton SVG                             */
/* ─────────────────────────────────────────────────────── */
const IsometricSkeleton: React.FC<{ design: any; selectedWall?: string; results?: any }> = ({ design, selectedWall = "leftSide", results }) => {
  const s = 1.9;

  // Proportional box dims from real dimensions
  const realL = design.dimensions?.length || 8900;
  const realW = design.dimensions?.width || 2400;
  const realH = design.dimensions?.height || 2600;
  const BL = Math.max(150, Math.min(270, (realL / 8900) * 220));
  const BW = Math.max(32, Math.min(80,  (realW / 2400) * 58));
  const BH = Math.max(52, Math.min(105, (realH / 2600) * 82));

  // Auto-center horizontally
  const ox = Math.round(200 - (BL - BW) * 0.866 * s / 2 + 4);
  const oy = 152;

  const iso = (x: number, y: number, z: number) => ({
    sx: (x - y) * 0.866 * s + ox,
    sy: ((x + y) * 0.5 - z) * s + oy,
  });

  const p = {
    fbl: iso(0,  0,  0),  fbr: iso(BL, 0,  0),
    ftl: iso(0,  0,  BH), ftr: iso(BL, 0,  BH),
    bbl: iso(0,  BW, 0),  bbr: iso(BL, BW, 0),
    btl: iso(0,  BW, BH), btr: iso(BL, BW, BH),
  };
  const pt = (v: { sx: number; sy: number }) => `${v.sx.toFixed(1)},${v.sy.toFixed(1)}`;

  // Wall classification
  const isSide  = selectedWall === "leftSide" || selectedWall === "rightSide";
  const isEnd   = selectedWall === "front"    || selectedWall === "back";
  const isHoriz = selectedWall === "roof"     || selectedWall === "floor";

  // Stud count from results (already calculated for selected wall)
  const nStuds = Math.min(results?.n_panel_studs || 10, 18);

  // Longitudinal studs for roof/floor
  const wallCfg = design.wallConfigs?.[selectedWall] || {};
  const nLong = (() => {
    if (!isHoriz) return 0;
    if ((wallCfg.longitudinalPitchMode || "pitch") === "count")
      return Math.min(wallCfg.longitudinalCount || 3, 8);
    return Math.min(Math.max(2, Math.floor(realW / (wallCfg.longitudinalPitch || 650))), 8);
  })();

  // Stud positions along each dimension
  const studXPos  = Array.from({ length: nStuds }, (_, i) => ((i + 0.5) / nStuds) * BL);
  const studYPos  = Array.from({ length: nStuds }, (_, i) => ((i + 0.5) / nStuds) * BW);
  const longYPos  = Array.from({ length: nLong  }, (_, i) => ((i + 0.5) / nLong)  * BW);

  const insulColor = design.insulationMaterialId === "pu"  ? "#0e2a4a"
                   : design.insulationMaterialId === "pir" ? "#0e3a2a"
                   : "#0a1e3a";
  const activeFill   = "#061540";
  const activeStroke = "#38bdf8";
  const studColor    = "#ef4444aa";
  const deltaT = (design.ambientTemp || 40) - (design.targetTemp || 0);

  return (
    <svg viewBox="0 0 400 250" className="w-full h-full" fill="none" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="isogrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.5" fill="#1e293b" />
        </pattern>
        <filter id="isoglow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="activeglow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="400" height="250" fill="url(#isogrid)" />

      {/* ── RIGHT FACE (end wall: x=BL) ── */}
      <polygon
        points={`${pt(p.fbr)} ${pt(p.bbr)} ${pt(p.btr)} ${pt(p.ftr)}`}
        fill={isEnd ? activeFill : "rgba(0,8,24,0.75)"}
        stroke={isEnd ? activeStroke : "#1e3a5f"} strokeWidth={isEnd ? 1.8 : 0.8}
      />
      {/* End-face studs when front/back selected */}
      {isEnd && studYPos.map((yp, i) => {
        const bot = iso(BL, yp, 0), top = iso(BL, yp, BH);
        return <line key={i} x1={bot.sx} y1={bot.sy} x2={top.sx} y2={top.sy} stroke={studColor} strokeWidth="1" />;
      })}
      {isEnd && (
        <polygon points={`${pt(p.fbr)} ${pt(p.bbr)} ${pt(p.btr)} ${pt(p.ftr)}`}
          fill="none" stroke={activeStroke} strokeWidth="0.5" opacity="0.5" filter="url(#activeglow)" />
      )}

      {/* ── TOP FACE (roof: z=BH) ── */}
      <polygon
        points={`${pt(p.ftl)} ${pt(p.ftr)} ${pt(p.btr)} ${pt(p.btl)}`}
        fill={isHoriz ? activeFill : insulColor}
        stroke={isHoriz ? activeStroke : "#1e4a7f"} strokeWidth={isHoriz ? 1.8 : 0.8}
      />
      {/* Roof transverse studs */}
      {isHoriz && studXPos.map((xp, i) => {
        const a = iso(xp, 0, BH), b = iso(xp, BW, BH);
        return <line key={`tx${i}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke={studColor} strokeWidth="1" />;
      })}
      {/* Roof longitudinal studs */}
      {isHoriz && longYPos.map((yp, i) => {
        const a = iso(0, yp, BH), b = iso(BL, yp, BH);
        return <line key={`ly${i}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="#f97316aa" strokeWidth="0.8" strokeDasharray="3,2" />;
      })}
      {isHoriz && (
        <polygon points={`${pt(p.ftl)} ${pt(p.ftr)} ${pt(p.btr)} ${pt(p.btl)}`}
          fill="none" stroke={activeStroke} strokeWidth="0.5" opacity="0.5" filter="url(#activeglow)" />
      )}

      {/* ── FRONT FACE (side wall: y=0) ── */}
      <polygon
        points={`${pt(p.fbl)} ${pt(p.fbr)} ${pt(p.ftr)} ${pt(p.ftl)}`}
        fill={isSide ? activeFill : insulColor}
        stroke={isSide ? activeStroke : "#1e4a7f"} strokeWidth={isSide ? 1.8 : 1}
      />
      {/* Side-wall insulation inset */}
      {(() => {
        const inset = 6;
        const tl = iso(inset, 0, BH - inset), tr = iso(BL - inset, 0, BH - inset);
        const br = iso(BL - inset, 0, inset), bl = iso(inset, 0, inset);
        return <polygon points={`${pt(tl)} ${pt(tr)} ${pt(br)} ${pt(bl)}`}
          fill="none" stroke="#2563eb22" strokeWidth="0.5" strokeDasharray="4,3" />;
      })()}
      {/* Side-wall studs */}
      {studXPos.map((xp, i) => {
        const bot = iso(xp, 0, 0), top2 = iso(xp, 0, BH);
        return <line key={i} x1={bot.sx} y1={bot.sy} x2={top2.sx} y2={top2.sy}
          stroke={isSide ? studColor : "#ef444433"} strokeWidth={isSide ? 1.2 : 0.7} />;
      })}
      {isSide && (
        <polygon points={`${pt(p.fbl)} ${pt(p.fbr)} ${pt(p.ftr)} ${pt(p.ftl)}`}
          fill="none" stroke={activeStroke} strokeWidth="0.5" opacity="0.5" filter="url(#activeglow)" />
      )}

      {/* ── WIREFRAME EDGES ── */}
      {/* Front face */}
      {([["fbl","fbr"],["fbr","ftr"],["ftr","ftl"],["ftl","fbl"]] as const).map(([a,b], i) => (
        <line key={i} x1={p[a].sx} y1={p[a].sy} x2={p[b].sx} y2={p[b].sy}
          stroke={isSide ? activeStroke : "#3b82f6"} strokeWidth="1.5" />
      ))}
      {/* Right face edges */}
      {([["fbr","bbr"],["bbr","btr"],["btr","ftr"]] as const).map(([a,b], i) => (
        <line key={i} x1={p[a].sx} y1={p[a].sy} x2={p[b].sx} y2={p[b].sy}
          stroke={isEnd ? activeStroke : "#2563eb88"} strokeWidth={isEnd ? 1.5 : 1} />
      ))}
      {/* Top face edges */}
      {([["ftl","btl"],["btl","btr"]] as const).map(([a,b], i) => (
        <line key={i} x1={p[a].sx} y1={p[a].sy} x2={p[b].sx} y2={p[b].sy}
          stroke={isHoriz ? activeStroke : "#2563eb88"} strokeWidth={isHoriz ? 1.5 : 1} />
      ))}
      {/* Hidden back edges */}
      {([["bbl","bbr"],["bbl","btl"],["bbl","fbl"]] as const).map(([a,b], i) => (
        <line key={i} x1={p[a].sx} y1={p[a].sy} x2={p[b].sx} y2={p[b].sy}
          stroke="#1d4ed844" strokeWidth="0.8" strokeDasharray="4,2" />
      ))}

      {/* ── DIMENSION LABELS ── */}
      <text x={p.fbl.sx + (p.fbr.sx - p.fbl.sx) / 2 - 12} y={p.fbl.sy + (p.fbr.sy - p.fbl.sy) / 2 + 14}
        fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="700">
        {(realL / 1000).toFixed(2)}m
      </text>
      <text x={p.ftl.sx - 30} y={p.ftl.sy + (p.fbl.sy - p.ftl.sy) / 2}
        fill="#64748b" fontSize="8" fontFamily="monospace" fontWeight="700">
        {(realH / 1000).toFixed(2)}m
      </text>

      {/* ── STUD COUNT BADGE (top-left of selected face) ── */}
      {(() => {
        const badge = isSide ? p.ftl : isEnd ? p.ftr : p.btl;
        const bx = badge.sx + (isSide ? 4 : isEnd ? 4 : 4);
        const by = badge.sy + (isHoriz ? -10 : -14);
        const label = isHoriz
          ? `${nStuds}×${nLong} profil`
          : `${nStuds} profil`;
        return (
          <>
            <rect x={bx - 2} y={by - 9} width={label.length * 5 + 6} height={12} rx="3"
              fill="#0a1428" stroke={activeStroke} strokeWidth="0.5" opacity="0.9" />
            <text x={bx + 1} y={by} fill={activeStroke} fontSize="7" fontFamily="monospace" fontWeight="900">
              {label}
            </text>
          </>
        );
      })()}

      {/* ── TEMP PANEL ── */}
      <rect x="292" y="10" width="98" height="44" rx="6" fill="#0a0f1c" stroke="#1e293b" strokeWidth="1" />
      <text x="341" y="25" textAnchor="middle" fill="#64748b" fontSize="7" fontFamily="monospace" fontWeight="700">ΔT = {deltaT}°C</text>
      <text x="308" y="40" fill="#f97316" fontSize="9" fontFamily="monospace" fontWeight="900">{design.ambientTemp ?? 40}°C</text>
      <text x="308" y="52" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="900">{design.targetTemp ?? 0}°C</text>
      <text x="336" y="40" fill="#64748b" fontSize="7" fontFamily="monospace">dış</text>
      <text x="336" y="52" fill="#64748b" fontSize="7" fontFamily="monospace">iç</text>

      {/* ── INSULATION LABEL ── */}
      <text x="6" y="244" fill="#334155" fontSize="7" fontFamily="monospace" fontWeight="700">
        {INSULATION_MATERIALS.find(m => m.id === design.insulationMaterialId)?.name || "PU"} · {design.wallThickness}mm · k={INSULATION_MATERIALS.find(m => m.id === design.insulationMaterialId)?.kValue ?? 0.022} W/mK
      </text>

      {/* Corner dots */}
      {[p.fbl, p.fbr, p.ftl, p.ftr].map((v, i) => (
        <circle key={i} cx={v.sx} cy={v.sy} r="3"
          fill={isSide ? activeStroke : "#3b82f6"} opacity="0.9" filter="url(#isoglow)" />
      ))}

      <rect x="1" y="1" width="398" height="248" fill="none" stroke="#1e293b" strokeWidth="1" />
    </svg>
  );
};

/* ─────────────────────────────────────────────────────── */
/*  Slider Component                                        */
/* ─────────────────────────────────────────────────────── */
const SliderRow: React.FC<{
  label: string; value: number; min: number; max: number;
  unit?: string; accent?: string; onChange: (v: number) => void;
}> = ({ label, value, min, max, unit = "", accent = "accent-blue-500", onChange }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center">
      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      <span className="text-[10px] font-black text-white font-mono">{value}{unit}</span>
    </div>
    <input type="range" min={min} max={max} value={value}
      onChange={e => onChange(Number(e.target.value))}
      className={cn("w-full h-1 rounded-full appearance-none cursor-pointer bg-slate-800", accent)} />
    <div className="flex justify-between text-[7px] text-slate-700 font-mono">
      <span>{min}{unit}</span><span>{max}{unit}</span>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────── */
/*  Main Component                                          */
/* ─────────────────────────────────────────────────────── */
export const ThermalControlPanel: React.FC<ThermalControlPanelProps> = ({
  design, onDesignChange, refrigerantOptions, selectedWall, onSelectedWallChange, results,
}) => {
  const set = (key: string, value: any) => onDesignChange({ ...design, [key]: value });
  const updateWallConfig = (updates: any) => {
    const currentConfig = design.wallConfigs?.[selectedWall] || {};
    onDesignChange({
      ...design,
      wallConfigs: {
        ...design.wallConfigs,
        [selectedWall]: { ...currentConfig, ...updates },
      },
    });
  };

  const selectedCargo = (CARGO_PROFILES as any)[design.activeCargo] || CARGO_PROFILES.empty;
  const deltaT = design.ambientTemp - design.targetTemp;

  const cargoParamConfig: Record<string, { label: string; key: string; min: number; max: number; unit: string; accent: string }[]> = {
    empty: [],
    icecream: [
      { label: "Ön Soğutma Süresi", key: "cargoPreCoolTime", min: 1, max: 48, unit: "h", accent: "accent-cyan-500" },
      { label: "Taşıma Süresi", key: "cargoTransitHours", min: 1, max: 72, unit: "h", accent: "accent-blue-500" },
    ],
    produce: [
      { label: "Solunum Isısı Çarpanı", key: "cargoRespirationFactor", min: 1, max: 10, unit: "x", accent: "accent-emerald-500" },
      { label: "Ön Soğutma Süresi", key: "cargoPreCoolTime", min: 1, max: 48, unit: "h", accent: "accent-cyan-500" },
      { label: "Taşıma Süresi", key: "cargoTransitHours", min: 1, max: 72, unit: "h", accent: "accent-blue-500" },
    ],
    chicks: [
      { label: "Metabolik Isı Çarpanı", key: "cargoMetabolicFactor", min: 1, max: 20, unit: "x", accent: "accent-yellow-500" },
      { label: "Havalandırma Gereksinimi", key: "cargoVentReq", min: 10, max: 200, unit: "m³/h", accent: "accent-orange-500" },
      { label: "Taşıma Süresi", key: "cargoTransitHours", min: 1, max: 72, unit: "h", accent: "accent-blue-500" },
    ],
  };
  const activeCargoParams = cargoParamConfig[design.activeCargo] || [];
  const selectedInsulation = INSULATION_MATERIALS.find(m => m.id === design.insulationMaterialId) || INSULATION_MATERIALS[0];
  const selectedProfileMaterial = PROFILE_MATERIALS.find((m) => m.id === design.profileMaterialId) || PROFILE_MATERIALS[0];

  const panelArea = (() => {
    if (selectedWall === "roof" || selectedWall === "floor") {
      return (design.dimensions.length * design.dimensions.width) / 1_000_000;
    }
    if (selectedWall === "front" || selectedWall === "back") {
      return (design.dimensions.width * design.dimensions.height) / 1_000_000;
    }
    return (design.dimensions.length * design.dimensions.height) / 1_000_000;
  })();

  const panelHeightM = (selectedWall === "roof" || selectedWall === "floor")
    ? (design.dimensions.width / 1000)
    : (design.dimensions.height / 1000);

  const wallConfig = design.wallConfigs?.[selectedWall];
  const primarySpanMm = (selectedWall === "front" || selectedWall === "back")
    ? design.dimensions.width
    : design.dimensions.length;
  const primaryCount = Math.max(1, wallConfig?.profileCount || 1);
  const primaryPitchMm = wallConfig?.pitchMode === "pitch"
    ? (wallConfig?.profilePitch || 0)
    : (primaryCount > 1 ? (primarySpanMm - (design.profileWidth || 0)) / (primaryCount - 1) : primarySpanMm);

  const hasLongitudinal = selectedWall === "roof" || selectedWall === "floor";
  const secondarySpanMm = design.dimensions.width;
  const longitudinalCount = Math.max(1, wallConfig?.longitudinalCount || 1);
  const longitudinalPitchMm = wallConfig?.longitudinalPitchMode === "pitch"
    ? (wallConfig?.longitudinalPitch || 0)
    : (longitudinalCount > 1 ? (secondarySpanMm - (design.profileWidth || 0)) / (longitudinalCount - 1) : secondarySpanMm);

  return (
    <div className="flex flex-col h-full">
      {/* ── THERMAL CONTOUR VIEW ── */}
      <div className="relative shrink-0 bg-slate-950 border-b border-slate-800/80" style={{ height: 220 }}>
        <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">
            Termal Kontur · CFD Kesit
          </span>
        </div>
        <div className="absolute top-3 right-4 z-10">
          <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-wider border border-blue-500/30 bg-blue-500/10 text-blue-400">
            {design.refrigerant}
          </span>
        </div>
        <ThermalContourView design={design} selectedWall={selectedWall} results={results} />
      </div>

      {/* ── SCROLLABLE PARAMS ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">

        {/* TERMAL PARAMETRELER KARTI */}
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900/60">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.2em]">Termal Parametreler</span>
          </div>
          <div className="p-4 space-y-4">

            {/* Yalıtım Malzemesi */}
            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">
                Yalıtım Malzemesi
              </label>
              <select
                value={design.insulationMaterialId}
                onChange={e => set("insulationMaterialId", e.target.value)}
                className="w-full bg-[#080d1a] border border-slate-700/80 rounded-xl px-3 py-2 text-[9px] font-black text-white focus:outline-none focus:border-cyan-500/60 cursor-pointer appearance-none transition-colors"
              >
                {INSULATION_MATERIALS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="bg-slate-950/60 rounded-lg px-2.5 py-1.5 border border-slate-800/60">
                  <div className="text-[7px] text-slate-600 uppercase font-black">k-Değeri</div>
                  <div className="text-[10px] font-black text-cyan-400 font-mono">{selectedInsulation.kValue} W/mK</div>
                </div>
                <div className="bg-slate-950/60 rounded-lg px-2.5 py-1.5 border border-slate-800/60">
                  <div className="text-[7px] text-slate-600 uppercase font-black">Yoğunluk</div>
                  <div className="text-[10px] font-black text-cyan-400 font-mono">{selectedInsulation.density} kg/m³</div>
                </div>
              </div>
            </div>

            {/* Panel Seçimi & Geometrisi */}
            <div className="space-y-3">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Panel Seçimi & Geometrisi</div>

              <div className="grid grid-cols-3 gap-2">
                {(["leftSide", "rightSide", "front", "back", "roof", "floor"] as const).map((wall) => (
                  <button
                    key={wall}
                    onClick={() => onSelectedWallChange(wall)}
                    className={cn(
                      "py-2 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all",
                      selectedWall === wall
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600"
                    )}
                  >
                    {wall === "leftSide" ? "Sol Yan"
                      : wall === "rightSide" ? "Sağ Yan"
                      : wall === "front" ? "Ön Duvar"
                      : wall === "back" ? "Arka Duvar"
                      : wall === "roof" ? "Tavan" : "Taban"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[7px] text-slate-500 uppercase font-bold tracking-widest">Profil Malzemesi</label>
                  <select
                    value={design.profileMaterialId}
                    onChange={e => set("profileMaterialId", e.target.value)}
                    className="w-full bg-[#0a0f1c] text-white appearance-none text-[8px] font-black p-2 rounded border border-slate-700 outline-none cursor-pointer hover:border-slate-500 focus:border-blue-500"
                  >
                    {PROFILE_MATERIALS.map((material) => (
                      <option key={material.id} value={material.id}>{material.name}</option>
                    ))}
                  </select>
                  <div className="mt-1 text-[8px] text-slate-500 tracking-wide">
                    {selectedProfileMaterial.name} · ρ = {selectedProfileMaterial.density} kg/m³
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[7px] text-slate-400 uppercase font-black tracking-widest">Yalıtım Malzemesi</label>
                  <select
                    value={design.insulationMaterialId}
                    onChange={e => set("insulationMaterialId", e.target.value)}
                    className="w-full bg-[#0a0f1c] text-white appearance-none text-[8px] font-black p-2 rounded border border-slate-700 outline-none cursor-pointer hover:border-slate-500 focus:border-blue-500"
                  >
                    {INSULATION_MATERIALS.map((material) => (
                      <option key={material.id} value={material.id}>{material.name}</option>
                    ))}
                  </select>
                  <div className="mt-1 text-[8px] text-slate-500 tracking-wide">
                    k = {selectedInsulation.kValue} W/mK · {selectedInsulation.density} kg/m³
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[7px] text-slate-400 uppercase font-black tracking-widest">Kasa Yük Tipi</label>
                  <select
                    value={design.activeCargo}
                    onChange={e => set("activeCargo", e.target.value)}
                    className="w-full bg-[#0a0f1c] text-white appearance-none text-[8px] font-black p-2 rounded border border-slate-700 outline-none cursor-pointer hover:border-slate-500 focus:border-blue-500"
                  >
                    {Object.values(CARGO_PROFILES).map((cargo: any) => (
                      <option key={cargo.id} value={cargo.id}>{cargo.icon} {cargo.name}</option>
                    ))}
                  </select>
                  <div className="mt-1 text-[8px] text-slate-500 tracking-wide">
                    {selectedCargo.desc} {selectedCargo.max ? `Maks ${selectedCargo.max} ${selectedCargo.unit}` : ""}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Profil Aralıkları</div>
                <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                  <button
                    onClick={() => updateWallConfig({ pitchMode: "pitch" })}
                    className={cn(
                      "flex-1 py-1 text-[9px] font-black rounded uppercase transition-all",
                      wallConfig?.pitchMode === "pitch" ? "bg-blue-600 text-white" : "text-slate-500"
                    )}
                  >
                    Hatve (mm)
                  </button>
                  <button
                    onClick={() => updateWallConfig({ pitchMode: "count" })}
                    className={cn(
                      "flex-1 py-1 text-[9px] font-black rounded uppercase transition-all",
                      wallConfig?.pitchMode === "count" ? "bg-blue-600 text-white" : "text-slate-500"
                    )}
                  >
                    Adet
                  </button>
                </div>
                <SliderRow
                  label={wallConfig?.pitchMode === "count" ? "Enine Profil Adedi" : "Enine Profil Hatvesi (mm)"}
                  value={wallConfig?.pitchMode === "count" ? primaryCount : (wallConfig?.profilePitch || 650)}
                  min={wallConfig?.pitchMode === "count" ? 2 : 200}
                  max={wallConfig?.pitchMode === "count" ? 50 : 1200}
                  unit={wallConfig?.pitchMode === "count" ? "" : " mm"}
                  onChange={(v) => {
                    if (wallConfig?.pitchMode === "count") updateWallConfig({ profileCount: v });
                    else updateWallConfig({ profilePitch: v });
                  }}
                />
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-500 uppercase font-bold">Enine Mod:</span>
                  <span className="text-white font-black">{wallConfig?.pitchMode === "count" ? "Adet" : "Aralık"}</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-500 uppercase font-bold">Enine Aralık:</span>
                  <span className="text-white font-black">{primaryPitchMm.toFixed(0)} mm</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-500 uppercase font-bold">Enine Adet:</span>
                  <span className="text-white font-black">{primaryCount}</span>
                </div>
                {hasLongitudinal && (
                  <>
                    <div className="border-t border-slate-800 pt-2 mt-1" />
                    <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                      <button
                        onClick={() => updateWallConfig({ longitudinalPitchMode: "pitch" })}
                        className={cn(
                          "flex-1 py-1 text-[9px] font-black rounded uppercase transition-all",
                          wallConfig?.longitudinalPitchMode === "pitch" ? "bg-blue-600 text-white" : "text-slate-500"
                        )}
                      >
                        Boyuna Hatve
                      </button>
                      <button
                        onClick={() => updateWallConfig({ longitudinalPitchMode: "count" })}
                        className={cn(
                          "flex-1 py-1 text-[9px] font-black rounded uppercase transition-all",
                          wallConfig?.longitudinalPitchMode === "count" ? "bg-blue-600 text-white" : "text-slate-500"
                        )}
                      >
                        Boyuna Adet
                      </button>
                    </div>
                    <SliderRow
                      label={wallConfig?.longitudinalPitchMode === "count" ? "Boyuna Profil Adedi" : "Boyuna Profil Hatvesi (mm)"}
                      value={wallConfig?.longitudinalPitchMode === "count" ? longitudinalCount : (wallConfig?.longitudinalPitch || 650)}
                      min={wallConfig?.longitudinalPitchMode === "count" ? 2 : 200}
                      max={wallConfig?.longitudinalPitchMode === "count" ? 20 : 1200}
                      unit={wallConfig?.longitudinalPitchMode === "count" ? "" : " mm"}
                      onChange={(v) => {
                        if (wallConfig?.longitudinalPitchMode === "count") updateWallConfig({ longitudinalCount: v });
                        else updateWallConfig({ longitudinalPitch: v });
                      }}
                    />
                    <div className="flex justify-between text-[9px]">
                      <span className="text-slate-500 uppercase font-bold">Boyuna Mod:</span>
                      <span className="text-white font-black">{wallConfig?.longitudinalPitchMode === "count" ? "Adet" : "Aralık"}</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-slate-500 uppercase font-bold">Boyuna Aralık:</span>
                      <span className="text-white font-black">{longitudinalPitchMm.toFixed(0)} mm</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-slate-500 uppercase font-bold">Boyuna Adet:</span>
                      <span className="text-white font-black">{longitudinalCount}</span>
                    </div>
                  </>
                )}
              </div>

              <SliderRow
                label="Panel Kalınlığı (mm)"
                value={selectedWall === "roof" ? design.roofThickness : selectedWall === "floor" ? design.floorThickness : design.wallThickness}
                min={20}
                max={250}
                onChange={v => {
                  if (selectedWall === "roof") set("roofThickness", v);
                  else if (selectedWall === "floor") set("floorThickness", v);
                  else set("wallThickness", v);
                }}
              />

              <SliderRow
                label="Panel Uzunluğu (mm)"
                value={(selectedWall === "front" || selectedWall === "back") ? design.dimensions.width : design.dimensions.length}
                min={500}
                max={15000}
                onChange={v => {
                  if (selectedWall === "front" || selectedWall === "back") {
                    onDesignChange({ ...design, dimensions: { ...design.dimensions, width: v } });
                  } else {
                    onDesignChange({ ...design, dimensions: { ...design.dimensions, length: v } });
                  }
                }}
              />

              <SliderRow
                label="Panel Yüksekliği (mm)"
                value={(selectedWall === "roof" || selectedWall === "floor") ? design.dimensions.width : design.dimensions.height}
                min={500}
                max={4000}
                onChange={v => {
                  if (selectedWall === "roof" || selectedWall === "floor") {
                    onDesignChange({ ...design, dimensions: { ...design.dimensions, width: v } });
                  } else {
                    onDesignChange({ ...design, dimensions: { ...design.dimensions, height: v } });
                  }
                }}
              />

              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-500 uppercase font-bold">Hesaplanan Alan:</span>
                  <span className="text-white font-black">{panelArea.toFixed(4)} m²</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-500 uppercase font-bold">Panel Yüksekliği:</span>
                  <span className="text-white font-black">{panelHeightM.toFixed(4)} m</span>
                </div>
              </div>
            </div>

            {/* Sıcaklık Parametreleri */}
            <div className="space-y-3">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Thermometer className="w-2.5 h-2.5 text-orange-400" />
                Sıcaklık Parametreleri
              </div>
              <SliderRow label="Dış Ortam Sıcaklığı" value={design.ambientTemp} min={-10} max={55} unit="°C"
                accent="accent-orange-500" onChange={v => set("ambientTemp", v)} />
              <SliderRow label="Hedef İç Sıcaklık" value={design.targetTemp} min={-25} max={25} unit="°C"
                accent="accent-sky-500" onChange={v => set("targetTemp", v)} />
              <div className={cn(
                "flex items-center justify-between px-3 py-2 rounded-xl border",
                deltaT > 50 ? "bg-red-500/10 border-red-500/30" : deltaT > 30 ? "bg-amber-500/10 border-amber-500/30" : "bg-slate-950/50 border-slate-800"
              )}>
                <span className="text-[8px] font-black text-slate-500 uppercase">ΔT</span>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xl font-black font-mono",
                    deltaT > 50 ? "text-red-400" : deltaT > 30 ? "text-amber-400" : "text-white"
                  )}>{deltaT}°C</span>
                  <span className="text-[7px] text-slate-600">
                    {deltaT > 50 ? "⚠ Kritik" : deltaT > 30 ? "⚠ Yoğun" : "✓ Normal"}
                  </span>
                </div>
              </div>
            </div>

            {/* Soğutucu Akışkan */}
            <div className="space-y-2">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 block">
                <Wind className="w-2.5 h-2.5 text-teal-400" />
                Soğutucu Akışkan
              </label>
              <div className="grid grid-cols-3 gap-2">
                {refrigerantOptions.map(ref => (
                  <button
                    key={ref}
                    onClick={() => set("refrigerant", ref)}
                    className={cn(
                      "py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all",
                      design.refrigerant === ref
                        ? "bg-teal-500/20 border-teal-500/60 text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.2)]"
                        : "bg-slate-900/50 border-slate-700 text-slate-500 hover:border-slate-500"
                    )}
                  >
                    {ref}
                  </button>
                ))}
              </div>
              <div className="text-[7px] text-slate-600 font-mono mt-1">
                {design.refrigerant === "R407C" && "→ HFC blend · GWP 1774 · Dengeli performans"}
                {design.refrigerant === "R404A" && "→ HFC blend · GWP 3922 · Derin soğutma"}
                {design.refrigerant === "R134a" && "→ HFC tekil · GWP 1430 · Orta sıcaklık"}
              </div>
            </div>


          </div>
        </div>

        {/* KARGO TİPİ KARTI */}
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900/60">
            <Package className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">Kasa Yük Tipi & Parametreleri</span>
          </div>
          <div className="p-4 space-y-4">
            {/* Cargo cards */}
            <div className="grid grid-cols-4 gap-2">
              {Object.values(CARGO_PROFILES).map((cargo: any) => (
                <button key={cargo.id} onClick={() => set("activeCargo", cargo.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all",
                    design.activeCargo === cargo.id
                      ? "bg-emerald-500/15 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-600"
                  )}>
                  <span className="text-xl">{cargo.icon}</span>
                  <span className={cn("text-[7px] font-black uppercase tracking-widest leading-tight",
                    design.activeCargo === cargo.id ? "text-emerald-400" : "text-slate-600")}>
                    {cargo.name}
                  </span>
                  <span className="text-[6px] text-slate-700 font-mono">{cargo.temp}°C</span>
                </button>
              ))}
            </div>

            {/* Selected cargo info */}
            <div className="flex items-center gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
              <span className="text-2xl">{selectedCargo.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-black text-white">{selectedCargo.name}</span>
                  <span className="px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 rounded text-[7px] font-black text-emerald-400">
                    {selectedCargo.temp}°C
                  </span>
                </div>
                <p className="text-[7px] text-slate-500 leading-relaxed">{selectedCargo.desc}</p>
              </div>
              {selectedCargo.heatPerUnit > 0 && (
                <div className="text-right shrink-0">
                  <div className="text-[7px] text-orange-400 font-black uppercase">Isı Yükü</div>
                  <div className="text-[9px] font-black text-orange-300 font-mono">
                    {(selectedCargo.heatPerUnit * design.cargoAmount).toFixed(0)} W
                  </div>
                </div>
              )}
            </div>

            {/* Yük miktarı */}
            {design.activeCargo !== "empty" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                    Yük Miktarı ({selectedCargo.unit})
                  </label>
                  <span className="text-[10px] font-black text-white font-mono">
                    {design.cargoAmount.toLocaleString()} {selectedCargo.unit}
                    <span className="text-slate-600 text-[8px] ml-1">
                      = {(selectedCargo.weightPerUnit * design.cargoAmount).toFixed(0)} kg
                    </span>
                  </span>
                </div>
                <input type="range" min={0} max={selectedCargo.max}
                  step={selectedCargo.max > 1000 ? 50 : 1}
                  value={design.cargoAmount}
                  onChange={e => set("cargoAmount", Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500" />
                <div className="flex justify-between text-[7px] text-slate-700 font-mono">
                  <span>0</span><span>{selectedCargo.max?.toLocaleString()} {selectedCargo.unit}</span>
                </div>
              </div>
            )}

            {/* Cargo-specific params */}
            {activeCargoParams.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                  <ChevronRight className="w-2.5 h-2.5" />
                  {selectedCargo.name} — Özel Parametreler
                </div>
                {activeCargoParams.map(param => (
                  <SliderRow key={param.key} label={param.label} value={design[param.key] ?? param.min}
                    min={param.min} max={param.max} unit={param.unit} accent={param.accent}
                    onChange={v => set(param.key, v)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThermalControlPanel;
