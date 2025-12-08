import { jsPDF } from 'jspdf';
import getStroke from 'perfect-freehand';
import { getSvgPathFromStroke } from './ink';
import { Stroke, CanvasImage, Pattern } from '@/types';
import { PAGE_WIDTH, PAGE_HEIGHT } from '@/constants/canvas';

interface ExportConfig {
    projectName: string;
    background: string;
    pattern: Pattern;
    pageCount: number;
}

// perfect-freehand options
const getStrokeOptions = (size: number) => ({
    size,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    easing: (t: number) => t,
    start: { taper: 0, cap: true },
    end: { taper: size * 3, cap: true },
});

/**
 * Get pattern color based on background brightness
 */
const getPatternColor = (backgroundColor: string): string => {
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) || 255;
    const g = parseInt(hex.substr(2, 2), 16) || 255;
    const b = parseInt(hex.substr(4, 2), 16) || 255;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
};

/**
 * Draw pattern on PDF page using jsPDF lines
 */
const drawPatternOnPdf = (
    pdf: jsPDF,
    pattern: Pattern,
    width: number,
    height: number,
    backgroundColor: string
) => {
    if (pattern === 'none') return;

    const color = getPatternColor(backgroundColor);
    // Parse rgba to get opacity-adjusted color
    const isLight = color.includes('255,255,255');
    const lineColor = isLight ? 220 : 30;
    pdf.setDrawColor(lineColor, lineColor, lineColor);
    pdf.setLineWidth(0.5);

    switch (pattern) {
        case 'grid':
            for (let x = 0; x <= width; x += 40) {
                pdf.line(x, 0, x, height);
            }
            for (let y = 0; y <= height; y += 40) {
                pdf.line(0, y, width, y);
            }
            break;

        case 'dots':
            const dotColor = isLight ? 220 : 30;
            pdf.setFillColor(dotColor, dotColor, dotColor);
            for (let x = 20; x < width; x += 20) {
                for (let y = 20; y < height; y += 20) {
                    pdf.circle(x, y, 1.5, 'F');
                }
            }
            break;

        case 'lines':
            for (let y = 40; y <= height; y += 40) {
                pdf.line(0, y, width, y);
            }
            break;

        case 'isometric':
            // 60° triangular grid
            for (let x = 0; x <= width + 86.6; x += 86.6) {
                for (let y = 0; y <= height + 100; y += 100) {
                    pdf.line(x, y, x + 43.3, y + 50);
                    pdf.line(x + 86.6, y, x + 43.3, y + 50);
                    pdf.line(x + 43.3, y - 50, x + 43.3, y + 50);
                }
            }
            break;

        case 'music':
            // 5-line staves every 200px
            for (let staveY = 20; staveY < height; staveY += 200) {
                for (let line = 0; line < 5; line++) {
                    const y = staveY + line * 20;
                    if (y < height) {
                        pdf.line(0, y, width, y);
                    }
                }
            }
            break;

        case 'cornell':
            // Cue column at 200px
            pdf.setLineWidth(1);
            pdf.line(200, 0, 200, height);
            // Summary line 200px from bottom
            pdf.line(0, height - 200, width, height - 200);
            break;
    }
};

/**
 * Draw stroke on canvas (for rasterizing ink layer)
 */
const drawStroke = (
    ctx: CanvasRenderingContext2D,
    stroke: Stroke,
    offsetY: number = 0
) => {
    if (stroke.points.length < 2) return;

    // Set transparency for highlighters
    const wasHighlighter = stroke.isHighlighter;
    if (wasHighlighter) {
        ctx.globalAlpha = 0.4; // Slightly more transparent than on-screen for better print result
    }

    if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
    } else {
        ctx.globalCompositeOperation = 'source-over';
    }

    // Handle shape strokes with clean lines
    if (stroke.isShape) {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = wasHighlighter ? 'butt' : 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y - offsetY);
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y - offsetY);
        }
        ctx.stroke();
        if (wasHighlighter) {
            ctx.globalAlpha = 1.0;
            ctx.lineCap = 'round';
        }
        return;
    }

    // Highlighter strokes: use simple line drawing for chisel tip feel
    if (wasHighlighter) {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y - offsetY);
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y - offsetY);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.lineCap = 'round';
        return;
    }

    // Freehand strokes with perfect-freehand
    const inputPoints = stroke.points.map(p => [p.x, p.y - offsetY, p.pressure]);
    const strokeOutline = getStroke(inputPoints, getStrokeOptions(stroke.size));
    const pathData = getSvgPathFromStroke(strokeOutline);
    const path = new Path2D(pathData);

    ctx.fillStyle = stroke.isEraser ? '#000000' : stroke.color;
    ctx.fill(path);
};

/**
 * Load image and determine format
 */
const loadImageWithFormat = async (url: string): Promise<{ img: HTMLImageElement; format: 'PNG' | 'JPEG' }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Determine format from URL or default to PNG
            const format = url.toLowerCase().includes('jpg') || url.toLowerCase().includes('jpeg') ? 'JPEG' : 'PNG';
            resolve({ img, format });
        };
        img.onerror = reject;
        img.src = url;
    });
};

/**
 * Export canvas content to multi-page A4 PDF
 * 
 * CRITICAL: Images are added directly to PDF (not rasterized through canvas)
 * to preserve original quality.
 */
export const exportToPdf = async (
    strokes: Stroke[],
    images: CanvasImage[],
    config: ExportConfig
): Promise<void> => {
    const { pageCount, projectName, background, pattern } = config;

    // Create PDF with A4 dimensions
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [PAGE_WIDTH, PAGE_HEIGHT],
    });

    // Process each page
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        const pageY = pageIndex * PAGE_HEIGHT;

        // Add new page if not first
        if (pageIndex > 0) {
            pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT], 'portrait');
        }

        // Layer 1: Background color
        const bgHex = background.replace('#', '');
        const r = parseInt(bgHex.substr(0, 2), 16) || 255;
        const g = parseInt(bgHex.substr(2, 2), 16) || 255;
        const b = parseInt(bgHex.substr(4, 2), 16) || 255;
        pdf.setFillColor(r, g, b);
        pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

        // Layer 2: Pattern
        drawPatternOnPdf(pdf, pattern, PAGE_WIDTH, PAGE_HEIGHT, background);

        // Layer 3: Images (DIRECT to PDF for quality preservation)
        for (const img of images) {
            const imgTop = img.y;
            const imgBottom = img.y + img.height;
            const pageTop = pageY;
            const pageBottom = pageY + PAGE_HEIGHT;

            if (imgBottom > pageTop && imgTop < pageBottom) {
                try {
                    const { img: loadedImg, format } = await loadImageWithFormat(img.url);
                    // Add image directly to PDF - preserves original quality
                    pdf.addImage(
                        loadedImg,
                        format,
                        img.x,
                        img.y - pageY,
                        img.width,
                        img.height
                    );
                } catch (error) {
                    console.warn(`Failed to load image ${img.id}:`, error);
                }
            }
        }

        // Layer 4: Ink strokes (rasterize only the ink, not images)
        const inkCanvas = document.createElement('canvas');
        inkCanvas.width = PAGE_WIDTH * 2; // 2x for quality
        inkCanvas.height = PAGE_HEIGHT * 2;
        const ctx = inkCanvas.getContext('2d');

        if (ctx) {
            ctx.scale(2, 2);

            // Only strokes visible on this page
            for (const stroke of strokes) {
                const strokeMinY = Math.min(...stroke.points.map(p => p.y));
                const strokeMaxY = Math.max(...stroke.points.map(p => p.y));

                if (strokeMaxY > pageY && strokeMinY < pageY + PAGE_HEIGHT) {
                    drawStroke(ctx, stroke, pageY);
                }
            }
            ctx.globalCompositeOperation = 'source-over';

            // Add ink layer as overlay
            const inkData = inkCanvas.toDataURL('image/png');
            pdf.addImage(inkData, 'PNG', 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
        }
    }

    // Save PDF
    pdf.save(`${projectName}.pdf`);
};

export default exportToPdf;
