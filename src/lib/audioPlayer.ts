export class AudioPlayer {
  private initialized = false;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private analyser: AnalyserNode | null = null;

  async start(): Promise<void> {
    if (this.initialized) return;

    try {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;

      // Load the audio worklet
      await this.audioContext.audioWorklet.addModule('/audioPlayerProcessor.worklet.js');

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

  bargeIn(): void {
    if (!this.initialized || !this.workletNode) return;
    this.workletNode.port.postMessage({
      type: "barge-in",
    });
  }

  stop(): void {
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

  playAudio(samples: Float32Array): void {
    if (!this.initialized || !this.audioContext || !this.workletNode) {
      console.error("The audio player is not initialized. Call start() before attempting to play audio.");
      return;
    }

    // Resume the AudioContext if it's suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(err => {
        console.error("Failed to resume AudioContext:", err);
      });
    }

    // Send the audio samples to the worklet
    this.workletNode.port.postMessage({
      type: "play-audio",
      samples: samples,
    });
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyser) return null;
    
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }
}

export function base64ToFloat32Array(base64: string): Float32Array {
  try {
    // Remove data URL prefix if present
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    
    // Decode base64 to binary string
    const binaryString = atob(base64Data);
    
    // Convert binary string to Uint8Array
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Convert to Float32Array (16-bit PCM data from server)
    // Server sends 16-bit PCM, so we need to read 2 bytes per sample
    const samples = new Float32Array(bytes.length / 2);
    const dataView = new DataView(bytes.buffer);
    
    for (let i = 0; i < samples.length; i++) {
      // Read 16-bit signed integer (little-endian) and convert to float
      const int16Sample = dataView.getInt16(i * 2, true);
      samples[i] = int16Sample / 32768.0; // Convert to -1.0 to 1.0 range
    }
    
    console.log(`Converted base64 to Float32Array: ${bytes.length} bytes -> ${samples.length} samples`);
    return samples;
  } catch (error) {
    console.error("Error converting base64 to Float32Array:", error);
    return new Float32Array(0);
  }
}

export default AudioPlayer;
