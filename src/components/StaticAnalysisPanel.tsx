import React from "react";

const WALL_LABELS: Record<string, string> = {
  leftSide: "Sol Yan",
  rightSide: "Sağ Yan",
  front: "Ön Duvar",
  back: "Arka Duvar",
  roof: "Tavan",
  floor: "Taban",
};

interface StaticAnalysisPanelProps {
  results: any;
  selectedWall: string;
}

export const StaticAnalysisPanel: React.FC<StaticAnalysisPanelProps> = ({
  results,
  selectedWall,
}) => {
  const maxDeflection = Math.max(results.maxDeflection, results.maxVerticalDeflection);
  const maxStress = Math.max(results.stress, results.verticalStress);
  const fos = results.fos;
  const deadLoad = results.loadBreakdown?.dead || 0;
  const liveLoad = results.loadBreakdown?.live || 0;
  const totalLoad = deadLoad + liveLoad;

  // FoS color determination
  const getFoSStyle = () => {
    if (fos > 1.5) {
      return {
        bgClass: "bg-emerald-500/20",
        borderClass: "border-emerald-500/50",
        textClass: "text-emerald-400",
        gaugeColor: "#10b981",
        status: "GÜVENLİ",
      };
    }
    if (fos >= 1.0) {
      return {
        bgClass: "bg-yellow-500/20",
        borderClass: "border-yellow-500/50",
        textClass: "text-yellow-400",
        gaugeColor: "#eab308",
        status: "UYARI",
      };
    }
    return {
      bgClass: "bg-red-500/20",
      borderClass: "border-red-500/50",
      textClass: "text-red-400",
      gaugeColor: "#ef4444",
      status: "TEHLİKELİ",
    };
  };

  const fosStyle = getFoSStyle();

  // Calculate gauge needle angle (0-180 degrees)
  const maxFoS = 10;
  const needleAngle = Math.min((fos / maxFoS) * 180, 180);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Critical Metrics Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="text-[7px] text-blue-400 uppercase font-black tracking-widest">{WALL_LABELS[selectedWall]} · Sehim</div>
          <div className="text-3xl font-black text-blue-400 mt-2">{maxDeflection.toFixed(3)}</div>
          <div className="text-[7px] text-slate-600 mt-1 uppercase font-bold">mm</div>
        </div>

        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="text-[7px] text-blue-400 uppercase font-black tracking-widest">{WALL_LABELS[selectedWall]} · Gerilme</div>
          <div className="text-3xl font-black text-blue-400 mt-2">{maxStress.toFixed(2)}</div>
          <div className="text-[7px] text-slate-600 mt-1 uppercase font-bold">MPa</div>
        </div>
      </div>

      {/* FoS Gauge */}
      <div className={`${fosStyle.bgClass} rounded-xl p-5 border ${fosStyle.borderClass} shadow-lg`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Emniyet Katsayısı (FoS)</div>
            <div className="text-[7px] text-slate-600 mt-1">Tasarım mukavemeti / Çalışma gerilmesi oranı</div>
          </div>
          <div className={`px-3 py-1.5 rounded-lg ${fosStyle.bgClass} border ${fosStyle.borderClass}`}>
            <div className={`text-2xl font-black ${fosStyle.textClass}`}>{fos.toFixed(2)}</div>
          </div>
        </div>

        {/* Status and Risk Assessment */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className={`rounded-lg p-3 text-center ${fos < 1.0 ? 'bg-red-600/30 border border-red-500/50' : 'bg-slate-800/40 border border-slate-700/50'}`}>
            <div className="text-[7px] text-slate-400 uppercase font-bold mb-1">TEHLİKELİ</div>
            <div className="text-[8px] font-black">FoS &lt; 1.0</div>
          </div>
          <div className={`rounded-lg p-3 text-center ${fos >= 1.0 && fos < 1.5 ? 'bg-yellow-600/30 border border-yellow-500/50' : 'bg-slate-800/40 border border-slate-700/50'}`}>
            <div className="text-[7px] text-slate-400 uppercase font-bold mb-1">UYARI</div>
            <div className="text-[8px] font-black">1.0 - 1.5</div>
          </div>
          <div className={`rounded-lg p-3 text-center ${fos >= 1.5 ? 'bg-emerald-600/30 border border-emerald-500/50' : 'bg-slate-800/40 border border-slate-700/50'}`}>
            <div className="text-[7px] text-slate-400 uppercase font-bold mb-1">GÜVENLİ</div>
            <div className="text-[8px] font-black">FoS ≥ 1.5</div>
          </div>
        </div>

        {/* Gauge Dial */}
        <div className="mb-4">
          <svg width="100%" height="100" viewBox="0 0 300 120" className="overflow-visible">
            {/* Background arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 280 100"
              fill="none"
              stroke="#1e293b"
              strokeWidth="10"
              strokeLinecap="round"
            />

            {/* Gradient zones */}
            {/* Red zone (0-1.0) */}
            <path
              d="M 20 100 A 80 80 0 0 1 50 30"
              fill="none"
              stroke="#ef4444"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.4"
            />
            {/* Yellow zone (1.0-1.5) */}
            <path
              d="M 50 30 A 80 80 0 0 1 100 12"
              fill="none"
              stroke="#eab308"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.4"
            />
            {/* Green zone (1.5+) */}
            <path
              d="M 100 12 A 80 80 0 0 1 280 100"
              fill="none"
              stroke="#10b981"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.4"
            />

            {/* Threshold markers */}
            {/* 1.0 marker */}
            <line x1="50" y1="25" x2="50" y2="10" stroke="#eab308" strokeWidth="2" />
            <text x="50" y="8" fontSize="10" fill="#eab308" fontWeight="bold" textAnchor="middle">1.0</text>

            {/* 1.5 marker */}
            <line x1="100" y1="10" x2="100" y2="-5" stroke="#10b981" strokeWidth="2" />
            <text x="100" y="-8" fontSize="10" fill="#10b981" fontWeight="bold" textAnchor="middle">1.5</text>

            {/* Needle */}
            <line
              x1="150"
              y1="100"
              x2={150 + 70 * Math.cos(Math.PI - (needleAngle * Math.PI) / 180)}
              y2={100 - 70 * Math.sin(Math.PI - (needleAngle * Math.PI) / 180)}
              stroke={fosStyle.gaugeColor}
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Center dot */}
            <circle cx="150" cy="100" r="7" fill={fosStyle.gaugeColor} />

            {/* Scale labels */}
            <text x="15" y="120" fontSize="11" fill="#64748b" fontWeight="bold">0</text>
            <text x="285" y="120" fontSize="11" fill="#64748b" fontWeight="bold">10</text>
          </svg>
        </div>

        {/* Status Description */}
        <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
          <div className={`text-[10px] font-black uppercase tracking-widest ${fosStyle.textClass} mb-2`}>
            {fosStyle.status}
          </div>
          <div className="text-[8px] text-slate-300 leading-relaxed">
            {fos > 1.5
              ? "✓ Sistem güvenli sınırlar içerisindedir. Yapı yeterli emniyet katsayısına sahiptir."
              : fos >= 1.0
                ? "⚠ Sistem sınır değerlere yaklaşmaktadır. Malzeme, profil veya geometri gözden geçirilmelidir."
                : "✕ Sistem kritik durumdadır. Tasarım değişikliği gerekmektedir. Daha güçlü profil veya malzeme seçiniz."}
          </div>
        </div>
      </div>

      {/* Load Breakdown Visual */}
      <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800">
        <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-4">Yük Dağılımı</div>

        {/* Stacked bar showing load distribution */}
        <div className="space-y-4">
          {/* Bar chart */}
          <div>
            <div className="flex h-10 rounded-lg overflow-hidden border border-slate-700/50 shadow-lg">
              <div
                className="bg-gradient-to-r from-orange-600 to-orange-400 flex items-center justify-center transition-all"
                style={{ width: totalLoad > 0 ? `${(deadLoad / totalLoad) * 100}%` : '0%' }}
              >
                <span className="text-[7px] font-black text-white drop-shadow-lg">
                  {totalLoad > 0 ? `${((deadLoad / totalLoad) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
              <div
                className="bg-gradient-to-r from-red-600 to-red-400 flex items-center justify-center transition-all"
                style={{ width: totalLoad > 0 ? `${(liveLoad / totalLoad) * 100}%` : '0%' }}
              >
                <span className="text-[7px] font-black text-white drop-shadow-lg">
                  {totalLoad > 0 ? `${((liveLoad / totalLoad) * 100).toFixed(0)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>

          {/* Legend and values */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-orange-600 to-orange-400"></div>
                <span className="text-[8px] text-slate-400 uppercase font-bold">Ölü Yük</span>
              </div>
              <div className="text-lg font-black text-orange-300">{deadLoad.toFixed(2)}</div>
              <div className="text-[7px] text-slate-500">kg (Panel + Profil)</div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-red-600 to-red-400"></div>
                <span className="text-[8px] text-slate-400 uppercase font-bold">Hareketli</span>
              </div>
              <div className="text-lg font-black text-red-300">{liveLoad.toFixed(2)}</div>
              <div className="text-[7px] text-slate-500">kg (Kargo)</div>
            </div>
          </div>

          {/* Total load highlight */}
          <div className="bg-blue-600/15 rounded-lg p-3 border border-blue-600/30 shadow-lg">
            <div className="text-[7px] text-blue-400 uppercase font-black tracking-widest mb-1">TOPLAM YÜK</div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-black text-blue-300">{totalLoad.toFixed(2)}</div>
              <div className="text-sm text-blue-400 font-bold">kg</div>
            </div>
          </div>
        </div>
      </div>

      {/* Deflection Diagram */}
      <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800">
        <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-3">Sehim Diyagramı</div>

        <svg width="100%" height="140" viewBox="0 0 400 140" className="overflow-visible">
          {/* Definitions */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="5"
              refY="5"
              orient="auto"
            >
              <polygon points="0 0, 10 5, 0 10" fill="#ef4444" />
            </marker>
          </defs>

          {/* Beam supports (left and right) */}
          <circle cx="30" cy="110" r="5" fill="#3b82f6" />
          <polygon points="30,115 20,125 40,125" fill="#3b82f6" opacity="0.6" />

          <circle cx="370" cy="110" r="5" fill="#3b82f6" />
          <polygon points="370,115 360,125 380,125" fill="#3b82f6" opacity="0.6" />

          {/* Beam baseline (undeflected) */}
          <line x1="40" y1="110" x2="360" y2="110" stroke="#475569" strokeWidth="4" opacity="0.5" />

          {/* Deflected beam (parabolic curve) */}
          <path
            d="M 40 110 Q 200 50 360 110"
            stroke="#06b6d4"
            strokeWidth="3"
            fill="none"
            strokeDasharray="6,4"
            opacity="0.8"
          />

          {/* Load arrows (multiple forces) */}
          <g>
            {/* Left load */}
            <line x1="120" y1="35" x2="120" y2="95" stroke="#ef4444" strokeWidth="2.5" markerEnd="url(#arrowhead)" />
            <polygon points="120,30 116,40 124,40" fill="#ef4444" />

            {/* Center load (larger) */}
            <line x1="200" y1="25" x2="200" y2="95" stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowhead)" />
            <polygon points="200,20 196,30 204,30" fill="#ef4444" />

            {/* Right load */}
            <line x1="280" y1="35" x2="280" y2="95" stroke="#ef4444" strokeWidth="2.5" markerEnd="url(#arrowhead)" />
            <polygon points="280,30 276,40 284,40" fill="#ef4444" />
          </g>

          {/* Deflection dimension line and annotation */}
          <line x1="360" y1="60" x2="390" y2="60" stroke="#06b6d4" strokeWidth="1" />
          <line x1="390" y1="50" x2="390" y2="70" stroke="#06b6d4" strokeWidth="1" />
          <line x1="360" y1="110" x2="390" y2="110" stroke="#06b6d4" strokeWidth="1" />
          <line x1="390" y1="100" x2="390" y2="120" stroke="#06b6d4" strokeWidth="1" />
          <line x1="390" y1="60" x2="390" y2="110" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3,3" />

          {/* Deflection value label */}
          <text x="395" y="88" fontSize="11" fill="#06b6d4" fontWeight="bold" fontFamily="monospace">
            δ = {maxDeflection.toFixed(3)} mm
          </text>

          {/* Legend */}
          <text x="50" y="135" fontSize="10" fill="#64748b" fontWeight="bold">
            Kiriş (Panel)
          </text>
          <text x="180" y="135" fontSize="10" fill="#ef4444" fontWeight="bold">
            Yükleme
          </text>
          <text x="310" y="135" fontSize="10" fill="#06b6d4" fontWeight="bold">
            Sehim
          </text>
        </svg>
      </div>

      {/* Toplam Kasa Yapısal Özet */}
      <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800">
        <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-3">Toplam Kasa Özeti</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-[7px] text-slate-500 uppercase font-bold mb-1">Toplam Ağırlık</div>
            <div className="text-lg font-black text-white">{Math.round(results.totalGrossWeight)} <span className="text-[9px] text-slate-500 font-bold">kg</span></div>
            <div className="text-[7px] text-slate-600">Boş: {Math.round(results.emptyWeight)} kg</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-[7px] text-slate-500 uppercase font-bold mb-1">Toplam Çelik</div>
            <div className="text-lg font-black text-white">{results.totalSteelLength.toFixed(1)} <span className="text-[9px] text-slate-500 font-bold">m</span></div>
            <div className="text-[7px] text-slate-600">{results.totalSurfaceArea.toFixed(1)} m² yüzey</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-[7px] text-slate-500 uppercase font-bold mb-1">Panel Ağırlığı</div>
            <div className="text-lg font-black text-white">{results.panelTotalWeight.toFixed(1)} <span className="text-[9px] text-slate-500 font-bold">kg</span></div>
            <div className="text-[7px] text-slate-600">{WALL_LABELS[selectedWall]} · {results.panelArea.toFixed(2)} m²</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div className="text-[7px] text-slate-500 uppercase font-bold mb-1">Profil Ağırlığı</div>
            <div className="text-lg font-black text-white">{results.panelProfileWeight.toFixed(1)} <span className="text-[9px] text-slate-500 font-bold">kg</span></div>
            <div className="text-[7px] text-slate-600">{results.n_panel_studs} adet · {results.actualPitch.toFixed(0)} mm aralık</div>
          </div>
        </div>
      </div>
    </div>
  );
};
