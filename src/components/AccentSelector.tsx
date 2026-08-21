import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, ChevronUp, Check, Info, Volume2, Loader2, Play, Pause } from 'lucide-react';
import { EnglishAccent } from '../types';
import { createAudioUrlFromBase64 } from '../utils/audio';

interface AccentSelectorProps {
  accents: EnglishAccent[];
  selectedAccentId: string;
  onSelectAccent: (accentId: string) => void;
  selectedVoiceId?: string;
}

const accentAudioCache: Record<string, string> = {};

export const AccentSelector: React.FC<AccentSelectorProps> = ({
  accents,
  selectedAccentId,
  onSelectAccent,
  selectedVoiceId = 'Kore',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingAccentId, setLoadingAccentId] = useState<string | null>(null);
  const [playingAccentId, setPlayingAccentId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleStopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingAccentId(null);
  };

  const handlePrehearAccent = async (e: React.MouseEvent, accent: EnglishAccent) => {
    e.stopPropagation();

    if (playingAccentId === accent.id) {
      handleStopPreview();
      return;
    }

    handleStopPreview();

    const cacheKey = `${selectedVoiceId}_${accent.id}`;
    if (accentAudioCache[cacheKey]) {
      playAccentAudio(accentAudioCache[cacheKey], accent.id);
      return;
    }

    setLoadingAccentId(accent.id);
    const sampleText = `This is an English speech sample in ${accent.name} pronunciation.`;

    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          voice: selectedVoiceId,
          accent: accent.id,
          style: 'Conversational & Natural',
          mode: 'single',
        }),
      });

      const data = await response.json();
      if (data.success && data.audioBase64) {
        const audioUrl = createAudioUrlFromBase64(data.audioBase64, data.mimeType || 'audio/wav');
        accentAudioCache[cacheKey] = audioUrl;
        playAccentAudio(audioUrl, accent.id);
      }
    } catch (err) {
      console.warn('Accent preview failed:', err);
    } finally {
      setLoadingAccentId(null);
    }
  };

  const playAccentAudio = (url: string, accentId: string) => {
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingAccentId(accentId);

    audio.onended = () => {
      setPlayingAccentId(null);
      audioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingAccentId(null);
      audioRef.current = null;
    };

    audio.play().catch(() => setPlayingAccentId(null));
  };

  const selectedAccent = accents.find((a) => a.id === selectedAccentId) || accents[0];

  // Grouped or highlighted top accents
  const primaryAccents = accents.slice(0, 4);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800 flex items-center space-x-1.5">
          <Globe className="w-4 h-4 text-indigo-600" />
          <span>English Accent & Region</span>
        </label>
        <span className="text-xs text-indigo-600 font-medium">
          {selectedAccent.flag} {selectedAccent.name}
        </span>
      </div>

      {/* Quick Select Pill Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {primaryAccents.map((accent) => {
          const isSelected = selectedAccentId === accent.id;
          return (
            <button
              key={accent.id}
              id={`accent-btn-${accent.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              type="button"
              onClick={() => onSelectAccent(accent.id)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold ring-2 ring-indigo-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <span className="text-base">{accent.flag}</span>
                <span className="truncate">{accent.name.split('(')[0].trim()}</span>
              </div>
              {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-1" />}
            </button>
          );
        })}
      </div>

      {/* Accordion for More Accents */}
      <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 overflow-hidden transition-all">
        <button
          type="button"
          id="toggle-more-accents-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <span>
            {isExpanded
              ? 'Hide full accent catalog'
              : `Explore all ${accents.length} regional English accents (Irish, Scottish, Indian, Canadian...)`}
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isExpanded && (
          <div className="p-3 pt-1 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {accents.map((accent) => {
              const isSelected = selectedAccentId === accent.id;
              return (
                <div
                  key={accent.id}
                  id={`accent-option-${accent.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  onClick={() => onSelectAccent(accent.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-medium'
                      : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50/80 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{accent.flag}</span>
                      <span className="text-xs font-semibold">{accent.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {accent.characteristics}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Accent Detail Note */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 bg-indigo-50/40 p-2.5 rounded-lg border border-indigo-100/60">
        <div className="flex items-start space-x-2">
          <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-700">{selectedAccent.name}: </span>
            <span>{selectedAccent.description}</span>
          </div>
        </div>

        <button
          type="button"
          id={`prehear-accent-btn-${selectedAccent.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
          onClick={(e) => handlePrehearAccent(e, selectedAccent)}
          className="ml-3 shrink-0 flex items-center space-x-1 px-2 py-1 rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium text-[11px] shadow-2xs transition-colors"
        >
          {loadingAccentId === selectedAccent.id ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
              <span>Loading...</span>
            </>
          ) : playingAccentId === selectedAccent.id ? (
            <>
              <Pause className="w-3 h-3 fill-current text-indigo-600" />
              <span>Playing</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current text-indigo-600" />
              <span>Hear Accent</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

