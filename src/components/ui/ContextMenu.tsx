import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib';

interface ContextMenuItem {
    label: string;
    icon?: React.ElementType;
    onClick: () => void;
    variant?: 'default' | 'danger';
}

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    items: ContextMenuItem[];
}

export function ContextMenu({ x, y, onClose, items }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Adjust position if menu goes off screen
    const adjustedX = Math.min(x, window.innerWidth - 200);
    const adjustedY = Math.min(y, window.innerHeight - 300);

    return (
        <div
            ref={menuRef}
            className="fixed z-[100] min-w-[180px] bg-background-secondary border border-border shadow-2xl rounded-xl p-1.5 animate-in fade-in zoom-in duration-200"
            style={{
                left: `${adjustedX}px`,
                top: `${adjustedY}px`,
                backdropFilter: 'blur(16px)',
                backgroundColor: 'rgba(23, 23, 23, 0.8)'
            }}
        >
            <div className="space-y-0.5">
                {items.map((item, index) => (
                    <button
                        key={index}
                        onClick={(e) => {
                            e.stopPropagation();
                            item.onClick();
                            onClose();
                        }}
                        className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                            item.variant === 'danger'
                                ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                : "text-foreground-secondary hover:bg-background-tertiary hover:text-foreground"
                        )}
                    >
                        {item.icon && <item.icon className="w-4 h-4 opacity-70" />}
                        {item.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
