import React, { useState } from 'react';
import { Users, Sparkles, Volume2, Plus, Trash2, ArrowRight, Wand2, Loader2 } from 'lucide-react';
import { VoiceProfile, EnglishAccent } from '../types';

interface DialogueSpeaker {
  speaker: string;
  voice: string;
}

interface DialogueStudioProps {
  voices: VoiceProfile[];
  accents: EnglishAccent[];
  selectedAccent: string;
  onSelectAccent: (accent: string) => void;
  dialogueText: string;
  onChangeDialogueText: (text: string) => void;
  speakers: DialogueSpeaker[];
  onChangeSpeakers: (speakers: DialogueSpeaker[]) => void;
  isGenerating: boolean;
  onGenerateDialogue: () => void;
}

export const DialogueStudio: React.FC<DialogueStudioProps> = ({
  voices,
  accents,
  selectedAccent,
  onSelectAccent,
  dialogueText,
  onChangeDialogueText,
  speakers,
  onChangeSpeakers,
  isGenerating,
  onGenerateDialogue,
}) => {
  const [isFormatting, setIsFormatting] = useState(false);

  const handleSpeakerVoiceChange = (index: number, newVoice: string) => {
    const updated = [...speakers];
    updated[index] = { ...updated[index], voice: newVoice };
    onChangeSpeakers(updated);
  };

  const handleSpeakerNameChange = (index: number, newName: string) => {
    const updated = [...speakers];
    updated[index] = { ...updated[index], speaker: newName };
    onChangeSpeakers(updated);
  };

  const handleFormatDialogueWithAi = async () => {
    if (!dialogueText.trim()) return;
    setIsFormatting(true);
    try {
      const res = await fetch('/api/tts/enhance-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: dialogueText,
          goal: 'dialogue',
          accent: selectedAccent,
          style: 'Conversational',
        }),
      });
      const data = await res.json();
      if (data.enhancedText) {
        onChangeDialogueText(data.enhancedText);
      }
    } catch (e) {
      console.error('Failed to format dialogue:', e);
    } finally {
      setIsFormatting(false);
    }
  };

  const handleInsertLine = (speakerName: string) => {
    const newLine = `${speakerName}: `;
    onChangeDialogueText(dialogueText ? `${dialogueText}\n${newLine}` : newLine);
  };

  return (
    <div className="space-y-4">
      {/* Speaker Configuration Bar */}
      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-800 flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Dialogue Cast (2 Speakers)</span>
          </label>
          <span className="text-xs text-indigo-600 font-medium">
            Multi-Speaker Neural Synthesis
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {speakers.map((sp, idx) => (
            <div
              key={idx}
              id={`speaker-card-${idx}`}
              className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Speaker {idx + 1}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                  {sp.voice}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">Name</label>
                  <input
                    type="text"
                    id={`speaker-name-input-${idx}`}
                    value={sp.speaker}
                    onChange={(e) => handleSpeakerNameChange(idx, e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                    placeholder={`Speaker ${idx + 1}`}
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">Assigned Voice</label>
                  <select
                    id={`speaker-voice-select-${idx}`}
                    value={sp.voice}
                    onChange={(e) => handleSpeakerVoiceChange(idx, e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                  >
                    {voices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.gender}, {v.timbre.split(',')[0]})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialogue Script Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-800">
            Conversation Script
          </label>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-500 mr-1">Insert line:</span>
            {speakers.map((sp, idx) => (
              <button
                key={idx}
                type="button"
                id={`insert-line-${sp.speaker.toLowerCase()}`}
                onClick={() => handleInsertLine(sp.speaker)}
                className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 transition-colors"
              >
                + {sp.speaker}
              </button>
            ))}
          </div>
        </div>

        <div className="relative rounded-xl border border-slate-300 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/20 bg-white transition-all shadow-xs">
          <textarea
            id="dialogue-script-textarea"
            value={dialogueText}
            onChange={(e) => onChangeDialogueText(e.target.value)}
            rows={7}
            placeholder={`Format each turn with the speaker name:\n${speakers[0]?.speaker || 'Speaker 1'}: Hi there! Have you listened to the new synthesized audio?\n${speakers[1]?.speaker || 'Speaker 2'}: Yes, the conversational pacing and natural breathing sound incredible.`}
            className="w-full p-3.5 text-sm text-slate-800 placeholder-slate-400 bg-transparent resize-y rounded-xl focus:outline-hidden leading-relaxed font-sans"
          />

          <div className="px-3 py-2 bg-slate-50/90 rounded-b-xl border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              id="ai-format-dialogue-btn"
              disabled={isFormatting || !dialogueText.trim()}
              onClick={handleFormatDialogueWithAi}
              className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isFormatting ? 'Formatting Dialogue...' : 'Auto-Format Script Flow with AI'}</span>
            </button>

            <span className="text-[11px] text-slate-400">
              {dialogueText.length} characters
            </span>
          </div>
        </div>
      </div>

      {/* Generate Dialogue CTA */}
      <div className="flex justify-end">
        <button
          type="button"
          id="generate-dialogue-cta-btn"
          disabled={isGenerating || !dialogueText.trim()}
          onClick={onGenerateDialogue}
          className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-linear-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Synthesizing Multi-Voice Dialogue...</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              <span>Generate 2-Voice Dialogue</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
