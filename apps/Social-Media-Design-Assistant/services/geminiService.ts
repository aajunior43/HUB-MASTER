import { GoogleGenAI } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SUPPORTED_ASPECT_RATIOS = ["1:1", "9:16", "16:9", "4:3", "3:4"];

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

export async function extractLogoColors(logoFile: File): Promise<string[]> {
    const imagePart = await fileToGenerativePart(logoFile);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { 
        parts: [
          imagePart,
          { text: "Extraia as 3 cores hexadecimais dominantes desta imagem de logotipo. Responda APENAS com um JSON array de strings, por exemplo: [\"#RRGGBB\", \"#RRGGBB\", \"#RRGGBB\"]." }
        ] 
      },
    });

    try {
      const jsonStr = response.text.trim();
      const colors = JSON.parse(jsonStr);
      if (Array.isArray(colors) && colors.every(c => typeof c === 'string' && c.startsWith('#'))) {
        return colors;
      }
      throw new Error("Invalid color format returned.");
    } catch (error) {
        console.error("Failed to parse logo colors, returning defaults:", error);
        return [];
    }
}

export async function determineAspectRatio(prompt: string): Promise<string> {
  const generationPrompt = `Baseado na seguinte descrição de post para mídia social, qual a proporção de tela mais adequada? Descrição: "${prompt}". Responda APENAS com uma das seguintes opções: "1:1", "9:16", "16:9", "4:3", "3:4". Se a descrição não for clara, use "1:1" como padrão.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: generationPrompt,
  });

  const aspectRatio = response.text.trim();

  if (SUPPORTED_ASPECT_RATIOS.includes(aspectRatio)) {
    return aspectRatio;
  }
  
  console.warn(`Model returned an invalid aspect ratio: "${aspectRatio}". Falling back to 1:1.`);
  return "1:1";
}


export async function generateImage(prompt: string, aspectRatio: string): Promise<string> {
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
    },
  });

  if (!response.generatedImages || response.generatedImages.length === 0) {
    throw new Error("Image generation failed, no images were returned.");
  }
  
  return response.generatedImages[0].image.imageBytes;
}
