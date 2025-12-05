import { create } from 'zustand';
import { Point, Stroke, Tool, Pattern, CanvasImage, ActionItem } from '@/types';

// Re-export types for convenience
export type { Point, Stroke, Tool, Pattern, CanvasImage, ActionItem };

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Store state
interface CanvasState {
    strokes: Stroke[];
    images: CanvasImage[];
    historyStack: ActionItem[];
    redoStack: ActionItem[];
    currentTool: Tool;

    // Separate widths for pen and eraser
    penColor: string;
    penWidth: number;
    eraserWidth: number;

    // Background
    canvasBackground: string;
    canvasPattern: Pattern;

    // Actions
    addStroke: (stroke: Omit<Stroke, 'id' | 'isEraser'>) => void;
    addImage: (image: CanvasImage) => void;
    undo: () => void;
    redo: () => void;
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
    images: [],
    historyStack: [],
    redoStack: [],
    currentTool: 'pen',

    // Separate widths
    penColor: '#000000',
    penWidth: 8,
    eraserWidth: 20,

    // Background
    canvasBackground: '#ffffff',
    canvasPattern: 'none',

    // Add stroke with unified history
    addStroke: (strokeData) => {
        const state = get();
        const isEraser = state.currentTool === 'eraser';

        const stroke: Stroke = {
            id: generateId(),
            ...strokeData,
            size: isEraser ? state.eraserWidth : state.penWidth,
            color: isEraser ? '#000000' : state.penColor,
            isEraser,
        };

        set({
            strokes: [...state.strokes, stroke],
            historyStack: [...state.historyStack, { type: 'stroke', data: stroke }],
            redoStack: [], // Clear redo on new action
        });
    },

    // Add image with unified history
    addImage: (image) => {
        const state = get();
        set({
            images: [...state.images, image],
            historyStack: [...state.historyStack, { type: 'image', data: image }],
            redoStack: [], // Clear redo on new action
        });
    },

    // Unified undo - works for both strokes and images
    undo: () => {
        const state = get();
        if (state.historyStack.length === 0) return;

        const lastAction = state.historyStack[state.historyStack.length - 1];
        const newHistoryStack = state.historyStack.slice(0, -1);

        if (lastAction.type === 'stroke') {
            set({
                strokes: state.strokes.filter(s => s.id !== lastAction.data.id),
                historyStack: newHistoryStack,
                redoStack: [...state.redoStack, lastAction],
            });
        } else if (lastAction.type === 'image') {
            set({
                images: state.images.filter(i => i.id !== lastAction.data.id),
                historyStack: newHistoryStack,
                redoStack: [...state.redoStack, lastAction],
            });
        }
    },

    // Unified redo - works for both strokes and images
    redo: () => {
        const state = get();
        if (state.redoStack.length === 0) return;

        const actionToRedo = state.redoStack[state.redoStack.length - 1];
        const newRedoStack = state.redoStack.slice(0, -1);

        if (actionToRedo.type === 'stroke') {
            set({
                strokes: [...state.strokes, actionToRedo.data],
                historyStack: [...state.historyStack, actionToRedo],
                redoStack: newRedoStack,
            });
        } else if (actionToRedo.type === 'image') {
            set({
                images: [...state.images, actionToRedo.data],
                historyStack: [...state.historyStack, actionToRedo],
                redoStack: newRedoStack,
            });
        }
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

    // Clear everything
    clearCanvas: () => set({
        strokes: [],
        images: [],
        historyStack: [],
        redoStack: []
    }),

    // Computed helpers
    canUndo: () => get().historyStack.length > 0,
    canRedo: () => get().redoStack.length > 0,
}));

export default useStore;
