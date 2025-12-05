'use client';

import { useStore } from '@/store/useStore';
import { useState, useCallback, useRef } from 'react';

interface ObjectLayerProps {
    totalHeight?: number;
}

type DragState = {
    type: 'none' | 'move' | 'resize';
    startX: number;
    startY: number;
    startImgX: number;
    startImgY: number;
    startImgW: number;
    startImgH: number;
    handle?: 'nw' | 'ne' | 'sw' | 'se';
};

/**
 * ObjectLayer Component - Smart Image Snippets with Transform Gizmo
 * 
 * Renders images below the ink layer but above the background.
 * When select tool is active, images can be moved and resized.
 */
export default function ObjectLayer({ totalHeight }: ObjectLayerProps) {
    const { images, currentTool, selectedImageId, selectImage, updateImage } = useStore();
    const [dragState, setDragState] = useState<DragState>({
        type: 'none',
        startX: 0,
        startY: 0,
        startImgX: 0,
        startImgY: 0,
        startImgW: 0,
        startImgH: 0,
    });
    const containerRef = useRef<HTMLDivElement>(null);

    const isSelectMode = currentTool === 'select';

    // Handle clicking on an image to select it
    const handleImageClick = useCallback((e: React.MouseEvent, imgId: string) => {
        if (!isSelectMode) return;
        e.stopPropagation();
        selectImage(imgId);
    }, [isSelectMode, selectImage]);

    // Start moving an image
    const handleMoveStart = useCallback((e: React.PointerEvent, img: typeof images[0]) => {
        if (!isSelectMode || selectedImageId !== img.id) return;
        e.stopPropagation();
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        setDragState({
            type: 'move',
            startX: e.clientX,
            startY: e.clientY,
            startImgX: img.x,
            startImgY: img.y,
            startImgW: img.width,
            startImgH: img.height,
        });
    }, [isSelectMode, selectedImageId]);

    // Start resizing an image from a corner handle
    const handleResizeStart = useCallback((
        e: React.PointerEvent,
        img: typeof images[0],
        handle: 'nw' | 'ne' | 'sw' | 'se'
    ) => {
        if (!isSelectMode) return;
        e.stopPropagation();
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        setDragState({
            type: 'resize',
            startX: e.clientX,
            startY: e.clientY,
            startImgX: img.x,
            startImgY: img.y,
            startImgW: img.width,
            startImgH: img.height,
            handle,
        });
    }, [isSelectMode]);

    // Handle pointer move for dragging/resizing
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (dragState.type === 'none' || !selectedImageId) return;

        const deltaX = e.clientX - dragState.startX;
        const deltaY = e.clientY - dragState.startY;

        if (dragState.type === 'move') {
            updateImage(selectedImageId, {
                x: dragState.startImgX + deltaX,
                y: dragState.startImgY + deltaY,
            });
        } else if (dragState.type === 'resize' && dragState.handle) {
            const aspectRatio = dragState.startImgW / dragState.startImgH;
            let newWidth = dragState.startImgW;
            let newHeight = dragState.startImgH;
            let newX = dragState.startImgX;
            let newY = dragState.startImgY;

            switch (dragState.handle) {
                case 'se':
                    newWidth = Math.max(50, dragState.startImgW + deltaX);
                    newHeight = newWidth / aspectRatio;
                    break;
                case 'sw':
                    newWidth = Math.max(50, dragState.startImgW - deltaX);
                    newHeight = newWidth / aspectRatio;
                    newX = dragState.startImgX + (dragState.startImgW - newWidth);
                    break;
                case 'ne':
                    newWidth = Math.max(50, dragState.startImgW + deltaX);
                    newHeight = newWidth / aspectRatio;
                    newY = dragState.startImgY + (dragState.startImgH - newHeight);
                    break;
                case 'nw':
                    newWidth = Math.max(50, dragState.startImgW - deltaX);
                    newHeight = newWidth / aspectRatio;
                    newX = dragState.startImgX + (dragState.startImgW - newWidth);
                    newY = dragState.startImgY + (dragState.startImgH - newHeight);
                    break;
            }

            updateImage(selectedImageId, {
                x: newX,
                y: newY,
                width: newWidth,
                height: newHeight,
            });
        }
    }, [dragState, selectedImageId, updateImage]);

    // End dragging/resizing
    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (dragState.type !== 'none') {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            setDragState({
                type: 'none',
                startX: 0,
                startY: 0,
                startImgX: 0,
                startImgY: 0,
                startImgW: 0,
                startImgH: 0,
            });
        }
    }, [dragState.type]);

    if (images.length === 0) return null;

    return (
        <div
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: totalHeight || '100%',
                zIndex: 5,
                pointerEvents: isSelectMode ? 'auto' : 'none',
                userSelect: 'none',
            }}
        >
            {images.map((img) => {
                const isSelected = selectedImageId === img.id;

                return (
                    <div
                        key={img.id}
                        onClick={(e) => handleImageClick(e, img.id)}
                        onPointerDown={(e) => handleMoveStart(e, img)}
                        style={{
                            position: 'absolute',
                            left: img.x,
                            top: img.y,
                            width: img.width,
                            height: img.height,
                            cursor: isSelectMode ? (isSelected ? 'move' : 'pointer') : 'default',
                        }}
                    >
                        {/* The Image */}
                        <img
                            src={img.url}
                            alt=""
                            draggable={false}
                            style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '8px',
                                boxShadow: isSelected
                                    ? '0 0 0 2px #3b82f6, 0 4px 20px rgba(59, 130, 246, 0.3)'
                                    : '0 4px 20px rgba(0, 0, 0, 0.15)',
                                pointerEvents: 'none',
                            }}
                        />

                        {/* Selection Gizmo */}
                        {isSelected && isSelectMode && (
                            <>
                                {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => {
                                    const positions: Record<string, React.CSSProperties> = {
                                        nw: { top: -6, left: -6, cursor: 'nwse-resize' },
                                        ne: { top: -6, right: -6, cursor: 'nesw-resize' },
                                        sw: { bottom: -6, left: -6, cursor: 'nesw-resize' },
                                        se: { bottom: -6, right: -6, cursor: 'nwse-resize' },
                                    };

                                    return (
                                        <div
                                            key={handle}
                                            onPointerDown={(e) => handleResizeStart(e, img, handle)}
                                            style={{
                                                position: 'absolute',
                                                width: 12,
                                                height: 12,
                                                backgroundColor: 'white',
                                                border: '2px solid #3b82f6',
                                                borderRadius: 2,
                                                ...positions[handle],
                                            }}
                                        />
                                    );
                                })}
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
