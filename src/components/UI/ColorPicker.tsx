'use client';

import { useState } from 'react';

interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
    label?: string;
}

const PRESET_COLORS = [
    '#ffffff', '#f8fafc', '#94a3b8', '#64748b',
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
    '#000000', '#1e1e1e', '#2d2d2d', '#404040',
];

const ColorPicker = ({ color, onChange, label }: ColorPickerProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            {label && (
                <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
                    {label}
                </label>
            )}

            {/* Color Trigger */}
            <button
                className="w-full h-10 rounded-xl border-2 border-white/10 hover:border-white/20 transition-all overflow-hidden group"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div
                    className="w-full h-full transition-transform group-hover:scale-105"
                    style={{ backgroundColor: color }}
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Picker Panel */}
                    <div className="absolute right-full mr-3 top-0 z-50 p-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl min-w-[200px]">
                        {/* Hex Input */}
                        <div className="mb-4">
                            <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
                                Hex
                            </label>
                            <input
                                type="text"
                                value={color}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                                        onChange(val);
                                    }
                                }}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-white/30"
                            />
                        </div>

                        {/* Native Color Picker */}
                        <div className="mb-4">
                            <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
                                Custom
                            </label>
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => onChange(e.target.value)}
                                className="w-full h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                            />
                        </div>

                        {/* Preset Colors */}
                        <div>
                            <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
                                Presets
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {PRESET_COLORS.map((presetColor) => (
                                    <button
                                        key={presetColor}
                                        className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${color === presetColor ? 'border-white' : 'border-transparent'
                                            }`}
                                        style={{ backgroundColor: presetColor }}
                                        onClick={() => {
                                            onChange(presetColor);
                                            setIsOpen(false);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ColorPicker;
