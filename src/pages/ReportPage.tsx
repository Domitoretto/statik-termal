import React from "react";
import {
  Thermometer,
  Shield,
  Weight,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Printer,
  X,
  TrendingUp,
  Wind,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { DesignParameters, CalculationResults } from "../types";
import { MATERIALS, INSULATION_MATERIALS, PROFILE_MATERIALS, CARGO_PROFILES } from "../constants";
import { exportExcel } from "../utils/exportExcel";
import { ThermalContourView } from "../components/ThermalContourView";

interface ReportPageProps {
  design: DesignParameters;
  results: CalculationResults;
  selectedWall: string;
  onClose: () => void;
  onExportPDF: () => void;
}

// ─── KPI kartı ────────────────────────────────────────────────────────────────
const KPI = ({ label, value, unit, sub, color = "blue" }: {
  label: string; value: string; unit?: string; sub?: string; color?: "blue" | "green" | "red" | "amber" | "purple";
}) => {
  const colorMap: Record<string, string> = {
    blue:   "border-blue-500   bg-blue-50   text-blue-700",
    green:  "border-green-500  bg-green-50  text-green-700",
    red:    "border-red-500    bg-red-50    text-red-700",
    amber:  "border-amber-500  bg-amber-50  text-amber-700",
    purple: "border-purple-500 bg-purple-50 text-purple-700",
  };
  return (
    <div className={`border-l-4 rounded-r-lg p-3 ${colorMap[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-0.5">{value}<span className="text-sm font-normal ml-1 opacity-60">{unit}</span></p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
};

// ─── Bölüm başlığı ────────────────────────────────────────────────────────────
const SectionTitle = ({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) => (
  <div className="flex items-center gap-3 mb-4 pb-2 border-b-2 border-slate-200">
    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">{icon}</div>
    <div>
      <h2 className="text-base font-bold text-slate-800">{title}</h2>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  </div>
);

// ─── Tablo satırı ─────────────────────────────────────────────────────────────
const TR = ({ label, value, unit, highlight }: { label: string; value: string | number; unit?: string; highlight?: boolean }) => (
  <tr className={highlight ? "bg-blue-50" : "even:bg-slate-50"}>
    <td className="px-3 py-1.5 text-xs text-slate-600 font-medium">{label}</td>
    <td className="px-3 py-1.5 text-xs text-slate-800 font-bold text-right">
      {value} <span className="text-slate-400 font-normal">{unit}</span>
    </td>
  </tr>
);

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
export const ReportPage: React.FC<ReportPageProps> = ({ design, results, selectedWall, onClose, onExportPDF }) => {
  const ins     = INSULATION_MATERIALS.find(m => m.id === design.insulationMaterialId) || INSULATION_MATERIALS[0];
  const skin    = MATERIALS.find(m => m.id === design.skinMaterialId) || MATERIALS[0];
  const profMat = PROFILE_MATERIALS.find(m => m.id === design.profileMaterialId) || PROFILE_MATERIALS[0];
  const cargo   = (CARGO_PROFILES as any)[design.activeCargo];
  const dT      = Math.abs(design.ambientTemp - design.targetTemp);

  // ── Isı kaybı pasta verisi ──────────────────────────────────────────────────
  const heatPieData = [
    { name: "Panel İletimi",    value: Math.round(results.lossPanel),           color: "#3b82f6" },
    { name: "Köşe Kaybı",      value: Math.round(results.lossCorners),          color: "#8b5cf6" },
    { name: "Havalandırma",     value: Math.round(results.ventilationHeatLoad),  color: "#06b6d4" },
    { name: "Sızıntı",          value: Math.round(results.infiltrationLoad),     color: "#f59e0b" },
    { name: "İç Isı",           value: Math.round(results.internalHeatLoad),     color: "#ef4444" },
  ].filter(d => d.value > 0);

  // ── Duvar bazlı kayıp çubuk verisi ─────────────────────────────────────────
  const wallBarData = [
    { name: "Sol Yan",   insulation: Math.round(results.sideLoss.insulation / 2),  bridge: Math.round(results.sideLoss.bridge / 2) },
    { name: "Sağ Yan",   insulation: Math.round(results.sideLoss.insulation / 2),  bridge: Math.round(results.sideLoss.bridge / 2) },
    { name: "Ön/Arka",   insulation: Math.round(results.frontLoss.insulation / 2), bridge: Math.round(results.frontLoss.bridge / 2) },
    { name: "Çatı",      insulation: Math.round(results.roofLoss.insulation),       bridge: Math.round(results.roofLoss.bridge) },
    { name: "Zemin",     insulation: Math.round(results.floorLoss.insulation),      bridge: Math.round(results.floorLoss.bridge) },
  ];

  // ── Ağırlık dağılımı ───────────────────────────────────────────────────────
  const weightData = [
    { name: "Çelik",    value: Math.round(results.weightSteel),      color: "#64748b" },
    { name: "Yalıtım",  value: Math.round(results.weightInsulation),  color: "#f59e0b" },
    { name: "Kaplama",  value: Math.round(results.weightSkins),       color: "#3b82f6" },
    { name: "Kargo",    value: Math.round(results.cargoWeight),        color: "#10b981" },
  ].filter(d => d.value > 0);

  const uEff  = results.totalSurfaceArea > 0
    ? (results.lossPanel + results.lossCorners) / (results.totalSurfaceArea * dT)
    : 0;

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto print:static print:overflow-visible">
      {/* ── Araç çubuğu (baskıda gizlenir) ────────────────────────────────── */}
      <div className="print:hidden sticky top-0 z-10 bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Layers size={18} className="text-blue-400" />
          <span className="font-bold text-sm">Thermo-Static Rapor</span>
          <span className="text-slate-400 text-xs">|</span>
          <span className="text-slate-400 text-xs">{new Date().toLocaleDateString("tr-TR", { dateStyle: "long" })}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportExcel(design, results)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-xs font-semibold transition-colors"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            onClick={onExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs font-semibold transition-colors"
          >
            <Download size={14} /> PDF
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-semibold transition-colors"
          >
            <Printer size={14} /> Yazdır
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-red-700 rounded text-xs font-semibold transition-colors"
          >
            <X size={14} /> Kapat
          </button>
        </div>
      </div>

      {/* ── Rapor içeriği ──────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-8 py-8 print:py-4 print:px-6">

        {/* ── Kapak ────────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white rounded-2xl p-8 mb-8 print:rounded-none print:mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-1">Teknik Analiz Raporu</p>
              <h1 className="text-3xl font-bold mb-1">Thermo-Static Box</h1>
              <p className="text-slate-300 text-sm">V75 Hesap Motoru · Termal & Statik Performans Değerlendirmesi</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs">{new Date().toLocaleDateString("tr-TR", { dateStyle: "long" })}</p>
              <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold ${results.isSafe ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                {results.isSafe ? "✓ Yapısal Güvenli" : "⚠ Kontrol Gerekli"}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700">
            {[
              ["Boyutlar", `${design.dimensions.length}×${design.dimensions.width}×${design.dimensions.height} mm`],
              ["Yalıtım", `${ins.name} / ${design.wallThickness}mm`],
              ["ΔT", `${dT} °C`],
              ["Soğutucu", design.refrigerant],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-slate-400 text-xs">{k}</p>
                <p className="text-white font-semibold text-sm">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Özet KPI ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KPI label="Toplam Isı Yükü" value={results.totalHeatGain.toFixed(0)} unit="W" color="red"
               sub={`Güv.katsayısı ile: ${results.requiredCoolingCapacity.toFixed(0)} W`} />
          <KPI label="Tahmini COP" value={results.copEstimated.toFixed(2)} unit="-" color="green"
               sub={`Kompresör: ${results.compressorPower.toFixed(2)} kW`} />
          <KPI label="Etkin U-Değeri" value={uEff.toFixed(3)} unit="W/m²K" color="blue"
               sub={`Toplam yüzey ${results.totalSurfaceArea.toFixed(1)} m²`} />
          <KPI label="FoS (Güvenlik)" value={results.fos.toFixed(2)} unit="-"
               color={results.fos >= 1.5 ? "green" : "red"}
               sub={results.isSafe ? "Tüm kriterler sağlanıyor" : "Profil kontrolü gerekli"} />
        </div>

        {/* ══════════════════════════ TERMAL ANALİZ ══════════════════════════ */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
          <SectionTitle icon={<Thermometer size={18} />} title="Termal Analiz" sub="ISO 6946 · V75 Isıl Köprü Motoru" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sol: Isı yükü dağılımı ─────────────────────────────────────── */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Isı Yükü Dağılımı</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={heatPieData} dataKey="value" nameKey="name" cx="40%" cy="50%" outerRadius={75} paddingAngle={2}>
                    {heatPieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10}
                    formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
                  <Tooltip formatter={(v: number) => [`${v} W`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Sağ: Duvar bazlı kayıp grafiği ──────────────────────────────── */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Duvar Başına Kayıp (W)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={wallBarData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [`${v} W`, ""]} />
                  <Bar dataKey="insulation" name="Yalıtım" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="bridge"     name="Köprü"   stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  <Legend iconSize={10} formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Termal detay tablosu ────────────────────────────────────────────── */}
          {/* Isı köprüsü görselleştirmesi */}
          <div className="mt-4 rounded-lg overflow-hidden border border-slate-700 bg-[#010812]" style={{ height: 210 }}>
            <ThermalContourView design={design} selectedWall={selectedWall} results={results} />
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-800 text-white text-xs"><th className="px-3 py-2">Parametre</th><th className="px-3 py-2 text-right">Değer</th></tr></thead>
              <tbody>
                <TR label="Panel İletim Kaybı"       value={results.lossPanel.toFixed(1)}           unit="W" />
                <TR label="Köşe / Bağlantı Kaybı"   value={results.lossCorners.toFixed(1)}          unit="W" />
                <TR label="Havalandırma Yükü"        value={results.ventilationHeatLoad.toFixed(1)}  unit="W" />
                <TR label="Sızıntı Yükü"             value={results.infiltrationLoad.toFixed(1)}     unit="W" />
                <TR label="İç Isı Yükü (Kargo)"     value={results.internalHeatLoad.toFixed(1)}     unit="W" />
                <TR label="Toplam Isı Kazancı"       value={results.totalHeatGain.toFixed(1)}        unit="W" highlight />
                <TR label="Güvenlik Payı ile Kapasite" value={results.requiredCoolingCapacity.toFixed(1)} unit="W" highlight />
                <TR label="Tahmini COP"              value={results.copEstimated.toFixed(2)}         unit="-" />
                <TR label="Kompresör Gücü"           value={results.compressorPower.toFixed(2)}      unit="kW" />
                <TR label="Soğutucu Akış Hızı"      value={results.refrigerantMassFlow.toFixed(2)}  unit="kg/h" />
              </tbody>
            </table>
          </div>

          {/* Duvar detay tablosu ─────────────────────────────────────────────── */}
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-700 text-white text-xs">
                <th className="px-3 py-2">Duvar</th>
                <th className="px-3 py-2 text-right">Yalıtım (W)</th>
                <th className="px-3 py-2 text-right">Köprü (W)</th>
                <th className="px-3 py-2 text-right">Toplam (W)</th>
              </tr></thead>
              <tbody>
                {[
                  ["Sol Yan (×2)",  results.sideLoss.insulation, results.sideLoss.bridge, results.sideLoss.total],
                  ["Ön / Arka (×2)", results.frontLoss.insulation, results.frontLoss.bridge, results.frontLoss.total],
                  ["Çatı",          results.roofLoss.insulation, results.roofLoss.bridge, results.roofLoss.total],
                  ["Zemin",         results.floorLoss.insulation, results.floorLoss.bridge, results.floorLoss.total],
                ].map(([name, ins, br, tot]) => (
                  <tr key={name as string} className="even:bg-slate-50 text-xs">
                    <td className="px-3 py-1.5 text-slate-600 font-medium">{name as string}</td>
                    <td className="px-3 py-1.5 text-blue-700 font-bold text-right">{(ins as number).toFixed(1)}</td>
                    <td className="px-3 py-1.5 text-red-600 font-bold text-right">{(br as number).toFixed(1)}</td>
                    <td className="px-3 py-1.5 text-slate-800 font-bold text-right">{(tot as number).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ══════════════════════════ STATİK ANALİZ ══════════════════════════ */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
          <SectionTitle icon={<Shield size={18} />} title="Statik Analiz" sub="FEM Çözüm · ISO 6946 Panel Modeli" />

          <div className={`flex items-center gap-3 p-3 rounded-lg mb-4 ${results.isSafe ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            {results.isSafe
              ? <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
              : <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />}
            <div>
              <p className={`text-sm font-bold ${results.isSafe ? "text-green-700" : "text-red-700"}`}>
                {results.isSafe ? "Tüm Yapısal Kriterler Sağlanıyor" : "Yapısal Kontrol Gerekli"}
              </p>
              <p className="text-xs text-slate-500">
                FoS = {results.fos.toFixed(2)} · Max Sehim = {results.maxDeflection.toFixed(2)} mm · Max Gerilme = {results.stress.toFixed(1)} MPa
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left">
                <thead><tr className="bg-slate-800 text-white text-xs"><th className="px-3 py-2">Yapısal Parametre</th><th className="px-3 py-2 text-right">Değer</th></tr></thead>
                <tbody>
                  <TR label="Max. Yanal Sehim"      value={results.maxDeflection.toFixed(2)}          unit="mm" />
                  <TR label="Sehim Limiti (L/250)"  value={(results.panelHeight * 1000 / 250).toFixed(1)} unit="mm" />
                  <TR label="Max. Düşey Sehim"      value={results.maxVerticalDeflection.toFixed(2)}   unit="mm" />
                  <TR label="Max. Gerilme (yanal)"  value={results.stress.toFixed(1)}                  unit="MPa" />
                  <TR label="Düşey Gerilme"         value={results.verticalStress.toFixed(1)}          unit="MPa" />
                  <TR label="Güvenlik Faktörü"      value={results.fos.toFixed(2)}                     unit="-"  highlight />
                  <TR label="Etkin Atalet Momenti"  value={results.I_eff.toFixed(0)}                   unit="mm⁴" />
                  <TR label="Gerçek Profil Aralığı" value={results.actualPitch.toFixed(0)}             unit="mm" />
                </tbody>
              </table>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left">
                <thead><tr className="bg-slate-700 text-white text-xs"><th className="px-3 py-2">Yük & Profil Bilgisi</th><th className="px-3 py-2 text-right">Değer</th></tr></thead>
                <tbody>
                  <TR label="Ölü Yük"               value={results.loadBreakdown.dead.toFixed(3)}      unit="N/mm" />
                  <TR label="Hareketli Yük"         value={results.loadBreakdown.live.toFixed(3)}      unit="N/mm" />
                  <TR label="Profil Ağırlığı"       value={results.loadBreakdown.profiles.toFixed(3)}  unit="N/mm" />
                  <TR label="Rüzgar Yükü"           value={design.windLoad}                            unit="Pa" />
                  <TR label="Profil Tipi"           value={design.profileType === "box" ? "Kapalı Kutu" : "C Profil"} />
                  <TR label="Profil Boyutu"         value={`${design.profileWidth}×${design.profileDepth}×${design.profileThickness}`} unit="mm" />
                  <TR label="Panel Alanı (seçili)"  value={results.panelArea.toFixed(2)}               unit="m²" />
                  <TR label="Profil Aralığı (nom.)" value={design.wallConfigs.leftSide.profilePitch}   unit="mm" />
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ══════════════════════════ AĞIRLIK & GEOMETRİ ═════════════════════ */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
          <SectionTitle icon={<Weight size={18} />} title="Ağırlık & Geometri" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left">
                <thead><tr className="bg-slate-800 text-white text-xs"><th className="px-3 py-2">Parametre</th><th className="px-3 py-2 text-right">Değer</th></tr></thead>
                <tbody>
                  <TR label="Çelik Ağırlığı"          value={results.weightSteel.toFixed(1)}       unit="kg" />
                  <TR label="Yalıtım Ağırlığı"        value={results.weightInsulation.toFixed(1)}  unit="kg" />
                  <TR label="Kaplama Ağırlığı"        value={results.weightSkins.toFixed(1)}        unit="kg" />
                  <TR label="Boş Araç Ağırlığı"       value={results.emptyWeight.toFixed(1)}        unit="kg" highlight />
                  <TR label="Kargo Ağırlığı"          value={results.cargoWeight.toFixed(1)}        unit="kg" />
                  <TR label="Toplam Brüt Ağırlık"     value={results.totalGrossWeight.toFixed(1)}   unit="kg" highlight />
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Ağırlık Dağılımı</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={weightData} dataKey="value" nameKey="name" cx="40%" cy="50%" outerRadius={70} paddingAngle={2}>
                    {weightData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10}
                    formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
                  <Tooltip formatter={(v: number) => [`${v} kg`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left">
                  <thead><tr className="bg-slate-700 text-white text-xs"><th className="px-3 py-2">Geometri</th><th className="px-3 py-2 text-right">Değer</th></tr></thead>
                  <tbody>
                    <TR label="İç Hacim"          value={results.internalVolume.toFixed(2)}    unit="m³" />
                    <TR label="Toplam Yüzey"      value={results.totalSurfaceArea.toFixed(2)}  unit="m²" />
                    <TR label="Toplam Çelik Uzunluğu" value={results.totalSteelLength.toFixed(1)} unit="m" />
                    <TR label="Ağırlık Merkezi Z" value={results.cogZ.toFixed(2)}              unit="m" />
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════ MALZEME BİLGİLERİ ══════════════════════ */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
          <SectionTitle icon={<Layers size={18} />} title="Malzeme Teknik Özellikleri" />
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800 text-white text-xs">
                  <th className="px-3 py-2">Malzeme Rolü</th>
                  <th className="px-3 py-2">Malzeme Adı</th>
                  <th className="px-3 py-2 text-right">λ (W/mK)</th>
                  <th className="px-3 py-2 text-right">Yoğunluk (kg/m³)</th>
                  <th className="px-3 py-2 text-right">Kalınlık</th>
                </tr>
              </thead>
              <tbody>
                <tr className="even:bg-slate-50 text-xs">
                  <td className="px-3 py-1.5 text-slate-600 font-medium">Yalıtım</td>
                  <td className="px-3 py-1.5 text-slate-800 font-semibold">{ins.name}</td>
                  <td className="px-3 py-1.5 text-right text-blue-700 font-bold">{ins.kValue}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600">{ins.density}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600">Duvar:{design.wallThickness} / Çatı:{design.roofThickness} / Zemin:{design.floorThickness} mm</td>
                </tr>
                <tr className="even:bg-slate-50 text-xs">
                  <td className="px-3 py-1.5 text-slate-600 font-medium">İç/Dış Kaplama</td>
                  <td className="px-3 py-1.5 text-slate-800 font-semibold">{skin.name}</td>
                  <td className="px-3 py-1.5 text-right text-blue-700 font-bold">{skin.kValue ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600">{skin.density}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600">0.6 mm × 2</td>
                </tr>
                <tr className="even:bg-slate-50 text-xs">
                  <td className="px-3 py-1.5 text-slate-600 font-medium">Profil Sistemi</td>
                  <td className="px-3 py-1.5 text-slate-800 font-semibold">{profMat.name}</td>
                  <td className="px-3 py-1.5 text-right text-blue-700 font-bold">{profMat.kValue}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600">{profMat.density}</td>
                  <td className="px-3 py-1.5 text-right text-slate-600">{design.profileWidth}×{design.profileDepth}×{design.profileThickness} mm</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ══════════════════════════ SOĞUTMA SİSTEMİ ════════════════════════ */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
          <SectionTitle icon={<Zap size={18} />} title="Soğutma & Enerji Analizi" sub={`Soğutucu: ${design.refrigerant}`} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <KPI label="Gerekli Kapasite" value={(results.requiredCoolingCapacity / 1000).toFixed(2)} unit="kW" color="red" />
            <KPI label="COP" value={results.copEstimated.toFixed(2)} unit="-" color="green"
                 sub={`Carnot × 0.55 × faktör`} />
            <KPI label="Kompresör Gücü" value={results.compressorPower.toFixed(2)} unit="kW" color="amber" />
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-800 text-white text-xs"><th className="px-3 py-2">Parametre</th><th className="px-3 py-2 text-right">Değer</th></tr></thead>
              <tbody>
                <TR label="Evaporatör Sıcaklığı"     value={design.evaporatorTemp}                    unit="°C" />
                <TR label="Kondenser Sıcaklığı"      value={design.condenserTemp}                     unit="°C" />
                <TR label="Soğutucu Akış Hızı"       value={results.refrigerantMassFlow.toFixed(2)}   unit="kg/h" />
                <TR label="Kargo"                    value={cargo.name} />
                <TR label="Kargo Miktarı"            value={`${design.cargoAmount} ${cargo.unit}`} />
                <TR label="Kargo Isı Yükü"           value={results.internalHeatLoad.toFixed(1)}      unit="W" />
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Alt not ──────────────────────────────────────────────────────── */}
        <div className="text-center text-xs text-slate-400 py-4 border-t border-slate-200">
          <p>Bu rapor Thermo-Static Box V75 hesap motoru tarafından otomatik oluşturulmuştur.</p>
          <p className="mt-1">Hesaplamalar ISO 6946, EN 13947 ve ASHRAE standartları referans alınarak yapılmıştır.</p>
          <p className="mt-1">{new Date().toLocaleString("tr-TR")}</p>
        </div>
      </div>

      {/* ── Baskı stilleri ─────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .rounded-2xl, .rounded-xl, .rounded-lg { border-radius: 0 !important; }
          .shadow-sm { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};
