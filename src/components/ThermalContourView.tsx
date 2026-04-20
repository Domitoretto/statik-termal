import React from "react";

/* ─────────────────────────────────────────────────────── */
/*  Termal Panel Kesit Isı Haritası                        */
/*  2D Gaussian thermal bridge spreading on Canvas         */
/*  Physics: ISO 6946 R-values, elliptic heat diffusion    */
/* ─────────────────────────────────────────────────────── */

// thermalRGB: p=0 → hot (red/orange), p=1 → cold (deep navy)
function thermalRGB(p: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0.00, [220,  20,   0]],
    [0.15, [255,  70,   0]],
    [0.30, [255, 160,   0]],
    [0.45, [240, 220,   0]],
    [0.58, [ 80, 200,  40]],
    [0.70, [  0, 180, 120]],
    [0.80, [  0, 110, 200]],
    [0.90, [ 20,  30, 160]],
    [1.00, [ 60,   0, 100]],
  ];
  const t = Math.max(0, Math.min(1, p));
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const f = (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      const a = stops[i - 1][1], b = stops[i][1];
      return [
        Math.round(a[0] + (b[0] - a[0]) * f),
        Math.round(a[1] + (b[1] - a[1]) * f),
        Math.round(a[2] + (b[2] - a[2]) * f),
      ];
    }
  }
  return stops[stops.length - 1][1];
}

function renderHeatmapCanvas(
  IMG_W: number, IMG_H: number,
  studFracs: number[],
  profilesHorizontal: boolean,
  T_foam: number, T_bridge: number,
  T_DATA_MIN: number, T_DATA_RANGE: number,
  sigma_span: number, sigma_thk: number,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = IMG_W; canvas.height = IMG_H;
  const ctx = canvas.getContext("2d")!;
  const id = ctx.createImageData(IMG_W, IMG_H);
  const T_excess = T_bridge - T_foam;

  for (let py = 0; py < IMG_H; py++) {
    for (let px = 0; px < IMG_W; px++) {
      const span_frac = profilesHorizontal ? py / (IMG_H - 1) : px / (IMG_W - 1);
      const thk_frac  = profilesHorizontal ? px / (IMG_W - 1) : py / (IMG_H - 1);
      const T_base = T_foam;
      let g = 0;
      for (const sf of studFracs) {
        const ds = span_frac - sf;
        const dt = thk_frac - 0.5;
        g += Math.exp(-(ds * ds) / (2 * sigma_span * sigma_span)
                      -(dt * dt) / (2 * sigma_thk  * sigma_thk));
      }
      g = Math.min(g, 1.0);
      const T_pix = T_base + T_excess * g;
      const p = 1 - Math.max(0, Math.min(1, (T_pix - T_DATA_MIN) / T_DATA_RANGE));
      const [r, gr, bl] = thermalRGB(p);
      const off = (py * IMG_W + px) * 4;
      id.data[off] = r; id.data[off + 1] = gr; id.data[off + 2] = bl; id.data[off + 3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.95);
}

export const ThermalContourView: React.FC<{
  design: any;
  selectedWall?: string;
  results?: any;
}> = ({ design, selectedWall = "leftSide", results }) => {
  const tHot   = design.ambientTemp ?? 40;
  const tCold  = design.targetTemp  ?? 0;
  const deltaT = Math.max(0.1, tHot - tCold);
  const thicknessMm = design.wallThickness || 80;
  const nStuds = Math.max(1, Math.min(results?.n_panel_studs || 5, 16));
  const pitch  = Math.round(results?.actualPitch) || 650;
  const bridgeLossRate = results?.totalHeatGain > 0
    ? ((results.lossCorners || 0) / results.totalHeatGain) * 100 : 0;

  const profilesHorizontal = selectedWall === "roof" || selectedWall === "floor";

  const WALL_LABELS: Record<string, string> = {
    leftSide: "Sol Yan", rightSide: "Sağ Yan",
    front: "Ön Duvar", back: "Arka Duvar",
    roof: "Tavan", floor: "Taban",
  };

  const k_ins = (() => {
    const mat = design.insulationMaterialId;
    return mat === "pir" ? 0.024 : mat === "xps" ? 0.034 : mat === "eps" ? 0.038 : 0.022;
  })();
  const k_metal = 50.0;
  const R_si = 0.13, R_se = 0.04;
  const thk = thicknessMm / 1000;
  const R_foam  = R_si + thk / k_ins   + R_se;
  const R_stud  = R_si + thk / k_metal + R_se;
  const T_foam   = tCold + deltaT * R_si / R_foam;
  const T_bridge = tCold + deltaT * R_si / R_stud;

  const studFracs = Array.from({ length: nStuds }, (_, i) => (i + 0.5) / nStuds);

  const sigma_span = 0.38 / Math.max(nStuds, 1);
  const sigma_thk  = 0.32;

  const T_DATA_MIN   = T_foam;
  const T_DATA_RANGE = Math.max(T_bridge - T_foam, 0.1);
  const tColStr = (T: number): string => {
    const p = 1 - Math.max(0, Math.min(1, (T - T_DATA_MIN) / T_DATA_RANGE));
    const [r, g, b] = thermalRGB(p);
    return `rgb(${r},${g},${b})`;
  };

  const SVG_W = 700, SVG_H = 195;
  const LEG_W = 54;
  const VIZ_X = LEG_W + 6;
  const VIZ_W = SVG_W - VIZ_X - 4;
  const VIZ_H = SVG_H - 22;
  const SKIN_W = 10;
  const INNER_W = VIZ_W - 2 * SKIN_W;

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [imgSrc, setImgSrc] = React.useState("");

  React.useEffect(() => {
    const src = renderHeatmapCanvas(
      512, 256,
      studFracs, profilesHorizontal,
      T_foam, T_bridge,
      T_DATA_MIN, T_DATA_RANGE,
      sigma_span, sigma_thk,
    );
    setImgSrc(src);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nStuds, profilesHorizontal, T_foam, T_bridge]);

  const N_LEG = 11;
  const legendItems = Array.from({ length: N_LEG }, (_, i) => {
    const p = i / (N_LEG - 1);
    const T = T_DATA_MIN + p * T_DATA_RANGE;
    return { T, color: tColStr(T), y: ((1 - p) * VIZ_H).toFixed(1) };
  });

  const N_ISO = 10;
  const isoLines: { x1: number; y1: number; x2: number; y2: number; T: number }[] = [];
  for (let li = 0; li < N_ISO; li++) {
    const T_iso = T_foam + ((T_bridge - T_foam) * (li + 1)) / (N_ISO + 1);
    const target = (T_iso - T_foam) / Math.max(T_bridge - T_foam, 1e-9);
    for (const sf of studFracs) {
      for (const side of [-1, 1]) {
        let lo = sf, hi = Math.max(0, Math.min(1, sf + side * 4 * sigma_span));
        const gLo = Math.exp(-((lo - sf) ** 2) / (2 * sigma_span ** 2));
        const gHi = Math.exp(-((hi - sf) ** 2) / (2 * sigma_span ** 2));
        if (gLo >= target && gHi <= target) {
          for (let it = 0; it < 24; it++) {
            const mid = (lo + hi) / 2;
            const gm  = Math.exp(-((mid - sf) ** 2) / (2 * sigma_span ** 2));
            if (gm > target) lo = mid; else hi = mid;
          }
          const s = (lo + hi) / 2;
          if (s >= 0 && s <= 1) {
            if (profilesHorizontal) {
              const y = s * VIZ_H;
              isoLines.push({ x1: VIZ_X + SKIN_W, y1: y, x2: VIZ_X + SKIN_W + INNER_W, y2: y, T: T_iso });
            } else {
              const x = VIZ_X + SKIN_W + s * INNER_W;
              isoLines.push({ x1: x, y1: 0, x2: x, y2: VIZ_H, T: T_iso });
            }
          }
        }
      }
    }
  }

  const hotColor  = "rgba(220,60,10,0.85)";
  const coldColor = "rgba(30,80,200,0.80)";

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H + 4}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="tcv-leg" x1="0" y1="0" x2="0" y2="1">
          {Array.from({ length: 11 }, (_, i) => (
            <stop key={i} offset={`${i * 10}%`}
              stopColor={tColStr(T_DATA_MIN + T_DATA_RANGE * (1 - i / 10))} />
          ))}
        </linearGradient>
        <clipPath id="tcv-clip">
          <rect x={VIZ_X + SKIN_W} y={0} width={INNER_W} height={VIZ_H} />
        </clipPath>
        <filter id="tcv-halo" x="-60%" y="-20%" width="220%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="tcv-skin" x="-100%" y="-5%" width="300%" height="110%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Renk skalası */}
      <rect x={2} y={0} width={12} height={VIZ_H} fill="url(#tcv-leg)" rx={2} />
      {legendItems.map((item, i) => (
        <g key={i}>
          <line x1={14} y1={item.y} x2={20} y2={item.y} stroke={item.color} strokeWidth={0.9} />
          <text x={22} y={Number(item.y) + 3.8}
            fill={item.color} fontSize={6.8} fontFamily="monospace" fontWeight="bold">
            {item.T.toFixed(1)}
          </text>
        </g>
      ))}
      <text x={2} y={VIZ_H + 13} fill="#475569" fontSize={6.2} fontFamily="monospace">Temperature [°C]</text>
      <text x={2} y={VIZ_H + 21} fill="#334155" fontSize={5.5} fontFamily="monospace">
        ΔT = {Math.abs(deltaT).toFixed(0)} K
      </text>

      {/* Arka plan */}
      <rect x={VIZ_X} y={0} width={VIZ_W} height={VIZ_H} fill="#010812" rx={2} />

      {/* 2D Gaussian heatmap */}
      {imgSrc && (
        <image href={imgSrc}
          x={VIZ_X + SKIN_W} y={0} width={INNER_W} height={VIZ_H}
          preserveAspectRatio="none" />
      )}

      {/* İzoterm konturlar */}
      {isoLines.map((ln, i) => (
        <line key={i}
          x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2}
          stroke="rgba(255,255,255,0.20)" strokeWidth={0.7}
          strokeDasharray="3,2"
          clipPath="url(#tcv-clip)" />
      ))}

      {/* Dış kaplama */}
      <rect x={VIZ_X} y={0} width={SKIN_W} height={VIZ_H}
        fill="#1a2035" stroke="rgba(80,100,130,0.5)" strokeWidth={0.5} />
      <rect x={VIZ_X + SKIN_W - 2} y={0} width={4} height={VIZ_H}
        fill="rgba(220,80,10,0.50)" filter="url(#tcv-skin)" />

      {/* İç kaplama + profil ısı sızması */}
      <rect x={VIZ_X + VIZ_W - SKIN_W} y={0} width={SKIN_W} height={VIZ_H}
        fill="#1a2035" stroke="rgba(80,100,130,0.5)" strokeWidth={0.5} />
      {studFracs.map((sf, i) => {
        const bw = 0.052 * (profilesHorizontal ? VIZ_H : INNER_W);
        return profilesHorizontal ? (
          <rect key={i}
            x={VIZ_X + VIZ_W - SKIN_W - 1} y={sf * VIZ_H - bw / 2 - 2}
            width={SKIN_W + 1} height={bw + 4}
            fill="rgba(255,100,20,0.55)" filter="url(#tcv-halo)" />
        ) : (
          <rect key={i}
            x={VIZ_X + SKIN_W + sf * INNER_W - bw / 2 - 2}
            y={VIZ_H - SKIN_W - 1}
            width={bw + 4} height={SKIN_W + 1}
            fill="rgba(255,100,20,0.55)" filter="url(#tcv-halo)" />
        );
      })}

      {/* Çerçeve */}
      <rect x={VIZ_X} y={0} width={VIZ_W} height={VIZ_H}
        fill="none" stroke="#1e3a5f" strokeWidth={1} rx={2} />

      {/* Yüzey etiketleri */}
      <text x={VIZ_X + 4} y={VIZ_H - 5}
        fill={hotColor} fontSize={7} fontFamily="monospace" fontWeight="bold">
        DIŞ {tHot}°C
      </text>
      <text x={VIZ_X + VIZ_W - 5} y={VIZ_H - 5}
        fill={coldColor} fontSize={7} fontFamily="monospace" fontWeight="bold" textAnchor="end">
        İÇ {tCold}°C
      </text>

      {/* Sağ üst bilgi kutusu */}
      <g>
        <rect x={VIZ_X + VIZ_W - 114} y={3} width={110} height={32} rx={3}
          fill="rgba(1,8,18,0.88)" stroke="#1e3a5f" strokeWidth={0.6} />
        <circle cx={VIZ_X + VIZ_W - 105} cy={14} r={3.5}
          fill={tColStr(T_bridge)} opacity={0.95} />
        <text x={VIZ_X + VIZ_W - 98} y={17.5}
          fill={tColStr(T_bridge)} fontSize={7} fontFamily="monospace" fontWeight="bold">
          Profil: {T_bridge.toFixed(1)}°C
        </text>
        <circle cx={VIZ_X + VIZ_W - 105} cy={27} r={3.5}
          fill={tColStr(T_foam)} opacity={0.95} />
        <text x={VIZ_X + VIZ_W - 98} y={30.5}
          fill={tColStr(T_foam)} fontSize={7} fontFamily="monospace" fontWeight="bold">
          Yalıtım: {T_foam.toFixed(1)}°C
        </text>
      </g>

      {/* Sol üst başlık */}
      <text x={VIZ_X + SKIN_W + 4} y={11}
        fill="rgba(255,255,255,0.32)" fontSize={6} fontFamily="monospace">
        Kesit Isı Haritası · {profilesHorizontal ? "Yatay Profil" : "Dikey Profil"}
      </text>

      {/* Alt bilgi */}
      <text x={VIZ_X + VIZ_W / 2} y={SVG_H + 2}
        fill="#475569" fontSize={6.5} fontFamily="monospace" textAnchor="middle">
        {WALL_LABELS[selectedWall as string] ?? selectedWall}
        {" · "}{nStuds} profil · {pitch} mm aralık
        {" · "}{thicknessMm} mm panel · k_ins={k_ins} W/mK
      </text>

      {/* Köprü kaybı rozeti */}
      {bridgeLossRate > 0 && (
        <g>
          <rect x={VIZ_X + SKIN_W + 4} y={16} width={66} height={14} rx={3}
            fill="rgba(239,68,68,0.14)" stroke="rgba(239,68,68,0.38)" strokeWidth={0.7} />
          <text x={VIZ_X + SKIN_W + 37} y={26} textAnchor="middle"
            fill="#f87171" fontSize={7} fontFamily="monospace" fontWeight="bold">
            Köprü {bridgeLossRate.toFixed(1)}%
          </text>
        </g>
      )}
    </svg>
  );

  void canvasRef;
};
