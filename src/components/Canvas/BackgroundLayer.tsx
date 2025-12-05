'use client';

import { useStore } from '@/store/useStore';
import { Pattern } from '@/types';
import { useMemo } from 'react';

interface BackgroundLayerProps {
    totalHeight?: number;
}

/**
 * Get CSS background pattern based on pattern type
 */
function getPatternCSS(pattern: Pattern, backgroundColor: string): React.CSSProperties {
    const patternColor = isLightColor(backgroundColor)
        ? 'rgba(0, 0, 0, 0.08)'
        : 'rgba(255, 255, 255, 0.08)';

    switch (pattern) {
        case 'grid':
            return {
                backgroundImage: `
          linear-gradient(${patternColor} 1px, transparent 1px),
          linear-gradient(90deg, ${patternColor} 1px, transparent 1px)
        `,
                backgroundSize: '24px 24px',
            };

        case 'dots':
            return {
                backgroundImage: `radial-gradient(circle, ${patternColor} 1.5px, transparent 1.5px)`,
                backgroundSize: '20px 20px',
            };

        case 'lines':
            return {
                backgroundImage: `linear-gradient(${patternColor} 1px, transparent 1px)`,
                backgroundSize: '100% 28px',
            };

        case 'none':
        default:
            return {};
    }
}

/**
 * Check if a color is light or dark
 */
function isLightColor(hex: string): boolean {
    const color = hex.replace('#', '');
    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
}

/**
 * BackgroundLayer Component - Layer 0
 * 
 * Full-screen background with customizable color and pattern.
 * Sits below the canvas layers.
 */
export default function BackgroundLayer({ totalHeight }: BackgroundLayerProps) {
    const { canvasBackground, canvasPattern } = useStore();

    const patternStyles = useMemo(() =>
        getPatternCSS(canvasPattern, canvasBackground),
        [canvasPattern, canvasBackground]
    );

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: totalHeight || '100%',
                backgroundColor: canvasBackground,
                zIndex: 0,
                pointerEvents: 'none',
            }}
        >
            {/* Pattern Overlay */}
            {canvasPattern !== 'none' && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        ...patternStyles,
                    }}
                />
            )}
        </div>
    );
}
