'use client';

import { useStore, CanvasImage } from '@/store/useStore';
import { exportToPdf } from '@/utils/export';
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
    Undo2,
    Redo2,
    Image as ImageIcon,
    Hand,
    Download,
    X
} from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Pattern } from '@/types';

type ActivePanel = 'none' | 'pen' | 'eraser' | 'bg';

// Smart Scale: Calculate dimensions to fit viewport
const calculateSmartScale = (
    naturalWidth: number,
    naturalHeight: number,
    viewportWidth: number,
    viewportHeight: number
): { width: number; height: number; x: number; y: number } => {
    const maxWidth = Math.min(600, viewportWidth * 0.5);
    const maxHeight = viewportHeight * 0.6;

    const aspectRatio = naturalWidth / naturalHeight;

    let width = maxWidth;
    let height = width / aspectRatio;

    if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
    }

    const x = (viewportWidth - width) / 2;
    const y = (viewportHeight - height) / 2;

    return { width, height, x, y };
};

// Generate unique ID
const generateId = () => `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Toolbar Component - The Toggleable Cockpit with Export
 */
export default function Toolbar() {
    const {
        currentTool,
        penColor,
        penWidth,
        eraserWidth,
        canvasBackground,
        canvasPattern,
        historyStack,
        redoStack,
        strokes,
        images,
        projectName,
        setTool,
        setPenColor,
        setPenWidth,
        setEraserWidth,
        setCanvasBackground,
        setCanvasPattern,
        addImage,
        undo,
        redo,
        clearCanvas
    } = useStore();

    const penColorRef = useRef<HTMLInputElement>(null);
    const bgColorRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const [activePanel, setActivePanel] = useState<ActivePanel>('none');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const isPen = currentTool === 'pen';
    const isEraser = currentTool === 'eraser';
    const isSelect = currentTool === 'select';
    const canUndoAction = historyStack.length > 0;
    const canRedoAction = redoStack.length > 0;

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

    // Handle PDF export
    const handleExport = useCallback(async () => {
        if (isExporting) return;

        setIsExporting(true);
        try {
            await exportToPdf(strokes, images, {
                projectName,
                background: canvasBackground,
                pattern: canvasPattern,
                width: window.innerWidth,
                height: window.innerHeight,
            });
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export PDF. Please try again.');
        } finally {
            setIsExporting(false);
        }
    }, [strokes, images, projectName, canvasBackground, canvasPattern, isExporting]);

    // Handle image upload with smart scaling
    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;

        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            const { width, height, x, y } = calculateSmartScale(
                img.naturalWidth,
                img.naturalHeight,
                window.innerWidth,
                window.innerHeight
            );

            const canvasImage: CanvasImage = {
                id: generateId(),
                url,
                x,
                y,
                width,
                height,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
            };

            addImage(canvasImage);
        };

        img.src = url;
        e.target.value = '';
    }, [addImage]);

    // Handle Pen icon click
    const handlePenClick = () => {
        if (!isPen) {
            setTool('pen');
            setActivePanel('pen');
        } else {
            setActivePanel(activePanel === 'pen' ? 'none' : 'pen');
        }
    };

    // Handle Eraser icon click
    const handleEraserClick = () => {
        if (!isEraser) {
            setTool('eraser');
            setActivePanel('eraser');
        } else {
            setActivePanel(activePanel === 'eraser' ? 'none' : 'eraser');
        }
    };

    // Handle Select icon click
    const handleSelectClick = () => {
        setTool('select');
        setActivePanel('none');
    };

    // Handle Background icon click
    const handleBgClick = () => {
        setActivePanel(activePanel === 'bg' ? 'none' : 'bg');
    };

    // Handle pattern selection with auto-close
    const handlePatternSelect = (pattern: Pattern) => {
        setCanvasPattern(pattern);
        setActivePanel('none');
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
                                onChange={(e) => setCanvasBackground(e.target.value)}
                                className="absolute opacity-0 w-0 h-0"
                            />
                        </div>

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
                {/* Select Tool */}
                <button
                    onClick={handleSelectClick}
                    className={`relative p-3 rounded-xl transition-all hover:scale-110 ${isSelect
                            ? 'bg-white/25 ring-2 ring-white/50'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                    title="Select Tool (V)"
                >
                    <Hand className={`w-5 h-5 ${isSelect ? 'text-white' : 'text-white/60'}`} />
                </button>

                {/* Pen Tool */}
                <button
                    onClick={handlePenClick}
                    className={`relative p-3 rounded-xl transition-all hover:scale-110 ${isPen
                            ? 'bg-white/25 ring-2 ring-white/50'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                    title="Pen Tool (P)"
                >
                    <Pencil className={`w-5 h-5 ${isPen ? 'text-white' : 'text-white/60'}`} />
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
                    title="Eraser Tool (E)"
                >
                    <Eraser className={`w-5 h-5 ${isEraser ? 'text-white' : 'text-white/60'}`} />
                    {activePanel === 'eraser' && (
                        <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full" />
                    )}
                </button>

                {/* Divider */}
                <div className="w-8 h-px bg-white/20 my-1" />

                {/* Image Upload */}
                <button
                    onClick={() => imageInputRef.current?.click()}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/15 
            transition-all hover:scale-110"
                    title="Add Image"
                >
                    <ImageIcon className="w-5 h-5 text-white/60" />
                </button>
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                />

                {/* Undo Button */}
                <button
                    onClick={undo}
                    disabled={!canUndoAction}
                    className={`p-3 rounded-xl transition-all ${canUndoAction
                            ? 'bg-white/5 hover:bg-white/15 hover:scale-110'
                            : 'bg-white/5 opacity-30 cursor-not-allowed'
                        }`}
                    title="Undo (Ctrl+Z)"
                >
                    <Undo2 className="w-5 h-5 text-white/60" />
                </button>

                {/* Redo Button */}
                <button
                    onClick={redo}
                    disabled={!canRedoAction}
                    className={`p-3 rounded-xl transition-all ${canRedoAction
                            ? 'bg-white/5 hover:bg-white/15 hover:scale-110'
                            : 'bg-white/5 opacity-30 cursor-not-allowed'
                        }`}
                    title="Redo (Ctrl+Y)"
                >
                    <Redo2 className="w-5 h-5 text-white/60" />
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

                {/* Divider */}
                <div className="w-8 h-px bg-white/20 my-1" />

                {/* Export PDF */}
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className={`p-3 rounded-xl transition-all ${isExporting
                            ? 'bg-white/5 opacity-50 cursor-wait'
                            : 'bg-white/5 hover:bg-green-500/30 hover:scale-110'
                        }`}
                    title="Export PDF"
                >
                    <Download className={`w-5 h-5 ${isExporting ? 'animate-pulse' : ''} text-white/60`} />
                </button>

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
