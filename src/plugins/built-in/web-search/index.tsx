import type { Plugin, SearchResult, PluginSettingDefinition } from '../../types';
import { Globe, Search, ExternalLink } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';

// Default search engines
const DEFAULT_BANGS: Record<string, { url: string; name: string }> = {
    '!g': { url: 'https://www.google.com/search?q=', name: 'Google' },
    '!d': { url: 'https://duckduckgo.com/?q=', name: 'DuckDuckGo' },
    '!w': { url: 'https://en.wikipedia.org/wiki/Special:Search?search=', name: 'Wikipedia' },
    '!yt': { url: 'https://www.youtube.com/results?search_query=', name: 'YouTube' },
    '!gh': { url: 'https://github.com/search?q=', name: 'GitHub' },
    '!so': { url: 'https://stackoverflow.com/search?q=', name: 'StackOverflow' },
    '!npm': { url: 'https://www.npmjs.com/search?q=', name: 'NPM' },
    '!r': { url: 'https://www.reddit.com/search/?q=', name: 'Reddit' },
    '!x': { url: 'https://twitter.com/search?q=', name: 'X (Twitter)' },
};

const settingsSchema: PluginSettingDefinition[] = [
    {
        key: 'defaultEngine',
        type: 'select',
        label: 'Default Search Engine',
        description: 'Engine to use when no bang is specified (e.g. searching for "cats")',
        default: '!g',
        options: [
            { value: '!g', label: 'Google' },
            { value: '!d', label: 'DuckDuckGo' },
            { value: '!w', label: 'Wikipedia' },
        ],
    },
    {
        key: 'enableFallback',
        type: 'toggle',
        label: 'Enable Search Fallback',
        description: 'Show "Search Web" option even when no bang is present',
        default: true,
    },
];

export default class WebSearchPlugin implements Plugin {
    id = 'web-search';
    name = 'Web Search';
    version = '1.0.0';
    description = 'Search the web directly from the command palette using bangs (!g, !w, etc.)';
    author = 'Synaptic';
    icon = <Globe className="w-5 h-5" />;
    category = 'utility' as const;
    tags = ['search', 'web', 'productivity'];
    permissions = ['network' as const];
    settingsSchema = settingsSchema;

    async onSearch(query: string): Promise<SearchResult[] | null> {
        if (!query.trim()) return null;

        const terms = query.trim();
        const firstWord = terms.split(' ')[0];
        const isBang = firstWord.startsWith('!') && DEFAULT_BANGS[firstWord as string];
        const searchText = isBang ? terms.substring(firstWord.length).trim() : terms;

        // 1. Explicit Bang Match (e.g. "!g react hook")
        if (isBang && searchText) {
            const bang = DEFAULT_BANGS[firstWord as string];
            return [{
                id: `web-search-${firstWord}`,
                title: `Search ${bang.name} for "${searchText}"`,
                description: `Open ${bang.url}${encodeURIComponent(searchText)}`,
                icon: <Search className="w-4 h-4 text-blue-400" />,
                priority: 100, // Top priority
                onSelect: async () => {
                    await openUrl(`${bang.url}${encodeURIComponent(searchText)}`);
                }
            }];
        }

        // 2. Navigation Match (e.g. just "!w")
        if (isBang && !searchText) {
            const bang = DEFAULT_BANGS[firstWord as string];
            // Extract base domain for display
            const domain = new URL(bang.url.split('?')[0]).hostname;
            return [{
                id: `web-search-nav-${firstWord}`,
                title: `Open ${bang.name}`,
                description: `Go to ${domain}`,
                icon: <ExternalLink className="w-4 h-4 text-blue-400" />,
                priority: 100,
                onSelect: async () => {
                    // Try to open just the domain if possible, or empty search
                    const baseUrl = new URL(bang.url).origin;
                    await openUrl(baseUrl);
                }
            }];
        }

        // 3. Fallback Search (if enabled)
        const settings = await this.getSettings();
        if (settings.enableFallback) {
            const defaultBangKey = settings.defaultEngine || '!g';
            const defaultBang = DEFAULT_BANGS[defaultBangKey];

            return [{
                id: 'web-search-fallback',
                title: `Search Web for "${terms}"`,
                description: `Using ${defaultBang.name}`,
                icon: <Globe className="w-4 h-4 text-foreground-muted" />,
                priority: 0, // Low priority usually
                onSelect: async () => {
                    await openUrl(`${defaultBang.url}${encodeURIComponent(terms)}`);
                }
            }];
        }

        return null;
    }

    async getSettings() {
        // Mock - in production this would access the plugin store's settings
        return {
            defaultEngine: '!g',
            enableFallback: true
        };
    }
}
