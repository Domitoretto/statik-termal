import React from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import {
  Box, Layers, Thermometer, Zap, Scale, Ruler, BarChart3,
  FileText, Download, Save, CheckCircle2, AlertTriangle, Package,
  ArrowRight, TrendingDown, Activity,
} from "lucide-react";

interface AssemblyPanelProps {
  results: any;
  design: any;
  onExport: (type: "json" | "pdf") => void;
}

/* ── Mini stat card ── */
const StatCard: React.FC<{
  label: string; value: string | number; unit?: string;
  sub?: string; color?: string; border?: string; icon?: React.ReactNode;
}> = ({ label, value, unit, sub, color = "text-white", border = "border-slate-800/80", icon }) => (
  <div className={cn("bg-slate-900/50 rounded-2xl border p-4 space-y-1", border)}>
    <div className="flex items-center justify-between">
      <div className="text-[7px] font-black text-slate-600 uppercase tracking-[0.18em]">{label}</div>
      {icon && <div className="opacity-50">{icon}</div>}
    </div>
    <div className={cn("text-2xl font-black font-mono leading-none", color)}>
      {value}
      {unit && <span className="text-[10px] font-bold text-slate-500 ml-1">{unit}</span>}
    </div>
    {sub && <div className="text-[7px] text-slate-600 font-mono">{sub}</div>}
  </div>
);

/* ── Horizontal bar with label ── */
const Bar: React.FC<{ label: string; value: number; total: number; color: string; valueLabel?: string }> = ({
  label, value, total, color, valueLabel,
}) => {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">{label}</span>
        </div>
        <span className="text-[9px] font-black text-white font-mono">{valueLabel ?? value.toFixed(1)}</span>
      </div>
      <div className="relative h-1.5 bg-slate-900 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
};

/* ── Section header ── */
const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; sub?: string; badge?: string; badgeColor?: string }> = ({
  icon, title, sub, badge, badgeColor = "text-slate-400 border-slate-700/60",
}) => (
  <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-4">
    <div className="flex items-center gap-2.5">
      <div className="opacity-70">{icon}</div>
      <div>
        <div className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{title}</div>
        {sub && <div className="text-[7px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">{sub}</div>}
      </div>
    </div>
    {badge && (
      <div className={cn("px-2 py-1 rounded-lg border text-[7px] font-black uppercase tracking-wider", badgeColor)}>
        {badge}
      </div>
    )}
  </div>
);

/* ── Wall row in metraj table ── */
const WallRow: React.FC<{
  label: string; loss: { total: number; insulation: number; bridge: number };
  area: number; totalLoss: number; color: string;
}> = ({ label, loss, area, totalLoss, color }) => (
  <tr className="border-b border-slate-800/40 hover:bg-slate-900/30 transition-colors">
    <td className="py-2 px-3">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
    </td>
    <td className="py-2 px-3 text-right">
      <span className="text-[9px] font-black text-white font-mono">{area.toFixed(2)}</span>
      <span className="text-[7px] text-slate-600 ml-1">m²</span>
    </td>
    <td className="py-2 px-3 text-right">
      <span className="text-[9px] font-black text-amber-400 font-mono">{Math.round(loss.insulation)}</span>
      <span className="text-[7px] text-slate-600 ml-1">W</span>
    </td>
    <td className="py-2 px-3 text-right">
      <span className="text-[9px] font-black text-red-400 font-mono">{Math.round(loss.bridge)}</span>
      <span className="text-[7px] text-slate-600 ml-1">W</span>
    </td>
    <td className="py-2 px-3 text-right">
      <span className="text-[9px] font-black text-white font-mono">{Math.round(loss.total)}</span>
      <span className="text-[7px] text-slate-600 ml-1">W</span>
    </td>
    <td className="py-2 px-3 text-right">
      <span className="text-[8px] font-black font-mono" style={{ color }}>
        {totalLoss > 0 ? ((loss.total / totalLoss) * 100).toFixed(1) : "0"}%
      </span>
    </td>
  </tr>
);

export const AssemblyPanel: React.FC<AssemblyPanelProps> = ({ results, design, onExport }) => {
  const {
    totalGrossWeight, emptyWeight, cargoWeight,
    weightSteel, weightInsulation, weightSkins,
    totalSteelLength, totalSurfaceArea,
    totalHeatGain, lossPanel, lossCorners,
    ventilationHeatLoad, infiltrationLoad, internalHeatLoad,
    sideLoss, frontLoss, roofLoss, floorLoss,
    requiredCoolingCapacity, compressorPower, copEstimated,
    internalVolume, cogX, cogY, cogZ,
    isSafe, fos, maxDeflection, stress,
  } = results;

  const estCost = Math.round(totalSteelLength * 45 + totalSurfaceArea * 18);
  const L = design.dimensions.length / 1000;
  const W = design.dimensions.width / 1000;
  const H = design.dimensions.height / 1000;

  /* per-wall area helpers */
  const sideArea  = L * H;
  const endArea   = W * H;
  const horizArea = L * W;

  /* Ağırlık dağılımı */
  const weightItems = [
    { label: "Çelik Profil", val: weightSteel, color: "#3b82f6", unit: "kg" },
    { label: "Yalıtım", val: weightInsulation, color: "#f59e0b", unit: "kg" },
    { label: "Kaplama", val: weightSkins, color: "#10b981", unit: "kg" },
    ...(cargoWeight > 0 ? [{ label: "Kargo", val: cargoWeight, color: "#ef4444", unit: "kg" }] : []),
  ];

  /* Isı kaybı dağılımı */
  const heatItems = [
    { label: "Panel İletimi", val: lossPanel, color: "#f59e0b" },
    { label: "Isı Köprüleri", val: lossCorners, color: "#ef4444" },
    { label: "Ventilasyon", val: ventilationHeatLoad || 0, color: "#06b6d4" },
    { label: "İnfiltrasyon", val: infiltrationLoad || 0, color: "#f97316" },
    { label: "İç Yük (Kargo)", val: internalHeatLoad || 0, color: "#a78bfa" },
  ].filter(x => x.val > 0);

  return (
    <div className="w-full h-full flex flex-col gap-5 p-1">

      {/* ══ 1. ÖZET DURUM BANNER ══ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center justify-between px-5 py-3 rounded-2xl border text-[8px] font-black uppercase tracking-widest",
          isSafe
            ? "bg-emerald-500/8 border-emerald-500/25 text-emerald-400"
            : "bg-red-500/8 border-red-500/25 text-red-400"
        )}>
        <div className="flex items-center gap-2.5">
          {isSafe
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>
            {isSafe
              ? "Sistem Onaylı — Statik ve Termal Performans Tasarım Limitlerinde"
              : "Kritik Durum — Tasarım Parametrelerini Gözden Geçirin"}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[7px] font-bold text-slate-500 uppercase">
          <span>FoS <span className={fos >= 1.5 ? "text-emerald-400" : "text-red-400"}>{fos?.toFixed(2)}</span></span>
          <span>δ <span className="text-white">{maxDeflection?.toFixed(3)} mm</span></span>
          <span>σ <span className="text-white">{stress?.toFixed(2)} MPa</span></span>
          <span>Q <span className="text-white">{Math.round(totalHeatGain)} W</span></span>
        </div>
      </motion.div>

      {/* ══ 2. ANA METRIK KARILAR (4+2 grid) ══ */}
      <div className="grid grid-cols-6 gap-3">
        <StatCard label="Toplam Ağırlık"   value={Math.round(totalGrossWeight)} unit="kg"  sub={`Boş: ${Math.round(emptyWeight)} kg · Yük: ${Math.round(cargoWeight)} kg`} color="text-white"       border="border-slate-800/80" icon={<Scale className="w-3.5 h-3.5 text-slate-500" />} />
        <StatCard label="Toplam Çelik"     value={totalSteelLength.toFixed(1)} unit="m"    sub={`Profil metrajı`}                color="text-blue-300"     border="border-blue-500/20"    icon={<Ruler className="w-3.5 h-3.5 text-blue-500" />} />
        <StatCard label="Yüzey Alanı"      value={totalSurfaceArea.toFixed(1)} unit="m²"   sub={`Panel + Tavan + Taban`}         color="text-cyan-300"     border="border-cyan-500/20"    icon={<Box className="w-3.5 h-3.5 text-cyan-500" />} />
        <StatCard label="İç Hacim"         value={internalVolume.toFixed(2)}   unit="m³"   sub={`${L.toFixed(2)}×${W.toFixed(2)}×${H.toFixed(2)} m`} color="text-teal-300" border="border-teal-500/20" icon={<Package className="w-3.5 h-3.5 text-teal-500" />} />
        <StatCard label="Toplam Isı Kaybı" value={Math.round(totalHeatGain)}   unit="W"    sub={`Kompressor: ${compressorPower.toFixed(2)} kW`} color="text-red-400" border="border-red-500/20" icon={<Thermometer className="w-3.5 h-3.5 text-red-400" />} />
        <StatCard label="Tahmini Maliyet"  value={`~${estCost.toLocaleString("tr")}`} unit="TL" sub={`Profil + Panel malzeme`} color="text-emerald-300" border="border-emerald-500/20" icon={<TrendingDown className="w-3.5 h-3.5 text-emerald-500" />} />
      </div>

      {/* ══ 3. ÜÇ SÜTUN ORTA BÖLGE ══ */}
      <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">

        {/* ── SOL: Ağırlık Dağılımı + COG ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="bg-[#070d1a] rounded-2xl border border-slate-800/80 p-4 space-y-4 overflow-auto"
        >
          <SectionHeader
            icon={<Scale className="w-4 h-4 text-blue-400" />}
            title="Ağırlık Dağılımı"
            sub="Yapısal kütleler"
            badge={`${Math.round(totalGrossWeight)} kg`}
            badgeColor="text-blue-400 border-blue-500/25"
          />

          {/* Stacked weight bar */}
          <div className="flex h-8 rounded-xl overflow-hidden border border-slate-800/60">
            {weightItems.map((item, i) => {
              const w = totalGrossWeight > 0 ? (item.val / totalGrossWeight) * 100 : 0;
              return (
                <div key={i} className="flex items-center justify-center transition-all text-[6px] font-black text-white/80"
                  style={{ width: `${w}%`, backgroundColor: item.color + "cc", minWidth: w > 5 ? undefined : 0 }}>
                  {w > 8 ? `${w.toFixed(0)}%` : ""}
                </div>
              );
            })}
          </div>

          <div className="space-y-2.5">
            {weightItems.map((item, i) => (
              <Bar key={i} label={item.label}
                value={item.val} total={totalGrossWeight}
                color={item.color} valueLabel={`${item.val.toFixed(1)} kg`} />
            ))}
          </div>

          {/* Weight breakdown table */}
          <div className="bg-slate-900/40 rounded-xl border border-slate-800/40 overflow-hidden">
            <table className="w-full text-left">
              <tbody>
                {[
                  { label: "Boş Kasa", val: emptyWeight, unit: "kg" },
                  { label: "Kargo Yükü", val: cargoWeight, unit: "kg" },
                  { label: "Çelik Profil", val: weightSteel, unit: "kg" },
                  { label: "Yalıtım", val: weightInsulation, unit: "kg" },
                  { label: "Kaplama", val: weightSkins, unit: "kg" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-800/30 last:border-0">
                    <td className="py-1.5 px-3 text-[7px] text-slate-600 font-bold uppercase">{row.label}</td>
                    <td className="py-1.5 px-3 text-right text-[9px] font-black text-white font-mono">
                      {Math.round(row.val)} <span className="text-slate-600 text-[7px]">{row.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* COG */}
          <div className="bg-slate-900/40 rounded-xl border border-slate-800/40 p-3 space-y-2">
            <div className="text-[7px] font-black text-slate-600 uppercase tracking-[0.18em]">Ağırlık Merkezi (COG)</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { axis: "X", val: cogX?.toFixed(2), unit: "m", color: "text-red-400" },
                { axis: "Y", val: cogY?.toFixed(2), unit: "m", color: "text-green-400" },
                { axis: "Z", val: cogZ?.toFixed(2), unit: "m", color: "text-blue-400" },
              ].map((c, i) => (
                <div key={i} className="text-center">
                  <div className={cn("text-[8px] font-black", c.color)}>{c.axis}</div>
                  <div className="text-[11px] font-black text-white font-mono">{c.val}</div>
                  <div className="text-[6px] text-slate-700">{c.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── ORTA: Panel-bazlı ısı kaybı tablosu ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
          className="bg-[#070d1a] rounded-2xl border border-slate-800/80 p-4 space-y-4 overflow-auto"
        >
          <SectionHeader
            icon={<Thermometer className="w-4 h-4 text-orange-400" />}
            title="Panel Isı Kaybı"
            sub="Duvar bazlı analiz"
            badge={`${Math.round(totalHeatGain)} W toplam`}
            badgeColor="text-orange-400 border-orange-500/25"
          />

          {/* Per-wall table */}
          <div className="bg-slate-900/40 rounded-xl border border-slate-800/40 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/60">
                  {["Panel", "Alan", "Yalıtım", "Köprü", "Toplam", "%"].map((h, i) => (
                    <th key={i} className={cn("py-2 px-3 text-[6px] font-black text-slate-700 uppercase tracking-wider", i > 0 ? "text-right" : "text-left")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <WallRow label="Sol Yan"   loss={sideLoss ?? { total: 0, insulation: 0, bridge: 0 }} area={sideArea}  totalLoss={lossPanel} color="#3b82f6" />
                <WallRow label="Ön/Arka"   loss={frontLoss ?? { total: 0, insulation: 0, bridge: 0 }} area={endArea * 2} totalLoss={lossPanel} color="#8b5cf6" />
                <WallRow label="Tavan"     loss={roofLoss  ?? { total: 0, insulation: 0, bridge: 0 }} area={horizArea} totalLoss={lossPanel} color="#06b6d4" />
                <WallRow label="Taban"     loss={floorLoss ?? { total: 0, insulation: 0, bridge: 0 }} area={horizArea} totalLoss={lossPanel} color="#0ea5e9" />
              </tbody>
            </table>
          </div>

          {/* Heat loss distribution bars */}
          <div className="space-y-2.5">
            {heatItems.map((item, i) => (
              <Bar key={i} label={item.label}
                value={item.val} total={totalHeatGain}
                color={item.color}
                valueLabel={`${Math.round(item.val)} W`} />
            ))}
          </div>

          {/* Soğutma özet */}
          <div className="bg-slate-900/40 rounded-xl border border-slate-800/40 p-3 space-y-2">
            <div className="text-[7px] font-black text-slate-600 uppercase tracking-[0.18em]">Soğutma Sistemi</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "COP", val: copEstimated?.toFixed(2), color: "text-emerald-400" },
                { label: "Kapasite", val: `${(requiredCoolingCapacity / 1000).toFixed(2)} kW`, color: "text-cyan-400" },
                { label: "Kompressor", val: `${compressorPower?.toFixed(2)} kW`, color: "text-blue-400" },
              ].map((c, i) => (
                <div key={i} className="text-center">
                  <div className="text-[6px] text-slate-700 font-bold uppercase">{c.label}</div>
                  <div className={cn("text-[11px] font-black font-mono mt-0.5", c.color)}>{c.val}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── SAĞ: Metraj + Malzeme Özeti + Export ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-[#070d1a] rounded-2xl border border-slate-800/80 p-4 space-y-4 overflow-auto"
        >
          <SectionHeader
            icon={<BarChart3 className="w-4 h-4 text-emerald-400" />}
            title="Metraj & Malzeme"
            sub="Üretim özeti"
          />

          {/* Kasa boyutları */}
          <div className="bg-slate-900/40 rounded-xl border border-slate-800/40 p-3 space-y-2">
            <div className="text-[7px] font-black text-slate-600 uppercase tracking-[0.18em]">Kasa Boyutları</div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[
                { label: "Uzunluk", val: `${design.dimensions.length} mm` },
                { label: "Genişlik", val: `${design.dimensions.width} mm` },
                { label: "Yükseklik", val: `${design.dimensions.height} mm` },
                { label: "Duvar", val: `${design.wallThickness} mm` },
                { label: "Tavan", val: `${design.roofThickness} mm` },
                { label: "Taban", val: `${design.floorThickness} mm` },
              ].map((d, i) => (
                <div key={i} className="text-center">
                  <div className="text-[6px] text-slate-700 font-bold uppercase">{d.label}</div>
                  <div className="text-[9px] font-black text-white font-mono mt-0.5">{d.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Malzeme özeti */}
          <div className="bg-slate-900/40 rounded-xl border border-slate-800/40 overflow-hidden">
            <table className="w-full">
              <tbody>
                {[
                  { label: "Profil Malzemesi", val: design.profileMaterialId?.toUpperCase() || "—" },
                  { label: "Yalıtım", val: design.insulationMaterialId?.toUpperCase() || "—" },
                  { label: "Profil Tipi", val: design.profileType === "box" ? "Kapalı Kutu" : "C Profil" },
                  { label: "Profil Boyutu", val: `${design.profileWidth}×${design.profileDepth}×${design.profileThickness} mm` },
                  { label: "Kargo Tipi", val: design.activeCargo?.toUpperCase() || "BOŞ" },
                  { label: "Soğutucu Gaz", val: design.refrigerant || "R407C" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-800/30 last:border-0">
                    <td className="py-2 px-3 text-[7px] text-slate-600 font-bold uppercase">{row.label}</td>
                    <td className="py-2 px-3 text-right text-[8px] font-black text-white">{row.val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Profil metraj özeti */}
          <div className="bg-slate-900/40 rounded-xl border border-slate-800/40 p-3 space-y-1.5">
            <div className="text-[7px] font-black text-slate-600 uppercase tracking-[0.18em] mb-2">Profil Metraj</div>
            {[
              { label: "Toplam Çelik", val: `${totalSteelLength.toFixed(2)} m`, color: "text-blue-300" },
              { label: "Toplam Yüzey", val: `${totalSurfaceArea.toFixed(2)} m²`, color: "text-cyan-300" },
              { label: "İç Hacim",     val: `${internalVolume.toFixed(2)} m³`,  color: "text-teal-300" },
            ].map((r, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-[7px] text-slate-600 font-bold uppercase">{r.label}</span>
                <span className={cn("text-[9px] font-black font-mono", r.color)}>{r.val}</span>
              </div>
            ))}
          </div>

          {/* Maliyet kırılımı */}
          <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/20 p-3 space-y-1.5">
            <div className="text-[7px] font-black text-emerald-600/80 uppercase tracking-[0.18em] mb-2">Tahmini Maliyet</div>
            {[
              { label: "Çelik Profil", val: `${Math.round(totalSteelLength * 45).toLocaleString("tr")} TL`, note: "45 TL/m" },
              { label: "Panel Kaplama", val: `${Math.round(totalSurfaceArea * 18).toLocaleString("tr")} TL`, note: "18 TL/m²" },
              { label: "TOPLAM", val: `~${estCost.toLocaleString("tr")} TL`, highlight: true },
            ].map((r, i) => (
              <div key={i} className={cn("flex justify-between items-center", r.highlight && "pt-1.5 border-t border-emerald-500/20")}>
                <span className={cn("text-[7px] font-bold uppercase", r.highlight ? "text-emerald-400" : "text-slate-600")}>{r.label}</span>
                <div className="text-right">
                  <span className={cn("font-black font-mono", r.highlight ? "text-[13px] text-emerald-300" : "text-[9px] text-white")}>{r.val}</span>
                  {r.note && <div className="text-[6px] text-slate-700">{r.note}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Export buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onExport("json")}
              className="flex items-center justify-center gap-2 px-3 py-3 bg-blue-600/20 border border-blue-500/30 rounded-xl text-[8px] font-black uppercase tracking-wider text-blue-400 hover:bg-blue-600/30 hover:border-blue-500/50 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              Senaryoyu Kaydet
            </button>
            <button
              onClick={() => onExport("pdf")}
              className="flex items-center justify-center gap-2 px-3 py-3 bg-emerald-600/20 border border-emerald-500/30 rounded-xl text-[8px] font-black uppercase tracking-wider text-emerald-400 hover:bg-emerald-600/30 hover:border-emerald-500/50 transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF Rapor Al
            </button>
          </div>
        </motion.div>
      </div>

    </div>
  );
};
