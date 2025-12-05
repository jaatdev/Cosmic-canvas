'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Pencil } from 'lucide-react';

const ProjectNameInput = () => {
    const { projectName, setProjectName } = useStore();
    const [isEditing, setIsEditing] = useState(false);
    const [localName, setLocalName] = useState(projectName);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSubmit = () => {
        const trimmedName = localName.trim();
        if (trimmedName) {
            setProjectName(trimmedName);
        } else {
            setLocalName(projectName);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        } else if (e.key === 'Escape') {
            setLocalName(projectName);
            setIsEditing(false);
        }
    };

    return (
        <div className="group">
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    onBlur={handleSubmit}
                    onKeyDown={handleKeyDown}
                    className="px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl text-white text-lg font-medium focus:outline-none focus:border-white/40 min-w-[200px]"
                    placeholder="Project name..."
                />
            ) : (
                <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                >
                    <span className="text-lg font-medium">{projectName}</span>
                    <Pencil className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity" />
                </button>
            )}
        </div>
    );
};

export default ProjectNameInput;
