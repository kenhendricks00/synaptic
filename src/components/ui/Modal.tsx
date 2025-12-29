import React, { useEffect, useRef, useState } from 'react';
import { useModalStore } from '../../stores/modalStore';
import { X } from 'lucide-react';

export const Modal: React.FC = () => {
    const { isOpen, config, closeModal } = useModalStore();
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Reset input when modal opens
    useEffect(() => {
        if (isOpen && config) {
            setInputValue(config.defaultValue || '');
            // Focus input after a small delay for animation
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 50);
        }
    }, [isOpen, config]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                config?.onCancel?.();
                closeModal();
            } else if (e.key === 'Enter' && config?.type === 'prompt') {
                config.onConfirm(inputValue);
            } else if (e.key === 'Enter' && config?.type !== 'prompt') {
                config?.onConfirm();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, config, inputValue, closeModal]);

    // Click outside to close
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            config?.onCancel?.();
            closeModal();
        }
    };

    if (!isOpen || !config) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className="relative bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a4a]">
                    <h2 className="text-lg font-semibold text-foreground">{config.title}</h2>
                    <button
                        onClick={() => {
                            config.onCancel?.();
                            closeModal();
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#2a2a4a] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                    {config.message && (
                        <p className="text-muted mb-4">{config.message}</p>
                    )}

                    {config.type === 'prompt' && (
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={config.placeholder}
                            className="w-full px-4 py-3 bg-[#0f0f1a] border border-[#2a2a4a] rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#2a2a4a] bg-[#151525] rounded-b-xl">
                    {config.type !== 'alert' && (
                        <button
                            onClick={() => {
                                config.onCancel?.();
                                closeModal();
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-[#1a1a2e] hover:bg-[#2a2a4a] border border-[#2a2a4a] rounded-lg transition-colors"
                        >
                            {config.cancelText || 'Cancel'}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (config.type === 'prompt') {
                                config.onConfirm(inputValue);
                            } else {
                                config.onConfirm();
                            }
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent/90 rounded-lg transition-colors"
                    >
                        {config.confirmText || 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
};
