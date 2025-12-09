'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';
import getStroke from 'perfect-freehand';
import { getSvgPathFromStroke } from '@/utils/ink';
import { getShapePoints, doesStrokeIntersectSelection, doesTextIntersectSelection, getStrokesBoundingBox, isPointInBBox } from '@/utils/geometry';
import { getPointerPosition } from '@/utils/canvasUtils';
import { useStore } from '@/store/useStore';
import { Point, Stroke, CanvasImage } from '@/types';
import { PAGE_HEIGHT, PAGE_WIDTH, PDF_PAGE_GAP } from '@/constants/canvas';
import BackgroundLayer from './BackgroundLayer';
import ObjectLayer from './ObjectLayer';
import TextLayer from './TextLayer';
import LassoLayer from './LassoLayer';
import { saveState } from '@/utils/storage';

// Dynamic import for PDFLayer to avoid SSR issues (DOMMatrix not available on server)
const PDFLayer = dynamic(() => import('./PDFLayer'), { ssr: false });

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
        images,
        textNodes,
        currentTool,
        penColor,
        penWidth,
        eraserWidth,
        pageCount,
        currentPage,
        zoom,
        activeShape,
        selectedStrokeIds,
        projectName,
        canvasBackground,
        canvasPattern,
        highlighterColor,
        highlighterWidth,
        canvasDimensions,
        addStroke,
        addImage,
        selectImage,
        selectStrokes,
        selectText,
        clearSelection,
        transformStrokes,
        clearStrokeSelection,
        setPageHeight,
        fitToScreen,
        loadProject,
        getPersistedState,
        undo,
        redo,
        setCurrentPage,
    } = useStore();

    // Dynamic page dimensions from store (or defaults)
    const pageWidth = canvasDimensions.width;
    const pageHeight = canvasDimensions.height;

    // Local drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [isBarrelButtonDown, setIsBarrelButtonDown] = useState(false);
    const [isShiftHeld, setIsShiftHeld] = useState(false);
    const currentPointsRef = useRef<Point[] | null>(null);
    const shapeStartRef = useRef<{ x: number; y: number } | null>(null);

    // Lasso selection state
    const [lassoPoints, setLassoPoints] = useState<Point[]>([]);
    const [isDraggingSelection, setIsDraggingSelection] = useState(false);
    const [activeHandle, setActiveHandle] = useState<string | null>(null); // 'tl', 'tr', 'bl', 'br', or null
    const [dragStart, setDragStart] = useState<{ x: number; y: number; bbox?: { minX: number; minY: number; maxX: number; maxY: number } } | null>(null);

    // Total canvas height (all pages + gaps) - uses dynamic page height
    // Each page has its height plus a gap after it (except the last page)
    const singlePageTotal = pageHeight + PDF_PAGE_GAP;
    const totalHeight = (pageHeight * pageCount) + (PDF_PAGE_GAP * (pageCount - 1));

    // Scroll Listener for Page Counter (Immersion Lock Fix)
    useEffect(() => {
        const handleScroll = () => {
            const { canvasDimensions, pageCount, setCurrentPage } = useStore.getState(); // Get FRESH state

            const gap = PDF_PAGE_GAP;
            const singlePageHeight = canvasDimensions.height + gap;

            // Calculate based on the center of the viewport
            const centerLine = window.scrollY + (window.innerHeight / 2);

            // Math.max ensures we never show Page 0
            // Math.min ensures we never show Page 11 if only 10 pages exist
            // Using Math.floor to get 0-based index then +1 for 1-based display
            let current = Math.floor(centerLine / singlePageHeight) + 1;
            current = Math.max(1, Math.min(pageCount, current));

            setCurrentPage(current);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        // Trigger once on mount to ensure correct initial state
        handleScroll();

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Set page height on mount or when dimensions change (for export and other calculations)
    useEffect(() => {
        setPageHeight(pageHeight);
    }, [setPageHeight, pageHeight]);

    // DPI Lock: Enforce scaling on both canvases when dimensions change
    // This ensures the Active Layer context never loses its scale transform
    useEffect(() => {
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = pageWidth;
        const logicalHeight = totalHeight;

        // Setup Static Layer
        if (staticLayerRef.current) {
            const canvas = staticLayerRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Set physical dimensions
                canvas.width = logicalWidth * dpr;
                canvas.height = logicalHeight * dpr;
                // Set CSS dimensions
                canvas.style.width = `${logicalWidth}px`;
                canvas.style.height = `${logicalHeight}px`;
                // Apply DPI scale
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.scale(dpr, dpr);
            }
        }

        // Setup Active Layer (THE DPI FIX)
        if (activeLayerRef.current) {
            const canvas = activeLayerRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Set physical dimensions
                canvas.width = logicalWidth * dpr;
                canvas.height = logicalHeight * dpr;
                // Set CSS dimensions explicitly
                canvas.style.width = `${logicalWidth}px`;
                canvas.style.height = `${logicalHeight}px`;
                // CRITICAL: Apply DPI scale immediately
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.scale(dpr, dpr);
            }
        }
    }, [canvasDimensions, pageCount, pageWidth, totalHeight]);

    // Auto-fit zoom to fill screen width on mount
    useEffect(() => {
        fitToScreen();
    }, [fitToScreen]);

    // Hydration: Load saved project on mount
    useEffect(() => {
        loadProject();
    }, [loadProject]);

    // Auto-save: Debounced save whenever content changes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const state = getPersistedState();
            // Only save if there's actual content
            if (state.strokes.length > 0 || state.images.length > 0 || state.textNodes.length > 0) {
                saveState(state);
            }
        }, 1000); // 1 second debounce

        return () => clearTimeout(timeoutId);
    }, [strokes, images, textNodes, pageCount, projectName, canvasBackground, canvasPattern, penColor, penWidth, getPersistedState]);

    // Get current stroke settings based on tool
    const getCurrentStrokeSettings = useCallback(() => {
        if (currentTool === 'eraser') {
            return { color: '#000000', size: eraserWidth, isEraser: true, isHighlighter: false };
        }
        if (currentTool === 'highlighter') {
            return { color: highlighterColor, size: highlighterWidth, isEraser: false, isHighlighter: true };
        }
        return { color: penColor, size: penWidth, isEraser: false, isHighlighter: false };
    }, [currentTool, penColor, penWidth, eraserWidth, highlighterColor, highlighterWidth]);

    // Draw a single stroke to a canvas context
    const drawStroke = useCallback((
        ctx: CanvasRenderingContext2D,
        stroke: Pick<Stroke, 'points' | 'color' | 'size' | 'isEraser'> & { isShape?: boolean; isHighlighter?: boolean }
    ) => {
        if (stroke.points.length < 2) return;

        // Save context state for highlighter
        const wasHighlighter = stroke.isHighlighter;
        if (wasHighlighter) {
            ctx.globalAlpha = 0.5;
        }

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
            if (wasHighlighter) ctx.globalAlpha = 1.0;
            return;
        }

        // Highlighter strokes: use butt lineCap for chisel tip feel
        if (wasHighlighter) {
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size;
            ctx.lineCap = 'butt';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
            ctx.lineCap = 'round';
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

    // Setup canvas with High-DPI scaling - MUST update on pageCount change
    const setupCanvas = useCallback((canvas: HTMLCanvasElement | null, forceRedraw: boolean = false) => {
        if (!canvas || totalHeight === 0) return null;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Only resize if dimensions changed (resizing clears canvas)
        const targetWidth = PAGE_WIDTH * pixelRatio;
        const targetHeight = totalHeight * pixelRatio;

        if (canvas.width !== targetWidth || canvas.height !== targetHeight || forceRedraw) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(pixelRatio, pixelRatio);

        return ctx;
    }, [totalHeight, pixelRatio]);

    // Render static layer (stroke history)
    const renderStaticLayer = useCallback(() => {
        const canvas = staticLayerRef.current;
        if (!canvas || totalHeight === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize canvas if needed
        const targetWidth = pageWidth * pixelRatio;
        const targetHeight = totalHeight * pixelRatio;

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(pixelRatio, pixelRatio);
        ctx.clearRect(0, 0, pageWidth, totalHeight);

        // Draw all strokes
        strokes.forEach((stroke) => drawStroke(ctx, stroke));
        ctx.globalCompositeOperation = 'source-over';
    }, [totalHeight, pixelRatio, strokes, drawStroke, pageWidth]);

    // Render active layer (current stroke or shape preview)
    // Account for barrel button override for visual feedback
    // NUCLEAR DPI FIX: Force setTransform every frame to prevent scale corruption
    const renderActiveLayer = useCallback(() => {
        const canvas = activeLayerRef.current;
        if (!canvas || totalHeight === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Get DPR directly from window for maximum reliability
        const dpr = window.devicePixelRatio || 1;

        // Resize canvas if needed (sets physical pixels)
        const targetWidth = pageWidth * dpr;
        const targetHeight = totalHeight * dpr;

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            // Set CSS dimensions explicitly
            canvas.style.width = `${pageWidth}px`;
            canvas.style.height = `${totalHeight}px`;
        }

        // NUCLEAR FIX: Force scale matrix immediately before drawing
        // This ensures even if canvas resized between frames, we draw at HiDPI
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Clear using logical dimensions (setTransform handles the scaling)
        ctx.clearRect(0, 0, pageWidth, totalHeight);

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

        // Lasso path rendering - dashed line
        if (currentTool === 'lasso' && lassoPoints.length > 1) {
            ctx.strokeStyle = '#888888';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
            for (let i = 1; i < lassoPoints.length; i++) {
                ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Selection bounding box rendering
        if (selectedStrokeIds.length > 0 && currentTool === 'lasso') {
            const selectedStrokes = strokes.filter(s => selectedStrokeIds.includes(s.id));
            const bbox = getStrokesBoundingBox(selectedStrokes);

            // Draw bounding box
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(bbox.minX, bbox.minY, bbox.width, bbox.height);
            ctx.setLineDash([]);

            // Draw corner handles
            const handleSize = 8;
            const handles = [
                { x: bbox.minX, y: bbox.minY }, // Top-left
                { x: bbox.maxX, y: bbox.minY }, // Top-right
                { x: bbox.minX, y: bbox.maxY }, // Bottom-left
                { x: bbox.maxX, y: bbox.maxY }, // Bottom-right
            ];

            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;

            handles.forEach(handle => {
                ctx.beginPath();
                ctx.arc(handle.x, handle.y, handleSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
        }
    }, [totalHeight, pageWidth, getCurrentStrokeSettings, drawStroke, isBarrelButtonDown, eraserWidth, currentTool, activeShape, penColor, penWidth, isShiftHeld, lassoPoints, selectedStrokeIds, strokes]);

    // Re-render static layer when stroke history or page count changes
    useEffect(() => {
        renderStaticLayer();
    }, [strokes, pageCount, renderStaticLayer]);

    // Process image blob and add to canvas - centers on current page
    const processImageBlob = useCallback((blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
            // Calculate smart scale dimensions
            const maxWidth = Math.min(600, pageWidth * 0.8);
            const maxHeight = pageHeight * 0.6;
            const aspectRatio = img.naturalWidth / img.naturalHeight;

            let scaledWidth = maxWidth;
            let scaledHeight = scaledWidth / aspectRatio;

            if (scaledHeight > maxHeight) {
                scaledHeight = maxHeight;
                scaledWidth = scaledHeight * aspectRatio;
            }

            // Page-relative positioning: center on current page
            // X: Center of paper width
            const x = (pageWidth / 2) - (scaledWidth / 2);

            // Y: Center of the current page (accounting for gaps)
            // currentPage is 1-based (1, 2, 3...)
            const pageTopY = (currentPage - 1) * singlePageTotal;
            const y = pageTopY + (pageHeight / 2) - (scaledHeight / 2);

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
    }, [addImage, currentPage]);

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

        // Get canvas-relative coordinates using unified calculator
        const { x, y } = getPointerPosition(e, activeLayerRef.current, zoom);

        // Lasso mode: Check for handle or bbox interaction
        if (currentTool === 'lasso' && selectedStrokeIds.length > 0) {
            const selectedStrokes = strokes.filter(s => selectedStrokeIds.includes(s.id));
            const bbox = getStrokesBoundingBox(selectedStrokes);

            // Check if clicking on a resize handle (8px radius)
            const handleSize = 8;
            const handles = [
                { id: 'tl', x: bbox.minX, y: bbox.minY },
                { id: 'tr', x: bbox.maxX, y: bbox.minY },
                { id: 'bl', x: bbox.minX, y: bbox.maxY },
                { id: 'br', x: bbox.maxX, y: bbox.maxY },
            ];

            for (const handle of handles) {
                const dist = Math.sqrt((x - handle.x) ** 2 + (y - handle.y) ** 2);
                if (dist <= handleSize) {
                    // Start resizing from this handle
                    setActiveHandle(handle.id);
                    setDragStart({ x, y, bbox });
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                    return;
                }
            }

            if (isPointInBBox({ x, y, pressure: 0.5 }, bbox)) {
                // Start dragging selection
                setIsDraggingSelection(true);
                setDragStart({ x, y });
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                return;
            } else {
                // Clicked outside - commit and clear selection
                clearStrokeSelection();
            }
        }

        // In select mode, clicking empty canvas deselects image
        if (currentTool === 'select') {
            selectImage(null);
            return;
        }

        // Lasso mode: Start drawing lasso loop
        if (currentTool === 'lasso') {
            setLassoPoints([{ x, y, pressure: 0.5 }]);
            setIsDrawing(true);
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            return;
        }

        // Smart Button Logic: Check if barrel button (right-click/side button) is pressed
        // Bitmask: button 2 = right-click or pen barrel button
        const isSideButton = (e.buttons & 2) === 2;
        setIsBarrelButtonDown(isSideButton);

        // Track Shift key state
        setIsShiftHeld(e.shiftKey);

        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        // For shape tool, record start point
        if (currentTool === 'shape') {
            shapeStartRef.current = { x, y };
        }

        currentPointsRef.current = [{ x, y, pressure: e.pressure || 0.5 }];
        setIsDrawing(true);
    }, [currentTool, selectImage, zoom, selectedStrokeIds, strokes, clearStrokeSelection]);

    // Pointer Move - Continue drawing
    // IRON PALM: Strict filtering for pen/mouse only
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        // Strict palm rejection: only allow 'pen' or 'mouse', reject 'touch'
        if (e.pointerType !== 'pen' && e.pointerType !== 'mouse') return;

        // Get canvas-relative coordinates using unified calculator
        const { x, y } = getPointerPosition(e, activeLayerRef.current, zoom);

        // Handle resizing via corner handles
        if (activeHandle && dragStart && dragStart.bbox) {
            const originalBbox = dragStart.bbox;
            let newBbox = { ...originalBbox };

            // Update bbox based on which handle is being dragged
            switch (activeHandle) {
                case 'tl': // Top-left
                    newBbox.minX = x;
                    newBbox.minY = y;
                    break;
                case 'tr': // Top-right
                    newBbox.maxX = x;
                    newBbox.minY = y;
                    break;
                case 'bl': // Bottom-left
                    newBbox.minX = x;
                    newBbox.maxY = y;
                    break;
                case 'br': // Bottom-right
                    newBbox.maxX = x;
                    newBbox.maxY = y;
                    break;
            }

            // Calculate scale factors
            const scaleX = (newBbox.maxX - newBbox.minX) / (originalBbox.maxX - originalBbox.minX);
            const scaleY = (newBbox.maxY - newBbox.minY) / (originalBbox.maxY - originalBbox.minY);

            // Calculate translation (movement of the opposite corner)
            let dx = 0, dy = 0;
            switch (activeHandle) {
                case 'tl': // Top-left: opposite is bottom-right
                    dx = newBbox.minX - originalBbox.minX;
                    dy = newBbox.minY - originalBbox.minY;
                    break;
                case 'tr': // Top-right: opposite is bottom-left
                    dx = newBbox.maxX - originalBbox.maxX;
                    dy = newBbox.minY - originalBbox.minY;
                    break;
                case 'bl': // Bottom-left: opposite is top-right
                    dx = newBbox.minX - originalBbox.minX;
                    dy = newBbox.maxY - originalBbox.maxY;
                    break;
                case 'br': // Bottom-right: opposite is top-left
                    dx = newBbox.maxX - originalBbox.maxX;
                    dy = newBbox.maxY - originalBbox.maxY;
                    break;
            }

            // Determine the origin point (opposite corner from the handle)
            let origin = { x: 0, y: 0 };
            switch (activeHandle) {
                case 'tl': origin = { x: originalBbox.maxX, y: originalBbox.maxY }; break;
                case 'tr': origin = { x: originalBbox.minX, y: originalBbox.maxY }; break;
                case 'bl': origin = { x: originalBbox.maxX, y: originalBbox.minY }; break;
                case 'br': origin = { x: originalBbox.minX, y: originalBbox.minY }; break;
            }

            // Apply transformation
            transformStrokes(0, 0, scaleX, scaleY, origin);
            setDragStart({ ...dragStart, bbox: newBbox });
            renderActiveLayer();
            return;
        }

        // Handle dragging selected strokes
        if (isDraggingSelection && dragStart) {
            const dx = x - dragStart.x;
            const dy = y - dragStart.y;
            transformStrokes(dx, dy);
            setDragStart({ x, y });
            return;
        }

        // Handle lasso drawing
        if (currentTool === 'lasso' && isDrawing) {
            setLassoPoints(prev => [...prev, { x, y, pressure: 0.5 }]);
            renderActiveLayer();
            return;
        }

        if (!isDrawing) return;

        // Continue tracking barrel button state during stroke
        const isSideButton = (e.buttons & 2) === 2;
        if (isSideButton !== isBarrelButtonDown) {
            setIsBarrelButtonDown(isSideButton);
        }

        // Track Shift key state for shape constraints
        if (e.shiftKey !== isShiftHeld) {
            setIsShiftHeld(e.shiftKey);
        }

        if (currentPointsRef.current) {
            // For shapes, we only need start and current end point
            if (currentTool === 'shape') {
                currentPointsRef.current = [currentPointsRef.current[0], { x, y, pressure: e.pressure || 0.5 }];
            } else {
                currentPointsRef.current.push({ x, y, pressure: e.pressure || 0.5 });
            }
            renderActiveLayer();
        }
    }, [isDrawing, isBarrelButtonDown, isShiftHeld, renderActiveLayer, zoom, currentTool, isDraggingSelection, dragStart, transformStrokes, activeHandle]);

    // Pointer Up - End drawing and save stroke
    // IRON PALM: Strict filtering for pen/mouse only
    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        // Strict palm rejection: only allow 'pen' or 'mouse', reject 'touch'
        if (e.pointerType !== 'pen' && e.pointerType !== 'mouse') return;

        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        // Handle end of selection drag or resize
        if (isDraggingSelection || activeHandle) {
            setIsDraggingSelection(false);
            setActiveHandle(null);
            setDragStart(null);
            return;
        }

        // Lasso tool: Process selection
        if (currentTool === 'lasso' && lassoPoints.length > 2) {
            // Close the loop
            const closedLoop = [...lassoPoints, lassoPoints[0]];

            // Find strokes that intersect with the lasso
            const selectedStrokeIds = strokes
                .filter(stroke => doesStrokeIntersectSelection(stroke.points, closedLoop))
                .map(s => s.id);

            // Find text nodes that intersect with the lasso
            const selectedTextIds = textNodes
                .filter(node => doesTextIntersectSelection(node, closedLoop))
                .map(t => t.id);

            selectStrokes(selectedStrokeIds);
            selectText(selectedTextIds);
            setLassoPoints([]);
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
            return;
        }

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
    }, [addStroke, getCurrentStrokeSettings, isBarrelButtonDown, eraserWidth, currentTool, activeShape, penColor, penWidth, isShiftHeld, isDraggingSelection, lassoPoints, strokes, selectStrokes]);

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
        /* The Desk - dark background, handles scrolling */
        <div
            style={{
                position: 'relative',
                width: '100vw',
                minHeight: '100vh',
                backgroundColor: '#1a1a2e',
                display: 'flex',
                justifyContent: 'center',
                overflow: 'auto',
            }}
        >
            {/* The Paper - dynamic width based on PDF */}
            <div
                ref={containerRef}
                style={{
                    position: 'relative',
                    width: pageWidth * zoom,
                    height: totalHeight * zoom,
                    minHeight: '100vh',
                    flexShrink: 0,
                    // CSS Hardening for palm rejection
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    cursor: getCursor(),
                    // Paper shadow effect
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                }}
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
                        width: pageWidth,
                        height: totalHeight,
                    }}
                >
                    {/* Scroll Snap Targets - invisible page markers with gaps */}
                    {Array.from({ length: pageCount }).map((_, i) => (
                        <div
                            key={`page-snap-${i}`}
                            className="page-snap"
                            style={{
                                position: 'absolute',
                                top: i * singlePageTotal,
                                left: 0,
                                width: '100%',
                                height: pageHeight,
                                scrollSnapAlign: 'start',
                                scrollSnapStop: 'always',
                                pointerEvents: 'none',
                            }}
                        />
                    ))}

                    {/* Z-Index 0: Background */}
                    <BackgroundLayer totalHeight={totalHeight} />

                    {/* Z-Index 1: PDF Pages (sits under ink) */}
                    <PDFLayer />

                    {/* Z-Index 5: Images */}
                    <ObjectLayer totalHeight={totalHeight} />

                    {/* Z-Index 7: Text Nodes */}
                    <TextLayer totalHeight={totalHeight} />

                    {/* Z-Index 10: Stroke History + Page Separators */}
                    <canvas
                        ref={staticLayerRef}
                        style={{ ...canvasStyle, zIndex: 10, pointerEvents: 'none' }}
                    />

                    {/* Z-Index 15: Lasso Selection UI */}
                    <LassoLayer totalHeight={totalHeight} />

                    {/* Z-Index 20: Active Stroke */}
                    <canvas
                        ref={activeLayerRef}
                        style={{ ...canvasStyle, zIndex: 20, pointerEvents: 'none' }}
                    />
                </div>
            </div>
        </div>
    );
}
