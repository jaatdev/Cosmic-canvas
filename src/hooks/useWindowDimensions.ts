'use client';

import { useState, useEffect, useCallback } from 'react';

interface WindowDimensions {
    width: number;
    height: number;
    pixelRatio: number;
}

/**
 * Hook to get window dimensions with debounced resize handling.
 * Returns width, height, and devicePixelRatio for High-DPI canvas scaling.
 */
export function useWindowDimensions(debounceMs: number = 100): WindowDimensions {
    const [dimensions, setDimensions] = useState<WindowDimensions>({
        width: 0,
        height: 0,
        pixelRatio: 1,
    });

    const updateDimensions = useCallback(() => {
        setDimensions({
            width: window.innerWidth,
            height: window.innerHeight,
            pixelRatio: window.devicePixelRatio || 1,
        });
    }, []);

    useEffect(() => {
        // Initial dimensions on mount
        updateDimensions();

        // Debounced resize handler
        let timeoutId: NodeJS.Timeout;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(updateDimensions, debounceMs);
        };

        window.addEventListener('resize', handleResize);

        // Also listen for devicePixelRatio changes (zoom, display switch)
        const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
        mediaQuery.addEventListener('change', updateDimensions);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', handleResize);
            mediaQuery.removeEventListener('change', updateDimensions);
        };
    }, [debounceMs, updateDimensions]);

    return dimensions;
}

export default useWindowDimensions;
