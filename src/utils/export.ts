import { jsPDF } from 'jspdf';
import getStroke from 'perfect-freehand';
import { getSvgPathFromStroke } from './ink';
import { Stroke, CanvasImage, Pattern } from '@/types';

interface ExportConfig {
    projectName: string;
    background: string;
    pattern: Pattern;
    width: number;
    height: number;
}

// perfect-freehand options (same as Stage.tsx)
const getStrokeOptions = (size: number) => ({
    size,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    easing: (t: number) => t,
    start: { taper: 0, cap: true },
    end: { taper: size * 3, cap: true },
});

// Draw pattern on canvas
const drawPattern = (
    ctx: CanvasRenderingContext2D,
    pattern: Pattern,
    width: number,
    height: number
) => {
    if (pattern === 'none') return;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;

    switch (pattern) {
        case 'grid':
            const gridSize = 30;
            ctx.beginPath();
            for (let x = 0; x <= width; x += gridSize) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
            }
            for (let y = 0; y <= height; y += gridSize) {
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
            }
            ctx.stroke();
            break;

        case 'dots':
            const dotSpacing = 25;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            for (let x = dotSpacing; x < width; x += dotSpacing) {
                for (let y = dotSpacing; y < height; y += dotSpacing) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            break;

        case 'lines':
            const lineSpacing = 30;
            ctx.beginPath();
            for (let y = lineSpacing; y < height; y += lineSpacing) {
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
            }
            ctx.stroke();
            break;
    }
};

// Load image from URL and return as HTMLImageElement
const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
};

// Draw a stroke on canvas
const drawStroke = (
    ctx: CanvasRenderingContext2D,
    stroke: Stroke
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
};

/**
 * Export canvas content to PDF
 */
export const exportToPdf = async (
    strokes: Stroke[],
    images: CanvasImage[],
    config: ExportConfig
): Promise<void> => {
    const { width, height, projectName, background, pattern } = config;

    // Create temporary canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Layer 1: Background
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    // Layer 1.5: Pattern
    drawPattern(ctx, pattern, width, height);

    // Layer 2: Images
    for (const img of images) {
        try {
            const loadedImg = await loadImage(img.url);
            ctx.drawImage(loadedImg, img.x, img.y, img.width, img.height);
        } catch (error) {
            console.warn(`Failed to load image ${img.id}:`, error);
        }
    }

    // Layer 3: Strokes
    ctx.globalCompositeOperation = 'source-over';
    for (const stroke of strokes) {
        drawStroke(ctx, stroke);
    }
    ctx.globalCompositeOperation = 'source-over';

    // Generate PDF
    const orientation = width > height ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [width, height],
    });

    // Add canvas as image to PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);

    // Save PDF
    pdf.save(`${projectName}.pdf`);
};

export default exportToPdf;
