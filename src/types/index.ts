// Note types
export interface Note {
    id: string;
    title: string;
    content: string;
    path: string;
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    links: string[]; // IDs of linked notes
    backlinks: string[]; // IDs of notes linking to this
    isDailyNote: boolean;
    mood?: 'great' | 'good' | 'okay' | 'bad' | 'terrible';
}

export interface NoteMetadata {
    id: string;
    title: string;
    path: string;
    updatedAt: Date;
    preview: string;
    tags: string[];
}

// Vault types
export interface Vault {
    path: string;
    name: string;
    noteCount: number;
    lastOpened: Date;
}

export interface VaultState {
    currentVault: Vault | null;
    notes: Map<string, Note>;
    recentNotes: string[]; // note IDs
    isLoading: boolean;
    error: string | null;
}

// Search types
export interface SearchMatch {
    key: string;
    indices: [number, number][];
    value: string;
}

export interface SearchResult {
    noteId: string;
    title: string;
    preview: string;
    score: number;
    matchType: 'title' | 'content' | 'tag' | 'semantic';
    matches?: SearchMatch[];
}

export interface SearchState {
    query: string;
    results: SearchResult[];
    isSearching: boolean;
    searchMode: 'fulltext' | 'semantic' | 'hybrid';
}

// Editor types
export interface EditorState {
    activeNoteId: string | null;
    isEditing: boolean;
    hasUnsavedChanges: boolean;
    wordCount: number;
    characterCount: number;
}

// Graph types
export interface GraphNode {
    id: string;
    label: string;
    type: 'note' | 'tag' | 'daily';
    size?: number;
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    type: 'link' | 'backlink' | 'tag';
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

// Settings types
export interface Settings {
    theme: 'dark' | 'light' | 'oled' | 'catppuccin' | 'system';
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    dailyNotesFolder: string;
    defaultNoteTemplate: string;
    ollamaEndpoint: string;
    ollamaModel: string;
    embeddingModel: string;
    autoSave: boolean;
    autoSaveInterval: number; // ms
    showWordCount: boolean;
    spellCheck: boolean;
    corePlugins: Record<string, boolean>; // Core feature toggles
    onboardingCompleted: boolean; // Track if onboarding is done
    aiMemory: string; // Persistent instructions for the AI
}

// AI types
export interface AIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AIState {
    isConnected: boolean;
    isProcessing: boolean;
    currentModel: string;
    availableModels: string[];
}

// UI types
export type View = 'editor' | 'graph' | 'daily' | 'search' | 'settings' | 'plugins' | 'marketplace' | 'tasks' | 'study';

export interface UIState {
    currentView: View;
    sidebarOpen: boolean;
    sidebarWidth: number;
    searchModalOpen: boolean;
    commandPaletteOpen: boolean;
}
