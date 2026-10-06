
import { GoogleGenAI, Type } from "@google/genai";
import { CalendarEvent } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const generateEventFromText = async (prompt: string): Promise<CalendarEvent> => {
  const now = new Date();
  const systemInstruction = `
    Você é um assistente especializado em extrair detalhes de eventos para calendário.
    Analise o texto do usuário e retorne um objeto JSON com os detalhes do evento.
    Data e hora atual de referência: ${now.toISOString()}. 
    Considere feriados e o dia da semana atual para interpretar termos como "amanhã", "próxima terça", etc.
    Se o usuário não especificar uma duração, assuma 1 hora.
    Se o horário não for especificado, marque como dia inteiro (isAllDay: true).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Título curto e claro para o evento" },
          startDate: { type: Type.STRING, description: "Data e hora de início em formato ISO 8601" },
          endDate: { type: Type.STRING, description: "Data e hora de término em formato ISO 8601" },
          location: { type: Type.STRING, description: "Local do evento ou link de reunião" },
          description: { type: Type.STRING, description: "Descrição detalhada do que foi solicitado" },
          isAllDay: { type: Type.BOOLEAN, description: "Se o evento dura o dia todo" }
        },
        required: ["title", "startDate", "endDate", "isAllDay"]
      }
    }
  });

  const result = JSON.parse(response.text || "{}");
  return result as CalendarEvent;
};
