'use client';

import { useStore } from '@/store/useStore';
import { Plus } from 'lucide-react';

export default function PageNavigator() {
    const { currentPage, pageCount, insertPageAfter } = useStore();

    const handleAddPage = () => {
        insertPageAfter(currentPage - 1);
    };

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
        </div>
    );
}
