import { KokoroTTS } from 'kokoro-js';

// Define the Kokoro voices we want to expose
export const KOKORO_VOICES = [
    { id: 'af_heart', name: 'Kokoro - Heart (US Female)', lang: 'en-US' },
    { id: 'af_bella', name: 'Kokoro - Bella (US Female)', lang: 'en-US' },
    { id: 'af_sarah', name: 'Kokoro - Sarah (US Female)', lang: 'en-US' },
    { id: 'af_sky', name: 'Kokoro - Sky (US Female)', lang: 'en-US' },
    { id: 'af_nicole', name: 'Kokoro - Nicole (US Female)', lang: 'en-US' },
    { id: 'am_adam', name: 'Kokoro - Adam (US Male)', lang: 'en-US' },
    { id: 'am_michael', name: 'Kokoro - Michael (US Male)', lang: 'en-US' },
    { id: 'bf_emma', name: 'Kokoro - Emma (UK Female)', lang: 'en-GB' },
    { id: 'bm_george', name: 'Kokoro - George (UK Male)', lang: 'en-GB' },
];

class KokoroService {
    private tts: any = null;
    private isInitializing = false;
    private audioContext: AudioContext | null = null;
    private currentSource: AudioBufferSourceNode | null = null;
    private isPaused = false;
    private pauseResolve: (() => void) | null = null;

    async initialize() {
        if (this.tts) return this.tts;
        if (this.isInitializing) {
            // Wait for initialization
            while (this.isInitializing) {
                await new Promise(r => setTimeout(r, 100));
            }
            return this.tts;
        }

        this.isInitializing = true;
        try {
            console.log('Initializing Kokoro TTS...');

            // Detect WebGPU support
            let device: 'webgpu' | 'wasm' = 'wasm';
            if ('gpu' in navigator) {
                try {
                    const adapter = await (navigator as any).gpu.requestAdapter();
                    if (adapter) {
                        device = 'webgpu';
                        console.log('WebGPU detected, using GPU for TTS');
                    }
                } catch (e) {
                    console.warn('WebGPU detection failed, falling back to CPU', e);
                }
            }

            // Load the model
            this.tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-ONNX", {
                dtype: device === 'webgpu' ? "fp32" : "q8", // WebGPU works best with fp32 or fp16, CPU with q8
                device: device
            });
            console.log(`Kokoro TTS initialized (${device})`);

            // Initialize AudioContext on user interaction
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
        } catch (error) {
            console.error('Failed to initialize Kokoro TTS:', error);
            // If WebGPU failed, try force CPU?
            // For now, just throw
            throw error;
        } finally {
            this.isInitializing = false;
        }
        return this.tts;
    }

    async speak(text: string, voiceId: string, speed: number = 1.0, onEnd?: () => void) {
        try {
            const tts = await this.initialize();

            console.log(`Generating audio for (streaming): "${text}" with voice ${voiceId}`);

            // Split into sentences for streaming playback
            const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];

            const audioQueue: { buffer: AudioBuffer }[] = [];
            let isPlaying = false;
            // Use a unique ID to track if we should stop
            const currentSequenceId = Date.now();
            (this as any)._currentSequenceId = currentSequenceId;

            const processQueue = async () => {
                if (isPlaying || audioQueue.length === 0) return;

                // Double check if we were stopped
                if ((this as any)._currentSequenceId !== currentSequenceId) return;

                isPlaying = true;
                const next = audioQueue.shift();
                if (next) {
                    await this.playAudioBuffer(next.buffer, () => {
                        isPlaying = false;
                        processQueue();
                    });
                } else {
                    isPlaying = false;
                }
            };

            // Generation Loop
            for (const sentence of sentences) {
                if ((this as any)._currentSequenceId !== currentSequenceId) break; // Stopped
                if (!sentence.trim()) continue;

                // Generate chunk
                const result = await tts.generate(sentence.trim(), {
                    voice: voiceId,
                    speed: speed,
                });

                if ((this as any)._currentSequenceId !== currentSequenceId) break;

                // Create AudioBuffer
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                }
                const buffer = this.audioContext.createBuffer(1, result.audio.length, result.sampling_rate);
                buffer.copyToChannel(result.audio as any, 0);

                audioQueue.push({ buffer });
                processQueue(); // Ensure player is running
            }

            // Wait until queue is empty to call onEnd
            const checkDone = setInterval(() => {
                if ((this as any)._currentSequenceId !== currentSequenceId) {
                    clearInterval(checkDone);
                    return;
                }
                if (!isPlaying && audioQueue.length === 0) {
                    clearInterval(checkDone);
                    if (onEnd) onEnd();
                }
            }, 100);

        } catch (error) {
            console.error('Kokoro speak error:', error);
            if (onEnd) onEnd();
        }
    }

    private playAudioBuffer(buffer: AudioBuffer, onEnded: () => void) {
        return new Promise<void>((resolve) => {
            if (!this.audioContext) {
                onEnded();
                return resolve();
            }
            if (this.audioContext.state === 'suspended') this.audioContext.resume();

            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);
            this.currentSource = source;

            source.onended = () => {
                onEnded();
                resolve();
            };

            source.start();
        });
    }

    /**
     * Speak multiple segments sequentially with different voices (for podcast feature)
     */
    async speakSegments(
        segments: Array<{ text: string; voiceId: string }>,
        onSegmentStart?: (index: number, text: string) => void,
        onEnd?: () => void
    ) {
        try {
            const tts = await this.initialize();

            const podcastId = Date.now();
            (this as any)._podcastSequenceId = podcastId;

            console.log('[Podcast] Starting playback with', segments.length, 'segments');

            for (let i = 0; i < segments.length; i++) {
                // Check if stopped
                if ((this as any)._podcastSequenceId !== podcastId) {
                    console.log('[Podcast] Stopped at segment', i);
                    return;
                }

                const segment = segments[i];
                if (!segment.text.trim()) continue;

                console.log(`[Podcast] Playing segment ${i + 1}/${segments.length}:`, segment.voiceId);

                // Notify segment start
                if (onSegmentStart) {
                    onSegmentStart(i, segment.text);
                }

                // Generate audio for this segment directly (don't use speak() to avoid sequence ID conflict)
                const result = await tts.generate(segment.text, { voice: segment.voiceId });

                // Check again if stopped during generation
                if ((this as any)._podcastSequenceId !== podcastId) {
                    console.log('[Podcast] Stopped during generation');
                    return;
                }

                // Get audio context
                if (!this.audioContext) {
                    this.audioContext = new AudioContext();
                }

                // Create audio buffer
                const sampleRate = result.sampling_rate || 24000;
                const audioBuffer = this.audioContext.createBuffer(1, result.audio.length, sampleRate);
                audioBuffer.copyToChannel(result.audio as any, 0);

                // Play and wait for completion
                await new Promise<void>((resolve) => {
                    const source = this.audioContext!.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(this.audioContext!.destination);
                    this.currentSource = source;

                    source.onended = () => {
                        this.currentSource = null;
                        resolve();
                    };

                    source.start();
                });

                // Small pause between speakers
                if (i < segments.length - 1) {
                    await new Promise(r => setTimeout(r, 400));
                }
            }

            console.log('[Podcast] Playback complete');
            if (onEnd && (this as any)._podcastSequenceId === podcastId) {
                onEnd();
            }
        } catch (error) {
            console.error('[Podcast] Playback error:', error);
            if (onEnd) onEnd();
        }
    }

    stop() {
        // Invalidate sequences to stop both regular speech and podcasts
        (this as any)._currentSequenceId = 0;
        (this as any)._podcastSequenceId = 0;

        if (this.currentSource) {
            try {
                this.currentSource.stop();
            } catch (e) {
                // Ignore
            }
            this.currentSource = null;
        }

        // Also unpause if stopped
        this.isPaused = false;
        if (this.pauseResolve) {
            this.pauseResolve();
            this.pauseResolve = null;
        }
    }

    pause() {
        if (!this.isPaused && this.audioContext) {
            this.isPaused = true;
            this.audioContext.suspend();
            console.log('[Kokoro] Paused');
        }
    }

    resume() {
        if (this.isPaused && this.audioContext) {
            this.isPaused = false;
            this.audioContext.resume();
            console.log('[Kokoro] Resumed');
        }
    }

    getIsPaused() {
        return this.isPaused;
    }
}

export const kokoroService = new KokoroService();
