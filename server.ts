import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Helper function to create WAV header for raw 16-bit PCM audio (24kHz mono)
function pcmToWav(pcmBuffer: Buffer, sampleRate: number = 24000, numChannels: number = 1, bitsPerSample: number = 16): Buffer {
  // Check if buffer is already a RIFF/WAV file
  if (pcmBuffer.length >= 4 && pcmBuffer.subarray(0, 4).toString("ascii") === "RIFF") {
    return pcmBuffer;
  }

  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const chunkSize = 36 + dataSize;

  const header = Buffer.alloc(44);

  // RIFF chunk descriptor
  header.write("RIFF", 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write("WAVE", 8);

  // "fmt " sub-chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  header.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Splits text into natural sentence / paragraph chunks safe for Gemini TTS generation (e.g., ~600-900 chars per chunk).
 */
function splitTextIntoVoiceChunks(text: string, maxChunkLength: number = 850): string[] {
  const clean = text.trim();
  if (clean.length <= maxChunkLength) {
    return [clean];
  }

  const chunks: string[] = [];
  // Split by paragraphs first
  const paragraphs = clean.split(/\n\s*\n/);
  let currentChunk = "";

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    if (currentChunk.length + trimmedPara.length + 2 <= maxChunkLength) {
      currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedPara}` : trimmedPara;
    } else {
      // If currentChunk has content, push it
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = "";
      }

      // If the paragraph itself exceeds maxChunkLength, split by sentences
      if (trimmedPara.length > maxChunkLength) {
        const sentences = trimmedPara.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [trimmedPara];
        for (const sentence of sentences) {
          const s = sentence.trim();
          if (!s) continue;
          if (currentChunk.length + s.length + 1 <= maxChunkLength) {
            currentChunk = currentChunk ? `${currentChunk} ${s}` : s;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk);
            }
            // If even a single sentence is gigantic, hard slice it
            if (s.length > maxChunkLength) {
              for (let i = 0; i < s.length; i += maxChunkLength) {
                chunks.push(s.slice(i, i + maxChunkLength));
              }
              currentChunk = "";
            } else {
              currentChunk = s;
            }
          }
        }
      } else {
        currentChunk = trimmedPara;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.filter((c) => c.trim().length > 0);
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in the environment.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API: Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
    });
  });

  // Helper function to synthesize a single voice utterance with Gemini TTS
  async function synthesizeChunkPcm(
    ai: GoogleGenAI,
    promptText: string,
    voiceName: string
  ): Promise<Buffer> {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
          },
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    const rawBase64 = part?.inlineData?.data;

    if (!rawBase64) {
      throw new Error("No audio payload returned from Gemini TTS model.");
    }

    return Buffer.from(rawBase64, "base64");
  }

  // API: Generate Custom Text to Voice Audio (with auto-chunking & audio concatenation)
  app.post("/api/tts/generate", async (req, res) => {
    try {
      const {
        text,
        voice = "Kore",
        accent = "American Standard",
        style = "Conversational & Natural",
        tone = "Warm & Engaging",
        pace = "Normal",
        pitch = "Natural",
        emotion = "Neutral",
        customPromptInstruction = "",
        mode = "single", // 'single' or 'dialogue'
        dialogueSpeakers = [],
        maxBatchChunks = 4, // Max chunks to synthesize in one request to prevent gateway timeout
      } = req.body;

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ error: "Text is required to generate speech." });
      }

      const ai = getGeminiClient();

      if (mode === "dialogue" && dialogueSpeakers.length >= 2) {
        // Multi-speaker generation
        const speaker1 = dialogueSpeakers[0];
        const speaker2 = dialogueSpeakers[1];

        // Ensure dialogue text is not overly massive for a single pass
        const dialogueChunks = splitTextIntoVoiceChunks(text, 1200);
        const chunkToProcess = dialogueChunks[0] || text;

        const prompt = `TTS the following dialogue between ${speaker1.speaker} and ${speaker2.speaker} in natural ${accent} accent with ${style} style and ${emotion} tone:\n${chunkToProcess}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                  {
                    speaker: speaker1.speaker,
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: speaker1.voice || "Kore" },
                    },
                  },
                  {
                    speaker: speaker2.speaker,
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: speaker2.voice || "Puck" },
                    },
                  },
                ],
              },
            },
          },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        const rawBase64 = part?.inlineData?.data;

        if (!rawBase64) {
          throw new Error("No audio data received from Gemini TTS API.");
        }

        const rawBuffer = Buffer.from(rawBase64, "base64");
        const wavBuffer = pcmToWav(rawBuffer, 24000, 1, 16);
        const wavBase64 = wavBuffer.toString("base64");

        return res.json({
          success: true,
          audioBase64: wavBase64,
          mimeType: "audio/wav",
          sampleRate: 24000,
          characterCount: chunkToProcess.length,
          wordCount: chunkToProcess.trim().split(/\s+/).length,
          voiceUsed: `${speaker1.voice} & ${speaker2.voice}`,
          accentUsed: accent,
          styleUsed: style,
          chunksSynthesized: 1,
          totalChunks: dialogueChunks.length,
          isTruncated: dialogueChunks.length > 1,
        });
      } else {
        // Single speaker generation with rich stylistic prompting
        const styleDirectives: string[] = [];
        if (accent && accent !== "Standard") {
          styleDirectives.push(`in a natural ${accent} accent`);
        }
        if (style && style !== "Default") {
          styleDirectives.push(`with a ${style.toLowerCase()} delivery`);
        }
        if (tone && tone !== "Normal") {
          styleDirectives.push(`in a ${tone.toLowerCase()} tone`);
        }
        if (emotion && emotion !== "Neutral") {
          styleDirectives.push(`expressing ${emotion.toLowerCase()}`);
        }
        if (pace && pace !== "Normal") {
          styleDirectives.push(`at a ${pace.toLowerCase()} pace`);
        }
        if (pitch && pitch !== "Natural") {
          styleDirectives.push(`with ${pitch.toLowerCase()} pitch`);
        }
        if (customPromptInstruction && customPromptInstruction.trim()) {
          styleDirectives.push(customPromptInstruction.trim());
        }

        const directive = styleDirectives.length > 0
          ? `Say ${styleDirectives.join(", ")}: `
          : `Say naturally: `;

        const validVoice = voice || "Kore";

        // Smart chunking for single-pass speech synthesis (up to 1200 characters per segment for reliable generation)
        const allChunks = splitTextIntoVoiceChunks(text, 1000);
        // Process up to 2 chunks per request to ensure rapid response and prevent API rate-limits
        const chunksToProcess = allChunks.slice(0, Math.max(1, Math.min(maxBatchChunks, 2)));

        const pcmBuffers: Buffer[] = [];

        // Synthesize chunks
        for (let i = 0; i < chunksToProcess.length; i++) {
          const chunkText = chunksToProcess[i];
          const speechPrompt = `${directive}${chunkText}`;
          const pcm = await synthesizeChunkPcm(ai, speechPrompt, validVoice);
          pcmBuffers.push(pcm);
        }

        // Concatenate all PCM audio buffers seamlessly into one continuous audio track
        const combinedPcm = Buffer.concat(pcmBuffers);
        const wavBuffer = pcmToWav(combinedPcm, 24000, 1, 16);
        const wavBase64 = wavBuffer.toString("base64");

        const synthesizedText = chunksToProcess.join("\n\n");

        return res.json({
          success: true,
          audioBase64: wavBase64,
          mimeType: "audio/wav",
          sampleRate: 24000,
          characterCount: synthesizedText.length,
          wordCount: synthesizedText.trim().split(/\s+/).length,
          voiceUsed: validVoice,
          accentUsed: accent,
          styleUsed: style,
          chunksSynthesized: chunksToProcess.length,
          totalChunks: allChunks.length,
          isTruncated: allChunks.length > chunksToProcess.length,
        });
      }
    } catch (err: any) {
      console.error("TTS Generation Error:", err);

      let cleanErrorMessage = err?.message || "Failed to generate speech audio.";
      let isQuota = false;

      try {
        if (typeof cleanErrorMessage === "string" && cleanErrorMessage.includes("{")) {
          const parsed = JSON.parse(cleanErrorMessage);
          if (parsed.error?.code === 429 || parsed.error?.status === "RESOURCE_EXHAUSTED" || parsed.error?.message?.includes("quota")) {
            isQuota = true;
            cleanErrorMessage = "Gemini TTS API rate limit / quota reached. Free-tier accounts have request limits per minute. You can switch to Instant Browser Voice or wait a moment.";
          } else if (parsed.error?.message) {
            cleanErrorMessage = parsed.error.message;
          }
        }
      } catch (pErr) {
        // keep cleanErrorMessage
      }

      if (cleanErrorMessage.toLowerCase().includes("429") || cleanErrorMessage.toLowerCase().includes("quota")) {
        isQuota = true;
      }

      return res.status(isQuota ? 429 : 500).json({
        success: false,
        error: cleanErrorMessage,
        isQuotaError: isQuota,
      });
    }
  });

  // API: Split long text/book into structured chapters & sections
  app.post("/api/tts/split-sections", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required." });
      }

      const lines = text.split("\n");
      const sections: Array<{ id: string; title: string; text: string; wordCount: number; charCount: number }> = [];

      let currentTitle = "Introduction / Opening";
      let currentLines: string[] = [];

      const headingRegex = /^(chapter\s+\d+|part\s+[ivxlcdm\d]+|introduction|preface|prologue|epilogue|section\s+\d+|review\s+key\s+points|praise\s+for)/i;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 0 && trimmed.length < 80 && headingRegex.test(trimmed)) {
          if (currentLines.join("\n").trim().length > 0) {
            const sectionText = currentLines.join("\n").trim();
            sections.push({
              id: `sec-${sections.length + 1}`,
              title: currentTitle,
              text: sectionText,
              wordCount: sectionText.split(/\s+/).length,
              charCount: sectionText.length,
            });
            currentLines = [];
          }
          currentTitle = trimmed;
        } else {
          currentLines.push(line);
        }
      }

      if (currentLines.join("\n").trim().length > 0) {
        const sectionText = currentLines.join("\n").trim();
        sections.push({
          id: `sec-${sections.length + 1}`,
          title: currentTitle,
          text: sectionText,
          wordCount: sectionText.split(/\s+/).length,
          charCount: sectionText.length,
        });
      }

      // If no headings detected, chunk by chunks of ~1500 chars
      if (sections.length <= 1 && text.length > 2000) {
        const chunks = splitTextIntoVoiceChunks(text, 1500);
        const fallbackSections = chunks.map((c, idx) => ({
          id: `part-${idx + 1}`,
          title: `Section ${idx + 1} (${Math.round((c.split(/\s+/).length / 140) * 60)}s)`,
          text: c,
          wordCount: c.split(/\s+/).length,
          charCount: c.length,
        }));
        return res.json({ success: true, sections: fallbackSections, totalSections: fallbackSections.length });
      }

      res.json({
        success: true,
        sections,
        totalSections: sections.length,
      });
    } catch (err: any) {
      console.error("Split sections error:", err);
      res.status(500).json({ error: err.message || "Failed to split text sections." });
    }
  });

  // API: Summarize long text into a voice-ready audio summary
  app.post("/api/tts/summarize-script", async (req, res) => {
    try {
      const { text, targetDuration = "2-min", style = "Executive Overview" } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required." });
      }

      const ai = getGeminiClient();

      const prompt = `You are an executive audio producer and voiceover scriptwriter.
Convert the following extensive document into an engaging, clear, highly listenable voiceover script (~300-450 words, suitable for a 2-minute narration).

Key Guidelines:
1. Capture the core themes, major breakthroughs, and actionable takeaways in a natural storytelling flow.
2. Structure it with an engaging opening, clear logical transitions, and an inspiring conclusion.
3. Output ONLY the clean spoken narration script. No intro, no meta-commentary, no markdown headers.

Original Content:
"""
${text.slice(0, 50000)}
"""`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
      });

      const script = response.text || "";

      res.json({
        success: true,
        summaryScript: script.trim(),
        wordCount: script.trim().split(/\s+/).length,
        charCount: script.trim().length,
      });
    } catch (err: any) {
      console.error("Summarize script error:", err);
      res.status(500).json({ error: err.message || "Failed to summarize text." });
    }
  });

  // API: Script Enhancer & Speech Optimizer
  app.post("/api/tts/enhance-text", async (req, res) => {
    try {
      const { text, goal = "natural-flow", accent = "American Standard", style = "Conversational" } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required to enhance." });
      }

      const ai = getGeminiClient();

      let goalInstruction = "Optimize the text for natural spoken audio cadence, including commas for micro-pauses, smooth transitions, and engaging phrasing.";
      if (goal === "audiobook") {
        goalInstruction = "Format and enrich the text with vivid descriptive pacing, expressive punctuation (ellipses, em-dashes), and storytelling rhythm.";
      } else if (goal === "podcast") {
        goalInstruction = "Make the text sound like a charismatic, warm, and natural podcast host with spontaneous verbal markers and upbeat rhythm.";
      } else if (goal === "meditation") {
        goalInstruction = "Transform the text into a tranquil, calming, slow-paced guided meditation script with soothing pauses and serene cadence.";
      } else if (goal === "commercial") {
        goalInstruction = "Craft a punchy, persuasive voiceover commercial script with high energy, clear emphasis, and memorable call-to-action.";
      } else if (goal === "dialogue") {
        goalInstruction = "Turn this concept/text into a natural 2-speaker script with 'Speaker 1:' and 'Speaker 2:' line prefixes, natural interruptions, and authentic dialogue flow.";
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: `You are an expert voiceover director and speech coach.
Task: ${goalInstruction}
Target English Accent: ${accent}
Target Style: ${style}

Original Text:
"""
${text}
"""

Instructions:
1. Return ONLY the enhanced script ready to be spoken.
2. Do not include markdown meta-commentary, introductory notes, or quotes around the whole text unless they are part of the spoken script.`,
      });

      const enhancedText = response.text || text;

      res.json({
        success: true,
        enhancedText: enhancedText.trim(),
      });
    } catch (err: any) {
      console.error("Enhance Text Error:", err);
      res.status(500).json({
        error: err.message || "Failed to enhance script.",
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TTS Voice Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
