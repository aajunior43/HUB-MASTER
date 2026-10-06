
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from '../types';

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
        } else {
            resolve(''); // Or handle ArrayBuffer case if necessary
        }
    };
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};

const PROMPT = `
Você é um auditor financeiro especialista em análise de notas fiscais brasileiras. Sua tarefa é analisar meticulosamente o documento da nota fiscal fornecido. Verifique todos os detalhes, incluindo, mas não se limitando a: CNPJ/CPF do emissor e do destinatário, descrição dos produtos ou serviços, quantidades, preços unitários, valor total, impostos (ICMS, IPI, PIS, COFINS), datas (emissão, vencimento) e quaisquer outras informações relevantes. Identifique quaisquer problemas potenciais, inconsistências, erros de cálculo ou informações ausentes que tornariam a nota fiscal inválida ou questionável. Com base em suas descobertas abrangentes, você deve decidir se o documento deve ser 'DEFERIDO' (aprovado) ou 'INDEFERIDO' (rejeitado).

Forneça sua resposta estritamente no formato JSON definido pelo esquema.
- Se o documento estiver perfeito, o status deve ser 'DEFERIDO', o resumo deve confirmar sua validade e a matriz 'issues' deve estar vazia.
- Se algum problema for encontrado, o status deve ser 'INDEFERIDO', o resumo deve explicar brevemente por que foi rejeitado, e a matriz 'issues' deve conter uma lista de todos os problemas específicos que você identificou.
`;

const schema = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      enum: ['DEFERIDO', 'INDEFERIDO'],
      description: 'A decisão final sobre a nota fiscal.'
    },
    summary: {
      type: Type.STRING,
      description: 'Um resumo conciso da análise e o motivo da decisão.'
    },
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: 'Um problema específico encontrado na nota fiscal.'
      },
      description: 'Uma lista de todos os problemas identificados. Deve estar vazia se o status for DEFERIDO.'
    }
  },
  required: ['status', 'summary', 'issues']
};


export const analyzeInvoice = async (pdfFile: File): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API key not found. Please set the API_KEY environment variable.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const filePart = await fileToGenerativePart(pdfFile);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts: [{ text: PROMPT }, filePart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const rawText = response.text.trim();
  try {
    const jsonResult = JSON.parse(rawText);
    return jsonResult as AnalysisResult;
  } catch (e) {
    console.error("Failed to parse Gemini response:", rawText);
    throw new Error("A resposta da IA não estava no formato JSON esperado.");
  }
};
