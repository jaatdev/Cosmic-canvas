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
    isHighlighter?: boolean;  // True for highlighter strokes (semi-transparent)
}

export type Tool = 'pen' | 'eraser' | 'select' | 'shape' | 'text' | 'lasso' | 'highlighter';

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow';

export type Pattern = 'none' | 'grid' | 'dots' | 'lines' | 'isometric' | 'music' | 'cornell';

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

export interface TextNode {
    id: string;
    x: number;
    y: number;
    content: string;
    fontSize: number;
    color: string;
    fontFamily: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    backgroundColor: string;
    padding: number;
}

// Export Configuration
export interface ExportConfig {
    pageCount: number;
    projectName: string;
    background: string;
    pattern: Pattern;
    pdfPageMapping?: (number | null)[];
}

// Unified timeline action types
export type PageAction = {
    type: 'page_op';
    operation: 'insert' | 'delete';
    pageIndex: number; // The index where the page was inserted or deleted
    deletedStrokes?: Stroke[]; // For restoring deleted content
    deletedImages?: CanvasImage[]; // For restoring deleted content
};

export type ActionItem =
    | { type: 'stroke'; data: Stroke }
    | { type: 'image'; data: CanvasImage }
    | { type: 'text'; data: TextNode }
    | PageAction;

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
