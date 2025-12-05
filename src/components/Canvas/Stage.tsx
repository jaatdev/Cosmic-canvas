'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';
import getStroke from 'perfect-freehand';
import { getSvgPathFromStroke } from '@/utils/ink';
import { useStore } from '@/store/useStore';
import { Point, Stroke, CanvasImage } from '@/types';
import BackgroundLayer from './BackgroundLayer';
import ObjectLayer from './ObjectLayer';

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

// Smart Scale: Calculate dimensions to fit viewport
const calculateSmartScale = (
    naturalWidth: number,
    naturalHeight: number,
    viewportWidth: number,
    viewportHeight: number,
    scrollY: number = 0
): { width: number; height: number; x: number; y: number } => {
    const maxWidth = Math.min(600, viewportWidth * 0.5);
    const maxHeight = viewportHeight * 0.6;

    const aspectRatio = naturalWidth / naturalHeight;

    let width = maxWidth;
    let height = width / aspectRatio;

    if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
    }

    const x = (viewportWidth - width) / 2;
    // Place image in center of current viewport
    const y = scrollY + (viewportHeight - height) / 2;

    return { width, height, x, y };
};

// Generate unique ID
const generateId = () => `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Stage Component - Multi-Page Scrollable Canvas
 */
export default function Stage() {
    const staticLayerRef = useRef<HTMLCanvasElement>(null);
    const activeLayerRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { width, height, pixelRatio } = useWindowDimensions();

    // Zustand store
    const {
        strokes,
        currentTool,
        penColor,
        penWidth,
        eraserWidth,
        pageCount,
        addStroke,
        addImage,
        selectImage,
        setPageHeight,
        undo,
        redo
    } = useStore();

    // Local drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const currentPointsRef = useRef<Point[] | null>(null);

    // Total canvas height
    const totalHeight = height * pageCount;

    // Set page height on mount
    useEffect(() => {
        if (height > 0) {
            setPageHeight(height);
        }
    }, [height, setPageHeight]);

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
        stroke: Pick<Stroke, 'points' | 'color' | 'size' | 'isEraser'>
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

    // Draw page separators
    const drawPageSeparators = useCallback((ctx: CanvasRenderingContext2D) => {
        if (pageCount <= 1) return;

        ctx.save();
        ctx.setLineDash([10, 10]);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.font = '14px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#3b82f6';

        for (let i = 1; i < pageCount; i++) {
            const y = i * height;

            // Draw dashed line
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Draw page label
            ctx.fillText(`Page ${i + 1}`, 20, y + 20);
        }

        ctx.restore();
    }, [pageCount, width, height]);

    // Setup canvas with High-DPI scaling
    const setupCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
        if (!canvas || width === 0 || totalHeight === 0) return null;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        canvas.width = width * pixelRatio;
        canvas.height = totalHeight * pixelRatio;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(pixelRatio, pixelRatio);

        return ctx;
    }, [width, totalHeight, pixelRatio]);

    // Render static layer (stroke history + page separators)
    const renderStaticLayer = useCallback(() => {
        const ctx = setupCanvas(staticLayerRef.current);
        if (!ctx) return;

        ctx.clearRect(0, 0, width, totalHeight);
        strokes.forEach((stroke) => drawStroke(ctx, stroke));
        ctx.globalCompositeOperation = 'source-over';

        // Draw page separators on top
        drawPageSeparators(ctx);
    }, [width, totalHeight, strokes, setupCanvas, drawStroke, drawPageSeparators]);

    // Render active layer (current stroke only)
    const renderActiveLayer = useCallback(() => {
        const canvas = activeLayerRef.current;
        if (!canvas || width === 0 || totalHeight === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(pixelRatio, pixelRatio);
        ctx.clearRect(0, 0, width, totalHeight);

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
    }, [width, totalHeight, pixelRatio, getCurrentStrokeSettings, drawStroke]);

    // Setup canvases on mount/resize/page change
    useEffect(() => {
        setupCanvas(staticLayerRef.current);
        setupCanvas(activeLayerRef.current);
    }, [width, totalHeight, pixelRatio, setupCanvas]);

    // Re-render static layer when stroke history or page count changes
    useEffect(() => {
        renderStaticLayer();
    }, [strokes, pageCount, renderStaticLayer]);

    // Process image blob and add to canvas with smart scaling
    const processImageBlob = useCallback((blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
            const { width: scaledWidth, height: scaledHeight, x, y } = calculateSmartScale(
                img.naturalWidth,
                img.naturalHeight,
                width,
                height,
                window.scrollY
            );

            const canvasImage: CanvasImage = {
                id: generateId(),
                url,
                x,
                y,
                width: scaledWidth,
                height: scaledHeight,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
            };

            addImage(canvasImage);
        };

        img.src = url;
    }, [addImage, width, height]);

    // Paste event handler
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of Array.from(items)) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const blob = item.getAsFile();
                    if (blob) {
                        processImageBlob(blob);
                    }
                    break;
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [processImageBlob]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;

            if (isCtrlOrCmd && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }

            if (isCtrlOrCmd && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    // Pointer Down - Start drawing or deselect
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (e.pointerType === 'touch') return;

        // In select mode, clicking empty canvas deselects image
        if (currentTool === 'select') {
            selectImage(null);
            return;
        }

        const container = e.currentTarget as HTMLElement;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top + window.scrollY;

        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        currentPointsRef.current = [{ x, y, pressure: e.pressure || 0.5 }];
        setIsDrawing(true);
    }, [currentTool, selectImage]);

    // Pointer Move - Continue drawing
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDrawing) return;
        if (e.pointerType === 'touch') return;

        const container = e.currentTarget as HTMLElement;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top + window.scrollY;

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
            ref={containerRef}
            style={{
                position: 'relative',
                width: '100vw',
                height: totalHeight,
                minHeight: '100vh',
                overflow: 'visible',
                touchAction: 'none',
                cursor: currentTool === 'eraser' ? 'cell' : currentTool === 'select' ? 'default' : 'crosshair',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
        >
            {/* Z-Index 0: Background */}
            <BackgroundLayer totalHeight={totalHeight} />

            {/* Z-Index 5: Images */}
            <ObjectLayer totalHeight={totalHeight} />

            {/* Z-Index 10: Stroke History + Page Separators */}
            <canvas
                ref={staticLayerRef}
                style={{ ...canvasStyle, zIndex: 10, pointerEvents: 'none' }}
            />

            {/* Z-Index 20: Active Stroke */}
            <canvas
                ref={activeLayerRef}
                style={{ ...canvasStyle, zIndex: 20, pointerEvents: 'none' }}
            />
        </div>
    );
}
