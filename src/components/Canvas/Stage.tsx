'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';
import getStroke from 'perfect-freehand';
import { getSvgPathFromStroke } from '@/utils/ink';
import { useStore } from '@/store/useStore';
import { Point, Stroke } from '@/types';

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
 * Stage Component - Multi-Layer Canvas with Eraser Support
 * 
 * Two-canvas architecture:
 * - Static Layer (z-10): Renders completed stroke history
 * - Active Layer (z-20): Renders only the current stroke being drawn
 * 
 * Eraser uses globalCompositeOperation = 'destination-out'
 */
export default function Stage() {
    const staticLayerRef = useRef<HTMLCanvasElement>(null);
    const activeLayerRef = useRef<HTMLCanvasElement>(null);
    const { width, height, pixelRatio } = useWindowDimensions();

    // Zustand store
    const { strokes, currentConfig, currentTool, addStroke } = useStore();

    // Local drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const currentPointsRef = useRef<Point[] | null>(null);

    // Draw a single stroke to a canvas context
    const drawStroke = useCallback((
        ctx: CanvasRenderingContext2D,
        stroke: Stroke
    ) => {
        if (stroke.points.length < 2) return;

        // Set composite operation based on eraser
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

    // Setup both canvases with High-DPI scaling
    const setupCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
        if (!canvas || width === 0 || height === 0) return null;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Set internal buffer size
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;

        // Scale context
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(pixelRatio, pixelRatio);

        return ctx;
    }, [width, height, pixelRatio]);

    // Render static layer (stroke history) - only when strokes change
    const renderStaticLayer = useCallback(() => {
        const ctx = setupCanvas(staticLayerRef.current);
        if (!ctx) return;

        // Clear and draw background
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, width, height);

        // Draw all completed strokes
        strokes.forEach((stroke) => drawStroke(ctx, stroke));

        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';

        console.log(`Static layer rendered: ${strokes.length} strokes`);
    }, [width, height, strokes, setupCanvas, drawStroke]);

    // Render active layer (current stroke only) - called on every frame while drawing
    const renderActiveLayer = useCallback(() => {
        const canvas = activeLayerRef.current;
        if (!canvas || width === 0 || height === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear active layer (transparent)
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(pixelRatio, pixelRatio);
        ctx.clearRect(0, 0, width, height);

        // Draw current stroke if exists
        const currentPoints = currentPointsRef.current;
        if (currentPoints && currentPoints.length >= 2) {
            const isEraser = currentTool === 'eraser';

            // Set composite operation
            if (isEraser) {
                ctx.globalCompositeOperation = 'destination-out';
            } else {
                ctx.globalCompositeOperation = 'source-over';
            }

            drawStroke(ctx, {
                points: currentPoints,
                color: currentConfig.color,
                size: currentConfig.size,
                isEraser,
            });

            // Reset
            ctx.globalCompositeOperation = 'source-over';
        }
    }, [width, height, pixelRatio, currentConfig, currentTool, drawStroke]);

    // Setup canvases on mount/resize
    useEffect(() => {
        setupCanvas(staticLayerRef.current);
        setupCanvas(activeLayerRef.current);
        console.log(`Canvas Setup: ${width}x${height} @ ${pixelRatio}x DPI`);
    }, [width, height, pixelRatio, setupCanvas]);

    // Re-render static layer when stroke history changes
    useEffect(() => {
        renderStaticLayer();
    }, [strokes, renderStaticLayer]);

    // Pointer Down - Start drawing
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        // PALM REJECTION
        if (e.pointerType === 'touch') {
            console.log('Touch rejected (palm rejection)');
            return;
        }

        const container = e.currentTarget as HTMLElement;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Capture pointer
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        // Start new stroke
        currentPointsRef.current = [{ x, y, pressure: e.pressure || 0.5 }];
        setIsDrawing(true);

        console.log(`Start ${currentTool}: (${x.toFixed(1)}, ${y.toFixed(1)})`);
    }, [currentTool]);

    // Pointer Move - Continue drawing (FAST LOOP - only active layer)
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDrawing) return;
        if (e.pointerType === 'touch') return;

        const container = e.currentTarget as HTMLElement;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (currentPointsRef.current) {
            currentPointsRef.current.push({ x, y, pressure: e.pressure || 0.5 });
            // Only render active layer - NOT the static layer
            renderActiveLayer();
        }
    }, [isDrawing, renderActiveLayer]);

    // Pointer Up - End drawing and save stroke
    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (e.pointerType === 'touch') return;

        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        const points = currentPointsRef.current;
        if (points && points.length >= 2) {
            // Save stroke to history (isEraser is added by the store)
            addStroke({
                points,
                color: currentConfig.color,
                size: currentConfig.size,
            });
            console.log(`${currentTool} stroke saved: ${points.length} points`);
        }

        // Clear current stroke IMMEDIATELY
        currentPointsRef.current = null;
        setIsDrawing(false);

        // Clear active layer
        const canvas = activeLayerRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }, [addStroke, currentConfig, currentTool]);

    // Pointer Leave - Save stroke if still drawing
    const handlePointerLeave = useCallback((e: React.PointerEvent) => {
        if (isDrawing && currentPointsRef.current) {
            const points = currentPointsRef.current;
            if (points.length >= 2) {
                addStroke({
                    points,
                    color: currentConfig.color,
                    size: currentConfig.size,
                });
            }
            currentPointsRef.current = null;
            setIsDrawing(false);
        }
    }, [isDrawing, addStroke, currentConfig]);

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
            {/* Static Layer - Stroke History (z-10) */}
            <canvas
                ref={staticLayerRef}
                style={{ ...canvasStyle, zIndex: 10, pointerEvents: 'none' }}
            />

            {/* Active Layer - Current Stroke (z-20) */}
            <canvas
                ref={activeLayerRef}
                style={{ ...canvasStyle, zIndex: 20, pointerEvents: 'none' }}
            />
        </div>
    );
}
