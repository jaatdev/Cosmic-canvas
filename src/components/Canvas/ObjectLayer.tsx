'use client';

import { useStore } from '@/store/useStore';

/**
 * ObjectLayer Component - Smart Image Snippets
 * 
 * Renders images below the ink layer but above the background.
 * Z-Index: 5 (Background is 0, Canvas is 10+)
 */
export default function ObjectLayer() {
    const { images } = useStore();

    if (images.length === 0) return null;

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex: 5,
                pointerEvents: 'none',
                userSelect: 'none',
            }}
        >
            {images.map((img) => (
                <img
                    key={img.id}
                    src={img.url}
                    alt=""
                    draggable={false}
                    style={{
                        position: 'absolute',
                        left: img.x,
                        top: img.y,
                        width: img.width,
                        height: img.height,
                        pointerEvents: 'none',
                        userSelect: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                    }}
                />
            ))}
        </div>
    );
}
