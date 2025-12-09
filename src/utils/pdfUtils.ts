/**
 * PDF Utility Functions
 * 
 * Handles PDF page rasterization for the "Unlock Page" feature.
 * Uses dynamic import since pdfjs requires browser APIs.
 */

import { CanvasImage } from '@/types';
import { PAGE_WIDTH, PAGE_HEIGHT } from '@/constants/canvas';

/**
 * Render a PDF page to an image object.
 * Used for "unlocking" a PDF page to make it movable/resizable.
 * 
 * @param pdfFile - The PDF file to render from
 * @param pageIndex - 0-based page index
 * @returns Promise<CanvasImage> - The rasterized page as a canvas image (coordinates relative to page top)
 */
export const renderPdfPageToImage = async (
    pdfFile: File,
    pageIndex: number
): Promise<CanvasImage> => {
    // Dynamic import to avoid SSR issues
    const { pdfjs } = await import('react-pdf');

    // Force CDN Worker (must be set before loading document)
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    // 1. Load Document
    const arrayBuffer = await pdfFile.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    // 2. Get Page (API is 1-based)
    const page = await doc.getPage(pageIndex + 1);

    // 3. Render to Canvas (High Res - 2x for sharpness)
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (!context) throw new Error("Canvas context failed");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvasContext: context, viewport } as any).promise;

    // 4. Create Data URL
    const url = canvas.toDataURL('image/png');

    // 5. Calculate Centered Position on A4
    // We want the unlocked page to sit nicely in the middle of the A4 sheet
    // A4 Width = 794. Let's make the image fill 80% of width.
    const targetWidth = PAGE_WIDTH * 0.8;
    const aspectRatio = viewport.width / viewport.height;
    const targetHeight = targetWidth / aspectRatio;

    const x = (PAGE_WIDTH - targetWidth) / 2;
    const y = (PAGE_HEIGHT - targetHeight) / 2;

    // Return with coordinates relative to page top (caller adds page offset)
    return {
        id: crypto.randomUUID(),
        url,
        x, // Centered horizontally
        y, // Centered vertically (relative to the page top)
        width: targetWidth,
        height: targetHeight,
        naturalWidth: viewport.width,
        naturalHeight: viewport.height
    };
};
