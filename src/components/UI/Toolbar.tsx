'use client';

import { useStore } from '@/store/useStore';
import {
    Pencil,
    Eraser,
    Trash2,
    Grid3X3,
    Circle,
    Minus,
    Paintbrush,
    Maximize,
    Minimize,
    ZoomIn,
    X
} from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Pattern } from '@/types';

type ActivePanel = 'none' | 'pen' | 'eraser' | 'bg';

/**
 * Toolbar Component - The Toggleable Cockpit
 * 
 * All panels are toggleable by clicking the tool icon.
 * - Click Pen (when not pen) -> switch to pen AND open panel
 * - Click Pen (when pen) -> toggle panel open/close
 * - Same for Eraser
 * - Background panel auto-closes after selection
 */
export default function Toolbar() {
    const {
        currentTool,
        penColor,
        penWidth,
        eraserWidth,
        canvasBackground,
        canvasPattern,
        setTool,
        setPenColor,
        setPenWidth,
        setEraserWidth,
        setCanvasBackground,
        setCanvasPattern,
        clearCanvas
    } = useStore();

    const penColorRef = useRef<HTMLInputElement>(null);
    const bgColorRef = useRef<HTMLInputElement>(null);

    const [activePanel, setActivePanel] = useState<ActivePanel>('none');
    const [isFullscreen, setIsFullscreen] = useState(false);

    const isPen = currentTool === 'pen';
    const isEraser = currentTool === 'eraser';

    const patterns: { id: Pattern; icon: React.ReactNode; label: string }[] = [
        { id: 'none', icon: <X className="w-4 h-4" />, label: 'None' },
        { id: 'grid', icon: <Grid3X3 className="w-4 h-4" />, label: 'Grid' },
        { id: 'dots', icon: <Circle className="w-4 h-4" />, label: 'Dots' },
        { id: 'lines', icon: <Minus className="w-4 h-4" />, label: 'Lines' },
    ];

    // Track fullscreen state
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Toggle fullscreen
    const toggleFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
        }
    }, []);

    // Handle Pen icon click
    const handlePenClick = () => {
        if (!isPen) {
            // Switch to pen AND open panel
            setTool('pen');
            setActivePanel('pen');
        } else {
            // Already pen, toggle panel
            setActivePanel(activePanel === 'pen' ? 'none' : 'pen');
        }
    };

    // Handle Eraser icon click
    const handleEraserClick = () => {
        if (!isEraser) {
            // Switch to eraser AND open panel
            setTool('eraser');
            setActivePanel('eraser');
        } else {
            // Already eraser, toggle panel
            setActivePanel(activePanel === 'eraser' ? 'none' : 'eraser');
        }
    };

    // Handle Background icon click
    const handleBgClick = () => {
        setActivePanel(activePanel === 'bg' ? 'none' : 'bg');
    };

    // Handle pattern selection with auto-close
    const handlePatternSelect = (pattern: Pattern) => {
        setCanvasPattern(pattern);
        setActivePanel('none'); // Auto-close
    };

    // Handle background color change with auto-close
    const handleBgColorChange = (color: string) => {
        setCanvasBackground(color);
    };

    // Render floating panel
    const renderPanel = () => {
        if (activePanel === 'none') return null;

        return (
            <div className="absolute right-full mr-3 top-0
        p-4 bg-black/50 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl min-w-[170px]
        animate-in slide-in-from-right-2 duration-150"
            >
                {/* Pen Panel */}
                {activePanel === 'pen' && (
                    <>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-white/60 uppercase tracking-wider font-medium">Pen</span>
                            <button
                                onClick={() => setActivePanel('none')}
                                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-3 h-3 text-white/40" />
                            </button>
                        </div>

                        {/* Ink Color */}
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-xs text-white/40">Color</span>
                            <button
                                onClick={() => penColorRef.current?.click()}
                                className="w-8 h-8 rounded-lg border-2 border-white/30 
                  hover:border-white/50 transition-all hover:scale-105 shadow-lg"
                                style={{ backgroundColor: penColor }}
                            />
                            <input
                                ref={penColorRef}
                                type="color"
                                value={penColor}
                                onChange={(e) => setPenColor(e.target.value)}
                                className="absolute opacity-0 w-0 h-0"
                            />
                        </div>

                        {/* Pen Size */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-white/40">Size</span>
                                <span className="text-xs text-white/60 font-mono">{penWidth}px</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={penWidth}
                                onChange={(e) => setPenWidth(parseInt(e.target.value))}
                                className="w-full h-2 appearance-none bg-white/20 rounded-full cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-lg"
                            />
                            {/* Size Preview */}
                            <div className="flex justify-center mt-3">
                                <div
                                    className="rounded-full transition-all"
                                    style={{
                                        width: Math.min(penWidth, 32),
                                        height: Math.min(penWidth, 32),
                                        backgroundColor: penColor,
                                    }}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Eraser Panel */}
                {activePanel === 'eraser' && (
                    <>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-white/60 uppercase tracking-wider font-medium">Eraser</span>
                            <button
                                onClick={() => setActivePanel('none')}
                                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-3 h-3 text-white/40" />
                            </button>
                        </div>

                        {/* Eraser Size */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-white/40">Size</span>
                                <span className="text-xs text-white/60 font-mono">{eraserWidth}px</span>
                            </div>
                            <input
                                type="range"
                                min="5"
                                max="100"
                                value={eraserWidth}
                                onChange={(e) => setEraserWidth(parseInt(e.target.value))}
                                className="w-full h-2 appearance-none bg-white/20 rounded-full cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-lg"
                            />
                            {/* Size Preview */}
                            <div className="flex justify-center mt-3">
                                <div
                                    className="rounded-full border-2 border-white/40 bg-white/20 transition-all"
                                    style={{
                                        width: Math.min(eraserWidth, 48),
                                        height: Math.min(eraserWidth, 48),
                                    }}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Background Panel */}
                {activePanel === 'bg' && (
                    <>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-white/60 uppercase tracking-wider font-medium">Paper</span>
                            <button
                                onClick={() => setActivePanel('none')}
                                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-3 h-3 text-white/40" />
                            </button>
                        </div>

                        {/* Paper Color */}
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-xs text-white/40">Color</span>
                            <button
                                onClick={() => bgColorRef.current?.click()}
                                className="w-10 h-10 rounded-lg border-2 border-white/30 
                  hover:border-white/50 transition-all hover:scale-105 shadow-lg"
                                style={{ backgroundColor: canvasBackground }}
                            />
                            <input
                                ref={bgColorRef}
                                type="color"
                                value={canvasBackground}
                                onChange={(e) => handleBgColorChange(e.target.value)}
                                className="absolute opacity-0 w-0 h-0"
                            />
                        </div>

                        {/* Patterns */}
                        <div>
                            <span className="text-xs text-white/40 block mb-2">Pattern</span>
                            <div className="grid grid-cols-4 gap-2">
                                {patterns.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => handlePatternSelect(p.id)}
                                        className={`p-2 rounded-lg transition-all hover:scale-110 ${canvasPattern === p.id
                                                ? 'bg-white/25 ring-2 ring-white/50'
                                                : 'bg-white/10 hover:bg-white/15'
                                            }`}
                                        title={p.label}
                                    >
                                        <span className={canvasPattern === p.id ? 'text-white' : 'text-white/60'}>
                                            {p.icon}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50">
            {/* Floating Panel */}
            <div className="relative">
                {renderPanel()}
            </div>

            {/* Main Tool Strip */}
            <div className="flex flex-col items-center gap-2 p-3
        bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl"
            >
                {/* Pen Tool */}
                <button
                    onClick={handlePenClick}
                    className={`relative p-3 rounded-xl transition-all hover:scale-110 ${isPen
                            ? 'bg-white/25 ring-2 ring-white/50'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                    title="Pen Tool"
                >
                    <Pencil className={`w-5 h-5 ${isPen ? 'text-white' : 'text-white/60'}`} />
                    {/* Active Panel Indicator */}
                    {activePanel === 'pen' && (
                        <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full" />
                    )}
                </button>

                {/* Eraser Tool */}
                <button
                    onClick={handleEraserClick}
                    className={`relative p-3 rounded-xl transition-all hover:scale-110 ${isEraser
                            ? 'bg-white/25 ring-2 ring-white/50'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                    title="Eraser Tool"
                >
                    <Eraser className={`w-5 h-5 ${isEraser ? 'text-white' : 'text-white/60'}`} />
                    {activePanel === 'eraser' && (
                        <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full" />
                    )}
                </button>

                {/* Divider */}
                <div className="w-8 h-px bg-white/20 my-1" />

                {/* Background Settings */}
                <button
                    onClick={handleBgClick}
                    className={`relative p-3 rounded-xl transition-all hover:scale-110 ${activePanel === 'bg'
                            ? 'bg-white/25 ring-2 ring-white/50'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                    title="Paper Settings"
                >
                    <Paintbrush className={`w-5 h-5 ${activePanel === 'bg' ? 'text-white' : 'text-white/60'}`} />
                    {activePanel === 'bg' && (
                        <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full" />
                    )}
                </button>

                {/* Zoom (Placeholder) */}
                <button
                    disabled
                    className="p-3 rounded-xl bg-white/5 opacity-40 cursor-not-allowed"
                    title="Zoom (Coming Soon)"
                >
                    <ZoomIn className="w-5 h-5 text-white/40" />
                </button>

                {/* Divider */}
                <div className="w-8 h-px bg-white/20 my-1" />

                {/* Fullscreen Toggle */}
                <button
                    onClick={toggleFullscreen}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/15 
            transition-all hover:scale-110"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                    {isFullscreen ? (
                        <Minimize className="w-5 h-5 text-white/60" />
                    ) : (
                        <Maximize className="w-5 h-5 text-white/60" />
                    )}
                </button>

                {/* Clear Canvas */}
                <button
                    onClick={() => {
                        if (confirm('Clear the entire canvas?')) {
                            clearCanvas();
                        }
                    }}
                    className="p-3 rounded-xl bg-white/5 hover:bg-red-500/30 
            transition-all hover:scale-110 group"
                    title="Clear Canvas"
                >
                    <Trash2 className="w-5 h-5 text-white/60 group-hover:text-red-400 transition-colors" />
                </button>
            </div>
        </div>
    );
}
