import { create } from 'zustand';
import { Point, Stroke, Tool, Pattern, CanvasImage } from '@/types';

// Re-export types for convenience
export type { Point, Stroke, Tool, Pattern, CanvasImage };

// Store state
interface CanvasState {
    strokes: Stroke[];
    redoStack: Stroke[];
    images: CanvasImage[];
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
    undo: () => void;
    redo: () => void;
    addImage: (image: CanvasImage) => void;
    removeImage: (id: string) => void;
    setTool: (tool: Tool) => void;
    setPenColor: (color: string) => void;
    setPenWidth: (width: number) => void;
    setEraserWidth: (width: number) => void;
    setCanvasBackground: (color: string) => void;
    setCanvasPattern: (pattern: Pattern) => void;
    clearCanvas: () => void;

    // Computed helpers
    canUndo: () => boolean;
    canRedo: () => boolean;
}

export const useStore = create<CanvasState>((set, get) => ({
    // Initial state
    strokes: [],
    redoStack: [],
    images: [],
    currentTool: 'pen',

    // Separate widths
    penColor: '#000000',
    penWidth: 8,
    eraserWidth: 20,

    // Background
    canvasBackground: '#ffffff',
    canvasPattern: 'none',

    // Add completed stroke to history (clears redo stack!)
    addStroke: (stroke) => {
        const state = get();
        const isEraser = state.currentTool === 'eraser';
        set({
            strokes: [...state.strokes, {
                ...stroke,
                size: isEraser ? state.eraserWidth : state.penWidth,
                color: isEraser ? '#000000' : state.penColor,
                isEraser,
            }],
            redoStack: [],
        });
    },

    // Undo: Move last stroke from strokes to redoStack
    undo: () => {
        const state = get();
        if (state.strokes.length === 0) return;

        const lastStroke = state.strokes[state.strokes.length - 1];
        set({
            strokes: state.strokes.slice(0, -1),
            redoStack: [...state.redoStack, lastStroke],
        });
    },

    // Redo: Move last stroke from redoStack back to strokes
    redo: () => {
        const state = get();
        if (state.redoStack.length === 0) return;

        const strokeToRedo = state.redoStack[state.redoStack.length - 1];
        set({
            strokes: [...state.strokes, strokeToRedo],
            redoStack: state.redoStack.slice(0, -1),
        });
    },

    // Add image to canvas
    addImage: (image) => {
        set((state) => ({
            images: [...state.images, image],
        }));
    },

    // Remove image from canvas
    removeImage: (id) => {
        set((state) => ({
            images: state.images.filter((img) => img.id !== id),
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

    // Clear all strokes and images
    clearCanvas: () => set({ strokes: [], redoStack: [], images: [] }),

    // Computed helpers
    canUndo: () => get().strokes.length > 0,
    canRedo: () => get().redoStack.length > 0,
}));

export default useStore;
