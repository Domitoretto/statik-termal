/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { 
  Thermometer, 
  Box, 
  Wind, 
  Weight, 
  Settings, 
  Download, 
  ChevronRight, 
  Info,
  Maximize2,
  Activity,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Layout,
  LayoutGrid,
  FileText,
  Cpu,
  ChevronDown
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Grid, Center } from "@react-three/drei";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { MATERIALS, INSULATION_MATERIALS, PROFILE_MATERIALS, CARGO_PROFILES, PSI_VALUES, REFRIGERANT_PROPERTIES } from "./constants";
import { CalculationResults, WallLayer } from "./types";
import { cn } from "./lib/utils";
import { useDesignStore } from "./store";
import { StaticAnalysisPanel } from "./components/StaticAnalysisPanel";
import { ThermalAnalysisPanel } from "./components/ThermalAnalysisPanel";
import { ThermalControlPanel } from "./components/ThermalControlPanel";
import { AssemblyPanel } from "./components/AssemblyPanel";
import { ReportPage } from "./pages/ReportPage";

// --- 3D Components ---
function BoxMesh({ design, results, selectedWall, activeTab }: { design: any; results: any; selectedWall: string; activeTab: "thermal" | "static" | "assembly" }) {
  const { length, width, height } = design.dimensions;
  const l = length / 1000;
  const w = width / 1000;
  const h = height / 1000;
  const pw = design.profileWidth / 1000;
  const pd = design.profileDepth / 1000;

  const isSelected = (wall: string) => selectedWall === wall;

  const getStuds = (len: number, config: any, isSideWall: boolean = false) => {
    const positions = [];
    // If it's a side wall, we reduce the available length by 2 * profileDepth to account for front/back corner profiles
    const effectiveLen = isSideWall ? len - 2 * design.profileDepth : len;
    const n = config.pitchMode === 'count' ? config.profileCount : Math.max(1, Math.round((effectiveLen - design.profileWidth) / config.profilePitch)) + 1;
    const actualPitch = n > 1 ? (effectiveLen - design.profileWidth) / (n - 1) : 0;
    
    const offset = isSideWall ? design.profileDepth : 0;
    
    for (let i = 0; i < n; i++) {
      // Position relative to the center of the effective length, then shifted by offset
      const posInEffective = i * actualPitch - (effectiveLen - design.profileWidth) / 2;
      positions.push(posInEffective / 1000);
    }
    return { positions, n, actualPitch, offset: offset / 1000 };
  };

  const leftStuds = useMemo(() => getStuds(length, design.wallConfigs.leftSide, true), [length, design.wallConfigs.leftSide, design.profileWidth, design.profileDepth]);
  const rightStuds = useMemo(() => getStuds(length, design.wallConfigs.rightSide, true), [length, design.wallConfigs.rightSide, design.profileWidth, design.profileDepth]);
  const frontStuds = useMemo(() => getStuds(width, design.wallConfigs.front), [width, design.wallConfigs.front, design.profileWidth]);
  const backStuds = useMemo(() => getStuds(width, design.wallConfigs.back), [width, design.wallConfigs.back, design.profileWidth]);
  
  const roofStuds = useMemo(() => getStuds(length, design.wallConfigs.roof), [length, design.wallConfigs.roof, design.profileWidth]);
  const floorStuds = useMemo(() => getStuds(length, design.wallConfigs.floor), [length, design.wallConfigs.floor, design.profileWidth]);

  const roofLongStuds = useMemo(() => {
    const config = design.wallConfigs.roof;
    const positions = [];
    const n = config.longitudinalPitchMode === 'count' ? config.longitudinalCount : Math.max(1, Math.round((width - design.profileWidth) / config.longitudinalPitch)) + 1;
    const actualPitch = n > 1 ? (width - design.profileWidth) / (n - 1) : 0;
    for (let i = 0; i < n; i++) {
      positions.push((i * actualPitch - (width - design.profileWidth) / 2) / 1000);
    }
    return { positions, n, actualPitch };
  }, [width, design.wallConfigs.roof, design.profileWidth]);

  const floorLongStuds = useMemo(() => {
    const config = design.wallConfigs.floor;
    const positions = [];
    const n = config.longitudinalPitchMode === 'count' ? config.longitudinalCount : Math.max(1, Math.round((width - design.profileWidth) / config.longitudinalPitch)) + 1;
    const actualPitch = n > 1 ? (width - design.profileWidth) / (n - 1) : 0;
    for (let i = 0; i < n; i++) {
      positions.push((i * actualPitch - (width - design.profileWidth) / 2) / 1000);
    }
    return { positions, n, actualPitch };
  }, [width, design.wallConfigs.floor, design.profileWidth]);

  const profileColor = design.profileMaterialId === 'aluminum' ? "#cbd5e1" : "#94a3b8";
  const profileEmissive = design.profileMaterialId === 'aluminum' ? "#94a3b8" : "#1e293b";

  const Profile = ({ args, position, rotation, wall, isLongitudinal = false }: { args: any, position: any, rotation?: any, wall: string, isLongitudinal?: boolean }) => {
    const selected = isSelected(wall);
    // Only scale the cross-section dimensions, not the length
    // We assume the largest dimension is the length
    const finalArgs = selected ? args.map((a: number, i: number) => {
      const isLength = a === Math.max(...args);
      return isLength ? a : a * 1.1; // Scale thickness by 10%
    }) : args;
    
    return (
      <mesh position={position} rotation={rotation}>
        <boxGeometry args={finalArgs} />
        <meshStandardMaterial 
          color={selected ? "#60a5fa" : profileColor} 
          emissive={selected ? "#1d4ed8" : profileEmissive}
          emissiveIntensity={selected ? 1.5 : 0}
          metalness={0.8} 
          roughness={0.2}
          polygonOffset={selected}
          polygonOffsetFactor={selected ? -2 : 0}
          polygonOffsetUnits={selected ? -2 : 0}
        />
      </mesh>
    );
  };

  return (
    <group>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      {/* Wall Highlights */}
      {isSelected("leftSide") && (
        <mesh position={[0, h / 2, w / 2 + 0.01]} rotation={[0, 0, 0]}>
          <planeGeometry args={[l, h]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} side={2} />
        </mesh>
      )}
      {isSelected("rightSide") && (
        <mesh position={[0, h / 2, -w / 2 - 0.01]} rotation={[0, 0, 0]}>
          <planeGeometry args={[l, h]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} side={2} />
        </mesh>
      )}
      {isSelected("roof") && (
        <mesh position={[0, h + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[l, w]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} side={2} />
        </mesh>
      )}
      {isSelected("front") && (
        <mesh position={[l / 2 + 0.01, h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} side={2} />
        </mesh>
      )}
      {isSelected("back") && (
        <mesh position={[-l / 2 - 0.01, h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} side={2} />
        </mesh>
      )}
      {isSelected("floor") && (
        <mesh position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[l, w]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} side={2} />
        </mesh>
      )}

      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[l, h, w]} />
        <meshBasicMaterial color="#475569" wireframe />
      </mesh>

      {/* Side Wall Framed (Left) */}
      <Profile wall="leftSide" args={[l - 2 * pd, pw, pd]} position={[0, pw / 2, w / 2 - pd / 2]} />
      <Profile wall="leftSide" args={[l - 2 * pd, pw, pd]} position={[0, h - pw / 2, w / 2 - pd / 2]} />
      {leftStuds.positions.map((pos, i) => (
        <Profile key={`left-stud-${i}`} wall="leftSide" args={[pw, h - 2 * pw, pd]} position={[pos, h / 2, w / 2 - pd / 2]} />
      ))}

      {/* Side Wall Framed (Right) */}
      <Profile wall="rightSide" args={[l - 2 * pd, pw, pd]} position={[0, pw / 2, -w / 2 + pd / 2]} />
      <Profile wall="rightSide" args={[l - 2 * pd, pw, pd]} position={[0, h - pw / 2, -w / 2 + pd / 2]} />
      {rightStuds.positions.map((pos, i) => (
        <Profile key={`right-stud-${i}`} wall="rightSide" args={[pw, h - 2 * pw, pd]} position={[pos, h / 2, -w / 2 + pd / 2]} />
      ))}

      {/* Front Wall Framed */}
      <Profile wall="front" args={[pd, pw, w]} position={[l / 2 - pd / 2, pw / 2, 0]} />
      <Profile wall="front" args={[pd, pw, w]} position={[l / 2 - pd / 2, h - pw / 2, 0]} />
      {frontStuds.positions.map((pos, i) => (
        <Profile key={`front-stud-${i}`} wall="front" args={[pd, h - 2 * pw, pw]} position={[l / 2 - pd / 2, h / 2, pos]} />
      ))}

      {/* Back Wall Framed */}
      <Profile wall="back" args={[pd, pw, w]} position={[-l / 2 + pd / 2, pw / 2, 0]} />
      <Profile wall="back" args={[pd, pw, w]} position={[-l / 2 + pd / 2, h - pw / 2, 0]} />
      {backStuds.positions.map((pos, i) => (
        <Profile key={`back-stud-${i}`} wall="back" args={[pd, h - 2 * pw, pw]} position={[-l / 2 + pd / 2, h / 2, pos]} />
      ))}

      {/* Roof Framed */}
      <Profile wall="roof" args={[l, pd, pw]} position={[0, h - pd / 2, w / 2 - pw / 2]} />
      <Profile wall="roof" args={[l, pd, pw]} position={[0, h - pd / 2, -w / 2 + pw / 2]} />
      {roofStuds.positions.map((pos, i) => (
        <Profile key={`roof-trans-${i}`} wall="roof" args={[pw, pd, w - 2 * pw]} position={[pos, h - pd / 2, 0]} />
      ))}
      {roofLongStuds.positions.map((pos, i) => (
        (Math.abs(pos) < (w / 2 - pw / 2)) && (
          <Profile key={`roof-long-${i}`} wall="roof" args={[l - 2 * pw, pd, pw]} position={[0, h - pd / 2, pos]} />
        )
      ))}

      {/* Floor Framed */}
      <Profile wall="floor" args={[l, pd, pw]} position={[0, pd / 2, w / 2 - pw / 2]} />
      <Profile wall="floor" args={[l, pd, pw]} position={[0, pd / 2, -w / 2 + pw / 2]} />
      {floorStuds.positions.map((pos, i) => (
        <Profile key={`floor-trans-${i}`} wall="floor" args={[pw, pd, w - 2 * pw]} position={[pos, pd / 2, 0]} />
      ))}
      {floorLongStuds.positions.map((pos, i) => (
        (Math.abs(pos) < (w / 2 - pw / 2)) && (
          <Profile key={`floor-long-${i}`} wall="floor" args={[l - 2 * pw, pd, pw]} position={[0, pd / 2, pos]} />
        )
      ))}

      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[l + 0.2, 0.1, w + 0.2]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
}

// --- Main App Component ---
export default function App() {
  const { design, setDesign } = useDesignStore();
  const [activeTab, setActiveTab] = useState<"thermal" | "static" | "assembly">("static");
  const [navTab, setNavTab] = useState<"design" | "analysis" | "export">("design");
  const [selectedWall, setSelectedWall] = useState<"leftSide" | "rightSide" | "front" | "back" | "roof" | "floor">("leftSide");
  const [panelWeightMode, setPanelWeightMode] = useState<"total" | "profile">("total");
  const [deflectionMode, setDeflectionMode] = useState<"profile" | "composite">("composite");
  const [showReport, setShowReport] = useState(false);

  const selectedProfileMaterial = PROFILE_MATERIALS.find((m) => m.id === design.profileMaterialId) || PROFILE_MATERIALS[0];
  const selectedInsulationMaterial = INSULATION_MATERIALS.find((m) => m.id === design.insulationMaterialId) || INSULATION_MATERIALS[0];
  const selectedCargoProfile = (CARGO_PROFILES as any)[design.activeCargo] || CARGO_PROFILES.empty;

  // --- Calculations (V75 Engine) ---
  // ==================================================================
  // GLOBAL MODULE — Thermal + Base Calculations (selectedWall bağımsız)
  // ANSYS-Workbench tarzı: Geometry → Materials → Thermal pipeline
  // ==================================================================
  const globalCalc = useMemo(() => {
    const { 
      dimensions, insulationMaterialId, skinMaterialId, profileMaterialId,
      wallThickness, roofThickness, floorThickness,
      ambientTemp, targetTemp, ventilationRate, safetyFactor,
      wallConfigs,
      profileWidth, profileDepth, profileThickness,
      profileType, cornerType, activeCargo, cargoAmount,
    } = design;

    const L_m = dimensions.length / 1000;
    const W_m = dimensions.width / 1000;
    const H_m = dimensions.height / 1000;
    
    const th_wall = wallThickness / 1000;
    const th_roof = roofThickness / 1000;
    const th_floor = floorThickness / 1000;

    const insulationMat = MATERIALS.find(m => m.id === insulationMaterialId) || MATERIALS[0];
    const skinMat = MATERIALS.find(m => m.id === skinMaterialId) || MATERIALS[0];
    const profileMat = MATERIALS.find(m => m.id === profileMaterialId) || MATERIALS[0];

    const k_ins = insulationMat.kValue;
    const k_steel = profileMat.kValue;
    const E_STEEL = profileMaterialId === 'aluminum' ? 70000 : 210000;
    const YS = profileMaterialId === 'aluminum' ? 150 : 235;
    const R_surface = 0.17; 

    const cargo = (CARGO_PROFILES as any)[activeCargo];
    let cargoHeatPerUnit = cargo.heatPerUnit;
    if (activeCargo === 'produce') {
      cargoHeatPerUnit *= (design.cargoRespirationFactor || 1);
    } else if (activeCargo === 'chicks') {
      cargoHeatPerUnit *= (design.cargoMetabolicFactor || 1);
    }
    const internalHeatLoad = cargoAmount * cargoHeatPerUnit;
    const cargoWeight = cargoAmount * cargo.weightPerUnit;

    const pt = profileThickness;
    const pw = profileWidth;
    const pd = profileDepth;

    let Ix_stud = 0;
    if (profileType === 'box') {
      Ix_stud = (pw * Math.pow(pd, 3) / 12) - ((pw - 2 * pt) * Math.pow(pd - 2 * pt, 3) / 12);
    } else {
      Ix_stud = (pt * Math.pow(pd, 3) / 12) + 2 * (pw * Math.pow(pt, 3) / 12 + pw * pt * Math.pow(pd / 2 - pt / 2, 2));
    }

    const getCount = (len: number, pitch: number, width: number) => {
      const span = len * 1000 - width;
      return Math.max(1, Math.round(span / pitch)) + 1;
    };

    const L_side_m = (dimensions.length - 2 * pd) / 1000;
    const N_Left = wallConfigs.leftSide.pitchMode === 'count' ? wallConfigs.leftSide.profileCount : getCount(L_side_m, wallConfigs.leftSide.profilePitch, pw);
    const N_Right = wallConfigs.rightSide.pitchMode === 'count' ? wallConfigs.rightSide.profileCount : getCount(L_side_m, wallConfigs.rightSide.profilePitch, pw);
    const N_Front = wallConfigs.front.pitchMode === 'count' ? wallConfigs.front.profileCount : getCount(W_m, wallConfigs.front.profilePitch, pw);
    const N_Back = wallConfigs.back.pitchMode === 'count' ? wallConfigs.back.profileCount : getCount(W_m, wallConfigs.back.profilePitch, pw);
    const N_Roof = wallConfigs.roof.pitchMode === 'count' ? wallConfigs.roof.profileCount : getCount(L_m, wallConfigs.roof.profilePitch, pw);
    const N_Floor = wallConfigs.floor.pitchMode === 'count' ? wallConfigs.floor.profileCount : getCount(L_m, wallConfigs.floor.profilePitch, pw);
    
    const N_Roof_Long = wallConfigs.roof.longitudinalPitchMode === 'count' ? wallConfigs.roof.longitudinalCount || 5 : getCount(W_m, wallConfigs.roof.longitudinalPitch || 650, pw);
    const N_Floor_Long = wallConfigs.floor.longitudinalPitchMode === 'count' ? wallConfigs.floor.longitudinalCount || 5 : getCount(W_m, wallConfigs.floor.longitudinalPitch || 650, pw);

    const actualPitchLeft = N_Left > 1 ? (L_side_m * 1000 - pw) / (N_Left - 1) : (L_side_m * 1000);
    const actualPitchRight = N_Right > 1 ? (L_side_m * 1000 - pw) / (N_Right - 1) : (L_side_m * 1000);
    const actualPitchFront = N_Front > 1 ? (W_m * 1000 - pw) / (N_Front - 1) : (W_m * 1000);
    const actualPitchBack = N_Back > 1 ? (W_m * 1000 - pw) / (N_Back - 1) : (W_m * 1000);
    const actualPitchRoof = N_Roof > 1 ? (L_m * 1000 - pw) / (N_Roof - 1) : (L_m * 1000);
    const actualPitchFloor = N_Floor > 1 ? (L_m * 1000 - pw) / (N_Floor - 1) : (L_m * 1000);

    const cf = 0.25; 
    const sheet_thickness = 0.6;

    const sArea_m2 = (profileType === 'box' ? (pw * pd - (pw - 2 * pt) * (pd - 2 * pt)) : (pw * pt * 2 + (pd - 2 * pt) * pt)) / 1000000;
    const weightPerMeter = sArea_m2 * profileMat.density;

    const L_in = L_m - (2 * th_wall);
    const W_in = W_m - (2 * th_wall);
    const H_in = H_m - (th_roof + th_floor);

    const totalSteelLength = 
      (N_Left * H_in + 2 * L_m) + 
      (N_Right * H_in + 2 * L_m) + 
      (N_Front * H_in + 2 * W_m) + 
      (N_Back * H_in + 2 * W_m) + 
      (N_Roof * W_in + N_Roof_Long * L_in) + 
      (N_Floor * W_in + N_Floor_Long * L_in);
    const weightSteel = totalSteelLength * weightPerMeter;

    const dT = Math.abs(ambientTemp - targetTemp);
    
    // --- Advanced Thermal Bridge Analysis ---
    const calcWallLoss = (area_m2: number, thickness_m: number, k_val: number, n_studs: number, stud_width_mm: number, stud_height_m: number, n_long_studs: number = 0, long_stud_len_m: number = 0, hasFrame: boolean = true) => {
      if (thickness_m <= 0) return { total: 0, insulation: 0, bridge: 0 };
      const u_pu = 1 / (R_surface + (thickness_m / k_val));
      const u_stud = 1 / (R_surface + (thickness_m / k_steel));
      
      const a_stud_transverse = n_studs * (stud_width_mm / 1000) * stud_height_m;
      const a_stud_longitudinal = n_long_studs * (stud_width_mm / 1000) * long_stud_len_m;
      
      let a_frame = 0;
      if (hasFrame) {
        const perpendicularDim = area_m2 / stud_height_m;
        a_frame = 2 * (stud_width_mm / 1000) * perpendicularDim;
      }

      const a_stud_total = Math.min(area_m2, a_stud_transverse + a_stud_longitudinal + a_frame);
      const a_pu = Math.max(0, area_m2 - a_stud_total);
      
      const insulation = a_pu * u_pu * dT;
      const bridge = a_stud_total * u_stud * dT;
      return { total: insulation + bridge, insulation, bridge };
    };

    const leftLoss = calcWallLoss(L_m * H_m, th_wall, k_ins, N_Left, pw, H_m);
    const rightLoss = calcWallLoss(L_m * H_m, th_wall, k_ins, N_Right, pw, H_m);
    const frontLossW = calcWallLoss(W_m * H_m, th_wall, k_ins, N_Front, pw, H_m);
    const backLoss = calcWallLoss(W_m * H_m, th_wall, k_ins, N_Back, pw, H_m);
    const roofLossW = calcWallLoss(L_m * W_m, th_roof, k_ins, N_Roof, pw, W_m, N_Roof_Long, L_m, false); 
    const floorLossW = calcWallLoss(L_m * W_m, th_floor, k_ins, N_Floor, pw, W_m, N_Floor_Long, L_m, false); 

    const lossPanel = leftLoss.total + rightLoss.total + frontLossW.total + backLoss.total + roofLossW.total + floorLossW.total;
    const totalEdgeLength = (4 * L_m + 4 * W_m + 4 * H_m);
    const lossCorners = totalEdgeLength * (PSI_VALUES[cornerType] || 0.35) * dT;

    // --- Ventilation & Infiltration Heat Loads ---
    const internalVolCalc = Math.max(0, L_in * W_in * H_in);
    const ventFlowRate_m3s = (design.ventilationRate * internalVolCalc) / 3600;
    const cargoVentRate_m3s = (activeCargo === 'chicks' ? (design.cargoVentReq || 0) : 0) / 3600;
    const airFlowInfiltration_m3s = (design.airFlowRate || 0) * 0.05 / 3600;
    const totalVentRate_m3s = ventFlowRate_m3s + cargoVentRate_m3s + airFlowInfiltration_m3s;
    const ventilationHeatLoad = totalVentRate_m3s * 1.2 * 1006 * dT;
    const infiltrationLoad = internalVolCalc * 0.002 * 1.2 * 1006 * dT;

    const totalHeatGain = lossPanel + lossCorners + internalHeatLoad + ventilationHeatLoad + infiltrationLoad;

    // --- Roof/Floor total weights (for structural wall sagging) ---
    const roofWeightTotal = (L_m * W_m) * (th_roof / 1000) * insulationMat.density + 
                            (L_m * W_m) * 0.0006 * skinMat.density * 2 + 
                            ((N_Roof * W_in + N_Roof_Long * L_in) / 1000) * weightPerMeter;
    
    const floorWeightTotal = (L_m * W_m) * (th_floor / 1000) * insulationMat.density + 
                             (L_m * W_m) * 0.0006 * skinMat.density * 2 + 
                             ((N_Floor * W_in + N_Floor_Long * L_in) / 1000) * weightPerMeter;

    // --- COP & Refrigeration ---
    const refrigerantData: Record<string, { copFactor: number, capFactor: number, latentHeat: number }> = {
      'R407C': { copFactor: 1.0, capFactor: 1.0, latentHeat: 180 },
      'R404A': { copFactor: 0.85, capFactor: 1.25, latentHeat: 145 },
      'R134a': { copFactor: 1.15, capFactor: 0.75, latentHeat: 195 }
    };
    const gas = refrigerantData[design.refrigerant] || refrigerantData['R407C'];
    const T_evap_K = (design.evaporatorTemp || -10) + 273.15;
    const T_cond_K = (design.condenserTemp || 45) + 273.15;
    const dT_cycle = T_cond_K - T_evap_K;
    const copCarnot = dT_cycle > 0 ? T_evap_K / dT_cycle : 10;
    const eta_practical = 0.55;
    const copEstimated = Math.max(1.0, Math.min(8, copCarnot * eta_practical * gas.copFactor));
    const requiredCoolingCapacity = totalHeatGain * design.safetyFactor;
    const compressorPower = (requiredCoolingCapacity / 1000) / copEstimated;
    const refrigerantMassFlow = (requiredCoolingCapacity / 1000) / gas.latentHeat * 3600;

    // --- Global Weights ---
    const weightInsulation = ( (2*(L_m*H_m + W_m*H_m)) * th_wall + (L_m*W_m) * th_roof + (L_m*W_m) * th_floor ) * insulationMat.density;
    const w_skins = (2 * (L_m * H_m + W_m * H_m) + 2 * (L_m * W_m)) * 0.0006 * skinMat.density * 2;
    const emptyWeight = weightInsulation + w_skins + weightSteel;
    const totalSurfaceArea = (2 * (L_m * H_m + W_m * H_m) + 2 * L_m * W_m);

    // --- COG ---
    const cogX = L_m / 2;
    const cogY = W_m / 2;
    const totalWeight = emptyWeight + cargoWeight;
    const geometricCenterZ = H_m / 2;
    const cogZ = (geometricCenterZ * emptyWeight) / totalWeight;

    return {
      // Thermal results
      totalHeatGain, requiredCoolingCapacity, internalHeatLoad, copEstimated,
      compressorPower, refrigerantMassFlow, ventilationHeatLoad, infiltrationLoad,
      lossPanel, lossCorners, transmissionLoss: lossPanel + lossCorners,
      // Per-wall losses (for charts)
      sideLoss: { total: leftLoss.total + rightLoss.total, insulation: leftLoss.insulation + rightLoss.insulation, bridge: leftLoss.bridge + rightLoss.bridge },
      frontLoss: { total: frontLossW.total + backLoss.total, insulation: frontLossW.insulation + backLoss.insulation, bridge: frontLossW.bridge + backLoss.bridge },
      roofLoss: roofLossW, floorLoss: floorLossW,
      // Global weights & geometry
      emptyWeight, totalGrossWeight: emptyWeight + cargoWeight,
      internalVolume: Math.max(0, L_in * W_in * H_in),
      weightSteel, weightInsulation, weightSkins: w_skins,
      totalSteelLength, totalSurfaceArea,
      cogX, cogY, cogZ, cargoWeight,
      // Structural intermediates (consumed by panelCalc only)
      _s: {
        Ix_stud, pw, pd, pt, profileType, cf, sheet_thickness,
        N_Left, N_Right, N_Front, N_Back, N_Roof, N_Floor, N_Roof_Long, N_Floor_Long,
        actualPitchLeft, actualPitchRight, actualPitchFront, actualPitchBack, actualPitchRoof, actualPitchFloor,
        E_STEEL, YS, weightPerMeter,
        L_m, W_m, H_m, L_in, W_in, H_in,
        th_wall, th_roof, th_floor,
        roofWeightTotal, floorWeightTotal,
        insulationMat, skinMat,
        cargoWeight,
        wallLosses: { left: leftLoss, right: rightLoss, front: frontLossW, back: backLoss, roof: roofLossW, floor: floorLossW },
      }
    };
  }, [design]);

  // ==================================================================
  // PANEL MODULE — Panel-specific Structural Analysis (selectedWall)
  // ANSYS-Workbench tarzı: Structural Analysis module
  // ==================================================================
  const results = useMemo((): CalculationResults => {
    const {
      Ix_stud, pw, pd, pt, profileType, cf, sheet_thickness,
      N_Left, N_Right, N_Front, N_Back, N_Roof, N_Floor, N_Roof_Long, N_Floor_Long,
      actualPitchLeft, actualPitchRight, actualPitchFront, actualPitchBack, actualPitchRoof, actualPitchFloor,
      E_STEEL, YS, weightPerMeter,
      L_m, W_m, H_m, L_in, W_in, H_in,
      th_wall, th_roof, th_floor,
      roofWeightTotal, floorWeightTotal,
      insulationMat, skinMat,
      cargoWeight,
      wallLosses,
    } = globalCalc._s;

    const { windLoad, applySafetyLoad } = design;

    let currentActualPitch = actualPitchLeft;
    if (selectedWall === "rightSide") currentActualPitch = actualPitchRight;
    else if (selectedWall === "front") currentActualPitch = actualPitchFront;
    else if (selectedWall === "back") currentActualPitch = actualPitchBack;
    else if (selectedWall === "roof") currentActualPitch = actualPitchRoof;
    else if (selectedWall === "floor") currentActualPitch = actualPitchFloor;

    const q_wind_area = windLoad / 1000000;
    const q_stud = q_wind_area * currentActualPitch;

    // --- Single Panel Specifics ---
    let panelArea = 0;
    let panelLoss = 0;
    let panelInsulationLoss = 0;
    let panelBridgeLoss = 0;
    let panelHeight = H_m;
    let panelWidth = L_m;
    let n_panel_studs = N_Left;
    let current_thickness_mm = design.wallThickness;

    if (selectedWall === "leftSide") {
      panelArea = L_m * H_m;
      panelLoss = wallLosses.left.total;
      panelInsulationLoss = wallLosses.left.insulation;
      panelBridgeLoss = wallLosses.left.bridge;
      panelHeight = H_m;
      panelWidth = L_m;
      n_panel_studs = N_Left;
      current_thickness_mm = design.wallThickness;
    } else if (selectedWall === "rightSide") {
      panelArea = L_m * H_m;
      panelLoss = wallLosses.right.total;
      panelInsulationLoss = wallLosses.right.insulation;
      panelBridgeLoss = wallLosses.right.bridge;
      panelHeight = H_m;
      panelWidth = L_m;
      n_panel_studs = N_Right;
      current_thickness_mm = design.wallThickness;
    } else if (selectedWall === "front") {
      panelArea = W_m * H_m;
      panelLoss = wallLosses.front.total; 
      panelInsulationLoss = wallLosses.front.insulation;
      panelBridgeLoss = wallLosses.front.bridge;
      panelHeight = H_m;
      panelWidth = W_m;
      n_panel_studs = N_Front;
      current_thickness_mm = design.wallThickness;
    } else if (selectedWall === "back") {
      panelArea = W_m * H_m;
      panelLoss = wallLosses.back.total; 
      panelInsulationLoss = wallLosses.back.insulation;
      panelBridgeLoss = wallLosses.back.bridge;
      panelHeight = H_m;
      panelWidth = W_m;
      n_panel_studs = N_Back;
      current_thickness_mm = design.wallThickness;
    } else if (selectedWall === "roof") {
      panelArea = L_m * W_m;
      panelLoss = wallLosses.roof.total;
      panelInsulationLoss = wallLosses.roof.insulation;
      panelBridgeLoss = wallLosses.roof.bridge;
      panelHeight = W_m;
      panelWidth = L_m;
      n_panel_studs = N_Roof;
      current_thickness_mm = design.roofThickness;
    } else if (selectedWall === "floor") {
      panelArea = L_m * W_m;
      panelLoss = wallLosses.floor.total;
      panelInsulationLoss = wallLosses.floor.insulation;
      panelBridgeLoss = wallLosses.floor.bridge;
      panelHeight = W_m;
      panelWidth = L_m;
      n_panel_studs = N_Floor;
      current_thickness_mm = design.floorThickness;
    }

    const span_mm = panelHeight * 1000;
    const Ix_skins_panel = 2 * (currentActualPitch * sheet_thickness * Math.pow(current_thickness_mm / 2, 2));
    const I_eff_panel = Ix_stud + (Ix_skins_panel * cf);

    const I_to_use = deflectionMode === 'composite' ? I_eff_panel : Ix_stud;

    // Extreme fiber distance: composite → panel surface, stud-only → profile centroid
    const y_fiber = deflectionMode === 'composite' ? (current_thickness_mm / 2) : (pd / 2);

    let maxDeflection = (1 * q_stud * Math.pow(span_mm, 4)) / (384 * E_STEEL * I_to_use);
    let stress = ((q_stud * Math.pow(span_mm, 2) / 12) * y_fiber / I_to_use);

    if (applySafetyLoad) {
      const safetyLoadDeflection = (1000 * Math.pow(span_mm, 3)) / (48 * E_STEEL * I_to_use);
      const safetyLoadStress = (1000 * span_mm / 4) * y_fiber / I_to_use;
      maxDeflection += safetyLoadDeflection;
      stress += safetyLoadStress;
    }

    // --- Vertical Sagging Calculation ---
    const roofWeightTotalCalc = roofWeightTotal;
    const floorWeightTotalCalc = floorWeightTotal;

    // --- Matrix Frame Analysis (Grid Solver) ---
    const solveGrid = (nodes: {x: number, y: number}[], elements: {n1: number, n2: number, E: number, I: number, G: number, J: number}[], nodalLoads: number[], fixedDOFs: Set<number>) => {
      const numNodes = nodes.length;
      const numDOFs = numNodes * 3; 
      const K = Array.from({ length: numDOFs }, () => new Float64Array(numDOFs));
      const F = new Float64Array(numDOFs);

      elements.forEach(el => {
        const n1 = el.n1;
        const n2 = el.n2;
        const dx = nodes[n2].x - nodes[n1].x;
        const dy = nodes[n2].y - nodes[n1].y;
        const L = Math.sqrt(dx*dx + dy*dy);
        if (L < 0.001) return;
        const c = dx / L;
        const s = dy / L;

        const kLocal = [
          [12*el.E*el.I/Math.pow(L,3), 0, 6*el.E*el.I/Math.pow(L,2), -12*el.E*el.I/Math.pow(L,3), 0, 6*el.E*el.I/Math.pow(L,2)],
          [0, el.G*el.J/L, 0, 0, -el.G*el.J/L, 0],
          [6*el.E*el.I/Math.pow(L,2), 0, 4*el.E*el.I/L, -6*el.E*el.I/Math.pow(L,2), 0, 2*el.E*el.I/L],
          [-12*el.E*el.I/Math.pow(L,3), 0, -6*el.E*el.I/Math.pow(L,2), 12*el.E*el.I/Math.pow(L,3), 0, -6*el.E*el.I/Math.pow(L,2)],
          [0, -el.G*el.J/L, 0, 0, el.G*el.J/L, 0],
          [6*el.E*el.I/Math.pow(L,2), 0, 2*el.E*el.I/L, -6*el.E*el.I/Math.pow(L,2), 0, 4*el.E*el.I/L]
        ];

        const T = [
          [1, 0, 0, 0, 0, 0],
          [0, c, s, 0, 0, 0],
          [0, -s, c, 0, 0, 0],
          [0, 0, 0, 1, 0, 0],
          [0, 0, 0, 0, c, s],
          [0, 0, 0, 0, -s, c]
        ];

        const kGlobal = Array.from({ length: 6 }, () => new Float64Array(6));
        for (let i = 0; i < 6; i++) {
          for (let j = 0; j < 6; j++) {
            for (let m = 0; m < 6; m++) {
              for (let n = 0; n < 6; n++) {
                kGlobal[i][j] += T[m][i] * kLocal[m][n] * T[n][j];
              }
            }
          }
        }

        const dofs = [n1*3, n1*3+1, n1*3+2, n2*3, n2*3+1, n2*3+2];
        for (let i = 0; i < 6; i++) {
          for (let j = 0; j < 6; j++) {
            K[dofs[i]][dofs[j]] += kGlobal[i][j];
          }
        }
      });

      for (let i = 0; i < numDOFs; i++) F[i] = nodalLoads[i] || 0;

      const penalty = 1e12;
      fixedDOFs.forEach(dof => {
        K[dof][dof] = penalty;
        F[dof] = 0;
      });

      const n = numDOFs;
      for (let i = 0; i < n; i++) {
        let max = Math.abs(K[i][i]);
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
          if (Math.abs(K[k][i]) > max) {
            max = Math.abs(K[k][i]);
            maxRow = k;
          }
        }
        const tempK = K[maxRow]; K[maxRow] = K[i]; K[i] = tempK;
        const tempF = F[maxRow]; F[maxRow] = F[i]; F[i] = tempF;

        if (Math.abs(K[i][i]) < 1e-12) continue;

        for (let k = i + 1; k < n; k++) {
          const factor = K[k][i] / K[i][i];
          for (let j = i; j < n; j++) {
            K[k][j] -= factor * K[i][j];
          }
          F[k] -= factor * F[i];
        }
      }

      const u = new Float64Array(n);
      for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) sum += K[i][j] * u[j];
        u[i] = (F[i] - sum) / K[i][i];
      }
      return u;
    };

    let maxVerticalDeflection = 0;
    let verticalStress = 0;
    let saggingSpan = 0;
    let loadBreakdown = { dead: 0, live: 0, profiles: 0 };

    if (selectedWall === "roof" || selectedWall === "floor") {
      const isRoof = selectedWall === "roof";
      
      const deadLoadUnit = ( (isRoof ? th_roof / 1000 : th_floor / 1000) * insulationMat.density + 0.0006 * skinMat.density * 2 ) * 9.81;
      loadBreakdown.dead = deadLoadUnit * (L_m * W_m) / 9.81;

      const liveLoadUnit = isRoof ? 0 : (cargoWeight * 9.81) / (L_m * W_m);
      loadBreakdown.live = isRoof ? 0 : cargoWeight;

      const totalProfileLengthM = (isRoof ? N_Roof * W_in + N_Roof_Long * L_in : N_Floor * W_in + N_Floor_Long * L_in) / 1000;
      loadBreakdown.profiles = totalProfileLengthM * weightPerMeter;

      const totalAreaLoad = deadLoadUnit + liveLoadUnit;
      saggingSpan = W_m * 1000;
      
      const xPosSet = new Set<number>([0, L_m * 1000]);
      const nX_profs = isRoof ? N_Roof : N_Floor;
      const pitchX_profs = isRoof ? actualPitchRoof : actualPitchFloor;
      for (let i = 0; i < nX_profs; i++) xPosSet.add(Math.min(L_m * 1000, i * pitchX_profs));
      const xPos = Array.from(xPosSet).sort((a, b) => a - b);

      const yPosSet = new Set<number>([0, W_m * 1000]);
      const nY_profs = isRoof ? N_Roof_Long : N_Floor_Long;
      const pitchY_profs = nY_profs > 1 ? (W_m * 1000 - pw) / (nY_profs - 1) : 0;
      for (let i = 0; i < nY_profs; i++) yPosSet.add(Math.min(W_m * 1000, i * pitchY_profs));
      const yPos = Array.from(yPosSet).sort((a, b) => a - b);

      const nodes: {x: number, y: number}[] = [];
      for (let j = 0; j < yPos.length; j++) {
        for (let i = 0; i < xPos.length; i++) {
          nodes.push({ x: xPos[i], y: yPos[j] });
        }
      }

      const elements: {n1: number, n2: number, E: number, I: number, G: number, J: number}[] = [];
      const G = E_STEEL / (2 * (1 + 0.3));
      
      const isOnProfileX = (y: number) => {
        const nY = isRoof ? N_Roof_Long : N_Floor_Long;
        const pitchY = nY > 1 ? (W_m * 1000 - pw) / (nY - 1) : 0;
        for (let i = 0; i < nY; i++) if (Math.abs(y - i * pitchY) < 5) return true;
        return false;
      };
      const isOnProfileY = (x: number) => {
        const nX = isRoof ? N_Roof : N_Floor;
        const pitchX = isRoof ? actualPitchRoof : actualPitchFloor;
        for (let i = 0; i < nX; i++) if (Math.abs(x - i * pitchX) < 5) return true;
        return false;
      };

      // Transverse elements (along Y)
      for (let i = 0; i < xPos.length; i++) {
        const tributaryWidthX = (i === 0 ? xPos[i+1]-xPos[i] : i === xPos.length-1 ? xPos[i]-xPos[i-1] : (xPos[i+1]-xPos[i-1])) / 2;
        const I_skin = deflectionMode === 'composite' ? 2 * (tributaryWidthX * 0.6 * Math.pow(current_thickness_mm / 2, 2)) * cf : 10;
        for (let j = 0; j < yPos.length - 1; j++) {
          const hasProfile = isOnProfileY(xPos[i]);
          elements.push({ 
            n1: j * xPos.length + i, 
            n2: (j + 1) * xPos.length + i, 
            E: E_STEEL, 
            I: I_skin + (hasProfile ? Ix_stud : 0), 
            G, 
            J: (hasProfile ? Ix_stud : I_skin) * 0.8 
          });
        }
      }
      // Longitudinal elements (along X)
      for (let j = 0; j < yPos.length; j++) {
        const tributaryWidthY = (j === 0 ? yPos[j+1]-yPos[j] : j === yPos.length-1 ? yPos[j]-yPos[j-1] : (yPos[j+1]-yPos[j-1])) / 2;
        const I_skin = deflectionMode === 'composite' ? 2 * (tributaryWidthY * 0.6 * Math.pow(current_thickness_mm / 2, 2)) * cf : 10;
        for (let i = 0; i < xPos.length - 1; i++) {
          const hasProfile = isOnProfileX(yPos[j]);
          elements.push({ 
            n1: j * xPos.length + i, 
            n2: j * xPos.length + i + 1, 
            E: E_STEEL, 
            I: I_skin + (hasProfile ? Ix_stud : 0), 
            G, 
            J: (hasProfile ? Ix_stud : I_skin) * 0.8 
          });
        }
      }

      const nodalLoads = new Float64Array(nodes.length * 3);
      const fixedDOFs = new Set<number>();

      let centerNodeIdx = -1;
      let minCenterDist = Infinity;
      const midX = (L_m * 1000) / 2;
      const midY = (W_m * 1000) / 2;

      for (let j = 0; j < yPos.length; j++) {
        for (let i = 0; i < xPos.length; i++) {
          const idx = j * xPos.length + i;
          const dx = (i === 0 ? xPos[i+1]-xPos[i] : i === xPos.length-1 ? xPos[i]-xPos[i-1] : (xPos[i+1]-xPos[i-1])) / 2;
          const dy = (j === 0 ? yPos[j+1]-yPos[j] : j === yPos.length-1 ? yPos[j]-yPos[j-1] : (yPos[j+1]-yPos[j-1])) / 2;
          
          nodalLoads[idx * 3] = -totalAreaLoad * (dx * dy / 1e6); 
          
          let profileWeightNodal = 0;
          if (isOnProfileY(xPos[i])) {
            profileWeightNodal += dy * weightPerMeter * 9.81 / 1000;
          }
          if (isOnProfileX(yPos[j])) {
            profileWeightNodal += dx * weightPerMeter * 9.81 / 1000;
          }
          nodalLoads[idx * 3] -= profileWeightNodal;

          const dist = Math.sqrt(Math.pow(nodes[idx].x - midX, 2) + Math.pow(nodes[idx].y - midY, 2));
          if (dist < minCenterDist) {
            minCenterDist = dist;
            centerNodeIdx = idx;
          }

          if (i === 0 || i === xPos.length - 1 || j === 0 || j === yPos.length - 1) {
            fixedDOFs.add(idx * 3);
          }
        }
      }

      if (design.applySafetyLoad && centerNodeIdx !== -1) {
        nodalLoads[centerNodeIdx * 3] -= 1000;
      }

      const u = solveGrid(nodes, elements, Array.from(nodalLoads), fixedDOFs);
      let maxDisp = 0;
      for (let i = 0; i < nodes.length; i++) maxDisp = Math.max(maxDisp, Math.abs(u[i * 3]));
      maxVerticalDeflection = maxDisp;
      
      let maxStress = 0;
      elements.forEach(el => {
        const n1 = el.n1; const n2 = el.n2;
        const dx = nodes[n2].x - nodes[n1].x;
        const dy = nodes[n2].y - nodes[n1].y;
        const L = Math.sqrt(dx*dx + dy*dy);
        const c = dx / L; const s = dy / L;
        const t1_bending = -s * u[n1*3+1] + c * u[n1*3+2];
        const t2_bending = -s * u[n2*3+1] + c * u[n2*3+2];
        const w1 = u[n1*3]; const w2 = u[n2*3];
        const m1 = Math.abs((el.E * el.I / L) * (4*t1_bending + 2*t2_bending - 6*(w2-w1)/L));
        const m2 = Math.abs((el.E * el.I / L) * (2*t1_bending + 4*t2_bending - 6*(w2-w1)/L));
        const moment = Math.max(m1, m2);
        const stressEl = (moment * (current_thickness_mm / 2)) / el.I;
        maxStress = Math.max(maxStress, stressEl);
      });
      verticalStress = maxStress;
    } else {
      // Side/Front/Back Walls: Sagging of Top Rail between Studs
      const isSide = selectedWall === "leftSide" || selectedWall === "rightSide";
      const wallArea = isSide ? L_m * H_m : W_m * H_m;
      const wallLength = isSide ? L_m : W_m;
      
      loadBreakdown.dead = (wallArea * (th_wall / 1000) * insulationMat.density + wallArea * 0.0006 * skinMat.density * 2);
      
      const roofWeight = (L_m * W_m) * (th_roof / 1000) * insulationMat.density + (L_m * W_m) * 0.0006 * skinMat.density * 2;
      const roofProfiles = ((N_Roof * W_in + N_Roof_Long * L_in) / 1000) * weightPerMeter;
      const totalRoofWeight = roofWeight + roofProfiles;
      
      const perimeter = 2 * L_m + 2 * W_m;
      loadBreakdown.live = (totalRoofWeight * wallLength) / perimeter;
      
      const n_studs = isSide ? (selectedWall === "leftSide" ? N_Left : N_Right) : (selectedWall === "front" ? N_Front : N_Back);
      loadBreakdown.profiles = (n_studs * (H_in / 1000) + 2 * wallLength) * weightPerMeter;

      const loadOnTopRail = (totalRoofWeight * 9.81) / perimeter;
      const q_sagging = loadOnTopRail / 1000;
      saggingSpan = currentActualPitch;

      const Ix_skins_rail = 2 * (saggingSpan * 0.6 * Math.pow(current_thickness_mm / 2, 2));
      const I_eff_rail = deflectionMode === 'composite' ? Ix_stud + (Ix_skins_rail * cf) : Ix_stud;
      const y_fiber_rail = deflectionMode === 'composite' ? (current_thickness_mm / 2) : (pd / 2);

      const safetyLoadDeflection = design.applySafetyLoad ? (1000 * Math.pow(saggingSpan, 3)) / (48 * E_STEEL * I_eff_rail) : 0;
      const safetyLoadStress = design.applySafetyLoad ? (1000 * saggingSpan / 4) * y_fiber_rail / I_eff_rail : 0;

      maxVerticalDeflection = (5 * q_sagging * Math.pow(saggingSpan, 4)) / (384 * E_STEEL * I_eff_rail) + safetyLoadDeflection;
      verticalStress = (q_sagging * Math.pow(saggingSpan, 2) / 8) * y_fiber_rail / I_eff_rail + safetyLoadStress;
    }

    const fos = YS / Math.max(0.1, Math.max(stress, verticalStress));

    // Panel Specific Weights
    let panelProfileWeight = 0;
    let panelInsulationWeight = 0;
    let panelSkinWeight = 0;

    if (selectedWall === "leftSide") {
      panelProfileWeight = (N_Left * H_in + 2 * L_m) * weightPerMeter;
      panelInsulationWeight = (L_m * H_m) * th_wall * insulationMat.density;
      panelSkinWeight = (L_m * H_m) * 0.0006 * skinMat.density * 2;
    } else if (selectedWall === "rightSide") {
      panelProfileWeight = (N_Right * H_in + 2 * L_m) * weightPerMeter;
      panelInsulationWeight = (L_m * H_m) * th_wall * insulationMat.density;
      panelSkinWeight = (L_m * H_m) * 0.0006 * skinMat.density * 2;
    } else if (selectedWall === "front") {
      panelProfileWeight = (N_Front * H_in + 2 * W_m) * weightPerMeter;
      panelInsulationWeight = (W_m * H_m) * th_wall * insulationMat.density;
      panelSkinWeight = (W_m * H_m) * 0.0006 * skinMat.density * 2;
    } else if (selectedWall === "back") {
      panelProfileWeight = (N_Back * H_in + 2 * W_m) * weightPerMeter;
      panelInsulationWeight = (W_m * H_m) * th_wall * insulationMat.density;
      panelSkinWeight = (W_m * H_m) * 0.0006 * skinMat.density * 2;
    } else if (selectedWall === "roof") {
      panelProfileWeight = (N_Roof * W_in + N_Roof_Long * L_in + 2 * L_m + 2 * W_m) * weightPerMeter;
      panelInsulationWeight = (L_m * W_m) * th_roof * insulationMat.density;
      panelSkinWeight = (L_m * W_m) * 0.0006 * skinMat.density * 2;
    } else if (selectedWall === "floor") {
      panelProfileWeight = (N_Floor * W_in + N_Floor_Long * L_in + 2 * L_m + 2 * W_m) * weightPerMeter;
      panelInsulationWeight = (L_m * W_m) * th_floor * insulationMat.density;
      panelSkinWeight = (L_m * W_m) * 0.0006 * skinMat.density * 2;
    }

    const panelTotalUnitWeight = (panelProfileWeight + panelInsulationWeight + panelSkinWeight) / panelArea;
    const panelProfileUnitWeight = panelProfileWeight / panelArea;
    const panelTotalWeight = panelProfileWeight + panelInsulationWeight + panelSkinWeight;

    // Spread global thermal results + add panel-specific structural results
    const { _s, ...globalResults } = globalCalc;

    return {
      ...globalResults,
      maxDeflection,
      stress,
      I_eff: I_eff_panel,
      actualPitch: currentActualPitch,
      isSafe: fos >= 1.5 && maxDeflection < (span_mm / 250) && maxVerticalDeflection < (saggingSpan / 250),
      panelLoss,
      panelArea,
      panelHeight,
      panelWidth,
      n_panel_studs,
      panelInsulationLoss,
      panelBridgeLoss,
      panelTotalUnitWeight,
      panelProfileUnitWeight,
      panelTotalWeight,
      panelProfileWeight,
      maxVerticalDeflection,
      verticalStress,
      saggingSpan,
      loadBreakdown,
      fos
    };
  }, [globalCalc, selectedWall, deflectionMode]);

  const generatePDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, M = 14;
    const contentW = W - 2 * M;
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
    const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    const ins = INSULATION_MATERIALS.find(m => m.id === design.insulationMaterialId) || INSULATION_MATERIALS[0];
    const skin = MATERIALS.find(m => m.id === design.skinMaterialId) || MATERIALS[0];
    const profMat = PROFILE_MATERIALS.find(m => m.id === design.profileMaterialId) || PROFILE_MATERIALS[0];
    const cargo = (CARGO_PROFILES as any)[design.activeCargo];

    const C = {
      navy:   [15, 23, 42]   as [number,number,number],
      blue:   [29, 78, 216]  as [number,number,number],
      lblue:  [219, 234, 254] as [number,number,number],
      green:  [22, 163, 74]  as [number,number,number],
      lgreen: [220, 252, 231] as [number,number,number],
      red:    [220, 38, 38]  as [number,number,number],
      lred:   [254, 226, 226] as [number,number,number],
      amber:  [217, 119, 6]  as [number,number,number],
      lamber: [254, 243, 199] as [number,number,number],
      gray:   [100, 116, 139] as [number,number,number],
      lgray:  [248, 250, 252] as [number,number,number],
      white:  [255, 255, 255] as [number,number,number],
      text:   [15, 23, 42]   as [number,number,number],
      sub:    [100, 116, 139] as [number,number,number],
    };

    let y = 0;
    let pageNum = 1;

    const addPage = () => {
      doc.addPage();
      pageNum++;
      y = 18;
      doc.setFillColor(...C.navy);
      doc.rect(0, 0, 210, 10, "F");
      doc.setTextColor(...C.white);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.text("THERMO-STATIC BOX  |  TECHNICAL REPORT  |  V75 KERNEL", M, 6.5);
      doc.text(`Page ${pageNum}  |  ${dateStr}`, 210 - M, 6.5, { align: "right" });
      doc.setTextColor(...C.text);
    };

    const sectionHeader = (title: string, sub: string, color: [number,number,number] = C.blue, lightColor: [number,number,number] = C.lblue) => {
      if (y > 255) addPage();
      doc.setFillColor(...color);
      doc.rect(M, y, contentW, 8, "F");
      doc.setTextColor(...C.white);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(title, M + 3, y + 5.5);
      if (sub) {
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.text(sub, 210 - M - 2, y + 5.5, { align: "right" });
      }
      doc.setTextColor(...C.text);
      y += 11;
    };

    const kpiRow = (items: { label: string; value: string; unit?: string; color?: [number,number,number] }[], bgAlt = false) => {
      if (y > 262) addPage();
      const colW = contentW / items.length;
      items.forEach((item, i) => {
        const x0 = M + i * colW;
        doc.setFillColor(...(bgAlt && i % 2 === 1 ? C.lgray : C.white));
        doc.rect(x0, y, colW, 14, "F");
        doc.setDrawColor(220, 220, 230);
        doc.setLineWidth(0.2);
        doc.rect(x0, y, colW, 14, "S");
        doc.setTextColor(...C.sub);
        doc.setFontSize(5.5);
        doc.setFont("helvetica", "bold");
        doc.text(item.label.toUpperCase(), x0 + colW / 2, y + 4, { align: "center" });
        doc.setTextColor(...(item.color || C.navy));
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(item.value, x0 + colW / 2, y + 10, { align: "center" });
        if (item.unit) {
          doc.setFontSize(6);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...C.sub);
          doc.text(item.unit, x0 + colW / 2, y + 13.2, { align: "center" });
        }
      });
      y += 15;
    };

    const tableRow = (cols: string[], heights = 7, colWidths?: number[], rowBg?: [number,number,number], textColors?: ([number,number,number] | null)[]) => {
      if (y > 270) addPage();
      const widths = colWidths || cols.map(() => contentW / cols.length);
      let cx = M;
      cols.forEach((txt, i) => {
        const cw = widths[i];
        if (rowBg) { doc.setFillColor(...rowBg); doc.rect(cx, y, cw, heights, "F"); }
        doc.setDrawColor(220, 220, 230);
        doc.setLineWidth(0.15);
        doc.rect(cx, y, cw, heights, "S");
        const tc = textColors?.[i] || C.text;
        doc.setTextColor(...(tc as [number,number,number]));
        doc.setFontSize(7.5);
        doc.text(txt, cx + 2.5, y + heights / 2 + 1.5);
        cx += cw;
      });
      y += heights;
    };

    const tableHead = (cols: string[], colWidths?: number[]) => {
      tableRow(cols, 7, colWidths, C.navy, cols.map(() => C.white));
      doc.setFont("helvetica", "bold");
    };

    const divider = (gap = 3) => { y += gap; };

    const label = (txt: string, size = 7, color: [number,number,number] = C.sub) => {
      if (y > 275) addPage();
      doc.setFontSize(size);
      doc.setFont("helvetica", size > 8 ? "bold" : "normal");
      doc.setTextColor(...color);
      doc.text(txt, M, y);
      y += size * 0.45 + 2;
    };

    // ═══════════════════════════════════════════════════════════
    //  COVER PAGE
    // ═══════════════════════════════════════════════════════════
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, 210, 60, "F");
    doc.setFillColor(...C.blue);
    doc.rect(0, 60, 210, 2.5, "F");

    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("THERMO-STATIC BOX", M, 28);
    doc.setFontSize(22);
    doc.text("TECHNICAL ANALYSIS REPORT", M, 38);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("Thermal & Structural Performance Assessment  --  Auto-generated Report", M, 47);

    doc.setFillColor(...C.blue);
    doc.roundedRect(210 - M - 28, 16, 28, 10, 2, 2, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("V75 KERNEL", 210 - M - 14, 22.5, { align: "center" });

    y = 72;
    doc.setFillColor(...C.lgray);
    doc.rect(M, y, contentW, 44, "F");
    doc.setDrawColor(...C.lblue);
    doc.setLineWidth(0.3);
    doc.rect(M, y, contentW, 44, "S");

    const profileTypeLabel = design.profileType === "box" ? "Box Profile" : "C-Profile";
    const cornerTypeLabel  = design.cornerType === "box_corner" ? "Box Corner" : design.cornerType === "thermal" ? "Thermal Break" : "Standard";
    const metaLeft = [
      ["BOX DIMENSIONS",   `${design.dimensions.length} x ${design.dimensions.width} x ${design.dimensions.height} mm`],
      ["CARGO PROFILE",    cargo.name],
      ["INSULATION",       `${ins.name} -- Wall ${design.wallThickness} mm / Roof ${design.roofThickness} mm / Floor ${design.floorThickness} mm`],
      ["PROFILE SYSTEM",   `${profMat.name} -- ${design.profileWidth}x${design.profileDepth} mm ${profileTypeLabel}`],
    ];
    const metaRight = [
      ["AMBIENT TEMP",     `${design.ambientTemp} deg C`],
      ["TARGET TEMP",      `${design.targetTemp} deg C`],
      ["REFRIGERANT",      design.refrigerant],
      ["CORNER TYPE",      cornerTypeLabel],
    ];
    metaLeft.forEach(([k, v], i) => {
      doc.setTextColor(...C.sub); doc.setFontSize(6); doc.setFont("helvetica", "bold");
      doc.text(k, M + 3, y + 7 + i * 9);
      doc.setTextColor(...C.text); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
      doc.text(v, M + 3, y + 12 + i * 9);
    });
    metaRight.forEach(([k, v], i) => {
      doc.setTextColor(...C.sub); doc.setFontSize(6); doc.setFont("helvetica", "bold");
      doc.text(k, M + contentW / 2 + 3, y + 7 + i * 9);
      doc.setTextColor(...C.text); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
      doc.text(v, M + contentW / 2 + 3, y + 12 + i * 9);
    });

    y += 54;

    const verdColor: [number,number,number] = results.isSafe ? C.green : C.red;
    const verdLight: [number,number,number] = results.isSafe ? C.lgreen : C.lred;
    doc.setFillColor(...verdLight);
    doc.rect(M, y, contentW, 18, "F");
    doc.setFillColor(...verdColor);
    doc.rect(M, y, 4, 18, "F");
    doc.setTextColor(...verdColor);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(results.isSafe ? "STRUCTURALLY SAFE" : "STRUCTURAL CHECK REQUIRED", M + 8, y + 8);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.sub);
    doc.text(
      `FoS = ${results.fos.toFixed(2)}  |  Max. stress ${results.verticalStress.toFixed(1)} MPa  |  ${results.isSafe ? "All structural criteria satisfied." : "Review profile or stud spacing."}`,
      M + 8, y + 14
    );
    y += 22;

    kpiRow([
      { label: "Total Heat Gain",       value: `${Math.round(results.totalHeatGain)}`,                      unit: "W"   },
      { label: "Cooling Capacity",      value: `${(results.requiredCoolingCapacity / 1000).toFixed(2)}`,    unit: "kW"  },
      { label: "Estimated COP",         value: results.copEstimated.toFixed(2)                                           },
      { label: "Compressor Power",      value: `${results.compressorPower.toFixed(2)}`,                     unit: "kW"  },
    ]);
    kpiRow([
      { label: "Gross Weight",          value: `${Math.round(results.totalGrossWeight)}`,                   unit: "kg"  },
      { label: "Total Steel Length",    value: `${results.totalSteelLength.toFixed(1)}`,                    unit: "m"   },
      { label: "Internal Volume",       value: `${results.internalVolume.toFixed(2)}`,                      unit: "m3"  },
      { label: "Surface Area",          value: `${results.totalSurfaceArea.toFixed(2)}`,                    unit: "m2"  },
    ]);

    doc.setFillColor(...C.navy);
    doc.rect(0, 282, 210, 15, "F");
    doc.setTextColor(...C.white);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${dateStr} ${timeStr}  --  Thermo-Static Box Design Platform V75`, M, 290);
    doc.text("Page 1", 210 - M, 290, { align: "right" });

    // ═══════════════════════════════════════════════════════════
    //  PAGE 2 -- THERMAL ANALYSIS
    // ═══════════════════════════════════════════════════════════
    addPage();

    sectionHeader("1 . THERMAL ANALYSIS", "EN ISO 6946 -- Thermal Resistance of Building Components", C.blue, C.lblue);

    kpiRow([
      { label: "Transmission Loss",     value: `${Math.round(results.transmissionLoss)}`,    unit: "W", color: C.blue  },
      { label: "Internal Cargo Heat",   value: `${Math.round(results.internalHeatLoad)}`,    unit: "W", color: C.amber },
      { label: "Ventilation Loss",      value: `${Math.round(results.ventilationHeatLoad)}`, unit: "W", color: C.gray  },
      { label: "Infiltration Loss",     value: `${Math.round(results.infiltrationLoad)}`,    unit: "W", color: C.gray  },
    ]);

    divider(2);
    doc.setFont("helvetica", "bold");
    tableHead(["Panel", "Area (m2)", "U-value (W/m2K)", "Ins. Loss (W)", "Bridge Loss (W)", "Panel Total (W)", "Share (%)"],
              [26, 22, 30, 27, 28, 30, 19]);
    doc.setFont("helvetica", "normal");

    const dTv = Math.abs(design.ambientTemp - design.targetTemp) || 1;
    const Lm = design.dimensions.length / 1000;
    const Wm = design.dimensions.width / 1000;
    const Hm = design.dimensions.height / 1000;

    const wallRows: [string, number, {total:number;insulation:number;bridge:number}, number][] = [
      ["Left Side",  Lm * Hm, results.sideLoss,  design.wallThickness],
      ["Right Side", Lm * Hm, results.sideLoss,  design.wallThickness],
      ["Front Wall", Wm * Hm, results.frontLoss, design.wallThickness],
      ["Rear Wall",  Wm * Hm, results.frontLoss, design.wallThickness],
      ["Roof",       Lm * Wm, results.roofLoss,  design.roofThickness],
      ["Floor",      Lm * Wm, results.floorLoss, design.floorThickness],
    ];

    const realWallRows: [string, number, number, number, number][] = [
      ["Left Side",  Lm * Hm, results.sideLoss.insulation / 2,  results.sideLoss.bridge / 2,  results.sideLoss.total / 2],
      ["Right Side", Lm * Hm, results.sideLoss.insulation / 2,  results.sideLoss.bridge / 2,  results.sideLoss.total / 2],
      ["Front Wall", Wm * Hm, results.frontLoss.insulation / 2, results.frontLoss.bridge / 2, results.frontLoss.total / 2],
      ["Rear Wall",  Wm * Hm, results.frontLoss.insulation / 2, results.frontLoss.bridge / 2, results.frontLoss.total / 2],
      ["Roof",       Lm * Wm, results.roofLoss.insulation,       results.roofLoss.bridge,       results.roofLoss.total],
      ["Floor",      Lm * Wm, results.floorLoss.insulation,      results.floorLoss.bridge,      results.floorLoss.total],
    ];
    const panelTotal = realWallRows.reduce((s, r) => s + r[4], 0);
    realWallRows.forEach(([name, area, insLoss, bridgeLoss, total], idx) => {
      const uVal = area > 0 && dTv > 0 ? (total / (area * dTv)) : 0;
      const pct  = panelTotal > 0 ? (total / panelTotal * 100) : 0;
      const bg: [number,number,number] = idx % 2 === 0 ? C.white : C.lgray;
      tableRow([
        name, area.toFixed(2), uVal.toFixed(3),
        Math.round(insLoss) + " W", Math.round(bridgeLoss) + " W",
        Math.round(total) + " W", pct.toFixed(1) + "%",
      ], 7, [26, 22, 30, 27, 28, 30, 19], bg);
    });

    const crnPct = results.lossCorners / (panelTotal + results.lossCorners) * 100;
    tableRow(["Corner Losses", "--", "--", "--", `${Math.round(results.lossCorners)} W`, `${Math.round(results.lossCorners)} W`, `${crnPct.toFixed(1)}%`],
      7, [26, 22, 30, 27, 28, 30, 19], C.lred);
    tableRow(["GRAND TOTAL", "--", "--", "--", "--", `${Math.round(results.lossPanel + results.lossCorners)} W`, "100%"],
      8, [26, 22, 30, 27, 28, 30, 19], C.navy, [null,null,null,null,null,C.white,C.white]);

    divider(5);
    sectionHeader("1b . REFRIGERATION SYSTEM SIZING", "Thermodynamic Analysis -- Carnot Cycle Approximation", C.blue, C.lblue);

    kpiRow([
      { label: "Total Heat Gain",     value: `${Math.round(results.totalHeatGain)}`,                   unit: "W"    },
      { label: "Design Capacity (SF)",value: `${(results.requiredCoolingCapacity / 1000).toFixed(2)}`, unit: "kW"   },
      { label: "Estimated COP",       value: results.copEstimated.toFixed(2)                                         },
      { label: "Refrigerant Flow",    value: `${results.refrigerantMassFlow.toFixed(1)}`,              unit: "kg/h" },
    ]);

    tableHead(["Parameter", "Value", "Parameter", "Value"], [55, 45, 55, 27]);
    const copRows = [
      ["Refrigerant",          design.refrigerant,                               "Evaporation Temp",  `${design.evaporatorTemp || -10} deg C`],
      ["Estimated COP",        results.copEstimated.toFixed(3),                  "Condensation Temp", `${design.condenserTemp || 45} deg C`],
      ["Compressor Power",     `${results.compressorPower.toFixed(2)} kW`,       "Ambient/Target DT", `${dTv} K`],
      ["Cooling Capacity",     `${(results.requiredCoolingCapacity/1000).toFixed(3)} kW`, "Safety Factor (SF)", design.safetyFactor.toFixed(1)],
    ];
    copRows.forEach((row, i) => {
      const bg: [number,number,number] = i % 2 === 0 ? C.white : C.lgray;
      tableRow(row, 7, [55, 45, 55, 27], bg);
    });

    // ═══════════════════════════════════════════════════════════
    //  PAGE 3 -- STRUCTURAL ANALYSIS
    // ═══════════════════════════════════════════════════════════
    addPage();

    sectionHeader("2 . STRUCTURAL ANALYSIS", "Panel Deflection & Stress -- Euler-Bernoulli Beam Theory", C.navy, C.lblue);

    const wallNameMap: Record<string,string> = {
      leftSide:"Left Side", rightSide:"Right Side", front:"Front", back:"Rear", roof:"Roof", floor:"Floor"
    };
    kpiRow([
      { label: "Active Panel",      value: wallNameMap[selectedWall],       color: C.blue },
      { label: "Factor of Safety",  value: results.fos.toFixed(2),          color: results.fos >= 1.5 ? C.green : C.red },
      { label: "Max. Deflection",   value: `${results.maxDeflection.toFixed(3)}`, unit: "mm", color: C.navy },
      { label: "Max. Stress",       value: `${results.stress.toFixed(2)}`,  unit: "MPa", color: results.stress < 235 ? C.green : C.red },
    ]);
    if (selectedWall === "roof" || selectedWall === "floor") {
      kpiRow([
        { label: "Vertical Deflection", value: `${results.maxVerticalDeflection.toFixed(3)}`, unit: "mm" },
        { label: "Sagging Stress",      value: `${results.verticalStress.toFixed(2)}`,        unit: "MPa" },
        { label: "Span",                value: `${results.saggingSpan.toFixed(0)}`,           unit: "mm" },
        { label: "L/delta Ratio",       value: results.maxVerticalDeflection > 0 ? (results.saggingSpan / results.maxVerticalDeflection).toFixed(0) : "Inf" },
      ]);
    }

    divider(2);
    doc.setFont("helvetica", "bold");
    label("Per-Panel Profile Analysis", 8.5, C.navy);
    divider(1);
    tableHead(["Panel", "Count", "Pitch (mm)", "Defl. (mm)", "Stress (MPa)", "FoS", "Status"],
              [28, 16, 22, 22, 26, 18, 50]);
    doc.setFont("helvetica", "normal");

    const wallStructData = [
      { name: "Left Side",   n: globalCalc._s.N_Left,  pitch: globalCalc._s.actualPitchLeft,  yd: results.maxDeflection, str: results.stress, fos: results.fos, safe: results.isSafe },
      { name: "Right Side",  n: globalCalc._s.N_Right, pitch: globalCalc._s.actualPitchRight, yd: results.maxDeflection, str: results.stress, fos: results.fos, safe: results.isSafe },
      { name: "Front Wall",  n: globalCalc._s.N_Front, pitch: globalCalc._s.actualPitchFront, yd: results.maxDeflection, str: results.stress, fos: results.fos, safe: results.isSafe },
      { name: "Rear Wall",   n: globalCalc._s.N_Back,  pitch: globalCalc._s.actualPitchBack,  yd: results.maxDeflection, str: results.stress, fos: results.fos, safe: results.isSafe },
      { name: "Roof",        n: globalCalc._s.N_Roof,  pitch: globalCalc._s.actualPitchRoof,  yd: results.maxVerticalDeflection, str: results.verticalStress, fos: results.fos, safe: results.isSafe },
      { name: "Floor",       n: globalCalc._s.N_Floor, pitch: globalCalc._s.actualPitchFloor, yd: results.maxVerticalDeflection, str: results.verticalStress, fos: results.fos, safe: results.isSafe },
    ];
    wallStructData.forEach((row, i) => {
      const bg: [number,number,number] = i % 2 === 0 ? C.white : C.lgray;
      const sc: [number,number,number] = row.safe ? C.green : C.red;
      tableRow([
        row.name, `${row.n}`, row.pitch.toFixed(1),
        row.yd.toFixed(3), row.str.toFixed(2), row.fos.toFixed(2),
        row.safe ? "SAFE" : "CHECK",
      ], 7, [28, 16, 22, 22, 26, 18, 50], bg, [null, null, null, null, null, null, sc]);
    });

    divider(5);
    sectionHeader("2b . PROFILE & MATERIAL PROPERTIES", "Calculation Parameters", C.navy, C.lblue);

    tableHead(["Parameter", "Value", "Parameter", "Value"], [55, 45, 55, 27]);
    const profRows = [
      ["Profile Material",    profMat.name,                             "Profile Type",   profileTypeLabel],
      ["Width (b)",           `${design.profileWidth} mm`,              "Depth (d)",      `${design.profileDepth} mm`],
      ["Wall Thickness (t)",  `${design.profileThickness} mm`,          "Density (rho)",  `${profMat.density} kg/m3`],
      ["E-Modulus",           `${design.profileMaterialId === "aluminum" ? 70000 : 210000} MPa`, "Yield Stress (Fy)", `${design.profileMaterialId === "aluminum" ? 150 : 235} MPa`],
      ["Wind Load (w)",       `${design.windLoad} Pa`,                  "Safety Load",    design.applySafetyLoad ? "Applied (1 kN point load)" : "None"],
    ];
    profRows.forEach((row, i) => {
      const bg: [number,number,number] = i % 2 === 0 ? C.white : C.lgray;
      tableRow(row, 7, [55, 45, 55, 27], bg);
    });

    // ═══════════════════════════════════════════════════════════
    //  PAGE 4 -- WEIGHT, BOM & COST
    // ═══════════════════════════════════════════════════════════
    addPage();

    sectionHeader("3 . WEIGHT DISTRIBUTION & CENTRE OF GRAVITY", "Mass Analysis", C.amber, C.lamber);

    kpiRow([
      { label: "Empty Box Weight",  value: `${Math.round(results.emptyWeight)}`,      unit: "kg", color: C.navy  },
      { label: "Cargo Weight",      value: `${Math.round(results.cargoWeight)}`,       unit: "kg", color: C.amber },
      { label: "Gross Total Weight",value: `${Math.round(results.totalGrossWeight)}`,  unit: "kg", color: C.blue  },
      { label: "CoG Height (Z)",    value: `${results.cogZ.toFixed(3)}`,               unit: "m",  color: C.navy  },
    ]);

    tableHead(["Component", "Weight (kg)", "Share (%)", "Notes"], [50, 30, 30, 72]);
    const totalWt = results.totalGrossWeight;
    const weightBreakdown = [
      ["Steel Profiles",    Math.round(results.weightSteel),      (results.weightSteel / totalWt * 100).toFixed(1),      `Total length: ${results.totalSteelLength.toFixed(1)} m`],
      ["Insulation",        Math.round(results.weightInsulation),  (results.weightInsulation / totalWt * 100).toFixed(1), `${ins.name} -- density ${ins.density} kg/m3`],
      ["Skin / Cladding",   Math.round(results.weightSkins),       (results.weightSkins / totalWt * 100).toFixed(1),      `${skin.name} -- 2 x 0.6 mm`],
      ["Cargo / Load",      Math.round(results.cargoWeight),       (results.cargoWeight / totalWt * 100).toFixed(1),      `${cargo.name} -- ${design.cargoAmount} ${cargo.unit}`],
      ["TOTAL",             Math.round(results.totalGrossWeight),  "100.0",                                               "Gross transport weight"],
    ];
    weightBreakdown.forEach((row, i) => {
      const bg: [number,number,number] = i === weightBreakdown.length - 1 ? C.navy : (i % 2 === 0 ? C.white : C.lgray);
      const tc = i === weightBreakdown.length - 1 ? [null, C.white, C.white, C.white] as any : undefined;
      tableRow(row.map(String), 7, [50, 30, 30, 72], bg, tc);
    });

    divider(5);
    sectionHeader("4 . BILL OF QUANTITIES & COST ESTIMATE", "Conceptual Cost Breakdown (USD)", C.green, C.lgreen);

    const steelPricePerKg = 2.8;
    const insPricePerM3   = 180;
    const skinPricePerM2  = 12;
    const laborRate       = 0.15;

    const steelCost    = results.weightSteel * steelPricePerKg;
    const insVol       = ((2 * (Lm * Hm + Wm * Hm)) * (design.wallThickness / 1000)
                         + (Lm * Wm) * (design.roofThickness / 1000)
                         + (Lm * Wm) * (design.floorThickness / 1000));
    const insCost      = insVol * insPricePerM3;
    const skinCost     = results.totalSurfaceArea * skinPricePerM2;
    const materialCost = steelCost + insCost + skinCost;
    const laborCost    = materialCost * laborRate;
    const totalCost    = materialCost + laborCost;

    tableHead(["Item", "Quantity", "Unit", "Unit Price (USD)", "Total (USD)"], [55, 28, 20, 40, 39]);
    const bomRows = [
      ["Steel Profiles",          Math.round(results.weightSteel).toString(), "kg", steelPricePerKg.toFixed(2),    steelCost.toFixed(0)],
      ["Insulation Material",     insVol.toFixed(2) + " m3",                  "m3", insPricePerM3.toFixed(0),     insCost.toFixed(0)],
      ["Skin / Cladding",         `${results.totalSurfaceArea.toFixed(1)} m2`,"m2", skinPricePerM2.toFixed(0),    skinCost.toFixed(0)],
      ["Material Sub-Total",      "",                                          "",   "",                            materialCost.toFixed(0)],
      [`Labour (${(laborRate*100).toFixed(0)}%)`, "",                         "",   "",                            laborCost.toFixed(0)],
      ["GRAND TOTAL",             "",                                          "",   "",                            totalCost.toFixed(0)],
    ];
    bomRows.forEach((row, i) => {
      const isTotal = i >= bomRows.length - 2;
      const bg: [number,number,number] = isTotal ? (i === bomRows.length - 1 ? C.navy : C.lblue) : (i % 2 === 0 ? C.white : C.lgray);
      const tc = i === bomRows.length - 1 ? [null, null, null, null, C.white] as any : undefined;
      tableRow(row, 7, [55, 28, 20, 40, 39], bg, tc);
    });

    doc.setFontSize(6);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...C.sub);
    divider(3);
    doc.text("* Cost estimates are indicative only. Actual figures depend on market conditions and supply agreements.", M, y);
    y += 4;

    divider(5);
    sectionHeader("5 . SUMMARY & CONCLUSIONS", "Overall Assessment", C.navy, C.lblue);

    tableHead(["Criterion", "Calculated", "Limit / Target", "Status"], [60, 45, 45, 32]);
    const summaryRows: [string, string, string, boolean | null][] = [
      ["Factor of Safety (FoS)",    results.fos.toFixed(2),                                    ">= 1.50",  results.fos >= 1.5],
      ["Max. Panel Deflection",     `${results.maxDeflection.toFixed(3)} mm`,                  `L/${Math.round(results.panelHeight * 1000 / (results.maxDeflection || 1))} <= L/200`, results.maxDeflection < (results.panelHeight * 1000 / 200)],
      ["Panel Stress",              `${results.stress.toFixed(2)} MPa`,                        `< ${design.profileMaterialId === "aluminum" ? 150 : 235} MPa`, results.stress < (design.profileMaterialId === "aluminum" ? 150 : 235)],
      ["Transmission Heat Loss",    `${Math.round(results.transmissionLoss)} W`,               "Per design load", null],
      ["Estimated COP",             results.copEstimated.toFixed(2),                           ">= 2.0",   results.copEstimated >= 2.0],
      ["Gross Weight",              `${Math.round(results.totalGrossWeight)} kg`,              "Project limit", null],
    ];
    summaryRows.forEach(([criterion, calculated, limit, pass], i) => {
      const statusTxt   = pass === null ? "--" : pass ? "PASS" : "CHECK";
      const statusColor: [number,number,number] = pass === null ? C.sub : pass ? C.green : C.red;
      const bg: [number,number,number] = i % 2 === 0 ? C.white : C.lgray;
      tableRow([criterion, calculated, limit, statusTxt], 7, [60, 45, 45, 32], bg, [null, null, null, statusColor]);
    });

    const totalPages = doc.getNumberOfPages();
    for (let p = 2; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFillColor(...C.navy);
      doc.rect(0, 285, 210, 12, "F");
      doc.setTextColor(...C.white);
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.text(`Auto-generated by Thermo-Static Box Design Platform V75  --  ${dateStr} ${timeStr}`, M, 291.5);
      doc.text(`Page ${p} / ${totalPages}`, 210 - M, 291.5, { align: "right" });
    }

    doc.save(`thermo-static-report-${now.toISOString().slice(0, 10)}.pdf`);
  };

  const handleExport = (format: "json" | "csv") => {
    const data = { timestamp: new Date().toISOString(), design, results };
    const blob = new Blob([format === "json" ? JSON.stringify(data, null, 2) : "Parametre,Deger\nL," + design.dimensions.length], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `termo-statik-v75-${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = useMemo(() => {
    const data = [];
    for (let t = -25; t <= 45; t += 5) {
      const dT = Math.abs(t - design.targetTemp);
      const q = (results.transmissionLoss / Math.abs(design.ambientTemp - design.targetTemp || 1)) * dT + results.internalHeatLoad;
      data.push({ temp: t, load: Math.round(q) });
    }
    return data;
  }, [design.targetTemp, design.ambientTemp, results.transmissionLoss, results.internalHeatLoad]);

    const lossData = [
      { name: 'Yan', value: Math.round(results.sideLoss.total), color: '#3b82f6' },
      { name: 'Ön/Arka', value: Math.round(results.frontLoss.total), color: '#6366f1' },
      { name: 'Tavan', value: Math.round(results.roofLoss.total), color: '#06b6d4' },
      { name: 'Taban', value: Math.round(results.floorLoss.total), color: '#0ea5e9' },
      { name: 'Köşe', value: Math.round(results.lossCorners), color: '#ef4444' },
    ];

    const weightDistributionData = [
      { name: 'Çelik', value: Math.round(results.weightSteel), color: '#3b82f6' },
      { name: 'Yalıtım', value: Math.round(results.weightInsulation), color: '#f59e0b' },
      { name: 'Kabuk', value: Math.round(results.weightSkins), color: '#10b981' },
      { name: 'Yük', value: Math.round(results.cargoWeight), color: '#ef4444' },
    ].filter(d => d.value > 0);

    const weightDistributionTotal = weightDistributionData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
          <h1 className="text-xs font-bold tracking-tight text-white uppercase">Termo-Statik Kasa Tasarım Platformu</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold uppercase tracking-wide rounded transition-colors"
            >
              <FileText className="w-3 h-3" /> Rapor
            </button>
            <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[8px] font-black rounded-full border border-blue-600/30 uppercase">V75 Kernel Stable</span>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Left/Main Area */}
          <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
            {/* Tab Switcher */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shrink-0 mb-0">
              <button 
                onClick={() => setActiveTab("static")}
                className={cn("flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all", activeTab === "static" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300")}
              >STATİK ANALİZ</button>
              <button 
                onClick={() => setActiveTab("thermal")}
                className={cn("flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all", activeTab === "thermal" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300")}
              >TERMAL ANALİZ</button>
              <button 
                onClick={() => setActiveTab("assembly")}
                className={cn("flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all", activeTab === "assembly" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300")}
              >TÜM KASA & RAPOR</button>
            </div>



            {/* Visualization Area */}
            {activeTab === "thermal" ? (
              /* ── THERMAL TAB: 2-Column Split Layout ── */
              <div className="grid flex-1 min-h-0 gap-4" style={{ gridTemplateColumns: "5fr 7fr" }}>
                {/* LEFT col-span-5: Controls + Skeleton */}
                <div className="bg-[#06091a] rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col min-h-0">
                  <ThermalControlPanel
                    design={design}
                    onDesignChange={setDesign}
                    refrigerantOptions={Object.keys(REFRIGERANT_PROPERTIES)}
                    selectedWall={selectedWall}
                    onSelectedWallChange={setSelectedWall}
                    results={results}
                  />
                </div>
                {/* RIGHT col-span-7: Analysis Results */}
                <div className="bg-[#06091a] rounded-2xl border border-slate-800/80 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
                  <div className="p-5 flex-1">
                    <ThermalAnalysisPanel
                      results={results}
                      design={design}
                      selectedWall={selectedWall}
                      onDesignChange={setDesign}
                    />
                  </div>
                </div>
              </div>
            ) : (
            <div className="flex gap-4 flex-1 min-h-0">

              {/* ── LEFT COLUMN: 3D skeleton (compact) + 3 charts ── */}
              <div className="w-[280px] shrink-0 flex flex-col gap-3 min-h-0">

                {/* 3D Canvas – quarter size, top-left */}
                <div
                  className="bg-slate-950 rounded-2xl border border-slate-800 relative overflow-hidden shrink-0"
                  style={{ height: '190px' }}
                >
                  <div className="absolute top-2 left-3 z-10 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                    3D İskelet
                  </div>
                  <Canvas shadows gl={{ antialias: true }}>
                    <PerspectiveCamera makeDefault position={[10, 8, 10]} fov={35} />
                    <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
                    <ambientLight intensity={0.6} />
                    <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
                    <pointLight position={[-10, 5, -10]} intensity={0.5} color="#3b82f6" />
                    <BoxMesh design={design} results={results} selectedWall={selectedWall} activeTab={activeTab} />
                    <Grid infiniteGrid fadeDistance={40} fadeStrength={5} cellSize={1} sectionSize={5} sectionColor="#1e293b" cellColor="#0f172a" />
                  </Canvas>
                </div>

                {/* Charts */}
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar min-h-0 pb-2">

                  {/* Chart 1 – Wall Heat Loss */}
                  {(() => {
                    const heatData = [
                      { name: 'Sol+Sağ', w: +(results.sideLoss?.total  || 0).toFixed(1) },
                      { name: 'Ön+Arka', w: +(results.frontLoss?.total || 0).toFixed(1) },
                      { name: 'Tavan',   w: +(results.roofLoss?.total  || 0).toFixed(1) },
                      { name: 'Taban',   w: +(results.floorLoss?.total  || 0).toFixed(1) },
                      { name: 'Köşe',    w: +(results.lossCorners      || 0).toFixed(1) },
                    ];
                    const barColors = ['#3b82f6','#06b6d4','#10b981','#f59e0b','#8b5cf6'];
                    return (
                      <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-3">
                        <div className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-2">
                          Duvar Isı Kaybı (W)
                        </div>
                        <ResponsiveContainer width="100%" height={110}>
                          <BarChart data={heatData} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 7 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 7 }} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, fontSize: 9 }}
                              itemStyle={{ color: '#e2e8f0' }}
                              cursor={{ fill: '#1e293b' }}
                              formatter={(v: any) => [`${v} W`, 'Isı Kaybı']}
                            />
                            <Bar dataKey="w" radius={[3,3,0,0]}>
                              {heatData.map((_: any, i: number) => (
                                <Cell key={i} fill={barColors[i % barColors.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })()}

                  {/* Chart 2 – Weight Distribution */}
                  {(() => {
                    const total = Math.max(results.emptyWeight || 1, 0.01);
                    const wData = [
                      { name: 'Profil',   kg: +results.weightSteel.toFixed(1),      pct: +(results.weightSteel      / total * 100).toFixed(1), fill: '#3b82f6' },
                      { name: 'Yalıtım', kg: +results.weightInsulation.toFixed(1), pct: +(results.weightInsulation / total * 100).toFixed(1), fill: '#10b981' },
                      { name: 'Kaplama', kg: +results.weightSkins.toFixed(1),       pct: +(results.weightSkins      / total * 100).toFixed(1), fill: '#f59e0b' },
                    ];
                    return (
                      <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-3">
                        <div className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-2">
                          Ağırlık Dağılımı (kg)
                        </div>
                        <div className="flex gap-2 items-center">
                          <ResponsiveContainer width="50%" height={90}>
                            <PieChart>
                              <Pie
                                data={wData}
                                dataKey="kg"
                                innerRadius={22}
                                outerRadius={38}
                                paddingAngle={2}
                                startAngle={90}
                                endAngle={-270}
                              >
                                {wData.map((d: any, i: number) => <Cell key={i} fill={d.fill} />)}
                              </Pie>
                              <Tooltip
                                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, fontSize: 9 }}
                                formatter={(v: any) => [`${v} kg`]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex-1 flex flex-col justify-center gap-1.5">
                            {wData.map((d: any) => (
                              <div key={d.name} className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                                <span className="text-[8px] text-slate-400">{d.name}</span>
                                <span className="text-[8px] text-white font-black ml-auto">{d.pct}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Chart 3 – Deflection Status */}
                  {(() => {
                    const spanW = results.panelHeight * 1000;
                    const allowW = Math.max(spanW / 250, 0.01);
                    const allowV = Math.max(results.saggingSpan / 250, 0.01);
                    const pctW = Math.min(100, (results.maxDeflection         / allowW) * 100);
                    const pctV = Math.min(100, (results.maxVerticalDeflection / allowV) * 100);
                    const colW = pctW > 80 ? '#ef4444' : pctW > 60 ? '#f59e0b' : '#10b981';
                    const colV = pctV > 80 ? '#ef4444' : pctV > 60 ? '#f59e0b' : '#10b981';
                    return (
                      <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-3 space-y-3">
                        <div className="text-[8px] font-black text-amber-400 uppercase tracking-widest">
                          Sehim Durumu
                        </div>
                        <div className="space-y-2.5">
                          <div>
                            <div className="flex justify-between text-[7px] mb-1">
                              <span className="text-slate-500 uppercase font-bold">Yanal Sehim</span>
                              <span className="font-black" style={{ color: colW }}>
                                {results.maxDeflection.toFixed(2)} / {allowW.toFixed(2)} mm
                              </span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pctW}%`, background: colW }} />
                            </div>
                            <div className="text-[7px] text-slate-600 mt-0.5">L/250 · {pctW.toFixed(0)}% kullanım</div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[7px] mb-1">
                              <span className="text-slate-500 uppercase font-bold">Düşey Sehim</span>
                              <span className="font-black" style={{ color: colV }}>
                                {results.maxVerticalDeflection.toFixed(2)} / {allowV.toFixed(2)} mm
                              </span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pctV}%`, background: colV }} />
                            </div>
                            <div className="text-[7px] text-slate-600 mt-0.5">L/250 · {pctV.toFixed(0)}% kullanım</div>
                          </div>
                          <div className="flex justify-between pt-1.5 border-t border-slate-800">
                            <span className="text-[7px] text-slate-500 uppercase font-bold">Güvenlik Katsayısı</span>
                            <span className={cn("text-[8px] font-black", results.fos >= 1.5 ? "text-emerald-400" : "text-red-400")}>
                              {results.fos.toFixed(2)}×
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </div>

              {/* ── RIGHT COLUMN: Analysis Panel + Controls ── */}
              <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-y-auto custom-scrollbar">

                {/* Analysis Panel */}
                <div className="bg-slate-950 rounded-2xl border border-slate-800 shrink-0">
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {activeTab === "static" ? "Statik Sehim ve Yük Dağılımı" : "Tüm Kasa & Rapor Özeti"}
                    </span>
                  </div>
                  <div className="p-4">
                    {activeTab === "static" ? (
                      <StaticAnalysisPanel
                        results={results}
                        selectedWall={selectedWall}
                      />
                    ) : (
                      <AssemblyPanel
                        results={results}
                        design={design}
                        onExport={(type) => type === "json" ? handleExport("json") : generatePDF()}
                      />
                    )}
                  </div>
                </div>

                {/* Control Panels – static tab only */}
                {activeTab === "static" && (
                <div className="grid grid-cols-2 gap-4 pb-4 shrink-0">
                  <>
                      {/* Panel Specific Parameters */}
                      <div className="space-y-4">
                        <h3 className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] border-b border-slate-800 pb-1.5 flex items-center gap-2">
                          <Box className="w-2.5 h-2.5" />
                          Panel Seçimi & Geometrisi
                        </h3>
                        <div className="grid grid-cols-3 gap-2">
                          {(["leftSide", "rightSide", "front", "back", "roof", "floor"] as const).map((wall) => (
                            <button
                              key={wall}
                              onClick={() => setSelectedWall(wall)}
                              className={cn(
                                "py-2 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all",
                                selectedWall === wall ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600"
                              )}
                            >
                              {wall === "leftSide" ? "Sol Yan" :
                               wall === "rightSide" ? "Sağ Yan" :
                               wall === "front" ? "Ön Duvar" :
                               wall === "back" ? "Arka Duvar" :
                               wall === "roof" ? "Tavan" : "Taban"}
                            </button>
                          ))}
                        </div>
                        <div className="space-y-3 pt-2">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label className="text-[7px] text-slate-500 uppercase font-bold tracking-widest">Profil Malzemesi</label>
                              <select
                                value={design.profileMaterialId}
                                onChange={(e) => setDesign({ ...design, profileMaterialId: e.target.value as any })}
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
                                onChange={(e) => setDesign({ ...design, insulationMaterialId: e.target.value as any })}
                                className="w-full bg-[#0a0f1c] text-white appearance-none text-[8px] font-black p-2 rounded border border-slate-700 outline-none cursor-pointer hover:border-slate-500 focus:border-blue-500"
                              >
                                {INSULATION_MATERIALS.map((material) => (
                                  <option key={material.id} value={material.id}>{material.name}</option>
                                ))}
                              </select>
                              <div className="mt-1 text-[8px] text-slate-500 tracking-wide">
                                k = {selectedInsulationMaterial.kValue} W/mK · {selectedInsulationMaterial.density} kg/m³
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[7px] text-slate-400 uppercase font-black tracking-widest">Kasa Yük Tipi</label>
                              <select
                                value={design.activeCargo}
                                onChange={(e) => setDesign({ ...design, activeCargo: e.target.value as any })}
                                className="w-full bg-[#0a0f1c] text-white appearance-none text-[8px] font-black p-2 rounded border border-slate-700 outline-none cursor-pointer hover:border-slate-500 focus:border-blue-500"
                              >
                                {Object.keys(CARGO_PROFILES).map((key) => {
                                  const cargo = (CARGO_PROFILES as any)[key];
                                  return <option key={cargo.id} value={cargo.id}>{cargo.icon} {cargo.name}</option>;
                                })}
                              </select>
                              <div className="mt-1 text-[8px] text-slate-500 tracking-wide">
                                {selectedCargoProfile.desc} {selectedCargoProfile.max ? `Maks ${selectedCargoProfile.max} ${selectedCargoProfile.unit}` : ""}
                              </div>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <div className="text-[8px] text-slate-400 uppercase font-black tracking-widest">1000N Emniyet Yükü</div>
                                <div className="text-[9px] text-slate-200 font-bold">Sisteme eklenmiş 1000N nokta yükü</div>
                              </div>
                              <button
                                onClick={() => setDesign({ ...design, applySafetyLoad: !design.applySafetyLoad })}
                                className={cn(
                                  "w-16 h-7 rounded-full transition-all relative",
                                  design.applySafetyLoad ? "bg-blue-600" : "bg-slate-700"
                                )}
                              >
                                <span className={cn(
                                  "absolute top-1 w-5 h-5 rounded-full bg-white transition-all",
                                  design.applySafetyLoad ? "right-1" : "left-1"
                                )} />
                              </button>
                            </div>
                            <div className="text-[8px] text-slate-500">{design.applySafetyLoad ? "1000N emniyet yükü etkin" : "1000N emniyet yükü devre dışı"}</div>
                          </div>

                          <SliderInput
                            label="Panel Kalınlığı (mm)"
                            value={selectedWall === "roof" ? design.roofThickness : selectedWall === "floor" ? design.floorThickness : design.wallThickness}
                            min={20} max={250}
                            onChange={(v: number) => {
                              if (selectedWall === "roof") setDesign({ ...design, roofThickness: v });
                              else if (selectedWall === "floor") setDesign({ ...design, floorThickness: v });
                              else setDesign({ ...design, wallThickness: v });
                            }}
                          />

                          <SliderInput
                            label="Panel Uzunluğu (mm)"
                            value={(selectedWall === "front" || selectedWall === "back") ? design.dimensions.width : design.dimensions.length}
                            min={500} max={15000}
                            onChange={(v: number) => {
                              if (selectedWall === "front" || selectedWall === "back") setDesign({ ...design, dimensions: { ...design.dimensions, width: v } });
                              else setDesign({ ...design, dimensions: { ...design.dimensions, length: v } });
                            }}
                          />

                          <SliderInput
                            label="Panel Yüksekliği (mm)"
                            value={(selectedWall === "roof" || selectedWall === "floor") ? design.dimensions.width : design.dimensions.height}
                            min={500} max={4000}
                            onChange={(v: number) => {
                              if (selectedWall === "roof" || selectedWall === "floor") setDesign({ ...design, dimensions: { ...design.dimensions, width: v } });
                              else setDesign({ ...design, dimensions: { ...design.dimensions, height: v } });
                            }}
                          />

                          <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800 space-y-1">
                            <div className="flex justify-between text-[9px]">
                              <span className="text-slate-500 uppercase font-bold">Hesaplanan Alan:</span>
                              <span className="text-white font-black">{results.panelArea.toFixed(4)} m²</span>
                            </div>
                            <div className="flex justify-between text-[9px]">
                              <span className="text-slate-500 uppercase font-bold">Panel Yüksekliği:</span>
                              <span className="text-white font-black">{results.panelHeight.toFixed(4)} m</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] border-b border-slate-800 pb-1.5 flex items-center gap-2">
                          <Layout className="w-2.5 h-2.5" />
                          Panel İskelet Yapısı
                        </h3>
                        <div className="space-y-4">
                          {(() => {
                            const config = design.wallConfigs[selectedWall];
                            const updateConfig = (updates: any) => {
                              setDesign({
                                ...design,
                                wallConfigs: {
                                  ...design.wallConfigs,
                                  [selectedWall]: { ...config, ...updates }
                                }
                              });
                            };

                            return (
                              <>
                                <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                                  <button
                                    onClick={() => updateConfig({ pitchMode: 'pitch' })}
                                    className={cn("flex-1 py-1 text-[9px] font-black rounded uppercase transition-all", config.pitchMode === 'pitch' ? "bg-blue-600 text-white" : "text-slate-500")}
                                  >
                                    Hatve (mm)
                                  </button>
                                  <button
                                    onClick={() => updateConfig({ pitchMode: 'count' })}
                                    className={cn("flex-1 py-1 text-[9px] font-black rounded uppercase transition-all", config.pitchMode === 'count' ? "bg-blue-600 text-white" : "text-slate-500")}
                                  >
                                    Adet
                                  </button>
                                </div>
                                <SliderInput
                                  label={config.pitchMode === 'pitch' ? "Profil Hatvesi (mm)" : "Profil Adedi"}
                                  value={config.pitchMode === 'pitch' ? config.profilePitch : config.profileCount}
                                  min={config.pitchMode === 'pitch' ? 200 : 2}
                                  max={config.pitchMode === 'pitch' ? 1200 : 50}
                                  onChange={(v: number) => config.pitchMode === 'pitch' ? updateConfig({ profilePitch: v }) : updateConfig({ profileCount: v })}
                                />
                                <SliderInput label="Profil Genişliği (mm)" value={design.profileWidth} min={20} max={100} onChange={(v: number) => setDesign({ ...design, profileWidth: v })} />
                                <SliderInput label="Profil Derinliği (mm)" value={design.profileDepth} min={20} max={100} onChange={(v: number) => setDesign({ ...design, profileDepth: v })} />
                                <SliderInput label="Et Kalınlığı (mm)" value={design.profileThickness} min={1} max={10} onChange={(v: number) => setDesign({ ...design, profileThickness: v })} />

                                {(selectedWall === "roof" || selectedWall === "floor") && (
                                  <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4 mt-4">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Boyuna Profil Düzeni</label>
                                      <div className="flex bg-slate-800 rounded-lg p-1">
                                        <button
                                          onClick={() => updateConfig({ longitudinalPitchMode: 'pitch' })}
                                          className={cn("px-3 py-1 text-[9px] font-bold rounded-md transition-all", config.longitudinalPitchMode === 'pitch' ? "bg-blue-600 text-white" : "text-slate-500")}
                                        >HATVE</button>
                                        <button
                                          onClick={() => updateConfig({ longitudinalPitchMode: 'count' })}
                                          className={cn("px-3 py-1 text-[9px] font-bold rounded-md transition-all", config.longitudinalPitchMode === 'count' ? "bg-blue-600 text-white" : "text-slate-500")}
                                        >ADET</button>
                                      </div>
                                    </div>

                                    {config.longitudinalPitchMode === 'pitch' ? (
                                      <SliderInput
                                        label="Boyuna Hatve (mm)"
                                        value={config.longitudinalPitch || 650}
                                        min={200} max={1200}
                                        onChange={(v: number) => updateConfig({ longitudinalPitch: v })}
                                      />
                                    ) : (
                                      <SliderInput
                                        label="Boyuna Adet"
                                        value={config.longitudinalCount || 5}
                                        min={2} max={20}
                                        onChange={(v: number) => updateConfig({ longitudinalCount: v })}
                                      />
                                    )}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                  </>
                </div>
                )} {/* end activeTab === static */}

              </div>
            </div>
            )} {/* end thermal ternary */}
          </div>

        </div>
      </main>

      {/* ── Rapor Modal ────────────────────────────────────────────────── */}
      {showReport && (
        <ReportPage
          design={design}
          results={results}
          selectedWall={selectedWall}
          onClose={() => setShowReport(false)}
          onExportPDF={() => { setShowReport(false); generatePDF(); }}
        />
      )}
    </div>
  );
}

// --- Helper Components ---

function LossBar({ label, value, total, color }: any) {
  const percentage = (value / total) * 100;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[7px] font-black uppercase tracking-tighter">
        <span className="text-slate-500">{label}</span>
        <span className="text-white">{Math.round(value)} W ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="h-0.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );
}

function AnalysisCard({ title, value, unit, sub, color, dropdown, onSubClick }: any) {
  return (
    <div className={cn("bg-slate-900/50 p-2.5 rounded-xl border-l-4 shadow-xl flex flex-col gap-0.5", color)}>
      <div className="flex justify-between items-center">
        <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{title}</span>
        {dropdown && (
          <div className="flex items-center gap-1 bg-slate-800 px-1 py-0.5 rounded text-[6px] font-bold text-blue-400 border border-blue-500/30">
            {dropdown} <ChevronDown className="w-1.5 h-1.5" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black text-white tracking-tight">{value}</span>
        <span className="text-[10px] font-bold text-slate-500">{unit}</span>
      </div>
      <div className="h-px bg-slate-800 w-full my-0.5" />
      <span 
        onClick={onSubClick}
        className={cn(
          "text-[7px] font-medium italic transition-all",
          onSubClick ? "cursor-pointer text-blue-400 hover:text-blue-300 underline decoration-dotted underline-offset-2" : "text-slate-400"
        )}
      >
        {sub}
      </span>
    </div>
  );
}

function SliderInput({ label, value, min, max, onChange }: any) {
  return (
    <div className="flex items-center gap-4 py-0.5">
      <label className="text-[9px] font-bold text-slate-400 w-24 shrink-0 uppercase tracking-tight leading-tight">{label}</label>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <input 
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-16 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-white text-center font-mono outline-none focus:border-blue-500 transition-colors"
      />
    </div>
  );
}

function SelectBox({ label, value }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white flex justify-between items-center cursor-pointer hover:border-slate-600 transition-colors">
        {value}
        <ChevronDown className="w-3 h-3 text-slate-500" />
      </div>
    </div>
  );
}

function SidebarIcon({ icon, active, onClick, label }: any) {
  return (
    <button onClick={onClick} className={cn("group relative w-9 h-9 flex items-center justify-center rounded-lg transition-all", active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:bg-slate-800")}>
      {icon}
      <span className="absolute left-12 bg-slate-900 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 border border-slate-800">{label}</span>
    </button>
  );
}

function InputGroup({ label, value, onChange }: any) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[8px] font-black text-slate-500 uppercase tracking-wider">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white outline-none transition-all font-mono" />
    </div>
  );
}

function QuickStat({ label, value, icon, color }: any) {
  return (
    <div className="bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 shadow-2xl flex items-center gap-3 min-w-[150px]">
      <div className={cn("p-1.5 rounded-lg bg-slate-800", color)}>{icon}</div>
      <div className="flex flex-col">
        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
        <span className="text-xs font-bold text-white">{value}</span>
      </div>
    </div>
  );
}

function ResultRow({ label, value, sub, color, tooltip }: any) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/50 last:border-0 group relative">
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{label}</span>
          {tooltip && (
            <div className="relative group/tooltip">
              <Info className="w-2.5 h-2.5 text-slate-600 cursor-help" />
              <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-800 text-[8px] text-slate-300 rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 border border-slate-700 shadow-xl">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        {sub && <span className="text-[8px] text-slate-500 italic">{sub}</span>}
      </div>
      <span className={cn("text-[11px] font-black font-mono", color || "text-white")}>{value}</span>
    </div>
  );
}

function ExportButton({ label, onClick, icon }: any) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl hover:border-blue-500 hover:bg-blue-600/5 transition-all group">
      <div className="flex items-center gap-2">
        {icon && <span className="text-blue-500">{icon}</span>}
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 group-hover:text-white">{label}</span>
      </div>
      <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" />
    </button>
  );
}

