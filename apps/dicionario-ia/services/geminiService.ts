import { GoogleGenAI, Type } from "@google/genai";
import { VocabularyData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateVocabularyList = async (theme: string): Promise<VocabularyData> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Atue como um gerador de conteúdo especializado. Para o tema "${theme}", gere um objeto JSON contendo dois itens principais:
      
      1. "vocabulary": Uma lista de exatamente 50 palavras, termos técnicos, jargões ou conceitos sofisticados.
      2. "relatedThemes": Uma lista de 5 novos temas sugeridos que sejam conexos ou subsequentes a este, para que o usuário possa continuar estudando.

      Para cada item do vocabulário:
      - word: O termo.
      - definition: Definição clara, precisa e acadêmica em português.
      - context: Categoria curta ou contexto de uso.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: {
                    type: Type.STRING,
                    description: "A palavra, termo ou conceito.",
                  },
                  definition: {
                    type: Type.STRING,
                    description: "O significado detalhado do termo.",
                  },
                  context: {
                    type: Type.STRING,
                    description: "A categoria gramatical ou contexto de uso.",
                  },
                },
                required: ["word", "definition"],
              },
            },
            relatedThemes: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: "5 temas sugeridos relacionados ao tema principal para pesquisa futura.",
            },
          },
          required: ["vocabulary", "relatedThemes"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Não foi possível gerar a lista. Tente novamente.");
    }

    return JSON.parse(text) as VocabularyData;
  } catch (error) {
    console.error("Erro ao gerar vocabulário:", error);
    throw error;
  }
};
