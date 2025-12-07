'use client';

import { useStore, TextNode } from '@/store/useStore';
import { useState, useCallback, useRef, useEffect } from 'react';

interface TextLayerProps {
    totalHeight?: number;
}

// Generate unique ID
const generateId = () => `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * TextLayer Component - Editable Text Annotations
 * 
 * Handles text node creation, editing, and selection.
 */
export default function TextLayer({ totalHeight }: TextLayerProps) {
    const {
        textNodes,
        currentTool,
        selectedId,
        activeFont,
        activeFontSize,
        penColor,
        addTextNode,
        updateTextNode,
        deleteTextNode,
        zoom,
    } = useStore();

    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [dragState, setDragState] = useState<{
        active: boolean;
        nodeId: string | null;
        startX: number;
        startY: number;
        startNodeX: number;
        startNodeY: number;
    }>({
        active: false,
        nodeId: null,
        startX: 0,
        startY: 0,
        startNodeX: 0,
        startNodeY: 0,
    });

    const containerRef = useRef<HTMLDivElement>(null);

    const isTextMode = currentTool === 'text';
    const isSelectMode = currentTool === 'select';

    // Handle click on canvas to create new text node
    const handleCanvasClick = useCallback((e: React.MouseEvent) => {
        if (!isTextMode) return;

        // Use pageX/pageY for scroll-aware positioning
        const x = e.pageX / zoom;
        const y = e.pageY / zoom;

        const newNode: TextNode = {
            id: generateId(),
            x,
            y,
            content: '',
            fontSize: activeFontSize,
            color: penColor,
            fontFamily: activeFont,
        };

        addTextNode(newNode);
        setEditingNodeId(newNode.id);
    }, [isTextMode, zoom, activeFontSize, penColor, activeFont, addTextNode]);

    // Handle start dragging
    const handleDragStart = useCallback((e: React.MouseEvent, node: TextNode) => {
        if (!isSelectMode || selectedId !== node.id) return;

        e.stopPropagation();

        setDragState({
            active: true,
            nodeId: node.id,
            startX: e.clientX,
            startY: e.clientY,
            startNodeX: node.x,
            startNodeY: node.y,
        });
    }, [isSelectMode, selectedId]);

    // Handle dragging
    const handleDrag = useCallback((e: React.MouseEvent) => {
        if (!dragState.active || !dragState.nodeId) return;

        const deltaX = e.clientX - dragState.startX;
        const deltaY = e.clientY - dragState.startY;

        updateTextNode(dragState.nodeId, {
            x: dragState.startNodeX + deltaX / zoom,
            y: dragState.startNodeY + deltaY / zoom,
        });
    }, [dragState, updateTextNode, zoom]);

    // Handle drag end
    const handleDragEnd = useCallback(() => {
        if (dragState.active) {
            setDragState({
                active: false,
                nodeId: null,
                startX: 0,
                startY: 0,
                startNodeX: 0,
                startNodeY: 0,
            });
        }
    }, [dragState.active]);

    // Handle double click to edit
    const handleDoubleClick = useCallback((e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        setEditingNodeId(nodeId);
    }, []);

    // Handle text change
    const handleTextChange = useCallback((nodeId: string, newContent: string) => {
        updateTextNode(nodeId, { content: newContent });
    }, [updateTextNode]);

    // Handle blur (save or delete if empty)
    const handleBlur = useCallback((nodeId: string, content: string) => {
        setEditingNodeId(null);

        if (content.trim() === '') {
            // Delete empty text nodes
            deleteTextNode(nodeId);
        }
    }, [deleteTextNode]);

    // Keyboard listener for Delete/Backspace to delete selected text
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !editingNodeId) {
                const node = textNodes.find(n => n.id === selectedId);
                if (node) {
                    e.preventDefault();
                    deleteTextNode(selectedId);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, editingNodeId, textNodes, deleteTextNode]);

    if (textNodes.length === 0 && !isTextMode) return null;

    return (
        <div
            ref={containerRef}
            onClick={handleCanvasClick}
            onMouseMove={handleDrag}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: totalHeight || '100%',
                zIndex: 7,
                pointerEvents: isTextMode || isSelectMode ? 'auto' : 'none',
                cursor: isTextMode ? 'text' : 'default',
            }}
        >
            {textNodes.map((node) => {
                const isEditing = editingNodeId === node.id;
                const isSelected = selectedId === node.id && isSelectMode;

                return (
                    <div
                        key={node.id}
                        onMouseDown={(e) => !isEditing && handleDragStart(e, node)}
                        onDoubleClick={(e) => handleDoubleClick(e, node.id)}
                        style={{
                            position: 'absolute',
                            left: node.x,
                            top: node.y,
                            fontSize: node.fontSize,
                            color: node.color,
                            fontFamily: node.fontFamily,
                            cursor: isSelectMode ? (isSelected ? 'move' : 'pointer') : 'default',
                            userSelect: isEditing ? 'text' : 'none',
                            whiteSpace: 'pre-wrap',
                            minWidth: '20px',
                            minHeight: node.fontSize + 4,
                            border: isSelected && !isEditing ? '2px dashed #3b82f6' : '2px dashed transparent',
                            padding: '4px',
                            borderRadius: '4px',
                            pointerEvents: 'auto',
                        }}
                    >
                        {isEditing ? (
                            <input
                                type="text"
                                autoFocus
                                value={node.content}
                                onChange={(e) => handleTextChange(node.id, e.target.value)}
                                onBlur={() => handleBlur(node.id, node.content)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.currentTarget.blur();
                                    }
                                    // Prevent Delete/Backspace from triggering node deletion
                                    if (e.key === 'Delete' || e.key === 'Backspace') {
                                        e.stopPropagation();
                                    }
                                }}
                                style={{
                                    all: 'unset',
                                    fontSize: node.fontSize,
                                    color: node.color,
                                    fontFamily: node.fontFamily,
                                    width: '100%',
                                    background: 'transparent',
                                }}
                            />
                        ) : (
                            <span>{node.content || '\u00A0'}</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
