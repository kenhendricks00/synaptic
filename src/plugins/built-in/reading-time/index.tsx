import type { Plugin } from '../../types';

export class ReadingTimePlugin implements Plugin {
    id = 'reading-time';
    name = 'Reading Time';
    version = '1.0.0';
    description = 'Show the estimated reading time of the current note in the status bar.';
    author = 'Supercip971';
    category = 'productivity' as const;
    tags = ['reading', 'stats', 'time', 'status-bar'];
    permissions: Plugin['permissions'] = ['ui'];

    async onLoad() {
        console.log('Reading Time plugin loaded');
    }

    async onUnload() {
        console.log('Reading Time plugin unloaded');
    }

    async onEnable() {
        console.log('Reading Time plugin enabled');
    }

    async onDisable() {
        console.log('Reading Time plugin disabled');
    }
}

export default ReadingTimePlugin;
