'use client';

import { useStore } from '@/store/useStore';
import { Pencil, Palette, Trash2 } from 'lucide-react';
import { useRef } from 'react';

/**
 * Toolbar Component - The Gravity Dock
 * 
 * Glassmorphism sidebar with color picker, size slider, and clear button.
 * Fixed to the right side of the viewport, vertically centered.
 */
export default function Toolbar() {
    const { currentConfig, setColor, setSize, clearCanvas } = useStore();
    const colorInputRef = useRef<HTMLInputElement>(null);

    return (
        <div
            className="fixed right-4 top-1/2 -translate-y-1/2 z-50
        flex flex-col items-center gap-4 p-4
        bg-black/30 backdrop-blur-xl
        border border-white/20 rounded-2xl
        shadow-2xl"
        >
            {/* Pen Icon */}
            <div className="p-2 rounded-xl bg-white/10">
                <Pencil className="w-5 h-5 text-white/80" />
            </div>

            {/* Divider */}
            <div className="w-8 h-px bg-white/20" />

            {/* Color Picker */}
            <div className="relative">
                <button
                    onClick={() => colorInputRef.current?.click()}
                    className="w-10 h-10 rounded-full border-2 border-white/30 
            hover:border-white/50 transition-all hover:scale-110
            shadow-lg"
                    style={{ backgroundColor: currentConfig.color }}
                    title="Pick Color"
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

            {/* Size Slider (Vertical) */}
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
                {/* Size Preview */}
                <div
                    className="rounded-full bg-white/80 transition-all"
                    style={{
                        width: Math.min(currentConfig.size, 24),
                        height: Math.min(currentConfig.size, 24)
                    }}
                />
            </div>

            {/* Divider */}
            <div className="w-8 h-px bg-white/20" />

            {/* Clear Button */}
            <button
                onClick={() => {
                    if (confirm('Clear the entire canvas?')) {
                        clearCanvas();
                    }
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-red-500/30 
          transition-all hover:scale-110 group"
                title="Clear Canvas"
            >
                <Trash2 className="w-5 h-5 text-white/60 group-hover:text-red-400 transition-colors" />
            </button>
        </div>
    );
}
