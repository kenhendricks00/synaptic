import React, { useEffect, useRef } from 'react';
import {
    Send,
    Bot,
    User,
    X,
    Loader2,
    RefreshCw,
    AlertCircle,
    Sparkles,
    ChevronDown,
    Trash2,
    Copy,
    FileText,
    Edit3,
    Mic,
    MicOff,
    Volume2,
    VolumeX
} from 'lucide-react';
import { VoiceSettings } from './VoiceSettings';
import { useAIStore } from '../../stores';
import { cn } from '../../lib';
import { VoiceService } from '../../lib/voice';

export function ChatInterface() {
    const {
        messages,
        isOpen,
        setIsOpen,
        isLoading,
        sendMessage,
        isOllamaRunning,
        checkStatus,
        availableModels,
        selectedModel,
        selectModel,
        processingTool,
        error,
        clearChat,
        input,
        setInput,
        isVoiceMode,
        setVoiceMode,
        isListening,
        setListening,
        isSpeaking,
        setSpeaking,
        setPreferMicMuted
    } = useAIStore();

    // const [input, setInput] = useState(''); // Moved to store to allow external control
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Check status on mount and when opened
    useEffect(() => {
        if (isOpen) {
            checkStatus();
        }
    }, [isOpen]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [input]);

    const handleSend = async (customMsg?: string) => {
        const msg = customMsg || input;
        if (!msg.trim() || isLoading) return;

        setInput('');

        // Reset height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        // Stop speech/listening if user sends message via text
        VoiceService.stopSpeaking();
        VoiceService.stopListening();
        setSpeaking(false);
        setListening(false);
        setPreferMicMuted(true); // Don't auto-unmute after text response

        await sendMessage(msg);
    };

    const toggleListening = () => {
        if (isListening) {
            VoiceService.stopListening();
            setListening(false);
            // User manually muted
            setPreferMicMuted(true);
        } else {
            // Stop TTS if running
            VoiceService.stopSpeaking();
            setSpeaking(false);
            // User manually unmuted
            setPreferMicMuted(false);

            // Also enable Voice Mode if not already enabled (User wants to talk!)
            if (!isVoiceMode) {
                setVoiceMode(true);
            }

            // Track the current input to detect changes
            let lastInput = '';

            const recognition = VoiceService.initRecognition(
                (text) => {
                    setInput(text);
                    lastInput = text;
                },
                () => {
                    // Auto-send if text is substantive
                    const textToSend = lastInput || useAIStore.getState().input;
                    if (textToSend && textToSend.trim().length >= 2) {
                        sendMessage(textToSend);
                        setInput('');
                    }

                    // In voice mode, keep visually "listening" since we'll restart after AI responds
                    // UNLESS user manually muted (handled via state)
                    if (!isVoiceMode) {
                        setListening(false);
                    }
                },
                (err) => {
                    console.error('Speech recognition error:', err);
                    setListening(false);
                }
            );

            if (recognition) {
                setListening(true);
                VoiceService.startListening();
            }
        }
    };

    const toggleVoiceMode = () => {
        const newMode = !isVoiceMode;
        setVoiceMode(newMode);
        if (!newMode) {
            VoiceService.stopSpeaking();
            VoiceService.stopListening();
            setSpeaking(false);
            setListening(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    // Premium Markdown-Lite Renderer
    const renderContent = (content: string) => {
        // Handle code blocks
        const parts = content.split(/(```[\s\S]*?```)/g);

        return parts.map((part, i) => {
            if (part.startsWith('```')) {
                const code = part.replace(/```(?:[a-z]+)?\s*|\s*```/g, '');
                return (
                    <pre key={i} className="my-2 p-3 bg-background-tertiary/10 rounded-xl overflow-x-auto border border-white/5 font-mono text-[11px] leading-relaxed">
                        <code>{code}</code>
                    </pre>
                );
            }

            return (
                <div key={i} className="space-y-1">
                    {part.split('\n').map((line, j) => {
                        const trimmedLine = line.trim();
                        // Bullet lists
                        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                            return (
                                <div key={j} className="flex gap-2 pl-2">
                                    <span className="text-accent">•</span>
                                    <span>{trimmedLine.slice(2)}</span>
                                </div>
                            );
                        }
                        // Bold text
                        const boldProcessed = line.split(/(\*\*.*?\*\*)/g).map((s, k) => {
                            if (s.startsWith('**') && s.endsWith('**')) {
                                return <strong key={k} className="text-foreground font-bold">{s.slice(2, -2)}</strong>;
                            }
                            return s;
                        });
                        return <p key={j}>{boldProcessed}</p>;
                    })}
                </div>
            );
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-[450px] bg-background border-l border-border shadow-2xl z-50 flex flex-col transition-transform duration-300 relative overflow-hidden">
            {/* Voice Mode Glow Backdrop */}
            <div className={cn(
                "voice-glow",
                (isVoiceMode && (isListening || isSpeaking)) && "voice-glow-active"
            )} />

            {/* Speaking Mesh Gradient */}
            <div className={cn(
                "absolute inset-0 pointer-events-none transition-opacity duration-1000 z-0",
                (isVoiceMode && isSpeaking) ? "opacity-20" : "opacity-0"
            )}>
                <div className="absolute inset-0 animate-mesh-fast bg-gradient-to-tr from-accent/30 via-purple-500/20 to-blue-500/10 blur-[100px]" />
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-b from-background-secondary/80 to-background/50 backdrop-blur-xl relative z-20">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 text-accent shadow-lg shadow-accent/10">
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-foreground text-base tracking-tight">Synaptic AI</h2>
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isOllamaRunning ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500"
                            )} />
                            <span className="text-xs text-foreground-muted font-medium flex items-center gap-1.5">
                                {isSpeaking ? (
                                    <span className="text-accent animate-pulse flex items-center gap-1.5">
                                        <Volume2 className="w-3 h-3" />
                                        Speaking
                                    </span>
                                ) : (
                                    isOllamaRunning ? 'Online' : 'Disconnected'
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isOllamaRunning && (
                        <div className="relative group">
                            <button className="flex items-center gap-1.5 text-xs font-medium text-foreground-secondary hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-background-tertiary transition-all duration-200 border border-transparent hover:border-border/50">
                                <span className="truncate max-w-[80px]">{selectedModel}</span>
                                <ChevronDown className="w-3 h-3 opacity-50 transition-transform group-hover:rotate-180" />
                            </button>
                            <div className="absolute right-0 top-full mt-2 w-48 py-1.5 rounded-xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                {availableModels.map(model => (
                                    <button
                                        key={model}
                                        onClick={() => selectModel(model)}
                                        className={cn(
                                            "w-full text-left px-3 py-2 text-sm hover:bg-background-tertiary/80 transition-colors",
                                            selectedModel === model ? "text-accent font-medium" : "text-foreground-secondary"
                                        )}
                                    >
                                        {model}
                                    </button>
                                ))}
                                {availableModels.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-foreground-muted">
                                        No models found. Run `ollama pull llama3`
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={toggleVoiceMode}
                        className={cn(
                            "p-2 rounded-lg transition-all duration-200",
                            isVoiceMode
                                ? "bg-accent/20 text-accent"
                                : "hover:bg-background-tertiary text-foreground-muted hover:text-foreground"
                        )}
                        title={isVoiceMode ? "Disable Voice Mode" : "Enable Voice Mode"}
                    >
                        {isVoiceMode ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>

                    <VoiceSettings />

                    <button
                        onClick={clearChat}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-foreground-muted hover:text-red-400 transition-all duration-200"
                        title="Clear Chat History"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 rounded-lg hover:bg-background-tertiary text-foreground-muted hover:text-foreground transition-all duration-200 hover:scale-105"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>



            {!isOllamaRunning && (
                <div className="px-5 py-4 bg-gradient-to-r from-red-500/10 to-red-500/5 border-b border-red-500/20 flex items-start gap-3 backdrop-blur-sm">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-semibold text-red-200">Ollama is not running</p>
                        <p className="text-red-200/70 mt-1.5">
                            Please install and start Ollama to use AI features.
                            <br />
                            <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="text-red-300 hover:text-red-200 underline underline-offset-2 hover:underline-offset-4 transition-all">
                                Download Ollama
                            </a>
                        </p>
                        <button
                            onClick={() => checkStatus()}
                            className="mt-3 text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-200 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 border border-red-500/30 hover:border-red-500/50"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Retry Connection
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="px-5 py-3 bg-red-500/10 border-b border-red-500/20 text-xs text-red-200 flex items-center gap-2 backdrop-blur-sm">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-5 space-y-6"
            >
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mb-5 shadow-2xl shadow-accent/10">
                            <Sparkles className="w-10 h-10 text-accent" />
                        </div>
                        <h3 className="font-semibold text-foreground text-lg mb-2">How can I help?</h3>
                        <p className="text-sm text-foreground-muted max-w-[240px] leading-relaxed">
                            Ask me to create notes, search your vault, or summarize your ideas.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-2.5 justify-center">
                            {[
                                { label: 'Create notes', icon: Sparkles },
                                { label: 'Search vault', icon: Send },
                                { label: 'Summarize active note', icon: FileText },
                                { label: 'Help me edit this note', icon: Edit3 },
                            ].map((chip) => (
                                <button
                                    key={chip.label}
                                    onClick={() => handleSend(chip.label)}
                                    className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-background-tertiary/50 border border-border/50 text-xs text-foreground-muted font-medium hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
                                >
                                    <chip.icon className="w-3 h-3 opacity-70 group-hover:opacity-100" />
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages
                        .filter(m => !m.content.includes('[PHANTOM]') && !m.content.includes('SYSTEM REMINDER'))
                        .map((msg, i) => {
                            if (msg.role === 'system') {
                                if (msg.content.includes('Tool Output: Success')) {
                                    const isUpdate = msg.content.includes('Updated note');
                                    const noteTitle = msg.content.match(/"([^"]+)"/)?.[1] || 'Note';
                                    return (
                                        <div key={i} className="flex justify-center my-3">
                                            <div className="text-[10px] bg-green-500/10 text-green-400 px-4 py-1.5 rounded-full flex items-center gap-1.5 border border-green-500/20 shadow-lg shadow-green-500/10 animate-in fade-in zoom-in duration-300">
                                                <Sparkles className="w-3 h-3" />
                                                {isUpdate ? 'Updated' : 'Created'}: {noteTitle}
                                            </div>
                                        </div>
                                    );
                                }
                                if (msg.content.includes('Tool Output: Found')) {
                                    const count = msg.content.match(/Found (\d+)/)?.[1] || '0';
                                    return (
                                        <div key={i} className="flex justify-center my-3">
                                            <div className="text-[10px] bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full flex items-center gap-1.5 border border-blue-500/20 shadow-lg shadow-blue-500/10">
                                                <Sparkles className="w-3 h-3" />
                                                Search: {count} results
                                            </div>
                                        </div>
                                    );
                                }
                                if (msg.content.includes('Tool Output')) {
                                    return (
                                        <div key={i} className="flex justify-center my-3">
                                            <div className="text-[10px] bg-background-tertiary text-foreground-muted px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-border/50 shadow-md">
                                                <Sparkles className="w-3 h-3" />
                                                Action Completed
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }

                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex gap-3 max-w-[90%] animate-in fade-in slide-in duration-300",
                                        msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                    )}
                                >
                                    <div className={cn(
                                        "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md",
                                        msg.role === 'user'
                                            ? "bg-gradient-to-br from-accent to-accent-hover text-white"
                                            : "bg-gradient-to-br from-background-tertiary to-background-secondary text-accent"
                                    )}>
                                        {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                                    </div>

                                    <div className="relative">
                                        <div className={cn(
                                            "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md",
                                            msg.role === 'user'
                                                ? "bg-gradient-to-br from-accent to-accent-hover text-white rounded-tr-sm"
                                                : "bg-gradient-to-br from-background-tertiary to-background-secondary text-foreground rounded-tl-sm border border-border/50"
                                        )}>
                                            {msg.role === 'user' ? msg.content : renderContent(msg.content)}
                                        </div>

                                        {msg.role === 'assistant' && (
                                            <button
                                                onClick={() => copyToClipboard(msg.content)}
                                                className="absolute -right-8 top-1 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted transition-all"
                                                title="Copy message"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                )}

                {
                    isLoading && (
                        <div className="flex gap-3 animate-in fade-in slide-in duration-300">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-background-tertiary to-background-secondary text-accent flex items-center justify-center flex-shrink-0 shadow-md">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div className="bg-gradient-to-br from-background-tertiary to-background-secondary rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 border border-border/50 shadow-md">
                                {processingTool ? (
                                    <div className="flex items-center gap-2 text-xs font-medium text-accent">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Using {processingTool.replace('_', ' ')}...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
            </div >

            <div className="p-5 border-t border-border/50 bg-gradient-to-b from-background to-background-secondary">
                <div className="relative flex items-end gap-2 bg-background-secondary/50 backdrop-blur rounded-2xl p-2.5 border border-border focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20 transition-all duration-200 shadow-lg">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 resize-none max-h-[120px] min-h-[28px] py-1.5 px-2 text-sm text-foreground placeholder:text-foreground-muted/70"
                        disabled={!isOllamaRunning || isLoading}
                        rows={1}
                    />
                    <button
                        onClick={toggleListening}
                        disabled={!isOllamaRunning || isLoading}
                        className={cn(
                            "p-2.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95",
                            isListening
                                ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/25"
                                : "bg-background-tertiary text-foreground-muted hover:text-foreground"
                        )}
                        title={isListening ? "Stop Listening" : "Start Voice Input"}
                    >
                        {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || !isOllamaRunning || isLoading}
                        className="p-2.5 rounded-xl bg-gradient-to-br from-accent to-accent-hover text-white hover:shadow-lg hover:shadow-accent/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
                <div className="text-center mt-3">
                    <span className="text-[10px] text-foreground-muted/80 font-medium">
                        AI can make mistakes. Verify important information.
                    </span>
                </div>
            </div>
        </div >
    );
}
