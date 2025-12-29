import { useState } from 'react';
import { useSettingsStore, usePluginStore, useVaultStore } from '../stores';
import {
    Palette,
    Type,
    Brain,
    Calendar,
    RotateCcw,
    Settings as SettingsIcon,
    ChevronRight,
    Info,
    Github,
    ExternalLink,
    RefreshCw,
    AlertTriangle,
    User
} from 'lucide-react';
import { getPluginIcon } from './marketplace/icons';

type SettingsTab =
    | 'general'
    | 'personalization'
    | 'appearance'
    | 'editor'
    | 'ai'
    | 'daily-notes'
    | 'about'
    | `plugin:${string}`;

// Core plugins are "native" features we're exposing as toggles
const CORE_PLUGINS = [
    { id: 'backlinks', name: 'Backlinks', description: 'Show backlinks panel' },
    { id: 'graph-view', name: 'Graph View', description: 'Interactive note graph' },
    { id: 'daily-notes', name: 'Daily Notes', description: 'Quick daily note access' },
    { id: 'command-palette', name: 'Command Palette', description: 'Ctrl+K quick actions' },
    { id: 'quick-switcher', name: 'Quick Switcher', description: 'Fast note navigation' },
];

export function Settings() {
    const { settings, updateSettings, resetSettings } = useSettingsStore();
    const { getInstalledPlugins, enablePlugin, disablePlugin } = usePluginStore();
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');

    const installedPlugins = getInstalledPlugins();
    const corePluginStates = settings.corePlugins || {};

    const toggleCorePlugin = (id: string) => {
        updateSettings({
            corePlugins: {
                ...corePluginStates,
                [id]: !corePluginStates[id]
            }
        });
    };

    const toggleCommunityPlugin = async (pluginId: string, enabled: boolean) => {
        if (enabled) {
            await disablePlugin(pluginId);
        } else {
            await enablePlugin(pluginId);
        }
    };

    const renderContent = () => {
        if (activeTab === 'general') {
            return <GeneralSettings />;
        }
        if (activeTab === 'personalization') {
            return <PersonalizationSettings settings={settings} updateSettings={updateSettings} />;
        }
        if (activeTab === 'appearance') {
            return <AppearanceSettings settings={settings} updateSettings={updateSettings} />;
        }
        if (activeTab === 'editor') {
            return <EditorSettings settings={settings} updateSettings={updateSettings} />;
        }
        if (activeTab === 'ai') {
            return <AISettings settings={settings} updateSettings={updateSettings} />;
        }
        if (activeTab === 'daily-notes') {
            return <DailyNotesSettings settings={settings} updateSettings={updateSettings} />;
        }
        if (activeTab === 'about') {
            return <AboutSettings />;
        }
        if (activeTab.startsWith('plugin:')) {
            const pluginId = activeTab.replace('plugin:', '');
            const plugin = installedPlugins.find(p => p.manifest.id === pluginId);
            if (plugin) {
                return <PluginSettings plugin={plugin} />;
            }
        }
        return null;
    };

    return (
        <div className="h-full flex bg-background">
            {/* Left Sidebar */}
            <div className="w-64 border-r border-border overflow-y-auto">
                <div className="p-4 border-b border-border">
                    <h1 className="text-lg font-semibold text-foreground">Settings</h1>
                </div>

                {/* Options Section */}
                <div className="p-2">
                    <div className="text-xs font-semibold text-foreground-muted uppercase px-2 py-2">Options</div>
                    <NavItem icon={<SettingsIcon className="w-4 h-4" />} label="General" active={activeTab === 'general'} onClick={() => setActiveTab('general')} />
                    <NavItem icon={<User className="w-4 h-4" />} label="Personalization" active={activeTab === 'personalization'} onClick={() => setActiveTab('personalization')} />
                    <NavItem icon={<Palette className="w-4 h-4" />} label="Appearance" active={activeTab === 'appearance'} onClick={() => setActiveTab('appearance')} />
                    <NavItem icon={<Type className="w-4 h-4" />} label="Editor" active={activeTab === 'editor'} onClick={() => setActiveTab('editor')} />
                    <NavItem icon={<Brain className="w-4 h-4" />} label="AI" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
                    <NavItem icon={<Calendar className="w-4 h-4" />} label="Daily Notes" active={activeTab === 'daily-notes'} onClick={() => setActiveTab('daily-notes')} />
                    <NavItem icon={<Info className="w-4 h-4" />} label="About" active={activeTab === 'about'} onClick={() => setActiveTab('about')} />
                </div>

                {/* Core Plugins Section */}
                <div className="p-2 border-t border-border">
                    <div className="text-xs font-semibold text-foreground-muted uppercase px-2 py-2">Core Plugins</div>
                    {CORE_PLUGINS.map(cp => (
                        <div key={cp.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-background-secondary">
                            <span className="text-sm text-foreground-secondary">{cp.name}</span>
                            <Toggle checked={corePluginStates[cp.id]} onChange={() => toggleCorePlugin(cp.id)} />
                        </div>
                    ))}
                </div>

                {/* Community Plugins Section */}
                <div className="p-2 border-t border-border">
                    <div className="text-xs font-semibold text-foreground-muted uppercase px-2 py-2">Community Plugins</div>
                    {installedPlugins.length === 0 && (
                        <p className="text-xs text-foreground-muted px-2 py-1">No plugins installed</p>
                    )}
                    {installedPlugins.map(ip => (
                        <div
                            key={ip.manifest.id}
                            className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer group ${activeTab === `plugin:${ip.manifest.id}` ? 'bg-accent/10 text-accent' : 'hover:bg-background-secondary'}`}
                            onClick={() => setActiveTab(`plugin:${ip.manifest.id}`)}
                        >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-5 h-5 flex-shrink-0">{getPluginIcon(ip.manifest)}</div>
                                <span className="text-sm text-foreground-secondary truncate">{ip.manifest.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Toggle
                                    checked={ip.enabled}
                                    onChange={() => toggleCommunityPlugin(ip.manifest.id, ip.enabled)}
                                />
                                <ChevronRight className="w-4 h-4 text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Reset Button */}
                <div className="p-4 border-t border-border mt-auto">
                    <button
                        onClick={resetSettings}
                        className="flex items-center gap-2 w-full px-3 py-2 bg-background-tertiary hover:bg-red-500/20 text-foreground-secondary hover:text-red-400 rounded-lg text-sm transition-all justify-center"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset to Defaults
                    </button>
                </div>
            </div>

            {/* Right Content Pane */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

// --- Sub Components ---

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors ${active ? 'bg-accent/10 text-accent' : 'text-foreground-secondary hover:bg-background-secondary'}`}
        >
            {icon}
            {label}
        </button>
    );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onChange(); }}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-accent' : 'bg-background-tertiary'}`}
        >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
    );
}

// Module-level flag to prevent double factory reset (survives React Strict Mode)
let factoryResetInProgress = false;

function GeneralSettings() {
    const { currentVault, setCurrentVault, setNoteMetadata } = useVaultStore();
    const { updateSettings } = useSettingsStore();
    const [isResetting, setIsResetting] = useState(false);

    const handleChangeVault = async () => {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
            directory: true,
            multiple: false,
            title: 'Select Vault Folder'
        });
        if (selected && typeof selected === 'string') {
            const vaultName = selected.split(/[/\\]/).pop() || 'Vault';
            setCurrentVault({ name: vaultName, path: selected, noteCount: 0, lastOpened: new Date() });
            // Load notes from the new vault
            const { loadNotesMetadata } = await import('../lib');
            const notes = await loadNotesMetadata(selected);
            setNoteMetadata(notes);
        }
    };

    const handleResetOnboarding = () => {
        updateSettings({ onboardingCompleted: false });
        // Auto-refresh to trigger onboarding
        window.location.reload();
    };

    const handleFactoryReset = async () => {
        // Prevent double execution
        if (factoryResetInProgress) return;
        factoryResetInProgress = true;
        setIsResetting(true);

        // 1. Reset Plugins
        await usePluginStore.getState().reset();

        // 2. Reset Vault
        useVaultStore.getState().reset();

        // 3. Reset Settings
        useSettingsStore.getState().resetSettings();

        // 4. Force reload to ensure clean state and trigger onboarding
        window.location.reload();
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">General</h2>

            <div className="p-4 bg-background-secondary rounded-lg border border-border">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-sm font-medium text-foreground block">Current Vault</span>
                        <span className="text-xs text-foreground-muted">{currentVault?.path || 'No vault selected'}</span>
                    </div>
                    <button
                        onClick={handleChangeVault}
                        className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Change Vault
                    </button>
                </div>
            </div>

            <div className="p-4 bg-background-secondary rounded-lg border border-border">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-sm font-medium text-foreground block">Onboarding</span>
                        <span className="text-xs text-foreground-muted">View the welcome tutorial again</span>
                    </div>
                    <button
                        onClick={handleResetOnboarding}
                        className="px-4 py-2 bg-background-tertiary hover:bg-background-secondary border border-border text-foreground-secondary rounded-lg text-sm font-medium transition-colors"
                    >
                        Reset Onboarding
                    </button>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-error uppercase tracking-wider mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Danger Zone
                </h3>
                <div className="p-4 bg-error/5 rounded-lg border border-error/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm font-medium text-foreground block">Factory Reset</span>
                            <span className="text-xs text-foreground-muted">Disconnect vault, remove plugins, and reset all settings</span>
                        </div>
                        <button
                            onClick={handleFactoryReset}
                            disabled={isResetting}
                            className="flex items-center gap-2 px-4 py-2 bg-error hover:bg-error/90 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
                            {isResetting ? 'Resetting...' : 'Factory Reset'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PersonalizationSettings({ settings, updateSettings }: { settings: any; updateSettings: (s: any) => void }) {
    const [localName, setLocalName] = useState(settings.userName || '');
    const [localBirthday, setLocalBirthday] = useState(settings.userBirthday || '');

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalName(e.target.value);
    };

    const handleNameBlur = () => {
        updateSettings({ userName: localName.trim() });
    };

    const handleBirthdayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalBirthday(e.target.value);
        updateSettings({ userBirthday: e.target.value });
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Personalization</h2>
            <p className="text-sm text-foreground-muted">Customize how Synaptic addresses you and remembers important dates.</p>

            {/* Your Name */}
            <div className="p-4 bg-background-secondary rounded-lg border border-border">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-sm font-medium text-foreground block">Your Name</span>
                        <span className="text-xs text-foreground-muted">Used for personalized AI greetings</span>
                    </div>
                    <input
                        type="text"
                        value={localName}
                        onChange={handleNameChange}
                        onBlur={handleNameBlur}
                        placeholder="Enter your name"
                        className="px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent w-48"
                    />
                </div>
            </div>

            {/* Birthday */}
            <div className="p-4 bg-background-secondary rounded-lg border border-border">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-sm font-medium text-foreground block">Birthday</span>
                        <span className="text-xs text-foreground-muted">Get a special greeting on your birthday!</span>
                    </div>
                    <input
                        type="date"
                        value={localBirthday}
                        onChange={handleBirthdayChange}
                        className="px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    />
                </div>
            </div>
        </div>
    );
}

function AppearanceSettings({ settings, updateSettings }: { settings: any; updateSettings: (s: any) => void }) {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Appearance</h2>
            <SettingRow label="Theme">
                <select value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value })} className="px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 min-w-[120px] cursor-pointer hover:border-border-hover transition-colors">
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="oled">OLED (True Black)</option>
                    <option value="catppuccin">Catppuccin</option>
                    <option value="system">System</option>
                </select>
            </SettingRow>
            <SettingRow label="Font Size">
                <div className="flex items-center gap-3">
                    <input type="range" min="12" max="24" value={settings.fontSize} onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })} className="w-32 accent-accent" />
                    <span className="text-sm text-foreground-secondary w-8">{settings.fontSize}px</span>
                </div>
            </SettingRow>
            <SettingRow label="Font Family">
                <select value={settings.fontFamily} onChange={(e) => updateSettings({ fontFamily: e.target.value })} className="px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 min-w-[120px] cursor-pointer hover:border-border-hover transition-colors">
                    <option value="Inter">Inter</option>
                    <option value="system-ui">System UI</option>
                    <option value="Georgia">Georgia</option>
                    <option value="monospace">Monospace</option>
                </select>
            </SettingRow>
            <SettingRow label="Line Height">
                <div className="flex items-center gap-3">
                    <input type="range" min="1" max="2.5" step="0.1" value={settings.lineHeight} onChange={(e) => updateSettings({ lineHeight: parseFloat(e.target.value) })} className="w-32 accent-accent" />
                    <span className="text-sm text-foreground-secondary w-12">{settings.lineHeight}</span>
                </div>
            </SettingRow>
        </div>
    );
}

function EditorSettings({ settings, updateSettings }: { settings: any; updateSettings: (s: any) => void }) {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Editor</h2>
            <ToggleSetting label="Auto Save" description="Automatically save changes while typing" checked={settings.autoSave} onChange={(checked) => updateSettings({ autoSave: checked })} />
            {settings.autoSave && (
                <SettingRow label="Auto Save Interval">
                    <div className="flex items-center gap-3">
                        <input type="range" min="1000" max="10000" step="500" value={settings.autoSaveInterval} onChange={(e) => updateSettings({ autoSaveInterval: parseInt(e.target.value) })} className="w-32 accent-accent" />
                        <span className="text-sm text-foreground-secondary w-16">{settings.autoSaveInterval / 1000}s</span>
                    </div>
                </SettingRow>
            )}
            <ToggleSetting label="Show Word Count" description="Display word and character count in editor" checked={settings.showWordCount} onChange={(checked) => updateSettings({ showWordCount: checked })} />
            <ToggleSetting label="Spell Check" description="Enable spell checking in the editor" checked={settings.spellCheck} onChange={(checked) => updateSettings({ spellCheck: checked })} />
        </div>
    );
}

function AISettings({ settings, updateSettings }: { settings: any; updateSettings: (s: any) => void }) {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">AI</h2>
            <SettingRow label="Ollama Endpoint">
                <input type="text" value={settings.ollamaEndpoint} onChange={(e) => updateSettings({ ollamaEndpoint: e.target.value })} placeholder="http://localhost:11434" className="px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 w-72 placeholder:text-foreground-muted hover:border-border-hover transition-colors" />
            </SettingRow>
            <SettingRow label="Chat Model">
                <input type="text" value={settings.ollamaModel} onChange={(e) => updateSettings({ ollamaModel: e.target.value })} placeholder="llama3.1:8b" className="px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 w-72 placeholder:text-foreground-muted hover:border-border-hover transition-colors" />
            </SettingRow>
            <SettingRow label="Embedding Model">
                <input type="text" value={settings.embeddingModel} onChange={(e) => updateSettings({ embeddingModel: e.target.value })} placeholder="nomic-embed-text" className="px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 w-72 placeholder:text-foreground-muted hover:border-border-hover transition-colors" />
            </SettingRow>

            <div className="pt-6 border-t border-border space-y-4">
                <div>
                    <h3 className="text-sm font-semibold text-foreground-secondary uppercase">Memory Support</h3>
                    <p className="text-xs text-foreground-muted mt-1">
                        Instructions or context that the AI should always keep in mind.
                        Useful for persistent personality, preferences, or project context.
                    </p>
                </div>
                <textarea
                    value={settings.aiMemory}
                    onChange={(e) => updateSettings({ aiMemory: e.target.value })}
                    placeholder="e.g. 'Always respond in a concise, technical manner. I am a software engineer working on a TypeScript project...'"
                    rows={6}
                    className="w-full px-4 py-3 bg-background-tertiary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none placeholder:text-foreground-muted hover:border-border-hover transition-colors"
                />
            </div>
        </div>
    );
}

function DailyNotesSettings({ settings, updateSettings }: { settings: any; updateSettings: (s: any) => void }) {
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Daily Notes</h2>
            <SettingRow label="Daily Notes Folder">
                <input type="text" value={settings.dailyNotesFolder} onChange={(e) => updateSettings({ dailyNotesFolder: e.target.value })} placeholder="daily" className="px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 w-72 placeholder:text-foreground-muted hover:border-border-hover transition-colors" />
            </SettingRow>
            <SettingRow label="Default Template">
                <textarea value={settings.defaultNoteTemplate} onChange={(e) => updateSettings({ defaultNoteTemplate: e.target.value })} placeholder="# {{date}}&#10;&#10;## Tasks..." rows={4} className="px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 w-96 resize-none font-mono placeholder:text-foreground-muted hover:border-border-hover transition-colors" />
            </SettingRow>
        </div>
    );
}

function PluginSettings({ plugin }: { plugin: any }) {
    const { updatePluginSettings } = usePluginStore();
    const settings = plugin.settings || {};
    // Read from manifest (persists correctly) or fallback to plugin instance
    const schema = plugin.manifest?.settingsSchema || plugin.plugin?.settingsSchema || [];

    const handleChange = (key: string, value: any) => {
        updatePluginSettings(plugin.manifest.id, { [key]: value });
    };

    const getValue = (key: string, defaultValue: any) => {
        return settings[key] !== undefined ? settings[key] : defaultValue;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10">{getPluginIcon(plugin.manifest)}</div>
                <div>
                    <h2 className="text-xl font-semibold text-foreground">{plugin.manifest.name}</h2>
                    <p className="text-sm text-foreground-muted">v{plugin.manifest.version} by {plugin.manifest.author}</p>
                </div>
            </div>
            <p className="text-foreground-secondary">{plugin.manifest.description}</p>

            {schema.length > 0 ? (
                <div className="pt-4 border-t border-border space-y-4">
                    <h3 className="text-sm font-semibold text-foreground-secondary uppercase">Settings</h3>
                    {schema.map((setting: any) => (
                        <div key={setting.key} className="space-y-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm text-foreground-secondary">{setting.label}</span>
                                    {setting.description && (
                                        <p className="text-xs text-foreground-muted">{setting.description}</p>
                                    )}
                                </div>
                                {setting.type === 'toggle' && (
                                    <button
                                        onClick={() => handleChange(setting.key, !getValue(setting.key, setting.default))}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${getValue(setting.key, setting.default) ? 'bg-accent' : 'bg-background-tertiary'}`}
                                    >
                                        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${getValue(setting.key, setting.default) ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                )}
                                {setting.type === 'text' && (
                                    <input
                                        type="text"
                                        value={getValue(setting.key, setting.default)}
                                        onChange={(e) => handleChange(setting.key, e.target.value)}
                                        className="px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 w-72"
                                    />
                                )}
                                {setting.type === 'number' && (
                                    <input
                                        type="number"
                                        value={getValue(setting.key, setting.default)}
                                        onChange={(e) => handleChange(setting.key, parseInt(e.target.value))}
                                        min={setting.min}
                                        max={setting.max}
                                        className="px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 w-24"
                                    />
                                )}
                                {setting.type === 'select' && (
                                    <select
                                        value={getValue(setting.key, setting.default)}
                                        onChange={(e) => handleChange(setting.key, e.target.value)}
                                        className="px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                                    >
                                        {setting.options?.map((opt: any) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            {setting.type === 'textarea' && (
                                <textarea
                                    value={getValue(setting.key, setting.default)}
                                    onChange={(e) => handleChange(setting.key, e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 bg-background-tertiary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none font-mono"
                                />
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="pt-4 border-t border-border">
                    <p className="text-sm text-foreground-muted">This plugin has no configurable settings.</p>
                </div>
            )}
        </div>
    );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-2">
            <span className="text-sm text-foreground-secondary">{label}</span>
            {children}
        </div>
    );
}

function ToggleSetting({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (c: boolean) => void }) {
    return (
        <div className="flex items-center justify-between py-2">
            <div className="flex-1">
                <span className="text-sm text-foreground-secondary block">{label}</span>
                <span className="text-xs text-foreground-muted mt-0.5">{description}</span>
            </div>
            <button onClick={() => onChange(!checked)} className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-background-tertiary'}`}>
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
    );
}

const APP_VERSION = '1.0.2';
const GITHUB_REPO = 'kenhendricks00/synaptic';

function AboutSettings() {
    const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'up-to-date' | 'update-available' | 'error'>('idle');
    const [latestVersion, setLatestVersion] = useState<string | null>(null);

    const checkForUpdates = async () => {
        setUpdateStatus('checking');
        try {
            const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
            if (response.ok) {
                const data = await response.json();
                const latest = data.tag_name?.replace('v', '') || data.name;
                setLatestVersion(latest);
                if (latest && latest !== APP_VERSION) {
                    setUpdateStatus('update-available');
                } else {
                    setUpdateStatus('up-to-date');
                }
            } else {
                setUpdateStatus('error');
            }
        } catch (e) {
            console.error('Failed to check for updates:', e);
            setUpdateStatus('error');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">About</h2>

            {/* App Info */}
            <div className="bg-background-secondary rounded-xl p-6 border border-border text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center overflow-hidden">
                    <img src="/src/assets/logo.png" alt="Synaptic" className="w-10 h-10 object-contain brightness-0 invert" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-1">Synaptic</h3>
                <p className="text-sm text-foreground-muted mb-4">Version {APP_VERSION}</p>
                <p className="text-foreground-secondary text-sm">
                    Your intelligent, local-first knowledge companion
                </p>
            </div>

            {/* Author Info */}
            <div className="bg-background-secondary rounded-xl p-4 border border-border">
                <h3 className="text-sm font-semibold text-foreground-secondary uppercase mb-3">Created By</h3>
                <div className="flex items-center gap-3">
                    <img
                        src="https://avatars.githubusercontent.com/u/50819541?v=4"
                        alt="Kenneth Hendricks"
                        className="w-10 h-10 rounded-full"
                    />
                    <div>
                        <p className="font-medium text-foreground">Kenneth Hendricks</p>
                        <p className="text-sm text-foreground-muted">@kenhendricks00</p>
                    </div>
                </div>
            </div>

            {/* Links */}
            <div className="bg-background-secondary rounded-xl p-4 border border-border space-y-2">
                <h3 className="text-sm font-semibold text-foreground-secondary uppercase mb-3">Links</h3>
                <a
                    href={`https://github.com/${GITHUB_REPO}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-background-tertiary transition-colors"
                >
                    <Github className="w-5 h-5 text-foreground-secondary" />
                    <span className="text-sm text-foreground-secondary">GitHub Repository</span>
                    <ExternalLink className="w-4 h-4 text-foreground-muted ml-auto" />
                </a>
            </div>

            {/* Updates */}
            <div className="bg-background-secondary rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground-secondary uppercase mb-1">Updates</h3>
                        {updateStatus === 'idle' && (
                            <p className="text-sm text-foreground-muted">Click to check for updates</p>
                        )}
                        {updateStatus === 'checking' && (
                            <p className="text-sm text-foreground-muted flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Checking...
                            </p>
                        )}
                        {updateStatus === 'up-to-date' && (
                            <p className="text-sm text-green-500">You're on the latest version!</p>
                        )}
                        {updateStatus === 'update-available' && (
                            <div>
                                <p className="text-sm text-accent">Update available: v{latestVersion}</p>
                                <a
                                    href={`https://github.com/${GITHUB_REPO}/releases/latest`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-accent hover:underline"
                                >
                                    Download from GitHub
                                </a>
                            </div>
                        )}
                        {updateStatus === 'error' && (
                            <p className="text-sm text-red-400">Failed to check for updates</p>
                        )}
                    </div>
                    <button
                        onClick={checkForUpdates}
                        disabled={updateStatus === 'checking'}
                        className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Check for Updates
                    </button>
                </div>
            </div>

            {/* Tech Stack */}
            <div className="text-center text-xs text-foreground-muted">
                Built with React, Tauri, and love
            </div>
        </div>
    );
}
