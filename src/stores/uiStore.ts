import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings, View } from '../types';

interface UIState {
    // View state
    currentView: View;
    sidebarOpen: boolean;
    sidebarWidth: number;
    searchModalOpen: boolean;
    createNoteModalOpen: boolean;
    commandPaletteOpen: boolean;

    // Editor state
    hasUnsavedChanges: boolean;
    wordCount: number;
    characterCount: number;
    typingSpeed: number; // WPM
    pomodoroStatus: string | null;

    // Actions
    setCurrentView: (view: View) => void;
    toggleSidebar: () => void;
    setSidebarWidth: (width: number) => void;
    setSearchModalOpen: (open: boolean) => void;
    setCreateNoteModalOpen: (open: boolean) => void;
    setCommandPaletteOpen: (open: boolean) => void;
    setHasUnsavedChanges: (hasChanges: boolean) => void;
    setWordCount: (count: number) => void;
    setCharacterCount: (count: number) => void;
    setTypingSpeed: (wpm: number) => void;
    setPomodoroStatus: (status: string | null) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            // Initial state
            currentView: 'editor',
            sidebarOpen: true,
            sidebarWidth: 260,
            searchModalOpen: false,
            createNoteModalOpen: false,
            commandPaletteOpen: false,
            hasUnsavedChanges: false,
            wordCount: 0,
            characterCount: 0,
            typingSpeed: 0,
            pomodoroStatus: null,

            // Actions
            setCurrentView: (view) => set({ currentView: view }),
            toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
            setSidebarWidth: (width) => set({ sidebarWidth: width }),
            setSearchModalOpen: (open) => set({ searchModalOpen: open }),
            setCreateNoteModalOpen: (open) => set({ createNoteModalOpen: open }),
            setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
            setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),
            setWordCount: (count) => set({ wordCount: count }),
            setCharacterCount: (count) => set({ characterCount: count }),
            setTypingSpeed: (wpm) => set({ typingSpeed: wpm }),
            setPomodoroStatus: (status) => set({ pomodoroStatus: status }),
        }),
        {
            name: 'synaptic-ui-storage',
            partialize: (state) => ({
                sidebarOpen: state.sidebarOpen,
                sidebarWidth: state.sidebarWidth,
            }),
        }
    )
);

// Settings store
interface SettingsState {
    settings: Settings;
    updateSettings: (updates: Partial<Settings>) => void;
    resetSettings: () => void;
}

const defaultSettings: Settings = {
    theme: 'dark',
    fontSize: 16,
    fontFamily: 'Inter',
    lineHeight: 1.6,
    dailyNotesFolder: 'daily',
    defaultNoteTemplate: '',
    ollamaEndpoint: 'http://localhost:11434',
    ollamaModel: 'llama3.1:8b',
    embeddingModel: 'nomic-embed-text',
    autoSave: true,
    autoSaveInterval: 3000,
    showWordCount: true,
    spellCheck: true,
    corePlugins: {
        'backlinks': true,
        'graph-view': true,
        'daily-notes': true,
        'command-palette': true,
        'quick-switcher': true,
    },
    onboardingCompleted: false,
    aiMemory: '',
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            settings: defaultSettings,

            updateSettings: (updates) =>
                set((state) => ({
                    settings: { ...state.settings, ...updates },
                })),

            resetSettings: () => set({ settings: defaultSettings }),
        }),
        {
            name: 'synaptic-settings-storage',
        }
    )
);
