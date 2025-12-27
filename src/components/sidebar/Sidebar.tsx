import { useCallback, useState } from 'react';
import {
    FileText,
    Calendar,
    Search,
    Network,
    Settings,
    FolderOpen,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Bot,
    Store,
    Puzzle,
    RotateCw,
    CheckSquare,
    FolderPlus,
    GraduationCap,
} from 'lucide-react';
import { useUIStore, useVaultStore, useAIStore, usePluginStore, useSettingsStore } from '../../stores';
import { loadNotesMetadata } from '../../lib';
import logo from '../../assets/logo.png';
import { cn } from '../../lib';
import { NoteTree } from './NoteTree';
import { CreateNoteButton } from './CreateNote';
import { CalendarWidget } from '../../plugins/built-in/calendar/CalendarWidget';
import type { View } from '../../types';

interface NavItem {
    id: View;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    shortcut?: string;
}

const navItems: NavItem[] = [
    { id: 'editor', label: 'Notes', icon: FileText, shortcut: '⌘1' },
    { id: 'daily', label: 'Daily', icon: Calendar, shortcut: '⌘2' },
    { id: 'search', label: 'Search', icon: Search, shortcut: '⌘K' },
    { id: 'graph', label: 'Graph', icon: Network, shortcut: '⌘3' },
    { id: 'marketplace', label: 'Marketplace', icon: Store },
    { id: 'plugins', label: 'Plugins', icon: Puzzle },
];

export function Sidebar() {
    const { sidebarOpen, currentView, setCurrentView, toggleSidebar } = useUIStore();
    const { currentVault, noteMetadata, setNoteMetadata, isLoading } = useVaultStore();
    const { setIsOpen: setAiOpen, isOpen: aiOpen } = useAIStore();
    const { settings } = useSettingsStore();
    const { installed } = usePluginStore();

    const handleNavClick = useCallback((view: View) => {
        setCurrentView(view);
    }, [setCurrentView]);

    const filteredNavItems = navItems.filter(item => {
        if (item.id === 'daily') return settings.corePlugins['daily-notes'] !== false;
        if (item.id === 'graph') return settings.corePlugins['graph-view'] !== false;
        return true;
    });

    return (
        <aside
            className={cn(
                'flex flex-col h-full bg-background-secondary border-r border-border transition-all duration-200',
                sidebarOpen ? 'w-sidebar' : 'w-sidebar-collapsed'
            )}
        >
            {/* Header */}
            <div className={cn(
                "flex items-center p-4 border-b border-border",
                sidebarOpen ? "justify-between" : "justify-center"
            )}>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img src={logo} alt="Synaptic Logo" className="w-6 h-6 object-contain brightness-0 invert" />
                    </div>
                    {sidebarOpen && (
                        <span className="font-semibold text-foreground truncate">Synaptic</span>
                    )}
                </div>

                {sidebarOpen && (
                    <button
                        onClick={toggleSidebar}
                        className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-secondary hover:text-foreground transition-colors"
                        title="Collapse sidebar"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Expand button for collapsed state */}
            {!sidebarOpen && (
                <div className="flex justify-center p-2 border-b border-border">
                    <button
                        onClick={toggleSidebar}
                        className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-secondary hover:text-foreground transition-colors"
                        title="Expand sidebar"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Quick Actions */}
            {sidebarOpen && currentVault && (
                <div className="p-3 space-y-1">
                    <CreateNoteButton />
                </div>
            )}

            {/* Navigation */}
            <nav className="p-3 space-y-1 border-b border-border">
                {filteredNavItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                            currentView === item.id
                                ? 'bg-accent/10 text-accent'
                                : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
                        )}
                    >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        {sidebarOpen && (
                            <>
                                <span className="flex-1 text-left">{item.label}</span>
                                {item.shortcut && (
                                    <kbd className="text-2xs">{item.shortcut}</kbd>
                                )}
                            </>
                        )}
                    </button>
                ))}

                {/* Tasks Plugin Nav Item */}
                {installed.get('tasks')?.enabled && (
                    <button
                        onClick={() => setCurrentView('tasks')}
                        className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                            currentView === 'tasks'
                                ? 'bg-accent/10 text-accent'
                                : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
                        )}
                    >
                        <CheckSquare className="w-4 h-4 flex-shrink-0" />
                        {sidebarOpen && <span className="flex-1 text-left">Tasks</span>}
                    </button>
                )}

                {/* Study Plugin Nav Item */}
                {installed.get('spaced-repetition')?.enabled && (
                    <button
                        onClick={() => setCurrentView('study')}
                        className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                            currentView === 'study'
                                ? 'bg-accent/10 text-accent'
                                : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
                        )}
                    >
                        <GraduationCap className="w-4 h-4 flex-shrink-0" />
                        {sidebarOpen && <span className="flex-1 text-left">Study</span>}
                    </button>
                )}

                {/* AI Toggle */}
                <button
                    onClick={() => setAiOpen(!aiOpen)}
                    className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                        aiOpen
                            ? 'bg-accent/10 text-accent'
                            : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
                    )}
                >
                    <Bot className="w-4 h-4 flex-shrink-0" />
                    {sidebarOpen && <span className="flex-1 text-left">Ask AI</span>}
                </button>
            </nav>

            {/* Calendar Widget (Plugin) */}
            {sidebarOpen && installed.get('calendar')?.enabled && (
                <CalendarWidget />
            )}

            {/* Note Tree - Files section */}
            {sidebarOpen && currentVault && (
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <div className="px-3 py-2">
                        <h3 className="text-xs font-medium text-foreground-muted mb-1 px-2 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                Files
                                <span className="text-foreground-muted text-2xs font-normal">
                                    {noteMetadata.length}
                                </span>
                            </span>
                            <button
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    if (currentVault) {
                                        const notes = await loadNotesMetadata(currentVault.path);
                                        setNoteMetadata(notes);
                                    }
                                }}
                                className="p-1 rounded hover:bg-background-tertiary text-foreground-muted hover:text-foreground transition-all"
                                title="Refresh files"
                            >
                                <RotateCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                            </button>
                        </h3>
                        <NoteTree />
                    </div>
                </div>
            )}



            {/* Vault Info with Dropdown */}
            {sidebarOpen && currentVault && (
                <VaultDropdown />
            )}

            {/* Settings */}
            <div className="p-3 border-t border-border">
                <button
                    onClick={() => setCurrentView('settings')}
                    className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                        currentView === 'settings'
                            ? 'bg-accent/10 text-accent'
                            : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
                    )}
                >
                    <Settings className="w-4 h-4 flex-shrink-0" />
                    {sidebarOpen && <span>Settings</span>}
                </button>
            </div>
        </aside>
    );
}

function VaultDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const { currentVault, setCurrentVault, setNoteMetadata } = useVaultStore();

    const handleSwitchVault = async () => {
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
            const { loadNotesMetadata } = await import('../../lib');
            const notes = await loadNotesMetadata(selected);
            setNoteMetadata(notes);
        }
        setIsOpen(false);
    };

    const handleCreateVault = async () => {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
            directory: true,
            multiple: false,
            title: 'Select Folder for New Vault'
        });
        if (selected && typeof selected === 'string') {
            const vaultName = selected.split(/[/\\]/).pop() || 'New Vault';
            setCurrentVault({ name: vaultName, path: selected, noteCount: 0, lastOpened: new Date() });
            setNoteMetadata([]); // Empty vault
        }
        setIsOpen(false);
    };

    return (
        <div className="p-3 border-t border-border relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground-muted hover:bg-background-tertiary rounded-lg transition-colors"
            >
                <FolderOpen className="w-3.5 h-3.5" />
                <span className="truncate flex-1 text-left">{currentVault?.name}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <>
                    {/* Click-away overlay */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    {/* Dropdown menu */}
                    <div className="absolute bottom-full left-3 right-3 mb-1 bg-background-secondary border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                        <button
                            onClick={handleSwitchVault}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground-secondary hover:bg-background-tertiary transition-colors"
                        >
                            <FolderOpen className="w-4 h-4" />
                            Open Vault...
                        </button>
                        <button
                            onClick={handleCreateVault}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground-secondary hover:bg-background-tertiary transition-colors"
                        >
                            <FolderPlus className="w-4 h-4" />
                            Create New Vault
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
