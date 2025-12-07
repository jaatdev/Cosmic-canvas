/**
 * Geometry Utilities for Shape Engine
 * 
 * Helper functions to generate shapes with Shift-key aspect ratio locking.
 * Returns arrays of Point objects for stroke-based rendering.
 */

import { Point } from '@/types';

interface Vec2 {
    x: number;
    y: number;
}

/**
 * Create a Point with default pressure
 */
const pt = (x: number, y: number, pressure: number = 0.5): Point => ({ x, y, pressure });

/**
 * Get rectangle points (outline as stroke path)
 * If isShift, forces a perfect square
 */
export function getRect(start: Vec2, end: Vec2, isShift: boolean): Point[] {
    let width = end.x - start.x;
    let height = end.y - start.y;

    if (isShift) {
        // Force square: use the smaller dimension
        const size = Math.min(Math.abs(width), Math.abs(height));
        width = Math.sign(width) * size || size;
        height = Math.sign(height) * size || size;
    }

    const x1 = start.x;
    const y1 = start.y;
    const x2 = start.x + width;
    const y2 = start.y + height;

    // Return rectangle outline as continuous path
    return [
        pt(x1, y1), pt(x2, y1), pt(x2, y2), pt(x1, y2), pt(x1, y1)
    ];
}

/**
 * Get circle/ellipse points (approximated with many points)
 * If isShift, forces a perfect circle
 */
export function getCircle(start: Vec2, end: Vec2, isShift: boolean): Point[] {
    let radiusX = Math.abs(end.x - start.x) / 2;
    let radiusY = Math.abs(end.y - start.y) / 2;

    if (isShift) {
        // Force circle: use the smaller radius
        const radius = Math.min(radiusX, radiusY);
        radiusX = radius;
        radiusY = radius;
    }

    const centerX = start.x + (end.x - start.x) / 2;
    const centerY = start.y + (end.y - start.y) / 2;

    // If isShift, adjust center to maintain square bounds from start
    if (isShift) {
        const size = Math.min(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
        const signX = Math.sign(end.x - start.x) || 1;
        const signY = Math.sign(end.y - start.y) || 1;
        const adjustedEndX = start.x + signX * size;
        const adjustedEndY = start.y + signY * size;
        // Recalculate center
        const cx = start.x + (adjustedEndX - start.x) / 2;
        const cy = start.y + (adjustedEndY - start.y) / 2;

        const points: Point[] = [];
        const segments = 64;
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push(pt(
                cx + radiusX * Math.cos(angle),
                cy + radiusY * Math.sin(angle)
            ));
        }
        return points;
    }

    const points: Point[] = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(pt(
            centerX + radiusX * Math.cos(angle),
            centerY + radiusY * Math.sin(angle)
        ));
    }
    return points;
}

/**
 * Get isosceles triangle points
 */
export function getTriangle(start: Vec2, end: Vec2): Point[] {
    const width = end.x - start.x;
    const height = end.y - start.y;

    // Apex at top center, base at bottom
    const apex = pt(start.x + width / 2, start.y);
    const bottomLeft = pt(start.x, start.y + height);
    const bottomRight = pt(end.x, start.y + height);

    return [apex, bottomRight, bottomLeft, apex];
}

/**
 * Get line points
 * If isShift, snaps to nearest 45-degree angle
 */
export function getLine(start: Vec2, end: Vec2, isShift: boolean): Point[] {
    let finalEnd = { ...end };

    if (isShift) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const angle = Math.atan2(dy, dx);
        const length = Math.sqrt(dx * dx + dy * dy);

        // Snap to nearest 45-degree increment (0, 45, 90, 135, 180, etc.)
        const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);

        finalEnd = {
            x: start.x + length * Math.cos(snappedAngle),
            y: start.y + length * Math.sin(snappedAngle)
        };
    }

    return [pt(start.x, start.y), pt(finalEnd.x, finalEnd.y)];
}

/**
 * Get arrow points (line with arrowhead)
 * If isShift, snaps line to nearest 45-degree angle
 */
export function getArrow(start: Vec2, end: Vec2, isShift: boolean): Point[] {
    let finalEnd = { ...end };

    if (isShift) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const angle = Math.atan2(dy, dx);
        const length = Math.sqrt(dx * dx + dy * dy);

        // Snap to nearest 45-degree increment
        const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);

        finalEnd = {
            x: start.x + length * Math.cos(snappedAngle),
            y: start.y + length * Math.sin(snappedAngle)
        };
    }

    // Calculate arrowhead
    const dx = finalEnd.x - start.x;
    const dy = finalEnd.y - start.y;
    const theta = Math.atan2(dy, dx);
    const length = Math.sqrt(dx * dx + dy * dy);

    // Arrowhead size proportional to line length, capped
    const headLength = Math.min(20, length * 0.25);
    const headAngle = Math.PI / 6; // 30 degrees

    // Arrowhead tip angles (135 degrees offset from line direction)
    const tip1Angle = theta + Math.PI - headAngle;
    const tip2Angle = theta + Math.PI + headAngle;

    const tip1 = {
        x: finalEnd.x + headLength * Math.cos(tip1Angle),
        y: finalEnd.y + headLength * Math.sin(tip1Angle)
    };

    const tip2 = {
        x: finalEnd.x + headLength * Math.cos(tip2Angle),
        y: finalEnd.y + headLength * Math.sin(tip2Angle)
    };

    // Return path: line + arrowhead (go to tip1, back to end, to tip2)
    return [
        pt(start.x, start.y),
        pt(finalEnd.x, finalEnd.y),
        pt(tip1.x, tip1.y),
        pt(finalEnd.x, finalEnd.y),
        pt(tip2.x, tip2.y)
    ];
}

/**
 * Get shape points based on shape type
 */
export function getShapePoints(
    shapeType: string,
    start: Vec2,
    end: Vec2,
    isShift: boolean
): Point[] {
    switch (shapeType) {
        case 'rectangle':
            return getRect(start, end, isShift);
        case 'circle':
            return getCircle(start, end, isShift);
        case 'triangle':
            return getTriangle(start, end);
        case 'line':
            return getLine(start, end, isShift);
        case 'arrow':
            return getArrow(start, end, isShift);
        default:
            return getRect(start, end, isShift);
    }
}
