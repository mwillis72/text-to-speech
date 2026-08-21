import React, { useState, useEffect } from 'react';
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
  BookOpen,
  ListOrdered,
  Layers,
  ChevronRight,
  AlertCircle,
  FileAudio,
} from 'lucide-react';

interface ScriptEditorProps {
  text: string;
  onChangeText: (text: string) => void;
  accent: string;
  style: string;
  isGenerating: boolean;
  onGenerate: () => void;
  onGenerateBrowserVoice?: () => void;
  generationProgress?: { current: number; total: number } | null;
}

interface ScriptSection {
  id: string;
  title: string;
  text: string;
  wordCount: number;
  charCount: number;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  text,
  onChangeText,
  accent,
  style,
  isGenerating,
  onGenerate,
  onGenerateBrowserVoice,
  generationProgress,
}) => {
  const [isPolishing, setIsPolishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [polishType, setPolishType] = useState<string>('natural-flow');
  const [sections, setSections] = useState<ScriptSection[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSectionPicker, setShowSectionPicker] = useState(false);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  // Standard speech rate: ~140 words per minute
  const estimatedSeconds = Math.max(1, Math.round((wordCount / 140) * 60));
  const estimatedMinutes = (estimatedSeconds / 60).toFixed(1);
  const isVeryLong = charCount > 2500;

  // Auto-detect sections when long text is pasted
  useEffect(() => {
    if (text.length > 2500) {
      handleDetectSections();
    } else {
      setSections([]);
    }
  }, [text.length > 2500 ? text.slice(0, 500) : text]);

  const handleDetectSections = async () => {
    if (!text.trim() || text.length < 1500) return;
    setIsLoadingSections(true);
    try {
      const res = await fetch('/api/tts/split-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.sections && data.sections.length > 0) {
        setSections(data.sections);
      }
    } catch (e) {
      console.warn('Failed to detect sections:', e);
    } finally {
      setIsLoadingSections(false);
    }
  };

  const handleSummarizeToAudio = async () => {
    if (!text.trim()) return;
    setIsSummarizing(true);
    try {
      const res = await fetch('/api/tts/summarize-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, style }),
      });
      const data = await res.json();
      if (data.summaryScript) {
        onChangeText(data.summaryScript);
      }
    } catch (e) {
      console.error('Failed to summarize script:', e);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSelectSection = (sec: ScriptSection) => {
    onChangeText(sec.text);
    setShowSectionPicker(false);
  };

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
    setPolishType(goal);
    try {
      const res = await fetch('/api/tts/enhance-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.slice(0, 15000), // Protect against massive token payloads
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="text-sm font-semibold text-slate-800 flex items-center space-x-1.5">
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>Script &amp; Spoken Content</span>
        </label>

        <div className="flex items-center space-x-3 text-xs text-slate-500">
          <span className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {estimatedSeconds > 120 ? `~${estimatedMinutes} mins` : `~${estimatedSeconds}s`} est.
            </span>
          </span>
          <span>{wordCount.toLocaleString()} words</span>
          <span>{charCount.toLocaleString()} chars</span>
        </div>
      </div>

      {/* Long Text Helper Banner when book/chapter is pasted */}
      {isVeryLong && (
        <div className="p-3 bg-linear-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 font-semibold text-indigo-900">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>
                Long Document Detected ({wordCount.toLocaleString()} words • ~{estimatedMinutes} mins audio)
              </span>
            </div>
            {sections.length > 0 && (
              <span className="text-[11px] font-medium bg-indigo-100/80 text-indigo-700 px-2 py-0.5 rounded-full">
                {sections.length} Chapters / Sections Found
              </span>
            )}
          </div>

          <p className="text-slate-600 leading-relaxed text-[11px]">
            TTS generates high-fidelity continuous speech in smart chunks. For extensive multi-chapter manuscripts, you can synthesize chapter by chapter, narrate an AI executive summary, or synthesize the current section.
          </p>

          <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-1">
            {sections.length > 0 && (
              <button
                type="button"
                id="view-chapters-toggle-btn"
                onClick={() => setShowSectionPicker(!showSectionPicker)}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-xs text-[11px]"
              >
                <Layers className="w-3 h-3" />
                <span>{showSectionPicker ? 'Hide Chapters' : 'Select Chapter to Voice'}</span>
              </button>
            )}

            <button
              type="button"
              id="summarize-voice-btn"
              disabled={isSummarizing}
              onClick={handleSummarizeToAudio}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium transition-colors text-[11px] shadow-2xs"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{isSummarizing ? 'Condensing with AI...' : 'Convert to 2-Min Audio Digest'}</span>
            </button>
          </div>

          {/* Chapter Picker Drawer */}
          {showSectionPicker && sections.length > 0 && (
            <div className="mt-2 p-2.5 bg-white rounded-lg border border-indigo-100 max-h-48 overflow-y-auto space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Choose Chapter / Section to Load &amp; Synthesize:
              </span>
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => handleSelectSection(sec)}
                  className="w-full text-left p-2 rounded-md hover:bg-indigo-50/80 text-xs text-slate-700 hover:text-indigo-700 flex items-center justify-between border border-transparent hover:border-indigo-100 transition-colors"
                >
                  <span className="font-semibold truncate max-w-[280px]">{sec.title}</span>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                    {sec.wordCount} words (~{Math.round((sec.wordCount / 140) * 60)}s)
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Textarea */}
      <div className="relative rounded-xl border border-slate-300 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/20 bg-white transition-all shadow-xs">
        <textarea
          id="script-input-textarea"
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder="Type or paste the English script you want to convert into lifelike speech..."
          rows={7}
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

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          {onGenerateBrowserVoice && (
            <button
              id="browser-speech-cta-btn"
              type="button"
              disabled={isGenerating || !text.trim()}
              onClick={onGenerateBrowserVoice}
              title="Instantly voice this script in real-time with zero API latency and no quota limits"
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm border border-slate-200 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <FileAudio className="w-4 h-4 text-slate-500" />
              <span>Instant Browser Speech</span>
            </button>
          )}

          {/* Main Generate Speech Button */}
          <button
            id="generate-speech-cta-btn"
            type="button"
            disabled={isGenerating || !text.trim()}
            onClick={onGenerate}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-linear-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {generationProgress
                    ? `Synthesizing Part ${generationProgress.current}/${generationProgress.total}...`
                    : isVeryLong
                    ? 'Synthesizing...'
                    : 'Synthesizing Voice...'}
                </span>
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
    </div>
  );
};

