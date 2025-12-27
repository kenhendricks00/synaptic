import type { Plugin } from '../../types';

export class CalendarPlugin implements Plugin {
    id = 'calendar';
    name = 'Calendar';
    version = '1.0.0';
    description = 'Sidebar calendar widget for quick navigation to your Daily Notes.';
    author = 'Synaptic Team';
    category = 'productivity' as const;
    tags = ['calendar', 'daily', 'navigation', 'sidebar'];
    permissions: Plugin['permissions'] = ['ui', 'read_notes', 'write_notes'];

    async onLoad() {
        console.log('Calendar plugin loaded');
    }

    async onUnload() {
        console.log('Calendar plugin unloaded');
    }

    async onEnable() {
        console.log('Calendar plugin enabled');
    }

    async onDisable() {
        console.log('Calendar plugin disabled');
    }
}

export default CalendarPlugin;
