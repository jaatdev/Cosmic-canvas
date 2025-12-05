'use client';

import { useRef, useEffect } from 'react';
import { useCanvas } from '@/hooks/useCanvas';

interface CanvasLayerProps {
    className?: string;
}

const CanvasLayer = ({ className = '' }: CanvasLayerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerLeave,
        setupCanvas,
    } = useCanvas({ canvasRef: canvasRef as React.RefObject<HTMLCanvasElement> });

    // Setup canvas on mount
    useEffect(() => {
        setupCanvas();
    }, [setupCanvas]);

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 z-10 touch-none ${className}`}
            style={{
                width: '100%',
                height: '100%',
                cursor: 'crosshair',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
        />
    );
};

export default CanvasLayer;
