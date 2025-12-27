import {
    Power,
    PowerOff,
    Trash2,
    Settings
} from 'lucide-react';
import { usePluginStore } from '../../plugins';
import { cn } from '../../lib';
import { getPluginIcon } from './icons';

export function PluginManager() {
    const {
        installed,
        uninstallPlugin,
        enablePlugin,
        disablePlugin,
    } = usePluginStore();

    const installedPlugins = Array.from(installed.values());

    const handleToggleEnable = async (pluginId: string, enabled: boolean) => {
        try {
            if (enabled) {
                await disablePlugin(pluginId);
            } else {
                await enablePlugin(pluginId);
            }
        } catch (error) {
            console.error('Failed to toggle plugin:', error);
            alert(`Failed to toggle plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleUninstall = async (pluginId: string) => {
        if (confirm('Are you sure you want to uninstall this plugin?')) {
            try {
                await uninstallPlugin(pluginId);
            } catch (error) {
                console.error('Failed to uninstall plugin:', error);
                alert(`Failed to uninstall plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="border-b border-border bg-background-secondary/50 backdrop-blur p-5">
                <h1 className="text-2xl font-bold text-foreground">Plugin Manager</h1>
                <p className="text-sm text-foreground-muted mt-1">Manage your installed plugins</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
                {installedPlugins.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-foreground-muted opacity-60">
                        <Settings className="w-12 h-12 mb-4" />
                        <p className="text-lg font-medium">No plugins installed</p>
                        <p className="text-sm">Visit the Marketplace to discover plugins</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {installedPlugins.map((item) => {
                            const { manifest, enabled } = item;

                            return (
                                <div
                                    key={manifest.id}
                                    className="bg-background-secondary/30 border border-border rounded-xl p-4 flex items-center gap-4 transition-all hover:border-border/80"
                                >
                                    {/* Icon Placeholder - we could reuse the icon logic from Marketplace if we extract it */}
                                    <div className="w-12 h-12 rounded-lg bg-background-tertiary flex items-center justify-center text-2xl overflow-hidden">
                                        {getPluginIcon(manifest)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-foreground">{manifest.name}</h3>
                                            <span className={cn(
                                                "text-[10px] px-1.5 py-0.5 rounded-full font-medium border",
                                                enabled
                                                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                                                    : "bg-background-tertiary text-foreground-muted border-border"
                                            )}>
                                                {enabled ? 'Active' : 'Disabled'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-foreground-muted truncate">{manifest.description}</p>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-foreground-muted/60">
                                            <span>v{manifest.version}</span>
                                            <span>•</span>
                                            <span>{manifest.author}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleEnable(manifest.id, enabled)}
                                            className={cn(
                                                "p-2 rounded-lg transition-colors",
                                                enabled
                                                    ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                                    : "bg-background-tertiary text-foreground-muted hover:text-foreground"
                                            )}
                                            title={enabled ? "Disable" : "Enable"}
                                        >
                                            {enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                                        </button>

                                        <button
                                            onClick={() => handleUninstall(manifest.id)}
                                            className="p-2 rounded-lg bg-red-500/5 text-foreground-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            title="Uninstall"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
