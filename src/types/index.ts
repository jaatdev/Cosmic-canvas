// Core Types for Cosmic Canvas

export interface Point {
    x: number;
    y: number;
    pressure: number;
}

export interface Stroke {
    id: string;
    points: Point[];
    color: string;
    size: number;
    isEraser: boolean;
    isShape?: boolean;  // True for geometric shapes (rendered with lines, not freehand)
}

export type Tool = 'pen' | 'eraser' | 'select' | 'shape';

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow';

export type Pattern = 'none' | 'grid' | 'dots' | 'lines';

export interface StrokeConfig {
    color: string;
    size: number;
}

export interface CanvasImage {
    id: string;
    url: string;
    x: number;
    y: number;
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
}

// Unified timeline action types
export type ActionItem =
    | { type: 'stroke'; data: Stroke }
    | { type: 'image'; data: CanvasImage };

export interface AppState {
    strokes: Stroke[];
    images: CanvasImage[];
    historyStack: ActionItem[];
    redoStack: ActionItem[];
    currentTool: Tool;
    selectedImageId: string | null;
    canvasBackground: string;
    canvasPattern: Pattern;
}
