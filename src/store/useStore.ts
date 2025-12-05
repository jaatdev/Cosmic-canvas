import { create } from 'zustand';
import { Point, Stroke, StrokeConfig, Tool, Pattern } from '@/types';

// Re-export types for convenience
export type { Point, Stroke, StrokeConfig, Tool, Pattern };

// Store state
interface CanvasState {
    strokes: Stroke[];
    currentConfig: StrokeConfig;
    currentTool: Tool;
    canvasBackground: string;
    canvasPattern: Pattern;

    // Actions
    addStroke: (stroke: Omit<Stroke, 'isEraser'>) => void;
    setColor: (color: string) => void;
    setSize: (size: number) => void;
    setTool: (tool: Tool) => void;
    setStrokeConfig: (config: Partial<StrokeConfig>) => void;
    setCanvasBackground: (color: string) => void;
    setCanvasPattern: (pattern: Pattern) => void;
    clearCanvas: () => void;
}

export const useStore = create<CanvasState>((set, get) => ({
    // Initial state
    strokes: [],
    currentConfig: {
        color: '#000000',
        size: 8,
    },
    currentTool: 'pen',
    canvasBackground: '#ffffff',  // Default white paper
    canvasPattern: 'none',

    // Add completed stroke to history
    addStroke: (stroke) =>
        set((state) => ({
            strokes: [...state.strokes, {
                ...stroke,
                isEraser: get().currentTool === 'eraser'
            }],
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

    // Set current tool
    setTool: (tool) => set({ currentTool: tool }),

    // Update stroke configuration
    setStrokeConfig: (config) =>
        set((state) => ({
            currentConfig: { ...state.currentConfig, ...config },
        })),

    // Set canvas background color
    setCanvasBackground: (color) => set({ canvasBackground: color }),

    // Set canvas pattern
    setCanvasPattern: (pattern) => set({ canvasPattern: pattern }),

    // Clear all strokes
    clearCanvas: () => set({ strokes: [] }),
}));

export default useStore;
