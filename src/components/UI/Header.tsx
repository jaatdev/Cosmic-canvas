'use client';

import { useStore } from '@/store/useStore';

/**
 * Header Component - Project Title Input
 * 
 * Transparent input that looks like it's part of the canvas.
 */
export default function Header() {
    const { projectName, setProjectName } = useStore();

    return (
        <div className="fixed top-4 left-4 z-50">
            <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Untitled Universe"
                className="bg-transparent text-2xl font-bold text-white/50 
          placeholder:text-white/30
          focus:text-white focus:outline-none
          border-none transition-colors duration-200
          w-64 md:w-96"
                style={{
                    textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                }}
            />
        </div>
    );
}
