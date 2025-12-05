'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import BackgroundLayer from './BackgroundLayer';
import CanvasLayer from './CanvasLayer';
import ObjectLayer from './ObjectLayer';
import RightSidebar from '../UI/RightSidebar';
import ProjectNameInput from '../UI/ProjectNameInput';
import { TextNode } from '@/types';

const Whiteboard = () => {
    const {
        backgroundColor,
        backgroundPattern,
        isFullscreen,
        isSidebarVisible,
        setFullscreen,
        tool,
        brush,
        addTextNode,
    } = useStore();

    const containerRef = useRef<HTMLDivElement>(null);

    // Handle fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [setFullscreen]);

    // Handle click to add text node
    const handleCanvasClick = useCallback((e: React.MouseEvent) => {
        if (tool !== 'text') return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const newTextNode: TextNode = {
            id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            text: '',
            fontSize: 24,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: brush.color,
            width: 200,
            height: 40,
        };

        addTextNode(newTextNode);
    }, [tool, brush.color, addTextNode]);

    // Exit hint for immersive mode
    const ExitHint = () => (
        <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] transition-opacity duration-500 ${isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-0 pointer-events-none'
                }`}
        >
            <button
                onClick={() => document.exitFullscreen()}
                className="px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-white/50 text-sm hover:text-white hover:bg-white/10 transition-all"
            >
                Press ESC or click to exit fullscreen
            </button>
        </div>
    );

    return (
        <div
            ref={containerRef}
            className="relative w-full h-screen overflow-hidden bg-black"
            onClick={handleCanvasClick}
        >
            {/* Layer 0: Background */}
            <BackgroundLayer
                backgroundColor={backgroundColor}
                pattern={backgroundPattern}
            />

            {/* Layer 1: Canvas (Drawing Surface) */}
            <CanvasLayer />

            {/* Layer 2: Objects (Text & Images) */}
            <ObjectLayer />

            {/* Layer 3: Interface */}
            <div className={`fixed inset-0 z-50 pointer-events-none transition-opacity duration-300 ${isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                {/* Project Name Input */}
                <div className="absolute top-4 left-4 pointer-events-auto">
                    <ProjectNameInput />
                </div>

                {/* Right Sidebar */}
                {isSidebarVisible && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
                        <RightSidebar />
                    </div>
                )}
            </div>

            {/* Fullscreen Exit Hint */}
            <ExitHint />
        </div>
    );
};

export default Whiteboard;
