import type { Plugin } from '../../types';
import { Maximize2 } from 'lucide-react';
import { useUIStore } from '../../../stores';

export default class FocusModePlugin implements Plugin {
    id = 'focus-mode';
    name = 'Focus Mode';
    version = '1.0.0';
    description = 'Distraction-free writing. Hides sidebar and top bar.';
    author = 'Synaptic Team';
    icon = <Maximize2 className="w-5 h-5 text-purple-500" />;
    category = 'productivity' as const;
    tags = ['focus', 'writing', 'distraction-free', 'ui'];
    permissions: Plugin['permissions'] = ['ui'];

    async onLoad() {
        console.log('Focus Mode Plugin loaded');
        // Command is technically global via App.tsx shortcuts, 
        // but we could also register it formally if the command palette supported dynamic commands.
        // For now, this plugin mainly serves as a "Feature Flag" and documentation.
    }

    async onUnload() {
        console.log('Focus Mode Plugin unloaded');
    }

    async onEnable() {
        // Auto-enter focus mode when enabled for better UX
        useUIStore.getState().setFocusMode(true);
    }

    async onDisable() {
        // Ensure we exit focus mode if the plugin is disabled
        useUIStore.getState().setFocusMode(false);
    }
}
