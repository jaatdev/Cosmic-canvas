import { useCallback, useRef, useEffect } from 'react';
import getStroke from 'perfect-freehand';
import { useStore } from '@/store/useStore';
import { Point, Stroke } from '@/types';

// Perfect-freehand options for natural pen feel
const getStrokeOptions = (size: number, pressure: number = 0.5) => ({
    size: size * (0.5 + pressure * 0.5), // Pressure affects size
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    easing: (t: number) => t,
    start: {
        taper: 0,
        easing: (t: number) => t,
        cap: true,
    },
    end: {
        taper: size * 0.5,
        easing: (t: number) => t,
        cap: true,
    },
});

// Convert perfect-freehand points to SVG path
export const getSvgPathFromStroke = (stroke: number[][]): string => {
    if (!stroke.length) return '';

    const d = stroke.reduce(
        (acc, [x0, y0], i, arr) => {
            const [x1, y1] = arr[(i + 1) % arr.length];
            acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
            return acc;
        },
        ['M', ...stroke[0], 'Q']
    );

    d.push('Z');
    return d.join(' ');
};

// Generate path data for a stroke using perfect-freehand
export const getStrokePath = (stroke: Stroke): string => {
    const points = stroke.points.map((p) => [p.x, p.y, p.pressure ?? 0.5]);
    const avgPressure = stroke.points.reduce((sum, p) => sum + (p.pressure ?? 0.5), 0) / stroke.points.length;
    const outlinePoints = getStroke(points, getStrokeOptions(stroke.size, avgPressure));
    return getSvgPathFromStroke(outlinePoints);
};

interface UseCanvasOptions {
    canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const useCanvas = ({ canvasRef }: UseCanvasOptions) => {
    const isDrawingRef = useRef(false);
    const animationFrameRef = useRef<number | null>(null);
    const lastPointRef = useRef<Point | null>(null);

    const {
        tool,
        brush,
        eraserMode,
        strokes,
        currentStroke,
        startStroke,
        addPointToStroke,
        endStroke,
        removeStroke,
    } = useStore();

    // Get canvas coordinates with DPI scaling
    const getCanvasPoint = useCallback((e: PointerEvent | React.PointerEvent): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0, pressure: 0.5 };

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        return {
            x: (e.clientX - rect.left) * dpr,
            y: (e.clientY - rect.top) * dpr,
            pressure: e.pressure || 0.5,
        };
    }, [canvasRef]);

    // Draw all strokes to canvas
    const drawStrokes = useCallback((ctx: CanvasRenderingContext2D, strokesToDraw: Stroke[]) => {
        strokesToDraw.forEach((stroke) => {
            if (stroke.points.length < 2) return;

            const path = new Path2D(getStrokePath(stroke));
            ctx.fillStyle = stroke.color;
            ctx.fill(path);
        });
    }, []);

    // Main render function using requestAnimationFrame
    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw completed strokes
        drawStrokes(ctx, strokes);

        // Draw current stroke (in-progress)
        if (currentStroke && currentStroke.points.length >= 2) {
            const path = new Path2D(getStrokePath(currentStroke));
            ctx.fillStyle = currentStroke.color;
            ctx.fill(path);
        }
    }, [canvasRef, strokes, currentStroke, drawStrokes]);

    // Animation loop for smooth rendering
    const startRenderLoop = useCallback(() => {
        const loop = () => {
            render();
            animationFrameRef.current = requestAnimationFrame(loop);
        };
        animationFrameRef.current = requestAnimationFrame(loop);
    }, [render]);

    const stopRenderLoop = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, []);

    // Pointer event handlers
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        // Palm rejection: only draw with pen or mouse, not touch
        if (e.pointerType === 'touch') {
            return; // Allow touch for panning/zooming in future
        }

        if (tool !== 'pen' && tool !== 'eraser') return;

        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);

        isDrawingRef.current = true;
        const point = getCanvasPoint(e);
        lastPointRef.current = point;

        if (tool === 'pen') {
            startStroke(point, brush.color, brush.size);
            startRenderLoop();
        }
    }, [tool, brush.color, brush.size, getCanvasPoint, startStroke, startRenderLoop]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (e.pointerType === 'touch') return;
        if (!isDrawingRef.current) return;

        e.preventDefault();
        const point = getCanvasPoint(e);

        if (tool === 'pen') {
            addPointToStroke(point);
        } else if (tool === 'eraser') {
            // Pixel eraser: find and remove strokes near the pointer
            if (eraserMode === 'pixel') {
                const eraserRadius = brush.size * 2;
                strokes.forEach((stroke) => {
                    const isNear = stroke.points.some((p) => {
                        const dx = p.x - point.x;
                        const dy = p.y - point.y;
                        return Math.sqrt(dx * dx + dy * dy) < eraserRadius;
                    });
                    if (isNear) {
                        removeStroke(stroke.id);
                    }
                });
            }
        }

        lastPointRef.current = point;
    }, [tool, eraserMode, brush.size, strokes, getCanvasPoint, addPointToStroke, removeStroke]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (e.pointerType === 'touch') return;
        if (!isDrawingRef.current) return;

        e.preventDefault();
        e.currentTarget.releasePointerCapture(e.pointerId);

        isDrawingRef.current = false;
        lastPointRef.current = null;

        if (tool === 'pen') {
            endStroke();
            stopRenderLoop();
            // Do one final render
            render();
        }
    }, [tool, endStroke, stopRenderLoop, render]);

    const handlePointerLeave = useCallback((e: React.PointerEvent) => {
        if (isDrawingRef.current) {
            handlePointerUp(e);
        }
    }, [handlePointerUp]);

    // Setup high-DPI canvas
    const setupCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        // Set actual canvas size in memory (scaled for high DPI)
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        // Scale context to match DPI
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
        }
    }, [canvasRef]);

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            setupCanvas();
            render();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [setupCanvas, render]);

    // Initial setup and render when strokes change
    useEffect(() => {
        setupCanvas();
        render();
    }, [setupCanvas, render]);

    return {
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        handlePointerLeave,
        setupCanvas,
        render,
    };
};

export default useCanvas;
