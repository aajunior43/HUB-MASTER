
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DiagramResponse } from "../types";

const diagramSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Um título curto e impactante para o diagrama.",
    },
    mermaidCode: {
      type: Type.STRING,
      description: "Código Mermaid.js puro e válido. Use as melhores práticas de design visual.",
    },
    explanation: {
      type: Type.STRING,
      description: "Uma explicação clara e profissional em português brasileiro.",
    },
  },
  required: ["title", "mermaidCode", "explanation"],
};

export const generateDiagram = async (prompt: string): Promise<DiagramResponse> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = "gemini-3-flash-preview";
    
    const systemInstruction = `
      Você é um Arquiteto de Diagramas Sênior especialista em Mermaid.js.
      Sua missão é criar representações visuais elegantes e tecnicamente precisas.
      
      Diretrizes de Design:
      1. SINTAXE: Sempre use aspas duplas em labels: node["Texto"].
      2. ESTÉTICA: Para fluxogramas, use 'graph TD' (vertical) ou 'graph LR' (horizontal) conforme o conteúdo.
      3. CORES: Use classes de estilo (classDef) se necessário para destacar caminhos críticos.
      4. COMPLEXIDADE: Use subgraphs para agrupar conceitos relacionados.
      5. IDIOMA: Título e explicação DEVEM ser em Português (Brasil).
      
      Não use blocos de código markdown. Retorne apenas o JSON puro conforme o esquema.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: `User Request: ${prompt}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: diagramSchema,
        temperature: 0.1,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Sem resposta da IA");

    return JSON.parse(text) as DiagramResponse;
  } catch (error) {
    console.error("Gemini Service Error:", error);
    throw error;
  }
};
