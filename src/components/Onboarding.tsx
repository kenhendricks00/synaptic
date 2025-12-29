import { useState, useEffect, useRef } from 'react';
import {
    Sparkles,
    FolderOpen,
    FileText,
    Bot,
    Puzzle,
    ArrowRight,
    ArrowLeft,
    Check,
    ExternalLink,
    User,
    Mic,
    CheckCircle2,
    XCircle,
    Loader2
} from 'lucide-react';
import { useVaultStore, useSettingsStore } from '../stores';
import { VoiceService } from '../lib/voice';
import { kokoroService } from '../lib/kokoro';
import { checkOllamaStatus } from '../lib/tauri';
import confetti from 'canvas-confetti';
import logoImage from '../assets/logo.png';

interface OnboardingProps {
    onComplete: () => void;
}

const STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to Synaptic',
        subtitle: 'Your intelligent knowledge companion',
        icon: Sparkles,
        narration: null, // Silent - personalized greeting will be the first voice
        autoAdvance: false,
    },
    {
        id: 'name',
        title: "What should I call you?",
        subtitle: "Let's personalize your experience",
        icon: User,
        narration: null, // No narration for input step
        autoAdvance: false,
    },
    {
        id: 'greeting',
        title: 'Nice to meet you!',
        subtitle: 'Let me introduce myself',
        icon: Mic,
        narration: null, // Custom greeting handled separately
        autoAdvance: true, // Already auto-advances
    },
    {
        id: 'vault',
        title: 'Your Knowledge Vault',
        subtitle: 'Where your ideas live',
        icon: FolderOpen,
        narration: "A vault is simply a folder on your computer where all your notes live as plain Markdown files. Choose any folder you like!",
        autoAdvance: false, // User needs to select folder
    },
    {
        id: 'notes',
        title: 'Markdown Notes',
        subtitle: 'Simple yet powerful',
        icon: FileText,
        narration: "You can write in Markdown with rich formatting, connect ideas with wiki-links, and visualize your knowledge as an interactive graph.",
        autoAdvance: true, // Informational - auto advance
    },
    {
        id: 'ai',
        title: 'AI-Powered',
        subtitle: 'Chat with your notes',
        icon: Bot,
        narration: "To unlock my full potential, you'll need to install Ollama. It's a free, local AI runtime that keeps everything private on your computer. Please download it from ollama.ai before continuing. Once installed, I'll be able to search your notes, answer questions, and help you write.",
        autoAdvance: false, // User needs to install Ollama
    },
    {
        id: 'plugins',
        title: 'Extend & Customize',
        subtitle: 'Make it yours',
        icon: Puzzle,
        narration: "And there's so much more! Explore the plugin marketplace for timers, calendars, flashcards, and more. You're all set - let's get started!",
        autoAdvance: true, // Informational - auto advance to finish
    },
];

export function Onboarding({ onComplete }: OnboardingProps) {
    const [currentStep, setCurrentStep] = useState(() => {
        // Restore progress from localStorage on mount
        const saved = localStorage.getItem('onboarding_progress');
        if (saved) {
            try {
                const { step } = JSON.parse(saved);
                return step || 0;
            } catch { return 0; }
        }
        return 0;
    });
    const [userName, setUserName] = useState(() => {
        // Restore userName from localStorage on mount
        const saved = localStorage.getItem('onboarding_progress');
        if (saved) {
            try {
                const { name } = JSON.parse(saved);
                return name || '';
            } catch { return ''; }
        }
        return '';
    });
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [spokenText, setSpokenText] = useState('');
    const [isPreloading, setIsPreloading] = useState(false);
    const [greetingPlayed, setGreetingPlayed] = useState(false);
    const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'ready' | 'not-found'>('checking');
    const [isAnimating, setIsAnimating] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const { setCurrentVault, setNoteMetadata, setInitialized } = useVaultStore();
    const { updateSettings } = useSettingsStore();

    const step = STEPS[currentStep];
    const isLastStep = currentStep === STEPS.length - 1;
    const isFirstStep = currentStep === 0;

    // Save progress to localStorage when step or userName changes
    useEffect(() => {
        if (currentStep > 0 || userName) {
            localStorage.setItem('onboarding_progress', JSON.stringify({
                step: currentStep,
                name: userName
            }));
        }
    }, [currentStep, userName]);

    // Play subtle chime on step transitions
    const playTransitionSound = () => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.setValueAtTime(800, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.15);
        } catch (e) {
            // Ignore audio errors silently
        }
    };

    // Keyboard shortcuts: Enter = Next, Escape = Skip
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                // Don't trigger if typing in input
                if (document.activeElement?.tagName === 'INPUT') {
                    if (step.id === 'name' && userName.trim()) {
                        e.preventDefault();
                        handleNext();
                    }
                    return;
                }
                e.preventDefault();
                handleNext();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onComplete();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentStep, userName, step.id]);

    // Fire confetti on completion and clear progress
    const handleComplete = () => {
        // Clear saved progress
        localStorage.removeItem('onboarding_progress');

        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
        setTimeout(() => {
            onComplete();
        }, 500);
    };

    // Check Ollama status when entering AI step
    useEffect(() => {
        if (step.id === 'ai') {
            setOllamaStatus('checking');
            checkOllamaStatus()
                .then(isRunning => {
                    setOllamaStatus(isRunning ? 'ready' : 'not-found');
                })
                .catch(() => {
                    setOllamaStatus('not-found');
                });
        }
    }, [step.id]);

    // Focus input on name step
    useEffect(() => {
        if (step.id === 'name') {
            setTimeout(() => inputRef.current?.focus(), 100);
            // Preload Kokoro TTS in the background
            setIsPreloading(true);
            kokoroService.initialize().then(() => {
                setIsPreloading(false);
            }).catch(() => {
                setIsPreloading(false);
            });
        }
    }, [step.id]);

    // Play narration when entering each step
    useEffect(() => {
        // Skip if name step (user is typing) or if already speaking
        if (step.id === 'name' || isSpeaking) return;

        // Handle personalized greeting separately
        if (step.id === 'greeting' && !greetingPlayed && userName) {
            setGreetingPlayed(true);
            setIsSpeaking(true);

            const greeting = `Hello ${userName}! I'm Synaptic, your intelligent knowledge companion. Let me walk you through what I can do.`;
            setSpokenText(greeting);

            VoiceService.speak(greeting, () => {
                setIsSpeaking(false);
                setSpokenText('');
                // Auto-advance after speech completes with animation
                setTimeout(() => {
                    animateToStep(currentStep + 1, 'forward');
                }, 500);
            }, { voiceId: 'af_heart', rate: 1.0 });
            return;
        }

        // Play regular narration for other steps
        if (step.narration && step.id !== 'greeting') {
            setIsSpeaking(true);
            setSpokenText(step.narration);
            VoiceService.speak(step.narration, () => {
                setIsSpeaking(false);
                setSpokenText('');
                // Auto-advance if this step is marked for it
                if (step.autoAdvance && currentStep < STEPS.length - 1) {
                    setTimeout(() => {
                        animateToStep(currentStep + 1, 'forward');
                    }, 500);
                } else if (step.autoAdvance && currentStep === STEPS.length - 1) {
                    // Last step - complete onboarding
                    setTimeout(() => {
                        handleComplete();
                    }, 500);
                }
            }, { voiceId: 'af_heart', rate: 1.0 });
        }

        // Cleanup: stop speaking when leaving a step
        return () => {
            VoiceService.stopSpeaking();
        };
    }, [currentStep]); // Only trigger on step change

    const animateToStep = (targetStep: number, _direction: 'forward' | 'backward') => {
        // Play transition sound
        playTransitionSound();

        // Fade out current content
        setIsAnimating(true);

        // After fade out, change step and fade in
        setTimeout(() => {
            setCurrentStep(targetStep);
            // Fade back in after a brief moment
            setTimeout(() => {
                setIsAnimating(false);
            }, 50);
        }, 150);
    };

    const handleNext = () => {
        // Stop any ongoing speech
        VoiceService.stopSpeaking();
        setIsSpeaking(false);

        // Save name when leaving name step
        if (step.id === 'name' && userName.trim()) {
            updateSettings({ userName: userName.trim() });
        }

        if (isLastStep) {
            handleComplete();
        } else {
            animateToStep(currentStep + 1, 'forward');
        }
    };

    const handleBack = () => {
        // Stop any ongoing speech
        VoiceService.stopSpeaking();
        setIsSpeaking(false);

        if (!isFirstStep) {
            // Calculate the previous step
            let prevStep = currentStep - 1;

            // Skip the greeting step when going back (it's a one-time auto-advance step)
            if (STEPS[prevStep]?.id === 'greeting') {
                prevStep = prevStep - 1;
            }

            if (prevStep >= 0) {
                animateToStep(prevStep, 'backward');
            }
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
            setInitialized(true);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && userName.trim()) {
            handleNext();
        }
    };

    // Skip greeting step navigation buttons
    const showNavigation = step.id !== 'greeting';

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
                            onClick={() => step.id !== 'greeting' && setCurrentStep(i)}
                            disabled={step.id === 'greeting'}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentStep
                                ? 'bg-accent w-8'
                                : i < currentStep
                                    ? 'bg-accent/50'
                                    : 'bg-background-tertiary'
                                }`}
                        />
                    ))}
                </div>

                {/* Card with fade transition */}
                <div
                    className="bg-background-secondary border border-border rounded-2xl p-8 shadow-2xl"
                    style={{
                        transition: 'opacity 150ms ease-out, transform 150ms ease-out',
                        opacity: isAnimating ? 0 : 1,
                        transform: isAnimating ? 'scale(0.98)' : 'scale(1)',
                    }}
                >
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        {step.id === 'welcome' ? (
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center animate-bounce shadow-lg shadow-accent/30">
                                <img src={logoImage} alt="Synaptic" className="w-12 h-12" />
                            </div>
                        ) : (
                            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center transition-all duration-300 ${isSpeaking ? 'animate-pulse scale-105' : ''
                                }`}>
                                <step.icon className="w-10 h-10 text-white" />
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-foreground text-center mb-2">
                        {step.id === 'greeting' && userName ? `Hello, ${userName}!` : step.title}
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

                        {step.id === 'name' && (
                            <div className="text-center space-y-6">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Enter your name"
                                    className="w-full max-w-xs mx-auto block px-6 py-4 text-xl text-center bg-background-tertiary border-2 border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                                />
                                {isPreloading && (
                                    <p className="text-sm text-foreground-muted animate-pulse">
                                        Preparing voice...
                                    </p>
                                )}
                            </div>
                        )}

                        {step.id === 'greeting' && (
                            <div className="text-center space-y-6">
                                {/* Animated speaking indicator */}
                                <div className="flex justify-center items-center gap-1">
                                    {[0, 1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className={`w-1.5 bg-accent rounded-full transition-all ${isSpeaking ? 'animate-bounce' : 'h-4'}`}
                                            style={{
                                                height: isSpeaking ? `${Math.random() * 24 + 8}px` : '16px',
                                                animationDelay: `${i * 0.1}s`,
                                                animationDuration: '0.5s'
                                            }}
                                        />
                                    ))}
                                </div>
                                <p className="text-foreground-secondary italic">
                                    {isSpeaking ? '"Let me walk you through what I can do..."' : 'Loading...'}
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
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-foreground">Ollama Status</h3>
                                        {ollamaStatus === 'checking' && (
                                            <span className="flex items-center gap-1.5 text-foreground-muted text-sm">
                                                <Loader2 className="w-4 h-4 animate-spin" /> Checking...
                                            </span>
                                        )}
                                        {ollamaStatus === 'ready' && (
                                            <span className="flex items-center gap-1.5 text-green-500 text-sm font-medium">
                                                <CheckCircle2 className="w-4 h-4" /> Ready
                                            </span>
                                        )}
                                        {ollamaStatus === 'not-found' && (
                                            <span className="flex items-center gap-1.5 text-orange-500 text-sm font-medium">
                                                <XCircle className="w-4 h-4" /> Not Running
                                            </span>
                                        )}
                                    </div>
                                    {ollamaStatus !== 'ready' && (
                                        <>
                                            <p className="text-sm text-foreground-secondary mb-3">
                                                To use AI features, install and run Ollama:
                                            </p>
                                            <a
                                                href="https://ollama.ai"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-accent hover:underline text-sm"
                                            >
                                                Download Ollama <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </>
                                    )}
                                    {ollamaStatus === 'ready' && (
                                        <p className="text-sm text-green-500/80">
                                            Great! Ollama is running and ready to use.
                                        </p>
                                    )}
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
                    {showNavigation && (
                        <>
                            {/* Welcome step: full-width centered button */}
                            {isFirstStep ? (
                                <div className="mt-8 pt-6 border-t border-border">
                                    <button
                                        onClick={handleNext}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors text-lg"
                                    >
                                        Let's get started <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center mt-8 pt-6 border-t border-border">
                                    <button
                                        onClick={handleBack}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-foreground-secondary hover:bg-background-tertiary"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Back
                                    </button>

                                    <button
                                        onClick={handleNext}
                                        disabled={step.id === 'name' && !userName.trim()}
                                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${step.id === 'name' && !userName.trim()
                                            ? 'bg-accent/50 text-white/50 cursor-not-allowed'
                                            : 'bg-accent hover:bg-accent-hover text-white'
                                            }`}
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
                            )}
                        </>
                    )}
                </div>

                {/* Skip button */}
                <button
                    onClick={onComplete}
                    className="mt-4 mx-auto block text-sm text-foreground-muted hover:text-foreground-secondary transition-colors"
                >
                    Skip onboarding
                </button>
            </div>

            {/* Bottom Voice Caption Bar - always rendered, animated with CSS */}
            <div
                className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
                style={{
                    transition: 'opacity 300ms ease-out, transform 300ms ease-out',
                    opacity: isSpeaking && spokenText ? 1 : 0,
                    transform: isSpeaking && spokenText ? 'translateY(0)' : 'translateY(20px)',
                }}
            >
                {/* Glow backdrop */}
                <div
                    className="voice-glow"
                    style={{
                        bottom: 0,
                        top: 'auto',
                        height: '150px',
                        opacity: isSpeaking ? 1 : 0,
                        transition: 'opacity 500ms ease-out',
                        animation: isSpeaking ? 'pulse-subtle 4s ease-in-out infinite' : 'none'
                    }}
                />

                {/* Caption content */}
                <div className="relative bg-background-secondary/90 backdrop-blur-sm border-t border-border px-4 py-3">
                    <div className="max-w-2xl mx-auto">
                        <p className="text-center text-foreground-secondary text-sm leading-relaxed">
                            {spokenText ? `"${spokenText}"` : ''}
                        </p>
                    </div>
                </div>
            </div>
        </div >
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
