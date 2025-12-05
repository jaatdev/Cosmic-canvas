'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FontSelectorProps {
    value: string;
    onChange: (font: string) => void;
}

const FONT_OPTIONS = [
    { name: 'System Default', value: 'system-ui, sans-serif' },
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Open Sans', value: 'Open Sans, sans-serif' },
    { name: 'Playfair Display', value: 'Playfair Display, serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Courier New', value: 'Courier New, monospace' },
    { name: 'Fira Code', value: 'Fira Code, monospace' },
    { name: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
    { name: 'Handwriting', value: 'Caveat, cursive' },
];

const FontSelector = ({ value, onChange }: FontSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedFont = FONT_OPTIONS.find((f) => f.value === value) || FONT_OPTIONS[0];

    return (
        <div className="relative">
            <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
                Font
            </label>

            {/* Trigger */}
            <button
                className="w-full flex items-center justify-between px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm hover:bg-white/10 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span style={{ fontFamily: selectedFont.value }}>{selectedFont.name}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 z-50 w-full max-h-60 overflow-auto bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl">
                        {FONT_OPTIONS.map((font) => (
                            <button
                                key={font.value}
                                className={`w-full px-4 py-3 text-left text-sm hover:bg-white/10 transition-colors ${value === font.value ? 'bg-white/5 text-white' : 'text-white/70'
                                    }`}
                                style={{ fontFamily: font.value }}
                                onClick={() => {
                                    onChange(font.value);
                                    setIsOpen(false);
                                }}
                            >
                                {font.name}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default FontSelector;
