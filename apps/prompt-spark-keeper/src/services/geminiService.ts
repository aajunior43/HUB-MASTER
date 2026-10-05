
interface GeminiGenerateRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
}

export class GeminiService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(model: string, prompt: string): Promise<string> {
    console.log('Making Gemini API request with prompt:', prompt.substring(0, 100) + '...');
    
    const requestBody: GeminiGenerateRequest = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(
      `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data: GeminiResponse = await response.json();
    console.log('Gemini response:', data);

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Nenhum candidato retornado pela API do Gemini');
    }

    const candidate = data.candidates[0];
    
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('Conteúdo bloqueado por segurança');
    }

    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('Resposta vazia da API do Gemini');
    }

    const result = candidate.content.parts[0].text || '';
    console.log('Generated text:', result);
    
    return result.trim();
  }

  async generatePromptName(promptContent: string): Promise<string> {
    const prompt = `Analise o seguinte prompt e gere um nome criativo e descritivo para ele em português. O nome deve ter no máximo 5 palavras e ser claro sobre o propósito do prompt.

Prompt: ${promptContent}

Retorne apenas o nome, sem explicações adicionais.`;

    return this.makeRequest('gemini-1.5-flash', prompt);
  }

  async generateTags(promptContent: string): Promise<string[]> {
    const prompt = `Analise o seguinte prompt e gere 3-5 tags relevantes em português que descrevam sua categoria, tipo e uso. As tags devem ser palavras-chave simples e úteis para organização.

Prompt: ${promptContent}

Retorne as tags separadas por vírgula, sem explicações adicionais. Exemplo: marketing, criativo, texto, social media`;

    const response = await this.makeRequest('gemini-1.5-flash', prompt);
    return response.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag);
  }

  async generatePromptVariations(originalPrompt: string, count: number = 3): Promise<Array<{
    title: string;
    content: string;
    tags: string[];
    category: string;
  }>> {
    const prompt = `Baseado no prompt original abaixo, gere ${count} variações criativas e úteis. Cada variação deve ter um propósito ligeiramente diferente mas relacionado.

Prompt original: ${originalPrompt}

Para cada variação, retorne no seguinte formato JSON válido:
{
  "variations": [
    {
      "title": "Nome da variação 1",
      "content": "Conteúdo do prompt da variação 1",
      "tags": ["tag1", "tag2", "tag3"],
      "category": "categoria"
    },
    {
      "title": "Nome da variação 2", 
      "content": "Conteúdo do prompt da variação 2",
      "tags": ["tag1", "tag2", "tag3"],
      "category": "categoria"
    }
  ]
}

Retorne apenas o JSON válido, sem texto adicional antes ou depois.`;

    const response = await this.makeRequest('gemini-1.5-flash', prompt);
    
    try {
      // Remove any markdown code blocks if present
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanResponse);
      return parsed.variations || [];
    } catch (error) {
      console.error('Error parsing Gemini variations response:', error);
      console.error('Raw response:', response);
      return [];
    }
  }
}
