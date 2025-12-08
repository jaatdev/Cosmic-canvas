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

// ==================== LASSO SELECTION UTILITIES ====================

/**
 * Bounding Box interface
 */
export interface BoundingBox {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

/**
 * Check if a point is inside a polygon using the ray casting algorithm
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
    if (polygon.length < 3) return false;

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Get bounding box for a set of points
 */
export function getPointsBoundingBox(points: Point[]): BoundingBox {
    if (points.length === 0) {
        return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);

    return {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
    };
}

/**
 * Check if two bounding boxes overlap
 */
export function doBBoxesOverlap(bbox1: BoundingBox, bbox2: BoundingBox): boolean {
    return !(bbox1.maxX < bbox2.minX ||
        bbox2.maxX < bbox1.minX ||
        bbox1.maxY < bbox2.minY ||
        bbox2.maxY < bbox1.minY);
}

/**
 * Check if a stroke intersects with a selection polygon
 * Uses bounding box optimization first, then point-in-polygon test
 */
export function doesStrokeIntersectSelection(
    strokePoints: Point[],
    selectionPoly: Point[]
): boolean {
    if (strokePoints.length === 0 || selectionPoly.length < 3) {
        return false;
    }

    // Quick bounding box check first
    const strokeBBox = getPointsBoundingBox(strokePoints);
    const polyBBox = getPointsBoundingBox(selectionPoly);

    if (!doBBoxesOverlap(strokeBBox, polyBBox)) {
        return false;
    }

    // Check if any stroke point is inside the polygon
    return strokePoints.some(point => isPointInPolygon(point, selectionPoly));
}

/**
 * Get bounding box for multiple strokes
 */
export function getStrokesBoundingBox(strokes: Array<{ points: Point[] }>): BoundingBox & { width: number; height: number } {
    const allPoints = strokes.flatMap(s => s.points);
    const bbox = getPointsBoundingBox(allPoints);

    return {
        ...bbox,
        width: bbox.maxX - bbox.minX,
        height: bbox.maxY - bbox.minY,
    };
}

/**
 * Check if a point is inside a bounding box
 */
export function isPointInBBox(point: Point, bbox: BoundingBox): boolean {
    return point.x >= bbox.minX &&
        point.x <= bbox.maxX &&
        point.y >= bbox.minY &&
        point.y <= bbox.maxY;
}

/**
 * Scale a point relative to a center point
 * Used for resizing stroke selections
 */
export function scalePoint(point: Point, center: Point, scaleX: number, scaleY: number): Point {
    return {
        x: center.x + (point.x - center.x) * scaleX,
        y: center.y + (point.y - center.y) * scaleY,
        pressure: point.pressure,
    };
}

/**
 * Check if a text node intersects with a selection polygon
 * Estimates text bounds and checks if the rectangle overlaps with the lasso
 */
export interface TextNodeBounds {
    id: string;
    x: number;
    y: number;
    content: string;
    fontSize: number;
}

export function doesTextIntersectSelection(
    textNode: TextNodeBounds,
    selectionPoly: Point[]
): boolean {
    if (selectionPoly.length < 3) return false;

    // Estimate text dimensions
    const width = textNode.content.length * (textNode.fontSize * 0.6);
    const height = textNode.fontSize * 1.2;

    // Text node bounding box
    const textBBox: BoundingBox = {
        minX: textNode.x,
        maxX: textNode.x + width,
        minY: textNode.y,
        maxY: textNode.y + height,
    };

    // Quick bounding box check
    const polyBBox = getPointsBoundingBox(selectionPoly);
    if (!doBBoxesOverlap(textBBox, polyBBox)) {
        return false;
    }

    // Check if any corner of the text box is inside the polygon
    const corners: Point[] = [
        { x: textBBox.minX, y: textBBox.minY, pressure: 0.5 },
        { x: textBBox.maxX, y: textBBox.minY, pressure: 0.5 },
        { x: textBBox.maxX, y: textBBox.maxY, pressure: 0.5 },
        { x: textBBox.minX, y: textBBox.maxY, pressure: 0.5 },
    ];

    // Check if any corner is inside the polygon
    if (corners.some(corner => isPointInPolygon(corner, selectionPoly))) {
        return true;
    }

    // Check if the center of the text is inside the polygon
    const centerPoint: Point = {
        x: (textBBox.minX + textBBox.maxX) / 2,
        y: (textBBox.minY + textBBox.maxY) / 2,
        pressure: 0.5,
    };

    return isPointInPolygon(centerPoint, selectionPoly);
}
