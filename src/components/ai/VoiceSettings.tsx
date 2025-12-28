import React, { useEffect, useState } from 'react';
import { useAIStore } from '../../stores/aiStore';
import { VoiceService } from '../../lib/voice';
import { Settings, X, Play, Loader2 } from 'lucide-react';

export function VoiceSettings() {
    const { voiceId, voiceRate, setVoiceSettings } = useAIStore();
    const [isOpen, setIsOpen] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [isPlayingSample, setIsPlayingSample] = useState(false);

    useEffect(() => {
        const loadVoices = () => {
            const available = VoiceService.getVoices();
            console.log('Available voices:', available);
            setVoices(available);
        };

        // Load immediately
        loadVoices();

        // And listen for changes (some browsers load voices async)
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const handlePlaySample = (vId: string, rate: number) => {
        if (isPlayingSample) return;

        setIsPlayingSample(true);
        const sampleText = "Hello! I am Synaptic AI. This is how I sound.";

        VoiceService.speak(sampleText, () => {
            setIsPlayingSample(false);
        }, { voiceId: vId, rate });
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                title="Voice Settings"
                className={`p-2 rounded-lg transition-colors ${isOpen ? 'text-foreground bg-background-tertiary' : 'text-foreground-secondary hover:text-foreground hover:bg-background-tertiary'}`}
            >
                <Settings className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 right-0 w-72 bg-background-secondary border border-border rounded-lg shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-foreground">Voice Settings</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-foreground-secondary hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Voice Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-foreground-secondary">Voice</label>
                            <div className="relative">
                                <select
                                    value={voiceId}
                                    onChange={(e) => setVoiceSettings(e.target.value, voiceRate)}
                                    className="w-full p-2 text-sm bg-background-tertiary border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-accent appearance-none pr-8"
                                >
                                    <option value="">Default (Auto-select)</option>
                                    {voices
                                        .filter(v => v.lang.startsWith('en'))
                                        .map(v => (
                                            <option key={v.voiceURI} value={v.voiceURI}>
                                                {v.name}
                                            </option>
                                        ))}
                                </select>
                                {/* Custom Arrow */}
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-foreground-muted">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Speed Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-foreground-secondary">Speed ({voiceRate}x)</label>
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.05"
                                value={voiceRate}
                                onChange={(e) => setVoiceSettings(voiceId, parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-background-tertiary rounded-lg appearance-none cursor-pointer accent-accent"
                            />
                            <div className="flex justify-between text-[10px] text-foreground-muted">
                                <span>Slow</span>
                                <span>Normal</span>
                                <span>Fast</span>
                            </div>
                        </div>

                        {/* Test Button */}
                        <button
                            onClick={() => handlePlaySample(voiceId, voiceRate)}
                            disabled={isPlayingSample}
                            className="w-full flex items-center justify-center gap-2 p-2 mt-2 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {isPlayingSample ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Speaking...
                                </>
                            ) : (
                                <>
                                    <Play className="w-3 h-3" />
                                    Test Voice
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
