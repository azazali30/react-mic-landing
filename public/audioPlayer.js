export default class AudioPlayer {
    constructor() {
        this.initialized = false;
        this.audioContext = null;
        this.workletNode = null;
        this.analyser = null;
    }

    async start() {
        if (this.initialized) return;

        try {
            this.audioContext = new AudioContext({ "sampleRate": 24000 });
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;

            // Load the audio worklet
            await this.audioContext.audioWorklet.addModule('./audioPlayerProcessor.worklet.js');

            this.workletNode = new AudioWorkletNode(this.audioContext, "audio-player-processor");
            this.workletNode.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            // Add error handling for the worklet
            this.workletNode.onprocessorerror = (err) => {
                console.error("AudioWorklet processing error:", err);
            };

            this.initialized = true;
            
            // Ensure the audio context is running
            if (this.audioContext.state !== 'running') {
                console.log("Attempting to resume AudioContext...");
                await this.audioContext.resume();
            }
            
            console.log("Audio player initialized successfully");
        } catch (error) {
            console.error("Failed to initialize audio player:", error);
            // Clean up any partially initialized resources
            this.stop();
            throw error;
        }
    }

    bargeIn() {
        if (!this.initialized) return;
        this.workletNode.port.postMessage({
            type: "barge-in",
        });
    }

    stop() {
        if (!this.initialized) return;

        if (this.audioContext) {
            this.audioContext.close();
        }

        if (this.analyser) {
            this.analyser.disconnect();
        }

        if (this.workletNode) {
            this.workletNode.disconnect();
        }

        this.initialized = false;
        this.audioContext = null;
        this.analyser = null;
        this.workletNode = null;
    }

    playAudio(samples) {
        if (!this.initialized) {
            console.error("The audio player is not initialized. Call start() before attempting to play audio.");
            return;
        }

        // Resume the AudioContext if it's suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(err => {
                console.error("Failed to resume audio context:", err);
            });
        }

        // Check if we have valid audio data
        if (!samples || samples.length === 0) {
            console.warn("Received empty audio data");
            return;
        }

        this.workletNode.port.postMessage({
            type: "audio",
            audioData: samples,
        });
    }
}

// Helper function to convert base64 audio to Float32Array
export function base64ToFloat32Array(base64String) {
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
    }

    return float32Array;
}
