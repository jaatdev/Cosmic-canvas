import { create } from 'zustand';
import { Point, Stroke, Tool, Pattern, CanvasImage, ActionItem, ShapeType, TextNode } from '@/types';
import { PAGE_WIDTH } from '@/constants/canvas';
import { loadState, saveState, clearState, PersistedState } from '@/utils/storage';

// Re-export types for convenience
export type { Point, Stroke, Tool, Pattern, CanvasImage, ActionItem, ShapeType, TextNode };

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Store state
interface CanvasState {
    strokes: Stroke[];
    images: CanvasImage[];
    historyStack: ActionItem[];
    redoStack: ActionItem[];
    currentTool: Tool;
    selectedImageId: string | null;
    projectName: string;
    pageCount: number;
    currentPage: number;
    pageHeight: number;
    zoom: number;
    isFullscreen: boolean;

    // Separate widths for pen and eraser
    penColor: string;
    penWidth: number;
    eraserWidth: number;

    // Highlighter tool
    highlighterColor: string;
    highlighterWidth: number;

    // Shape tool
    activeShape: ShapeType;

    // Text tool
    textNodes: TextNode[];
    activeFont: string;
    activeFontSize: number;
    activeFontWeight: 'normal' | 'bold';
    activeFontStyle: 'normal' | 'italic';
    activeTextBackground: string;
    selectedId: string | null; // Unified selection for images and text

    // Lasso selection
    selectedStrokeIds: string[];
    selectedTextIds: string[];

    // Background
    canvasBackground: string;
    canvasPattern: Pattern;

    // PDF Viewer
    pdfFile: File | null;
    pdfPageMapping: number[];  // Maps canvas page index to PDF page number
    canvasDimensions: { width: number; height: number };  // Dynamic canvas size

    // Actions
    addStroke: (stroke: Omit<Stroke, 'id' | 'isEraser'>, forceEraser?: boolean, isShape?: boolean, isHighlighter?: boolean) => void;
    addImage: (image: CanvasImage) => void;
    selectImage: (id: string | null) => void;
    updateImage: (id: string, updates: Partial<CanvasImage>) => void;
    deleteSelectedImage: () => void;
    addTextNode: (node: TextNode) => void;
    updateTextNode: (id: string, updates: Partial<TextNode>) => void;
    deleteTextNode: (id: string) => void;
    deleteSelectedObject: () => void;
    undo: () => void;
    redo: () => void;
    setTool: (tool: Tool) => void;
    setProjectName: (name: string) => void;
    addPage: () => void;
    setPageCount: (count: number) => void;
    setCurrentPage: (page: number) => void;
    insertPageAfter: (pageIndex: number) => void;
    deletePage: (pageIndex: number) => void;
    clearPage: (pageIndex: number) => void;
    setPageHeight: (height: number) => void;
    setZoom: (zoom: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
    fitToScreen: () => void;
    setIsFullscreen: (value: boolean) => void;
    setPenColor: (color: string) => void;
    setPenWidth: (width: number) => void;
    setEraserWidth: (width: number) => void;
    setHighlighterColor: (color: string) => void;
    setHighlighterWidth: (width: number) => void;
    setShape: (shape: ShapeType) => void;
    setFont: (font: string) => void;
    setFontSize: (size: number) => void;
    setFontWeight: (weight: 'normal' | 'bold') => void;
    setFontStyle: (style: 'normal' | 'italic') => void;
    setTextBackground: (color: string) => void;
    selectStrokes: (ids: string[]) => void;
    selectText: (ids: string[]) => void;
    clearSelection: () => void;
    transformStrokes: (dx: number, dy: number, scaleX?: number, scaleY?: number, origin?: { x: number; y: number }) => void;
    scaleSelectedStrokes: (factor: number) => void;
    duplicateSelectedStrokes: () => void;
    deleteSelectedStrokes: () => void;
    clearStrokeSelection: () => void;
    setCanvasBackground: (color: string) => void;
    setCanvasPattern: (pattern: Pattern) => void;
    clearCanvas: () => void;

    // Persistence
    loadProject: () => Promise<void>;
    resetProject: () => Promise<void>;
    getPersistedState: () => PersistedState;

    // PDF Viewer
    setPdfFile: (file: File | null) => void;
    movePdfPage: (fromIndex: number, toIndex: number) => void;
    setCanvasDimensions: (width: number, height: number) => void;

    // Computed helpers
    canUndo: () => boolean;
    canRedo: () => boolean;
    getTotalHeight: () => number;
}

export const useStore = create<CanvasState>((set, get) => ({
    // Initial state
    strokes: [],
    images: [],
    historyStack: [],
    redoStack: [],
    currentTool: 'pen',
    selectedImageId: null,
    projectName: 'Untitled Universe',
    pageCount: 1,
    currentPage: 1,
    pageHeight: 0,
    zoom: 1,
    isFullscreen: false,

    // Separate widths - Dark Slate Aesthetic
    penColor: '#d7d5d5',     // Light Grey (silver ink)
    penWidth: 3,             // Finer control
    eraserWidth: 20,

    // Highlighter tool - Neon Yellow default
    highlighterColor: '#ffff00',
    highlighterWidth: 20,

    // Shape tool - default to rectangle
    activeShape: 'rectangle',

    // Background - Dark Slate
    canvasBackground: '#3e3d3d',  // Dark Grey
    canvasPattern: 'none',

    // Text tool - defaults
    textNodes: [],
    activeFont: 'Inter',
    activeFontSize: 24,
    activeFontWeight: 'normal',
    activeFontStyle: 'normal',
    activeTextBackground: 'transparent',
    selectedId: null,

    // Lasso selection - empty by default
    selectedStrokeIds: [],
    selectedTextIds: [],

    // PDF Viewer
    pdfFile: null,
    pdfPageMapping: [],  // Will be populated when PDF loads
    canvasDimensions: { width: 794, height: 1123 },  // Default A4

    // Add stroke with unified history
    addStroke: (strokeData, forceEraser, isShape, isHighlighter) => {
        const state = get();
        // Use forceEraser if provided (for barrel button), otherwise check current tool
        const isEraser = forceEraser !== undefined ? forceEraser : state.currentTool === 'eraser';
        // Use isHighlighter if provided, otherwise check current tool
        const highlighter = isHighlighter !== undefined ? isHighlighter : state.currentTool === 'highlighter';

        // Determine size and color based on tool type
        let size = strokeData.size;
        let color = strokeData.color;

        if (isEraser) {
            size = state.eraserWidth;
            color = '#000000';
        } else if (highlighter) {
            size = state.highlighterWidth;
            color = state.highlighterColor;
        }

        const stroke: Stroke = {
            id: generateId(),
            ...strokeData,
            size,
            color,
            isEraser,
            isShape: isShape || false,
            isHighlighter: highlighter,
        };

        set({
            strokes: [...state.strokes, stroke],
            historyStack: [...state.historyStack, { type: 'stroke', data: stroke }],
            redoStack: [],
        });
    },

    // Add image with unified history + auto-select
    addImage: (image) => {
        const state = get();
        set({
            images: [...state.images, image],
            historyStack: [...state.historyStack, { type: 'image', data: image }],
            redoStack: [],
            currentTool: 'select',
            selectedImageId: image.id,
        });
    },

    // Select/deselect image
    selectImage: (id) => {
        set({ selectedImageId: id });
    },

    // Update image properties
    updateImage: (id, updates) => {
        set((state) => ({
            images: state.images.map((img) =>
                img.id === id ? { ...img, ...updates } : img
            ),
        }));
    },

    // Delete selected image (with undo support)
    deleteSelectedImage: () => {
        const state = get();
        if (!state.selectedImageId) return;

        const imageToDelete = state.images.find(img => img.id === state.selectedImageId);
        if (!imageToDelete) return;

        set({
            images: state.images.filter(img => img.id !== state.selectedImageId),
            historyStack: [...state.historyStack, { type: 'image', data: { ...imageToDelete, _deleted: true } as CanvasImage }],
            redoStack: [],
            selectedImageId: null,
            currentTool: 'select',  // Keep user in select mode
        });
    },

    // Add text node with unified history + auto-select
    addTextNode: (node) => {
        const state = get();
        set({
            textNodes: [...state.textNodes, node],
            historyStack: [...state.historyStack, { type: 'text', data: node }],
            redoStack: [],
            currentTool: 'select',
            selectedId: node.id,
        });
    },

    // Update text node properties
    updateTextNode: (id, updates) => {
        set((state) => ({
            textNodes: state.textNodes.map((node) =>
                node.id === id ? { ...node, ...updates } : node
            ),
        }));
    },

    // Delete text node (with undo support)
    deleteTextNode: (id) => {
        const state = get();
        const nodeToDelete = state.textNodes.find(node => node.id === id);
        if (!nodeToDelete) return;

        set({
            textNodes: state.textNodes.filter(node => node.id !== id),
            historyStack: [...state.historyStack, { type: 'text', data: { ...nodeToDelete, _deleted: true } as any }],
            redoStack: [],
            selectedId: state.selectedId === id ? null : state.selectedId,
        });
    },

    // Unified delete for both images and text
    deleteSelectedObject: () => {
        const state = get();
        if (!state.selectedId) return;

        // Check if it's an image
        const image = state.images.find(img => img.id === state.selectedId);
        if (image) {
            set({
                images: state.images.filter(img => img.id !== state.selectedId),
                historyStack: [...state.historyStack, { type: 'image', data: { ...image, _deleted: true } as CanvasImage }],
                redoStack: [],
                selectedId: null,
                currentTool: 'select',
            });
            return;
        }

        // Check if it's a text node
        const textNode = state.textNodes.find(node => node.id === state.selectedId);
        if (textNode) {
            set({
                textNodes: state.textNodes.filter(node => node.id !== state.selectedId),
                historyStack: [...state.historyStack, { type: 'text', data: { ...textNode, _deleted: true } as any }],
                redoStack: [],
                selectedId: null,
                currentTool: 'select',
            });
        }
    },

    // Unified undo
    undo: () => {
        const state = get();
        if (state.historyStack.length === 0) return;

        const lastAction = state.historyStack[state.historyStack.length - 1];
        const newHistoryStack = state.historyStack.slice(0, -1);

        if (lastAction.type === 'stroke') {
            set({
                strokes: state.strokes.filter(s => s.id !== lastAction.data.id),
                historyStack: newHistoryStack,
                redoStack: [...state.redoStack, lastAction],
            });
        } else if (lastAction.type === 'image') {
            const imageData = lastAction.data as CanvasImage & { _deleted?: boolean };

            if (imageData._deleted) {
                // Undoing a deletion - restore the image
                const { _deleted, ...cleanImage } = imageData;
                set({
                    images: [...state.images, cleanImage as CanvasImage],
                    historyStack: newHistoryStack,
                    redoStack: [...state.redoStack, lastAction],
                    selectedImageId: cleanImage.id,  // Select the restored image
                });
            } else {
                // Undoing an add - remove the image
                set({
                    images: state.images.filter(i => i.id !== lastAction.data.id),
                    historyStack: newHistoryStack,
                    redoStack: [...state.redoStack, lastAction],
                    selectedImageId: state.selectedImageId === lastAction.data.id ? null : state.selectedImageId,
                });
            }
        } else if (lastAction.type === 'text') {
            const textData = lastAction.data as TextNode & { _deleted?: boolean };

            if (textData._deleted) {
                // Undoing a deletion - restore the text node
                const { _deleted, ...cleanNode } = textData;
                set({
                    textNodes: [...state.textNodes, cleanNode as TextNode],
                    historyStack: newHistoryStack,
                    redoStack: [...state.redoStack, lastAction],
                    selectedId: cleanNode.id,  // Select the restored node
                });
            } else {
                // Undoing an add - remove the text node
                set({
                    textNodes: state.textNodes.filter(n => n.id !== lastAction.data.id),
                    historyStack: newHistoryStack,
                    redoStack: [...state.redoStack, lastAction],
                    selectedId: state.selectedId === lastAction.data.id ? null : state.selectedId,
                });
            }
        } else if (lastAction.type === 'page_op') {
            const { operation, pageIndex, deletedStrokes, deletedImages } = lastAction as any; // Cast needed if TS doesn't infer

            if (operation === 'insert') {
                // Undo insert = Delete the page at index (without pushing to history)
                // We need to shift everything UP from below the pageIndex
                const topThreshold = pageIndex * state.pageHeight;
                const bottomThreshold = (pageIndex + 1) * state.pageHeight;

                // Since it was an insert, there shouldn't be content *on* the page unless user drew on it
                // But for "undo", we assume we revert to exact state. 
                // Any content user added to the new page will be lost (or we should shift it? No, undo should strictly reverse).
                // Actually, if we undo the insert, we merge the content below back up.

                // Simplified Undo Insert: Delete the page and shift up, discard any content on it.

                const newStrokes = state.strokes
                    .filter(s => !(s.points[0].y >= topThreshold && s.points[0].y < bottomThreshold))
                    .map(s => {
                        if (s.points[0].y >= bottomThreshold) {
                            return { ...s, points: s.points.map(p => ({ ...p, y: p.y - state.pageHeight })) };
                        }
                        return s;
                    });

                const newImages = state.images
                    .filter(img => !(img.y >= topThreshold && img.y < bottomThreshold))
                    .map(img => {
                        if (img.y >= bottomThreshold) {
                            return { ...img, y: img.y - state.pageHeight };
                        }
                        return img;
                    });

                set({
                    pageCount: state.pageCount - 1,
                    strokes: newStrokes,
                    images: newImages,
                    historyStack: newHistoryStack,
                    redoStack: [...state.redoStack, lastAction]
                });

            } else if (operation === 'delete') {
                // Undo delete = Insert page at index and restore content
                const insertThreshold = pageIndex * state.pageHeight; // The top of the deleted page

                // 1. Shift existing content DOWN to make room
                // existing content at >= insertThreshold needs to move +PAGE_HEIGHT
                const shiftedStrokes = state.strokes.map(s => {
                    if (s.points[0].y >= insertThreshold) {
                        return { ...s, points: s.points.map(p => ({ ...p, y: p.y + state.pageHeight })) };
                    }
                    return s;
                });

                const shiftedImages = state.images.map(img => {
                    if (img.y >= insertThreshold) {
                        return { ...img, y: img.y + state.pageHeight };
                    }
                    return img;
                });

                // 2. Restore deleted content
                // deleted content coordinates are already relative to the page's original position 
                // (which is now restored). So we just add them back.

                set({
                    pageCount: state.pageCount + 1,
                    strokes: [...shiftedStrokes, ...(deletedStrokes || [])],
                    images: [...shiftedImages, ...(deletedImages || [])],
                    historyStack: newHistoryStack,
                    redoStack: [...state.redoStack, lastAction]
                });
            }
        }
    },

    // Unified redo
    redo: () => {
        const state = get();
        if (state.redoStack.length === 0) return;

        const actionToRedo = state.redoStack[state.redoStack.length - 1];
        const newRedoStack = state.redoStack.slice(0, -1);

        if (actionToRedo.type === 'stroke') {
            set({
                strokes: [...state.strokes, actionToRedo.data],
                historyStack: [...state.historyStack, actionToRedo],
                redoStack: newRedoStack,
            });
        } else if (actionToRedo.type === 'image') {
            const imageData = actionToRedo.data as CanvasImage & { _deleted?: boolean };

            if (imageData._deleted) {
                // Redoing a deletion - remove the image again
                set({
                    images: state.images.filter(i => i.id !== imageData.id),
                    historyStack: [...state.historyStack, actionToRedo],
                    redoStack: newRedoStack,
                    selectedImageId: state.selectedImageId === imageData.id ? null : state.selectedImageId,
                });
            } else {
                // Redoing an add - add the image back
                set({
                    images: [...state.images, actionToRedo.data],
                    historyStack: [...state.historyStack, actionToRedo],
                    redoStack: newRedoStack,
                });
            }
        } else if (actionToRedo.type === 'text') {
            const textData = actionToRedo.data as TextNode & { _deleted?: boolean };

            if (textData._deleted) {
                // Redoing a deletion - remove the text node again
                set({
                    textNodes: state.textNodes.filter(n => n.id !== textData.id),
                    historyStack: [...state.historyStack, actionToRedo],
                    redoStack: newRedoStack,
                    selectedId: state.selectedId === textData.id ? null : state.selectedId,
                });
            } else {
                // Redoing an add - add the text node back
                set({
                    textNodes: [...state.textNodes, actionToRedo.data],
                    historyStack: [...state.historyStack, actionToRedo],
                    redoStack: newRedoStack,
                });
            }
        } else if (actionToRedo.type === 'page_op') {
            // Redo is same as doing the action again
            const { operation, pageIndex } = actionToRedo as any;

            if (operation === 'insert') {
                // Redo insert: Call logic similar to insertPageAfter but specific to this action
                // Reuse insertPageAfter logic but without pushing to history (since we handle stacks manually here)
                // OR just call insertPageAfter but we need to manage stacks.
                // Better to duplicate logic for purity.

                const insertThreshold = pageIndex * state.pageHeight; // Note: pageIndex in op is the *new* index
                // Wait, insertPageAfter(i) creates page at i+1. 
                // If op.pageIndex is the resulting index, then we shift from there.
                // Let's assume op.pageIndex is the index of the inserted page.

                const shiftThreshold = actionToRedo.pageIndex * state.pageHeight; // This is the TOP of the inserted page

                const newStrokes = state.strokes.map(s => {
                    if (s.points[0].y >= shiftThreshold) {
                        return { ...s, points: s.points.map(p => ({ ...p, y: p.y + state.pageHeight })) };
                    }
                    return s;
                });

                const newImages = state.images.map(img => {
                    if (img.y >= shiftThreshold) {
                        return { ...img, y: img.y + state.pageHeight };
                    }
                    return img;
                });

                set({
                    pageCount: state.pageCount + 1,
                    strokes: newStrokes,
                    images: newImages,
                    historyStack: [...state.historyStack, actionToRedo],
                    redoStack: newRedoStack
                });

            } else if (operation === 'delete') {
                // Redo delete: Delete page at index
                const topThreshold = pageIndex * state.pageHeight;
                const bottomThreshold = (pageIndex + 1) * state.pageHeight;

                const newStrokes = state.strokes
                    .filter(s => !(s.points[0].y >= topThreshold && s.points[0].y < bottomThreshold))
                    .map(s => {
                        if (s.points[0].y >= bottomThreshold) {
                            return { ...s, points: s.points.map(p => ({ ...p, y: p.y - state.pageHeight })) };
                        }
                        return s;
                    });

                const newImages = state.images
                    .filter(img => !(img.y >= topThreshold && img.y < bottomThreshold))
                    .map(img => {
                        if (img.y >= bottomThreshold) {
                            return { ...img, y: img.y - state.pageHeight };
                        }
                        return img;
                    });

                set({
                    pageCount: state.pageCount - 1,
                    strokes: newStrokes,
                    images: newImages,
                    historyStack: [...state.historyStack, actionToRedo],
                    redoStack: newRedoStack
                });
            }
        }
    },

    // Set current page (tracked by scroll)
    setCurrentPage: (page) => set({ currentPage: page }),

    // Insert a blank page after the specified page index
    insertPageAfter: (pageIndex) => {
        const state = get();
        const insertThreshold = (pageIndex + 1) * state.pageHeight;

        // Shift strokes
        const newStrokes = state.strokes.map(stroke => {
            // Check if stroke starts below the threshold
            if (stroke.points[0].y > insertThreshold) {
                return {
                    ...stroke,
                    points: stroke.points.map(p => ({ ...p, y: p.y + state.pageHeight }))
                };
            }
            return stroke;
        });

        // Shift images
        const newImages = state.images.map(img => {
            if (img.y > insertThreshold) {
                return { ...img, y: img.y + state.pageHeight };
            }
            return img;
        });

        set({
            pageCount: state.pageCount + 1,
            strokes: newStrokes,
            images: newImages,
            historyStack: [
                ...state.historyStack,
                {
                    type: 'page_op',
                    operation: 'insert',
                    pageIndex: pageIndex + 1
                }
            ],
            redoStack: []
        });
    },

    // Delete a specific page and shift content up
    deletePage: (pageIndex) => {
        const state = get();
        if (state.pageCount <= 1) return; // Prevent deleting the last page

        const topThreshold = pageIndex * state.pageHeight;
        const bottomThreshold = (pageIndex + 1) * state.pageHeight;

        // Find content to delete (centrally located or starting within page)
        const strokesToDelete = state.strokes.filter(s =>
            s.points[0].y >= topThreshold && s.points[0].y < bottomThreshold
        );

        const imagesToDelete = state.images.filter(img =>
            img.y >= topThreshold && img.y < bottomThreshold
        );

        // Filter and shift remaining content
        const newStrokes = state.strokes
            .filter(s => !(s.points[0].y >= topThreshold && s.points[0].y < bottomThreshold))
            .map(s => {
                if (s.points[0].y >= bottomThreshold) {
                    return {
                        ...s,
                        points: s.points.map(p => ({ ...p, y: p.y - state.pageHeight }))
                    };
                }
                return s;
            });

        const newImages = state.images
            .filter(img => !(img.y >= topThreshold && img.y < bottomThreshold))
            .map(img => {
                if (img.y >= bottomThreshold) {
                    return { ...img, y: img.y - state.pageHeight };
                }
                return img;
            });

        set({
            pageCount: state.pageCount - 1,
            strokes: newStrokes,
            images: newImages,
            historyStack: [
                ...state.historyStack,
                {
                    type: 'page_op',
                    operation: 'delete',
                    pageIndex,
                    deletedStrokes: strokesToDelete,
                    deletedImages: imagesToDelete
                }
            ],
            redoStack: []
        });
    },

    // Clear content on a specific page without deleting the page itself
    clearPage: (pageIndex) => {
        const state = get();
        const topThreshold = pageIndex * state.pageHeight;
        const bottomThreshold = (pageIndex + 1) * state.pageHeight;

        const newStrokes = state.strokes.filter(s =>
            !(s.points[0].y >= topThreshold && s.points[0].y < bottomThreshold)
        );

        const newImages = state.images.filter(img =>
            !(img.y >= topThreshold && img.y < bottomThreshold)
        );

        // Note: We're not adding this to history yet for simplicity, 
        // effectively making it "clear canvas" but for just one page. 
        // To support undo, we'd need a 'clear_page' op or generic batch delete.
        set({ strokes: newStrokes, images: newImages });
    },

    // Set current tool
    setTool: (tool) => {
        set({
            currentTool: tool,
            selectedImageId: tool !== 'select' ? null : get().selectedImageId,
        });
    },

    // Set project name
    setProjectName: (name) => set({ projectName: name }),

    // Add a new page
    addPage: () => {
        set((state) => ({ pageCount: state.pageCount + 1 }));
    },

    // Set page count directly (used for PDF import)
    // Also initializes the PDF page mapping to [1, 2, 3, ..., count]
    setPageCount: (count) => {
        const validCount = Math.max(1, count);
        set({
            pageCount: validCount,
            pdfPageMapping: Array.from({ length: validCount }, (_, i) => i + 1),
        });
    },

    // Set page height (called once on mount)
    setPageHeight: (height) => set({ pageHeight: height }),

    // Zoom controls (10% to 500%)
    setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5.0, zoom)) }),
    zoomIn: () => set((state) => ({ zoom: Math.min(5.0, Math.round((state.zoom + 0.1) * 10) / 10) })),
    zoomOut: () => set((state) => ({ zoom: Math.max(0.1, Math.round((state.zoom - 0.1) * 10) / 10) })),
    resetZoom: () => set({ zoom: 1 }),
    fitToScreen: () => {
        // Calculate zoom to fill screen width using dynamic canvas dimensions
        const { canvasDimensions } = get();
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        // Add 5% padding so PDF doesn't touch edges perfectly
        const newZoom = (screenWidth / canvasDimensions.width) * 0.95;
        set({ zoom: Math.max(0.1, Math.min(5.0, newZoom)) });
    },

    // Fullscreen / Zen Mode
    setIsFullscreen: (value) => set({ isFullscreen: value }),

    // Pen settings
    setPenColor: (color) => set({ penColor: color }),
    setPenWidth: (width) => set({ penWidth: Math.max(1, Math.min(50, width)) }),

    // Eraser settings
    setEraserWidth: (width) => set({ eraserWidth: Math.max(5, Math.min(100, width)) }),

    // Highlighter settings
    setHighlighterColor: (color) => set({ highlighterColor: color }),
    setHighlighterWidth: (width) => set({ highlighterWidth: Math.max(10, Math.min(50, width)) }),

    // Shape tool - sets active shape and switches to shape tool
    setShape: (shape) => set({ activeShape: shape, currentTool: 'shape' }),

    // Text tool settings
    setFont: (font) => set({ activeFont: font }),
    setFontSize: (size) => set({ activeFontSize: Math.max(12, Math.min(72, size)) }),
    setFontWeight: (weight) => set({ activeFontWeight: weight }),
    setFontStyle: (style) => set({ activeFontStyle: style }),
    setTextBackground: (color) => set({ activeTextBackground: color }),

    // Lasso selection actions
    selectStrokes: (ids) => set({ selectedStrokeIds: ids }),
    selectText: (ids) => set({ selectedTextIds: ids }),
    clearSelection: () => set({ selectedStrokeIds: [], selectedTextIds: [] }),

    transformStrokes: (dx, dy, scaleX = 1, scaleY = 1, origin) => {
        const state = get();
        const hasStrokes = state.selectedStrokeIds.length > 0;
        const hasText = state.selectedTextIds.length > 0;

        if (!hasStrokes && !hasText) return;

        // If scaling, we need an origin point (center of bbox)
        let center = origin;
        if ((scaleX !== 1 || scaleY !== 1) && !center) {
            // Calculate center from all selected items
            const selectedStrokes = state.strokes.filter(s => state.selectedStrokeIds.includes(s.id));
            const selectedTexts = state.textNodes.filter(t => state.selectedTextIds.includes(t.id));

            const strokePoints = selectedStrokes.flatMap(s => s.points);
            const strokeXs = strokePoints.map(p => p.x);
            const strokeYs = strokePoints.map(p => p.y);

            // Include text bounds
            const textXs = selectedTexts.flatMap(t => [t.x, t.x + t.content.length * t.fontSize * 0.6]);
            const textYs = selectedTexts.flatMap(t => [t.y, t.y + t.fontSize * 1.2]);

            const allXs = [...strokeXs, ...textXs];
            const allYs = [...strokeYs, ...textYs];

            if (allXs.length > 0 && allYs.length > 0) {
                center = {
                    x: (Math.min(...allXs) + Math.max(...allXs)) / 2,
                    y: (Math.min(...allYs) + Math.max(...allYs)) / 2,
                };
            }
        }

        const updates: Partial<CanvasState> = {};

        // Transform strokes
        if (hasStrokes) {
            updates.strokes = state.strokes.map(stroke =>
                state.selectedStrokeIds.includes(stroke.id)
                    ? {
                        ...stroke,
                        points: stroke.points.map(p => {
                            // First scale if needed
                            let newPoint = p;
                            if (scaleX !== 1 || scaleY !== 1) {
                                newPoint = {
                                    x: center!.x + (p.x - center!.x) * scaleX,
                                    y: center!.y + (p.y - center!.y) * scaleY,
                                    pressure: p.pressure,
                                };
                            }
                            // Then translate
                            return {
                                ...newPoint,
                                x: newPoint.x + dx,
                                y: newPoint.y + dy,
                            };
                        })
                    }
                    : stroke
            );
        }

        // Transform text nodes
        if (hasText) {
            updates.textNodes = state.textNodes.map(node =>
                state.selectedTextIds.includes(node.id)
                    ? {
                        ...node,
                        // Scale position relative to center
                        x: center ? center.x + (node.x - center.x) * scaleX + dx : node.x + dx,
                        y: center ? center.y + (node.y - center.y) * scaleY + dy : node.y + dy,
                        // Scale font size proportionally
                        fontSize: Math.max(8, Math.min(200, node.fontSize * scaleX)),
                    }
                    : node
            );
        }

        set(updates);
    },

    scaleSelectedStrokes: (factor) => {
        const state = get();
        const hasStrokes = state.selectedStrokeIds.length > 0;
        const hasText = state.selectedTextIds.length > 0;

        if (!hasStrokes && !hasText) return;

        // Calculate combined bounding box center
        const selectedStrokes = state.strokes.filter(s => state.selectedStrokeIds.includes(s.id));
        const selectedTexts = state.textNodes.filter(t => state.selectedTextIds.includes(t.id));

        const strokePoints = selectedStrokes.flatMap(s => s.points);
        const strokeXs = strokePoints.map(p => p.x);
        const strokeYs = strokePoints.map(p => p.y);
        const textXs = selectedTexts.flatMap(t => [t.x, t.x + t.content.length * t.fontSize * 0.6]);
        const textYs = selectedTexts.flatMap(t => [t.y, t.y + t.fontSize * 1.2]);

        const allXs = [...strokeXs, ...textXs];
        const allYs = [...strokeYs, ...textYs];

        if (allXs.length === 0 || allYs.length === 0) return;

        const center = {
            x: (Math.min(...allXs) + Math.max(...allXs)) / 2,
            y: (Math.min(...allYs) + Math.max(...allYs)) / 2,
        };

        const updates: Partial<CanvasState> = {};

        // Scale strokes
        if (hasStrokes) {
            updates.strokes = state.strokes.map(stroke =>
                state.selectedStrokeIds.includes(stroke.id)
                    ? {
                        ...stroke,
                        points: stroke.points.map(p => ({
                            x: center.x + (p.x - center.x) * factor,
                            y: center.y + (p.y - center.y) * factor,
                            pressure: p.pressure,
                        }))
                    }
                    : stroke
            );
        }

        // Scale text nodes
        if (hasText) {
            updates.textNodes = state.textNodes.map(node =>
                state.selectedTextIds.includes(node.id)
                    ? {
                        ...node,
                        x: center.x + (node.x - center.x) * factor,
                        y: center.y + (node.y - center.y) * factor,
                        fontSize: Math.max(8, Math.min(200, node.fontSize * factor)),
                    }
                    : node
            );
        }

        set(updates);
    },

    duplicateSelectedStrokes: () => {
        const state = get();
        if (state.selectedStrokeIds.length === 0) return;

        const selectedStrokes = state.strokes.filter(s => state.selectedStrokeIds.includes(s.id));
        const duplicates = selectedStrokes.map(stroke => ({
            ...stroke,
            id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            points: stroke.points.map(p => ({
                ...p,
                x: p.x + 20,
                y: p.y + 20,
            }))
        }));

        set({
            strokes: [...state.strokes, ...duplicates],
            selectedStrokeIds: duplicates.map(d => d.id),
        });
    },

    deleteSelectedStrokes: () => {
        const state = get();
        const hasStrokes = state.selectedStrokeIds.length > 0;
        const hasText = state.selectedTextIds.length > 0;

        if (!hasStrokes && !hasText) return;

        set({
            strokes: state.strokes.filter(s => !state.selectedStrokeIds.includes(s.id)),
            textNodes: state.textNodes.filter(t => !state.selectedTextIds.includes(t.id)),
            selectedStrokeIds: [],
            selectedTextIds: [],
        });
    },

    clearStrokeSelection: () => set({ selectedStrokeIds: [] }),

    // Background settings
    setCanvasBackground: (color) => set({ canvasBackground: color }),
    setCanvasPattern: (pattern) => set({ canvasPattern: pattern }),

    // Clear everything
    clearCanvas: () => set({
        strokes: [],
        images: [],
        historyStack: [],
        redoStack: [],
        selectedImageId: null,
        pageCount: 1, // Reset to single page
    }),

    // Persistence actions
    loadProject: async () => {
        const savedState = await loadState();
        if (savedState) {
            set({
                strokes: savedState.strokes || [],
                images: savedState.images || [],
                textNodes: savedState.textNodes || [],
                pageCount: savedState.pageCount || 1,
                projectName: savedState.projectName || 'Untitled Universe',
                canvasBackground: savedState.canvasBackground || '#3e3d3d',
                canvasPattern: (savedState.canvasPattern as Pattern) || 'none',
                penColor: savedState.penColor || '#d7d5d5',
                penWidth: savedState.penWidth || 3,
                activeFont: savedState.activeFont || 'Inter',
                activeFontSize: savedState.activeFontSize || 24,
                // Clear history on load (fresh start)
                historyStack: [],
                redoStack: [],
            });
        }
    },

    resetProject: async () => {
        await clearState();
        set({
            strokes: [],
            images: [],
            textNodes: [],
            historyStack: [],
            redoStack: [],
            selectedImageId: null,
            selectedId: null,
            selectedStrokeIds: [],
            pageCount: 1,
            currentPage: 1,
            projectName: 'Untitled Universe',
            canvasBackground: '#3e3d3d',
            canvasPattern: 'none',
            penColor: '#d7d5d5',
            penWidth: 3,
            activeFont: 'Inter',
            activeFontSize: 24,
        });
    },

    getPersistedState: () => {
        const state = get();
        return {
            strokes: state.strokes,
            images: state.images,
            textNodes: state.textNodes,
            pageCount: state.pageCount,
            projectName: state.projectName,
            canvasBackground: state.canvasBackground,
            canvasPattern: state.canvasPattern,
            penColor: state.penColor,
            penWidth: state.penWidth,
            activeFont: state.activeFont,
            activeFontSize: state.activeFontSize,
        };
    },

    // PDF Viewer
    setPdfFile: (file) => set({ pdfFile: file }),

    // Move PDF page (reorder mapping without moving ink)
    movePdfPage: (fromIndex, toIndex) => {
        const state = get();
        const mapping = [...state.pdfPageMapping];

        if (fromIndex < 0 || fromIndex >= mapping.length) return;
        if (toIndex < 0 || toIndex >= mapping.length) return;

        // Remove from old position and insert at new position
        const [movedPage] = mapping.splice(fromIndex, 1);
        mapping.splice(toIndex, 0, movedPage);

        set({ pdfPageMapping: mapping });
    },

    // Set canvas dimensions (used when PDF loads)
    setCanvasDimensions: (width, height) => set({
        canvasDimensions: { width, height }
    }),

    // Computed helpers
    canUndo: () => get().historyStack.length > 0,
    canRedo: () => get().redoStack.length > 0,
    getTotalHeight: () => get().pageCount * get().pageHeight,
}));

export default useStore;

