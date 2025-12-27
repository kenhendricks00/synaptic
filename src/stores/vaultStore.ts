import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Vault, Note, NoteMetadata } from '../types';

interface VaultState {
    // State
    currentVault: Vault | null;
    notes: Map<string, Note>;
    noteMetadata: NoteMetadata[];
    activeNoteId: string | null;
    recentNoteIds: string[];
    isLoading: boolean;
    error: string | null;
    autoLoadFolder: string | null; // Folder path to auto-load on launch

    // Actions
    setCurrentVault: (vault: Vault | null) => void;
    setNotes: (notes: Map<string, Note>) => void;
    setNoteMetadata: (metadata: NoteMetadata[]) => void;
    setActiveNote: (noteId: string | null) => void;
    addNote: (note: Note) => void;
    updateNote: (noteId: string, updates: Partial<Note>) => void;
    deleteNote: (noteId: string) => void;
    addRecentNote: (noteId: string) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    setAutoLoadFolder: (folder: string | null) => void;
    reset: () => void;
}

export const useVaultStore = create<VaultState>()(
    persist(
        (set, get) => ({
            // Initial state
            currentVault: null,
            notes: new Map(),
            noteMetadata: [],
            activeNoteId: null,
            recentNoteIds: [],
            isLoading: false,
            error: null,
            autoLoadFolder: null,

            // Actions
            setCurrentVault: (vault) => set({ currentVault: vault }),

            setNotes: (notes) => set({ notes }),

            setNoteMetadata: (metadata) => set({ noteMetadata: metadata }),

            setActiveNote: (noteId) => {
                set({ activeNoteId: noteId });
                if (noteId) {
                    get().addRecentNote(noteId);
                }
            },

            addNote: (note) => {
                const notes = new Map(get().notes);
                notes.set(note.id, note);
                set({ notes });
            },

            updateNote: (noteId, updates) => {
                const notes = new Map(get().notes);
                const existingNote = notes.get(noteId);
                if (existingNote) {
                    notes.set(noteId, { ...existingNote, ...updates, updatedAt: new Date() });
                    set({ notes });
                }
            },

            deleteNote: (noteId) => {
                const notes = new Map(get().notes);
                notes.delete(noteId);
                const activeNoteId = get().activeNoteId === noteId ? null : get().activeNoteId;
                set({ notes, activeNoteId });
            },

            addRecentNote: (noteId) => {
                const recentNoteIds = get().recentNoteIds.filter((id) => id !== noteId);
                recentNoteIds.unshift(noteId);
                set({ recentNoteIds: recentNoteIds.slice(0, 20) }); // Keep last 20
            },

            setLoading: (isLoading) => set({ isLoading }),

            setError: (error) => set({ error }),

            setAutoLoadFolder: (folder) => set({ autoLoadFolder: folder }),

            reset: () => set({
                currentVault: null,
                notes: new Map(),
                noteMetadata: [],
                activeNoteId: null,
                recentNoteIds: [],
                autoLoadFolder: null,
                error: null,
            }),
        }),
        {
            name: 'synaptic-vault-storage',
            partialize: (state) => ({
                currentVault: state.currentVault,
                recentNoteIds: state.recentNoteIds,
                autoLoadFolder: state.autoLoadFolder,
            }),
        }
    )
);
