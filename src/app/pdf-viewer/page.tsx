'use client';

import { useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileUp, Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';

/**
 * PDF Viewer Entry Page
 * 
 * A minimalist drop zone for PDF upload.
 * After upload, redirects to main canvas with PDF in state.
 */
export default function PdfViewerPage() {
    const router = useRouter();
    const { setPdfFile } = useStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isDragging, setIsDragging] = useState(false);

    const handleFile = useCallback((file: File) => {
        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file.');
            return;
        }

        // Store the file in Zustand
        setPdfFile(file);

        // Redirect to main canvas
        router.push('/');
    }, [setPdfFile, router]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    }, [handleFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    }, [handleFile]);

    return (
        <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-8">
            {/* Drop Zone */}
            <div
                onClick={handleClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                    relative w-full max-w-2xl aspect-video
                    flex flex-col items-center justify-center gap-6
                    rounded-3xl border-2 border-dashed
                    transition-all duration-300 cursor-pointer
                    ${isDragging
                        ? 'border-purple-400 bg-purple-500/10 scale-105'
                        : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                    }
                `}
            >
                {/* Glow Effect */}
                <div className={`
                    absolute inset-0 rounded-3xl transition-opacity duration-300
                    bg-gradient-to-br from-purple-500/20 via-transparent to-cyan-500/20
                    ${isDragging ? 'opacity-100' : 'opacity-0'}
                `} />

                {/* Icon */}
                <div className={`
                    relative p-6 rounded-2xl
                    bg-gradient-to-br from-purple-500/20 to-cyan-500/20
                    transition-transform duration-300
                    ${isDragging ? 'scale-110' : ''}
                `}>
                    <FileUp className={`
                        w-16 h-16 transition-colors
                        ${isDragging ? 'text-purple-400' : 'text-white/60'}
                    `} />
                </div>

                {/* Text */}
                <div className="relative text-center">
                    <h2 className={`
                        text-2xl font-medium mb-2 transition-colors
                        ${isDragging ? 'text-purple-300' : 'text-white/80'}
                    `}>
                        Drop your PDF here
                    </h2>
                    <p className="text-sm text-white/40 flex items-center gap-2 justify-center">
                        <Sparkles className="w-4 h-4" />
                        Enter the Cosmic Studio
                        <Sparkles className="w-4 h-4" />
                    </p>
                </div>

                {/* Click Hint */}
                <p className="relative text-xs text-white/30">
                    or click to browse
                </p>

                {/* Hidden File Input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleInputChange}
                    className="hidden"
                />
            </div>

            {/* Floating Background Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
            </div>
        </div>
    );
}
