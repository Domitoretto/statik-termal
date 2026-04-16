export interface Material {
  id: string;
  name: string;
  kValue: number; // W/mK
  density: number; // kg/m3
}

export interface WallLayer {
  materialId: string;
  thickness: number; // mm
}

export interface BoxDimensions {
  length: number; // mm
  width: number; // mm
  height: number; // mm
}

export interface WallConfig {
  pitchMode: 'pitch' | 'count';
  profilePitch: number;
  profileCount: number;
  longitudinalPitchMode?: 'pitch' | 'count';
  longitudinalPitch?: number;
  longitudinalCount?: number;
}

export interface DesignParameters {
  dimensions: BoxDimensions;
  insulationMaterialId: string;
  skinMaterialId: string;
  profileMaterialId: string;
  wallThickness: number;
  roofThickness: number;
  floorThickness: number;
  ambientTemp: number;
  targetTemp: number;
  ventilationRate: number;
  safetyFactor: number;
  
  wallConfigs: {
    leftSide: WallConfig;
    rightSide: WallConfig;
    front: WallConfig;
    back: WallConfig;
    roof: WallConfig;
    floor: WallConfig;
  };

  profileWidth: number;
  profileDepth: number;
  profileThickness: number;
  profileType: 'box' | 'c-shape';
  cornerType: 'box_corner' | 'standard' | 'thermal';
  windLoad: number;
  activeCargo: string;
  cargoAmount: number;
  refrigerant: 'R407C' | 'R404A' | 'R134a';
  applySafetyLoad: boolean;

  // Thermal Control Parameters
  humidityControl: boolean;
  targetHumidity: number; // %
  airFlowRate: number; // m³/h
  evaporatorTemp: number; // °C
  condenserTemp: number; // °C
  compressorCapacity: number; // kW
  energyTarget: number; // kWh/24h - hedef enerji tüketimi
  // Cargo-specific thermal parameters
  cargoPreCoolTime: number; // h
  cargoTransitHours: number; // h
  cargoRespirationFactor: number; // multiplier
  cargoMetabolicFactor: number; // multiplier
  cargoVentReq: number; // m³/h
}

export interface CalculationResults {
  totalHeatGain: number;
  requiredCoolingCapacity: number;
  internalHeatLoad: number;
  transmissionLoss: number;
  emptyWeight: number;
  totalGrossWeight: number;
  internalVolume: number;
  maxDeflection: number;
  stress: number;
  I_eff: number;
  totalSteelLength: number;
  actualPitch: number;
  isSafe: boolean;
  // Advanced Thermodynamics
  copEstimated: number;
  compressorPower: number; // kW
  refrigerantMassFlow: number; // kg/h
  // Breakdowns for UI
  weightSteel: number;
  weightInsulation: number;
  lossPanel: number;
  lossCorners: number;
  ventilationHeatLoad: number;
  infiltrationLoad: number;
  panelLoss: number;
  panelArea: number;
  panelHeight: number;
  panelWidth: number;
  n_panel_studs: number;
  totalSurfaceArea: number;
  panelInsulationLoss: number;
  panelBridgeLoss: number;
  panelTotalUnitWeight: number;
  panelProfileUnitWeight: number;
  panelTotalWeight: number;
  panelProfileWeight: number;
  cogX: number;
  cogY: number;
  cogZ: number;
  weightSkins: number;
  sideLoss: { total: number; insulation: number; bridge: number };
  frontLoss: { total: number; insulation: number; bridge: number };
  roofLoss: { total: number; insulation: number; bridge: number };
  floorLoss: { total: number; insulation: number; bridge: number };
  cargoWeight: number;
  maxVerticalDeflection: number;
  verticalStress: number;
  saggingSpan: number;
  loadBreakdown: { dead: number; live: number; profiles: number };
  fos: number;
}
