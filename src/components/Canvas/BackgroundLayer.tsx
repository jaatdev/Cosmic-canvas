'use client';

import { BackgroundPattern } from '@/types';

interface BackgroundLayerProps {
    backgroundColor: string;
    pattern: BackgroundPattern;
}

const BackgroundLayer = ({ backgroundColor, pattern }: BackgroundLayerProps) => {
    const getPatternStyle = (): React.CSSProperties => {
        const baseStyle: React.CSSProperties = {
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
        };

        switch (pattern) {
            case 'grid':
                return {
                    ...baseStyle,
                    backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
                    backgroundSize: '40px 40px',
                };
            case 'dots':
                return {
                    ...baseStyle,
                    backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)`,
                    backgroundSize: '24px 24px',
                };
            case 'lines':
                return {
                    ...baseStyle,
                    backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 39px,
            rgba(255,255,255,0.04) 39px,
            rgba(255,255,255,0.04) 40px
          )`,
                };
            default:
                return baseStyle;
        }
    };

    return (
        <div
            className="absolute inset-0 z-0 transition-colors duration-300"
            style={{ backgroundColor }}
        >
            {pattern !== 'none' && <div style={getPatternStyle()} />}

            {/* Subtle vignette effect for depth */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(ellipse at center, transparent 0%, ${backgroundColor}40 100%)`,
                }}
            />
        </div>
    );
};

export default BackgroundLayer;
