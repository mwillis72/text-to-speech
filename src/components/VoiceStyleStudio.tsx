import React, { useState } from 'react';
import {
  SlidersHorizontal,
  MessageSquare,
  Radio,
  BookOpen,
  Film,
  Mic,
  Zap,
  Wind,
  Cpu,
  Sparkles,
  Flame,
  Wand2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { VoiceStyle } from '../types';

interface VoiceStyleStudioProps {
  styles: VoiceStyle[];
  selectedStyleId: string;
  onSelectStyle: (styleId: string) => void;
  tone: string;
  setTone: (tone: string) => void;
  pace: string;
  setPace: (pace: string) => void;
  pitch: string;
  setPitch: (pitch: string) => void;
  emotion: string;
  setEmotion: (emotion: string) => void;
  customPromptInstruction: string;
  setCustomPromptInstruction: (inst: string) => void;
}

const EMOTION_OPTIONS = [
  'Neutral',
  'Empathetic',
  'Cheerful',
  'Serious',
  'Dramatic',
  'Inspiring',
  'Mysterious',
  'Curious',
  'Bold',
];

const PACE_OPTIONS = ['Very Slow', 'Slow', 'Normal', 'Brisk', 'Fast'];
const PITCH_OPTIONS = ['Deep', 'Grounded', 'Natural', 'Crisp', 'High'];

export const VoiceStyleStudio: React.FC<VoiceStyleStudioProps> = ({
  styles,
  selectedStyleId,
  onSelectStyle,
  pace,
  setPace,
  pitch,
  setPitch,
  emotion,
  setEmotion,
  customPromptInstruction,
  setCustomPromptInstruction,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const getStyleIcon = (iconName: string) => {
    switch (iconName) {
      case 'MessageSquare':
        return <MessageSquare className="w-3.5 h-3.5" />;
      case 'Radio':
        return <Radio className="w-3.5 h-3.5" />;
      case 'BookOpen':
        return <BookOpen className="w-3.5 h-3.5" />;
      case 'Film':
        return <Film className="w-3.5 h-3.5" />;
      case 'Mic':
        return <Mic className="w-3.5 h-3.5" />;
      case 'Zap':
        return <Zap className="w-3.5 h-3.5" />;
      case 'Wind':
        return <Wind className="w-3.5 h-3.5" />;
      case 'Cpu':
        return <Cpu className="w-3.5 h-3.5" />;
      case 'Sparkles':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'Flame':
        return <Flame className="w-3.5 h-3.5" />;
      default:
        return <SlidersHorizontal className="w-3.5 h-3.5" />;
    }
  };

  const selectedStyle = styles.find((s) => s.id === selectedStyleId) || styles[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800 flex items-center space-x-1.5">
          <Wand2 className="w-4 h-4 text-indigo-600" />
          <span>Voice Style & Delivery Archetype</span>
        </label>
        <span className="text-xs text-slate-500 font-medium">
          {selectedStyle.name}
        </span>
      </div>

      {/* Voice Style Carousel / Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {styles.map((style) => {
          const isSelected = selectedStyleId === style.id;
          return (
            <button
              key={style.id}
              id={`style-btn-${style.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              type="button"
              onClick={() => {
                onSelectStyle(style.id);
                if (style.suggestedPace) setPace(style.suggestedPace);
                if (style.suggestedEmotion) setEmotion(style.suggestedEmotion);
              }}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20 font-medium'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/80 text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-1.5 mb-1.5">
                <div
                  className={`p-1 rounded-md ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {getStyleIcon(style.iconName)}
                </div>
                <span className="text-xs font-semibold leading-tight line-clamp-1">
                  {style.name.split('&')[0].trim()}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-2 leading-snug">
                {style.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Granular Delivery Sliders / Toggles Bar */}
      <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Emotion */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Emotion / Mood</span>
              <span className="text-indigo-600 text-[11px] font-medium">{emotion}</span>
            </label>
            <select
              id="emotion-select"
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {EMOTION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Pace */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Speech Pace</span>
              <span className="text-indigo-600 text-[11px] font-medium">{pace}</span>
            </label>
            <select
              id="pace-select"
              value={pace}
              onChange={(e) => setPace(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {PACE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Pitch */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Vocal Pitch</span>
              <span className="text-indigo-600 text-[11px] font-medium">{pitch}</span>
            </label>
            <select
              id="pitch-select"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {PITCH_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Director Note / Custom Prompt Instruction */}
        <div className="pt-2 border-t border-slate-200/60">
          <button
            type="button"
            id="toggle-advanced-director-btn"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Custom Director Prompt & Inflection Instructions</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="mt-2 space-y-1.5">
              <input
                id="custom-director-prompt-input"
                type="text"
                value={customPromptInstruction}
                onChange={(e) => setCustomPromptInstruction(e.target.value)}
                placeholder="e.g., with a slight conspiratorial whisper, pausing for 1 second after questions"
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-500">
                Direct Gemini TTS with custom acting instructions, pauses, breathiness, or specific delivery tones.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
