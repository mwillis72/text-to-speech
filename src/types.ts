export interface VoiceProfile {
  id: string;
  name: string;
  gender: 'Female' | 'Male' | 'Neutral';
  timbre: string;
  description: string;
  personality: string;
  bestSuitedFor: string[];
  tag: string;
  avatarColor: string;
}

export interface EnglishAccent {
  id: string;
  name: string;
  region: string;
  flag: string;
  description: string;
  characteristics: string;
}

export interface VoiceStyle {
  id: string;
  name: string;
  category: 'Commercial' | 'Storytelling' | 'Casual' | 'Professional' | 'Atmospheric' | 'Expressive';
  description: string;
  promptDirective: string;
  suggestedPace: string;
  suggestedEmotion: string;
  iconName: string;
}

export interface PresetScript {
  id: string;
  title: string;
  category: string;
  recommendedVoice: string;
  recommendedAccent: string;
  recommendedStyle: string;
  text: string;
  isDialogue?: boolean;
  dialogueConfig?: {
    speaker1: { name: string; voice: string };
    speaker2: { name: string; voice: string };
  };
}

export interface GeneratedVoiceClip {
  id: string;
  title: string;
  text: string;
  audioUrl: string;
  audioBase64: string;
  mimeType: string;
  createdAt: number;
  durationSeconds?: number;
  voice: string;
  accent: string;
  style: string;
  tone: string;
  pace: string;
  pitch: string;
  emotion: string;
  wordCount: number;
  characterCount: number;
  isFavorite?: boolean;
  isDialogue?: boolean;
  dialogueInfo?: string;
}

export interface AudioDspSettings {
  playbackRate: number; // 0.5 to 2.0
  volume: number; // 0 to 1
  eqPreset: 'flat' | 'warmth' | 'clarity' | 'broadcast' | 'deep-bass' | 'bright';
  reverbPreset: 'none' | 'room' | 'hall' | 'radio-booth';
  spatialPan: number; // -1 to 1
}

export type GenerationMode = 'single' | 'dialogue' | 'custom-ssml';
