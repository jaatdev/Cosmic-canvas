'use client';

import { useStore, CanvasImage, ShapeType, Pattern } from '@/store/useStore';
import { exportToPdf } from '@/utils/export';
import { PAGE_HEIGHT, PAGE_WIDTH } from '@/constants/canvas';
import {
    Pencil,
    Eraser,
    Trash2,
    Grid3X3,
    Circle,
    Minus,
    Plus,
    Paintbrush,
    Maximize,
    Minimize,
    Undo2,
    Redo2,
    Image as ImageIcon,
    Hand,
    Download,
    ZoomIn,
    X,
    FilePlus,
    FileMinus,
    Square,
    Triangle,
    MoveRight,
    Shapes,
    Type,
    Lasso,
    Box,
    Music,
    AlignJustify,
    Layout,
    FileX2,
    Highlighter,
    BookOpen,
    LayoutGrid
} from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, useEffect, useCallback } from 'react';

type ActivePanel = 'none' | 'pen' | 'eraser' | 'bg' | 'zoom' | 'shape' | 'text' | 'highlighter';

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
 * Toolbar Component - The Gravity Dock (Bottom-Center)
 * 
 * Mac-style dock with grouped tools, upward panels, and auto-close behavior.
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
        pageCount,
        zoom,
        isFullscreen,
        activeShape,
        setTool,
        setPenColor,
        setPenWidth,
        setEraserWidth,
        setCanvasBackground,
        setCanvasPattern,
        setShape,
        addImage,
        addPage,
        insertPageAfter,
        deletePage,
        undo,
        redo,
        clearCanvas,
        zoomIn,
        zoomOut,
        resetZoom,
        setIsFullscreen,
        currentPage,
        activeFont,
        activeFontSize,
        activeFontWeight,
        activeFontStyle,
        activeTextBackground,
        setFont,
        setFontSize,
        setFontWeight,
        setFontStyle,
        setTextBackground,
        resetProject,
        highlighterColor,
        highlighterWidth,
        setHighlighterColor,
        setHighlighterWidth,
        pdfPageMapping,
        fitToScreen,
        setIsGridView,
    } = useStore();

    const penColorRef = useRef<HTMLInputElement>(null);
    const bgColorRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const panelTimerRef = useRef<NodeJS.Timeout | null>(null);

    const [activePanel, setActivePanel] = useState<ActivePanel>('none');
    const [isExporting, setIsExporting] = useState(false);

    const isPen = currentTool === 'pen';
    const isEraser = currentTool === 'eraser';
    const isSelect = currentTool === 'select';
    const isShape = currentTool === 'shape';
    const isText = currentTool === 'text';
    const isLasso = currentTool === 'lasso';
    const isHighlighter = currentTool === 'highlighter';
    const canUndoAction = historyStack.length > 0;
    const canRedoAction = redoStack.length > 0;

    // Shape definitions for the shapes panel
    const shapes: { id: ShapeType; icon: React.ReactNode; label: string }[] = [
        { id: 'rectangle', icon: <Square className="w-5 h-5" />, label: 'Rectangle' },
        { id: 'circle', icon: <Circle className="w-5 h-5" />, label: 'Circle' },
        { id: 'triangle', icon: <Triangle className="w-5 h-5" />, label: 'Triangle' },
        { id: 'line', icon: <Minus className="w-5 h-5" />, label: 'Line' },
        { id: 'arrow', icon: <MoveRight className="w-5 h-5" />, label: 'Arrow' },
    ];

    const patterns: { id: Pattern; icon: React.ReactNode; label: string }[] = [
        { id: 'none', icon: <X className="w-4 h-4" />, label: 'None' },
        { id: 'grid', icon: <Grid3X3 className="w-4 h-4" />, label: 'Grid' },
        { id: 'dots', icon: <Circle className="w-4 h-4" />, label: 'Dots' },
        { id: 'lines', icon: <AlignJustify className="w-4 h-4" />, label: 'Ruled' },
        { id: 'isometric', icon: <Box className="w-4 h-4" />, label: 'Iso' },
        { id: 'music', icon: <Music className="w-4 h-4" />, label: 'Music' },
        { id: 'cornell', icon: <Layout className="w-4 h-4" />, label: 'Cornell' },
    ];

    // Track fullscreen state (syncs with Esc key exit)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [setIsFullscreen]);

    // Auto-close panel after 3 seconds of inactivity
    const resetPanelTimer = useCallback(() => {
        if (panelTimerRef.current) {
            clearTimeout(panelTimerRef.current);
        }
        panelTimerRef.current = setTimeout(() => {
            setActivePanel('none');
        }, 3000);
    }, []);

    // Start timer when panel opens
    useEffect(() => {
        if (activePanel !== 'none') {
            resetPanelTimer();
        }
        return () => {
            if (panelTimerRef.current) {
                clearTimeout(panelTimerRef.current);
            }
        };
    }, [activePanel, resetPanelTimer]);

    // Toggle fullscreen
    const toggleFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
            // Trigger immersion lock after transition
            setTimeout(() => {
                fitToScreen();
            }, 100);
        } catch (err) {
            console.error('Fullscreen error:', err);
        }
    }, [fitToScreen]);

    // Export handler - uses fixed A4 dimensions for consistent PDF output
    const handleExport = useCallback(async () => {
        if (isExporting) return;
        setIsExporting(true);

        try {
            await exportToPdf(strokes, images, {
                pageCount,
                background: canvasBackground,
                pattern: canvasPattern,
                projectName: projectName || 'Untitled Universe',
                pdfPageMapping,
            });
        } catch (err) {
            console.error('Export error:', err);
        } finally {
            setIsExporting(false);
        }
    }, [isExporting, strokes, images, pageCount, canvasBackground, canvasPattern, projectName, pdfPageMapping]);

    // Image upload handler - centers on current page
    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (!dataUrl) return;

            const img = new Image();

            img.onload = () => {
                // Smart scaling
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                const maxWidth = Math.min(600, PAGE_WIDTH * 0.8);
                const maxHeight = PAGE_HEIGHT * 0.6;

                let width = maxWidth;
                let height = width / aspectRatio;

                if (height > maxHeight) {
                    height = maxHeight;
                    width = height * aspectRatio;
                }

                // Page-relative positioning: center on current page
                // X: Center of A4 paper width
                const x = (PAGE_WIDTH / 2) - (width / 2);

                // Y: Center of the current page
                // currentPage is 1-based (1, 2, 3...)
                const pageTopY = (currentPage - 1) * PAGE_HEIGHT;
                const y = pageTopY + (PAGE_HEIGHT / 2) - (height / 2);

                const canvasImage: CanvasImage = {
                    id: generateId(),
                    url: dataUrl,
                    x,
                    y,
                    width,
                    height,
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                };

                addImage(canvasImage);
            };

            img.src = dataUrl;
        };

        reader.readAsDataURL(file);
        e.target.value = '';
    }, [addImage, currentPage]);

    // Delete Page Handler
    const handleDeletePage = useCallback(() => {
        if (confirm(`Delete Page ${currentPage}? This cannot be undone.`)) {
            deletePage(currentPage - 1);
        }
    }, [deletePage, currentPage]);

    // Insert Page Handler
    const handleInsertPage = useCallback(() => {
        insertPageAfter(currentPage - 1);
    }, [insertPageAfter, currentPage]);

    // Tool handlers
    const handlePenClick = () => {
        if (isPen) {
            setActivePanel(activePanel === 'pen' ? 'none' : 'pen');
        } else {
            setTool('pen');
            setActivePanel('pen');
        }
    };

    const handleEraserClick = () => {
        if (isEraser) {
            setActivePanel(activePanel === 'eraser' ? 'none' : 'eraser');
        } else {
            setTool('eraser');
            setActivePanel('eraser');
        }
    };

    const handleSelectClick = () => {
        setTool('select');
        setActivePanel('none');
    };

    const handleHighlighterClick = () => {
        if (isHighlighter) {
            setActivePanel(activePanel === 'highlighter' ? 'none' : 'highlighter');
        } else {
            setTool('highlighter');
            setActivePanel('highlighter');
        }
    };

    const handleBgClick = () => {
        setActivePanel(activePanel === 'bg' ? 'none' : 'bg');
    };

    const handleZoomClick = () => {
        setActivePanel(activePanel === 'zoom' ? 'none' : 'zoom');
    };

    const handlePatternSelect = (pattern: Pattern) => {
        setCanvasPattern(pattern);
        setActivePanel('none');
    };

    const handleShapeClick = () => {
        if (isShape) {
            setActivePanel(activePanel === 'shape' ? 'none' : 'shape');
        } else {
            setShape(activeShape); // This sets tool to 'shape'
            setActivePanel('shape');
        }
    };

    const handleShapeSelect = (shape: ShapeType) => {
        setShape(shape);
        setActivePanel('none');
    };

    const handleTextClick = () => {
        if (isText) {
            setActivePanel(activePanel === 'text' ? 'none' : 'text');
        } else {
            setTool('text');
            setActivePanel('text');
        }
    };

    const handleLassoClick = () => {
        setTool('lasso');
        setActivePanel('none');
    };

    // Panel interaction keeps it open
    const handlePanelInteraction = () => {
        resetPanelTimer();
    };

    // Render floating panel (opens UPWARD from dock)
    const renderPanel = () => {
        if (activePanel === 'none') return null;

        return (
            <div
                className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2
                    p-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl min-w-[180px]"
                onPointerMove={handlePanelInteraction}
                onPointerDown={handlePanelInteraction}
            >
                {/* Pen Settings Panel */}
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

                        {/* Color Picker */}
                        <div className="flex items-center gap-3 mb-4">
                            <button
                                onClick={() => penColorRef.current?.click()}
                                className="w-10 h-10 rounded-xl border-2 border-white/30 
                                    hover:border-white/50 transition-all hover:scale-110 shadow-lg"
                                style={{ backgroundColor: penColor }}
                                title="Pen Color"
                            />
                            <input
                                ref={penColorRef}
                                type="color"
                                value={penColor}
                                onChange={(e) => setPenColor(e.target.value)}
                                className="sr-only"
                            />
                            <span className="text-xs text-white/50 font-mono uppercase">{penColor}</span>
                        </div>

                        {/* Size Slider */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-white/50">Size</span>
                                <span className="text-xs text-white/70 font-mono">{penWidth}px</span>
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={50}
                                value={penWidth}
                                onChange={(e) => setPenWidth(parseInt(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer
                                    bg-white/20 accent-white"
                            />
                        </div>
                    </>
                )}

                {/* Eraser Settings Panel */}
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

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-white/50">Size</span>
                                <span className="text-xs text-white/70 font-mono">{eraserWidth}px</span>
                            </div>
                            <input
                                type="range"
                                min={5}
                                max={100}
                                value={eraserWidth}
                                onChange={(e) => setEraserWidth(parseInt(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer
                                    bg-white/20 accent-white"
                            />
                        </div>
                    </>
                )}

                {/* Highlighter Settings Panel */}
                {activePanel === 'highlighter' && (
                    <>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-white/60 uppercase tracking-wider font-medium">Highlighter</span>
                            <button
                                onClick={() => setActivePanel('none')}
                                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-3 h-3 text-white/40" />
                            </button>
                        </div>

                        {/* Neon Color Palette */}
                        <div className="flex gap-2 mb-4">
                            {[
                                { color: '#ffff00', label: 'Yellow' },
                                { color: '#00ff00', label: 'Green' },
                                { color: '#ff00ff', label: 'Pink' },
                                { color: '#00ffff', label: 'Cyan' },
                            ].map((item) => (
                                <button
                                    key={item.color}
                                    onClick={() => setHighlighterColor(item.color)}
                                    className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${highlighterColor === item.color
                                        ? 'border-white ring-2 ring-white/30'
                                        : 'border-white/30 hover:border-white/50'
                                        }`}
                                    style={{ backgroundColor: item.color }}
                                    title={item.label}
                                />
                            ))}
                        </div>

                        {/* Size Slider */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-white/50">Thickness</span>
                                <span className="text-xs text-white/70 font-mono">{highlighterWidth}px</span>
                            </div>
                            <input
                                type="range"
                                min={10}
                                max={50}
                                value={highlighterWidth}
                                onChange={(e) => setHighlighterWidth(parseInt(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer
                                    bg-white/20 accent-yellow-400"
                            />
                        </div>
                    </>
                )}

                {/* Background Settings Panel */}
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

                        {/* Background Color */}
                        <div className="flex items-center gap-3 mb-4">
                            <button
                                onClick={() => bgColorRef.current?.click()}
                                className="w-10 h-10 rounded-xl border-2 border-white/30 
                                    hover:border-white/50 transition-all hover:scale-110 shadow-lg"
                                style={{ backgroundColor: canvasBackground }}
                                title="Paper Color"
                            />
                            <input
                                ref={bgColorRef}
                                type="color"
                                value={canvasBackground}
                                onChange={(e) => setCanvasBackground(e.target.value)}
                                className="sr-only"
                            />
                            <span className="text-xs text-white/50 font-mono uppercase">{canvasBackground}</span>
                        </div>

                        {/* Pattern Selector */}
                        <div className="space-y-2">
                            <span className="text-xs text-white/50">Pattern</span>
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

                {/* Zoom Panel */}
                {activePanel === 'zoom' && (
                    <>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-white/60 uppercase tracking-wider font-medium">Zoom</span>
                            <button
                                onClick={() => setActivePanel('none')}
                                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-3 h-3 text-white/40" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={zoomOut}
                                disabled={zoom <= 0.1}
                                className={`p-2 rounded-lg transition-all ${zoom <= 0.1
                                    ? 'bg-white/5 opacity-30 cursor-not-allowed'
                                    : 'bg-white/10 hover:bg-white/20 hover:scale-110'
                                    }`}
                                title="Zoom Out"
                            >
                                <Minus className="w-4 h-4 text-white/60" />
                            </button>

                            <button
                                onClick={resetZoom}
                                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 
                                    transition-all font-mono text-sm text-white/80 min-w-[60px]"
                                title="Click to reset to 100%"
                            >
                                {Math.round(zoom * 100)}%
                            </button>

                            <button
                                onClick={zoomIn}
                                disabled={zoom >= 5.0}
                                className={`p-2 rounded-lg transition-all ${zoom >= 5.0
                                    ? 'bg-white/5 opacity-30 cursor-not-allowed'
                                    : 'bg-white/10 hover:bg-white/20 hover:scale-110'
                                    }`}
                                title="Zoom In"
                            >
                                <Plus className="w-4 h-4 text-white/60" />
                            </button>
                        </div>
                    </>
                )}

                {/* Shapes Panel */}
                {activePanel === 'shape' && (
                    <>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-white/60 uppercase tracking-wider font-medium">Shapes</span>
                            <button
                                onClick={() => setActivePanel('none')}
                                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-3 h-3 text-white/40" />
                            </button>
                        </div>

                        <div className="grid grid-cols-5 gap-2">
                            {shapes.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => handleShapeSelect(s.id)}
                                    className={`p-3 rounded-lg transition-all hover:scale-110 ${activeShape === s.id
                                        ? 'bg-white/25 ring-2 ring-white/50'
                                        : 'bg-white/10 hover:bg-white/15'
                                        }`}
                                    title={s.label}
                                >
                                    <span className={activeShape === s.id ? 'text-white' : 'text-white/60'}>
                                        {s.icon}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <p className="text-xs text-white/40 mt-3 text-center">
                            Hold Shift for perfect shapes
                        </p>
                    </>
                )}

                {/* Text Panel */}
                {activePanel === 'text' && (
                    <>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-white/60 uppercase tracking-wider font-medium">Text</span>
                            <button
                                onClick={() => setActivePanel('none')}
                                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-3 h-3 text-white/40" />
                            </button>
                        </div>

                        {/* Font Family Dropdown */}
                        <div className="space-y-2 mb-4">
                            <span className="text-xs text-white/50">Font</span>
                            <select
                                value={activeFont}
                                onChange={(e) => setFont(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm
                                    hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                                style={{ fontFamily: `var(--font-${activeFont === 'Inter' ? 'sans' : activeFont === 'Playfair Display' ? 'serif' : activeFont === 'Caveat' ? 'hand' : 'mono'})` }}
                            >
                                <option value="Inter" style={{ fontFamily: 'var(--font-sans)' }}>Sans (Inter)</option>
                                <option value="Playfair Display" style={{ fontFamily: 'var(--font-serif)' }}>Serif (Playfair)</option>
                                <option value="Caveat" style={{ fontFamily: 'var(--font-hand)' }}>Hand (Caveat)</option>
                                <option value="JetBrains Mono" style={{ fontFamily: 'var(--font-mono)' }}>Code (JetBrains)</option>
                            </select>
                        </div>

                        {/* Style Toggles (Bold/Italic) */}
                        <div className="space-y-2 mb-4">
                            <span className="text-xs text-white/50">Style</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFontWeight(activeFontWeight === 'normal' ? 'bold' : 'normal')}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 ${activeFontWeight === 'bold'
                                        ? 'bg-white/25 ring-2 ring-white/50 text-white'
                                        : 'bg-white/10 hover:bg-white/15 text-white/60'
                                        }`}
                                    title="Bold"
                                >
                                    B
                                </button>
                                <button
                                    onClick={() => setFontStyle(activeFontStyle === 'normal' ? 'italic' : 'normal')}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm italic transition-all hover:scale-105 ${activeFontStyle === 'italic'
                                        ? 'bg-white/25 ring-2 ring-white/50 text-white'
                                        : 'bg-white/10 hover:bg-white/15 text-white/60'
                                        }`}
                                    title="Italic"
                                >
                                    I
                                </button>
                            </div>
                        </div>

                        {/* Background (Sticky Notes) */}
                        <div className="space-y-2 mb-4">
                            <span className="text-xs text-white/50">Background</span>
                            <div className="grid grid-cols-5 gap-2">
                                {[
                                    { color: 'transparent', label: 'None' },
                                    { color: '#fef3c7', label: 'Yellow' },
                                    { color: '#fce7f3', label: 'Pink' },
                                    { color: '#dbeafe', label: 'Blue' },
                                    { color: '#ffffff', label: 'White' }
                                ].map((bg) => (
                                    <button
                                        key={bg.color}
                                        onClick={() => setTextBackground(bg.color)}
                                        className={`p-2 rounded-lg transition-all hover:scale-110 ${activeTextBackground === bg.color
                                            ? 'ring-2 ring-white/50'
                                            : 'ring-1 ring-white/20'
                                            }`}
                                        title={bg.label}
                                        style={{
                                            backgroundColor: bg.color,
                                            border: bg.color === 'transparent' ? '2px dashed rgba(255,255,255,0.3)' : 'none',
                                            minHeight: '32px',
                                        }}
                                    >
                                        {bg.color === 'transparent' && (
                                            <X className="w-4 h-4 text-white/40 mx-auto" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Font Size Slider */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-white/50">Size</span>
                                <span className="text-xs text-white/70 font-mono">{activeFontSize}px</span>
                            </div>
                            <input
                                type="range"
                                min={12}
                                max={72}
                                value={activeFontSize}
                                onChange={(e) => setFontSize(parseInt(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer
                                    bg-white/20 accent-white"
                            />
                        </div>
                    </>
                )}
            </div>
        );
    };

    // Vertical separator
    const Separator = () => (
        <div className="w-px h-6 bg-white/20 mx-1" />
    );

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            {/* Floating Panel (opens UPWARD) */}
            <div className="relative">
                {renderPanel()}
            </div>

            {/* Main Dock */}
            <div className="flex items-center gap-1 px-4 py-3
                bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
            >
                {/* Group 1: Tools */}
                <button
                    onClick={handlePenClick}
                    className={`relative p-3 rounded-xl transition-all hover:scale-110 ${isPen
                        ? 'bg-white/25 ring-2 ring-white/50'
                        : 'bg-white/5 hover:bg-white/10'
                        }`}
                    title="Pen Tool (P)"
                >
                    <Pencil className={`w-6 h-6 ${isPen ? 'text-white' : 'text-white/60'}`} />
                </button>

                <button
                    onClick={handleEraserClick}
                    className={`relative p-3 rounded-xl transition-all hover:scale-110 ${isEraser
                        ? 'bg-white/25 ring-2 ring-white/50'
                        : 'bg-white/5 hover:bg-white/10'
                        }`}
                    title="Eraser Tool (E)"
                >
                    <Eraser className={`w-6 h-6 ${isEraser ? 'text-white' : 'text-white/60'}`} />
                </button>

                <button
                    onClick={handleHighlighterClick}
                    className={`relative p-3 rounded-xl transition-all hover:scale-110 ${isHighlighter
                        ? 'bg-yellow-500/40 ring-2 ring-yellow-400/50'
                        : 'bg-white/5 hover:bg-yellow-500/20'
                        }`}
                    title="Highlighter Tool (H)"
                >
                    <Highlighter className={`w-6 h-6 ${isHighlighter ? 'text-yellow-300' : 'text-white/60'}`} />
                </button>

                <button
                    onClick={handleSelectClick}
                    className={`relative p-3 rounded-xl transition-all hover:scale-110 ${isSelect
                        ? 'bg-white/25 ring-2 ring-white/50'
                        : 'bg-white/5 hover:bg-white/10'
                        }`}
                    title="Select Tool (V)"
                >
                    <Hand className={`w-6 h-6 ${isSelect ? 'text-white' : 'text-white/60'}`} />
                </button>

                <button
                    onClick={handleShapeClick}
                    className={`relative p-3 rounded-xl transition-all hover:scale-110 ${isShape
                        ? 'bg-white/25 ring-2 ring-white/50'
                        : 'bg-white/5 hover:bg-white/10'
                        }`}
                    title="Shapes Tool (S)"
                >
                    <Shapes className={`w-6 h-6 ${isShape ? 'text-white' : 'text-white/60'}`} />
                </button>

                <button
                    onClick={handleTextClick}
                    className={`relative p-3 rounded-xl transition-all hover:scale-110 ${isText
                        ? 'bg-white/25 ring-2 ring-white/50'
                        : 'bg-white/5 hover:bg-white/10'
                        }`}
                    title="Text Tool (T)"
                >
                    <Type className={`w-6 h-6 ${isText ? 'text-white' : 'text-white/60'}`} />
                </button>

                <button
                    onClick={handleLassoClick}
                    className={`relative p-3 rounded-xl transition-all hover:scale-110 ${isLasso
                        ? 'bg-white/25 ring-2 ring-white/50'
                        : 'bg-white/5 hover:bg-white/10'
                        }`}
                    title="Lasso Tool (L)"
                >
                    <Lasso className={`w-6 h-6 ${isLasso ? 'text-white' : 'text-white/60'}`} />
                </button>

                <Separator />

                {/* Group 2: Actions */}
                <button
                    onClick={undo}
                    disabled={!canUndoAction}
                    className={`p-3 rounded-xl transition-all ${canUndoAction
                        ? 'bg-white/5 hover:bg-white/15 hover:scale-110'
                        : 'bg-white/5 opacity-30 cursor-not-allowed'
                        }`}
                    title="Undo (Ctrl+Z)"
                >
                    <Undo2 className="w-6 h-6 text-white/60" />
                </button>

                <button
                    onClick={redo}
                    disabled={!canRedoAction}
                    className={`p-3 rounded-xl transition-all ${canRedoAction
                        ? 'bg-white/5 hover:bg-white/15 hover:scale-110'
                        : 'bg-white/5 opacity-30 cursor-not-allowed'
                        }`}
                    title="Redo (Ctrl+Y)"
                >
                    <Redo2 className="w-6 h-6 text-white/60" />
                </button>

                <button
                    onClick={handleDeletePage}
                    className="p-3 rounded-xl bg-white/5 hover:bg-red-500/30 
                        transition-all hover:scale-110"
                    title={`Delete Page ${currentPage}`}
                >
                    <FileMinus className="w-6 h-6 text-white/60 hover:text-red-400" />
                </button>

                <Separator />

                {/* Group 3: Page & Image */}
                <button
                    onClick={handleInsertPage}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/15 
                        transition-all hover:scale-110"
                    title={`Insert Page After Page ${currentPage}`}
                >
                    <FilePlus className="w-6 h-6 text-white/60" />
                </button>

                <button
                    onClick={() => imageInputRef.current?.click()}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/15 
                        transition-all hover:scale-110"
                    title="Add Image"
                >
                    <ImageIcon className="w-6 h-6 text-white/60" />
                </button>
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                />

                <Separator />

                {/* Group 4: Meta */}
                <button
                    onClick={handleBgClick}
                    className={`relative p-3 rounded-xl transition-all hover:scale-110 ${activePanel === 'bg'
                        ? 'bg-white/25 ring-2 ring-white/50'
                        : 'bg-white/5 hover:bg-white/10'
                        }`}
                    title="Paper Settings"
                >
                    <Paintbrush className={`w-6 h-6 ${activePanel === 'bg' ? 'text-white' : 'text-white/60'}`} />
                </button>

                <button
                    onClick={handleZoomClick}
                    className={`relative p-3 rounded-xl transition-all hover:scale-110 ${activePanel === 'zoom'
                        ? 'bg-white/25 ring-2 ring-white/50'
                        : 'bg-white/5 hover:bg-white/10'
                        }`}
                    title={`Zoom (${Math.round(zoom * 100)}%)`}
                >
                    <ZoomIn className={`w-6 h-6 ${activePanel === 'zoom' ? 'text-white' : 'text-white/60'}`} />
                </button>

                {/* Grid View Logic Included Here */}
                <div className="flex items-center gap-1 pl-4 border-l border-white/10">
                    <button
                        onClick={() => setIsGridView(true)}
                        className="p-3 text-white/50 hover:text-blue-400 hover:bg-white/5 rounded-xl transition-all"
                        title="Grid View (Navigate)"
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>

                    <button
                        onClick={toggleFullscreen}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/15 
                        transition-all hover:scale-110"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    >
                        {isFullscreen
                            ? <Minimize className="w-6 h-6 text-white/60" />
                            : <Maximize className="w-6 h-6 text-white/60" />
                        }
                    </button>
                </div>

                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className={`p-3 rounded-xl transition-all ${isExporting
                        ? 'bg-white/5 opacity-50 cursor-wait'
                        : 'bg-white/5 hover:bg-green-500/30 hover:scale-110'
                        }`}
                    title="Export PDF"
                >
                    <Download className={`w-6 h-6 ${isExporting ? 'text-white/40 animate-pulse' : 'text-white/60 hover:text-green-400'}`} />
                </button>

                {/* Separator */}
                <div className="w-px h-8 bg-white/10 mx-1" />

                {/* New Project */}
                <button
                    onClick={() => {
                        if (confirm('Start a new project? Your current work is saved automatically.')) {
                            resetProject();
                        }
                    }}
                    className="p-3 rounded-xl bg-white/5 hover:bg-red-500/20 hover:scale-110 transition-all"
                    title="New Project"
                >
                    <FileX2 className="w-6 h-6 text-white/60 hover:text-red-400" />
                </button>

                <Link
                    href="/pdf-viewer"
                    className="p-3 rounded-xl bg-white/5 hover:bg-purple-500/20 hover:scale-110 transition-all"
                    title="Open PDF"
                >
                    <BookOpen className="w-6 h-6 text-white/60 hover:text-purple-400" />
                </Link>
            </div>
        </div>
    );
}
