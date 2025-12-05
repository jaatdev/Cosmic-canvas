'use client';

import { useStore } from '@/store/useStore';
import { Plus, FileText } from 'lucide-react';

/**
 * PageControls Component - Add Page Button
 * 
 * Fixed at bottom-center, allows adding new pages.
 */
export default function PageControls() {
    const { pageCount, addPage } = useStore();

    const handleAddPage = () => {
        addPage();
        // Smooth scroll to the new page after a short delay
        setTimeout(() => {
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth',
            });
        }, 50);
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50
      flex items-center gap-3 p-2 pl-4
      bg-black/40 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl"
        >
            {/* Page indicator */}
            <div className="flex items-center gap-2 text-white/60">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">
                    {pageCount} {pageCount === 1 ? 'Page' : 'Pages'}
                </span>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-white/20" />

            {/* Add Page Button */}
            <button
                onClick={handleAddPage}
                className="flex items-center gap-2 px-4 py-2
          bg-white/10 hover:bg-white/20 
          rounded-full transition-all hover:scale-105"
                title="Add New Page"
            >
                <Plus className="w-4 h-4 text-white/80" />
                <span className="text-sm font-medium text-white/80">Add Page</span>
            </button>
        </div>
    );
}
