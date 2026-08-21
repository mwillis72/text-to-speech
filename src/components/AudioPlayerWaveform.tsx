import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Sliders,
  Sparkles,
  Heart,
  Share2,
  Check,
  ChevronDown,
  ChevronUp,
  FastForward,
} from 'lucide-react';
import { GeneratedVoiceClip, AudioDspSettings } from '../types';
import { EnhancedAudioPlayer, extractWaveformPeaks } from '../utils/audio';

interface AudioPlayerWaveformProps {
  clip: GeneratedVoiceClip | null;
  onToggleFavorite?: (id: string) => void;
}

export const AudioPlayerWaveform: React.FC<AudioPlayerWaveformProps> = ({
  clip,
  onToggleFavorite,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showDspPanel, setShowDspPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);

  // DSP State
  const [dspSettings, setDspSettings] = useState<AudioDspSettings>({
    playbackRate: 1.0,
    volume: 1.0,
    eqPreset: 'broadcast',
    reverbPreset: 'none',
    spatialPan: 0,
  });

  const playerRef = useRef<EnhancedAudioPlayer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize player
  useEffect(() => {
    const player = new EnhancedAudioPlayer();
    playerRef.current = player;

    player.onTimeUpdate((current, total) => {
      setCurrentTime(current);
      if (total > 0) setDuration(total);
    });

    player.onEnd(() => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      player.stop();
    };
  }, []);

  // Load new audio clip when clip changes
  useEffect(() => {
    if (!clip || !playerRef.current) return;

    setIsPlaying(false);
    setCurrentTime(0);

    const loadClip = async () => {
      try {
        const dur = await playerRef.current!.loadAudioFromBase64(clip.audioBase64);
        setDuration(dur);

        // Generate waveform peaks
        const peaks = extractWaveformPeaks((playerRef.current as any).audioBuffer, 80);
        setWaveformPeaks(peaks);

        // Apply DSP settings
        playerRef.current!.applyDspSettings({
          ...dspSettings,
          playbackRate,
        });
      } catch (e) {
        console.error('Failed to load audio into DSP player:', e);
      }
    };

    loadClip();
  }, [clip?.id, clip?.audioBase64]);

  // Update DSP on setting changes
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.applyDspSettings({
        ...dspSettings,
        playbackRate,
      });
    }
  }, [dspSettings, playbackRate]);

  // Render canvas waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const peaks = waveformPeaks.length > 0
      ? waveformPeaks
      : Array.from({ length: 64 }, (_, i) => 0.2 + 0.5 * Math.sin(i * 0.25) * Math.sin(i * 0.25));

    const progress = duration > 0 ? currentTime / duration : 0;
    const barWidth = width / peaks.length;
    const padding = 1.5;

    peaks.forEach((peak, index) => {
      const x = index * barWidth;
      const barHeight = Math.max(4, peak * (height - 8));
      const y = (height - barHeight) / 2;

      const isPlayed = index / peaks.length <= progress;

      if (isPlayed) {
        // Gradient for played portion
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#6366f1'); // Indigo 500
        gradient.addColorStop(1, '#a855f7'); // Purple 500
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = '#cbd5e1'; // Slate 300
      }

      ctx.beginPath();
      ctx.roundRect(x + padding, y, barWidth - padding * 2, barHeight, 2);
      ctx.fill();
    });
  }, [waveformPeaks, currentTime, duration]);

  const handlePlayPause = () => {
    if (!playerRef.current || !clip) return;
    if (isPlaying) {
      playerRef.current.pause();
      setIsPlaying(false);
    } else {
      playerRef.current.play(undefined, playbackRate);
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !playerRef.current || duration === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percentage * duration;

    playerRef.current.seek(targetTime, playbackRate);
    setCurrentTime(targetTime);
  };

  const handleRestart = () => {
    if (!playerRef.current) return;
    playerRef.current.seek(0, playbackRate);
    setCurrentTime(0);
  };

  const handleDownloadWav = () => {
    if (!clip) return;
    const link = document.createElement('a');
    link.href = clip.audioUrl;
    link.download = `${clip.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${clip.voice}_${clip.accent}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareAudio = () => {
    if (!clip) return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  if (!clip) {
    return (
      <div className="p-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-400">
          <Volume2 className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-700">Audio Preview Player</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-0.5">
            Configure your voice, accent, and style above and click &quot;Generate Voice Audio&quot; to synthesize natural spoken audio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-md shadow-indigo-500/5 overflow-hidden transition-all">
      {/* Top Bar: Title, Tags & Quick Actions */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-linear-to-r from-slate-50 via-indigo-50/20 to-purple-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800">
              <Sparkles className="w-3 h-3 mr-1 text-indigo-600" />
              Generated Audio Output
            </span>
            <span className="text-xs font-semibold text-slate-800">
              {clip.voice} • {clip.accent}
            </span>
          </div>
          <p className="text-xs text-slate-500 line-clamp-1 mt-1 font-sans italic">
            &quot;{clip.text}&quot;
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 self-end sm:self-center">
          {onToggleFavorite && (
            <button
              type="button"
              id="favorite-clip-btn"
              onClick={() => onToggleFavorite(clip.id)}
              className={`p-2 rounded-xl border transition-colors ${
                clip.isFavorite
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
              title="Save to favorites"
            >
              <Heart className={`w-4 h-4 ${clip.isFavorite ? 'fill-rose-500' : ''}`} />
            </button>
          )}

          <button
            type="button"
            id="share-clip-btn"
            onClick={handleShareAudio}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
            title="Share audio"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            id="download-wav-btn"
            onClick={handleDownloadWav}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download WAV</span>
          </button>
        </div>
      </div>

      {/* Interactive Waveform Canvas */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="relative group cursor-pointer bg-slate-900/5 rounded-xl p-3 border border-slate-200/60">
          <canvas
            id="waveform-canvas"
            ref={canvasRef}
            width={720}
            height={64}
            onClick={handleSeek}
            className="w-full h-16 rounded-lg cursor-pointer transition-opacity group-hover:opacity-95"
          />

          {/* Time Scrubber Indicator overlay */}
          <div className="flex items-center justify-between text-[11px] font-mono font-medium text-slate-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls & Speed Select */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Main Transport */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              id="restart-audio-btn"
              onClick={handleRestart}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              id="play-pause-btn"
              onClick={handlePlayPause}
              className="w-12 h-12 rounded-full bg-linear-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/30 transition-transform active:scale-95"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
            </button>

            {/* Speed Pills */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  id={`speed-btn-${rate}`}
                  onClick={() => setPlaybackRate(rate)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                    playbackRate === rate
                      ? 'bg-white text-indigo-700 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* DSP Studio Effects Toggle */}
          <button
            type="button"
            id="toggle-dsp-btn"
            onClick={() => setShowDspPanel(!showDspPanel)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              showDspPanel
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Studio DSP Acoustics</span>
            {showDspPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Live DSP Acoustics Panel */}
        {showDspPanel && (
          <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200/90 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Real-Time Voice DSP Processing
              </span>
              <span className="text-[11px] text-slate-500">
                Web Audio 24kHz Processing Chain
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Equalizer Presets */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Equalizer Profile
                </label>
                <select
                  id="eq-preset-select"
                  value={dspSettings.eqPreset}
                  onChange={(e) =>
                    setDspSettings({ ...dspSettings, eqPreset: e.target.value as any })
                  }
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="broadcast">Radio / Broadcast Warmth</option>
                  <option value="warmth">Warm Low-Mids</option>
                  <option value="clarity">Vocal Clarity & Air</option>
                  <option value="deep-bass">Rich Deep Resonance</option>
                  <option value="bright">Crisp High End</option>
                  <option value="flat">Flat Studio Reference</option>
                </select>
              </div>

              {/* Acoustic Reverb Presets */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Acoustic Ambience (Reverb)
                </label>
                <select
                  id="reverb-preset-select"
                  value={dspSettings.reverbPreset}
                  onChange={(e) =>
                    setDspSettings({ ...dspSettings, reverbPreset: e.target.value as any })
                  }
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="none">Studio Dry (Direct Vocal)</option>
                  <option value="room">Warm Acoustic Room</option>
                  <option value="hall">Cinematic Concert Hall</option>
                  <option value="radio-booth">Acoustically Treated Booth</option>
                </select>
              </div>

              {/* Spatial Pan */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Spatial Stereo Pan</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {dspSettings.spatialPan === 0
                      ? 'Center'
                      : dspSettings.spatialPan < 0
                      ? `L ${Math.round(Math.abs(dspSettings.spatialPan) * 100)}%`
                      : `R ${Math.round(dspSettings.spatialPan * 100)}%`}
                  </span>
                </label>
                <input
                  id="spatial-pan-slider"
                  type="range"
                  min="-1"
                  max="1"
                  step="0.05"
                  value={dspSettings.spatialPan}
                  onChange={(e) =>
                    setDspSettings({ ...dspSettings, spatialPan: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
