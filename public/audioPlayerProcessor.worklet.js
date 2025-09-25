// Audio sample buffer to minimize reallocations
class ExpandableBuffer {
    constructor() {
        // Start with one second's worth of buffered audio capacity before needing to expand
        this.buffer = new Float32Array(24000);
        this.readIndex = 0;
        this.writeIndex = 0;
        this.underflowedSamples = 0;
        this.isInitialBuffering = true;
        this.initialBufferLength = 24000;  // One second at 24kHz - much larger buffer for stability
        this.lastWriteTime = 0;
    }

    write(samples) {
        const now = Date.now();
        this.lastWriteTime = now;

        if (this.writeIndex + samples.length <= this.buffer.length) {
            // Enough space to append the new samples
            this.buffer.set(samples, this.writeIndex);
            this.writeIndex += samples.length;
            if (this.writeIndex - this.readIndex >= this.initialBufferLength) {
                // Filled the initial buffer length, so we can start playback with some cushion
                this.isInitialBuffering = false;
            }
            return;
        }
        else {
            // Not enough space ...
            if (samples.length <= this.readIndex) {
                // ... but we can shift samples to the beginning of the buffer
                const subarray = this.buffer.subarray(this.readIndex, this.writeIndex);
                this.buffer.set(subarray);
            }
            else {
                // ... and we need to grow the buffer capacity to make room for more audio
                const newLength = (samples.length + this.writeIndex - this.readIndex) * 2;
                const newBuffer = new Float32Array(newLength);
                newBuffer.set(this.buffer.subarray(this.readIndex, this.writeIndex));
                this.buffer = newBuffer;
            }
            this.writeIndex -= this.readIndex;
            this.readIndex = 0;
        }
        // This code is now only reached if we had to resize the buffer
        this.buffer.set(samples, this.writeIndex);
        this.writeIndex += samples.length;
        if (this.writeIndex - this.readIndex >= this.initialBufferLength) {
            // Filled the initial buffer length, so we can start playback with some cushion
            this.isInitialBuffering = false;
        }
    }

    read(destination) {
        let copyLength = 0;
        if (!this.isInitialBuffering) {
            // Only start to play audio after we've built up some initial cushion
            copyLength = Math.min(destination.length, this.writeIndex - this.readIndex);
        }
        
        if (copyLength > 0) {
            destination.set(this.buffer.subarray(this.readIndex, this.readIndex + copyLength));
            this.readIndex += copyLength;
        }

        if (copyLength < destination.length) {
            // Not enough samples (buffer underflow). Fill the rest with silence.
            // Use a gentle fade to silence to reduce glitches
            const remainingLength = destination.length - copyLength;
            for (let i = copyLength; i < destination.length; i++) {
                // Gentle fade to silence instead of abrupt cut
                const fadeRatio = Math.max(0, 1 - (i - copyLength) / Math.min(remainingLength, 64));
                destination[i] = 0 * fadeRatio;
            }
            this.underflowedSamples += remainingLength;
        }
        
        if (copyLength === 0) {
            // Ran out of audio, so refill the buffer to the initial length before playing more
            this.isInitialBuffering = true;
        }
    }

    clearBuffer() {
        this.readIndex = 0;
        this.writeIndex = 0;
        this.isInitialBuffering = true;
    }
}

class AudioPlayerProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.playbackBuffer = new ExpandableBuffer();
        this.port.onmessage = (event) => {
            if (event.data.type === "audio") {
                this.playbackBuffer.write(event.data.audioData);
            }
            else if (event.data.type === "initial-buffer-length") {
                // Override the current playback initial buffer length
                this.playbackBuffer.initialBufferLength = event.data.bufferLength;
            }
            else if (event.data.type === "barge-in") {
                this.playbackBuffer.clearBuffer();
            }
        };
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0][0]; // Assume one output with one channel
        this.playbackBuffer.read(output);
        return true; // True to continue processing
    }
}

registerProcessor("audio-player-processor", AudioPlayerProcessor);
