import { useState, useEffect, useMemo } from 'react';
import {
    Search,
    FileText,
    Hash,
    Clock,
    Filter,
    X,
    Sparkles,
    SortAsc,
} from 'lucide-react';
import { useVaultStore, useUIStore } from '../../stores';
import { searchService, cn } from '../../lib';
import type { SearchResult } from '../../types';

type SearchFilter = 'all' | 'notes' | 'daily' | 'tags';
type SortOption = 'relevance' | 'date' | 'title';

export function SearchView() {
    const { currentVault, noteMetadata, setActiveNote } = useVaultStore();
    const { setCurrentView } = useUIStore();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [filter, setFilter] = useState<SearchFilter>('all');
    const [sort, setSort] = useState<SortOption>('relevance');
    const [isSearching, setIsSearching] = useState(false);
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [semanticReady, setSemanticReady] = useState(false);

    // Initialize search service when notes change
    useEffect(() => {
        if (noteMetadata.length > 0) {
            searchService.initialize(noteMetadata);
            setIsModelLoading(true);
            searchService.initSemanticSearch()
                .then(() => {
                    setSemanticReady(true);
                    setIsModelLoading(false);
                })
                .catch(() => setIsModelLoading(false));
        }
    }, [noteMetadata]);

    // Perform search when query changes
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(async () => {
            const searchResults = await searchService.hybridSearch(query);
            setResults(searchResults);
            setIsSearching(false);
        }, 150); // Debounce

        return () => clearTimeout(timer);
    }, [query]);

    // Filter results
    const filteredResults = useMemo(() => {
        let filtered = [...results];

        // Apply filter
        if (filter === 'tags') {
            filtered = filtered.filter((r) => r.matchType === 'tag');
        } else if (filter === 'daily') {
            filtered = filtered.filter((r) => {
                const note = noteMetadata.find((n) => n.id === r.noteId);
                return note?.path.includes('/daily/');
            });
        }

        // Apply sort
        if (sort === 'date') {
            filtered.sort((a, b) => {
                const noteA = noteMetadata.find((n) => n.id === a.noteId);
                const noteB = noteMetadata.find((n) => n.id === b.noteId);
                return (noteB?.updatedAt.getTime() || 0) - (noteA?.updatedAt.getTime() || 0);
            });
        } else if (sort === 'title') {
            filtered.sort((a, b) => a.title.localeCompare(b.title));
        }
        // relevance is default from search

        return filtered;
    }, [results, filter, sort, noteMetadata]);

    // Get all tags for tag cloud
    const allTags = useMemo(() => {
        return searchService.getAllTags();
    }, [noteMetadata]);

    const handleResultClick = (result: SearchResult) => {
        setActiveNote(result.noteId);
        setCurrentView('editor');
    };

    const handleTagClick = (tag: string) => {
        setQuery(`#${tag}`);
        setFilter('tags');
    };

    if (!currentVault) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Search className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
                    <p className="text-foreground-muted text-lg">Open a vault to search</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Search Header */}
            <div className="px-6 py-4 border-b border-border bg-background-secondary/50">
                <div className="max-w-4xl mx-auto">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search notes, tags, or content..."
                            className="w-full pl-12 pr-12 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 text-lg transition-all"
                            autoFocus
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-background-tertiary text-foreground-muted hover:text-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-4 mt-4">
                        <div className="flex items-center gap-1">
                            <Filter className="w-4 h-4 text-foreground-muted mr-1" />
                            {(['all', 'notes', 'daily', 'tags'] as SearchFilter[]).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={cn(
                                        'px-3 py-1 rounded-lg text-sm capitalize transition-colors',
                                        filter === f
                                            ? 'bg-accent/10 text-accent'
                                            : 'text-foreground-secondary hover:bg-background-tertiary'
                                    )}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1" />

                        <div className="flex items-center gap-1">
                            <SortAsc className="w-4 h-4 text-foreground-muted mr-1" />
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value as SortOption)}
                                className="bg-background border border-border rounded-lg px-2 py-1 text-sm text-foreground-secondary focus:outline-none focus:border-accent"
                            >
                                <option value="relevance">Relevance</option>
                                <option value="date">Date Modified</option>
                                <option value="title">Title</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto p-6">
                    {query.trim() ? (
                        <>
                            {/* Results Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-foreground-muted">
                                        {isSearching ? (
                                            'Searching...'
                                        ) : (
                                            `${filteredResults.length} result${filteredResults.length !== 1 ? 's' : ''}`
                                        )}
                                    </span>
                                    {semanticReady && (
                                        <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-medium flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />
                                            AI Active
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Results List */}
                            {filteredResults.length > 0 ? (
                                <div className="space-y-2">
                                    {filteredResults.map((result) => (
                                        <SearchResultCard
                                            key={result.noteId}
                                            result={result}
                                            onClick={() => handleResultClick(result)}
                                        />
                                    ))}
                                </div>
                            ) : !isSearching ? (
                                <div className="text-center py-12">
                                    <Search className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
                                    <p className="text-foreground-muted">No results for "{query}"</p>
                                    <p className="text-foreground-muted text-sm mt-1">
                                        Try different keywords or check your spelling
                                    </p>
                                </div>
                            ) : null}
                        </>
                    ) : (
                        /* Empty State - Show Tags & Recent */
                        <div className="space-y-8">
                            {/* Tag Cloud */}
                            {allTags.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-foreground-secondary mb-3 flex items-center gap-2">
                                        <Hash className="w-4 h-4" />
                                        Browse by Tag
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {allTags.slice(0, 20).map(({ tag, count }) => (
                                            <button
                                                key={tag}
                                                onClick={() => handleTagClick(tag)}
                                                className="px-3 py-1.5 rounded-lg bg-background-tertiary text-foreground-secondary hover:bg-accent/10 hover:text-accent transition-colors text-sm"
                                            >
                                                #{tag}
                                                <span className="ml-1.5 text-foreground-muted">{count}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent Notes */}
                            <div>
                                <h3 className="text-sm font-medium text-foreground-secondary mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Recent Notes
                                </h3>
                                <div className="space-y-2">
                                    {noteMetadata.slice(0, 10).map((note) => (
                                        <button
                                            key={note.id}
                                            onClick={() => {
                                                setActiveNote(note.id);
                                                setCurrentView('editor');
                                            }}
                                            className="w-full flex items-center gap-3 p-3 rounded-lg bg-background-secondary hover:bg-background-tertiary text-left transition-colors"
                                        >
                                            <FileText className="w-4 h-4 text-foreground-muted flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-foreground truncate">
                                                    {note.title}
                                                </div>
                                                <div className="text-sm text-foreground-muted truncate">
                                                    {note.preview}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* AI Search Hint */}
                            <div className="p-4 rounded-xl bg-gradient-to-r from-accent/10 to-purple-600/10 border border-accent/20">
                                <div className="flex items-start gap-3">
                                    <Sparkles className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium text-foreground mb-1">
                                            {isModelLoading ? 'Initializing AI Model...' : 'Hybrid Search Active'}
                                        </h4>
                                        <p className="text-sm text-foreground-muted">
                                            {isModelLoading
                                                ? 'Downloading embedding model for semantic search (first run only)...'
                                                : 'Semantic search is enabled. You can find notes by meaning, not just keywords.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

interface SearchResultCardProps {
    result: SearchResult;
    onClick: () => void;
}

function SearchResultCard({ result, onClick }: SearchResultCardProps) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-start gap-3 p-4 rounded-lg bg-background-secondary hover:bg-background-tertiary text-left transition-colors group"
        >
            <div
                className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    result.matchType === 'tag'
                        ? 'bg-purple-500/10 text-purple-400'
                        : result.matchType === 'semantic'
                            ? 'bg-accent/10 text-accent'
                            : 'bg-blue-500/10 text-blue-400'
                )}
            >
                {result.matchType === 'tag' ? (
                    <Hash className="w-4 h-4" />
                ) : result.matchType === 'semantic' ? (
                    <Sparkles className="w-4 h-4" />
                ) : (
                    <FileText className="w-4 h-4" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground group-hover:text-accent transition-colors truncate">
                        {result.title}
                    </span>
                    <span
                        className={cn(
                            'px-1.5 py-0.5 rounded text-2xs uppercase font-medium',
                            result.matchType === 'tag'
                                ? 'bg-purple-500/10 text-purple-400'
                                : result.matchType === 'semantic'
                                    ? 'bg-accent/10 text-accent'
                                    : 'bg-blue-500/10 text-blue-400'
                        )}
                    >
                        {result.matchType}
                    </span>
                </div>
                <p className="text-sm text-foreground-muted line-clamp-2">
                    {result.preview}
                </p>
            </div>

            <div className="text-xs text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity">
                {Math.round(result.score * 100)}%
            </div>
        </button>
    );
}
