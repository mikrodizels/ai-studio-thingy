export class AudioStreamer {
  private context: AudioContext;
  private nextTime: number = 0;
  private gainNode: GainNode;

  constructor(context: AudioContext) {
    this.context = context;
    this.gainNode = this.context.createGain();
    this.gainNode.connect(this.context.destination);
  }

  addPCM16(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }

    const buffer = this.context.createBuffer(1, float32Array.length, 24000);
    buffer.getChannelData(0).set(float32Array);

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode);

    if (this.nextTime < this.context.currentTime) {
      this.nextTime = this.context.currentTime + 0.1;
    }
    source.start(this.nextTime);
    this.nextTime += buffer.duration;
  }
  
  stop() {
    this.nextTime = 0;
    this.gainNode.gain.setValueAtTime(0, this.context.currentTime);
    setTimeout(() => {
      this.gainNode.disconnect();
      this.gainNode = this.context.createGain();
      this.gainNode.connect(this.context.destination);
    }, 100);
  }
}
