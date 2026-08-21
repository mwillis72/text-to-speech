import React, { useState } from 'react';
import { X, Sparkles, BookOpen, Music2, ArrowRight, Check } from 'lucide-react';
import { PresetScript } from '../types';

interface PresetScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: PresetScript[];
  onSelectPreset: (preset: PresetScript) => void;
}

export const PresetScriptModal: React.FC<PresetScriptModalProps> = ({
  isOpen,
  onClose,
  presets,
  onSelectPreset,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isOpen) return null;

  const categories: string[] = ['All', ...Array.from(new Set<string>(presets.map((p) => p.category)))];

  const filteredPresets = selectedCategory === 'All'
    ? presets
    : presets.filter((p) => p.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-indigo-50/50 to-purple-50/50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Music2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Curated Script Library
              </h3>
              <p className="text-xs text-slate-500">
                Pre-configured voice acting templates &amp; English accent pairings
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-presets-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="p-3 border-b border-slate-100 flex items-center space-x-1.5 overflow-x-auto bg-slate-50/50">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              id={`cat-filter-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Script Cards List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {filteredPresets.map((preset) => (
            <div
              key={preset.id}
              id={`preset-card-${preset.id}`}
              onClick={() => {
                onSelectPreset(preset);
                onClose();
              }}
              className="group p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all cursor-pointer bg-white"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {preset.title}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                    {preset.category}
                  </span>
                </div>

                <div className="flex items-center space-x-1 text-xs text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Load Script</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-2.5 font-sans">
                &quot;{preset.text}&quot;
              </p>

              <div className="flex items-center space-x-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                <span>
                  Recommended Voice:{' '}
                  <strong className="text-slate-800">{preset.recommendedVoice}</strong>
                </span>
                <span>•</span>
                <span>
                  Accent: <strong className="text-slate-800">{preset.recommendedAccent}</strong>
                </span>
                <span>•</span>
                <span>
                  Style: <strong className="text-slate-800">{preset.recommendedStyle}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
