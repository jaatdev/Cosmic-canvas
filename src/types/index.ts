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

export interface StrokeConfig {
    color: string;
    size: number;
}
