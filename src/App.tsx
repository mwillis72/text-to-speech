/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { VoiceSelector } from './components/VoiceSelector';
import { AccentSelector } from './components/AccentSelector';
import { VoiceStyleStudio } from './components/VoiceStyleStudio';
import { ScriptEditor } from './components/ScriptEditor';
import { DialogueStudio } from './components/DialogueStudio';
import { AudioPlayerWaveform } from './components/AudioPlayerWaveform';
import { HistoryClips } from './components/HistoryClips';
import { PresetScriptModal } from './components/PresetScriptModal';
import {
  VOICE_PROFILES,
  ENGLISH_ACCENTS,
  VOICE_STYLES,
  PRESET_SCRIPTS,
} from './data/voices';
import {
  GenerationMode,
  GeneratedVoiceClip,
  PresetScript,
} from './types';
import { createAudioUrlFromBase64, speakWithWebSpeech } from './utils/audio';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<GenerationMode>('single');

  // Solo Voice State
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('Kore');
  const [selectedAccentId, setSelectedAccentId] = useState<string>('American Standard');
  const [selectedStyleId, setSelectedStyleId] = useState<string>('Conversational & Natural');
  const [tone, setTone] = useState<string>('Warm & Engaging');
  const [pace, setPace] = useState<string>('Normal');
  const [pitch, setPitch] = useState<string>('Natural');
  const [emotion, setEmotion] = useState<string>('Empathetic');
  const [customPromptInstruction, setCustomPromptInstruction] = useState<string>('');
  const [scriptText, setScriptText] = useState<string>(PRESET_SCRIPTS[0].text);

  // Dialogue Mode State
  const [dialogueSpeakers, setDialogueSpeakers] = useState([
    { speaker: 'Elena', voice: 'Kore' },
    { speaker: 'Marcus', voice: 'Puck' },
  ]);
  const [dialogueText, setDialogueText] = useState<string>(PRESET_SCRIPTS[5].text);

  // Audio Playback & Generation State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeClip, setActiveClip] = useState<GeneratedVoiceClip | null>(null);
  const [historyClips, setHistoryClips] = useState<GeneratedVoiceClip[]>([]);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState<boolean>(false);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vocalcraft_history_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Rebuild blob URLs from base64
        const hydrated: GeneratedVoiceClip[] = parsed.map((c: any) => ({
          ...c,
          audioUrl: createAudioUrlFromBase64(c.audioBase64, c.mimeType || 'audio/wav'),
        }));
        setHistoryClips(hydrated);
        if (hydrated.length > 0) {
          setActiveClip(hydrated[0]);
        }
      }
    } catch (e) {
      console.warn('Could not load history from local storage:', e);
    }
  }, []);

  // Save history to localStorage
  const saveClipsToStorage = (clips: GeneratedVoiceClip[]) => {
    try {
      const serialized = clips.slice(0, 20).map((c) => ({
        id: c.id,
        title: c.title,
        text: c.text,
        audioBase64: c.audioBase64,
        mimeType: c.mimeType,
        createdAt: c.createdAt,
        voice: c.voice,
        accent: c.accent,
        style: c.style,
        tone: c.tone,
        pace: c.pace,
        pitch: c.pitch,
        emotion: c.emotion,
        wordCount: c.wordCount,
        characterCount: c.characterCount,
        isFavorite: c.isFavorite,
        isDialogue: c.isDialogue,
      }));
      localStorage.setItem('vocalcraft_history_v1', JSON.stringify(serialized));
    } catch (e) {
      console.warn('Failed to persist history:', e);
    }
  };

  // Generate Solo Voice Audio
  const handleGenerateSoloVoice = async () => {
    if (!scriptText.trim()) return;
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scriptText,
          voice: selectedVoiceId,
          accent: selectedAccentId,
          style: selectedStyleId,
          tone,
          pace,
          pitch,
          emotion,
          customPromptInstruction,
          mode: 'single',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.audioBase64) {
        throw new Error(data.error || 'Failed to synthesize voice audio.');
      }

      const audioUrl = createAudioUrlFromBase64(data.audioBase64, data.mimeType || 'audio/wav');

      const newClip: GeneratedVoiceClip = {
        id: `clip-${Date.now()}`,
        title: `${selectedVoiceId} (${selectedAccentId})`,
        text: scriptText,
        audioUrl,
        audioBase64: data.audioBase64,
        mimeType: data.mimeType || 'audio/wav',
        createdAt: Date.now(),
        voice: selectedVoiceId,
        accent: selectedAccentId,
        style: selectedStyleId,
        tone,
        pace,
        pitch,
        emotion,
        wordCount: data.wordCount || scriptText.trim().split(/\s+/).length,
        characterCount: data.characterCount || scriptText.length,
        isFavorite: false,
        isDialogue: false,
      };

      setActiveClip(newClip);
      const updatedClips = [newClip, ...historyClips];
      setHistoryClips(updatedClips);
      saveClipsToStorage(updatedClips);
    } catch (err: any) {
      console.error('Generation failure:', err);
      setErrorMessage(
        err.message || 'Unable to connect to Gemini TTS voice server. Please check your connection and API key in Settings.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate Dialogue Audio
  const handleGenerateDialogue = async () => {
    if (!dialogueText.trim()) return;
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: dialogueText,
          accent: selectedAccentId,
          style: 'Conversational & Natural',
          mode: 'dialogue',
          dialogueSpeakers,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.audioBase64) {
        throw new Error(data.error || 'Failed to synthesize 2-speaker dialogue.');
      }

      const audioUrl = createAudioUrlFromBase64(data.audioBase64, data.mimeType || 'audio/wav');

      const newClip: GeneratedVoiceClip = {
        id: `clip-dialogue-${Date.now()}`,
        title: `Dialogue: ${dialogueSpeakers[0].speaker} & ${dialogueSpeakers[1].speaker}`,
        text: dialogueText,
        audioUrl,
        audioBase64: data.audioBase64,
        mimeType: data.mimeType || 'audio/wav',
        createdAt: Date.now(),
        voice: `${dialogueSpeakers[0].voice} + ${dialogueSpeakers[1].voice}`,
        accent: selectedAccentId,
        style: 'Dialogue',
        tone: 'Conversational',
        pace: 'Normal',
        pitch: 'Natural',
        emotion: 'Dynamic',
        wordCount: data.wordCount || dialogueText.trim().split(/\s+/).length,
        characterCount: data.characterCount || dialogueText.length,
        isFavorite: false,
        isDialogue: true,
      };

      setActiveClip(newClip);
      const updatedClips = [newClip, ...historyClips];
      setHistoryClips(updatedClips);
      saveClipsToStorage(updatedClips);
    } catch (err: any) {
      console.error('Dialogue Generation failure:', err);
      setErrorMessage(err.message || 'Failed to generate dialogue.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = (id: string) => {
    const updated = historyClips.map((c) =>
      c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
    );
    setHistoryClips(updated);
    saveClipsToStorage(updated);
    if (activeClip && activeClip.id === id) {
      setActiveClip({ ...activeClip, isFavorite: !activeClip.isFavorite });
    }
  };

  // Delete Clip
  const handleDeleteClip = (id: string) => {
    const updated = historyClips.filter((c) => c.id !== id);
    setHistoryClips(updated);
    saveClipsToStorage(updated);
    if (activeClip && activeClip.id === id) {
      setActiveClip(updated.length > 0 ? updated[0] : null);
    }
  };

  // Clear All History
  const handleClearAllHistory = () => {
    setHistoryClips([]);
    saveClipsToStorage([]);
  };

  // Load Preset
  const handleSelectPreset = (preset: PresetScript) => {
    if (preset.isDialogue) {
      setMode('dialogue');
      setDialogueText(preset.text);
      if (preset.dialogueConfig) {
        setDialogueSpeakers([
          preset.dialogueConfig.speaker1,
          preset.dialogueConfig.speaker2,
        ]);
      }
    } else {
      setMode('single');
      setScriptText(preset.text);
      if (preset.recommendedVoice) setSelectedVoiceId(preset.recommendedVoice);
      if (preset.recommendedAccent) setSelectedAccentId(preset.recommendedAccent);
      if (preset.recommendedStyle) setSelectedStyleId(preset.recommendedStyle);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Header
        mode={mode}
        setMode={setMode}
        hasGeneratedClips={historyClips.length > 0}
        onOpenPresets={() => setIsPresetsModalOpen(true)}
      />

      {/* Main Studio Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Error Alert if any */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start space-x-2.5 shadow-xs">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Synthesis Notice</span>
              <p className="text-red-700">{errorMessage}</p>
            </div>
            <button
              type="button"
              id="dismiss-error-btn"
              onClick={() => setErrorMessage(null)}
              className="text-xs text-red-500 hover:text-red-800 font-semibold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Voice Synthesis Studio Controls */}
          <div className="lg:col-span-7 space-y-5">
            {mode === 'single' ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
                {/* Voice Selection */}
                <VoiceSelector
                  voices={VOICE_PROFILES}
                  selectedVoiceId={selectedVoiceId}
                  onSelectVoice={setSelectedVoiceId}
                  currentAccent={selectedAccentId}
                />

                <div className="border-t border-slate-100" />

                {/* English Accent Picker */}
                <AccentSelector
                  accents={ENGLISH_ACCENTS}
                  selectedAccentId={selectedAccentId}
                  onSelectAccent={setSelectedAccentId}
                  selectedVoiceId={selectedVoiceId}
                />

                <div className="border-t border-slate-100" />

                {/* Voice Style & Delivery Archetype */}
                <VoiceStyleStudio
                  styles={VOICE_STYLES}
                  selectedStyleId={selectedStyleId}
                  onSelectStyle={setSelectedStyleId}
                  tone={tone}
                  setTone={setTone}
                  pace={pace}
                  setPace={setPace}
                  pitch={pitch}
                  setPitch={setPitch}
                  emotion={emotion}
                  setEmotion={setEmotion}
                  customPromptInstruction={customPromptInstruction}
                  setCustomPromptInstruction={setCustomPromptInstruction}
                />

                <div className="border-t border-slate-100" />

                {/* Script Editor & Actions */}
                <ScriptEditor
                  text={scriptText}
                  onChangeText={setScriptText}
                  accent={selectedAccentId}
                  style={selectedStyleId}
                  isGenerating={isGenerating}
                  onGenerate={handleGenerateSoloVoice}
                />
              </div>
            ) : (
              /* Dialogue Mode Studio */
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      2-Voice Dialogue Studio
                    </h2>
                    <p className="text-xs text-slate-500">
                      Synthesize natural multi-character dialogues and conversational podcasts
                    </p>
                  </div>
                </div>

                <AccentSelector
                  accents={ENGLISH_ACCENTS}
                  selectedAccentId={selectedAccentId}
                  onSelectAccent={setSelectedAccentId}
                />

                <DialogueStudio
                  voices={VOICE_PROFILES}
                  accents={ENGLISH_ACCENTS}
                  selectedAccent={selectedAccentId}
                  onSelectAccent={setSelectedAccentId}
                  dialogueText={dialogueText}
                  onChangeDialogueText={setDialogueText}
                  speakers={dialogueSpeakers}
                  onChangeSpeakers={setDialogueSpeakers}
                  isGenerating={isGenerating}
                  onGenerateDialogue={handleGenerateDialogue}
                />
              </div>
            )}
          </div>

          {/* Right Column: Audio Output Player & Generation History */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
            {/* Audio Waveform & DSP Player */}
            <AudioPlayerWaveform
              clip={activeClip}
              onToggleFavorite={handleToggleFavorite}
            />

            {/* Generated History Clips */}
            <HistoryClips
              clips={historyClips}
              activeClipId={activeClip?.id || null}
              onSelectClip={setActiveClip}
              onToggleFavorite={handleToggleFavorite}
              onDeleteClip={handleDeleteClip}
              onClearAll={handleClearAllHistory}
            />
          </div>
        </div>
      </main>

      {/* Preset Scripts Modal */}
      <PresetScriptModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        presets={PRESET_SCRIPTS}
        onSelectPreset={handleSelectPreset}
      />
    </div>
  );
}
