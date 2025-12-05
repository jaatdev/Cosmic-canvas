'use client';

import { useState, useCallback, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { exportToPDF, exportToPNG } from '@/utils/exportUtils';
import ColorPicker from './ColorPicker';
import ThicknessSlider from './ThicknessSlider';
import {
    Pen,
    Eraser,
    Type,
    Image as ImageIcon,
    Maximize,
    FileDown,
    Palette,
    Grid3X3,
    Circle,
    Minus,
    Square,
    Trash2,
    ChevronDown,
} from 'lucide-react';
import { Tool, BackgroundPattern } from '@/types';

interface ToolButtonProps {
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick: () => void;
    hasSubmenu?: boolean;
}

const ToolButton = ({ icon, label, isActive, onClick, hasSubmenu }: ToolButtonProps) => (
    <button
        onClick={onClick}
        className={`relative group flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${isActive
                ? 'bg-white/20 text-white shadow-lg shadow-white/10'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
        title={label}
    >
        {icon}
        {hasSubmenu && (
            <ChevronDown className="absolute bottom-1 right-1 w-3 h-3 opacity-40" />
        )}

        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-2 py-1 bg-black/80 backdrop-blur-xl text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
            {label}
        </span>
    </button>
);

const RightSidebar = () => {
    const {
        tool,
        setTool,
        brush,
        setBrushColor,
        setBrushSize,
        eraserMode,
        setEraserMode,
        backgroundColor,
        setBackgroundColor,
        backgroundPattern,
        setBackgroundPattern,
        strokes,
        objects,
        projectName,
        clearStrokes,
    } = useStore();

    const [showPenOptions, setShowPenOptions] = useState(false);
    const [showEraserOptions, setShowEraserOptions] = useState(false);
    const [showBackgroundOptions, setShowBackgroundOptions] = useState(false);
    const [showExportOptions, setShowExportOptions] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleToolSelect = (selectedTool: Tool) => {
        setTool(selectedTool);
        setShowPenOptions(false);
        setShowEraserOptions(false);
    };

    const handleFullscreen = useCallback(() => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }, []);

    const handleExportPDF = useCallback(async () => {
        await exportToPDF({
            projectName,
            backgroundColor,
            strokes,
            objects,
            width: window.innerWidth,
            height: window.innerHeight,
        });
        setShowExportOptions(false);
    }, [projectName, backgroundColor, strokes, objects]);

    const handleExportPNG = useCallback(async () => {
        await exportToPNG({
            projectName,
            backgroundColor,
            strokes,
            objects,
            width: window.innerWidth,
            height: window.innerHeight,
        });
        setShowExportOptions(false);
    }, [projectName, backgroundColor, strokes, objects]);

    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const src = event.target?.result as string;
            const img = new window.Image();
            img.onload = () => {
                const maxWidth = 400;
                const aspectRatio = img.width / img.height;
                const width = Math.min(img.width, maxWidth);
                const height = width / aspectRatio;

                useStore.getState().addImageNode({
                    id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    x: window.innerWidth / 2 - width / 2,
                    y: window.innerHeight / 2 - height / 2,
                    width,
                    height,
                    src,
                    aspectRatio,
                });
            };
            img.src = src;
        };
        reader.readAsDataURL(file);

        // Reset input
        e.target.value = '';
    }, []);

    const PATTERN_OPTIONS: { value: BackgroundPattern; icon: React.ReactNode; label: string }[] = [
        { value: 'none', icon: <Square className="w-4 h-4" />, label: 'Solid' },
        { value: 'grid', icon: <Grid3X3 className="w-4 h-4" />, label: 'Grid' },
        { value: 'dots', icon: <Circle className="w-4 h-4" />, label: 'Dots' },
        { value: 'lines', icon: <Minus className="w-4 h-4" />, label: 'Lines' },
    ];

    return (
        <div className="relative flex flex-col gap-2 p-3 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl">
            {/* Glassmorphism glow effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

            {/* Tools */}
            <div className="relative flex flex-col gap-1">
                {/* Pen Tool */}
                <div className="relative">
                    <ToolButton
                        icon={<Pen className="w-5 h-5" />}
                        label="Pen"
                        isActive={tool === 'pen'}
                        onClick={() => {
                            handleToolSelect('pen');
                            setShowPenOptions(!showPenOptions);
                        }}
                        hasSubmenu
                    />

                    {/* Pen Options Panel */}
                    {showPenOptions && tool === 'pen' && (
                        <div className="absolute right-full mr-3 top-0 p-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl min-w-[200px] space-y-4">
                            <ColorPicker
                                color={brush.color}
                                onChange={setBrushColor}
                                label="Color"
                            />
                            <ThicknessSlider
                                value={brush.size}
                                onChange={setBrushSize}
                                color={brush.color}
                            />
                        </div>
                    )}
                </div>

                {/* Eraser Tool */}
                <div className="relative">
                    <ToolButton
                        icon={<Eraser className="w-5 h-5" />}
                        label="Eraser"
                        isActive={tool === 'eraser'}
                        onClick={() => {
                            handleToolSelect('eraser');
                            setShowEraserOptions(!showEraserOptions);
                        }}
                        hasSubmenu
                    />

                    {/* Eraser Options Panel */}
                    {showEraserOptions && tool === 'eraser' && (
                        <div className="absolute right-full mr-3 top-0 p-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl min-w-[180px] space-y-3">
                            <label className="block text-xs text-white/40 uppercase tracking-wider">
                                Mode
                            </label>
                            <div className="flex gap-2">
                                <button
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${eraserMode === 'pixel'
                                            ? 'bg-white/20 text-white'
                                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                                        }`}
                                    onClick={() => setEraserMode('pixel')}
                                >
                                    Stroke
                                </button>
                                <button
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all ${eraserMode === 'object'
                                            ? 'bg-white/20 text-white'
                                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                                        }`}
                                    onClick={() => setEraserMode('object')}
                                >
                                    Object
                                </button>
                            </div>
                            <ThicknessSlider
                                value={brush.size}
                                onChange={setBrushSize}
                                color="#ff6b6b"
                            />
                        </div>
                    )}
                </div>

                {/* Text Tool */}
                <ToolButton
                    icon={<Type className="w-5 h-5" />}
                    label="Text (Click to add)"
                    isActive={tool === 'text'}
                    onClick={() => handleToolSelect('text')}
                />

                {/* Image Tool */}
                <ToolButton
                    icon={<ImageIcon className="w-5 h-5" />}
                    label="Upload Image"
                    isActive={tool === 'image'}
                    onClick={() => {
                        handleToolSelect('image');
                        fileInputRef.current?.click();
                    }}
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                />

                {/* Divider */}
                <div className="my-2 h-px bg-white/10" />

                {/* Background Options */}
                <div className="relative">
                    <ToolButton
                        icon={<Palette className="w-5 h-5" />}
                        label="Background"
                        onClick={() => setShowBackgroundOptions(!showBackgroundOptions)}
                        hasSubmenu
                    />

                    {showBackgroundOptions && (
                        <div className="absolute right-full mr-3 top-0 p-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl min-w-[200px] space-y-4">
                            <ColorPicker
                                color={backgroundColor}
                                onChange={setBackgroundColor}
                                label="Color"
                            />

                            <div>
                                <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
                                    Pattern
                                </label>
                                <div className="flex gap-2">
                                    {PATTERN_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-all ${backgroundPattern === option.value
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                                }`}
                                            onClick={() => setBackgroundPattern(option.value)}
                                            title={option.label}
                                        >
                                            {option.icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="my-2 h-px bg-white/10" />

                {/* Fullscreen */}
                <ToolButton
                    icon={<Maximize className="w-5 h-5" />}
                    label="Fullscreen"
                    onClick={handleFullscreen}
                />

                {/* Export */}
                <div className="relative">
                    <ToolButton
                        icon={<FileDown className="w-5 h-5" />}
                        label="Export"
                        onClick={() => setShowExportOptions(!showExportOptions)}
                        hasSubmenu
                    />

                    {showExportOptions && (
                        <div className="absolute right-full mr-3 bottom-0 p-3 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl min-w-[140px] space-y-2">
                            <button
                                className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm transition-colors"
                                onClick={handleExportPDF}
                            >
                                Download PDF
                            </button>
                            <button
                                className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white text-sm transition-colors"
                                onClick={handleExportPNG}
                            >
                                Download PNG
                            </button>
                        </div>
                    )}
                </div>

                {/* Clear All */}
                <ToolButton
                    icon={<Trash2 className="w-5 h-5" />}
                    label="Clear All"
                    onClick={() => {
                        if (confirm('Clear all strokes? This cannot be undone.')) {
                            clearStrokes();
                        }
                    }}
                />
            </div>
        </div>
    );
};

export default RightSidebar;
