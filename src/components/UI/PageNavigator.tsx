'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Plus, Unlock } from 'lucide-react';
import { renderPdfPageToImage } from '@/utils/pdfUtils';
import { PDF_PAGE_GAP } from '@/constants/canvas';

export default function PageNavigator() {
    const {
        currentPage,
        pageCount,
        insertPageAfter,
        pdfFile,
        addImage,
        selectImage,
        setCanvasDimensions,
        hidePdfPage,
        canvasDimensions,
        pdfPageMapping,
    } = useStore();

    const [isLoading, setIsLoading] = useState(false);

    const handleAddPage = () => {
        insertPageAfter(currentPage - 1);
    };

    const handleUnlock = async () => {
        // 1. LOOKUP: Find the ACTUAL PDF page index at this location
        const mappingIndex = currentPage - 1;
        // If mapping is empty (no PDF loaded or not initialized?), fallback to simple index?
        // But logic says pdfFile must exist. mapping should be populated.
        // pdfPageMapping contains 1-based page numbers or null.
        const pdfPageIndex = pdfPageMapping.length > 0 ? pdfPageMapping[mappingIndex] : (mappingIndex + 1);

        // Safety Checks
        if (!pdfFile || pdfPageIndex === null || pdfPageIndex === undefined) {
            console.warn("No PDF page content found at this location to unlock.");
            return;
        }

        setIsLoading(true);

        try {
            // 2. Render Image (returns coordinates relative to page top)
            // renderPdfPageToImage expects 0-based index. pdfPageIndex is 1-based.
            const img = await renderPdfPageToImage(pdfFile, pdfPageIndex - 1);

            // 3. Adjust Y coordinate for the current page
            const pageHeight = useStore.getState().canvasDimensions.height;
            // Use mappingIndex (view position) for Y calculation
            const pageTop = mappingIndex * (pageHeight + PDF_PAGE_GAP);
            img.y += pageTop;

            // 4. Update Store
            setCanvasDimensions(794, 1123); // Reset to A4
            addImage(img);
            hidePdfPage(pdfPageIndex); // Store the PDF Page Number (1-based)
            selectImage(img.id); // Auto-select

        } catch (e) {
            console.error("Unlock failed", e);
            alert("Could not detach page. " + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsLoading(false);
        }
    };

    const hasPdf = pdfFile !== null;

    return (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 
            px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-xl"
        >
            <span className="text-white/80 font-mono text-sm">
                Page {currentPage} <span className="text-white/40">/</span> {pageCount}
            </span>

            <div className="w-px h-4 bg-white/20" />

            <button
                onClick={handleAddPage}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
                title="Insert Page Below"
            >
                <Plus className="w-4 h-4 text-white/60 hover:text-white" />
            </button>

            {hasPdf && (
                <>
                    <div className="w-px h-4 bg-white/20" />
                    <button
                        onClick={handleUnlock}
                        disabled={isLoading}
                        className={`p-1 rounded-full transition-colors ${isLoading
                            ? 'opacity-50 cursor-wait'
                            : 'hover:bg-white/10'
                            }`}
                        title="Unlock Page (Detach PDF to Image)"
                    >
                        <Unlock className={`w-4 h-4 ${isLoading
                            ? 'text-white/30 animate-pulse'
                            : 'text-white/60 hover:text-white'
                            }`} />
                    </button>
                </>
            )}
        </div>
    );
}
