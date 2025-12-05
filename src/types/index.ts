// Core Types for Cosmic Canvas

export interface Point {
    x: number;
    y: number;
    pressure: number;
}

export interface Stroke {
    points: Point[];
    color: string;
    size: number;
    isEraser: boolean;
}

export type Tool = 'pen' | 'eraser';

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

export interface AppState {
    strokes: Stroke[];
    currentConfig: StrokeConfig;
    currentTool: Tool;
    canvasBackground: string;
    canvasPattern: Pattern;
    images: CanvasImage[];
}
