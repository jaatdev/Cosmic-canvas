'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';
import getStroke from 'perfect-freehand';
import { getSvgPathFromStroke } from '@/utils/ink';
import { useStore } from '@/store/useStore';
import { Point, Stroke } from '@/types';
import BackgroundLayer from './BackgroundLayer';

// perfect-freehand options for gel pen feel
const getStrokeOptions = (size: number) => ({
    size,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    easing: (t: number) => t,
    start: {
        taper: 0,
        cap: true,
    },
    end: {
        taper: size * 3,
        cap: true,
    },
});

/**
 * Stage Component - Multi-Layer Canvas with Background Support
 * 
 * Three-layer architecture:
 * - Background Layer (z-0): Customizable color and pattern
 * - Static Layer (z-10): Renders completed stroke history
 * - Active Layer (z-20): Renders only the current stroke being drawn
 */
export default function Stage() {
    const staticLayerRef = useRef<HTMLCanvasElement>(null);
    const activeLayerRef = useRef<HTMLCanvasElement>(null);
    const { width, height, pixelRatio } = useWindowDimensions();

    // Zustand store with separate pen/eraser widths
    const { strokes, currentTool, penColor, penWidth, eraserWidth, addStroke } = useStore();

    // Local drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const currentPointsRef = useRef<Point[] | null>(null);

    // Get current stroke settings based on tool
    const getCurrentStrokeSettings = useCallback(() => {
        if (currentTool === 'eraser') {
            return { color: '#000000', size: eraserWidth, isEraser: true };
        }
        return { color: penColor, size: penWidth, isEraser: false };
    }, [currentTool, penColor, penWidth, eraserWidth]);

    // Draw a single stroke to a canvas context
    const drawStroke = useCallback((
        ctx: CanvasRenderingContext2D,
        stroke: Stroke
    ) => {
        if (stroke.points.length < 2) return;

        if (stroke.isEraser) {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }

        const inputPoints = stroke.points.map(p => [p.x, p.y, p.pressure]);
        const strokeOutline = getStroke(inputPoints, getStrokeOptions(stroke.size));
        const pathData = getSvgPathFromStroke(strokeOutline);
        const path = new Path2D(pathData);

        ctx.fillStyle = stroke.isEraser ? '#000000' : stroke.color;
        ctx.fill(path);
    }, []);

    // Setup canvas with High-DPI scaling
    const setupCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
        if (!canvas || width === 0 || height === 0) return null;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(pixelRatio, pixelRatio);

        return ctx;
    }, [width, height, pixelRatio]);

    // Render static layer (stroke history)
    const renderStaticLayer = useCallback(() => {
        const ctx = setupCanvas(staticLayerRef.current);
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);
        strokes.forEach((stroke) => drawStroke(ctx, stroke));
        ctx.globalCompositeOperation = 'source-over';
    }, [width, height, strokes, setupCanvas, drawStroke]);

    // Render active layer (current stroke only)
    const renderActiveLayer = useCallback(() => {
        const canvas = activeLayerRef.current;
        if (!canvas || width === 0 || height === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(pixelRatio, pixelRatio);
        ctx.clearRect(0, 0, width, height);

        const currentPoints = currentPointsRef.current;
        if (currentPoints && currentPoints.length >= 2) {
            const settings = getCurrentStrokeSettings();

            if (settings.isEraser) {
                ctx.globalCompositeOperation = 'destination-out';
            } else {
                ctx.globalCompositeOperation = 'source-over';
            }

            drawStroke(ctx, {
                points: currentPoints,
                ...settings,
            });

            ctx.globalCompositeOperation = 'source-over';
        }
    }, [width, height, pixelRatio, getCurrentStrokeSettings, drawStroke]);

    // Setup canvases on mount/resize
    useEffect(() => {
        setupCanvas(staticLayerRef.current);
        setupCanvas(activeLayerRef.current);
    }, [width, height, pixelRatio, setupCanvas]);

    // Re-render static layer when stroke history changes
    useEffect(() => {
        renderStaticLayer();
    }, [strokes, renderStaticLayer]);

    // Pointer Down - Start drawing
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (e.pointerType === 'touch') return;

        const container = e.currentTarget as HTMLElement;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        currentPointsRef.current = [{ x, y, pressure: e.pressure || 0.5 }];
        setIsDrawing(true);
    }, []);

    // Pointer Move - Continue drawing
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDrawing) return;
        if (e.pointerType === 'touch') return;

        const container = e.currentTarget as HTMLElement;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (currentPointsRef.current) {
            currentPointsRef.current.push({ x, y, pressure: e.pressure || 0.5 });
            renderActiveLayer();
        }
    }, [isDrawing, renderActiveLayer]);

    // Pointer Up - End drawing and save stroke
    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (e.pointerType === 'touch') return;

        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        const points = currentPointsRef.current;
        if (points && points.length >= 2) {
            const settings = getCurrentStrokeSettings();
            addStroke({
                points,
                color: settings.color,
                size: settings.size,
            });
        }

        currentPointsRef.current = null;
        setIsDrawing(false);

        const canvas = activeLayerRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }, [addStroke, getCurrentStrokeSettings]);

    // Pointer Leave
    const handlePointerLeave = useCallback((e: React.PointerEvent) => {
        if (isDrawing && currentPointsRef.current) {
            const points = currentPointsRef.current;
            if (points.length >= 2) {
                const settings = getCurrentStrokeSettings();
                addStroke({
                    points,
                    color: settings.color,
                    size: settings.size,
                });
            }
            currentPointsRef.current = null;
            setIsDrawing(false);
        }
    }, [isDrawing, addStroke, getCurrentStrokeSettings]);

    const canvasStyle: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
    };

    return (
        <div
            style={{
                position: 'relative',
                width: '100vw',
                height: '100vh',
                overflow: 'hidden',
                touchAction: 'none',
                cursor: currentTool === 'eraser' ? 'cell' : 'crosshair',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
        >
            <BackgroundLayer />

            <canvas
                ref={staticLayerRef}
                style={{ ...canvasStyle, zIndex: 10, pointerEvents: 'none' }}
            />

            <canvas
                ref={activeLayerRef}
                style={{ ...canvasStyle, zIndex: 20, pointerEvents: 'none' }}
            />
        </div>
    );
}
