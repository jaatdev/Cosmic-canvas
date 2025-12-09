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
    } = useStore();

    const [isLoading, setIsLoading] = useState(false);

    const handleAddPage = () => {
        insertPageAfter(currentPage - 1);
    };

    const handleUnlock = async () => {
        if (!pdfFile) return;
        setIsLoading(true);

        try {
            // 1. Render Image (returns coordinates relative to page top)
            const img = await renderPdfPageToImage(pdfFile, currentPage - 1);

            // 2. Adjust Y coordinate for the current page
            // The utility gave us Y relative to 0. We need Y relative to Page Top.
            const pageHeight = useStore.getState().canvasDimensions.height;
            const pageTop = (currentPage - 1) * (pageHeight + PDF_PAGE_GAP);
            img.y += pageTop;

            // 3. Update Store
            setCanvasDimensions(794, 1123); // Reset to A4
            addImage(img);
            hidePdfPage(currentPage - 1); // 0-based index for consistency
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
