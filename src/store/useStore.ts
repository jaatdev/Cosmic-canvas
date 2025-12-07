import { create } from 'zustand';
import { Point, Stroke, Tool, Pattern, CanvasImage, ActionItem, ShapeType, TextNode } from '@/types';

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

    // Background
    canvasBackground: string;
    canvasPattern: Pattern;

    // Actions
    addStroke: (stroke: Omit<Stroke, 'id' | 'isEraser'>, forceEraser?: boolean, isShape?: boolean) => void;
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
    setCurrentPage: (page: number) => void;
    insertPageAfter: (pageIndex: number) => void;
    deletePage: (pageIndex: number) => void;
    clearPage: (pageIndex: number) => void;
    setPageHeight: (height: number) => void;
    setZoom: (zoom: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
    setIsFullscreen: (value: boolean) => void;
    setPenColor: (color: string) => void;
    setPenWidth: (width: number) => void;
    setEraserWidth: (width: number) => void;
    setShape: (shape: ShapeType) => void;
    setFont: (font: string) => void;
    setFontSize: (size: number) => void;
    setFontWeight: (weight: 'normal' | 'bold') => void;
    setFontStyle: (style: 'normal' | 'italic') => void;
    setTextBackground: (color: string) => void;
    setCanvasBackground: (color: string) => void;
    setCanvasPattern: (pattern: Pattern) => void;
    clearCanvas: () => void;

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

    // Add stroke with unified history
    addStroke: (strokeData, forceEraser, isShape) => {
        const state = get();
        // Use forceEraser if provided (for barrel button), otherwise check current tool
        const isEraser = forceEraser !== undefined ? forceEraser : state.currentTool === 'eraser';

        const stroke: Stroke = {
            id: generateId(),
            ...strokeData,
            size: isEraser ? state.eraserWidth : state.penWidth,
            color: isEraser ? '#000000' : state.penColor,
            isEraser,
            isShape: isShape || false,  // Preserve shape flag for proper rendering
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

    // Set page height (called once on mount)
    setPageHeight: (height) => set({ pageHeight: height }),

    // Zoom controls (10% to 500%)
    setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5.0, zoom)) }),
    zoomIn: () => set((state) => ({ zoom: Math.min(5.0, Math.round((state.zoom + 0.1) * 10) / 10) })),
    zoomOut: () => set((state) => ({ zoom: Math.max(0.1, Math.round((state.zoom - 0.1) * 10) / 10) })),
    resetZoom: () => set({ zoom: 1 }),

    // Fullscreen / Zen Mode
    setIsFullscreen: (value) => set({ isFullscreen: value }),

    // Pen settings
    setPenColor: (color) => set({ penColor: color }),
    setPenWidth: (width) => set({ penWidth: Math.max(1, Math.min(50, width)) }),

    // Eraser settings
    setEraserWidth: (width) => set({ eraserWidth: Math.max(5, Math.min(100, width)) }),

    // Shape tool - sets active shape and switches to shape tool
    setShape: (shape) => set({ activeShape: shape, currentTool: 'shape' }),

    // Text tool settings
    setFont: (font) => set({ activeFont: font }),
    setFontSize: (size) => set({ activeFontSize: Math.max(12, Math.min(72, size)) }),
    setFontWeight: (weight) => set({ activeFontWeight: weight }),
    setFontStyle: (style) => set({ activeFontStyle: style }),
    setTextBackground: (color) => set({ activeTextBackground: color }),

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

    // Computed helpers
    canUndo: () => get().historyStack.length > 0,
    canRedo: () => get().redoStack.length > 0,
    getTotalHeight: () => get().pageCount * get().pageHeight,
}));

export default useStore;

