'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';
import getStroke from 'perfect-freehand';
import { getSvgPathFromStroke } from '@/utils/ink';
import { useStore, Point, Stroke } from '@/store/useStore';

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
 * Stage Component - The Memory Layer
 * 
 * Full-screen canvas with stroke persistence via Zustand.
 * All completed strokes are stored and rendered from history.
 */
export default function Stage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { width, height, pixelRatio } = useWindowDimensions();

    // Zustand store
    const { strokes, currentConfig, addStroke } = useStore();

    // Local drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const currentPointsRef = useRef<Point[] | null>(null);

    // Draw a single stroke to canvas
    const drawStroke = useCallback((
        ctx: CanvasRenderingContext2D,
        stroke: Stroke
    ) => {
        if (stroke.points.length < 2) return;

        const inputPoints = stroke.points.map(p => [p.x, p.y, p.pressure]);
        const strokeOutline = getStroke(inputPoints, getStrokeOptions(stroke.size));
        const pathData = getSvgPathFromStroke(strokeOutline);
        const path = new Path2D(pathData);

        ctx.fillStyle = stroke.color;
        ctx.fill(path);
    }, []);

    // Render all strokes (history + current)
    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || width === 0 || height === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear and setup
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(pixelRatio, pixelRatio);

        // Background
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, width, height);

        // Draw all completed strokes from history
        strokes.forEach((stroke) => drawStroke(ctx, stroke));

        // Draw current active stroke (if any)
        const currentPoints = currentPointsRef.current;
        if (currentPoints && currentPoints.length >= 2) {
            drawStroke(ctx, {
                points: currentPoints,
                color: currentConfig.color,
                size: currentConfig.size,
            });
        }
    }, [width, height, pixelRatio, strokes, currentConfig, drawStroke]);

    // Setup canvas on mount/resize
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || width === 0 || height === 0) return;

        // Set internal buffer size
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;

        console.log(`Canvas Setup: ${width}x${height} @ ${pixelRatio}x DPI`);

        // Initial render
        render();
    }, [width, height, pixelRatio, render]);

    // Re-render when strokes change
    useEffect(() => {
        render();
    }, [strokes, render]);

    // Pointer Down - Start drawing
    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        // PALM REJECTION
        if (e.pointerType === 'touch') {
            console.log('Touch rejected (palm rejection)');
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Start new stroke
        currentPointsRef.current = [{ x, y, pressure: e.pressure || 0.5 }];
        setIsDrawing(true);

        console.log(`Start stroke: (${x.toFixed(1)}, ${y.toFixed(1)})`);
    }, []);

    // Pointer Move - Continue drawing
    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        if (e.pointerType === 'touch') return;

        const canvas = canvasRef.current;
        if (!canvas || !currentPointsRef.current) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        currentPointsRef.current.push({ x, y, pressure: e.pressure || 0.5 });
        render();
    }, [isDrawing, render]);

    // Pointer Up - End drawing and save stroke
    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.pointerType === 'touch') return;

        (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);

        const points = currentPointsRef.current;
        if (points && points.length >= 2) {
            // Save stroke to history
            addStroke({
                points,
                color: currentConfig.color,
                size: currentConfig.size,
            });
            console.log(`Stroke saved: ${points.length} points`);
        }

        // Reset current stroke
        currentPointsRef.current = null;
        setIsDrawing(false);
    }, [addStroke, currentConfig]);

    // Pointer Leave
    const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (isDrawing && currentPointsRef.current) {
            // Save stroke if we leave while drawing
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

    return (
        <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            style={{
                width: '100vw',
                height: '100vh',
                display: 'block',
                touchAction: 'none',
                cursor: 'crosshair',
            }}
        />
    );
}
