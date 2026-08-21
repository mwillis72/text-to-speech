import React, { useState } from 'react';
import {
  Clock,
  Play,
  Pause,
  Download,
  Trash2,
  Heart,
  Copy,
  Sparkles,
  Volume2,
  Check,
} from 'lucide-react';
import { GeneratedVoiceClip } from '../types';

interface HistoryClipsProps {
  clips: GeneratedVoiceClip[];
  activeClipId: string | null;
  onSelectClip: (clip: GeneratedVoiceClip) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteClip: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryClips: React.FC<HistoryClipsProps> = ({
  clips,
  activeClipId,
  onSelectClip,
  onToggleFavorite,
  onDeleteClip,
  onClearAll,
}) => {
  const [filterFavoriteOnly, setFilterFavoriteOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const displayedClips = filterFavoriteOnly
    ? clips.filter((c) => c.isFavorite)
    : clips;

  const handleCopyText = (clip: GeneratedVoiceClip) => {
    navigator.clipboard.writeText(clip.text);
    setCopiedId(clip.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (e: React.MouseEvent, clip: GeneratedVoiceClip) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = clip.audioUrl;
    link.download = `${clip.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${clip.voice}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (clips.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Voice Generation History
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
            {clips.length}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            id="filter-favorites-btn"
            onClick={() => setFilterFavoriteOnly(!filterFavoriteOnly)}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center space-x-1 ${
              filterFavoriteOnly
                ? 'bg-rose-50 border-rose-200 text-rose-600 font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Heart className="w-3 h-3" />
            <span>Favorites</span>
          </button>

          <button
            type="button"
            id="clear-all-history-btn"
            onClick={onClearAll}
            className="text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {displayedClips.map((clip) => {
          const isActive = activeClipId === clip.id;

          return (
            <div
              key={clip.id}
              id={`history-clip-${clip.id}`}
              onClick={() => onSelectClip(clip)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isActive
                  ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-indigo-600 border border-slate-200'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {clip.title}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 shrink-0 font-medium">
                      {clip.voice} • {clip.accent}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {clip.style.split('&')[0].trim()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate font-sans">
                    {clip.text}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  type="button"
                  title="Toggle favorite"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(clip.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-white transition-colors"
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      clip.isFavorite ? 'fill-rose-500 text-rose-500' : ''
                    }`}
                  />
                </button>

                <button
                  type="button"
                  title="Copy script"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyText(clip);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors"
                >
                  {copiedId === clip.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  title="Download WAV"
                  onClick={(e) => handleDownload(e, clip)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  title="Delete clip"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClip(clip.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
