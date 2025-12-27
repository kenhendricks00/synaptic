import type { Plugin, PluginCommand } from './types';

class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private enabledPlugins: Set<string> = new Set();
  private commandRegistry: Map<string, PluginCommand> = new Map();

  /**
   * Register a plugin
   */
  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} is already registered`);
      return;
    }

    this.plugins.set(plugin.id, plugin);

    // Register commands
    if (plugin.commands) {
      for (const command of plugin.commands) {
        this.commandRegistry.set(command.id, command);
      }
    }

    console.log(`Plugin ${plugin.name} registered`);
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    // Unregister commands
    if (plugin.commands) {
      for (const command of plugin.commands) {
        this.commandRegistry.delete(command.id);
      }
    }

    this.plugins.delete(pluginId);
    this.enabledPlugins.delete(pluginId);
    console.log(`Plugin ${plugin.name} unregistered`);
  }

  /**
   * Get a plugin by ID
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all enabled plugins
   */
  getEnabledPlugins(): Plugin[] {
    return Array.from(this.enabledPlugins)
      .map(id => this.plugins.get(id))
      .filter((plugin): plugin is Plugin => plugin !== undefined);
  }

  /**
   * Check if a plugin is enabled
   */
  isEnabled(pluginId: string): boolean {
    return this.enabledPlugins.has(pluginId);
  }

  /**
   * Enable a plugin
   */
  async enable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (this.enabledPlugins.has(pluginId)) {
      return;
    }

    try {
      await plugin.onEnable?.();
      this.enabledPlugins.add(pluginId);
      console.log(`Plugin ${plugin.name} enabled`);
    } catch (error) {
      console.error(`Failed to enable plugin ${plugin.name}:`, error);
      throw error;
    }
  }

  /**
   * Disable a plugin
   */
  async disable(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (!this.enabledPlugins.has(pluginId)) {
      return;
    }

    try {
      await plugin.onDisable?.();
      this.enabledPlugins.delete(pluginId);
      console.log(`Plugin ${plugin.name} disabled`);
    } catch (error) {
      console.error(`Failed to disable plugin ${plugin.name}:`, error);
      throw error;
    }
  }

  /**
   * Execute a plugin command
   */
  async executeCommand(commandId: string): Promise<void> {
    const command = this.commandRegistry.get(commandId);
    if (!command) {
      throw new Error(`Command ${commandId} not found`);
    }

    try {
      await command.handler();
    } catch (error) {
      console.error(`Failed to execute command ${commandId}:`, error);
      throw error;
    }
  }

  /**
   * Get all commands
   */
  getAllCommands(): PluginCommand[] {
    return Array.from(this.commandRegistry.values());
  }

  /**
   * Get commands for a specific plugin
   */
  getPluginCommands(pluginId: string): PluginCommand[] {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.commands) return [];

    return plugin.commands;
  }

  /**
   * Load all installed plugins
   */
  async loadPlugins(plugins: Plugin[]): Promise<void> {
    for (const plugin of plugins) {
      try {
        this.register(plugin);
        await plugin.onLoad?.();
      } catch (error) {
        console.error(`Failed to load plugin ${plugin.name}:`, error);
      }
    }
  }

  /**
   * Unload all plugins
   */
  async unloadAll(): Promise<void> {
    for (const pluginId of this.plugins.keys()) {
      try {
        await this.disable(pluginId);
        const plugin = this.plugins.get(pluginId);
        await plugin?.onUnload?.();
      } catch (error) {
        console.error(`Failed to unload plugin ${pluginId}:`, error);
      }
    }
    this.plugins.clear();
    this.commandRegistry.clear();
    this.enabledPlugins.clear();
  }
}

// Singleton instance
export const pluginManager = new PluginManager();
