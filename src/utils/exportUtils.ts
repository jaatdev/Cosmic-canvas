import { jsPDF } from 'jspdf';
import { Stroke, CanvasObject, TextNode, ImageNode } from '@/types';
import { getStrokePath } from '@/hooks/useCanvas';

interface ExportOptions {
    projectName: string;
    backgroundColor: string;
    strokes: Stroke[];
    objects: CanvasObject[];
    width: number;
    height: number;
}

// Check if object is a TextNode
const isTextNode = (obj: CanvasObject): obj is TextNode => {
    return 'text' in obj && 'fontFamily' in obj;
};

// Check if object is an ImageNode
const isImageNode = (obj: CanvasObject): obj is ImageNode => {
    return 'src' in obj && 'aspectRatio' in obj;
};

// Create an offscreen canvas with all layers flattened
export const createFlattenedCanvas = async (options: ExportOptions): Promise<HTMLCanvasElement> => {
    const { backgroundColor, strokes, objects, width, height } = options;

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.scale(dpr, dpr);

    // Layer 0: Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Layer 1: Strokes
    strokes.forEach((stroke) => {
        if (stroke.points.length < 2) return;
        const path = new Path2D(getStrokePath(stroke));
        ctx.fillStyle = stroke.color;
        ctx.fill(path);
    });

    // Layer 2: Objects (Text and Images)
    for (const obj of objects) {
        if (isTextNode(obj)) {
            ctx.font = `${obj.fontSize}px ${obj.fontFamily}`;
            ctx.fillStyle = obj.color;
            ctx.fillText(obj.text, obj.x, obj.y + obj.fontSize);
        } else if (isImageNode(obj)) {
            // Load and draw image
            await new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, obj.x, obj.y, obj.width, obj.height);
                    resolve();
                };
                img.onerror = () => resolve();
                img.src = obj.src;
            });
        }
    }

    return canvas;
};

// Export canvas as PDF
export const exportToPDF = async (options: ExportOptions): Promise<void> => {
    const { projectName, width, height } = options;

    try {
        // Create flattened canvas
        const canvas = await createFlattenedCanvas(options);

        // Determine PDF orientation
        const orientation = width > height ? 'landscape' : 'portrait';

        // Create PDF with matching aspect ratio
        const pdf = new jsPDF({
            orientation,
            unit: 'px',
            format: [width, height],
        });

        // Add canvas as image
        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', 0, 0, width, height);

        // Download with project name
        const sanitizedName = projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        pdf.save(`${sanitizedName}.pdf`);
    } catch (error) {
        console.error('Export failed:', error);
        throw error;
    }
};

// Export canvas as PNG
export const exportToPNG = async (options: ExportOptions): Promise<void> => {
    const { projectName } = options;

    try {
        const canvas = await createFlattenedCanvas(options);

        // Create download link
        const link = document.createElement('a');
        const sanitizedName = projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `${sanitizedName}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
    } catch (error) {
        console.error('Export failed:', error);
        throw error;
    }
};

// Get canvas dimensions from the actual canvas element
export const getCanvasDimensions = (canvasElement: HTMLCanvasElement | null): { width: number; height: number } => {
    if (!canvasElement) {
        return { width: 1920, height: 1080 }; // Default fallback
    }

    const rect = canvasElement.getBoundingClientRect();
    return {
        width: rect.width,
        height: rect.height,
    };
};
