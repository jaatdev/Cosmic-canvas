/**
 * Canvas Constants
 * 
 * Fixed page dimensions for consistent geometry across fullscreen toggles.
 * PAGE_HEIGHT is set to A4 standard height at 96 DPI (1123px),
 * but we use 1080px for better screen compatibility.
 */

// Fixed page height - does NOT change with window size
// This prevents content from "jumping" when toggling fullscreen
export const PAGE_HEIGHT = 1080;

// Optional: A4 standard width at 96 DPI (for future fixed-width mode)
export const PAGE_WIDTH = 794;
