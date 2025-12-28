/**
 * Voice Service Utility
 * Handles Speech-to-Text (STT) and Text-to-Speech (TTS) using Web Speech APIs
 */

import { kokoroService, KOKORO_VOICES } from './kokoro';

export class VoiceService {
    private static recognition: any = null;
    private static synthesis = window.speechSynthesis;

    /**
     * Initialize Speech Recognition (STT)
     */
    static initRecognition(onResult: (text: string) => void, onEnd: () => void, onError: (err: any) => void) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.error('Speech recognition not supported in this browser.');
            return null;
        }

        // Create recognition instance if it doesn't exist
        if (!this.recognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
        }

        // Always update callbacks (important for reinitializing in voice mode)
        this.recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0])
                .map((result: any) => result.transcript)
                .join('');
            onResult(transcript);
        };

        this.recognition.onend = () => {
            onEnd();
        };

        this.recognition.onerror = (event: any) => {
            onError(event.error);
        };

        return this.recognition;
    }

    /**
     * Start Listening
     */
    static startListening() {
        if (this.recognition) {
            try {
                this.recognition.start();
            } catch (e) {
                console.warn('Recognition already started or failed to start', e);
            }
        }
    }

    /**
     * Stop Listening
     */
    static stopListening() {
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    /**
     * Speak Text (TTS)
     */
    static speak(text: string, onEnd?: () => void, options?: { voiceId?: string, rate?: number }) {
        // Cancel any ongoing speech (both System and Kokoro)
        this.synthesis.cancel();
        kokoroService.stop();

        if (!text) return;

        // Check if using a Kokoro voice
        if (options?.voiceId && KOKORO_VOICES.some(v => v.id === options.voiceId)) {
            // Use Kokoro
            kokoroService.speak(text, options.voiceId, options.rate, onEnd);
            return;
        }

        // Use System TTS
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options?.rate || 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const voices = this.synthesis.getVoices();

        // Try to match requested voice ID
        if (options?.voiceId) {
            const requestedVoice = voices.find(v => v.voiceURI === options.voiceId || v.name === options.voiceId);
            if (requestedVoice) {
                utterance.voice = requestedVoice;
            }
        }

        // Fallback logic ...
        if (!utterance.voice) {
            const preferredVoice =
                voices.find(v => v.name.includes('Natural') || v.name.includes('Neural')) ||
                voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
                voices.find(v => v.name.includes('Microsoft') && v.name.includes('Online') && v.lang.startsWith('en')) ||
                voices.find(v => v.name.includes('Samantha')) ||
                voices.find(v => v.name.includes('Alex')) ||
                voices.find(v => v.lang.startsWith('en') && v.localService) ||
                voices.find(v => v.lang.startsWith('en')) ||
                voices[0];
            if (preferredVoice) utterance.voice = preferredVoice;
        }

        utterance.onend = () => {
            if (onEnd) onEnd();
        };

        this.synthesis.speak(utterance);
    }

    /**
     * Get available voices (System + Kokoro)
     */
    static getVoices(): (SpeechSynthesisVoice | any)[] {
        const systemVoices = this.synthesis.getVoices();

        // Map Kokoro voices to look like SpeechSynthesisVoice objects
        const kokoroVoices = KOKORO_VOICES.map(v => ({
            voiceURI: v.id,
            name: v.name,
            lang: v.lang,
            localService: true,
            default: false
        }));

        return [...kokoroVoices, ...systemVoices];
    }

    /**
     * Stop Speaking
     */
    static stopSpeaking() {
        this.synthesis.cancel();
        kokoroService.stop();
    }
}
