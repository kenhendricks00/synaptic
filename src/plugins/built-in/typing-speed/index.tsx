import type { Plugin } from '../../types';

export class TypingSpeedPlugin implements Plugin {
    id = 'typing-speed';
    name = 'Typing Speed';
    version = '1.0.0';
    description = 'Show the current typing speed (WPM) in the status bar.';
    author = 'Synaptic Team';
    category = 'productivity' as const;
    tags = ['typing', 'speed', 'wpm', 'status-bar'];
    permissions: Plugin['permissions'] = ['ui'];

    async onLoad() {
        console.log('Typing Speed plugin loaded');
    }

    async onUnload() {
        console.log('Typing Speed plugin unloaded');
    }

    async onEnable() {
        console.log('Typing Speed plugin enabled');
    }

    async onDisable() {
        console.log('Typing Speed plugin disabled');
    }
}

export default TypingSpeedPlugin;
