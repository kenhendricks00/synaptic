import type { ReactNode } from 'react';

/**
 * Plugin setting definition for declarative settings UI
 */
export interface PluginSettingDefinition {
  key: string;
  type: 'text' | 'number' | 'toggle' | 'select' | 'textarea';
  label: string;
  description?: string;
  default: any;
  options?: { value: string; label: string }[]; // For select type
  min?: number;
  max?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  icon?: ReactNode;
  onSelect: () => void | Promise<void>;
  priority?: number; // Higher is better
}

/**
 * Plugin interface - all plugins must implement this
 */
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: ReactNode;
  category: 'productivity' | 'visualization' | 'integration' | 'ai' | 'utility';
  tags: string[];
  screenshots?: string[];
  repository?: string;
  homepage?: string;
  permissions: PluginPermission[];

  // Declarative settings schema
  settingsSchema?: PluginSettingDefinition[];

  // Dynamic search capability
  onSearch?: (query: string) => Promise<SearchResult[] | null>;

  // Lifecycle hooks
  onLoad?: () => void | Promise<void>;
  onUnload?: () => void | Promise<void>;
  onEnable?: () => void | Promise<void>;
  onDisable?: () => void | Promise<void>;

  // Plugin components
  components?: {
    toolbar?: React.ComponentType;
    sidebar?: React.ComponentType;
    view?: React.ComponentType;
    settings?: React.ComponentType;
  };

  // Plugin actions/commands
  commands?: PluginCommand[];

  // Plugin data storage key (for persistence)
  storageKey?: string;
}

/**
 * Plugin permissions
 */
export type PluginPermission =
  | 'read_notes'
  | 'write_notes'
  | 'read_vault'
  | 'write_vault'
  | 'network'
  | 'storage'
  | 'ui';

/**
 * Plugin command that can be triggered via keyboard or UI
 */
export interface PluginCommand {
  id: string;
  name: string;
  description: string;
  keyboard?: string;
  handler: () => void;
}

/**
 * Plugin manifest (metadata for marketplace)
 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  category: 'productivity' | 'visualization' | 'integration' | 'ai' | 'utility';
  tags: string[];
  screenshots?: string[];
  repository?: string;
  homepage?: string;
  downloads: number;
  rating: number;
  lastUpdated: Date;
  isOfficial: boolean;
  isComingSoon?: boolean;
  permissions: PluginPermission[];
  minAppVersion: string;
  maxAppVersion?: string;
  settingsSchema?: PluginSettingDefinition[];
}

/**
 * Installed plugin state
 */
export interface InstalledPlugin {
  manifest: PluginManifest;
  plugin: Plugin;
  enabled: boolean;
  installedAt: Date;
  settings?: Record<string, any>;
}

/**
 * Plugin registry state
 */
export interface PluginRegistry {
  installed: Map<string, InstalledPlugin>;
  available: PluginManifest[];
}
