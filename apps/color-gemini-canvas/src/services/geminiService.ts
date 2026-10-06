import { Color } from '@/components/ColorPalette';

export class GeminiService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async convertImageToBase64(imageSource: File | string): Promise<string> {
    if (typeof imageSource === 'string') {
      // É uma URL
      try {
        const response = await fetch(imageSource);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        throw new Error('Erro ao carregar imagem da URL');
      }
    } else {
      // É um arquivo
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageSource);
      });
    }
  }

  private getMimeType(imageSource: File | string): string {
    if (typeof imageSource === 'string') {
      // Tentar determinar o tipo pela extensão da URL
      const url = imageSource.toLowerCase();
      if (url.includes('.png')) return 'image/png';
      if (url.includes('.jpg') || url.includes('.jpeg')) return 'image/jpeg';
      if (url.includes('.webp')) return 'image/webp';
      return 'image/jpeg'; // padrão
    } else {
      return imageSource.type;
    }
  }

  async extractColorPalette(imageSource: File | string, colorCount: number = 5): Promise<Color[]> {
    try {
      const base64Image = await this.convertImageToBase64(imageSource);
      const mimeType = this.getMimeType(imageSource);

      const prompt = `Analise esta imagem e extraia exatamente ${colorCount} cores mais dominantes e representativas. 
      Para cada cor, forneça:
      1. Um nome descritivo e criativo em português
      2. O código hexadecimal exato
      3. Os valores RGB separados por vírgula

      Responda APENAS com um JSON válido no formato:
      [
        {"nome": "Nome da Cor", "hex": "#000000", "rgb": "0, 0, 0"},
        {"nome": "Nome da Cor 2", "hex": "#ffffff", "rgb": "255, 255, 255"}
      ]

      Extraia exatamente ${colorCount} cores mais significativas e dominantes da imagem.
      Priorize cores que realmente se destacam na composição visual.
      Não inclua explicações, apenas o JSON com exatamente ${colorCount} cores.`;

      const requestBody = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
        }
      };

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Erro da API Gemini:', errorData);
        throw new Error(`Erro na API Gemini: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Resposta inválida da API Gemini');
      }

      const textResponse = data.candidates[0].content.parts[0].text;
      
      // Limpar e parsear o JSON
      let cleanedResponse = textResponse.trim();
      
      // Remover possíveis marcadores de código
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Encontrar o JSON válido na resposta
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      console.log('Resposta limpa do Gemini:', cleanedResponse);

      try {
        const colors = JSON.parse(cleanedResponse) as Color[];
        
        // Validar se é um array de cores válidas
        if (!Array.isArray(colors) || colors.length === 0) {
          throw new Error('Formato de resposta inválido');
        }

        // Validar cada cor
        const validColors = colors.filter(color => 
          color.nome && 
          color.hex && 
          color.rgb &&
          color.hex.match(/^#[0-9A-Fa-f]{6}$/)
        );

        if (validColors.length === 0) {
          throw new Error('Nenhuma cor válida encontrada na resposta');
        }

        // Retornar exatamente a quantidade solicitada
        return validColors.slice(0, colorCount);
      } catch (parseError) {
        console.error('Erro ao parsear JSON:', parseError);
        throw new Error('Erro ao processar resposta da IA');
      }

    } catch (error) {
      console.error('Erro no serviço Gemini:', error);
      throw error;
    }
  }
}
