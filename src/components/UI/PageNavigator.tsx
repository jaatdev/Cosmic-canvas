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
        const { currentPage, pdfPageMapping, pdfFile, addImage, setCanvasDimensions, hidePdfPage, selectImage, canvasDimensions } = useStore.getState();

        // 1. Convert 1-based Page to 0-based Index
        const mapIndex = currentPage - 1;

        // 2. Safety Check: Bounds validation
        if (mapIndex < 0 || mapIndex >= pdfPageMapping.length) {
            console.error("Unlock Error: Page index out of bounds", { currentPage, mapIndex, mappingLength: pdfPageMapping.length });
            alert("Cannot unlock: Page index out of bounds.");
            return;
        }

        // 3. Get PDF Page Index (1-based from mapping)
        const pdfPageIndex = pdfPageMapping[mapIndex];

        // 4. Check if it is a PDF page (not null/blank)
        if (pdfPageIndex === null || pdfPageIndex === undefined) {
            alert("This is already a blank page.");
            return;
        }

        // 5. Validate PDF file exists
        if (!pdfFile) {
            console.warn("No PDF file loaded.");
            alert("No PDF file to unlock.");
            return;
        }

        setIsLoading(true);

        try {
            // 6. Render Image (renderPdfPageToImage expects 0-based index)
            // pdfPageIndex is 1-based from mapping, so subtract 1
            const img = await renderPdfPageToImage(pdfFile, pdfPageIndex - 1);

            // 7. Adjust Y coordinate for the current page
            const pageHeight = canvasDimensions.height;
            // Use mapIndex (view position) for Y calculation
            const pageTop = mapIndex * (pageHeight + PDF_PAGE_GAP);
            img.y += pageTop;

            // 8. Update Store
            addImage(img);
            hidePdfPage(mapIndex); // Store the 0-based mapIndex
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
