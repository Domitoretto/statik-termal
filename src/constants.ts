import { Material } from "./types";

export const MATERIALS: Material[] = [
  { id: "pu", name: "Polyurethane (PU)", kValue: 0.022, density: 40 },
  { id: "pir", name: "Polyisocyanurate (PIR)", kValue: 0.020, density: 45 },
  { id: "grp", name: "Glass Reinforced Plastic (GRP)", kValue: 0.25, density: 1600 },
  { id: "steel", name: "Stainless Steel", kValue: 15, density: 7850 },
  { id: "aluminum", name: "Aluminum", kValue: 200, density: 2700 },
  { id: "xps", name: "Extruded Polystyrene (XPS)", kValue: 0.034, density: 35 },
];

export const INSULATION_MATERIALS: Material[] = [
  { id: "pu", name: "Polyurethane (PU)", kValue: 0.022, density: 40 },
  { id: "pir", name: "Polyisocyanurate (PIR)", kValue: 0.020, density: 45 },
  { id: "xps", name: "Extruded Polystyrene (XPS)", kValue: 0.034, density: 35 },
];

export const PROFILE_MATERIALS: Material[] = [
  { id: "steel", name: "Stainless Steel", kValue: 15, density: 7850 },
  { id: "aluminum", name: "Aluminum", kValue: 200, density: 2700 },
];


export const PSI_VALUES: Record<string, number> = {
  box_corner: 0.55,
  standard: 0.35,
  thermal: 0.15,
};

// Refrigerant Properties
export const REFRIGERANT_PROPERTIES = {
  'R407C': {
    name: 'R407C',
    copFactor: 1.0,
    capFactor: 1.0,
    latentHeat: 180,
    evapTemp: -10,
    condTemp: 45,
    glideTemp: 7.0,
    oilType: 'POE'
  },
  'R404A': {
    name: 'R404A',
    copFactor: 0.85,
    capFactor: 1.25,
    latentHeat: 145,
    evapTemp: -15,
    condTemp: 50,
    glideTemp: 0.1,
    oilType: 'POE'
  },
  'R134a': {
    name: 'R134a',
    copFactor: 1.15,
    capFactor: 0.75,
    latentHeat: 195,
    evapTemp: -5,
    condTemp: 40,
    glideTemp: 0.0,
    oilType: 'PAG'
  }
};

export const CARGO_PROFILES = {
  empty: { id: "empty", name: "Boş Kasa", icon: "📦", temp: 0, heatPerUnit: 0, unit: "-", weightPerUnit: 0, max: 0, desc: "Referans taşıma. Yük yok." },
  icecream: { id: "icecream", name: "Dondurma", icon: "🍦", temp: -20, heatPerUnit: 0, unit: "kg", weightPerUnit: 1, max: 28000, desc: "İletim kaybı. Isı üretimi 0W." },
  produce: { id: "produce", name: "Taze Sebze", icon: "🥬", temp: 4, heatPerUnit: 0.04, unit: "kg", weightPerUnit: 1, max: 28000, desc: "Yüksek ağırlık, Düşük solunum ısısı." },
  chicks: { id: "chicks", name: "Canlı Civciv", icon: "🐥", temp: 30, heatPerUnit: 0.7, unit: "Adet", weightPerUnit: 0.05, max: 40000, desc: "Hafif kütle, YÜKSEK metabolik ısı." }
};

export const DEFAULT_DESIGN: any = {
  dimensions: { length: 8900, width: 2600, height: 2600 },
  insulationMaterialId: "pu",
  skinMaterialId: "grp",
  profileMaterialId: "steel",
  wallThickness: 80,
  roofThickness: 100,
  floorThickness: 120,
  ambientTemp: 40,
  targetTemp: 0,
  ventilationRate: 0,
  safetyFactor: 1.2,
  
  // Per-wall configurations
  wallConfigs: {
    leftSide: { pitchMode: 'pitch', profilePitch: 650, profileCount: 15 },
    rightSide: { pitchMode: 'pitch', profilePitch: 650, profileCount: 15 },
    front: { pitchMode: 'pitch', profilePitch: 650, profileCount: 5 },
    back: { pitchMode: 'pitch', profilePitch: 650, profileCount: 5 },
    roof: { pitchMode: 'pitch', profilePitch: 650, profileCount: 15, longitudinalPitchMode: 'pitch', longitudinalPitch: 650, longitudinalCount: 5 },
    floor: { pitchMode: 'pitch', profilePitch: 650, profileCount: 15, longitudinalPitchMode: 'pitch', longitudinalPitch: 650, longitudinalCount: 5 },
  },

  profileWidth: 40,
  profileDepth: 40,
  profileThickness: 2,
  profileType: 'box',
  cornerType: 'box_corner',
  windLoad: 1200,
  activeCargo: 'empty',
  cargoAmount: 0,
  refrigerant: 'R407C',
  applySafetyLoad: false,

  // Thermal Control Parameters
  humidityControl: false,
  targetHumidity: 65,
  airFlowRate: 120,
  evaporatorTemp: -10,
  condenserTemp: 45,
  compressorCapacity: 5,
  energyTarget: 80,
  // Cargo-specific thermal parameters
  cargoPreCoolTime: 4,
  cargoTransitHours: 12,
  cargoRespirationFactor: 2,
  cargoMetabolicFactor: 3,
  cargoVentReq: 50
};
