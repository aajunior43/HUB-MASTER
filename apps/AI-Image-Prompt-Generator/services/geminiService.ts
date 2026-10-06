import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This is a fallback for development, in a real environment the key should be set.
  console.warn("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function generateCreativePrompt(): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a single, highly creative, and visually rich prompt for an AI image generator. The prompt should be in English. It should be a comma-separated list of descriptive phrases, starting with the main subject. Be imaginative and specific. Example: A majestic bioluminescent jellyfish floating through a cyberpunk city street at night, cinematic lighting, photorealistic, hyperdetailed, by James Jean.`,
      config: {
        temperature: 1.0,
        topP: 0.95,
      }
    });
    
    const text = response.text.trim();
    // Clean up potential markdown or unwanted characters
    return text.replace(/[*_`]/g, '');

  } catch (error) {
    console.error("Error generating prompt with Gemini:", error);
    return "Error: Could not generate a creative prompt. Please try again.";
  }
}

export async function improveAndTranslatePrompt(basePrompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Take the following idea for an image prompt, improve it by adding creative and descriptive details, and then translate the final result into a single, cohesive English prompt. The idea is: "${basePrompt}". Return only the final English prompt, without any extra text or markdown formatting.`,
      config: {
        temperature: 0.8,
        topP: 0.95,
      }
    });

    const text = response.text.trim();
    return text.replace(/[*_`]/g, '');

  } catch (error) {
    console.error("Error improving prompt with Gemini:", error);
    return `Error: Could not improve prompt. Original: "${basePrompt}"`;
  }
}

export async function generateImage(prompt: string, aspectRatio: string): Promise<string | null> {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: aspectRatio as '1:1' | '16:9' | '9:16',
      },
    });

    const base64ImageBytes: string | undefined = response.generatedImages[0]?.image?.imageBytes;

    if (base64ImageBytes) {
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    
    return null;
  } catch (error) {
    console.error("Error generating image with Gemini:", error);
    return null;
  }
}