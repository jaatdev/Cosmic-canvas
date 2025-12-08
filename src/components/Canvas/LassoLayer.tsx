'use client';

import { useStore } from '@/store/useStore';
import { getStrokesBoundingBox } from '@/utils/geometry';
import { useState, useEffect, useMemo } from 'react';
import { Plus, Minus, Copy, Trash2 } from 'lucide-react';

interface LassoLayerProps {
    totalHeight: number;
}

/**
 * LassoLayer Component - Z-Index 15
 * 
 * Renders the selection UI for the Quantum Lasso:
 * - Bounding box (blue dashed)
 * - 4 Corner handles (white squares)
 * - Floating Action Bar with +/-/duplicate/delete
 * 
 * All UI elements are zoom-compensated to maintain constant screen size.
 */
export default function LassoLayer({ totalHeight }: LassoLayerProps) {
    const {
        currentTool,
        zoom,
        strokes,
        textNodes,
        selectedStrokeIds,
        selectedTextIds,
        transformStrokes,
        scaleSelectedStrokes,
        duplicateSelectedStrokes,
        deleteSelectedStrokes,
        clearSelection,
    } = useStore();

    // Drag state - ALL hooks must be called before any conditional returns
    const [isDragging, setIsDragging] = useState(false);
    const [activeHandle, setActiveHandle] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [initialBbox, setInitialBbox] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);

    // Calculate bounding box from strokes (memoized)
    const selectedStrokes = useMemo(() =>
        strokes.filter(s => selectedStrokeIds.includes(s.id)),
        [strokes, selectedStrokeIds]
    );

    // Calculate bounding box from text nodes (memoized)
    const selectedTexts = useMemo(() =>
        textNodes.filter(t => selectedTextIds.includes(t.id)),
        [textNodes, selectedTextIds]
    );

    // Combined bounding box for strokes AND text
    const bbox = useMemo(() => {
        const hasStrokes = selectedStrokes.length > 0;
        const hasText = selectedTexts.length > 0;

        if (!hasStrokes && !hasText) return null;

        // Get stroke bounds
        const strokeBbox = hasStrokes ? getStrokesBoundingBox(selectedStrokes) : null;

        // Get text bounds
        let textMinX = Infinity, textMaxX = -Infinity;
        let textMinY = Infinity, textMaxY = -Infinity;

        if (hasText) {
            selectedTexts.forEach(t => {
                const width = t.content.length * (t.fontSize * 0.6);
                const height = t.fontSize * 1.2;
                textMinX = Math.min(textMinX, t.x);
                textMaxX = Math.max(textMaxX, t.x + width);
                textMinY = Math.min(textMinY, t.y);
                textMaxY = Math.max(textMaxY, t.y + height);
            });
        }

        // Combine bounds
        if (hasStrokes && hasText) {
            return {
                minX: Math.min(strokeBbox!.minX, textMinX),
                maxX: Math.max(strokeBbox!.maxX, textMaxX),
                minY: Math.min(strokeBbox!.minY, textMinY),
                maxY: Math.max(strokeBbox!.maxY, textMaxY),
                width: 0,
                height: 0,
            };
        } else if (hasStrokes) {
            return strokeBbox;
        } else {
            return {
                minX: textMinX,
                maxX: textMaxX,
                minY: textMinY,
                maxY: textMaxY,
                width: textMaxX - textMinX,
                height: textMaxY - textMinY,
            };
        }
    }, [selectedStrokes, selectedTexts]);

    // Keyboard navigation - Hook called unconditionally
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle if we have selection and are in lasso mode
            const hasSelection = selectedStrokeIds.length > 0 || selectedTextIds.length > 0;
            if (!hasSelection || currentTool !== 'lasso') return;

            const moveAmount = 10;
            let dx = 0, dy = 0;

            switch (e.key) {
                case 'ArrowUp': dy = -moveAmount; break;
                case 'ArrowDown': dy = moveAmount; break;
                case 'ArrowLeft': dx = -moveAmount; break;
                case 'ArrowRight': dx = moveAmount; break;
                case 'Delete':
                case 'Backspace':
                    e.preventDefault();
                    deleteSelectedStrokes();
                    return;
                case 'Escape':
                    clearSelection();
                    return;
                default:
                    return;
            }

            if (dx !== 0 || dy !== 0) {
                e.preventDefault();
                transformStrokes(dx, dy);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedStrokeIds, selectedTextIds, currentTool, transformStrokes, deleteSelectedStrokes, clearSelection]);

    // Don't render if not in lasso mode or no selection - AFTER all hooks
    const hasSelection = selectedStrokeIds.length > 0 || selectedTextIds.length > 0;
    if (currentTool !== 'lasso' || !hasSelection || !bbox) {
        return null;
    }

    // Zoom compensation factor for UI elements
    const uiScale = 1 / zoom;

    // Handle sizes (in screen pixels, compensated for zoom)
    const handleSize = 12 * uiScale;
    const hitAreaSize = 24 * uiScale;

    // Corner handle positions
    const handles = [
        { id: 'tl', x: bbox.minX, y: bbox.minY },
        { id: 'tr', x: bbox.maxX, y: bbox.minY },
        { id: 'bl', x: bbox.minX, y: bbox.maxY },
        { id: 'br', x: bbox.maxX, y: bbox.maxY },
    ];

    // Pointer down on bbox (start dragging)
    const handleBboxPointerDown = (e: React.PointerEvent) => {
        e.stopPropagation();
        const x = e.pageX / zoom;
        const y = e.pageY / zoom;
        setIsDragging(true);
        setDragStart({ x, y });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    // Pointer down on handle (start resizing)
    const handleHandlePointerDown = (handleId: string) => (e: React.PointerEvent) => {
        e.stopPropagation();
        const x = e.pageX / zoom;
        const y = e.pageY / zoom;
        setActiveHandle(handleId);
        setDragStart({ x, y });
        setInitialBbox({ ...bbox });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    // Pointer move (dragging or resizing)
    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragStart) return;

        const x = e.pageX / zoom;
        const y = e.pageY / zoom;

        if (isDragging) {
            const dx = x - dragStart.x;
            const dy = y - dragStart.y;
            transformStrokes(dx, dy);
            setDragStart({ x, y });
        } else if (activeHandle && initialBbox) {
            const oppositeCorner = {
                tl: { x: initialBbox.maxX, y: initialBbox.maxY },
                tr: { x: initialBbox.minX, y: initialBbox.maxY },
                bl: { x: initialBbox.maxX, y: initialBbox.minY },
                br: { x: initialBbox.minX, y: initialBbox.minY },
            }[activeHandle]!;

            const originalDist = Math.sqrt(
                (dragStart.x - oppositeCorner.x) ** 2 +
                (dragStart.y - oppositeCorner.y) ** 2
            );
            const newDist = Math.sqrt(
                (x - oppositeCorner.x) ** 2 +
                (y - oppositeCorner.y) ** 2
            );

            if (originalDist > 0) {
                const scaleFactor = newDist / originalDist;
                transformStrokes(0, 0, scaleFactor, scaleFactor, oppositeCorner);
                setDragStart({ x, y });
                setInitialBbox({ ...bbox });
            }
        }
    };

    // Pointer up (end interaction)
    const handlePointerUp = () => {
        setIsDragging(false);
        setActiveHandle(null);
        setDragStart(null);
        setInitialBbox(null);
    };

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: totalHeight,
                zIndex: 15,
                pointerEvents: 'none',
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            {/* Bounding Box */}
            <div
                style={{
                    position: 'absolute',
                    left: bbox.minX,
                    top: bbox.minY,
                    width: bbox.width,
                    height: bbox.height,
                    border: `${2 * uiScale}px dashed #3b82f6`,
                    pointerEvents: 'auto',
                    cursor: 'move',
                }}
                onPointerDown={handleBboxPointerDown}
            />

            {/* Corner Handles */}
            {handles.map(handle => (
                <div
                    key={handle.id}
                    style={{
                        position: 'absolute',
                        left: handle.x - hitAreaSize / 2,
                        top: handle.y - hitAreaSize / 2,
                        width: hitAreaSize,
                        height: hitAreaSize,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'auto',
                        cursor: handle.id === 'tl' || handle.id === 'br' ? 'nwse-resize' : 'nesw-resize',
                    }}
                    onPointerDown={handleHandlePointerDown(handle.id)}
                >
                    <div
                        style={{
                            width: handleSize,
                            height: handleSize,
                            backgroundColor: '#ffffff',
                            border: `${2 * uiScale}px solid #3b82f6`,
                            borderRadius: 2 * uiScale,
                        }}
                    />
                </div>
            ))}

            {/* Floating Action Bar */}
            <div
                style={{
                    position: 'absolute',
                    left: bbox.minX + bbox.width / 2,
                    top: bbox.maxY + 16 * uiScale,
                    transform: `translateX(-50%) scale(${uiScale})`,
                    transformOrigin: 'top center',
                    display: 'flex',
                    gap: '4px',
                    padding: '6px',
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    pointerEvents: 'auto',
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => scaleSelectedStrokes(0.9)}
                    style={{
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                    }}
                    title="Shrink 10%"
                >
                    <Minus size={18} />
                </button>

                <button
                    onClick={() => scaleSelectedStrokes(1.1)}
                    style={{
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                    }}
                    title="Grow 10%"
                >
                    <Plus size={18} />
                </button>

                <div style={{ width: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

                <button
                    onClick={duplicateSelectedStrokes}
                    style={{
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                    }}
                    title="Duplicate"
                >
                    <Copy size={18} />
                </button>

                <button
                    onClick={deleteSelectedStrokes}
                    style={{
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#ef4444',
                        cursor: 'pointer',
                    }}
                    title="Delete"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
}
