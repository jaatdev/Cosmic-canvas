/**
 * Ink Utility - Converts perfect-freehand stroke points to SVG path
 * 
 * Takes the polygon points from getStroke() and creates a smooth
 * SVG path string that can be used with Path2D or ctx.fill()
 */

/**
 * Convert stroke points to an SVG path data string
 * @param stroke - Array of [x, y] points from perfect-freehand
 * @returns SVG path d attribute string
 */
export function getSvgPathFromStroke(stroke: number[][]): string {
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
}
