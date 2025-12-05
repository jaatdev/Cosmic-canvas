import { create } from 'zustand';
import { Point, Stroke, Tool, Pattern } from '@/types';

// Re-export types for convenience
export type { Point, Stroke, Tool, Pattern };

// Store state
interface CanvasState {
    strokes: Stroke[];
    currentTool: Tool;

    // Separate widths for pen and eraser
    penColor: string;
    penWidth: number;
    eraserWidth: number;

    // Background
    canvasBackground: string;
    canvasPattern: Pattern;

    // Actions
    addStroke: (stroke: Omit<Stroke, 'isEraser'>) => void;
    setTool: (tool: Tool) => void;
    setPenColor: (color: string) => void;
    setPenWidth: (width: number) => void;
    setEraserWidth: (width: number) => void;
    setCanvasBackground: (color: string) => void;
    setCanvasPattern: (pattern: Pattern) => void;
    clearCanvas: () => void;
}

export const useStore = create<CanvasState>((set, get) => ({
    // Initial state
    strokes: [],
    currentTool: 'pen',

    // Separate widths
    penColor: '#000000',
    penWidth: 8,
    eraserWidth: 20,

    // Background
    canvasBackground: '#ffffff',
    canvasPattern: 'none',

    // Add completed stroke to history
    addStroke: (stroke) => {
        const state = get();
        const isEraser = state.currentTool === 'eraser';
        set((s) => ({
            strokes: [...s.strokes, {
                ...stroke,
                // Use correct width based on tool
                size: isEraser ? state.eraserWidth : state.penWidth,
                color: isEraser ? '#000000' : state.penColor,
                isEraser,
            }],
        }));
    },

    // Set current tool
    setTool: (tool) => set({ currentTool: tool }),

    // Pen settings
    setPenColor: (color) => set({ penColor: color }),
    setPenWidth: (width) => set({ penWidth: Math.max(1, Math.min(50, width)) }),

    // Eraser settings
    setEraserWidth: (width) => set({ eraserWidth: Math.max(5, Math.min(100, width)) }),

    // Background settings
    setCanvasBackground: (color) => set({ canvasBackground: color }),
    setCanvasPattern: (pattern) => set({ canvasPattern: pattern }),

    // Clear all strokes
    clearCanvas: () => set({ strokes: [] }),
}));

export default useStore;
