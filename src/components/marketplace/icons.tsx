import {
    Brain,
    Palette,
    Timer,
    Zap,
    Cloud,
    Sun,
    Network as NetworkIcon,
    Layout,
    RefreshCw,
    Clock,
    Cpu,
    MessageSquare,
    Smile,
    ShieldCheck,
    Calendar,
    FileText,
    CheckSquare,
    Gauge,
    Github,
    Wand2,
    Utensils,
    Rss,
    Cake,
    Terminal,
    Globe,
    Mic,
    Maximize2
} from 'lucide-react';
import { cn } from '../../lib';
import type { PluginManifest } from '../../plugins/types';

export const getPluginIcon = (plugin: PluginManifest) => {
    const iconValue = plugin.icon || '';
    const normalizedValue = iconValue.toLowerCase().trim();

    // Map both names and emojis to Lucide icons
    const iconMap: Record<string, { icon: any, color: string }> = {
        // Names
        'cake': { icon: Cake, color: 'text-pink-500' },
        'utensils': { icon: Utensils, color: 'text-orange-500' },
        'rss': { icon: Rss, color: 'text-orange-500' },
        'brain': { icon: Brain, color: 'text-purple-400' },
        'palette': { icon: Palette, color: 'text-pink-400' },
        'timer': { icon: Timer, color: 'text-orange-400' },
        'zap': { icon: Zap, color: 'text-yellow-400' },
        'network': { icon: NetworkIcon, color: 'text-blue-400' },
        'layout': { icon: Layout, color: 'text-green-400' },
        'refresh': { icon: RefreshCw, color: 'text-cyan-400' },
        'clock': { icon: Clock, color: 'text-cyan-400' },
        'ai': { icon: Cpu, color: 'text-indigo-400' },
        'message': { icon: MessageSquare, color: 'text-violet-400' },
        'smile': { icon: Smile, color: 'text-yellow-400' },
        'shield': { icon: ShieldCheck, color: 'text-blue-500' },
        'calendar': { icon: Calendar, color: 'text-blue-400' },
        'file-text': { icon: FileText, color: 'text-orange-400' },
        'check-square': { icon: CheckSquare, color: 'text-orange-400' },
        'gauge': { icon: Gauge, color: 'text-teal-400' },
        'github': { icon: Github, color: 'text-gray-400' },
        'wand': { icon: Wand2, color: 'text-purple-400' },
        'terminal': { icon: Terminal, color: 'text-blue-400' },
        'globe': { icon: Globe, color: 'text-blue-500' },
        'mic': { icon: Mic, color: 'text-red-500' },
        'cloud': { icon: Cloud, color: 'text-blue-500' },
        'sun': { icon: Sun, color: 'text-yellow-500' },
        'maximize-2': { icon: Maximize2, color: 'text-purple-500' },

        // Emojis (for backward compatibility / stuck state)
        '🧠': { icon: Brain, color: 'text-purple-400' },
        '🎨': { icon: Palette, color: 'text-pink-400' },
        '🍅': { icon: Timer, color: 'text-orange-400' },
        '⚡': { icon: Zap, color: 'text-yellow-400' },
        '🕸️': { icon: NetworkIcon, color: 'text-blue-400' },
        '📋': { icon: Layout, color: 'text-green-400' },
        '🔄': { icon: RefreshCw, color: 'text-cyan-400' },
        '🤖': { icon: Cpu, color: 'text-indigo-400' },
        '😊': { icon: Smile, color: 'text-yellow-400' },
    };

    const mapped = iconMap[normalizedValue] || iconMap[iconValue];

    if (mapped) {
        return <mapped.icon className={cn("w-full h-full p-2.5", mapped.color)} />;
    }

    // Fallback to emoji if no mapping found
    return <span className="text-3xl">{plugin.icon}</span>;
};
