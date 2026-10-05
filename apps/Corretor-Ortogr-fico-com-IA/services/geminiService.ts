
import { GoogleGenAI } from "@google/genai";

// Assume process.env.API_KEY is configured in the environment
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY for Gemini is not configured.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Sends text to the Gemini API for spelling and punctuation correction.
 * @param text The text to be corrected.
 * @returns The corrected text as a string.
 */
export async function correctText(text: string): Promise<string> {
  const model = 'gemini-2.5-flash';
  
  const prompt = `Corrija a ortografia e a pontuação do seguinte texto. Devolva APENAS o texto corrigido, sem adicionar nenhuma explicação, introdução, ou formatação como markdown.

Texto original:
---
${text}
---

Texto corrigido:`;

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get a response from the AI model.");
  }
}
