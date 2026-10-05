import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Generates a study plan for a given subject.
 * @param subject The subject to generate a plan for.
 * @returns The study plan as a string.
 */
export const generateStudyPlan = async (subject: string): Promise<string> => {
    const prompt = `
    Você é um especialista em criar os melhores planos de estudo do mundo. O usuário quer estudar sobre "${subject}".

    Crie um plano de estudo extremamente detalhado com tudo que ele deve estudar para se tornar um expert no assunto, do básico ao extremamente avançado.

    Siga ESTRITAMENTE as seguintes instruções:
    1. Crie o plano de estudo completo em formato de outline dentro de uma ÚNICA code box (começando com \`\`\` e terminando com \`\`\`).
    2. Organize o conteúdo de forma progressiva: 1. Fundamentos -> 2. Intermediário -> 3. Avançado -> 4. Expert. Use sub-numeração para tópicos e subtópicos (e.g., 1.1, 1.1.1, 2.1, 2.1.1).
    3. Para CADA GRANDE SEÇÃO (Fundamentos, Intermediário, etc.), inclua uma estimativa de tempo total de estudo (e.g., "Tempo Estimado: 40-60 horas").
    4. Para cada subtópico final (o nível mais profundo da numeração), forneça uma breve descrição de uma linha sobre o que será estudado.
    5. O formato deve ser limpo, claro e fácil de seguir, usando apenas texto plano e indentação dentro da code box.
    6. O plano deve estar em português.

    Exemplo de formato para um subtópico:
    1.1.1. Nome do Subtópico: Breve descrição do que será estudado.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const text = response.text;
        // Extract content from the code box
        const planMatch = text.match(/```([\s\S]*?)```/);
        return planMatch ? planMatch[1].trim() : "Não foi possível gerar o plano de estudo. Tente novamente.";
    } catch (error) {
        console.error("Error generating study plan:", error);
        return "Ocorreu um erro ao gerar o plano de estudo. Verifique o console para mais detalhes.";
    }
};