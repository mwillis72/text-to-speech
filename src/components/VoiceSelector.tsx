import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Check, Volume2, User, Loader2, Pause, Play, VolumeX } from 'lucide-react';
import { VoiceProfile } from '../types';
import { createAudioUrlFromBase64, speakWithWebSpeech } from '../utils/audio';

interface VoiceSelectorProps {
  voices: VoiceProfile[];
  selectedVoiceId: string;
  onSelectVoice: (id: string) => void;
  currentAccent?: string;
}

// In-memory cache for generated preview audio samples
const previewAudioCache: Record<string, string> = {};

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voices,
  selectedVoiceId,
  onSelectVoice,
  currentAccent = 'American Standard',
}) => {
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
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
    setPlayingVoiceId(null);
  };

  const handlePrehearVoice = async (e: React.MouseEvent, voice: VoiceProfile) => {
    e.stopPropagation();

    // If already playing this voice, pause it
    if (playingVoiceId === voice.id) {
      handleStopPreview();
      return;
    }

    // If another is playing, stop it first
    handleStopPreview();

    const cacheKey = `${voice.id}_${currentAccent}`;

    // If cached, play immediately
    if (previewAudioCache[cacheKey]) {
      playAudioBlobUrl(previewAudioCache[cacheKey], voice.id);
      return;
    }

    // Synthesize short sample with Gemini TTS backend
    setLoadingVoiceId(voice.id);
    const sampleText = `Hello! I am ${voice.name}. Ready to bring your script to life in natural tone.`;

    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          voice: voice.id,
          accent: currentAccent,
          style: 'Conversational & Natural',
          mode: 'single',
        }),
      });

      const data = await response.json();

      if (data.success && data.audioBase64) {
        const audioUrl = createAudioUrlFromBase64(data.audioBase64, data.mimeType || 'audio/wav');
        previewAudioCache[cacheKey] = audioUrl;
        playAudioBlobUrl(audioUrl, voice.id);
      } else {
        // Fallback to browser WebSpeech API if API response fails
        fallbackWebSpeech(voice, sampleText);
      }
    } catch (err) {
      console.warn('Backend preview failed, using WebSpeech fallback:', err);
      fallbackWebSpeech(voice, sampleText);
    } finally {
      setLoadingVoiceId(null);
    }
  };

  const playAudioBlobUrl = (url: string, voiceId: string) => {
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingVoiceId(voiceId);

    audio.onended = () => {
      setPlayingVoiceId(null);
      audioRef.current = null;
    };

    audio.onerror = () => {
      setPlayingVoiceId(null);
      audioRef.current = null;
    };

    audio.play().catch((e) => {
      console.warn('Audio play error:', e);
      setPlayingVoiceId(null);
    });
  };

  const fallbackWebSpeech = (voice: VoiceProfile, text: string) => {
    setPlayingVoiceId(voice.id);
    speakWithWebSpeech(text, {
      pitch: voice.gender === 'Female' ? 1.05 : 0.92,
      rate: 1.0,
      onEnd: () => setPlayingVoiceId(null),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800 flex items-center space-x-1.5">
          <User className="w-4 h-4 text-indigo-600" />
          <span>Select Voice Actor</span>
        </label>
        <span className="text-xs text-indigo-600 font-medium flex items-center space-x-1">
          <Volume2 className="w-3.5 h-3.5" />
          <span>Click &quot;Prehear&quot; on any card to sample voice</span>
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {voices.map((voice) => {
          const isSelected = selectedVoiceId === voice.id;
          const isLoading = loadingVoiceId === voice.id;
          const isPlaying = playingVoiceId === voice.id;

          return (
            <div
              key={voice.id}
              id={`voice-card-${voice.id.toLowerCase()}`}
              onClick={() => onSelectVoice(voice.id)}
              className={`group relative p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80 bg-white'
              }`}
            >
              {/* Top Row: Avatar & Status */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-7 h-7 rounded-lg bg-linear-to-tr ${voice.avatarColor} text-white flex items-center justify-center text-xs font-bold shadow-xs`}
                  >
                    {voice.name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-900 leading-tight block">
                      {voice.name}
                    </span>
                    <span className="text-[10px] text-slate-500 block -mt-0.5">
                      {voice.gender}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Timbre & Tag */}
              <p className="text-xs text-slate-600 font-medium line-clamp-1 mb-2">
                {voice.timbre}
              </p>

              {/* Action Bar: Prehear Button & Best Suited Tag */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  id={`prehear-voice-btn-${voice.id.toLowerCase()}`}
                  title={`Prehear ${voice.name}'s voice sample`}
                  onClick={(e) => handlePrehearVoice(e, voice)}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    isPlaying
                      ? 'bg-indigo-600 text-white shadow-xs animate-pulse'
                      : isLoading
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                      <span>Loading...</span>
                    </>
                  ) : isPlaying ? (
                    <>
                      <Pause className="w-3 h-3 fill-current" />
                      <span>Playing</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Prehear</span>
                    </>
                  )}
                </button>

                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]">
                  {voice.tag}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

