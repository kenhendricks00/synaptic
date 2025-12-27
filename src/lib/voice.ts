/**
 * Voice Service Utility
 * Handles Speech-to-Text (STT) and Text-to-Speech (TTS) using Web Speech APIs
 */

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

        if (!this.recognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

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
        }

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
    static speak(text: string, onEnd?: () => void) {
        // Cancel any ongoing speech
        this.synthesis.cancel();

        if (!text) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Find a nice voice if possible
        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Premium')) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onend = () => {
            if (onEnd) onEnd();
        };

        this.synthesis.speak(utterance);
    }

    /**
     * Stop Speaking
     */
    static stopSpeaking() {
        this.synthesis.cancel();
    }
}
