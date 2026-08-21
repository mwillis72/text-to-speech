import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  app.use(express.json({ limit: "15mb" }));

  // API: Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
    });
  });

  // API: Generate Custom Text to Voice Audio
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
        dialogueSpeakers = [], // For multi-speaker mode: [{ speaker: 'Host', voice: 'Kore' }, { speaker: 'Guest', voice: 'Puck' }]
      } = req.body;

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ error: "Text is required to generate speech." });
      }

      const ai = getGeminiClient();

      if (mode === "dialogue" && dialogueSpeakers.length >= 2) {
        // Multi-speaker generation
        const speaker1 = dialogueSpeakers[0];
        const speaker2 = dialogueSpeakers[1];

        const prompt = `TTS the following dialogue between ${speaker1.speaker} and ${speaker2.speaker} in natural ${accent} accent with ${style} style and ${emotion} tone:\n${text}`;

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
          characterCount: text.length,
          wordCount: text.trim().split(/\s+/).length,
          voiceUsed: `${speaker1.voice} & ${speaker2.voice}`,
          accentUsed: accent,
          styleUsed: style,
        });
      } else {
        // Single speaker generation with rich stylistic prompting
        let directive = "";

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

        if (styleDirectives.length > 0) {
          directive = `Say ${styleDirectives.join(", ")}: `;
        } else {
          directive = `Say naturally: `;
        }

        const speechPrompt = `${directive}${text.trim()}`;

        // Standard prebuilt voice names supported by Gemini
        const validVoice = voice || "Kore";

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: speechPrompt }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: validVoice },
              },
            },
          },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        const rawBase64 = part?.inlineData?.data;

        if (!rawBase64) {
          throw new Error("No audio payload returned from voice synthesis.");
        }

        const rawBuffer = Buffer.from(rawBase64, "base64");
        const wavBuffer = pcmToWav(rawBuffer, 24000, 1, 16);
        const wavBase64 = wavBuffer.toString("base64");

        return res.json({
          success: true,
          audioBase64: wavBase64,
          mimeType: "audio/wav",
          sampleRate: 24000,
          characterCount: text.length,
          wordCount: text.trim().split(/\s+/).length,
          voiceUsed: validVoice,
          accentUsed: accent,
          styleUsed: style,
          fullPromptApplied: speechPrompt,
        });
      }
    } catch (err: any) {
      console.error("TTS Generation Error:", err);
      return res.status(500).json({
        error: err.message || "Failed to generate speech audio.",
        details: err.stack,
      });
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
