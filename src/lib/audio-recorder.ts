export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: AudioWorkletNode | null = null;

  constructor(public sampleRate = 16000) {}

  async start(onData: (base64: string) => void) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.buffer = new Int16Array(2048);
            this.index = 0;
          }
          process(inputs, outputs, parameters) {
            const input = inputs[0];
            if (input && input.length > 0) {
              const channel = input[0];
              for (let i = 0; i < channel.length; i++) {
                let val = Math.max(-1, Math.min(1, channel[i]));
                this.buffer[this.index++] = val < 0 ? val * 0x8000 : val * 0x7FFF;
                if (this.index >= this.buffer.length) {
                  this.port.postMessage(this.buffer);
                  this.buffer = new Int16Array(2048);
                  this.index = 0;
                }
              }
            }
            return true;
          }
        }
        registerProcessor('pcm-processor', PCMProcessor);
      `;
      
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      
      await this.audioContext.audioWorklet.addModule(url);
      this.processor = new AudioWorkletNode(this.audioContext, 'pcm-processor');
      
      this.processor.port.onmessage = (e) => {
        const buffer = e.data as Int16Array;
        const bytes = new Uint8Array(buffer.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        onData(btoa(binary));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
    } catch (err) {
      console.error('Failed to start audio recording', err);
    }
  }

  stop() {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach(t => t.stop());
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
