'use client';

import { useState, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useStore } from '@/store/useStore';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Dynamically set the worker source to match the installed version
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Virtualization window: render pages within this range of current page
const RENDER_WINDOW = 2;

/**
 * PDFLayer Component - Z-Index 1
 * 
 * Renders PDF pages with virtualization for performance.
 * Only renders pages within RENDER_WINDOW of current page.
 * Uses pdfPageMapping for page reordering support.
 * Detects PDF dimensions and updates canvas size.
 */
export default function PDFLayer() {
    const {
        pdfFile,
        setPageCount,
        setCanvasDimensions,
        pageCount,
        currentPage,
        pdfPageMapping,
        canvasDimensions
    } = useStore();

    const [isClient, setIsClient] = useState(false);
    const [numPages, setNumPages] = useState(0);
    const [dimensionsDetected, setDimensionsDetected] = useState(false);

    // Get dynamic dimensions from store
    const pageWidth = canvasDimensions.width;
    const pageHeight = canvasDimensions.height;

    // Fix hydration mismatch - only render on client
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Reset dimensions detected when PDF file changes
    useEffect(() => {
        setDimensionsDetected(false);
    }, [pdfFile]);

    // Calculate visible page range based on current page
    const { minPage, maxPage } = useMemo(() => {
        return {
            minPage: Math.max(0, currentPage - 1 - RENDER_WINDOW),
            maxPage: Math.min(pageCount, currentPage + RENDER_WINDOW),
        };
    }, [currentPage, pageCount]);

    // Don't render on server or if no PDF
    if (!isClient || !pdfFile) return null;

    const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
        console.log('PDF loaded successfully with', numPages, 'pages');
        setNumPages(numPages);
        setPageCount(numPages);
    };

    const handleLoadError = (error: Error) => {
        console.error('PDF Load Error:', error);
    };

    // Handle first page load to detect PDF dimensions
    const handleFirstPageLoadSuccess = (page: { originalWidth: number; originalHeight: number; width: number; height: number }) => {
        if (!dimensionsDetected) {
            const { originalWidth, originalHeight } = page;
            console.log('PDF dimensions detected:', originalWidth, 'x', originalHeight);

            // Only update if significantly different (avoid loops)
            if (Math.abs(originalWidth - pageWidth) > 1 || Math.abs(originalHeight - pageHeight) > 1) {
                setCanvasDimensions(originalWidth, originalHeight);
            }
            setDimensionsDetected(true);
        }
    };

    // Use mapping if available, otherwise fall back to default order
    const effectiveMapping = pdfPageMapping.length > 0
        ? pdfPageMapping
        : Array.from({ length: numPages }, (_, i) => i + 1);

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                pointerEvents: 'none'
            }}
        >
            <Document
                file={pdfFile}
                onLoadSuccess={handleLoadSuccess}
                onLoadError={handleLoadError}
                loading={
                    <div className="flex items-center justify-center p-10">
                        <span className="text-white/50 animate-pulse">Loading PDF Engine...</span>
                    </div>
                }
            >
                {/* Virtualized page rendering */}
                {effectiveMapping.map((pdfPageNumber, index) => {
                    const isInViewport = index >= minPage && index < maxPage;
                    const isFirstPage = index === 0;

                    // Placeholder for pages outside viewport (keeps scroll height correct)
                    if (!isInViewport) {
                        return (
                            <div
                                key={`placeholder_${index}`}
                                style={{
                                    position: 'absolute',
                                    top: index * pageHeight,
                                    left: 0,
                                    width: pageWidth,
                                    height: pageHeight,
                                    backgroundColor: 'rgba(255,255,255,0.02)',
                                }}
                            />
                        );
                    }

                    // Render actual PDF page for visible pages
                    return (
                        <div
                            key={`page_wrapper_${index}`}
                            style={{
                                position: 'absolute',
                                top: index * pageHeight,
                                left: 0,
                                width: pageWidth,
                                height: pageHeight,
                            }}
                        >
                            <Page
                                pageNumber={pdfPageNumber}
                                width={pageWidth}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                canvasBackground="transparent"
                                onLoadSuccess={isFirstPage ? handleFirstPageLoadSuccess : undefined}
                                loading={
                                    <div
                                        className="h-full w-full bg-white/5 animate-pulse flex items-center justify-center"
                                    >
                                        <span className="text-white/30 text-sm">
                                            Page {pdfPageNumber}
                                        </span>
                                    </div>
                                }
                            />
                        </div>
                    );
                })}
            </Document>
        </div>
    );
}
