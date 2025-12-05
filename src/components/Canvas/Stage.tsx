'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';
import getStroke from 'perfect-freehand';
import { getSvgPathFromStroke } from '@/utils/ink';

// Point with pressure data
interface Point {
    x: number;
    y: number;
    pressure: number;
}

// perfect-freehand options for gel pen feel
const STROKE_OPTIONS = {
    size: 8,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    easing: (t: number) => t,
    start: {
        taper: 0,
        cap: true,
    },
    end: {
        taper: 25,
        cap: true,
    },
};

/**
 * Stage Component - The Pressure Engine
 * 
 * Full-screen canvas with pressure-sensitive drawing using perfect-freehand.
 * Palm rejection: touch input is ignored, only pen/mouse draws.
 */
export default function Stage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { width, height, pixelRatio } = useWindowDimensions();

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const pointsRef = useRef<Point[]>([]);

    // Setup canvas with High-DPI scaling
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || width === 0 || height === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set internal buffer size (scaled for High-DPI)
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;

        // Scale context to match devicePixelRatio
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(pixelRatio, pixelRatio);

        // Fill with dark grey background
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, width, height);

        console.log(`Canvas Setup: ${width}x${height} @ ${pixelRatio}x DPI`);
    }, [width, height, pixelRatio]);

    // Draw the current stroke
    const drawStroke = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas and redraw background
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(pixelRatio, pixelRatio);
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, width, height);

        // Get points for stroke
        const points = pointsRef.current;
        if (points.length < 2) return;

        // Convert points to format perfect-freehand expects: [x, y, pressure]
        const inputPoints = points.map(p => [p.x, p.y, p.pressure]);

        // Generate stroke outline
        const strokeOutline = getStroke(inputPoints, STROKE_OPTIONS);

        // Convert to SVG path and draw
        const pathData = getSvgPathFromStroke(strokeOutline);
        const path = new Path2D(pathData);

        // Draw black ink
        ctx.fillStyle = '#000000';
        ctx.fill(path);
    }, [width, height, pixelRatio]);

    // Pointer Down - Start drawing
    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        // PALM REJECTION: Only draw with pen or mouse, not touch
        if (e.pointerType === 'touch') {
            console.log('Touch rejected (palm rejection)');
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Capture pointer for smooth tracking
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);

        // Get canvas offset
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Start new stroke
        pointsRef.current = [{ x, y, pressure: e.pressure || 0.5 }];
        setIsDrawing(true);

        console.log(`Start: { x: ${x.toFixed(1)}, y: ${y.toFixed(1)}, pressure: ${e.pressure.toFixed(2)}, type: ${e.pointerType} }`);
    }, []);

    // Pointer Move - Continue drawing
    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        if (e.pointerType === 'touch') return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Add point with pressure
        pointsRef.current.push({ x, y, pressure: e.pressure || 0.5 });

        // Redraw stroke
        drawStroke();
    }, [isDrawing, drawStroke]);

    // Pointer Up - End drawing
    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.pointerType === 'touch') return;

        (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
        setIsDrawing(false);

        console.log(`End: ${pointsRef.current.length} points captured`);
    }, []);

    // Pointer Leave - End drawing if still active
    const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (isDrawing) {
            setIsDrawing(false);
            console.log('Drawing ended (pointer left canvas)');
        }
    }, [isDrawing]);

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
