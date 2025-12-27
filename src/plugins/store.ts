import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Plugin, PluginManifest, InstalledPlugin } from './types';
import { pluginManager } from './manager';

interface PluginStore {
  installed: Map<string, InstalledPlugin>;
  available: PluginManifest[];
  isLoading: boolean;
  error: string | null;

  // Actions
  installPlugin: (manifest: PluginManifest, plugin: Plugin) => Promise<void>;
  uninstallPlugin: (pluginId: string) => Promise<void>;
  enablePlugin: (pluginId: string) => Promise<void>;
  disablePlugin: (pluginId: string) => Promise<void>;
  updatePluginSettings: (pluginId: string, settings: Record<string, any>) => void;
  loadAvailablePlugins: () => Promise<void>;
  getInstalledPlugins: () => InstalledPlugin[];
  reset: () => Promise<void>;
}

export const usePluginStore = create<PluginStore>()(
  persist(
    (set, get) => ({
      installed: new Map(),
      available: [],
      isLoading: false,
      error: null,

      installPlugin: async (manifest, plugin) => {
        set({ isLoading: true, error: null });

        try {
          // Register with plugin manager
          pluginManager.register(plugin);

          // Add to installed
          const { installed } = get();
          const newInstalled = new Map(installed);
          newInstalled.set(manifest.id, {
            manifest,
            plugin,
            enabled: false,
            installedAt: new Date(),
          });

          set({ installed: newInstalled, isLoading: false });

          // Auto-enable if no permissions issues
          await pluginManager.enable(manifest.id);

          const updated = get().installed;
          const installedPlugin = updated.get(manifest.id);
          if (installedPlugin) {
            installedPlugin.enabled = true;
            set({ installed: updated });
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to install plugin',
          });
          throw error;
        }
      },

      uninstallPlugin: async (pluginId) => {
        set({ isLoading: true, error: null });

        try {
          const { installed } = get();
          const installedPlugin = installed.get(pluginId);

          if (!installedPlugin) {
            throw new Error('Plugin not installed');
          }

          // Disable if enabled
          if (installedPlugin.enabled) {
            await pluginManager.disable(pluginId);
          }

          // Unregister from plugin manager
          pluginManager.unregister(pluginId);

          // Remove from installed
          const newInstalled = new Map(installed);
          newInstalled.delete(pluginId);

          set({ installed: newInstalled, isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to uninstall plugin',
          });
          throw error;
        }
      },

      enablePlugin: async (pluginId) => {
        set({ isLoading: true, error: null });

        try {
          await pluginManager.enable(pluginId);

          const { installed } = get();
          const installedPlugin = installed.get(pluginId);
          if (installedPlugin) {
            installedPlugin.enabled = true;
            set({ installed, isLoading: false });
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to enable plugin',
          });
          throw error;
        }
      },

      disablePlugin: async (pluginId) => {
        set({ isLoading: true, error: null });

        try {
          await pluginManager.disable(pluginId);

          const { installed } = get();
          const installedPlugin = installed.get(pluginId);
          if (installedPlugin) {
            installedPlugin.enabled = false;
            set({ installed, isLoading: false });
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to disable plugin',
          });
          throw error;
        }
      },

      updatePluginSettings: (pluginId, settings) => {
        const { installed } = get();
        const installedPlugin = installed.get(pluginId);

        if (installedPlugin) {
          installedPlugin.settings = { ...installedPlugin.settings, ...settings };
          set({ installed });
        }
      },

      loadAvailablePlugins: async () => {
        set({ isLoading: true, error: null });

        try {
          // In a real app, this would fetch from a remote marketplace
          // For now, we'll use the local registry
          const { getAvailablePlugins } = await import('./registry');
          const plugins = await getAvailablePlugins();

          set({ available: plugins, isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load available plugins',
          });
        }
      },

      getInstalledPlugins: () => {
        return Array.from(get().installed.values());
      },

      reset: async () => {
        set({ isLoading: true, error: null });
        try {
          const { installed } = get();
          for (const pluginId of installed.keys()) {
            try {
              await pluginManager.disable(pluginId);
              pluginManager.unregister(pluginId);
            } catch (e) {
              console.error(`Failed to cleanup plugin ${pluginId}:`, e);
            }
          }
          set({ installed: new Map(), isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to reset plugins',
          });
        }
      },
    }),
    {
      name: 'synaptic-plugins',
      partialize: (state) => ({
        // Serialize Map to array for persistence
        installed: Array.from(state.installed.entries()),
        available: state.available,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert array back to Map
          state.installed = new Map(state.installed as any);

          // Re-register all installed plugins with the in-memory pluginManager
          // We need to re-instantiate them because serialization loses methods
          const rehydrate = async () => {
            const entries = Array.from(state.installed.entries());
            for (const [id, installedPlugin] of entries) {
              try {
                // Try to re-import the plugin class
                const module = await import(`./built-in/${id}/index`).catch(() => null);
                if (module && module.default) {
                  const pluginInstance = new module.default();
                  // Update the plugin instance in the store
                  installedPlugin.plugin = pluginInstance;

                  // Register and enable if needed
                  pluginManager.register(pluginInstance);
                  if (installedPlugin.enabled) {
                    await pluginManager.enable(id);
                  }
                  console.log(`[PluginStore] Rehydrated plugin: ${id}`);
                } else {
                  console.warn(`[PluginStore] Could not find built-in plugin code for ${id}`);
                  // Fallback to what we have (though it might be broken)
                  if (installedPlugin.plugin) {
                    pluginManager.register(installedPlugin.plugin);
                  }
                }
              } catch (error) {
                console.error(`[PluginStore] Failed to rehydrate plugin ${id}:`, error);
              }
            }
            // Force a state update to ensure components re-render with the new instances
            usePluginStore.setState({ installed: new Map(state.installed) });
          };

          rehydrate();
        }
      },
    }
  )
);
