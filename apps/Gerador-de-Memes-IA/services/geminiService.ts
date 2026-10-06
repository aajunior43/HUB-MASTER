import { GoogleGenAI, Type } from "@google/genai";
import { MemeText } from '../types';

const fileToGenerativePart = (base64Data: string, mimeType: string) => {
    return {
        inlineData: {
            data: base64Data,
            mimeType,
        },
    };
};

export const generateMemeText = async (imageBase64: string, theme?: string): Promise<MemeText> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const [header, data] = imageBase64.split(',');
        if (!header || !data) {
            throw new Error("Invalid base64 image format");
        }
        const mimeTypeMatch = header.match(/:(.*?);/);
        if (!mimeTypeMatch || !mimeTypeMatch[1]) {
            throw new Error("Could not determine MIME type from base64 string");
        }
        const mimeType = mimeTypeMatch[1];
        
        const imagePart = fileToGenerativePart(data, mimeType);
        
        let prompt: string;

        if (theme && theme.trim() !== '') {
            prompt = `Analise esta imagem e gere uma legenda de meme engraçada em português do Brasil sobre o tema: "${theme}". O texto deve ser curto, espirituoso e relevante tanto para a imagem quanto para o tema. Forneça um 'texto superior' e um 'texto inferior'.`;
        } else {
            prompt = "Analise esta imagem e gere uma legenda de meme engraçada em português do Brasil. Forneça um 'texto superior' e um 'texto inferior'. O texto deve ser curto, espirituoso e relevante para a imagem.";
        }


        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        topText: {
                            type: Type.STRING,
                            description: 'O texto que vai na parte de cima do meme.'
                        },
                        bottomText: {
                            type: Type.STRING,
                            description: 'O texto que vai na parte de baixo do meme.'
                        }
                    },
                    required: ['topText', 'bottomText']
                }
            }
        });

        const jsonText = response.text.trim();
        const parsedResponse = JSON.parse(jsonText);

        return parsedResponse as MemeText;

    } catch (error) {
        console.error("Error generating meme text with Gemini:", error);
        
        // More robustly check for API key/permission errors.
        const errorMessage = (error instanceof Error ? error.message : String(error)).toLowerCase();
        if (errorMessage.includes('permission_denied') || 
            errorMessage.includes('api key not valid') ||
            errorMessage.includes('caller does not have permission') ||
            errorMessage.includes('403')) {
            throw new Error("API_KEY_ERROR");
        }

        throw new Error("Não foi possível gerar o texto do meme. Tente novamente.");
    }
};