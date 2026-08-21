import React from 'react';
import { Volume2, Sparkles, Sliders, Users, Music2 } from 'lucide-react';
import { GenerationMode } from '../types';

interface HeaderProps {
  mode: GenerationMode;
  setMode: (mode: GenerationMode) => void;
  hasGeneratedClips: boolean;
  onOpenPresets: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  setMode,
  onOpenPresets,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-indigo-600 via-violet-600 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                VocalCraft Studio
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                <Sparkles className="w-3 h-3 mr-1 text-indigo-500" />
                Gemini TTS HD
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Natural English Accents & Customizable Voice Styles
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs & Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80">
            <button
              id="mode-single-btn"
              type="button"
              onClick={() => setMode('single')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'single'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Solo Voice</span>
            </button>

            <button
              id="mode-dialogue-btn"
              type="button"
              onClick={() => setMode('dialogue')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'dialogue'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2-Voice Dialogue</span>
            </button>
          </div>

          <button
            id="open-presets-btn"
            type="button"
            onClick={onOpenPresets}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
          >
            <Music2 className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Script Library</span>
            <span className="sm:hidden">Scripts</span>
          </button>
        </div>
      </div>
    </header>
  );
};
