'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { X, Maximize } from 'lucide-react';
import { PDF_PAGE_GAP } from '@/constants/canvas';
import { Page, Document } from 'react-pdf';
import getStroke from 'perfect-freehand';
import { getSvgPathFromStroke } from '@/utils/ink';

export default function GridView() {
    const {
        isGridView,
        setIsGridView,
        pageCount,
        currentPage,
        setCurrentPage,
        pdfPageMapping,
        canvasDimensions,
        strokes,
        pdfFile,
        canvasBackground,
    } = useStore();

    const activeCardRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to active page on mount
    useEffect(() => {
        if (isGridView && activeCardRef.current) {
            // Delay to ensure DOM is ready
            setTimeout(() => {
                activeCardRef.current?.scrollIntoView({
                    behavior: 'auto',
                    block: 'center',
                });
            }, 100);
        }
    }, [isGridView]);

    if (!isGridView) return null;

    const handlePageClick = (index: number) => {
        // Update current page
        setCurrentPage(index + 1);

        // Close grid
        setIsGridView(false);

        // Scroll to page
        const gap = PDF_PAGE_GAP;
        const pageHeight = canvasDimensions.height;
        const scrollToY = index * (pageHeight + gap);

        // Instant jump
        window.scrollTo({
            top: scrollToY,
            behavior: 'auto',
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#1e1e1e]/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/10">
                <h2 className="text-2xl font-serif text-white/90 flex items-center gap-3">
                    <Maximize className="w-6 h-6 text-blue-400" />
                    Navigate Universe
                </h2>
                <button
                    onClick={() => setIsGridView(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
                >
                    <X className="w-8 h-8" />
                </button>
            </div>


            {/* Grid Container */}
            <div className="flex-1 overflow-y-auto p-8">
                {pdfFile ? (
                    <Document file={pdfFile} loading={null} error={null}>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 max-w-7xl mx-auto">
                            {Array.from({ length: pageCount }).map((_, index) => {
                                const pageNum = index + 1;
                                const isActive = pageNum === currentPage;

                                // Calculate page bounds
                                const pageHeight = canvasDimensions.height;
                                const pageTop = index * (pageHeight + PDF_PAGE_GAP);
                                const pageBottom = pageTop + pageHeight;

                                // Filter strokes for this page
                                const pageStrokes = strokes.filter((s) => {
                                    const firstPoint = s.points[0];
                                    return firstPoint && firstPoint.y >= pageTop && firstPoint.y < pageBottom;
                                });

                                // Determine page type (PDF Page or Blank)
                                const mappingExists = pdfPageMapping && pdfPageMapping.length > 0;
                                const pdfPageNum = mappingExists ? pdfPageMapping[index] : null;
                                const isBlank = mappingExists && pdfPageNum === null;
                                const isPdf = mappingExists && pdfPageNum !== null;

                                return (
                                    <div
                                        key={index}
                                        ref={isActive ? activeCardRef : null}
                                        className={`group relative aspect-[1/1.414] rounded-lg transition-all duration-200 
                                            ${isActive
                                                ? 'ring-4 ring-blue-500 scale-105 shadow-2xl shadow-blue-500/20'
                                                : 'hover:scale-105 hover:ring-2 hover:ring-white/20'
                                            }
                                            bg-[#2a2a2a] overflow-hidden
                                        `}
                                    >
                                        <button
                                            onClick={() => handlePageClick(index)}
                                            className="absolute inset-0 w-full h-full"
                                        >
                                            {/* Thumbnail Container */}
                                            <div
                                                className="absolute inset-4 rounded shadow-inner overflow-hidden"
                                                style={{ backgroundColor: canvasBackground }}
                                            >
                                                {/* PDF Background (if PDF page) */}
                                                {isPdf && (
                                                    <div className="absolute inset-0 z-0">
                                                        <Page
                                                            pageNumber={pdfPageNum!}
                                                            width={200}
                                                            renderTextLayer={false}
                                                            renderAnnotationLayer={false}
                                                            className="pointer-events-none w-full h-auto"
                                                        />
                                                    </div>
                                                )}

                                                {/* Ink Strokes (Mini-Map) - Using viewBox to crop the view */}
                                                {pageStrokes.length > 0 && (
                                                    <svg
                                                        viewBox={`0 ${pageTop} ${canvasDimensions.width} ${canvasDimensions.height}`}
                                                        className="absolute inset-0 w-full h-full pointer-events-none z-10"
                                                        preserveAspectRatio="xMidYMid meet"
                                                    >
                                                        {pageStrokes.map((stroke) => {
                                                            // Generate stroke outline using perfect-freehand
                                                            const outlinePoints = getStroke(
                                                                stroke.points.map((p) => [p.x, p.y, p.pressure || 0.5]),
                                                                {
                                                                    size: stroke.size,
                                                                    thinning: 0.5,
                                                                    smoothing: 0.5,
                                                                    streamline: 0.5,
                                                                }
                                                            );

                                                            const pathData = getSvgPathFromStroke(outlinePoints);

                                                            return (
                                                                <path
                                                                    key={stroke.id}
                                                                    d={pathData}
                                                                    fill={stroke.color}
                                                                    fillOpacity={stroke.isHighlighter ? 0.4 : 1}
                                                                    stroke="none"
                                                                />
                                                            );
                                                        })}
                                                    </svg>
                                                )}

                                                {/* Blank Page Indicator */}
                                                {(isBlank || !mappingExists) && pageStrokes.length === 0 && (
                                                    <div className="absolute inset-0 flex items-center justify-center z-0">
                                                        <span className="text-6xl font-bold text-black/5 select-none">
                                                            {pageNum}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Semi-transparent overlay for non-active pages */}
                                                {!isActive && (
                                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors z-20" />
                                                )}
                                            </div>

                                            {/* Active Indicator (if active) */}
                                            {isActive && (
                                                <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 z-30" />
                                            )}

                                            {/* Badges */}
                                            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 px-2 z-30">
                                                {isPdf && (
                                                    <span className="px-2 py-1 bg-blue-500/80 text-white text-[10px] font-bold rounded-full uppercase tracking-wider backdrop-blur-sm shadow-sm">
                                                        PDF Page {pdfPageNum}
                                                    </span>
                                                )}
                                                {isBlank && (
                                                    <span className="px-2 py-1 bg-white/10 text-white/60 text-[10px] font-bold rounded-full uppercase tracking-wider backdrop-blur-sm border border-white/10">
                                                        Blank
                                                    </span>
                                                )}
                                            </div>

                                            {/* Label */}
                                            <div className="absolute bottom-0 w-full bg-black/60 backdrop-blur-sm py-1 z-30">
                                                <span className={`text-xs font-mono
                                                    ${isActive ? 'text-blue-400 font-bold' : 'text-white/60'}
                                                `}>
                                                    Page {pageNum}
                                                </span>
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </Document>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 max-w-7xl mx-auto">
                        {Array.from({ length: pageCount }).map((_, index) => {
                            const pageNum = index + 1;
                            const isActive = pageNum === currentPage;

                            // Calculate page bounds
                            const pageHeight = canvasDimensions.height;
                            const pageTop = index * (pageHeight + PDF_PAGE_GAP);
                            const pageBottom = pageTop + pageHeight;

                            // Filter strokes for this page
                            const pageStrokes = strokes.filter((s) => {
                                const firstPoint = s.points[0];
                                return firstPoint && firstPoint.y >= pageTop && firstPoint.y < pageBottom;
                            });

                            return (
                                <div
                                    key={index}
                                    ref={isActive ? activeCardRef : null}
                                    className={`group relative aspect-[1/1.414] rounded-lg transition-all duration-200 
                                        ${isActive
                                            ? 'ring-4 ring-blue-500 scale-105 shadow-2xl shadow-blue-500/20'
                                            : 'hover:scale-105 hover:ring-2 hover:ring-white/20'
                                        }
                                        bg-[#2a2a2a] overflow-hidden
                                    `}
                                >
                                    <button
                                        onClick={() => handlePageClick(index)}
                                        className="absolute inset-0 w-full h-full"
                                    >
                                        {/* Thumbnail Container */}
                                        <div
                                            className="absolute inset-4 rounded shadow-inner overflow-hidden"
                                            style={{ backgroundColor: canvasBackground }}
                                        >
                                            {/* Ink Strokes (Mini-Map) */}
                                            {pageStrokes.length > 0 && (
                                                <svg
                                                    viewBox={`0 ${pageTop} ${canvasDimensions.width} ${canvasDimensions.height}`}
                                                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                                                    preserveAspectRatio="xMidYMid meet"
                                                >
                                                    {pageStrokes.map((stroke) => {
                                                        const outlinePoints = getStroke(
                                                            stroke.points.map((p) => [p.x, p.y, p.pressure || 0.5]),
                                                            {
                                                                size: stroke.size,
                                                                thinning: 0.5,
                                                                smoothing: 0.5,
                                                                streamline: 0.5,
                                                            }
                                                        );

                                                        const pathData = getSvgPathFromStroke(outlinePoints);

                                                        return (
                                                            <path
                                                                key={stroke.id}
                                                                d={pathData}
                                                                fill={stroke.color}
                                                                fillOpacity={stroke.isHighlighter ? 0.4 : 1}
                                                                stroke="none"
                                                            />
                                                        );
                                                    })}
                                                </svg>
                                            )}

                                            {/* Blank Page Indicator */}
                                            {pageStrokes.length === 0 && (
                                                <div className="absolute inset-0 flex items-center justify-center z-0">
                                                    <span className="text-6xl font-bold text-black/5 select-none">
                                                        {pageNum}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Semi-transparent overlay for non-active pages */}
                                            {!isActive && (
                                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors z-20" />
                                            )}
                                        </div>

                                        {/* Active Indicator (if active) */}
                                        {isActive && (
                                            <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 z-30" />
                                        )}

                                        {/* Label */}
                                        <div className="absolute bottom-0 w-full bg-black/60 backdrop-blur-sm py-1 z-30">
                                            <span className={`text-xs font-mono
                                                ${isActive ? 'text-blue-400 font-bold' : 'text-white/60'}
                                            `}>
                                                Page {pageNum}
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
