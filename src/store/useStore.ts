import { create } from 'zustand';

// Point with pressure data
export interface Point {
    x: number;
    y: number;
    pressure: number;
}

// Completed stroke
export interface Stroke {
    points: Point[];
    color: string;
    size: number;
}

// Stroke configuration
export interface StrokeConfig {
    color: string;
    size: number;
}

// Store state
interface CanvasState {
    strokes: Stroke[];
    currentConfig: StrokeConfig;

    // Actions
    addStroke: (stroke: Stroke) => void;
    setStrokeConfig: (config: Partial<StrokeConfig>) => void;
    clearStrokes: () => void;
}

export const useStore = create<CanvasState>((set) => ({
    // Initial state
    strokes: [],
    currentConfig: {
        color: '#000000',
        size: 8,
    },

    // Add completed stroke to history
    addStroke: (stroke) =>
        set((state) => ({
            strokes: [...state.strokes, stroke],
        })),

    // Update stroke configuration
    setStrokeConfig: (config) =>
        set((state) => ({
            currentConfig: { ...state.currentConfig, ...config },
        })),

    // Clear all strokes
    clearStrokes: () => set({ strokes: [] }),
}));

export default useStore;
