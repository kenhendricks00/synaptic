import { useState } from 'react';
import {
    Sparkles,
    FolderOpen,
    FileText,
    Bot,
    Puzzle,
    ArrowRight,
    ArrowLeft,
    Check,
    ExternalLink
} from 'lucide-react';
import { useVaultStore } from '../stores';

interface OnboardingProps {
    onComplete: () => void;
}

const STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to Synaptic',
        subtitle: 'Your intelligent knowledge companion',
        icon: Sparkles,
    },
    {
        id: 'vault',
        title: 'Your Knowledge Vault',
        subtitle: 'Where your ideas live',
        icon: FolderOpen,
    },
    {
        id: 'notes',
        title: 'Markdown Notes',
        subtitle: 'Simple yet powerful',
        icon: FileText,
    },
    {
        id: 'ai',
        title: 'AI-Powered',
        subtitle: 'Chat with your notes',
        icon: Bot,
    },
    {
        id: 'plugins',
        title: 'Extend & Customize',
        subtitle: 'Make it yours',
        icon: Puzzle,
    },
];

export function Onboarding({ onComplete }: OnboardingProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const { setCurrentVault, setNoteMetadata, setInitialized } = useVaultStore();

    const step = STEPS[currentStep];
    const isLastStep = currentStep === STEPS.length - 1;
    const isFirstStep = currentStep === 0;

    const handleNext = () => {
        if (isLastStep) {
            onComplete();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (!isFirstStep) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSelectVault = async () => {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
            directory: true,
            multiple: false,
            title: 'Select Your Vault Folder'
        });
        if (selected && typeof selected === 'string') {
            const vaultName = selected.split(/[/\\]/).pop() || 'Vault';
            setCurrentVault({ name: vaultName, path: selected, noteCount: 0, lastOpened: new Date() });

            // Initialize with daily note
            const { loadNotesMetadata, getOrCreateDailyNote } = await import('../lib');
            await getOrCreateDailyNote(selected);

            const notes = await loadNotesMetadata(selected);
            setNoteMetadata(notes);
            setInitialized(true); // Mark as initialized
        }
    };

    return (
        <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-background to-purple-900/10" />

            {/* Content */}
            <div className="relative z-10 max-w-2xl w-full mx-4">
                {/* Progress dots */}
                <div className="flex justify-center gap-2 mb-8">
                    {STEPS.map((s, i) => (
                        <button
                            key={s.id}
                            onClick={() => setCurrentStep(i)}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentStep
                                ? 'bg-accent w-8'
                                : i < currentStep
                                    ? 'bg-accent/50'
                                    : 'bg-background-tertiary'
                                }`}
                        />
                    ))}
                </div>

                {/* Card */}
                <div className="bg-background-secondary border border-border rounded-2xl p-8 shadow-2xl">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
                            <step.icon className="w-10 h-10 text-white" />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-foreground text-center mb-2">
                        {step.title}
                    </h1>
                    <p className="text-foreground-muted text-center mb-8">
                        {step.subtitle}
                    </p>

                    {/* Step-specific content */}
                    <div className="min-h-[200px] flex flex-col justify-center">
                        {step.id === 'welcome' && (
                            <div className="text-center space-y-4">
                                <p className="text-foreground-secondary">
                                    Synaptic is a local-first, AI-powered knowledge base that helps you capture, connect, and recall your ideas.
                                </p>
                                <p className="text-foreground-secondary">
                                    Everything stays on your device. Your notes, your data, your control.
                                </p>
                            </div>
                        )}

                        {step.id === 'vault' && (
                            <div className="text-center space-y-6">
                                <p className="text-foreground-secondary">
                                    A vault is a folder on your computer where all your notes are stored as plain Markdown files.
                                </p>
                                <button
                                    onClick={handleSelectVault}
                                    className="mx-auto flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
                                >
                                    <FolderOpen className="w-5 h-5" />
                                    Choose a Folder
                                </button>
                                <p className="text-sm text-foreground-muted">
                                    You can change this later in Settings → General
                                </p>
                            </div>
                        )}

                        {step.id === 'notes' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Feature title="Markdown" desc="Write in plain text with rich formatting" />
                                    <Feature title="Daily Notes" desc="Quick capture for daily thoughts" />
                                    <Feature title="[[Wikilinks]]" desc="Connect your ideas together" />
                                    <Feature title="Graph View" desc="Visualize note connections" />
                                </div>
                            </div>
                        )}

                        {step.id === 'ai' && (
                            <div className="space-y-6">
                                <p className="text-foreground-secondary text-center">
                                    Synaptic uses <strong>Ollama</strong> to run AI models locally on your machine. No data leaves your computer!
                                </p>
                                <div className="bg-background-tertiary rounded-lg p-4 border border-border">
                                    <h3 className="font-semibold text-foreground mb-2">⚠️ Ollama Required</h3>
                                    <p className="text-sm text-foreground-secondary mb-3">
                                        To use AI features like "Chat with Notes" and smart search, you need to install Ollama.
                                    </p>
                                    <a
                                        href="https://ollama.ai"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-accent hover:underline text-sm"
                                    >
                                        Download Ollama <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                                <p className="text-sm text-foreground-muted text-center">
                                    After installing, run: <code className="bg-background-tertiary px-2 py-1 rounded">ollama pull llama3.1:8b</code>
                                </p>
                            </div>
                        )}

                        {step.id === 'plugins' && (
                            <div className="space-y-4 text-center">
                                <p className="text-foreground-secondary">
                                    Extend Synaptic with plugins from the Marketplace. From timers to RSS readers, there's something for everyone.
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    <Pill>📅 Calendar</Pill>
                                    <Pill>🍅 Pomodoro</Pill>
                                    <Pill>📰 RSS</Pill>
                                    <Pill>📋 Kanban</Pill>
                                    <Pill>🎂 Birthday Tracker</Pill>
                                </div>
                                <p className="text-sm text-foreground-muted">
                                    Install plugins from Marketplace in the sidebar
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-border">
                        <button
                            onClick={handleBack}
                            disabled={isFirstStep}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isFirstStep
                                ? 'text-foreground-muted cursor-not-allowed'
                                : 'text-foreground-secondary hover:bg-background-tertiary'
                                }`}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>

                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
                        >
                            {isLastStep ? (
                                <>
                                    Get Started <Check className="w-4 h-4" />
                                </>
                            ) : (
                                <>
                                    Next <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Skip button */}
                <button
                    onClick={onComplete}
                    className="mt-4 mx-auto block text-sm text-foreground-muted hover:text-foreground-secondary transition-colors"
                >
                    Skip onboarding
                </button>
            </div>
        </div>
    );
}

function Feature({ title, desc }: { title: string; desc: string }) {
    return (
        <div className="bg-background-tertiary rounded-lg p-3 text-left">
            <h3 className="font-medium text-foreground text-sm">{title}</h3>
            <p className="text-xs text-foreground-muted">{desc}</p>
        </div>
    );
}

function Pill({ children }: { children: React.ReactNode }) {
    return (
        <span className="px-3 py-1 bg-background-tertiary rounded-full text-sm text-foreground-secondary">
            {children}
        </span>
    );
}

export default Onboarding;
