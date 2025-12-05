// High-DPI Canvas Utilities

/**
 * Setup canvas for high-DPI displays
 */
export const setupHighDPICanvas = (
    canvas: HTMLCanvasElement,
    width: number,
    height: number
): CanvasRenderingContext2D | null => {
    const dpr = window.devicePixelRatio || 1;

    // Set display size (CSS pixels)
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Set actual size in memory (scaled for DPI)
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
        // Scale all drawing operations
        ctx.scale(dpr, dpr);
    }

    return ctx;
};

/**
 * Convert screen coordinates to canvas coordinates
 */
export const screenToCanvas = (
    screenX: number,
    screenY: number,
    canvas: HTMLCanvasElement,
    viewOffset: { x: number; y: number } = { x: 0, y: 0 },
    zoom: number = 1
): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    return {
        x: ((screenX - rect.left) * dpr - viewOffset.x) / zoom,
        y: ((screenY - rect.top) * dpr - viewOffset.y) / zoom,
    };
};

/**
 * Convert canvas coordinates to screen coordinates
 */
export const canvasToScreen = (
    canvasX: number,
    canvasY: number,
    canvas: HTMLCanvasElement,
    viewOffset: { x: number; y: number } = { x: 0, y: 0 },
    zoom: number = 1
): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    return {
        x: (canvasX * zoom + viewOffset.x) / dpr + rect.left,
        y: (canvasY * zoom + viewOffset.y) / dpr + rect.top,
    };
};

/**
 * Calculate distance between two points
 */
export const getDistance = (
    p1: { x: number; y: number },
    p2: { x: number; y: number }
): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Smooth point array using Catmull-Rom spline
 */
export const smoothPoints = (
    points: { x: number; y: number }[],
    tension: number = 0.5
): { x: number; y: number }[] => {
    if (points.length < 3) return points;

    const smoothed: { x: number; y: number }[] = [];

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[Math.min(points.length - 1, i + 1)];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        // Add the original point
        smoothed.push(p1);

        // Add interpolated point
        const t = 0.5;
        const t2 = t * t;
        const t3 = t2 * t;

        const x = 0.5 * (
            (2 * p1.x) +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        );

        const y = 0.5 * (
            (2 * p1.y) +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        );

        smoothed.push({ x, y });
    }

    // Add the last point
    smoothed.push(points[points.length - 1]);

    return smoothed;
};

/**
 * Generate unique ID
 */
export const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Clamp value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};

/**
 * Lerp (linear interpolation) between two values
 */
export const lerp = (a: number, b: number, t: number): number => {
    return a + (b - a) * t;
};
