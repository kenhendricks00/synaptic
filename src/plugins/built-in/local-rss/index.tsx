import type { Plugin } from '../../types';
import { useVaultStore } from '../../../stores';
import { mkdir, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { htmlToMarkdown, slugify } from '../../../lib';

export class LocalRSSPlugin implements Plugin {
    id = 'local-rss';
    name = 'Local RSS';
    version = '1.0.2';
    description = 'Download RSS feed articles to local files.';
    author = 'onikun94';
    category = 'integration' as const;
    tags = ['rss', 'news', 'download', 'offline'];
    permissions: Plugin['permissions'] = ['network', 'write_notes'];

    settingsSchema = [
        {
            key: 'customFeeds',
            type: 'textarea' as const,
            label: 'Custom Feed URLs',
            description: 'One RSS feed URL per line',
            default: 'https://hnrss.org/frontpage\nhttps://www.theverge.com/rss/index.xml\nhttps://www.wired.com/feed/rss'
        },
        {
            key: 'articlesPerFeed',
            type: 'number' as const,
            label: 'Articles per Feed',
            description: 'Maximum articles to download from each feed',
            default: 5,
            min: 1,
            max: 20
        }
    ];

    async onLoad() {
        console.log('Local RSS plugin loaded');
    }

    async onUnload() {
        console.log('Local RSS plugin unloaded');
    }

    commands = [
        {
            id: 'local-rss:download',
            name: 'RSS: Download Feeds',
            description: 'Fetch latest articles from subscribed feeds',
            handler: async () => {
                const { currentVault } = useVaultStore.getState();
                if (!currentVault) {
                    console.error('No vault open');
                    return;
                }

                const feedsPath = `${currentVault.path}/Feeds`;
                const feeds = [
                    { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
                    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
                    { name: 'Wired', url: 'https://www.wired.com/feed/rss' }
                ];

                try {
                    // Create Feeds folder
                    if (!(await exists(feedsPath))) {
                        await mkdir(feedsPath, { recursive: true });
                    }

                    let downloadCount = 0;

                    for (const feed of feeds) {
                        try {
                            const sourcePath = `${feedsPath}/${feed.name}`;
                            if (!(await exists(sourcePath))) {
                                await mkdir(sourcePath, { recursive: true });
                            }

                            // Use allorigins as CORS proxy
                            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feed.url)}`;
                            const response = await fetch(proxyUrl);
                            if (!response.ok) throw new Error(`HTTP ${response.status}`);

                            const text = await response.text();
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(text, 'text/xml');
                            const items = Array.from(doc.querySelectorAll('item')).slice(0, 5); // Limit to top 5

                            for (const item of items) {
                                const title = item.querySelector('title')?.textContent || 'Untitled';
                                const link = item.querySelector('link')?.textContent || '';
                                const description = item.querySelector('content\\:encoded')?.textContent
                                    || item.querySelector('description')?.textContent
                                    || '';
                                const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();

                                const markdownBody = htmlToMarkdown(description);
                                const content = `# [${title}](${link})\n\n**Source:** ${feed.name}\n**Date:** ${pubDate}\n\n---\n\n${markdownBody}`;

                                const filename = `${slugify(title)}.md`;
                                const filePath = `${sourcePath}/${filename}`;

                                if (!(await exists(filePath))) {
                                    await writeTextFile(filePath, content);
                                    downloadCount++;
                                    console.log(`Downloaded: ${title}`);
                                }
                            }

                        } catch (err) {
                            console.error(`Failed to fetch ${feed.name}:`, err);
                        }
                    }

                    // Simple alert for feedback
                    if (downloadCount > 0) {
                        alert(`Successfully downloaded ${downloadCount} new articles to ${feedsPath}`);

                        // Force a reload of metadata in a rough way
                        const { loadNotesMetadata } = await import('../../../lib');
                        const metadata = await loadNotesMetadata(currentVault.path);
                        useVaultStore.getState().setNoteMetadata(metadata);
                    } else {
                        alert('No new articles found.');
                    }

                } catch (error) {
                    console.error('Failed to download RSS feeds:', error);
                    alert('Failed to execute RSS download.');
                }
            }
        }
    ];
}

export default LocalRSSPlugin;
