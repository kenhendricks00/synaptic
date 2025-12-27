import Fuse from 'fuse.js';
import type { NoteMetadata, SearchResult } from '../types';
import { initSemanticModel, indexNotes, semanticSearch } from './tauri';

/**
 * Search service for full-text and fuzzy search
 */
export class SearchService {
    private fuse: Fuse<NoteMetadata> | null = null;
    private notes: NoteMetadata[] = [];

    /**
     * Initialize the search index with notes
     */
    initialize(notes: NoteMetadata[]): void {
        this.notes = notes;
        this.fuse = new Fuse(notes, {
            keys: [
                { name: 'title', weight: 2.0 },
                { name: 'preview', weight: 1.0 },
                { name: 'tags', weight: 1.5 },
            ],
            threshold: 0.3, // Lower = more strict matching
            includeScore: true,
            includeMatches: true,
            minMatchCharLength: 2,
            useExtendedSearch: true,
            ignoreLocation: true,
        });
    }

    private isModelInitialized = false;

    /**
     * Initialize AI model and index notes
     */
    async initSemanticSearch(): Promise<void> {
        if (this.isModelInitialized) return;

        try {
            await initSemanticModel();

            // Chunk initialization to avoid blocking UI
            // In a real app, this should be incremental
            await indexNotes(this.notes);
            this.isModelInitialized = true;
        } catch (error) {
            console.error('Failed to init semantic search:', error);
        }
    }

    /**
     * Search with hybrid ranking (Full-text + Semantic)
     */
    async hybridSearch(query: string, limit = 20): Promise<SearchResult[]> {
        // 1. Get full-text results (Client-side)
        const textResults = this.search(query, 50);

        // 2. Get semantic results (Server-side)
        let semanticResults: { id: string; score: number }[] = [];
        if (this.isModelInitialized && query.trim().length > 3) {
            try {
                semanticResults = await semanticSearch(query, 50);
            } catch (error) {
                console.error('Semantic search failed:', error);
            }
        }

        // 3. Merge and rank
        const merged = new Map<string, SearchResult>();

        // Add text results (normalized score 0-1)
        textResults.forEach(r => {
            merged.set(r.noteId, { ...r, score: r.score * 0.7 }); // Weight text higher
        });

        // Merge semantic results
        semanticResults.forEach(s => {
            const existing = merged.get(s.id);
            if (existing) {
                // Boost existing result
                existing.score += s.score * 0.3;
                existing.matchType = 'hybrid' as any; // Custom type
            } else {
                // Find metadata for new result
                const note = this.notes.find(n => n.id === s.id);
                if (note) {
                    merged.set(s.id, {
                        noteId: note.id,
                        title: note.title,
                        preview: note.preview,
                        score: s.score * 0.3, // Lower weight for pure semantic
                        matchType: 'semantic',
                        matches: []
                    });
                }
            }
        });

        return Array.from(merged.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * Search notes with fuzzy matching
     */
    search(query: string, limit = 20): SearchResult[] {
        if (!this.fuse || !query.trim()) {
            // Return recent notes if no query
            return this.notes.slice(0, limit).map((note) => ({
                noteId: note.id,
                title: note.title,
                preview: note.preview,
                score: 1,
                matchType: 'title' as const,
                matches: [],
            }));
        }

        const results = this.fuse.search(query, { limit });

        return results.map((result) => {
            // Determine primary match type
            const matchKey = result.matches?.[0]?.key || 'content';
            let matchType: SearchResult['matchType'] = 'content';
            if (matchKey === 'title') matchType = 'title';
            else if (matchKey === 'tags') matchType = 'tag';

            return {
                noteId: result.item.id,
                title: result.item.title,
                preview: result.item.preview,
                score: 1 - (result.score || 0), // Convert to 0-1 where 1 is best
                matchType,
                matches: result.matches?.map((m) => ({
                    key: m.key || '',
                    indices: m.indices as [number, number][],
                    value: m.value || '',
                })) || [],
            };
        });
    }

    /**
     * Search by tag
     */
    searchByTag(tag: string): SearchResult[] {
        const tagLower = tag.toLowerCase();
        return this.notes
            .filter((note) => note.tags.some((t) => t.toLowerCase().includes(tagLower)))
            .map((note) => ({
                noteId: note.id,
                title: note.title,
                preview: note.preview,
                score: 1,
                matchType: 'tag' as const,
                matches: [],
            }));
    }

    /**
     * Get suggestions for autocomplete
     */
    getSuggestions(query: string, limit = 5): string[] {
        if (!query.trim()) return [];

        const suggestions = new Set<string>();
        const queryLower = query.toLowerCase();

        // Add matching titles
        for (const note of this.notes) {
            if (note.title.toLowerCase().includes(queryLower)) {
                suggestions.add(note.title);
                if (suggestions.size >= limit) break;
            }
        }

        // Add matching tags
        if (suggestions.size < limit) {
            for (const note of this.notes) {
                for (const tag of note.tags) {
                    if (tag.toLowerCase().includes(queryLower)) {
                        suggestions.add(`#${tag}`);
                        if (suggestions.size >= limit) break;
                    }
                }
                if (suggestions.size >= limit) break;
            }
        }

        return Array.from(suggestions);
    }

    /**
     * Get all unique tags from notes
     */
    getAllTags(): { tag: string; count: number }[] {
        const tagCounts = new Map<string, number>();

        for (const note of this.notes) {
            for (const tag of note.tags) {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            }
        }

        return Array.from(tagCounts.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
    }
}

// Singleton instance
export const searchService = new SearchService();
