'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { TextNode, ImageNode, CanvasObject } from '@/types';
import { X, GripVertical } from 'lucide-react';

// Type guard for TextNode
const isTextNode = (obj: CanvasObject): obj is TextNode => {
    return 'text' in obj && 'fontFamily' in obj;
};

// Type guard for ImageNode
const isImageNode = (obj: CanvasObject): obj is ImageNode => {
    return 'src' in obj && 'aspectRatio' in obj;
};

interface DraggableNodeProps {
    node: CanvasObject;
    isSelected: boolean;
    onSelect: () => void;
    onUpdate: (updates: Partial<CanvasObject>) => void;
    onDelete: () => void;
}

const DraggableNode = ({ node, isSelected, onSelect, onUpdate, onDelete }: DraggableNodeProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const nodeRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (isEditing) return;
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - node.x,
            y: e.clientY - node.y,
        };
    }, [node.x, node.y, onSelect, isEditing]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        onUpdate({
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y,
        });
    }, [isDragging, onUpdate]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const handleDoubleClick = useCallback(() => {
        if (isTextNode(node)) {
            setIsEditing(true);
        }
    }, [node]);

    const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (isTextNode(node)) {
            onUpdate({ text: e.target.value });
        }
    }, [node, onUpdate]);

    const handleTextBlur = useCallback(() => {
        setIsEditing(false);
    }, []);

    return (
        <div
            ref={nodeRef}
            className={`absolute group ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{
                left: node.x,
                top: node.y,
                width: node.width,
                minHeight: node.height,
                zIndex: isSelected ? 30 : 20,
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
        >
            {/* Selection border */}
            <div
                className={`absolute -inset-1 rounded-lg border-2 transition-opacity ${isSelected ? 'border-blue-500 opacity-100' : 'border-transparent opacity-0 group-hover:border-white/20 group-hover:opacity-100'
                    }`}
            />

            {/* Content */}
            {isTextNode(node) && (
                isEditing ? (
                    <textarea
                        className="w-full h-full bg-transparent border-none outline-none resize-none"
                        style={{
                            fontSize: node.fontSize,
                            fontFamily: node.fontFamily,
                            color: node.color,
                        }}
                        value={node.text}
                        onChange={handleTextChange}
                        onBlur={handleTextBlur}
                        autoFocus
                    />
                ) : (
                    <div
                        className="whitespace-pre-wrap break-words"
                        style={{
                            fontSize: node.fontSize,
                            fontFamily: node.fontFamily,
                            color: node.color,
                        }}
                    >
                        {node.text || 'Double-click to edit'}
                    </div>
                )
            )}

            {isImageNode(node) && (
                <img
                    src={node.src}
                    alt="Pasted content"
                    className="w-full h-full object-contain rounded-lg"
                    draggable={false}
                />
            )}

            {/* Controls */}
            {isSelected && (
                <>
                    <div className="absolute -top-2 -left-2 p-1 bg-white/10 backdrop-blur-sm rounded cursor-grab">
                        <GripVertical className="w-3 h-3 text-white/60" />
                    </div>
                    <button
                        className="absolute -top-2 -right-2 p-1 bg-red-500/80 backdrop-blur-sm rounded hover:bg-red-500 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        <X className="w-3 h-3 text-white" />
                    </button>
                </>
            )}
        </div>
    );
};

const ObjectLayer = () => {
    const { objects, selectedObjectId, setSelectedObject, updateObject, removeObject, addImageNode, tool } = useStore();

    // Handle click on empty space to deselect
    const handleLayerClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setSelectedObject(null);
        }
    }, [setSelectedObject]);

    // Handle paste event for images
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of Array.from(items)) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const blob = item.getAsFile();
                    if (!blob) continue;

                    // Create object URL
                    const src = URL.createObjectURL(blob);

                    // Get image dimensions
                    const img = new Image();
                    img.onload = () => {
                        const maxWidth = 400;
                        const aspectRatio = img.width / img.height;
                        const width = Math.min(img.width, maxWidth);
                        const height = width / aspectRatio;

                        const newImage: ImageNode = {
                            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            x: window.innerWidth / 2 - width / 2,
                            y: window.innerHeight / 2 - height / 2,
                            width,
                            height,
                            src,
                            aspectRatio,
                        };

                        addImageNode(newImage);
                    };
                    img.src = src;
                    break;
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [addImageNode]);

    return (
        <div
            className="absolute inset-0 z-20"
            style={{ pointerEvents: tool === 'select' || tool === 'text' || tool === 'image' ? 'auto' : 'none' }}
            onClick={handleLayerClick}
        >
            {objects.map((obj) => (
                <DraggableNode
                    key={obj.id}
                    node={obj}
                    isSelected={selectedObjectId === obj.id}
                    onSelect={() => setSelectedObject(obj.id)}
                    onUpdate={(updates) => updateObject(obj.id, updates)}
                    onDelete={() => removeObject(obj.id)}
                />
            ))}
        </div>
    );
};

export default ObjectLayer;
