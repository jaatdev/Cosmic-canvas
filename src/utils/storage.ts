import { set, get, del } from 'idb-keyval';
import { Stroke, CanvasImage, TextNode } from '@/types';

const STORAGE_KEY = 'cosmic-canvas-project';

/**
 * Serializable project state for persistence
 * Note: We don't save historyStack/redoStack (too complex, fresh history on load)
 */
export interface PersistedState {
    strokes: Stroke[];
    images: CanvasImage[];
    textNodes: TextNode[];
    pageCount: number;
    projectName: string;
    canvasBackground: string;
    canvasPattern: string;
    penColor: string;
    penWidth: number;
    activeFont: string;
    activeFontSize: number;
}

/**
 * Save state to IndexedDB
 * Called by auto-save with debounce
 */
export const saveState = async (state: PersistedState): Promise<void> => {
    try {
        await set(STORAGE_KEY, state);
        console.log('[BlackBox] State saved to IndexedDB');
    } catch (error) {
        console.error('[BlackBox] Failed to save state:', error);
    }
};

/**
 * Load state from IndexedDB
 * Returns null if no saved state exists
 */
export const loadState = async (): Promise<PersistedState | null> => {
    try {
        const state = await get<PersistedState>(STORAGE_KEY);
        if (state) {
            console.log('[BlackBox] State loaded from IndexedDB');
            return state;
        }
        return null;
    } catch (error) {
        console.error('[BlackBox] Failed to load state:', error);
        return null;
    }
};

/**
 * Clear saved state from IndexedDB
 * Used when starting a new project
 */
export const clearState = async (): Promise<void> => {
    try {
        await del(STORAGE_KEY);
        console.log('[BlackBox] State cleared from IndexedDB');
    } catch (error) {
        console.error('[BlackBox] Failed to clear state:', error);
    }
};
