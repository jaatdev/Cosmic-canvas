/**
 * Canvas Coordinate Utilities
 * 
 * Unified coordinate calculations to prevent position jumps/drift.
 */

/**
 * Get pointer position relative to canvas element, accounting for zoom.
 * 
 * Uses getBoundingClientRect() which gives the size/position after CSS transforms
 * and margins. This ensures consistent coordinates across all pointer handlers.
 * 
 * @param e - Pointer event (React or native)
 * @param canvas - The canvas element to measure against
 * @param zoom - Current zoom level
 * @returns Position in canvas coordinate space
 */
export const getPointerPosition = (
    e: React.PointerEvent | PointerEvent,
    canvas: HTMLCanvasElement | HTMLDivElement | null,
    zoom: number
): { x: number; y: number } => {
    if (!canvas) {
        return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom
    };
};
