import { useEffect, useState } from 'react';
import {
  Search,
  Loader2,
  Trash2,
  Power,
  PowerOff,
  ExternalLink,
  GitFork,
  ShieldCheck,
  Zap,
  BarChart3,
  Link2,
  Cpu,
  Wrench,
  Sparkles,
  Download,
  Star,
  Users,
  Clock,
} from 'lucide-react';
import { usePluginStore } from '../../plugins';
import { cn } from '../../lib';
import { getPluginIcon } from './icons';
import type { PluginManifest } from '../../plugins/types';

export function Marketplace() {
  const {
    available,
    installed,
    isLoading,
    error,
    loadAvailablePlugins,
    installPlugin,
    uninstallPlugin,
    enablePlugin,
    disablePlugin,
  } = usePluginStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadAvailablePlugins();
  }, []);

  const filteredPlugins = available.filter((plugin) => {
    const matchesSearch =
      plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || plugin.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', label: 'All', icon: Sparkles, color: 'text-yellow-400' },
    { id: 'productivity', label: 'Productivity', icon: Zap, color: 'text-orange-400' },
    { id: 'visualization', label: 'Visualization', icon: BarChart3, color: 'text-blue-400' },
    { id: 'integration', label: 'Integration', icon: Link2, color: 'text-green-400' },
    { id: 'ai', label: 'AI', icon: Cpu, color: 'text-purple-400' },
    { id: 'utility', label: 'Utility', icon: Wrench, color: 'text-gray-400' },
  ];

  // Helper to render icon for plugin card
  // Logic extracted to ./icons.tsx
  /*
    const getPluginIcon = ...
  */

  const isInstalled = (pluginId: string) => {
    return installed.has(pluginId);
  };

  const isPluginEnabled = (pluginId: string) => {
    const plugin = installed.get(pluginId);
    return plugin?.enabled ?? false;
  };

  const handleInstall = async (plugin: PluginManifest) => {
    try {
      // For now, we'll use placeholder plugin objects
      // In production, this would fetch the plugin code from the registry
      const pluginCode = await import(`../../plugins/built-in/${plugin.id}/index`).catch(() => null);

      if (!pluginCode) {
        throw new Error('Plugin not available');
      }

      const pluginInstance = new pluginCode.default();
      await installPlugin(plugin, pluginInstance);
    } catch (error) {
      console.error('Failed to install plugin:', error);
      alert(`Failed to install plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background-secondary/50 backdrop-blur">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Plugin Marketplace</h1>
              <p className="text-sm text-foreground-muted mt-1">Extend Synaptic with community plugins</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-foreground-muted/70 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-5 pb-4 flex gap-2 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all border border-border/50',
                selectedCategory === category.id
                  ? 'bg-accent text-white border-accent'
                  : 'bg-background-tertiary/50 text-foreground-muted hover:text-foreground hover:bg-background-tertiary'
              )}
            >
              <category.icon className={cn("w-4 h-4", selectedCategory === category.id ? "text-white" : category.color)} />
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-error">Failed to load plugins: {error}</p>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPlugins.map((plugin) => {
              const installedPlugin = isInstalled(plugin.id);
              const enabledPlugin = isPluginEnabled(plugin.id);

              return (
                <div
                  key={plugin.id}
                  className="bg-gradient-to-br from-background-secondary to-background border border-border rounded-2xl p-5 hover:border-border/80 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-3xl flex-shrink-0">
                      {getPluginIcon(plugin)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{plugin.name}</h3>
                        {plugin.isOfficial && (
                          <ShieldCheck className="w-4 h-4 text-accent" />
                        )}
                        {plugin.isComingSoon && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-accent/10 border border-accent/20 rounded-full text-[10px] font-bold text-accent uppercase tracking-wider animate-pulse">
                            <Sparkles className="w-2.5 h-2.5" />
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground-muted mb-3">{plugin.description}</p>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-foreground-muted/70 mb-4">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {(plugin.downloads / 1000).toFixed(1)}k
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                          {plugin.rating.toFixed(1)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(plugin.lastUpdated).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {plugin.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-background-tertiary/50 border border-border/50 rounded-md text-[10px] text-foreground-muted font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {installedPlugin ? (
                          <>
                            <button
                              onClick={() => handleToggleEnable(plugin.id, enabledPlugin)}
                              className={cn(
                                'flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all',
                                enabledPlugin
                                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                  : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              )}
                            >
                              {enabledPlugin ? (
                                <>
                                  <PowerOff className="w-3.5 h-3.5" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <Power className="w-3.5 h-3.5" />
                                  Enable
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleUninstall(plugin.id)}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-foreground-muted hover:text-red-400 transition-all"
                              title="Uninstall"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : plugin.isComingSoon ? (
                          <button
                            disabled
                            className="flex-1 px-3 py-2 bg-background-tertiary border border-border text-foreground-muted rounded-lg text-sm font-medium flex items-center justify-center gap-2 cursor-not-allowed"
                          >
                            <Clock className="w-4 h-4" />
                            Coming Soon
                          </button>
                        ) : (
                          <button
                            onClick={() => handleInstall(plugin)}
                            className="flex-1 px-3 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-accent/25"
                          >
                            <Download className="w-4 h-4" />
                            Install
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Links */}
                  {(plugin.repository || plugin.homepage) && (
                    <div className="mt-4 pt-4 border-t border-border/50 flex gap-2">
                      {plugin.homepage && (
                        <a
                          href={plugin.homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-foreground-muted hover:text-accent flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Homepage
                        </a>
                      )}
                      {plugin.repository && (
                        <a
                          href={plugin.repository}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-foreground-muted hover:text-accent flex items-center gap-1 transition-colors"
                        >
                          <GitFork className="w-3 h-3" />
                          Repository
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
