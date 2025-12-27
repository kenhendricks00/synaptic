import type { Plugin, PluginCommand } from '../../types';
import { Mic } from 'lucide-react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { saveAttachment } from '../../../lib/tauri'; // We added this
import { useVaultStore } from '../../../stores';

// --- Recorder UI Component ---
// We'll render this into a temporary container in the body
function RecorderOverlay({ onClose, onSave }: { onClose: () => void, onSave: (blob: Blob, text: string) => Promise<void> }) {
    const [isRecording, setIsRecording] = React.useState(false);
    const [duration, setDuration] = React.useState(0);
    const [transcript, setTranscript] = React.useState('');
    const [mediaRecorder, setMediaRecorder] = React.useState<MediaRecorder | null>(null);

    // Web Speech API for transcription
    const recognitionRef = React.useRef<any>(null);

    React.useEffect(() => {
        startRecording();
        return () => {
            stopRecordingContext();
        };
    }, []);

    React.useEffect(() => {
        let interval: any;
        if (isRecording) {
            interval = setInterval(() => setDuration(d => d + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);

            // Start Transcription
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;

                recognition.onresult = (event: any) => {
                    let final_transcript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            final_transcript += event.results[i][0].transcript;
                        }
                    }
                    if (final_transcript) {
                        setTranscript(prev => prev + ' ' + final_transcript);
                    }
                };

                recognition.start();
                recognitionRef.current = recognition;
            }

        } catch (err) {
            console.error('Error starting recording:', err);
            alert('Could not access microphone.');
            onClose();
        }
    };

    const stopRecordingContext = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    // Ref-based implementation for robustness
    const chunksRef = React.useRef<Blob[]>([]);

    const finish = async () => {
        if (!mediaRecorder) return;
        stopRecordingContext();

        // Wait for final data
        await new Promise(resolve => setTimeout(resolve, 500));

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await onSave(blob, transcript);
        onClose();
    };

    // Update recorder logic to use ref
    React.useEffect(() => {
        if (mediaRecorder) {
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
        }
    }, [mediaRecorder]);


    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background-secondary border border-border p-6 rounded-2xl shadow-2xl w-96 flex flex-col items-center gap-6">
                <div className="relative">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-500/10 animate-pulse' : 'bg-background-tertiary'}`}>
                        <Mic className={`w-8 h-8 ${isRecording ? 'text-red-500' : 'text-foreground-muted'}`} />
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-foreground">
                        {isRecording ? 'Recording...' : 'Paused'}
                    </h3>
                    <div className="text-2xl font-mono text-foreground-secondary tabular-nums">
                        {formatTime(duration)}
                    </div>
                </div>

                {transcript && (
                    <div className="w-full h-24 overflow-y-auto bg-background p-3 rounded-lg border border-border text-xs text-foreground-secondary italic">
                        "{transcript}"
                    </div>
                )}

                <div className="flex w-full gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 rounded-lg text-foreground-muted hover:bg-background-tertiary transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={finish}
                        className="flex-1 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Plugin Class ---

export default class VoiceMemosPlugin implements Plugin {
    id = 'voice-memos';
    name = 'Voice Memos';
    version = '1.0.0';
    description = 'Record audio notes with auto-transcription.';
    author = 'Synaptic';
    icon = <Mic className="w-5 h-5" />;
    category = 'productivity' as const;
    tags = ['audio', 'record', 'transcribe', 'voice'];
    permissions = ['write_notes' as const, 'storage' as const];

    commands: PluginCommand[] = [
        {
            id: 'record-audio',
            name: 'Record Voice Memo',
            description: 'Start recording audio to insert into the current note',
            handler: () => this.startRecording(),
        }
    ];

    private startRecording() {
        const rootDiv = document.createElement('div');
        document.body.appendChild(rootDiv);
        const root = createRoot(rootDiv);

        const close = () => {
            root.unmount();
            document.body.removeChild(rootDiv);
        };

        const save = async (blob: Blob, transcript: string) => {
            try {
                // 1. Convert Blob to Uint8Array
                const buffer = await blob.arrayBuffer();
                const data = new Uint8Array(buffer);

                // 2. Save to Vault
                // We need to access the store state directly as we are outside React
                const state = useVaultStore.getState();
                const vault = state.currentVault;
                const activeNoteId = state.activeNoteId;

                if (!vault) {
                    alert('No vault open!');
                    return;
                }

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `recording-${timestamp}.webm`;

                const relativePath = await saveAttachment(vault.path, filename, data);

                // 3. Insert into Note
                if (activeNoteId) {
                    const currentNote = state.notes.get(activeNoteId);
                    if (currentNote) {
                        const newContent = currentNote.content + `\n\n![Voice Memo](${relativePath})\n\n> [!NOTE] Transcript\n> ${transcript.trim() || '*No speech detected*'}\n`;
                        state.updateNote(activeNoteId, { content: newContent });

                        // Also persist to disk
                        const { saveNote } = await import('../../../lib/tauri');
                        await saveNote({ ...currentNote, content: newContent });
                    }
                } else {
                    // If no active note, maybe create one? For now just alert.
                    alert('Recording saved to attachments, but no active note to insert into.');
                }

            } catch (err) {
                console.error('Failed to save recording:', err);
                alert('Failed to save recording: ' + err);
            }
        };

        root.render(<RecorderOverlay onClose={close} onSave={save} />);
    }

    async getSettings() { return {}; }
}
