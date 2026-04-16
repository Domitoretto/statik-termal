import { create } from 'zustand';
import { DEFAULT_DESIGN } from './constants';

interface DesignStore {
  design: any;
  setDesign: (newDesign: any) => void;
  updateDimensions: (dimensions: any) => void;
  updateLayers: (layers: any) => void;
  updateThermalParams: (params: any) => void;
}

export const useDesignStore = create<DesignStore>((set) => ({
  design: DEFAULT_DESIGN,
  setDesign: (newDesign) => set({ design: newDesign }),
  updateDimensions: (dimensions) => set((state) => ({ 
    design: { ...state.design, dimensions: { ...state.design.dimensions, ...dimensions } } 
  })),
  updateLayers: (layers) => set((state) => ({ 
    design: { ...state.design, wallLayers: layers } 
  })),
  updateThermalParams: (params) => set((state) => ({
    design: { ...state.design, ...params }
  })),
}));

