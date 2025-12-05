'use client';

import { useStore } from '@/store/useStore';
import { Pencil, Eraser, Palette, Trash2, Grid3X3, Circle, Minus, Paintbrush } from 'lucide-react';
import { useRef, useState } from 'react';
import { Pattern } from '@/types';

/**
 * Toolbar Component - The Gravity Dock
 * 
 * Glassmorphism sidebar with pen, eraser, color picker, size slider, 
 * background controls, and clear button.
 */
export default function Toolbar() {
    const {
        currentConfig,
        currentTool,
        canvasBackground,
        canvasPattern,
        setColor,
        setSize,
        setTool,
        setCanvasBackground,
        setCanvasPattern,
        clearCanvas
    } = useStore();

    const colorInputRef = useRef<HTMLInputElement>(null);
    const bgColorInputRef = useRef<HTMLInputElement>(null);
    const [showBgPanel, setShowBgPanel] = useState(false);

    const isEraserActive = currentTool === 'eraser';
    const isPenActive = currentTool === 'pen';

    const patterns: { id: Pattern; icon: React.ReactNode; label: string }[] = [
        { id: 'none', icon: <Minus className="w-4 h-4" />, label: 'None' },
        { id: 'grid', icon: <Grid3X3 className="w-4 h-4" />, label: 'Grid' },
        { id: 'dots', icon: <Circle className="w-4 h-4" />, label: 'Dots' },
        { id: 'lines', icon: <Minus className="w-4 h-4 rotate-0" />, label: 'Lines' },
    ];

    return (
        <div
            className="fixed right-4 top-1/2 -translate-y-1/2 z-50
        flex flex-col items-center gap-3 p-4
        bg-black/30 backdrop-blur-xl
        border border-white/20 rounded-2xl
        shadow-2xl"
        >
            {/* Pen Tool */}
            <button
                onClick={() => setTool('pen')}
                className={`p-3 rounded-xl transition-all hover:scale-110 ${isPenActive
                        ? 'bg-white/20 ring-2 ring-white/40'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                title="Pen Tool"
            >
                <Pencil className={`w-5 h-5 ${isPenActive ? 'text-white' : 'text-white/60'}`} />
            </button>

            {/* Eraser Tool */}
            <button
                onClick={() => setTool('eraser')}
                className={`p-3 rounded-xl transition-all hover:scale-110 ${isEraserActive
                        ? 'bg-white/20 ring-2 ring-white/40'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                title="Eraser Tool"
            >
                <Eraser className={`w-5 h-5 ${isEraserActive ? 'text-white' : 'text-white/60'}`} />
            </button>

            {/* Divider */}
            <div className="w-8 h-px bg-white/20" />

            {/* Stroke Color Picker */}
            <div className={`relative transition-opacity ${isEraserActive ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <button
                    onClick={() => colorInputRef.current?.click()}
                    className="w-10 h-10 rounded-full border-2 border-white/30 
            hover:border-white/50 transition-all hover:scale-110
            shadow-lg"
                    style={{ backgroundColor: currentConfig.color }}
                    title="Stroke Color"
                />
                <input
                    ref={colorInputRef}
                    type="color"
                    value={currentConfig.color}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Palette className="absolute -bottom-1 -right-1 w-4 h-4 text-white/60 pointer-events-none" />
            </div>

            {/* Size Slider */}
            <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-white/50 font-mono">{currentConfig.size}px</span>
                <input
                    type="range"
                    min="1"
                    max="50"
                    value={currentConfig.size}
                    onChange={(e) => setSize(parseInt(e.target.value))}
                    className="w-24 h-2 -rotate-90 origin-center
            appearance-none bg-white/20 rounded-full cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:hover:scale-125
            [&::-webkit-slider-thumb]:transition-transform"
                    style={{ marginTop: '40px', marginBottom: '40px' }}
                    title="Stroke Size"
                />
                <div
                    className={`rounded-full transition-all ${isEraserActive ? 'bg-white/40' : ''}`}
                    style={{
                        width: Math.min(currentConfig.size, 24),
                        height: Math.min(currentConfig.size, 24),
                        backgroundColor: isEraserActive ? undefined : currentConfig.color,
                    }}
                />
            </div>

            {/* Divider */}
            <div className="w-8 h-px bg-white/20" />

            {/* Background Controls Toggle */}
            <button
                onClick={() => setShowBgPanel(!showBgPanel)}
                className={`p-3 rounded-xl transition-all hover:scale-110 ${showBgPanel
                        ? 'bg-white/20 ring-2 ring-white/40'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                title="Background Settings"
            >
                <Paintbrush className={`w-5 h-5 ${showBgPanel ? 'text-white' : 'text-white/60'}`} />
            </button>

            {/* Background Panel (slides out) */}
            {showBgPanel && (
                <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2
          flex flex-col items-center gap-3 p-4
          bg-black/40 backdrop-blur-xl
          border border-white/20 rounded-2xl
          shadow-2xl min-w-[140px]"
                >
                    <span className="text-xs text-white/50 uppercase tracking-wider">Background</span>

                    {/* Background Color */}
                    <div className="relative">
                        <button
                            onClick={() => bgColorInputRef.current?.click()}
                            className="w-12 h-12 rounded-xl border-2 border-white/30 
                hover:border-white/50 transition-all hover:scale-105
                shadow-lg"
                            style={{ backgroundColor: canvasBackground }}
                            title="Background Color"
                        />
                        <input
                            ref={bgColorInputRef}
                            type="color"
                            value={canvasBackground}
                            onChange={(e) => setCanvasBackground(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>

                    <div className="w-full h-px bg-white/20" />

                    <span className="text-xs text-white/50 uppercase tracking-wider">Pattern</span>

                    {/* Pattern Buttons */}
                    <div className="flex gap-2 flex-wrap justify-center">
                        {patterns.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setCanvasPattern(p.id)}
                                className={`p-2 rounded-lg transition-all hover:scale-110 ${canvasPattern === p.id
                                        ? 'bg-white/20 ring-2 ring-white/40'
                                        : 'bg-white/5 hover:bg-white/10'
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
            )}

            {/* Divider */}
            <div className="w-8 h-px bg-white/20" />

            {/* Clear Button */}
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
    );
}
