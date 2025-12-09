'use client';

import { useStore } from '@/store/useStore';
import { Pattern } from '@/types';

interface BackgroundLayerProps {
    totalHeight?: number;
}

/**
 * Calculate pattern color based on background brightness
 */
function getPatternColor(backgroundColor: string): string {
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Standard luminance formula
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // Dark background → light lines, Light background → dark lines
    return brightness < 128
        ? 'rgba(255,255,255,0.1)'
        : 'rgba(0,0,0,0.1)';
}

/**
 * BackgroundLayer Component - Z-Index 0
 * 
 * Full-screen SVG background with vector patterns.
 * Supports grid, dots, ruled lines, isometric, music staves, and Cornell notes.
 */
export default function BackgroundLayer({ totalHeight }: BackgroundLayerProps) {
    const { canvasBackground, canvasPattern, canvasDimensions } = useStore();
    const patternColor = getPatternColor(canvasBackground);

    // Use dynamic page height from store
    const pageHeight = canvasDimensions.height;

    return (
        <svg
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: totalHeight || '100%',
                zIndex: 0,
                pointerEvents: 'none',
            }}
        >
            <defs>
                {/* Grid Pattern - 40px squares */}
                <pattern
                    id="grid"
                    width="40"
                    height="40"
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d="M 40 0 L 0 0 0 40"
                        fill="none"
                        stroke={patternColor}
                        strokeWidth="1"
                    />
                </pattern>

                {/* Dot Pattern - 20px spacing */}
                <pattern
                    id="dots"
                    width="20"
                    height="20"
                    patternUnits="userSpaceOnUse"
                >
                    <circle
                        cx="10"
                        cy="10"
                        r="1.5"
                        fill={patternColor}
                    />
                </pattern>

                {/* Ruled Lines Pattern - 40px spacing */}
                <pattern
                    id="lines"
                    width="100%"
                    height="40"
                    patternUnits="userSpaceOnUse"
                >
                    <line
                        x1="0"
                        y1="40"
                        x2="100%"
                        y2="40"
                        stroke={patternColor}
                        strokeWidth="1"
                    />
                </pattern>

                {/* Isometric Grid Pattern - 60° triangles */}
                <pattern
                    id="isometric"
                    width="86.6"
                    height="50"
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d="M 0 0 L 86.6 50 M 86.6 0 L 0 50 M 43.3 0 L 43.3 50"
                        fill="none"
                        stroke={patternColor}
                        strokeWidth="1"
                    />
                </pattern>

                {/* Music Staves Pattern - 5 lines per group, 200px spacing */}
                <pattern
                    id="music"
                    width="100%"
                    height="200"
                    patternUnits="userSpaceOnUse"
                >
                    {[0, 1, 2, 3, 4].map((i) => (
                        <line
                            key={i}
                            x1="0"
                            y1={20 + i * 20}
                            x2="100%"
                            y2={20 + i * 20}
                            stroke={patternColor}
                            strokeWidth="1"
                        />
                    ))}
                </pattern>

                {/* Cornell Notes Pattern - Cue column and summary section per page */}
                <pattern
                    id="cornell"
                    width="100%"
                    height={pageHeight}
                    patternUnits="userSpaceOnUse"
                >
                    {/* Vertical cue column line at 200px */}
                    <line
                        x1="200"
                        y1="0"
                        x2="200"
                        y2={pageHeight}
                        stroke={patternColor}
                        strokeWidth="2"
                    />
                    {/* Horizontal summary line 200px from bottom */}
                    <line
                        x1="0"
                        y1={pageHeight - 200}
                        x2="100%"
                        y2={pageHeight - 200}
                        stroke={patternColor}
                        strokeWidth="2"
                    />
                </pattern>
            </defs>

            {/* Background color fill */}
            <rect width="100%" height="100%" fill={canvasBackground} />

            {/* Pattern overlay */}
            {canvasPattern !== 'none' && (
                <rect width="100%" height="100%" fill={`url(#${canvasPattern})`} />
            )}
        </svg>
    );
}
