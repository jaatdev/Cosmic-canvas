import { create } from 'zustand';
import {
    AppState,
    Tool,
    EraserMode,
    BackgroundPattern,
    Point,
    Stroke,
    TextNode,
    ImageNode,
    CanvasObject
} from '@/types';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useStore = create<AppState>((set, get) => ({
    // Initial tool state
    tool: 'pen',
    eraserMode: 'pixel',

    // Initial brush settings
    brush: {
        color: '#ffffff',
        size: 4,
        opacity: 1,
    },

    // Initial background
    backgroundColor: '#0a0a0f',
    backgroundPattern: 'none',

    // Initial canvas state
    strokes: [],
    currentStroke: null,
    objects: [],
    selectedObjectId: null,

    // Initial viewport
    viewport: {
        offset: { x: 0, y: 0 },
        zoom: 1,
    },

    // Initial UI state
    isSidebarVisible: true,
    isFullscreen: false,
    projectName: 'Untitled Canvas',

    // Tool actions
    setTool: (tool: Tool) => set({ tool }),
    setEraserMode: (mode: EraserMode) => set({ eraserMode: mode }),

    // Brush actions
    setBrushColor: (color: string) => set((state) => ({
        brush: { ...state.brush, color }
    })),
    setBrushSize: (size: number) => set((state) => ({
        brush: { ...state.brush, size: Math.max(1, Math.min(50, size)) }
    })),
    setBrushOpacity: (opacity: number) => set((state) => ({
        brush: { ...state.brush, opacity: Math.max(0, Math.min(1, opacity)) }
    })),

    // Background actions
    setBackgroundColor: (color: string) => set({ backgroundColor: color }),
    setBackgroundPattern: (pattern: BackgroundPattern) => set({ backgroundPattern: pattern }),

    // Stroke actions
    startStroke: (point: Point, color: string, size: number) => {
        const newStroke: Stroke = {
            id: generateId(),
            points: [point],
            color,
            size,
            isComplete: false,
        };
        set({ currentStroke: newStroke });
    },

    addPointToStroke: (point: Point) => {
        const { currentStroke } = get();
        if (currentStroke) {
            set({
                currentStroke: {
                    ...currentStroke,
                    points: [...currentStroke.points, point],
                },
            });
        }
    },

    endStroke: () => {
        const { currentStroke, strokes } = get();
        if (currentStroke && currentStroke.points.length > 1) {
            const completedStroke: Stroke = {
                ...currentStroke,
                isComplete: true,
            };
            set({
                strokes: [...strokes, completedStroke],
                currentStroke: null,
            });
        } else {
            set({ currentStroke: null });
        }
    },

    clearStrokes: () => set({ strokes: [], currentStroke: null }),

    removeStroke: (id: string) => set((state) => ({
        strokes: state.strokes.filter((s) => s.id !== id),
    })),

    // Object actions
    addTextNode: (node: TextNode) => set((state) => ({
        objects: [...state.objects, node],
    })),

    addImageNode: (node: ImageNode) => set((state) => ({
        objects: [...state.objects, node],
    })),

    updateObject: (id: string, updates: Partial<CanvasObject>) => set((state) => ({
        objects: state.objects.map((obj) =>
            obj.id === id ? { ...obj, ...updates } : obj
        ),
    })),

    removeObject: (id: string) => set((state) => ({
        objects: state.objects.filter((obj) => obj.id !== id),
        selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
    })),

    setSelectedObject: (id: string | null) => set({ selectedObjectId: id }),

    // Viewport actions
    setViewportOffset: (offset: { x: number; y: number }) => set((state) => ({
        viewport: { ...state.viewport, offset },
    })),

    setZoom: (zoom: number) => set((state) => ({
        viewport: { ...state.viewport, zoom: Math.max(0.1, Math.min(5, zoom)) },
    })),

    // UI actions
    toggleSidebar: () => set((state) => ({ isSidebarVisible: !state.isSidebarVisible })),
    setFullscreen: (isFullscreen: boolean) => set({ isFullscreen }),
    setProjectName: (name: string) => set({ projectName: name }),
}));
