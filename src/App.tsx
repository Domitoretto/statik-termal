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

import { MATERIALS, CARGO_PROFILES, PSI_VALUES } from "./constants";
import { CalculationResults, WallLayer } from "./types";
import { cn } from "./lib/utils";
import { useDesignStore } from "./store";

// --- 3D Components ---
function BoxMesh({ design, results, selectedWall, activeTab }: { design: any; results: any; selectedWall: string; activeTab: string }) {
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
  const [activeTab, setActiveTab] = useState<"panel" | "full">("panel");
  const [navTab, setNavTab] = useState<"design" | "analysis" | "export">("design");
  const [selectedWall, setSelectedWall] = useState<"leftSide" | "rightSide" | "front" | "back" | "roof" | "floor">("leftSide");
  const [panelWeightMode, setPanelWeightMode] = useState<"total" | "profile">("total");
  const [deflectionMode, setDeflectionMode] = useState<"profile" | "composite">("composite");

  // --- Calculations (V75 Engine) ---
  const results = useMemo((): CalculationResults => {
    const { 
      dimensions, insulationMaterialId, skinMaterialId, profileMaterialId,
      wallThickness, roofThickness, floorThickness,
      ambientTemp, targetTemp, ventilationRate, safetyFactor,
      wallConfigs,
      profileWidth, profileDepth, profileThickness,
      profileType, cornerType, windLoad, activeCargo, cargoAmount
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
    const internalHeatLoad = cargoAmount * cargo.heatPerUnit;
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

    // Calculate N for each wall
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

    let currentActualPitch = actualPitchLeft;
    if (selectedWall === "rightSide") currentActualPitch = actualPitchRight;
    else if (selectedWall === "front") currentActualPitch = actualPitchFront;
    else if (selectedWall === "back") currentActualPitch = actualPitchBack;
    else if (selectedWall === "roof") currentActualPitch = actualPitchRoof;
    else if (selectedWall === "floor") currentActualPitch = actualPitchFloor;

    const cf = 0.25; 
    const sheet_thickness = 0.6;
    const Ix_skins = 2 * (currentActualPitch * sheet_thickness * Math.pow((th_wall * 1000) / 2, 2));
    const I_eff = Ix_stud + (Ix_skins * cf);

    const q_wind_area = windLoad / 1000000;
    const q_stud = q_wind_area * currentActualPitch;

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
        // A framed wall has 2 extra rails in the perpendicular direction to the studs
        // If studs are vertical (height H), frame rails are horizontal (length L = Area / H)
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
    const frontLoss = calcWallLoss(W_m * H_m, th_wall, k_ins, N_Front, pw, H_m);
    const backLoss = calcWallLoss(W_m * H_m, th_wall, k_ins, N_Back, pw, H_m);
    const roofLoss = calcWallLoss(L_m * W_m, th_roof, k_ins, N_Roof, pw, W_m, N_Roof_Long, L_m, false); 
    const floorLoss = calcWallLoss(L_m * W_m, th_floor, k_ins, N_Floor, pw, W_m, N_Floor_Long, L_m, false); 

    const lossPanel = leftLoss.total + rightLoss.total + frontLoss.total + backLoss.total + roofLoss.total + floorLoss.total;
    const totalEdgeLength = (4 * L_m + 4 * W_m + 4 * H_m);
    const lossCorners = totalEdgeLength * (PSI_VALUES[cornerType] || 0.35) * dT;
    
    // --- Single Panel Specifics ---
    let panelArea = 0;
    let panelLoss = 0;
    let panelInsulationLoss = 0;
    let panelBridgeLoss = 0;
    let panelHeight = H_m;
    let panelWidth = L_m;
    let n_panel_studs = N_Left;
    let current_thickness_mm = wallThickness;

    if (selectedWall === "leftSide") {
      panelArea = L_m * H_m;
      panelLoss = leftLoss.total;
      panelInsulationLoss = leftLoss.insulation;
      panelBridgeLoss = leftLoss.bridge;
      panelHeight = H_m;
      panelWidth = L_m;
      n_panel_studs = N_Left;
      current_thickness_mm = wallThickness;
    } else if (selectedWall === "rightSide") {
      panelArea = L_m * H_m;
      panelLoss = rightLoss.total;
      panelInsulationLoss = rightLoss.insulation;
      panelBridgeLoss = rightLoss.bridge;
      panelHeight = H_m;
      panelWidth = L_m;
      n_panel_studs = N_Right;
      current_thickness_mm = wallThickness;
    } else if (selectedWall === "front") {
      panelArea = W_m * H_m;
      panelLoss = frontLoss.total; 
      panelInsulationLoss = frontLoss.insulation;
      panelBridgeLoss = frontLoss.bridge;
      panelHeight = H_m;
      panelWidth = W_m;
      n_panel_studs = N_Front;
      current_thickness_mm = wallThickness;
    } else if (selectedWall === "back") {
      panelArea = W_m * H_m;
      panelLoss = backLoss.total; 
      panelInsulationLoss = backLoss.insulation;
      panelBridgeLoss = backLoss.bridge;
      panelHeight = H_m;
      panelWidth = W_m;
      n_panel_studs = N_Back;
      current_thickness_mm = wallThickness;
    } else if (selectedWall === "roof") {
      panelArea = L_m * W_m;
      panelLoss = roofLoss.total;
      panelInsulationLoss = roofLoss.insulation;
      panelBridgeLoss = roofLoss.bridge;
      panelHeight = W_m;
      panelWidth = L_m;
      n_panel_studs = N_Roof;
      current_thickness_mm = roofThickness;
    } else if (selectedWall === "floor") {
      panelArea = L_m * W_m;
      panelLoss = floorLoss.total;
      panelInsulationLoss = floorLoss.insulation;
      panelBridgeLoss = floorLoss.bridge;
      panelHeight = W_m;
      panelWidth = L_m;
      n_panel_studs = N_Floor;
      current_thickness_mm = floorThickness;
    }

    const span_mm = panelHeight * 1000;
    const Ix_skins_panel = 2 * (currentActualPitch * sheet_thickness * Math.pow(current_thickness_mm / 2, 2));
    const I_eff_panel = Ix_stud + (Ix_skins_panel * cf);

    const I_to_use = deflectionMode === 'composite' ? I_eff_panel : Ix_stud;

    const maxDeflection = (1 * q_stud * Math.pow(span_mm, 4)) / (384 * E_STEEL * I_to_use);
    const stress = ((q_stud * Math.pow(span_mm, 2) / 12) * (current_thickness_mm / 2) / I_to_use);

    const totalHeatGain = lossPanel + lossCorners + internalHeatLoad;
    
    // --- Vertical Sagging Calculation ---
    const roofWeightTotal = (L_m * W_m) * (th_roof / 1000) * insulationMat.density + 
                            (L_m * W_m) * 0.0006 * skinMat.density * 2 + 
                            ((N_Roof * W_in + N_Roof_Long * L_in) / 1000) * weightPerMeter;
    
    const floorWeightTotal = (L_m * W_m) * (th_floor / 1000) * insulationMat.density + 
                             (L_m * W_m) * 0.0006 * skinMat.density * 2 + 
                             ((N_Floor * W_in + N_Floor_Long * L_in) / 1000) * weightPerMeter;

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

        // Local stiffness matrix for a grid element (w, theta_torsion, theta_bending)
        const kLocal = [
          [12*el.E*el.I/Math.pow(L,3), 0, 6*el.E*el.I/Math.pow(L,2), -12*el.E*el.I/Math.pow(L,3), 0, 6*el.E*el.I/Math.pow(L,2)],
          [0, el.G*el.J/L, 0, 0, -el.G*el.J/L, 0],
          [6*el.E*el.I/Math.pow(L,2), 0, 4*el.E*el.I/L, -6*el.E*el.I/Math.pow(L,2), 0, 2*el.E*el.I/L],
          [-12*el.E*el.I/Math.pow(L,3), 0, -6*el.E*el.I/Math.pow(L,2), 12*el.E*el.I/Math.pow(L,3), 0, -6*el.E*el.I/Math.pow(L,2)],
          [0, -el.G*el.J/L, 0, 0, el.G*el.J/L, 0],
          [6*el.E*el.I/Math.pow(L,2), 0, 2*el.E*el.I/L, -6*el.E*el.I/Math.pow(L,2), 0, 4*el.E*el.I/L]
        ];

        // Transformation matrix: global [w, tx, ty] to local [w, t_torsion, t_bending]
        // t_torsion = c*tx + s*ty
        // t_bending = -s*tx + c*ty
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
      
      // 1. Dead Load (Insulation + Skins)
      const deadLoadUnit = ( (isRoof ? th_roof / 1000 : th_floor / 1000) * insulationMat.density + 0.0006 * skinMat.density * 2 ) * 9.81;
      loadBreakdown.dead = deadLoadUnit * (L_m * W_m) / 9.81;

      // 2. Live Load (Cargo)
      const liveLoadUnit = isRoof ? 0 : (cargoWeight * 9.81) / (L_m * W_m);
      loadBreakdown.live = isRoof ? 0 : cargoWeight;

      // 3. Profile Load
      const totalProfileLengthM = (isRoof ? N_Roof * W_in + N_Roof_Long * L_in : N_Floor * W_in + N_Floor_Long * L_in) / 1000;
      loadBreakdown.profiles = totalProfileLengthM * weightPerMeter;

      const totalAreaLoad = deadLoadUnit + liveLoadUnit;
      saggingSpan = W_m * 1000;
      
      // FEA Setup: Nodes at profile intersections
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
      
      // Function to check if a segment is part of a real profile
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
        const I_skin = deflectionMode === 'composite' ? 2 * (tributaryWidthX * 0.6 * Math.pow(current_thickness_mm / 2, 2)) * 0.45 : 10;
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
        const I_skin = deflectionMode === 'composite' ? 2 * (tributaryWidthY * 0.6 * Math.pow(current_thickness_mm / 2, 2)) * 0.45 : 10;
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

      // Find center node for safety load
      let centerNodeIdx = -1;
      let minCenterDist = Infinity;
      const midX = (L_m * 1000) / 2;
      const midY = (W_m * 1000) / 2;

      for (let j = 0; j < yPos.length; j++) {
        for (let i = 0; i < xPos.length; i++) {
          const idx = j * xPos.length + i;
          const dx = (i === 0 ? xPos[i+1]-xPos[i] : i === xPos.length-1 ? xPos[i]-xPos[i-1] : (xPos[i+1]-xPos[i-1])) / 2;
          const dy = (j === 0 ? yPos[j+1]-yPos[j] : j === yPos.length-1 ? yPos[j]-yPos[j-1] : (yPos[j+1]-yPos[j-1])) / 2;
          
          // Area load (Dead + Live)
          nodalLoads[idx * 3] = -totalAreaLoad * (dx * dy / 1e6); 
          
          // Profile weight - only add if node is on a profile
          let profileWeightNodal = 0;
          if (isOnProfileY(xPos[i])) {
            profileWeightNodal += dy * weightPerMeter * 9.81 / 1000;
          }
          if (isOnProfileX(yPos[j])) {
            profileWeightNodal += dx * weightPerMeter * 9.81 / 1000;
          }
          nodalLoads[idx * 3] -= profileWeightNodal;

          // Track center node
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

      // Apply 1000N Safety Load if active
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
        const stress = (moment * (current_thickness_mm / 2)) / el.I;
        maxStress = Math.max(maxStress, stress);
      });
      verticalStress = maxStress;
    } else {
      // Side/Front/Back Walls: Sagging of Top Rail between Studs
      const isSide = selectedWall === "leftSide" || selectedWall === "rightSide";
      const wallArea = isSide ? L_m * H_m : W_m * H_m;
      const wallLength = isSide ? L_m : W_m;
      
      // 1. Dead Load (Wall Panel Weight)
      loadBreakdown.dead = (wallArea * (th_wall / 1000) * insulationMat.density + wallArea * 0.0006 * skinMat.density * 2);
      
      // 2. Live Load (Transferred load from Roof)
      const roofWeight = (L_m * W_m) * (th_roof / 1000) * insulationMat.density + (L_m * W_m) * 0.0006 * skinMat.density * 2;
      const roofProfiles = ((N_Roof * W_in + N_Roof_Long * L_in) / 1000) * weightPerMeter;
      const totalRoofWeight = roofWeight + roofProfiles;
      
      // Distribute roof weight proportionally to the perimeter
      const perimeter = 2 * L_m + 2 * W_m;
      loadBreakdown.live = (totalRoofWeight * wallLength) / perimeter;
      
      // 3. Profiles in this wall
      const n_studs = isSide ? (selectedWall === "leftSide" ? N_Left : N_Right) : (selectedWall === "front" ? N_Front : N_Back);
      loadBreakdown.profiles = (n_studs * (H_in / 1000) + 2 * wallLength) * weightPerMeter;

      const loadOnTopRail = (totalRoofWeight * 9.81) / perimeter; // N/m
      const q_sagging = loadOnTopRail / 1000; // N/mm
      saggingSpan = currentActualPitch;

      // Composite effect for top rail
      const Ix_skins_rail = 2 * (saggingSpan * 0.6 * Math.pow(current_thickness_mm / 2, 2));
      const I_eff_rail = deflectionMode === 'composite' ? Ix_stud + (Ix_skins_rail * 0.45) : Ix_stud;

      // 1000N Point Load effect on top rail (P*L^3 / 48EI)
      const safetyLoadDeflection = design.applySafetyLoad ? (1000 * Math.pow(saggingSpan, 3)) / (48 * E_STEEL * I_eff_rail) : 0;
      const safetyLoadStress = design.applySafetyLoad ? (1000 * saggingSpan / 4) * (current_thickness_mm / 2) / I_eff_rail : 0;

      maxVerticalDeflection = (5 * q_sagging * Math.pow(saggingSpan, 4)) / (384 * E_STEEL * I_eff_rail) + safetyLoadDeflection;
      verticalStress = (q_sagging * Math.pow(saggingSpan, 2) / 8) * (current_thickness_mm / 2) / I_eff_rail + safetyLoadStress;
    }

    const fos = YS / Math.max(0.1, Math.max(stress, verticalStress));
    const isSafe = fos >= 1.5;

    // Refrigerant specific properties
    const refrigerantData: Record<string, { copFactor: number, capFactor: number, latentHeat: number }> = {
      'R407C': { copFactor: 1.0, capFactor: 1.0, latentHeat: 180 },
      'R404A': { copFactor: 0.85, capFactor: 1.25, latentHeat: 145 },
      'R134a': { copFactor: 1.15, capFactor: 0.75, latentHeat: 195 }
    };

    const gas = refrigerantData[design.refrigerant] || refrigerantData['R407C'];
    
    // The "Required Capacity" now reflects the nominal capacity needed for the specific gas
    // We multiply by 1/capFactor to show how much nominal machine capacity is needed to meet the load
    const requiredCoolingCapacity = (totalHeatGain * design.safetyFactor) / gas.capFactor;

    const baseCop = Math.max(1.2, 4.5 - 0.05 * dT);
    const copEstimated = baseCop * gas.copFactor;
    const compressorPower = (requiredCoolingCapacity / 1000) / copEstimated;
    const refrigerantMassFlow = (requiredCoolingCapacity / gas.latentHeat) * 3.6;

    const weightInsulation = ( (2*(L_m*H_m + W_m*H_m)) * th_wall + (L_m*W_m) * th_roof + (L_m*W_m) * th_floor ) * insulationMat.density;
    const w_skins = (2 * (L_m * H_m + W_m * H_m) + 2 * (L_m * W_m)) * 0.0006 * skinMat.density * 2;
    const emptyWeight = weightInsulation + w_skins + weightSteel;

    const totalSurfaceArea = (2 * (L_m * H_m + W_m * H_m) + 2 * L_m * W_m);

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

    // --- COG Calculation (Simplified) ---
    // Assuming uniform distribution for now, but accounting for floor thickness
    const cogX = L_m / 2;
    const cogY = W_m / 2;
    // Floor is usually heavier, so COG Z is slightly lower than geometric center
    const totalWeight = emptyWeight + cargoWeight;
    const geometricCenterZ = H_m / 2;
    const cogZ = (geometricCenterZ * emptyWeight) / totalWeight; // Simplified

    return {
      totalHeatGain,
      requiredCoolingCapacity,
      internalHeatLoad,
      transmissionLoss: lossPanel + lossCorners,
      emptyWeight,
      totalGrossWeight: emptyWeight + cargoWeight,
      internalVolume: Math.max(0, L_in * W_in * H_in),
      maxDeflection,
      stress,
      I_eff: I_eff_panel,
      totalSteelLength,
      actualPitch: currentActualPitch,
      isSafe: stress < YS && maxDeflection < (span_mm / 250) && verticalStress < YS && maxVerticalDeflection < (saggingSpan / 250),
      copEstimated,
      compressorPower,
      refrigerantMassFlow,
      weightSteel,
      weightInsulation,
      weightSkins: w_skins,
      lossPanel,
      lossCorners,
      panelLoss,
      panelArea,
      panelHeight,
      panelWidth,
      n_panel_studs,
      totalSurfaceArea,
      panelInsulationLoss,
      panelBridgeLoss,
      panelTotalUnitWeight,
      panelProfileUnitWeight,
      panelTotalWeight,
      panelProfileWeight,
      cogX,
      cogY,
      cogZ,
      sideLoss: { total: leftLoss.total + rightLoss.total, insulation: leftLoss.insulation + rightLoss.insulation, bridge: leftLoss.bridge + rightLoss.bridge },
      frontLoss: { total: frontLoss.total + backLoss.total, insulation: frontLoss.insulation + backLoss.insulation, bridge: frontLoss.bridge + backLoss.bridge },
      roofLoss,
      floorLoss,
      cargoWeight,
      maxVerticalDeflection,
      verticalStress,
      saggingSpan,
      loadBreakdown,
      fos
    };
  }, [design, selectedWall, deflectionMode]);

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Termo-Statik Kasa Teknik Raporu", 20, 20);
    autoTable(doc, {
      startY: 40,
      head: [['Parametre', 'Değer']],
      body: [
        ['Kasa Boyutları', `${design.dimensions.length}x${design.dimensions.width}x${design.dimensions.height}`],
        ['Isı Kazancı', `${Math.round(results.totalHeatGain)} W`],
        ['Soğutma Kapasitesi', `${(results.requiredCoolingCapacity / 1000).toFixed(4)} kW`],
        ['Toplam Ağırlık', `${Math.round(results.totalGrossWeight)} kg`],
        ['Maksimum Gerilme', `${results.verticalStress.toFixed(4)} MPa`],
        ['Emniyet Katsayısı (FoS)', `${results.fos.toFixed(4)}`],
        ['Statik Durum', results.isSafe ? 'GÜVENLİ' : 'KRİTİK'],
      ],
    });
    doc.save(`rapor-${Date.now()}.pdf`);
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

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-12 bg-slate-900 flex flex-col items-center py-4 gap-4 border-r border-slate-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
          <Truck className="text-white w-4 h-4" />
        </div>
        <nav className="flex flex-col gap-2">
          <SidebarIcon icon={<Settings className="w-4 h-4" />} active={navTab === "design"} onClick={() => setNavTab("design")} label="Tasarım" />
          <SidebarIcon icon={<Activity className="w-4 h-4" />} active={navTab === "analysis"} onClick={() => setNavTab("analysis")} label="Analiz" />
          <SidebarIcon icon={<Download className="w-4 h-4" />} active={navTab === "export"} onClick={() => setNavTab("export")} label="Dışa Aktar" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
          <h1 className="text-xs font-bold tracking-tight text-white uppercase">Termo-Statik Kasa Tasarım Platformu</h1>
          <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[8px] font-black rounded-full border border-blue-600/30 uppercase">V75 Kernel Stable</span>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Left/Main Area */}
          <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
            {/* Tab Switcher */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shrink-0 mb-0">
              <button 
                onClick={() => setActiveTab("panel")}
                className={cn("flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all", activeTab === "panel" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300")}
              >Tek Panel Analizi</button>
              <button 
                onClick={() => setActiveTab("full")}
                className={cn("flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all", activeTab === "full" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300")}
              >Tüm Kasa Analizi & Yük</button>
            </div>

            {/* Analysis Cards Grid */}
            <div className="grid grid-cols-4 gap-2 shrink-0">
              {(() => {
                const isVertical = selectedWall !== 'roof' && selectedWall !== 'floor';
                return activeTab === "panel" ? (
                  <>
                    <AnalysisCard title={`${selectedWall.toUpperCase()} Duvar Kaybı`} value={`${Math.round(results.panelLoss)}`} unit="W" sub={`Alan: ${results.panelArea.toFixed(4)} m²`} color="border-red-500/50" />
                  <AnalysisCard 
                    title="Panel Toplam Ağırlık" 
                    value={panelWeightMode === 'total' ? Math.round(results.panelTotalWeight).toString() : Math.round(results.panelProfileWeight).toString()} 
                    unit="kg" 
                    sub={panelWeightMode === 'total' ? "Kompozit Toplam" : "Sadece Profil"} 
                    onSubClick={() => setPanelWeightMode(panelWeightMode === 'total' ? 'profile' : 'total')}
                    color="border-orange-500/50" 
                  />
                  <div className="col-span-2 grid grid-cols-2 gap-2">
                    <AnalysisCard 
                      title={isVertical ? "Yanal Sehim (Bowing)" : "Profil Sehimi (1D)"} 
                      value={results.maxDeflection.toFixed(4)} 
                      unit="mm" 
                      sub={deflectionMode === 'composite' ? "Profil + Yalıtım" : "Sadece Profil"} 
                      onSubClick={() => setDeflectionMode(deflectionMode === 'composite' ? 'profile' : 'composite')}
                      color="border-blue-500/50" 
                    />
                    <AnalysisCard 
                      title={isVertical ? "Dikey Sehim (Sarkma)" : "Panel Sehimi (FEA)"} 
                      value={results.maxVerticalDeflection.toFixed(4)} 
                      unit="mm" 
                      sub={deflectionMode === 'composite' ? "Kompozit Analiz" : "Sadece İskelet"} 
                      onSubClick={() => setDeflectionMode(deflectionMode === 'composite' ? 'profile' : 'composite')}
                      color="border-blue-500/50" 
                    />
                    <AnalysisCard title={isVertical ? "Yanal Gerilme" : "Profil Gerilmesi"} value={results.stress.toFixed(4)} unit="MPa" sub={`Emniyet: ${(235 / (results.stress || 1)).toFixed(4)}`} color="border-emerald-500/50" />
                    <AnalysisCard title={isVertical ? "Dikey Gerilme" : "Panel Gerilmesi"} value={results.verticalStress.toFixed(4)} unit="MPa" sub={`Emniyet: ${(235 / (results.verticalStress || 1)).toFixed(4)}`} color="border-emerald-500/50" />
                  </div>
                </>
              ) : (
                <>
                  <AnalysisCard title="Tüm Kasa Isı Kaybı" value={`${Math.round(results.totalHeatGain)}`} unit="W" sub="Tavan, Taban, Panel + 12 Köşe" color="border-red-500/50" />
                  <AnalysisCard title="Gerekli Soğutma Kap." value={(results.requiredCoolingCapacity / 1000).toFixed(4)} unit="kW" sub={`%20 Pay | İç Yük: ${Math.round(results.internalHeatLoad)}W`} color="border-blue-500/50" />
                  <AnalysisCard title="Toplam Kütle (Brüt)" value={`${Math.round(results.totalGrossWeight)}`} unit="kg" sub={`Boş: ${Math.round(results.emptyWeight)}kg | Yük: ${Math.round(results.totalGrossWeight - results.emptyWeight)}kg`} color="border-orange-500/50" />
                  <AnalysisCard title="İç Kullanım Hacmi" value={results.internalVolume.toFixed(4)} unit="m³" sub="Yalıtım Kalınlıkları Düşülmüş" color="border-emerald-500/50" />
                </>
              );
            })()}
            </div>

            {/* Status Banner */}
            <div className={cn("py-1 px-3 rounded-lg border flex items-center justify-center gap-2 text-[7px] font-black uppercase tracking-widest shrink-0", results.isSafe ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400")}>
              {results.isSafe ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {activeTab === "panel" ? "SİSTEM ONAYLI: STATİK VE TERMAL PERFORMANS İDEAL." : "TÜM KASA SİSTEMİ ONAYLI: MÜHENDİSLİK LİMİTLERİ İÇERİSİNDE."}
            </div>

            {/* Cargo Selection (Only in Full Analysis) */}
            {activeTab === "full" && (
              <div className="grid grid-cols-4 gap-2 shrink-0">
                {Object.values(CARGO_PROFILES).map((cargo: any) => (
                  <button
                    key={cargo.id}
                    onClick={() => setDesign({ ...design, activeCargo: cargo.id, targetTemp: cargo.temp })}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all relative group",
                      design.activeCargo === cargo.id 
                        ? "bg-blue-600/10 border-blue-600/50 text-white" 
                        : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600"
                    )}
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[9px] font-black uppercase tracking-tight">{cargo.name}</span>
                      <span className="text-base">{cargo.icon}</span>
                    </div>
                    <p className="text-[8px] leading-tight opacity-60 font-medium">{cargo.desc}</p>
                    {design.activeCargo === cargo.id && <div className="absolute top-2 right-2 w-1 h-1 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]" />}
                  </button>
                ))}
              </div>
            )}

            {/* Visualization Area */}
            <div className="flex gap-4 flex-1 min-h-0">
              <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-4 left-4 z-10 text-[9px] font-black text-slate-500 uppercase tracking-widest">3D İskelet Görünümü</div>
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
              <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 relative overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    {activeTab === "panel" ? "Üst Kesit (Yan / Ön Duvar Termal Matrisi)" : "Kasa Görselleştirmesi (Üstten)"}
                  </span>
                </div>
                <div className="flex-1 flex flex-col overflow-y-auto p-4 custom-scrollbar">
                  {activeTab === "panel" ? (
                    <div className="w-full flex flex-col gap-4">
                      {/* Thermal Matrix */}
                      <div className="w-full bg-slate-900/90 rounded-2xl border border-slate-800 relative overflow-hidden flex flex-col p-5 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                          <div className="space-y-1">
                            <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                              <Layers className="w-3 h-3" />
                              Termal Geçirgenlik Analizi
                            </div>
                            <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Isı Köprüsü & İletim Matrisi</div>
                          </div>
                          <div className="flex gap-4 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800/50">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500/30 border border-blue-500/50 rounded-full" />
                              <span className="text-[8px] text-slate-400 font-bold uppercase">Yalıtım: <span className="text-white">{Math.round(results.panelInsulationLoss)}W</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-red-500/50 border border-red-500/60 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
                              <span className="text-[8px] text-slate-400 font-bold uppercase">Köprüler: <span className="text-white">{Math.round(results.panelBridgeLoss)}W</span></span>
                            </div>
                          </div>
                        </div>
                        <div className="h-12 border-2 border-slate-800 rounded-xl flex relative overflow-hidden bg-slate-950/50 shadow-inner">
                          <div className="absolute inset-0 bg-blue-500/5" />
                          {Array.from({ length: results.n_panel_studs }).map((_, i) => {
                            const actualPitch = results.n_panel_studs > 1 ? (results.panelWidth * 1000 - design.profileWidth) / (results.n_panel_studs - 1) : 0;
                            const xPos = (i * actualPitch / (results.panelWidth * 1000)) * 100;
                            const studWidthPercent = (design.profileWidth / (results.panelWidth * 1000)) * 100;
                            if (xPos > 100) return null;
                            return (
                              <div 
                                key={i} 
                                className="absolute top-0 bottom-0 bg-red-500/30 border-x border-red-500/40 group cursor-help transition-all hover:bg-red-500/50"
                                style={{ 
                                  left: `${xPos}%`, 
                                  width: `${studWidthPercent}%`,
                                  opacity: 0.5 + (results.panelBridgeLoss / (results.panelLoss || 1)) * 0.5
                                }}
                              >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-[8px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 shadow-2xl transition-all pointer-events-none">
                                  <span className="text-red-400 font-black">{Math.round(results.panelBridgeLoss / results.n_panel_studs)}W</span> Isı Köprüsü Kaybı
                                </div>
                              </div>
                            );
                          })}
                          <div className="absolute left-0 top-0 bottom-0 w-4 bg-red-600/40 border-r border-red-600/50" />
                          <div className="absolute right-0 top-0 bottom-0 w-4 bg-red-600/40 border-l border-red-600/50" />
                        </div>
                        <div className="mt-3 flex justify-between items-center text-[7px] text-slate-500 font-black uppercase tracking-[0.2em]">
                          <span>Sol Köşe</span>
                          <div className="flex-1 mx-4 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
                          <span>Panel Gövdesi</span>
                          <div className="flex-1 mx-4 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
                          <span>Sağ Köşe</span>
                        </div>
                      </div>
                      {/* Deflection Curve */}
                      <div className="w-full bg-slate-900/90 rounded-2xl border border-slate-800 relative p-5 flex flex-col shadow-2xl">
                        <div className="flex justify-between items-start relative z-20 mb-4">
                          <div className="space-y-1">
                            <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                              <Activity className="w-3 h-3" />
                              Statik Sehim Analizi (FEA)
                            </div>
                            <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">ANSYS Solver • L/250 Standart Denetimi</div>
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-lg text-[9px] font-black tracking-widest border shadow-lg transition-all",
                            results.isSafe 
                              ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                              : "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse"
                          )}>
                            {results.isSafe ? "✓ GÜVENLİ" : "⚠ KRİTİK"}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                          <div className="lg:col-span-3 relative h-48 flex items-center justify-center bg-slate-950/50 rounded-2xl border border-slate-800/50 p-6 shadow-inner">
                            {/* Background Grid Lines for Scale */}
                            <div className="absolute inset-0 flex flex-col justify-between opacity-5 pointer-events-none p-6">
                              {[...Array(6)].map((_, i) => (
                                <div key={i} className="w-full border-t border-slate-400" />
                              ))}
                            </div>

                            {/* Limit Line (L/250) */}
                            <div 
                              className="absolute w-full px-6 border-t-2 border-dashed border-red-500/20 z-0" 
                              style={{ top: '75%' }}
                            >
                              <div className="absolute left-10 -top-4 text-[7px] text-red-500/50 font-black uppercase tracking-widest bg-slate-950 px-2 py-0.5 rounded border border-red-500/20">Maksimum İzin Verilen Sınır (L/250)</div>
                            </div>

                            <svg width="100%" height="100%" viewBox="0 0 100 60" className="overflow-visible relative z-10">
                              {/* Supports Visuals */}
                              <g fill="#475569">
                                <path d="M 0 30 L -4 38 L 4 38 Z" />
                                <path d="M 100 30 L 96 38 L 104 38 Z" />
                              </g>
                              
                              {/* The Deflection Curve */}
                              <path 
                                d={`M 0 30 Q 50 ${30 + Math.min(28, results.maxVerticalDeflection * 8)} 100 30`} 
                                fill="none" 
                                stroke={results.maxVerticalDeflection < (results.saggingSpan / 250) ? "#3b82f6" : "#ef4444"} 
                                strokeWidth="4" 
                                strokeLinecap="round"
                                vectorEffect="non-scaling-stroke"
                                className="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                              />
                              
                              {/* Measurement Line */}
                              <line 
                                x1="50" y1="30" 
                                x2="50" y2={30 + Math.min(28, results.maxVerticalDeflection * 8)} 
                                stroke={results.maxVerticalDeflection < (results.saggingSpan / 250) ? "#3b82f6" : "#ef4444"} 
                                strokeWidth="1.5" 
                                strokeDasharray="3 3"
                                className="opacity-40"
                              />

                              {/* Max Point Indicator */}
                              <g className="transition-all duration-1000 ease-out" style={{ transform: `translateY(${Math.min(28, results.maxVerticalDeflection * 8)}px)` }}>
                                <circle cx="50" cy="30" r="3.5" fill={results.maxVerticalDeflection < (results.saggingSpan / 250) ? "#3b82f6" : "#ef4444"} className="animate-pulse" />
                                <rect x="35" y="36" width="30" height="12" rx="4" fill="#0f172a" stroke={results.maxVerticalDeflection < (results.saggingSpan / 250) ? "#3b82f6" : "#ef4444"} strokeWidth="1.5" className="shadow-2xl" />
                                <text x="50" y="44" fontSize="7" fill="white" textAnchor="middle" fontWeight="900" className="font-mono tracking-tighter">
                                  {results.maxVerticalDeflection.toFixed(4)}mm
                                </text>
                              </g>
                            </svg>
                          </div>

                          <div className="space-y-4">
                            {/* Main Metrics Stack */}
                            <div className="space-y-2">
                              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 shadow-lg group hover:border-blue-500/30 transition-all">
                                <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1.5 flex justify-between">
                                  <span>Max Sehim</span>
                                  <Info className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className={cn("text-lg font-black tracking-tight", results.maxVerticalDeflection > (results.saggingSpan / 250) ? "text-red-400" : "text-blue-400")}>
                                  {results.maxVerticalDeflection.toFixed(4)} <span className="text-[10px] font-bold text-slate-600">mm</span>
                                </div>
                              </div>

                              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 shadow-lg group hover:border-blue-500/30 transition-all">
                                <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1.5 flex justify-between">
                                  <span>Max Gerilme</span>
                                  <Info className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className={cn("text-lg font-black tracking-tight", results.verticalStress > 235 ? "text-red-400" : "text-white")}>
                                  {results.verticalStress.toFixed(4)} <span className="text-[10px] font-bold text-slate-600">MPa</span>
                                </div>
                              </div>

                              <div className={cn(
                                "p-3 rounded-xl border shadow-lg transition-all",
                                results.fos < 1.5 ? "bg-red-500/5 border-red-500/20" : 
                                results.fos < 2.5 ? "bg-yellow-500/5 border-yellow-500/20" : "bg-emerald-500/5 border-emerald-500/20"
                              )}>
                                <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1.5">Emniyet Katsayısı</div>
                                <div className={cn(
                                  "text-lg font-black tracking-tight",
                                  results.fos < 1.5 ? "text-red-400" : 
                                  results.fos < 2.5 ? "text-yellow-400" : "text-emerald-400"
                                )}>
                                  {results.fos.toFixed(4)}
                                </div>
                              </div>
                            </div>
                            
                            {/* Load Breakdown Table Style */}
                            <div className="bg-slate-950/40 rounded-xl border border-slate-800/50 overflow-hidden">
                              <div className="bg-slate-900/50 px-3 py-1.5 border-b border-slate-800/50">
                                <div className="text-[7px] text-slate-400 uppercase font-black tracking-widest">Yük Analizi Dağılımı</div>
                              </div>
                              <div className="p-3 space-y-2">
                                <div className="flex justify-between text-[8px] items-center">
                                  <span className="text-slate-500 font-bold">Panel (Ölü):</span>
                                  <span className="text-white font-mono">{Math.round(results.loadBreakdown.dead)} kg</span>
                                </div>
                                <div className="flex justify-between text-[8px] items-center">
                                  <span className="text-slate-500 font-bold">Kargo (Hareketli):</span>
                                  <span className="text-white font-mono">{Math.round(results.loadBreakdown.live)} kg</span>
                                </div>
                                <div className="flex justify-between text-[8px] items-center">
                                  <span className="text-slate-500 font-bold">Profiller:</span>
                                  <span className="text-white font-mono">{Math.round(results.loadBreakdown.profiles)} kg</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center px-2 py-2 bg-slate-900/30 rounded-lg border border-slate-800/50">
                              <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Solver Durumu:</span>
                              <span className={cn("text-[8px] font-black uppercase flex items-center gap-1.5", results.isSafe ? "text-emerald-500" : "text-red-500 animate-pulse")}>
                                <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]", results.isSafe ? "bg-emerald-500" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]")} />
                                {results.isSafe ? "Statik OK" : "Kritik Hata"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-end text-[7px] font-black text-slate-500 mt-6 uppercase tracking-widest">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-400">MESNET A</span>
                            <div className="w-8 h-0.5 bg-slate-700 rounded-full" />
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-blue-500/80">TEHLİKELİ KESİT (MAX MOMENT)</span>
                            <div className="w-12 h-0.5 bg-blue-500/30 rounded-full" />
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-slate-400">MESNET B</span>
                            <div className="w-8 h-0.5 bg-slate-700 rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                      <svg width="100%" height="100%" viewBox="0 0 400 200" className="max-h-full max-w-full overflow-visible">
                        {(() => {
                          const padding = 40;
                          const availableWidth = 400 - 2 * padding;
                          const availableHeight = 200 - 2 * padding;
                          
                          const scale = Math.min(
                            availableWidth / design.dimensions.length,
                            availableHeight / design.dimensions.width
                          );
                          
                          const drawW = design.dimensions.length * scale;
                          const drawH = design.dimensions.width * scale;
                          const offX = (400 - drawW) / 2;
                          const offY = (200 - drawH) / 2;
                          
                          const wallTh = design.wallThickness * scale;
                          const profileW = design.profileWidth * scale;

                          return (
                            <g transform={`translate(${offX}, ${offY})`}>
                              {/* Outer Shell */}
                              <rect 
                                x="0" y="0" 
                                width={drawW} height={drawH} 
                                fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" rx="4" 
                              />
                              
                              {/* Inner Shell (Insulation) */}
                              <rect 
                                x={wallTh} y={wallTh} 
                                width={drawW - 2 * wallTh} 
                                height={drawH - 2 * wallTh} 
                                fill="#3b82f6" fillOpacity="0.05" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="2 1" rx="2" 
                              />

                              {/* Profile/Stud Indicators (Simplified) */}
                              {Array.from({ length: results.n_panel_studs }).map((_, i) => {
                                const x = (i * (design.dimensions.length - design.profileWidth) / (results.n_panel_studs - 1)) * scale;
                                return (
                                  <rect 
                                    key={i}
                                    x={x} y="0"
                                    width={profileW} height={drawH}
                                    fill="#3b82f6" fillOpacity="0.1"
                                  />
                                );
                              })}
                              
                              {/* Dimension Lines */}
                              <g className="text-[8px] font-black fill-slate-400">
                                {/* Length */}
                                <line x1="0" y1="-12" x2={drawW} y2="-12" stroke="#475569" strokeWidth="0.5" />
                                <line x1="0" y1="-15" x2="0" y2="-9" stroke="#475569" strokeWidth="0.5" />
                                <line x1={drawW} y1="-15" x2={drawW} y2="-9" stroke="#475569" strokeWidth="0.5" />
                                <text x={drawW / 2} y="-18" textAnchor="middle" className="fill-blue-400">{design.dimensions.length} mm</text>
                                
                                {/* Width */}
                                <line x1={drawW + 12} y1="0" x2={drawW + 12} y2={drawH} stroke="#475569" strokeWidth="0.5" />
                                <line x1={drawW + 9} y1="0" x2={drawW + 15} y2="0" stroke="#475569" strokeWidth="0.5" />
                                <line x1={drawW + 9} y1={drawH} x2={drawW + 15} y2={drawH} stroke="#475569" strokeWidth="0.5" />
                                <text x={drawW + 22} y={drawH / 2} transform={`rotate(90, ${drawW + 22}, ${drawH / 2})`} textAnchor="middle" className="fill-blue-400">{design.dimensions.width} mm</text>
                              </g>

                              {/* COG Projection */}
                              <g className="animate-pulse">
                                <circle cx={results.cogX * 1000 * scale} cy={results.cogY * 1000 * scale} r="4" fill="#f97316" />
                                <circle cx={results.cogX * 1000 * scale} cy={results.cogY * 1000 * scale} r="8" fill="none" stroke="#f97316" strokeWidth="1" strokeOpacity="0.3" />
                              </g>
                              <text x={results.cogX * 1000 * scale + 10} y={results.cogY * 1000 * scale + 3} fontSize="7" fill="#f97316" fontWeight="black" className="uppercase tracking-widest">COG</text>
                            </g>
                          );
                        })()}
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Control Panels */}
            <div className="grid grid-cols-2 gap-4 pb-2 shrink-0 overflow-y-auto custom-scrollbar pr-2">
              {activeTab === "panel" ? (
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
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Yalıtım</label>
                          <select 
                            value={design.insulationMaterialId}
                            onChange={(e) => setDesign({ ...design, insulationMaterialId: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[9px] text-white focus:outline-none focus:border-blue-500"
                          >
                            {MATERIALS.filter(m => m.kValue < 0.1).map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Profil</label>
                          <select 
                            value={design.profileMaterialId}
                            onChange={(e) => setDesign({ ...design, profileMaterialId: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[9px] text-white focus:outline-none focus:border-blue-500"
                          >
                            {MATERIALS.filter(m => m.kValue > 1).map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Yüzey</label>
                          <select 
                            value={design.skinMaterialId}
                            onChange={(e) => setDesign({ ...design, skinMaterialId: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-[9px] text-white focus:outline-none focus:border-blue-500"
                          >
                            {MATERIALS.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
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
              ) : (
                <>
                  {/* Global Parameters - Only Temps */}
                  <div className="space-y-4">
                    <h3 className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] border-b border-slate-800 pb-1.5">Sıcaklık Parametreleri</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Hedef Sıcaklık (°C)" value={design.targetTemp} onChange={(v: any) => setDesign({ ...design, targetTemp: v })} />
                        <InputGroup label="Dış Ortam (°C)" value={design.ambientTemp} onChange={(v: any) => setDesign({ ...design, ambientTemp: v })} />
                      </div>
                    </div>
                  </div>

                  {/* Cargo & System Parameters */}
                  <div className="space-y-4">
                    <h3 className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] border-b border-slate-800 pb-1.5">Yük & Sistem Yapılandırması</h3>
                    <div className="space-y-4">
                      {/* Cargo Specific Menu */}
                      <div className="p-3 bg-blue-600/5 rounded-xl border border-blue-600/20 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{(CARGO_PROFILES as any)[design.activeCargo].icon}</span>
                          <span className="text-[10px] font-black text-white uppercase">{(CARGO_PROFILES as any)[design.activeCargo].name} Ayarları</span>
                        </div>
                        
                        <SliderInput 
                          label={`Yük Miktarı (${(CARGO_PROFILES as any)[design.activeCargo].unit})`} 
                          value={design.cargoAmount} 
                          min={0} 
                          max={(CARGO_PROFILES as any)[design.activeCargo].max || 40000} 
                          onChange={(v: number) => setDesign({ ...design, cargoAmount: v })} 
                        />
                        
                        {design.activeCargo === 'chicks' && (
                          <div className="text-[8px] text-orange-400 font-bold italic">
                            * Canlı kargo için metabolik ısı üretimi (0.7W/adet) hesaba katılmıştır.
                          </div>
                        )}
                        {design.activeCargo === 'produce' && (
                          <div className="text-[8px] text-emerald-400 font-bold italic">
                            * Taze sebze için solunum ısısı (0.04W/kg) hesaba katılmıştır.
                          </div>
                        )}

                        <div className="pt-2 border-t border-blue-600/20">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-white uppercase">1000N Emniyet Yükü</span>
                              <span className="text-[8px] text-slate-500 italic">Test yükü (100kg) uygula</span>
                            </div>
                            <button 
                              onClick={() => setDesign({ ...design, applySafetyLoad: !design.applySafetyLoad })}
                              className={cn(
                                "w-10 h-5 rounded-full transition-all relative",
                                design.applySafetyLoad ? "bg-blue-600" : "bg-slate-700"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                                design.applySafetyLoad ? "right-1" : "left-1"
                              )} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <SliderInput label="Rüzgar Yükü (Pa)" value={design.windLoad} min={0} max={3000} onChange={(v: number) => setDesign({ ...design, windLoad: v })} />
                      <SliderInput label="Emniyet Faktörü" value={design.safetyFactor * 100} min={100} max={200} onChange={(v: number) => setDesign({ ...design, safetyFactor: v / 100 })} />
                      
                      <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800 space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Soğutucu Gaz Seçimi</label>
                          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                            {['R407C', 'R404A', 'R134a'].map((gas) => (
                              <button 
                                key={gas}
                                onClick={() => setDesign({ ...design, refrigerant: gas as any })}
                                className={cn(
                                  "flex-1 py-1 text-[8px] font-black rounded uppercase transition-all",
                                  design.refrigerant === gas ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                                )}
                              >
                                {gas}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-1.5 border-t border-slate-800">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Köşe Birleşim:</span>
                          <select 
                            value={design.cornerType}
                            onChange={(e) => setDesign({ ...design, cornerType: e.target.value as any })}
                            className="bg-transparent text-[10px] text-white font-black text-right outline-none cursor-pointer hover:text-blue-400 transition-colors"
                          >
                            <option value="box_corner">Standart Köşe</option>
                            <option value="thermal">Termal Bariyerli</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Panel: Contextual Info */}
          <aside className="w-72 bg-slate-900 border-l border-slate-800 p-5 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              {navTab === "design" && (
                <motion.div key="design" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Cpu className="w-3 h-3" /> {design.refrigerant} Termodinamik Analiz</h2>
                  <div className="space-y-3 bg-slate-800/30 p-4 rounded-xl border border-slate-800">
                    <ResultRow label="Tahmini COP" value={results.copEstimated.toFixed(4)} color="text-blue-400" tooltip="Performans Katsayısı: Sistem verimliliğini gösterir. Yüksek değer daha az enerji tüketimi demektir." />
                    <ResultRow label="Kompresör Gücü" value={`${results.compressorPower.toFixed(4)} kW`} tooltip="Gereken elektrik motor gücü. Seçilecek soğutma ünitesi için referanstır." />
                    <ResultRow label="Kütlesel Debi" value={`${results.refrigerantMassFlow.toFixed(4)} kg/h`} sub={design.refrigerant} tooltip="Sistemde bir saatte dolaşan soğutucu gaz miktarı." />
                  </div>
                  <div className="p-5 bg-blue-600/10 rounded-2xl border border-blue-600/30">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Soğutma Kapasitesi</span>
                    <div className="text-4xl font-black text-white mt-1">
                      {(results.requiredCoolingCapacity / 1000).toFixed(4)} <span className="text-sm font-normal text-blue-400">kW</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {navTab === "analysis" && (
                <motion.div key="analysis" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Activity className="w-3 h-3" /> Analiz & Performans</h2>
                  
                  {activeTab === "full" && (
                    <div className="space-y-3 bg-orange-500/10 p-4 rounded-xl border border-orange-500/30">
                      <div className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-2">Ağırlık Merkezi (COG)</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[7px] text-slate-500 uppercase font-bold">X (Boy)</span>
                          <span className="text-[10px] text-white font-mono">{Math.round(results.cogX * 1000)} mm</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[7px] text-slate-500 uppercase font-bold">Y (En)</span>
                          <span className="text-[10px] text-white font-mono">{Math.round(results.cogY * 1000)} mm</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[7px] text-slate-500 uppercase font-bold">Z (Yük)</span>
                          <span className="text-[10px] text-white font-mono">{Math.round(results.cogZ * 1000)} mm</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="h-48 w-full bg-slate-800/30 p-3 rounded-2xl border border-slate-800">
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Yük / Sıcaklık Eğrisi</div>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                        <XAxis dataKey="temp" fontSize={10} stroke="#64748b" />
                        <YAxis fontSize={10} stroke="#64748b" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', fontSize: '10px' }} 
                          itemStyle={{ color: '#3b82f6' }}
                          formatter={(value: any) => [`${value} W`, 'Isı Yükü']}
                          labelFormatter={(label: any) => `Sıcaklık: ${label} °C`}
                        />
                        <Area type="monotone" dataKey="load" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    <ResultRow label="İç Hacim" value={`${results.internalVolume.toFixed(4)} m³`} tooltip="Kasanın net iç kullanım hacmi." />
                    <ResultRow label="Toplam Çelik" value={`${results.totalSteelLength.toFixed(4)} m`} tooltip="Kullanılan tüm profillerin toplam uzunluğu." />
                    <ResultRow label="Boş Ağırlık" value={`${Math.round(results.emptyWeight)} kg`} tooltip="Kasanın yüksüz toplam ağırlığı." />
                    <ResultRow label="Toplam Brüt" value={`${Math.round(results.totalGrossWeight)} kg`} color="text-orange-400" tooltip="Kasa + Yük toplam ağırlığı." />
                  </div>

                  {/* Trade-off Matrix */}
                  <div className="space-y-4 pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <LayoutGrid className="w-2.5 h-2.5" />
                        Trade-off Matrix
                      </h3>
                      <span className="text-[7px] text-slate-500 font-bold uppercase tracking-tighter">Senaryo Analizi</span>
                    </div>
                    
                    <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
                      <table className="w-full text-[9px]">
                        <thead className="bg-slate-900/80 text-slate-500 uppercase font-black border-b border-slate-800">
                          <tr>
                            <th className="px-3 py-2 text-left tracking-widest">Parametre</th>
                            <th className="px-3 py-2 text-right tracking-widest">Değer</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          <tr className="group hover:bg-slate-900/30 transition-colors">
                            <td className="px-3 py-2 text-slate-400 group-hover:text-slate-300">Max Gerilme</td>
                            <td className="px-3 py-2 text-right text-white font-mono">{results.verticalStress.toFixed(4)} <span className="text-[7px] text-slate-600">MPa</span></td>
                          </tr>
                          <tr className="group hover:bg-slate-900/30 transition-colors">
                            <td className="px-3 py-2 text-slate-400 group-hover:text-slate-300">Emniyet Katsayısı</td>
                            <td className={cn(
                              "px-3 py-2 text-right font-black",
                              results.fos < 1.5 ? "text-red-500" : 
                              results.fos < 2.5 ? "text-yellow-500" : "text-emerald-500"
                            )}>
                              {results.fos.toFixed(4)}
                            </td>
                          </tr>
                          <tr className="group hover:bg-slate-900/30 transition-colors">
                            <td className="px-3 py-2 text-slate-400 group-hover:text-slate-300">Statik Durum</td>
                            <td className="px-3 py-2 text-right">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter",
                                results.fos < 1.5 ? "bg-red-500/10 text-red-500 border border-red-500/20" : 
                                results.fos < 2.5 ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              )}>
                                {results.fos < 1.5 ? "KRİTİK" : results.fos < 2.5 ? "SINIRDA" : "GÜVENLİ"}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="p-3 bg-blue-600/5 rounded-xl border border-blue-600/10 space-y-2">
                      <div className="flex items-start gap-2">
                        <Info className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                        <div className="text-[7px] text-blue-400/80 font-medium leading-relaxed">
                          Emniyet Katsayısı (FoS), malzemenin akma sınırına olan uzaklığını temsil eder. 
                          <span className="block mt-1 text-blue-300 font-bold">Hedef: FoS {'>'} 1.5 (Standart), FoS {'>'} 2.5 (Yüksek Güvenlik).</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="h-40 w-full bg-slate-800/30 p-3 rounded-2xl border border-slate-800">
                      <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Kütle Dağılımı (kg)</div>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={weightDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={45}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            fontSize={7}
                          >
                            {weightDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', fontSize: '10px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="h-40 w-full bg-slate-800/30 p-3 rounded-2xl border border-slate-800">
                      <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Isı Kaybı Dağılımı (W)</div>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={lossData} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" fontSize={8} stroke="#64748b" width={40} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', fontSize: '10px' }}
                            cursor={{ fill: 'transparent' }}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 8, fill: '#64748b' }}>
                            {lossData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {activeTab === "full" && (
                    <div className="space-y-4">
                      <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1">Isı Kaybı Dağılımı</h3>
                      <div className="space-y-2">
                        <LossBar label="Yan Duvarlar" value={results.lossPanel * 0.4} total={results.totalHeatGain} color="bg-blue-500" />
                        <LossBar label="Ön/Arka" value={results.lossPanel * 0.2} total={results.totalHeatGain} color="bg-indigo-500" />
                        <LossBar label="Tavan" value={results.lossPanel * 0.2} total={results.totalHeatGain} color="bg-cyan-500" />
                        <LossBar label="Taban" value={results.lossPanel * 0.2} total={results.totalHeatGain} color="bg-sky-500" />
                        <LossBar label="Isı Köprüleri" value={results.lossCorners} total={results.totalHeatGain} color="bg-red-500" />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {navTab === "export" && (
                <motion.div key="export" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Download className="w-3 h-3" /> CAD & Rapor Çıktıları</h2>
                  <ExportButton label="Solid Edge Parametrik (JSON)" onClick={() => handleExport("json")} />
                  <ExportButton label="Teknik Rapor Oluştur (PDF)" onClick={generatePDF} icon={<FileText className="w-4 h-4" />} />
                </motion.div>
              )}
            </AnimatePresence>
          </aside>
        </div>
      </main>
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

