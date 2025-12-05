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
    setColor: (color: string) => void;
    setSize: (size: number) => void;
    setStrokeConfig: (config: Partial<StrokeConfig>) => void;
    clearCanvas: () => void;
}

export const useStore = create<CanvasState>((set) => ({
    // Initial state
    strokes: [],
    currentConfig: {
        color: '#ffffff',
        size: 8,
    },

    // Add completed stroke to history
    addStroke: (stroke) =>
        set((state) => ({
            strokes: [...state.strokes, stroke],
        })),

    // Set stroke color
    setColor: (color) =>
        set((state) => ({
            currentConfig: { ...state.currentConfig, color },
        })),

    // Set stroke size
    setSize: (size) =>
        set((state) => ({
            currentConfig: { ...state.currentConfig, size: Math.max(1, Math.min(50, size)) },
        })),

    // Update stroke configuration
    setStrokeConfig: (config) =>
        set((state) => ({
            currentConfig: { ...state.currentConfig, ...config },
        })),

    // Clear all strokes
    clearCanvas: () => set({ strokes: [] }),
}));

export default useStore;
