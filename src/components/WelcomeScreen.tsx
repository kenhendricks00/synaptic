import { useState } from 'react';
import { FolderOpen, Sparkles, Shield, Zap, Settings } from 'lucide-react';
import { selectVaultFolder, loadVault, loadNotesMetadata } from '../lib';
import { useVaultStore, useUIStore } from '../stores';
import logo from '../assets/logo.png';

export function WelcomeScreen() {
    const { setCurrentVault, setNoteMetadata, setLoading, setError, autoLoadFolder, setAutoLoadFolder } = useVaultStore();
    const { setCurrentView } = useUIStore();
    const [showSettings, setShowSettings] = useState(false);

    const handleOpenVault = async () => {
        try {
            setLoading(true);
            setError(null);

            const folderPath = await selectVaultFolder();
            if (!folderPath) {
                setLoading(false);
                return;
            }

            const vault = await loadVault(folderPath);
            const notes = await loadNotesMetadata(folderPath);

            setCurrentVault(vault);
            setNoteMetadata(notes);
            setCurrentView('editor');
        } catch (error) {
            console.error('Failed to open vault:', error);
            setError(error instanceof Error ? error.message : 'Failed to open vault');
        } finally {
            setLoading(false);
        }
    };

    const handleSetDefaultFolder = async () => {
        const folderPath = await selectVaultFolder();
        if (folderPath) {
            setAutoLoadFolder(folderPath);
            setShowSettings(false);
        }
    };

    const handleClearDefaultFolder = () => {
        setAutoLoadFolder(null);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-background via-background to-background-secondary">
            {/* Logo and Title */}
            <div className="text-center mb-12 animate-fade-in">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-accent to-purple-600 mb-6 shadow-xl shadow-accent/30 overflow-hidden transform hover:scale-105 transition-transform duration-300">
                    <img src={logo} alt="Synaptic Logo" className="w-12 h-12 object-contain brightness-0 invert" />
                </div>
                <h1 className="text-4xl font-bold gradient-text mb-3">Synaptic</h1>
                <p className="text-foreground-secondary text-lg">
                    Where your thoughts connect
                </p>
                {autoLoadFolder && (
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-background-tertiary/50 rounded-full text-sm text-accent">
                        <Settings className="w-4 h-4" />
                        <span>Auto-loading: {autoLoadFolder.split(/[/\\]/).pop()}</span>
                    </div>
                )}
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mb-12 w-full">
                <FeatureCard
                    icon={<Shield className="w-5 h-5" />}
                    title="Privacy First"
                    description="All data stays on your device. No cloud, no tracking."
                />
                <FeatureCard
                    icon={<Sparkles className="w-5 h-5" />}
                    title="AI Powered"
                    description="Local AI for search, summaries, and insights."
                />
                <FeatureCard
                    icon={<Zap className="w-5 h-5" />}
                    title="Lightning Fast"
                    description="Native performance with instant search."
                />
            </div>

            {/* CTA */}
            {!showSettings && (
                <div className="flex flex-col items-center gap-4 animate-slide-in">
                    <button
                        onClick={handleOpenVault}
                        className="btn-primary text-lg px-8 py-3 rounded-xl shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all"
                    >
                        <FolderOpen className="w-5 h-5" />
                        Open Vault
                    </button>
                    <p className="text-foreground-muted text-sm">
                        Select a folder containing your markdown notes
                    </p>
                </div>
            )}

            {/* Settings Panel */}
            {showSettings && (
                <div className="max-w-md w-full animate-fade-in">
                    <div className="card p-6">
                        <h2 className="text-xl font-semibold text-foreground mb-4">Settings</h2>

                        <div className="space-y-6">
                            {/* Auto-load Folder */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-foreground-secondary">Default Vault Folder</h3>
                                {autoLoadFolder ? (
                                    <div className="flex items-center justify-between p-4 bg-background-tertiary/50 rounded-xl">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Settings className="w-4 h-4 text-accent" />
                                            <span className="text-foreground">
                                                {autoLoadFolder.split(/[/\\]/).pop()}
                                            </span>
                                        </div>
                                        <button
                                            onClick={handleClearDefaultFolder}
                                            className="px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleSetDefaultFolder}
                                        className="w-full px-4 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-medium transition-all hover:shadow-lg hover:shadow-accent/25"
                                    >
                                        Set Default Folder
                                    </button>
                                )}
                                <p className="text-xs text-foreground-muted">
                                    This folder will automatically load when you launch Synaptic
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowSettings(false)}
                            className="w-full px-4 py-2.5 bg-background-tertiary/50 hover:bg-background-tertiary text-foreground-secondary rounded-xl text-sm transition-all"
                        >
                            Back
                        </button>
                    </div>
                </div>
            )}

            {!showSettings && (
                <button
                    onClick={() => setShowSettings(true)}
                    className="absolute top-6 right-6 p-2 rounded-lg hover:bg-background-tertiary text-foreground-muted hover:text-foreground transition-all"
                    title="Settings"
                >
                    <Settings className="w-5 h-5" />
                </button>
            )}

            {/* Footer */}
            <div className="absolute bottom-6 text-foreground-muted text-sm">
                <span className="opacity-50">v0.1.0</span>
                <span className="mx-2">·</span>
                <span className="opacity-50">Built with Tauri + React</span>
            </div>
        </div>
    );
}

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
    return (
        <div className="card flex flex-col items-center text-center p-6">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-3">
                {icon}
            </div>
            <h3 className="font-medium text-foreground mb-1">{title}</h3>
            <p className="text-sm text-foreground-muted">{description}</p>
        </div>
    );
}
