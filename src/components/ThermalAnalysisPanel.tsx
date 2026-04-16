import React, { useMemo } from "react";
import {
  Zap, Thermometer, Wind, Activity, AlertTriangle, CheckCircle2,
  Cpu, TrendingUp, BarChart3, Gauge,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { INSULATION_MATERIALS } from "../constants";

interface ThermalAnalysisPanelProps {
  results: any;
  design: any;
  selectedWall: string;
  onDesignChange?: (design: any) => void;
}

/* ─────────────────────────────────────────────────────── */
/*  COP Arc Gauge                                           */
/* ─────────────────────────────────────────────────────── */
const CopGauge: React.FC<{ cop: number; maxCop?: number }> = ({ cop, maxCop = 5 }) => {
  const norm = Math.min(Math.max(cop / maxCop, 0), 1);
  const cx = 60, cy = 56, r = 44;

  // Arc goes from left (180°) to right (0°) passing through top
  const endAngle = (180 - norm * 180) * (Math.PI / 180);
  const ex = cx + r * Math.cos(endAngle);
  const ey = cy - r * Math.sin(endAngle);
  const largeArc = norm > 0.5 ? 1 : 0;

  const color = cop >= 3.5 ? "#22c55e" : cop >= 2.5 ? "#eab308" : cop >= 1.5 ? "#f97316" : "#ef4444";
  const label = cop >= 3.5 ? "Mükemmel" : cop >= 2.5 ? "İyi" : cop >= 1.5 ? "Orta" : "Düşük";

  return (
    <svg viewBox="0 0 120 80" className="w-full max-w-[140px]">
      {/* Track */}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
      {/* Ticks */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const a = (180 - t * 180) * Math.PI / 180;
        const ix = cx + (r - 12) * Math.cos(a), iy = cy - (r - 12) * Math.sin(a);
        const ox2 = cx + (r + 2) * Math.cos(a), oy2 = cy - (r + 2) * Math.sin(a);
        return <line key={i} x1={ix} y1={iy} x2={ox2} y2={oy2} stroke="#334155" strokeWidth="1" />;
      })}
      {/* Progress arc */}
      {norm > 0.01 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
      )}
      {/* Needle */}
      <line x1={cx} y1={cy}
        x2={cx + (r - 6) * Math.cos(endAngle)} y2={cy - (r - 6) * Math.sin(endAngle)}
        stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <circle cx={cx} cy={cy} r="3" fill="#0f172a" stroke="#475569" strokeWidth="1" />
      {/* Value */}
      <text x={cx} y={cy - 10} textAnchor="middle" fill="white" fontSize="14" fontWeight="900" fontFamily="monospace">
        {cop.toFixed(2)}
      </text>
      <text x={cx} y={cy + 2} textAnchor="middle" fill="#64748b" fontSize="6.5" fontFamily="monospace">
        COP
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="7" fontFamily="monospace" fill={color} fontWeight="700">
        {label}
      </text>
      {/* Range labels */}
      <text x={cx - r - 2} y={cy + 12} fill="#334155" fontSize="6" fontFamily="monospace" textAnchor="middle">0</text>
      <text x={cx + r + 2} y={cy + 12} fill="#334155" fontSize="6" fontFamily="monospace" textAnchor="middle">{maxCop}</text>
    </svg>
  );
};

/* ─────────────────────────────────────────────────────── */
/*  Thermal Bridge Heatmap Bar                              */
/* ─────────────────────────────────────────────────────── */
const ThermalBridgeBar: React.FC<{ design: any; bridgeLossRate: number; results: any }> = ({ design, bridgeLossRate, results }) => {
  const numBridges = Math.max(2, results.n_panel_studs || 2);
  const pitch = Math.round(results.actualPitch) || 650;
  const bridgePositions = Array.from({ length: numBridges }, (_, i) =>
    ((i + 0.5) / numBridges) * 100
  );
  const bridgeIntensity = Math.min(1, bridgeLossRate / 30); // normalize for color intensity

  return (
    <div className="space-y-2">
      <div className="relative h-12 rounded-xl overflow-hidden border border-slate-700/60" style={{ boxShadow: "inset 0 0 30px rgba(0,0,0,0.5)" }}>
        {/* Insulation base gradient */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to right, #071a2e, #0a2240, #0c2a50, #0a2240, #071a2e)" }} />
        {/* Bridge profile lines */}
        {bridgePositions.map((pos, i) => (
          <div key={i} className="absolute top-0 bottom-0 -translate-x-1/2" style={{
            left: `${pos}%`,
            width: 2,
            background: `linear-gradient(to bottom, rgba(239,68,68,${0.3 + bridgeIntensity * 0.7}), rgba(249,115,22,${0.5 + bridgeIntensity * 0.4}), rgba(239,68,68,${0.3 + bridgeIntensity * 0.7}))`
          }} />
        ))}
        {/* Hot glow on bridges */}
        {bridgePositions.slice(0, Math.min(numBridges, 20)).map((pos, i) => (
          <div key={`glow-${i}`} className="absolute top-0 bottom-0 -translate-x-1/2" style={{
            left: `${pos}%`, width: 8,
            background: `radial-gradient(ellipse 4px 100% at center, rgba(239,68,68,${bridgeIntensity * 0.25}) 0%, transparent 100%)`
          }} />
        ))}
        {/* Temp axis labels */}
        <div className="absolute inset-0 flex items-end justify-between px-2 pb-1 pointer-events-none">
          <span className="text-[7px] font-black text-blue-300 font-mono">{design.targetTemp}°C</span>
          <span className="text-[7px] font-black text-slate-500 font-mono uppercase tracking-wider">
            {numBridges} profil · {pitch}mm aralık
          </span>
          <span className="text-[7px] font-black text-orange-400 font-mono">{design.ambientTemp}°C</span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 text-[7px] font-black text-slate-600 uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-2 rounded-sm" style={{ background: "#0a2240" }} />
          Yalıtım Bölgesi
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-3 rounded-sm bg-red-500/70" />
          Isı Köprüsü (Profil)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-slate-600" />
          Köprü Oranı: <span className="text-orange-400 ml-1">{bridgeLossRate.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};

const WALL_LABELS: Record<string, string> = {
  leftSide: "Sol Yan",
  rightSide: "Sağ Yan",
  front: "Ön Duvar",
  back: "Arka Duvar",
  roof: "Tavan",
  floor: "Taban",
};

/* ─────────────────────────────────────────────────────── */
/*  Main Component                                          */
/* ─────────────────────────────────────────────────────── */
export const ThermalAnalysisPanel: React.FC<ThermalAnalysisPanelProps> = ({
  results, design, selectedWall,
}) => {
  const insulMat = useMemo(() =>
    INSULATION_MATERIALS.find(m => m.id === design.insulationMaterialId) || INSULATION_MATERIALS[0],
    [design.insulationMaterialId]
  );

  const deltaT = design.ambientTemp - design.targetTemp;

  // U-Value: proper thermal resistance calculation
  // U = 1 / (R_si + R_insulation + R_se)  [R_si=0.13, R_se=0.04 for walls per ISO 6946]
  const uValue = useMemo(() => {
    const thicknessMm = design.wallThickness || 80;
    const R_si = 0.13; // internal surface resistance (m²K/W)
    const R_se = 0.04; // external surface resistance
    const R_ins = (thicknessMm / 1000) / insulMat.kValue;
    const uPure = 1 / (R_si + R_ins + R_se);
    // Effective U including thermal bridge increment (ISO 14683 approach)
    // ΔU = Σ(ψ_j × l_j) / A_total
    const totalArea = results.totalSurfaceArea || 1;
    const psiLossPer_m2 = (results.lossCorners || 0) / (totalArea * (design.ambientTemp - design.targetTemp || 1));
    return uPure + psiLossPer_m2;
  }, [design.wallThickness, design.ambientTemp, design.targetTemp, insulMat, results]);

  const bridgeLossRate = useMemo(() =>
    results.totalHeatGain > 0 ? ((results.lossCorners || 0) / results.totalHeatGain) * 100 : 0,
    [results]
  );

  const dailyEnergy = (results.compressorPower * 24);
  const efficiencyRatio = dailyEnergy / (design.energyTarget || 100);
  const massFlowRate = results.refrigerantMassFlow || 0;

  const metricCards = [
    {
      label: "Toplam Isı Kaybı",
      value: Math.round(results.totalHeatGain),
      unit: "W",
      sub: `Panel ${Math.round(results.lossPanel)}W + Köprü ${Math.round(results.lossCorners)}W + Vent ${Math.round(results.ventilationHeatLoad || 0)}W`,
      color: "text-red-400", border: "border-red-500/20", glow: "hover:border-red-500/40",
      bg: "bg-red-500/5", icon: <Thermometer className="w-4 h-4 text-red-400" />,
    },
    {
      label: "Yalıtım U-Değeri",
      value: uValue.toFixed(3),
      unit: "W/m²K",
      sub: `${insulMat.name} · ${design.wallThickness}mm`,
      color: "text-cyan-400", border: "border-cyan-500/20", glow: "hover:border-cyan-500/40",
      bg: "bg-cyan-500/5", icon: <Cpu className="w-4 h-4 text-cyan-400" />,
    },
    {
      label: "Isı Köprüsü Oranı",
      value: bridgeLossRate.toFixed(1),
      unit: "%",
      sub: `Corner type: ${design.cornerType?.toUpperCase() || "BOX"}`,
      color: bridgeLossRate > 20 ? "text-amber-400" : "text-emerald-400",
      border: bridgeLossRate > 20 ? "border-amber-500/20" : "border-emerald-500/20",
      glow: bridgeLossRate > 20 ? "hover:border-amber-500/40" : "hover:border-emerald-500/40",
      bg: bridgeLossRate > 20 ? "bg-amber-500/5" : "bg-emerald-500/5",
      icon: <Activity className="w-4 h-4" style={{ color: bridgeLossRate > 20 ? "#f59e0b" : "#22c55e" }} />,
    },
  ];

  const heatBreakdown = [
    { label: "Panel İletimi", value: results.lossPanel || 0, color: "#f59e0b", total: results.totalHeatGain },
    { label: "Isı Köprüleri (Ψ)", value: results.lossCorners || 0, color: "#ef4444", total: results.totalHeatGain },
    { label: "Ventilasyon Yükü", value: results.ventilationHeatLoad || 0, color: "#06b6d4", total: results.totalHeatGain },
    { label: "Sızma/İnfiltrasyon", value: results.infiltrationLoad || 0, color: "#f97316", total: results.totalHeatGain },
    { label: "İç Isı Yükü (Kargo)", value: results.internalHeatLoad || 0, color: "#a78bfa", total: results.totalHeatGain },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-5 p-1">

      {/* ── 3 METRIC CARDS ── */}
      <div className="grid grid-cols-3 gap-3">
        {metricCards.map((card, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={cn(
              "rounded-2xl border p-4 transition-all group cursor-default",
              card.bg, card.border, card.glow
            )}>
            <div className="flex items-center justify-between mb-3">
              {card.icon}
              <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">
                {["W", "W/m²K", "%"][i]}
              </span>
            </div>
            <div className={cn("text-2xl font-black font-mono", card.color)}>{card.value}</div>
            <div className="text-[7px] text-slate-600 font-black uppercase tracking-wider mt-0.5">{card.unit}</div>
            <div className="mt-2 pt-2 border-t border-slate-800/60 text-[7px] text-slate-600 font-mono leading-tight">{card.sub}</div>
            <div className="mt-1.5 text-[7px] font-black text-slate-500 uppercase tracking-wider">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── SELECTED WALL THERMAL BREAKDOWN ── */}
      <div className="bg-[#070d1a] rounded-2xl border border-blue-500/20 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Thermometer className="w-4 h-4 text-blue-400" />
          <div>
            <div className="text-[9px] font-black text-blue-300 uppercase tracking-[0.2em]">{WALL_LABELS[selectedWall]} · Termal Analiz</div>
            <div className="text-[7px] text-slate-600 font-bold uppercase tracking-widest">Seçili panel ısı kaybı dağılımı</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {/* 1st: Total panel loss — larger emphasis */}
          <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/30">
            <div className="text-[7px] text-blue-400 font-black uppercase tracking-wider">Panel Toplam</div>
            <div className="text-2xl font-black text-blue-300 font-mono mt-1">{Math.round(results.panelLoss)}</div>
            <div className="text-[7px] text-blue-500/70 font-mono">W · %{results.totalHeatGain > 0 ? ((results.panelLoss / results.totalHeatGain) * 100).toFixed(1) : 0}</div>
          </div>
          {/* 2nd: Insulation loss */}
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/60">
            <div className="text-[7px] text-slate-600 font-black uppercase tracking-wider">Yalıtım Kaybı</div>
            <div className="text-lg font-black text-amber-400 font-mono mt-1">{Math.round(results.panelInsulationLoss)}</div>
            <div className="text-[7px] text-slate-600 font-mono">W · {results.panelLoss > 0 ? ((results.panelInsulationLoss / results.panelLoss) * 100).toFixed(0) : 0}%</div>
          </div>
          {/* 3rd: Bridge loss */}
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/60">
            <div className="text-[7px] text-slate-600 font-black uppercase tracking-wider">Köprü Kaybı</div>
            <div className="text-lg font-black text-red-400 font-mono mt-1">{Math.round(results.panelBridgeLoss)}</div>
            <div className="text-[7px] text-slate-600 font-mono">W · {results.panelLoss > 0 ? ((results.panelBridgeLoss / results.panelLoss) * 100).toFixed(0) : 0}%</div>
          </div>
          {/* 4th: Panel area + stud count */}
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/60">
            <div className="text-[7px] text-slate-600 font-black uppercase tracking-wider">Panel Alanı</div>
            <div className="text-lg font-black text-cyan-400 font-mono mt-1">{results.panelArea.toFixed(2)}</div>
            <div className="text-[7px] text-slate-600 font-mono">m² · {results.n_panel_studs} profil</div>
          </div>
        </div>
        {/* Per-wall vs Total comparison bar */}
        <div className="relative h-1.5 bg-slate-900 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
            style={{ width: `${results.totalHeatGain > 0 ? Math.min((results.panelLoss / results.totalHeatGain) * 100, 100) : 0}%` }}
          />
        </div>
        <div className="flex justify-between text-[7px] font-black text-slate-600 uppercase tracking-wider">
          <span>{WALL_LABELS[selectedWall]}: {Math.round(results.panelLoss)} W</span>
          <span>Toplam: {Math.round(results.totalHeatGain)} W · {results.totalHeatGain > 0 ? ((results.panelLoss / results.totalHeatGain) * 100).toFixed(1) : 0}%</span>
        </div>
      </div>

      {/* ── THERMAL BRIDGE HEATMAP ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#070d1a] rounded-2xl border border-slate-800/80 p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-[9px] font-black text-blue-300 uppercase tracking-[0.2em]">Termal Köprü Geçirgenlik Matrisi</div>
              <div className="text-[7px] text-slate-600 font-bold uppercase tracking-widest">Metal profil ısı sızıntısı simülasyonu</div>
            </div>
          </div>
          <div className={cn(
            "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider",
            bridgeLossRate > 25 ? "bg-red-500/15 text-red-400 border border-red-500/25" :
            bridgeLossRate > 15 ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" :
            "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
          )}>
            {bridgeLossRate > 25 ? "⚠ Yüksek" : bridgeLossRate > 15 ? "! Orta" : "✓ Düşük"} Köprü
          </div>
        </div>
        <ThermalBridgeBar design={design} bridgeLossRate={bridgeLossRate} results={results} />
      </motion.div>

      {/* ── HEAT LOSS BREAKDOWN ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.27 }}
        className="bg-[#070d1a] rounded-2xl border border-slate-800/80 p-4 space-y-3"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[9px] font-black text-orange-300 uppercase tracking-[0.2em]">Isı Kaybı Dağılımı</span>
          </div>
          <span className="text-[8px] font-black text-red-400 font-mono">{Math.round(results.totalHeatGain)} W toplam</span>
        </div>
        <div className="space-y-2.5">
          {heatBreakdown.map((item, i) => {
            const pct = item.total > 0 ? (item.value / item.total) * 100 : 0;
            return (
              <motion.div key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.04 }}
                className="space-y-1"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color, opacity: 0.7 }} />
                    <span className="text-[8px] text-slate-400 font-bold">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-white font-mono">{Math.round(item.value)} W</span>
                    <span className="text-[7px] text-slate-600 font-mono w-9 text-right">{pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="relative h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.9, delay: 0.3 + i * 0.06, ease: "easeOut" }}
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}60` }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── ACTIVE COOLING SYSTEM ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-[#04091a] rounded-2xl border border-blue-900/40 p-5 space-y-4 shadow-[0_0_40px_rgba(59,130,246,0.06)]"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
          <Cpu className="w-4 h-4 text-blue-400" />
          <div>
            <div className="text-[10px] font-black text-blue-300 uppercase tracking-[0.3em]">Aktif Entegre Soğutma Sistemi</div>
            <div className="text-[7px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">
              Gereksinim Analizi · {design.refrigerant}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5 items-center">
          {/* LEFT: COP Gauge */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Performans Katsayısı (COP)</div>
            <CopGauge cop={results.copEstimated || 0} maxCop={5} />
            <div className="grid grid-cols-2 gap-2 w-full">
              <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/60 text-center">
                <div className="text-[7px] text-slate-600 font-black uppercase">Buharlaştırıcı</div>
                <div className="text-[11px] font-black text-sky-400 font-mono mt-0.5">{design.evaporatorTemp}°C</div>
              </div>
              <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/60 text-center">
                <div className="text-[7px] text-slate-600 font-black uppercase">Yoğuşturucu</div>
                <div className="text-[11px] font-black text-orange-400 font-mono mt-0.5">{design.condenserTemp}°C</div>
              </div>
            </div>
          </div>

          {/* RIGHT: Compressor Power */}
          <div className="flex flex-col gap-3">
            {/* MAIN: Compressor Power - NEON BLUE BIG */}
            <div className="bg-gradient-to-br from-blue-950/60 to-blue-900/20 rounded-2xl border border-blue-500/25 p-4 text-center"
              style={{ boxShadow: "0 0 20px rgba(59,130,246,0.08), inset 0 1px 0 rgba(59,130,246,0.1)" }}>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Zap className="w-3 h-3 text-blue-400" />
                <span className="text-[7px] font-black text-blue-400 uppercase tracking-[0.2em]">Gerekli Kompressor Gücü</span>
              </div>
              <div className="text-4xl font-black font-mono leading-none"
                style={{
                  color: "#38bdf8",
                  textShadow: "0 0 20px rgba(56,189,248,0.6), 0 0 40px rgba(56,189,248,0.3)"
                }}>
                {results.compressorPower.toFixed(2)}
              </div>
              <div className="text-[10px] font-black text-blue-400/70 uppercase tracking-widest mt-1">kW</div>
              <div className="text-[7px] text-slate-600 font-mono mt-2">
                {(results.compressorPower * 24).toFixed(1)} kWh/gün · {dailyEnergy > design.energyTarget ? "⚠" : "✓"} hedef {design.energyTarget} kWh
              </div>
            </div>

            {/* Cooling capacity */}
            <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Soğutma Kapasitesi</span>
                <Gauge className="w-3 h-3 text-cyan-500" />
              </div>
              <div className="text-xl font-black text-cyan-400 font-mono">{(results.requiredCoolingCapacity / 1000).toFixed(2)} <span className="text-[10px]">kW</span></div>
              <div className="text-[7px] text-slate-600 font-mono">{Math.round(results.requiredCoolingCapacity)} W nominal</div>
            </div>

            {/* Mass flow */}
            <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Soğutucu Kitle Akışı</span>
                <Wind className="w-3 h-3 text-teal-500" />
              </div>
              <div className="text-xl font-black text-teal-400 font-mono">{massFlowRate.toFixed(2)} <span className="text-[10px]">kg/h</span></div>
              <div className="text-[7px] text-slate-600 font-mono">{design.refrigerant} · latent heat</div>
            </div>
          </div>
        </div>

        {/* Refrigerant cycle summary row */}
        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-800/60">
          {[
            { label: "ΔT Sıcaklık", value: `${deltaT}°C`, color: deltaT > 50 ? "text-red-400" : "text-white" },
            { label: "Güvenlik Katsayısı", value: `${design.safetyFactor.toFixed(1)}×`, color: "text-violet-400" },
            { label: "Ventilasyon", value: `${design.ventilationRate} ACH`, color: "text-slate-400" },
            { label: "Günlük Enerji", value: `${(results.compressorPower * 24).toFixed(1)} kWh`, color: efficiencyRatio > 1.2 ? "text-red-400" : "text-emerald-400" },
          ].map((item, i) => (
            <div key={i} className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/40 text-center">
              <div className="text-[6px] font-black text-slate-700 uppercase tracking-wider leading-tight mb-1">{item.label}</div>
              <div className={cn("text-[10px] font-black font-mono", item.color)}>{item.value}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── STATUS BANNER ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest",
          efficiencyRatio > 1.3
            ? "bg-red-500/10 border-red-500/25 text-red-400"
            : efficiencyRatio > 1.0
            ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
            : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
        )}>
        {efficiencyRatio > 1.0
          ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          : <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
        {efficiencyRatio > 1.3
          ? `Enerji hedefi aşıldı: ${(results.compressorPower * 24).toFixed(1)} kWh > ${design.energyTarget} kWh hedef — sistem optimizasyonu gerekli`
          : efficiencyRatio > 1.0
          ? `Enerji hedefine yakın: ${(results.compressorPower * 24).toFixed(1)} kWh — izlemeye devam edilmeli`
          : `Sistem onaylı: Kompressor ${results.compressorPower.toFixed(2)} kW · COP ${results.copEstimated.toFixed(2)} · Termal performans ideal`}
      </motion.div>
    </div>
  );
};

export default ThermalAnalysisPanel;
