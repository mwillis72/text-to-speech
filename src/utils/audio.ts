import { AudioDspSettings } from '../types';

let globalAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!globalAudioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    globalAudioCtx = new AudioCtxClass();
  }
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

/**
 * Base64 string to ArrayBuffer helper
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * ArrayBuffer to Blob URL helper
 */
export function createAudioUrlFromBase64(base64: string, mimeType: string = 'audio/wav'): string {
  const buffer = base64ToArrayBuffer(base64);
  const blob = new Blob([buffer], { type: mimeType });
  return URL.createObjectURL(blob);
}

/**
 * Create synthetic impulse response for room/hall acoustics
 */
function createImpulseResponse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = length - i;
    const factor = Math.pow(n / length, decay);
    left[i] = (Math.random() * 2 - 1) * factor;
    right[i] = (Math.random() * 2 - 1) * factor;
  }
  return impulse;
}

/**
 * Enhanced Web Audio Player with DSP chain
 */
export class EnhancedAudioPlayer {
  private ctx: AudioContext;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  private lowFilter: BiquadFilterNode;
  private midFilter: BiquadFilterNode;
  private highFilter: BiquadFilterNode;
  private convolverNode: ConvolverNode | null = null;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private pannerNode: StereoPannerNode | null = null;

  private startTime: number = 0;
  private pauseOffset: number = 0;
  private isPlaying: boolean = false;
  private onEndCallback: (() => void) | null = null;
  private onTimeUpdateCallback: ((current: number, total: number) => void) | null = null;
  private animationFrameId: number | null = null;

  constructor() {
    this.ctx = getAudioContext();
    this.gainNode = this.ctx.createGain();

    // 3-Band Equalizer
    this.lowFilter = this.ctx.createBiquadFilter();
    this.lowFilter.type = 'lowshelf';
    this.lowFilter.frequency.value = 320; // 320 Hz

    this.midFilter = this.ctx.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 2400; // 2.4 kHz
    this.midFilter.Q.value = 1.0;

    this.highFilter = this.ctx.createBiquadFilter();
    this.highFilter.type = 'highshelf';
    this.highFilter.frequency.value = 6000; // 6 kHz

    // Reverb wet/dry routing
    this.dryGain = this.ctx.createGain();
    this.wetGain = this.ctx.createGain();
    this.wetGain.gain.value = 0; // Default dry

    // Connect filters in series
    this.lowFilter.connect(this.midFilter);
    this.midFilter.connect(this.highFilter);

    // Pan node if supported
    if (this.ctx.createStereoPanner) {
      this.pannerNode = this.ctx.createStereoPanner();
      this.highFilter.connect(this.pannerNode);
      this.pannerNode.connect(this.gainNode);
    } else {
      this.highFilter.connect(this.gainNode);
    }

    this.gainNode.connect(this.dryGain);
    this.dryGain.connect(this.ctx.destination);
  }

  async loadAudioFromBase64(base64: string): Promise<number> {
    this.stop();
    const arrayBuffer = base64ToArrayBuffer(base64);
    // Clone arrayBuffer since decodeAudioData detaches the buffer
    const copyBuffer = arrayBuffer.slice(0);
    this.audioBuffer = await this.ctx.decodeAudioData(copyBuffer);
    this.pauseOffset = 0;
    return this.audioBuffer.duration;
  }

  async loadAudioFromBlobUrl(blobUrl: string): Promise<number> {
    this.stop();
    const response = await fetch(blobUrl);
    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.pauseOffset = 0;
    return this.audioBuffer.duration;
  }

  applyDspSettings(settings: AudioDspSettings) {
    this.gainNode.gain.setValueAtTime(settings.volume, this.ctx.currentTime);

    if (this.pannerNode) {
      this.pannerNode.pan.setValueAtTime(settings.spatialPan, this.ctx.currentTime);
    }

    // EQ Presets
    switch (settings.eqPreset) {
      case 'warmth':
        this.lowFilter.gain.setValueAtTime(3.5, this.ctx.currentTime);
        this.midFilter.gain.setValueAtTime(-1.0, this.ctx.currentTime);
        this.highFilter.gain.setValueAtTime(-2.0, this.ctx.currentTime);
        break;
      case 'clarity':
        this.lowFilter.gain.setValueAtTime(-2.0, this.ctx.currentTime);
        this.midFilter.gain.setValueAtTime(2.0, this.ctx.currentTime);
        this.highFilter.gain.setValueAtTime(4.0, this.ctx.currentTime);
        break;
      case 'broadcast':
        this.lowFilter.gain.setValueAtTime(4.0, this.ctx.currentTime);
        this.midFilter.gain.setValueAtTime(1.5, this.ctx.currentTime);
        this.highFilter.gain.setValueAtTime(3.0, this.ctx.currentTime);
        break;
      case 'deep-bass':
        this.lowFilter.gain.setValueAtTime(6.0, this.ctx.currentTime);
        this.midFilter.gain.setValueAtTime(0, this.ctx.currentTime);
        this.highFilter.gain.setValueAtTime(-3.0, this.ctx.currentTime);
        break;
      case 'bright':
        this.lowFilter.gain.setValueAtTime(-3.0, this.ctx.currentTime);
        this.midFilter.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.highFilter.gain.setValueAtTime(5.0, this.ctx.currentTime);
        break;
      default: // flat
        this.lowFilter.gain.setValueAtTime(0, this.ctx.currentTime);
        this.midFilter.gain.setValueAtTime(0, this.ctx.currentTime);
        this.highFilter.gain.setValueAtTime(0, this.ctx.currentTime);
        break;
    }

    // Reverb Presets
    if (settings.reverbPreset === 'none') {
      this.wetGain.gain.setValueAtTime(0, this.ctx.currentTime);
    } else {
      let duration = 1.0;
      let decay = 2.0;
      let wetLevel = 0.25;

      if (settings.reverbPreset === 'room') {
        duration = 0.8;
        decay = 3.0;
        wetLevel = 0.2;
      } else if (settings.reverbPreset === 'hall') {
        duration = 2.4;
        decay = 1.8;
        wetLevel = 0.4;
      } else if (settings.reverbPreset === 'radio-booth') {
        duration = 0.3;
        decay = 5.0;
        wetLevel = 0.12;
      }

      if (!this.convolverNode) {
        this.convolverNode = this.ctx.createConvolver();
        this.gainNode.connect(this.convolverNode);
        this.convolverNode.connect(this.wetGain);
        this.wetGain.connect(this.ctx.destination);
      }

      this.convolverNode.buffer = createImpulseResponse(this.ctx, duration, decay);
      this.wetGain.gain.setValueAtTime(wetLevel, this.ctx.currentTime);
    }

    // Update active source playback rate if currently playing
    if (this.sourceNode && this.isPlaying) {
      this.sourceNode.playbackRate.setValueAtTime(settings.playbackRate, this.ctx.currentTime);
    }
  }

  play(startOffset?: number, playbackRate: number = 1.0) {
    if (!this.audioBuffer) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Stop current source if any
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {
        // ignore
      }
    }

    const offset = startOffset !== undefined ? startOffset : this.pauseOffset;
    if (offset >= this.audioBuffer.duration) {
      this.pauseOffset = 0;
    }

    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.playbackRate.setValueAtTime(playbackRate, this.ctx.currentTime);
    this.sourceNode.connect(this.lowFilter);

    const safeOffset = Math.min(offset, this.audioBuffer.duration - 0.05);
    this.startTime = this.ctx.currentTime - (safeOffset / playbackRate);
    this.sourceNode.start(0, Math.max(0, safeOffset));
    this.isPlaying = true;

    this.sourceNode.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pauseOffset = 0;
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
        }
        if (this.onEndCallback) this.onEndCallback();
      }
    };

    this.startTrackingTime(playbackRate);
  }

  pause() {
    if (!this.isPlaying || !this.audioBuffer) return;
    const currentRate = this.sourceNode?.playbackRate.value || 1.0;
    const elapsed = (this.ctx.currentTime - this.startTime) * currentRate;
    this.pauseOffset = Math.min(elapsed, this.audioBuffer.duration);
    this.isPlaying = false;

    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {
        // ignore
      }
      this.sourceNode = null;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  seek(targetSeconds: number, playbackRate: number = 1.0) {
    if (!this.audioBuffer) return;
    const clamped = Math.max(0, Math.min(targetSeconds, this.audioBuffer.duration));
    this.pauseOffset = clamped;

    if (this.isPlaying) {
      this.play(clamped, playbackRate);
    } else {
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(clamped, this.audioBuffer.duration);
      }
    }
  }

  stop() {
    this.isPlaying = false;
    this.pauseOffset = 0;
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {
        // ignore
      }
      this.sourceNode = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private startTrackingTime(playbackRate: number) {
    const track = () => {
      if (this.isPlaying && this.audioBuffer) {
        const elapsed = (this.ctx.currentTime - this.startTime) * playbackRate;
        const current = Math.min(elapsed, this.audioBuffer.duration);
        if (this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback(current, this.audioBuffer.duration);
        }
        this.animationFrameId = requestAnimationFrame(track);
      }
    };
    this.animationFrameId = requestAnimationFrame(track);
  }

  onEnd(callback: () => void) {
    this.onEndCallback = callback;
  }

  onTimeUpdate(callback: (current: number, total: number) => void) {
    this.onTimeUpdateCallback = callback;
  }

  getDuration(): number {
    return this.audioBuffer ? this.audioBuffer.duration : 0;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

/**
 * Extract normalized waveform peaks for UI visualization
 */
export function extractWaveformPeaks(buffer: AudioBuffer, numBuckets: number = 64): number[] {
  const channelData = buffer.getChannelData(0);
  const step = Math.floor(channelData.length / numBuckets);
  const peaks: number[] = [];

  for (let i = 0; i < numBuckets; i++) {
    const start = i * step;
    const end = Math.min(start + step, channelData.length);
    let max = 0;
    for (let j = start; j < end; j++) {
      const val = Math.abs(channelData[j]);
      if (val > max) max = val;
    }
    // Normalize with minimum height for aesthetic waveform display
    peaks.push(Math.max(0.12, Math.min(1.0, max * 1.5)));
  }

  return peaks;
}

/**
 * Browser Web Speech API fallback engine
 */
export function getBrowserVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  return window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
}

export function speakWithWebSpeech(
  text: string,
  options: {
    accentCode?: string;
    rate?: number;
    pitch?: number;
    onEnd?: () => void;
  } = {}
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();

  if (options.accentCode) {
    const matchedVoice = voices.find((v) => v.lang.toLowerCase().includes(options.accentCode!.toLowerCase()));
    if (matchedVoice) utterance.voice = matchedVoice;
  }

  utterance.rate = options.rate || 1.0;
  utterance.pitch = options.pitch || 1.0;

  if (options.onEnd) {
    utterance.onend = options.onEnd;
  }

  window.speechSynthesis.speak(utterance);
}
