'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';

/**
 * Stage Component - The Calibration Layer
 * 
 * A full-screen canvas with proper High-DPI (Retina/4K) handling.
 * Click/tap anywhere to place a red calibration dot exactly under the cursor.
 */
export default function Stage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { width, height, pixelRatio } = useWindowDimensions();

    // Setup canvas with High-DPI scaling
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || width === 0 || height === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // CRITICAL: Set internal buffer size (scaled for High-DPI)
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;

        // Scale context to match devicePixelRatio
        // This allows us to draw in CSS pixel coordinates
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        ctx.scale(pixelRatio, pixelRatio);

        // Fill with dark grey background
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, width, height);

        console.log(`Canvas Setup: ${width}x${height} @ ${pixelRatio}x DPI`);
        console.log(`Internal Buffer: ${canvas.width}x${canvas.height}`);
    }, [width, height, pixelRatio]);

    // Draw calibration dot at pointer position
    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Get canvas bounding rect for offset calculation
        const rect = canvas.getBoundingClientRect();

        // Calculate position relative to canvas
        // clientX/Y is in CSS pixels, rect is in CSS pixels
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Debug logging
        console.log('---');
        console.log(`Input: { x: ${e.clientX}, y: ${e.clientY} }`);
        console.log(`CanvasOffset: { top: ${rect.top}, left: ${rect.left} }`);
        console.log(`Calculated: { x: ${x}, y: ${y} }`);
        console.log(`Pressure: ${e.pressure}, PointerType: ${e.pointerType}`);

        // Draw red calibration dot (5px radius)
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0000';
        ctx.fill();
        ctx.closePath();
    }, []);

    return (
        <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            style={{
                width: '100vw',
                height: '100vh',
                display: 'block',
                touchAction: 'none', // Prevent scrolling on tablets
                cursor: 'crosshair',
            }}
        />
    );
}
