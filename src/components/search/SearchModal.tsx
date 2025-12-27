import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, FileText, Hash, X, Command, Terminal } from 'lucide-react';
import { useUIStore, useVaultStore } from '../../stores';
import { pluginManager } from '../../plugins/manager';
import type { PluginCommand } from '../../plugins/types';
import { searchNotesLocally, cn } from '../../lib';
import type { NoteMetadata } from '../../types';

type SearchResultItem =
    | { type: 'note', data: NoteMetadata }
    | { type: 'command', data: PluginCommand }
    | { type: 'plugin-result', data: import('../../plugins/types').SearchResult };

export function SearchModal() {
    const { searchModalOpen, setSearchModalOpen } = useUIStore();
    const { noteMetadata, setActiveNote, currentVault } = useVaultStore();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when modal opens
    useEffect(() => {
        if (searchModalOpen) {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [searchModalOpen]);

    // Search as user types
    useEffect(() => {
        if (query.trim()) {
            // Search notes
            const noteResults = searchNotesLocally(noteMetadata, query)
                .map(note => ({ type: 'note' as const, data: note }));

            // Search commands (only enabled plugins)
            const enabledPlugins = pluginManager.getEnabledPlugins();
            const validCommands = enabledPlugins.flatMap(plugin => plugin.commands || []);

            const commandResults = validCommands
                .filter(cmd => cmd.name.toLowerCase().includes(query.toLowerCase()))
                .map(cmd => ({ type: 'command' as const, data: cmd }));

            // Search Plugins (Web Search, etc.)
            Promise.all(
                enabledPlugins.map(async (plugin) => {
                    if (plugin.onSearch) {
                        try {
                            const results = await plugin.onSearch(query);
                            return results || [];
                        } catch (e) {
                            console.error(`Plugin ${plugin.name} search error:`, e);
                            return [];
                        }
                    }
                    return [];
                })
            ).then((pluginResults) => {
                const flatPluginResults = pluginResults.flat().sort((a, b) => (b.priority || 0) - (a.priority || 0));

                // Combine: Plugin High Priority -> Commands -> Notes -> Plugin Low Priority
                // For simplicity, we'll just put plugin results that are high priority (>0) at top

                const highPriPluginResults = flatPluginResults.filter(r => (r.priority || 0) > 0);
                const lowPriPluginResults = flatPluginResults.filter(r => (r.priority || 0) <= 0);

                setResults([
                    ...highPriPluginResults.map(r => ({ type: 'plugin-result' as const, data: r })),
                    ...commandResults,
                    ...noteResults,
                    ...lowPriPluginResults.map(r => ({ type: 'plugin-result' as const, data: r }))
                ].slice(0, 20));
                setSelectedIndex(0);
            });

            // Initial render with just local results to be snappy (optional, but good UX)
            // But we can let the effect run.
        } else {
            // Show recent notes when no query
            setResults(noteMetadata.slice(0, 5).map(note => ({ type: 'note', data: note })));
        }
    }, [query, noteMetadata]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex((i) => Math.max(i - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    const selected = results[selectedIndex];
                    if (selected) {
                        if (selected.type === 'note') {
                            setActiveNote(selected.data.id);
                            useUIStore.getState().setCurrentView('editor');
                        } else {
                            // Execute command
                            pluginManager.executeCommand(selected.data.id).catch(console.error);
                        }
                        setSearchModalOpen(false);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    setSearchModalOpen(false);
                    break;
            }
        },
        [results, selectedIndex, setActiveNote, setSearchModalOpen]
    );

    // Global keyboard shortcut
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchModalOpen(!searchModalOpen);
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [searchModalOpen, setSearchModalOpen]);

    if (!searchModalOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setSearchModalOpen(false)}
        >
            <div
                className="w-full max-w-xl bg-background-secondary border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                    <Search className="w-5 h-5 text-foreground-muted" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search notes or commands..."
                        className="flex-1 bg-transparent text-lg text-foreground placeholder:text-foreground-muted outline-none"
                    />
                    <kbd className="flex items-center gap-0.5">
                        <Command className="w-3 h-3" />K
                    </kbd>
                    <button
                        onClick={() => setSearchModalOpen(false)}
                        className="p-1 rounded hover:bg-background-tertiary text-foreground-muted hover:text-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                    {!currentVault ? (
                        <div className="px-4 py-8 text-center text-foreground-muted">
                            Open a vault to search
                        </div>
                    ) : results.length === 0 && query ? (
                        <div className="px-4 py-8 text-center text-foreground-muted">
                            No results found for "{query}"
                        </div>
                    ) : (
                        <div className="py-2">
                            {!query && (
                                <div className="px-4 py-1 text-xs text-foreground-muted font-medium">
                                    Recent Notes
                                </div>
                            )}
                            {results.map((result, index) => (
                                <button
                                    key={result.type === 'note' ? result.data.id : result.data.id}
                                    onClick={() => {
                                        if (result.type === 'note') {
                                            setActiveNote(result.data.id);
                                            useUIStore.getState().setCurrentView('editor');
                                        } else if (result.type === 'command') {
                                            pluginManager.executeCommand(result.data.id).catch(console.error);
                                        } else if (result.type === 'plugin-result') {
                                            result.data.onSelect();
                                        }
                                        setSearchModalOpen(false);
                                    }}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                                        selectedIndex === index
                                            ? 'bg-accent/10 text-foreground'
                                            : 'text-foreground-secondary hover:bg-background-tertiary'
                                    )}
                                >
                                    {result.type === 'note' ? (
                                        <FileText className="w-4 h-4 flex-shrink-0" />
                                    ) : result.type === 'command' ? (
                                        <Terminal className="w-4 h-4 flex-shrink-0 text-accent" />
                                    ) : (
                                        // Plugin Result Icon
                                        <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                                            {result.data.icon || <Search className="w-4 h-4" />}
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="truncate font-medium">
                                            {result.type === 'note' ? result.data.title :
                                                result.type === 'command' ? result.data.name :
                                                    result.data.title}
                                        </div>
                                        <div className="truncate text-sm text-foreground-muted">
                                            {result.type === 'note' ? result.data.preview :
                                                result.type === 'command' ? result.data.description :
                                                    result.data.description}
                                        </div>
                                    </div>

                                    {result.type === 'note' && (result.data as any).tags.length > 0 && (
                                        <div className="flex items-center gap-1 text-xs text-foreground-muted">
                                            <Hash className="w-3 h-3" />
                                            {(result.data as any).tags[0]}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-xs text-foreground-muted bg-background-tertiary/50">
                    <span className="flex items-center gap-1">
                        <kbd>↑↓</kbd> Navigate
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd>↵</kbd> Open
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd>esc</kbd> Close
                    </span>
                </div>
            </div>
        </div >
    );
}
