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
          let pluginToRegister = plugin;

          // DYNAMIC LOADER: If no plugin instance is provided but we have a download Url
          // (This happens when clicking Install on a remote plugin)
          if (!plugin && manifest.downloadUrl) {
            console.log(`[Store] Downloading plugin ${manifest.id} from ${manifest.downloadUrl}`);

            const response = await fetch(manifest.downloadUrl);
            if (!response.ok) throw new Error(`Failed to download plugin: ${response.statusText}`);

            const code = await response.text();

            // Load it!
            const { loadExternalPlugin } = await import('./loader');
            pluginToRegister = await loadExternalPlugin(manifest.id, code);

            // Persistence: Save 'code' to disk
            try {
              const { writeTextFile, BaseDirectory, exists, mkdir } = await import('@tauri-apps/plugin-fs');
              const pluginDir = 'plugins';

              // Ensure plugins dir exists
              if (!await exists(pluginDir, { baseDir: BaseDirectory.AppConfig })) {
                await mkdir(pluginDir, { baseDir: BaseDirectory.AppConfig, recursive: true });
              }

              const fileName = `${pluginDir}/${manifest.id}.js`;
              await writeTextFile(fileName, code, { baseDir: BaseDirectory.AppConfig });
              console.log(`[Store] Saved plugin ${manifest.id} to ${fileName}`);
            } catch (fsErr) {
              console.error('[Store] Failed to persist plugin to disk:', fsErr);
            }
          }

          if (!pluginToRegister) {
            throw new Error("No plugin code provided and no download URL found.");
          }

          // Register with plugin manager
          pluginManager.register(pluginToRegister);

          // Add to installed
          const { installed } = get();
          const newInstalled = new Map(installed);
          newInstalled.set(manifest.id, {
            manifest,
            plugin: pluginToRegister,
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
          console.error("Install failed:", error);
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
                let pluginInstance = null;

                // 1. Try Built-in
                try {
                  const module = await import(`./built-in/${id}/index`).catch(() => null);
                  if (module && module.default) {
                    pluginInstance = new module.default();
                  }
                } catch (e) { /* Not built-in */ }

                // 2. Try External (Dynamic)
                if (!pluginInstance) {
                  try {
                    const { readTextFile, BaseDirectory, exists } = await import('@tauri-apps/plugin-fs');
                    const pluginPath = `plugins/${id}.js`;

                    if (await exists(pluginPath, { baseDir: BaseDirectory.AppConfig })) {
                      console.log(`[Store] Found external plugin on disk: ${id}`);
                      const code = await readTextFile(pluginPath, { baseDir: BaseDirectory.AppConfig });
                      const { loadExternalPlugin } = await import('./loader');
                      pluginInstance = await loadExternalPlugin(id, code);
                    }
                  } catch (extErr) {
                    console.warn(`[Store] Failed to load external plugin ${id} from disk:`, extErr);
                  }
                }

                if (pluginInstance) {
                  // Update the plugin instance in the store
                  installedPlugin.plugin = pluginInstance;

                  // Register and enable if needed
                  pluginManager.register(pluginInstance);
                  if (installedPlugin.enabled) {
                    await pluginManager.enable(id);
                  }
                  console.log(`[PluginStore] Rehydrated plugin: ${id}`);
                } else {
                  console.warn(`[PluginStore] Could not find plugin code for ${id}`);
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
