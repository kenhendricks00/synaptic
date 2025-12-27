import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { useVaultStore, useUIStore } from '../../stores';
import { createNote, cn } from '../../lib';

interface CreateNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateNoteModal({ isOpen, onClose }: CreateNoteModalProps) {
    const { currentVault, addNote, setActiveNote, setNoteMetadata, noteMetadata } = useVaultStore();
    const [title, setTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setError(null);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const handleCreate = useCallback(async () => {
        if (!currentVault || !title.trim()) return;

        setIsCreating(true);
        setError(null);

        try {
            const note = await createNote(currentVault.path, title.trim());

            // Add to store
            addNote(note);

            // Update metadata
            setNoteMetadata([
                ...noteMetadata,
                {
                    id: note.id,
                    title: note.title,
                    path: note.path,
                    updatedAt: note.updatedAt,
                    preview: '',
                    tags: [],
                },
            ]);

            // Select the new note
            setActiveNote(note.id);

            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create note');
        } finally {
            setIsCreating(false);
        }
    }, [currentVault, title, addNote, setNoteMetadata, noteMetadata, setActiveNote, onClose]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && title.trim()) {
            handleCreate();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-background-secondary border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h2 className="font-medium text-foreground">Create New Note</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-background-tertiary text-foreground-muted hover:text-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                            Note Title
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="My new note..."
                            className="input"
                            disabled={isCreating}
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-error/10 text-error text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <button onClick={onClose} className="btn-secondary" disabled={isCreating}>
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            className="btn-primary"
                            disabled={!title.trim() || isCreating}
                        >
                            {isCreating ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface CreateNoteButtonProps {
    className?: string;
    variant?: 'primary' | 'icon';
}

export function CreateNoteButton({ className, variant = 'primary' }: CreateNoteButtonProps) {
    const { setCreateNoteModalOpen } = useUIStore();

    if (variant === 'icon') {
        return (
            <button
                onClick={() => setCreateNoteModalOpen(true)}
                className={cn(
                    'p-2 rounded-lg hover:bg-background-tertiary text-foreground-secondary hover:text-foreground transition-colors',
                    className
                )}
                title="Create new note"
            >
                <Plus className="w-4 h-4" />
            </button>
        );
    }

    return (
        <button
            onClick={() => setCreateNoteModalOpen(true)}
            className={cn('btn-primary w-full justify-start', className)}
        >
            <Plus className="w-4 h-4" />
            New Note
        </button>
    );
}
