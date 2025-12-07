'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';
import getStroke from 'perfect-freehand';
import { getSvgPathFromStroke } from '@/utils/ink';
import { getShapePoints } from '@/utils/geometry';
import { useStore } from '@/store/useStore';
import { Point, Stroke, CanvasImage } from '@/types';
import { PAGE_HEIGHT } from '@/constants/canvas';
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

// Smart Scale: Calculate dimensions to fit viewport (centered on current view)
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

    // Horizontal center
    const x = (viewportWidth - width) / 2;
    // Vertical center of current viewport
    const y = scrollY + (viewportHeight - height) / 2;

    return { width, height, x, y };
};

// Generate unique ID
const generateId = () => `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Stage Component - Multi-Page Scrollable Canvas
 * 
 * Uses pageX/pageY for correct coordinates on scrolled pages.
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
        zoom,
        activeShape,
        addStroke,
        addImage,
        selectImage,
        setPageHeight,
        undo,
        redo
    } = useStore();

    // Local drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [isBarrelButtonDown, setIsBarrelButtonDown] = useState(false);
    const [isShiftHeld, setIsShiftHeld] = useState(false);
    const currentPointsRef = useRef<Point[] | null>(null);
    const shapeStartRef = useRef<{ x: number; y: number } | null>(null);

    // Total canvas height (all pages) - uses FIXED PAGE_HEIGHT
    const totalHeight = PAGE_HEIGHT * pageCount;

    // Set fixed page height on mount (for export and other calculations)
    useEffect(() => {
        setPageHeight(PAGE_HEIGHT);
    }, [setPageHeight]);

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
        stroke: Pick<Stroke, 'points' | 'color' | 'size' | 'isEraser'> & { isShape?: boolean }
    ) => {
        if (stroke.points.length < 2) return;

        if (stroke.isEraser) {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }

        // Shape strokes: render with clean geometric lines
        if (stroke.isShape) {
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
            return;
        }

        // Freehand strokes: use perfect-freehand for natural feel
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
            // Use fixed PAGE_HEIGHT for consistent page boundaries
            const y = i * PAGE_HEIGHT;

            // Draw dashed line
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // Draw page label
            ctx.fillText(`Page ${i + 1}`, 20, y + 20);
        }

        ctx.restore();
    }, [pageCount, width]);

    // Setup canvas with High-DPI scaling - MUST update on pageCount change
    const setupCanvas = useCallback((canvas: HTMLCanvasElement | null, forceRedraw: boolean = false) => {
        if (!canvas || width === 0 || totalHeight === 0) return null;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Only resize if dimensions changed (resizing clears canvas)
        const targetWidth = width * pixelRatio;
        const targetHeight = totalHeight * pixelRatio;

        if (canvas.width !== targetWidth || canvas.height !== targetHeight || forceRedraw) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(pixelRatio, pixelRatio);

        return ctx;
    }, [width, totalHeight, pixelRatio]);

    // Render static layer (stroke history + page separators)
    const renderStaticLayer = useCallback(() => {
        const canvas = staticLayerRef.current;
        if (!canvas || width === 0 || totalHeight === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize canvas if needed
        const targetWidth = width * pixelRatio;
        const targetHeight = totalHeight * pixelRatio;

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(pixelRatio, pixelRatio);
        ctx.clearRect(0, 0, width, totalHeight);

        // Draw all strokes
        strokes.forEach((stroke) => drawStroke(ctx, stroke));
        ctx.globalCompositeOperation = 'source-over';

        // Draw page separators on top
        drawPageSeparators(ctx);
    }, [width, totalHeight, pixelRatio, strokes, drawStroke, drawPageSeparators]);

    // Render active layer (current stroke or shape preview)
    // Account for barrel button override for visual feedback
    const renderActiveLayer = useCallback(() => {
        const canvas = activeLayerRef.current;
        if (!canvas || width === 0 || totalHeight === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize canvas if needed
        const targetWidth = width * pixelRatio;
        const targetHeight = totalHeight * pixelRatio;

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(pixelRatio, pixelRatio);
        ctx.clearRect(0, 0, width, totalHeight);

        // Shape tool rendering - draw geometric shapes with crisp lines
        if (currentTool === 'shape' && shapeStartRef.current && currentPointsRef.current && currentPointsRef.current.length > 0) {
            const start = shapeStartRef.current;
            const end = currentPointsRef.current[currentPointsRef.current.length - 1];
            const shapePoints = getShapePoints(activeShape, start, end, isShiftHeld);

            if (shapePoints.length >= 2) {
                ctx.strokeStyle = penColor;
                ctx.lineWidth = penWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                ctx.beginPath();
                ctx.moveTo(shapePoints[0].x, shapePoints[0].y);
                for (let i = 1; i < shapePoints.length; i++) {
                    ctx.lineTo(shapePoints[i].x, shapePoints[i].y);
                }
                ctx.stroke();
            }
            return;
        }

        // Freehand stroke rendering (pen/eraser)
        const currentPoints = currentPointsRef.current;
        if (currentPoints && currentPoints.length >= 2) {
            // Check barrel button state to override eraser mode
            const settings = getCurrentStrokeSettings();
            const effectiveIsEraser = isBarrelButtonDown || settings.isEraser;

            if (effectiveIsEraser) {
                ctx.globalCompositeOperation = 'destination-out';
            } else {
                ctx.globalCompositeOperation = 'source-over';
            }

            drawStroke(ctx, {
                points: currentPoints,
                color: effectiveIsEraser ? '#000000' : settings.color,
                size: effectiveIsEraser ? eraserWidth : settings.size,
                isEraser: effectiveIsEraser,
            });

            ctx.globalCompositeOperation = 'source-over';
        }
    }, [width, totalHeight, pixelRatio, getCurrentStrokeSettings, drawStroke, isBarrelButtonDown, eraserWidth, currentTool, activeShape, penColor, penWidth, isShiftHeld]);

    // Re-render static layer when stroke history or page count changes
    useEffect(() => {
        renderStaticLayer();
    }, [strokes, pageCount, renderStaticLayer]);

    // Process image blob and add to canvas with smart scaling
    const processImageBlob = useCallback((blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
            // Get current scroll position for centering
            const scrollY = window.scrollY || window.pageYOffset || 0;

            const { width: scaledWidth, height: scaledHeight, x, y } = calculateSmartScale(
                img.naturalWidth,
                img.naturalHeight,
                width,
                height,
                scrollY
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

    // Full-page scroll: One wheel tick = one page jump (like PowerPoint/notebook)
    // Uses FIXED PAGE_HEIGHT for consistent scrolling
    useEffect(() => {
        let isScrolling = false; // Debounce to prevent multiple triggers

        const handleWheel = (e: WheelEvent) => {
            // Skip if currently scrolling or drawing
            if (isScrolling) return;

            e.preventDefault();
            isScrolling = true;

            const currentScrollY = window.scrollY;
            // Use fixed PAGE_HEIGHT for page calculation
            const currentPage = Math.round(currentScrollY / PAGE_HEIGHT);

            let targetPage: number;
            if (e.deltaY > 0) {
                // Scroll down → next page
                targetPage = Math.min(currentPage + 1, pageCount - 1);
            } else {
                // Scroll up → previous page
                targetPage = Math.max(currentPage - 1, 0);
            }

            // Use fixed PAGE_HEIGHT for target position
            const targetY = targetPage * PAGE_HEIGHT;

            window.scrollTo({
                top: targetY,
                behavior: 'smooth'
            });

            // Reset debounce after animation completes
            setTimeout(() => {
                isScrolling = false;
            }, 500);
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, [pageCount]);

    // Track current page on scroll
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const handleScroll = () => {
            if (timeoutId) clearTimeout(timeoutId);

            timeoutId = setTimeout(() => {
                const scrollY = window.scrollY || window.pageYOffset;
                // Add half viewport height to determine "dominant" page
                const centerPoint = scrollY + (window.innerHeight / 2);
                const currentPage = Math.floor(centerPoint / PAGE_HEIGHT) + 1;

                // Clamp to valid range
                const validPage = Math.max(1, Math.min(currentPage, pageCount));

                // Only update if changed (though zustand handles this efficiently)
                useStore.getState().setCurrentPage(validPage);
            }, 100);
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [pageCount]);

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
    // Uses pageX/pageY for document-relative coordinates
    // IRON PALM: Only allow pen and mouse, reject all touch input
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        // Strict palm rejection: only allow 'pen' or 'mouse', reject 'touch'
        if (e.pointerType !== 'pen' && e.pointerType !== 'mouse') return;

        // In select mode, clicking empty canvas deselects image
        if (currentTool === 'select') {
            selectImage(null);
            return;
        }

        // Smart Button Logic: Check if barrel button (right-click/side button) is pressed
        // Bitmask: button 2 = right-click or pen barrel button
        const isSideButton = (e.buttons & 2) === 2;
        setIsBarrelButtonDown(isSideButton);

        // Track Shift key state
        setIsShiftHeld(e.shiftKey);

        // Use pageX/pageY for document-relative coordinates
        // Divide by zoom to get internal canvas coordinates
        const x = e.pageX / zoom;
        const y = e.pageY / zoom;

        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        // For shape tool, record start point
        if (currentTool === 'shape') {
            shapeStartRef.current = { x, y };
        }

        currentPointsRef.current = [{ x, y, pressure: e.pressure || 0.5 }];
        setIsDrawing(true);
    }, [currentTool, selectImage, zoom]);

    // Pointer Move - Continue drawing
    // IRON PALM: Strict filtering for pen/mouse only
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDrawing) return;
        // Strict palm rejection: only allow 'pen' or 'mouse', reject 'touch'
        if (e.pointerType !== 'pen' && e.pointerType !== 'mouse') return;

        // Continue tracking barrel button state during stroke
        const isSideButton = (e.buttons & 2) === 2;
        if (isSideButton !== isBarrelButtonDown) {
            setIsBarrelButtonDown(isSideButton);
        }

        // Track Shift key state for shape constraints
        if (e.shiftKey !== isShiftHeld) {
            setIsShiftHeld(e.shiftKey);
        }

        // Use pageX/pageY divided by zoom for accurate drawing
        const x = e.pageX / zoom;
        const y = e.pageY / zoom;

        if (currentPointsRef.current) {
            // For shapes, we only need start and current end point
            if (currentTool === 'shape') {
                currentPointsRef.current = [currentPointsRef.current[0], { x, y, pressure: e.pressure || 0.5 }];
            } else {
                currentPointsRef.current.push({ x, y, pressure: e.pressure || 0.5 });
            }
            renderActiveLayer();
        }
    }, [isDrawing, isBarrelButtonDown, isShiftHeld, renderActiveLayer, zoom, currentTool]);

    // Pointer Up - End drawing and save stroke
    // IRON PALM: Strict filtering for pen/mouse only
    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        // Strict palm rejection: only allow 'pen' or 'mouse', reject 'touch'
        if (e.pointerType !== 'pen' && e.pointerType !== 'mouse') return;

        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        // Shape tool: commit shape as stroke points
        if (currentTool === 'shape' && shapeStartRef.current && currentPointsRef.current && currentPointsRef.current.length > 0) {
            const start = shapeStartRef.current;
            const end = currentPointsRef.current[currentPointsRef.current.length - 1];
            const shapePoints = getShapePoints(activeShape, start, end, e.shiftKey || isShiftHeld);

            if (shapePoints.length >= 2) {
                addStroke({
                    points: shapePoints,
                    color: penColor,
                    size: penWidth,
                }, false, true);  // forceEraser=false, isShape=true
            }

            shapeStartRef.current = null;
            currentPointsRef.current = null;
            setIsDrawing(false);
            setIsShiftHeld(false);

            const canvas = activeLayerRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
            return;
        }

        // Freehand stroke commit
        const points = currentPointsRef.current;
        if (points && points.length >= 2) {
            // If barrel button was held, force eraser mode for this stroke only
            const wasBarrelButtonErasing = isBarrelButtonDown;

            if (wasBarrelButtonErasing) {
                // Force eraser stroke using forceEraser parameter
                addStroke({
                    points,
                    color: '#000000',
                    size: eraserWidth,
                }, true); // forceEraser = true
            } else {
                const settings = getCurrentStrokeSettings();
                addStroke({
                    points,
                    color: settings.color,
                    size: settings.size,
                });
            }
        }

        currentPointsRef.current = null;
        setIsDrawing(false);
        setIsBarrelButtonDown(false);
        setIsShiftHeld(false);

        const canvas = activeLayerRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }, [addStroke, getCurrentStrokeSettings, isBarrelButtonDown, eraserWidth, currentTool, activeShape, penColor, penWidth, isShiftHeld]);

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

    // Determine cursor: barrel button erasing overrides tool cursor
    const getCursor = () => {
        if (isBarrelButtonDown) return 'cell'; // Eraser cursor when barrel button held
        if (currentTool === 'eraser') return 'cell';
        if (currentTool === 'select') return 'default';
        return 'crosshair';
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: '100vw',
                height: totalHeight * zoom, // Scale container height with zoom
                minHeight: '100vh',
                overflow: 'visible',
                // CSS Hardening for palm rejection
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                cursor: getCursor(),
            }}
            // Disable context menu (prevents right-click menu from palm/pen button)
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
        >
            {/* Transform Wrapper - scales all canvas layers */}
            <div
                style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                    width: '100vw',
                    height: totalHeight,
                }}
            >
                {/* Scroll Snap Targets - invisible page markers for notebook-style scrolling */}
                {/* Uses FIXED PAGE_HEIGHT for consistent page positions */}
                {Array.from({ length: pageCount }).map((_, i) => (
                    <div
                        key={`page-snap-${i}`}
                        className="page-snap"
                        style={{
                            position: 'absolute',
                            top: i * PAGE_HEIGHT,
                            left: 0,
                            width: '100%',
                            height: PAGE_HEIGHT,
                            scrollSnapAlign: 'start',
                            scrollSnapStop: 'always',
                            pointerEvents: 'none',
                        }}
                    />
                ))}

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
        </div>
    );
}
