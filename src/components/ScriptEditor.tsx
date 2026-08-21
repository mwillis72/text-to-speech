import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Clock,
  Trash2,
  Copy,
  Check,
  Wand2,
  Volume2,
  Loader2,
  Plus,
} from 'lucide-react';

interface ScriptEditorProps {
  text: string;
  onChangeText: (text: string) => void;
  accent: string;
  style: string;
  isGenerating: boolean;
  onGenerate: () => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  text,
  onChangeText,
  accent,
  style,
  isGenerating,
  onGenerate,
}) => {
  const [isPolishing, setIsPolishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [polishType, setPolishType] = useState<string>('natural-flow');

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  // Standard speech rate: ~140 words per minute
  const estimatedSeconds = Math.max(1, Math.round((wordCount / 140) * 60));

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertTag = (tag: string) => {
    onChangeText(`${text} ${tag} `);
  };

  const handlePolishText = async (goal: string) => {
    if (!text.trim()) return;
    setIsPolishing(true);
    try {
      const res = await fetch('/api/tts/enhance-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          goal,
          accent,
          style,
        }),
      });
      const data = await res.json();
      if (data.enhancedText) {
        onChangeText(data.enhancedText);
      }
    } catch (err) {
      console.error('Failed to polish text:', err);
    } finally {
      setIsPolishing(false);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Header & Metrics */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-800 flex items-center space-x-1.5">
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>Script & Spoken Content</span>
        </label>

        <div className="flex items-center space-x-3 text-xs text-slate-500">
          <span className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>~{estimatedSeconds}s est.</span>
          </span>
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative rounded-xl border border-slate-300 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/20 bg-white transition-all shadow-xs">
        <textarea
          id="script-input-textarea"
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder="Type or paste the English script you want to convert into lifelike speech..."
          rows={6}
          className="w-full p-3.5 text-sm text-slate-800 placeholder-slate-400 bg-transparent resize-y rounded-xl focus:outline-hidden leading-relaxed font-sans"
        />

        {/* Floating Quick Action Toolbar */}
        <div className="px-3 py-2 bg-slate-50/90 rounded-b-xl border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
          {/* Quick Speech Tags */}
          <div className="flex items-center space-x-1 flex-wrap gap-y-1">
            <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center">
              <Plus className="w-3 h-3 mr-0.5" /> Tags:
            </span>
            <button
              type="button"
              id="tag-pause-btn"
              onClick={() => handleInsertTag('[pause]')}
              className="text-[11px] px-2 py-0.5 rounded bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200 transition-colors"
            >
              [pause]
            </button>
            <button
              type="button"
              id="tag-whisper-btn"
              onClick={() => handleInsertTag('[whisper]')}
              className="text-[11px] px-2 py-0.5 rounded bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200 transition-colors"
            >
              [whisper]
            </button>
            <button
              type="button"
              id="tag-emphasis-btn"
              onClick={() => handleInsertTag('[emphasis]')}
              className="text-[11px] px-2 py-0.5 rounded bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200 transition-colors"
            >
              [emphasis]
            </button>
            <button
              type="button"
              id="tag-breath-btn"
              onClick={() => handleInsertTag('[breath]')}
              className="text-[11px] px-2 py-0.5 rounded bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200 transition-colors"
            >
              [breath]
            </button>
          </div>

          {/* Utility Tools */}
          <div className="flex items-center space-x-1.5 ml-auto">
            <button
              type="button"
              id="copy-script-btn"
              onClick={handleCopy}
              title="Copy script"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              id="clear-script-btn"
              onClick={() => onChangeText('')}
              title="Clear script"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* AI Speech Polish Bar & Generate CTA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Script Polish Tool */}
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>AI Polish:</span>
          </span>
          <button
            type="button"
            id="polish-natural-btn"
            disabled={isPolishing || !text.trim()}
            onClick={() => handlePolishText('natural-flow')}
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium border border-slate-200 transition-all disabled:opacity-50"
          >
            {isPolishing && polishType === 'natural-flow' ? 'Polishing...' : 'Natural Flow'}
          </button>
          <button
            type="button"
            id="polish-audiobook-btn"
            disabled={isPolishing || !text.trim()}
            onClick={() => handlePolishText('audiobook')}
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium border border-slate-200 transition-all disabled:opacity-50"
          >
            Storyteller
          </button>
          <button
            type="button"
            id="polish-podcast-btn"
            disabled={isPolishing || !text.trim()}
            onClick={() => handlePolishText('podcast')}
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium border border-slate-200 transition-all disabled:opacity-50"
          >
            Podcast Style
          </button>
          <button
            type="button"
            id="polish-meditation-btn"
            disabled={isPolishing || !text.trim()}
            onClick={() => handlePolishText('meditation')}
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium border border-slate-200 transition-all disabled:opacity-50"
          >
            Meditation Pace
          </button>
        </div>

        {/* Main Generate Speech Button */}
        <button
          id="generate-speech-cta-btn"
          type="button"
          disabled={isGenerating || !text.trim()}
          onClick={onGenerate}
          className="flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-linear-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Synthesizing Voice...</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              <span>Generate Voice Audio</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
