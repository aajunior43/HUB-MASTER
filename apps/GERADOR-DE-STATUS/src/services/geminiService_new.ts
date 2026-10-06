import { GoogleGenerativeAI } from '@google/generative-ai';

// Configuração da API do Gemini
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

export interface StatusRequest {
    theme: string;
    style?: 'modern' | 'elegant' | 'minimalist' | 'vibrant' | 'dark';
    aspectRatio?: '9:16' | '1:1' | '16:9';
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
    fontFamily?: string;
    includeHashtags?: boolean;
    includeEmojis?: boolean;
    includeComplementaryPhrase?: boolean;
    includeVignette?: boolean;
}

export interface GeneratedContent {
    text: string;
    backgroundColor: string;
    textColor: string;
    fontSize: number;
    fontFamily: string;
}

export interface StatusResponse {
    imageUrl: string;
    generatedContent: GeneratedContent;
    metadata: {
        prompt: string;
        style: string;
        timestamp: number;
    };
}

class GeminiService {
    private textModel;
    private usedQuotes: Set<string> = new Set();
    private maxHistorySize = 50;

    constructor() {
        this.textModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        this.loadQuoteHistory();
    }

    /**
     * Carrega o histórico de frases do localStorage
     */
    private loadQuoteHistory(): void {
        try {
            if (typeof window !== 'undefined') {
                const saved = localStorage.getItem('statusai_used_quotes');
                if (saved) {
                    const quotes = JSON.parse(saved);
                    this.usedQuotes = new Set(quotes);
                    console.log(`📚 Carregado histórico com ${this.usedQuotes.size} frases`);
                }
            }
        } catch (error) {
            console.warn('Erro ao carregar histórico de frases:', error);
        }
    }

    /**
     * Salva o histórico de frases no localStorage
     */
    private saveQuoteHistory(): void {
        try {
            if (typeof window !== 'undefined') {
                const quotes = Array.from(this.usedQuotes);
                localStorage.setItem('statusai_used_quotes', JSON.stringify(quotes));
                console.log(`💾 Histórico salvo com ${quotes.length} frases`);
            }
        } catch (error) {
            console.warn('Erro ao salvar histórico de frases:', error);
        }
    }

    /**
     * Adiciona uma frase ao histórico e gerencia o tamanho máximo
     */
    private addToHistory(quote: string): void {
        const mainQuote = quote.split('\n')[0].replace(/["""]/g, '').trim();
        this.usedQuotes.add(mainQuote);

        if (this.usedQuotes.size > this.maxHistorySize) {
            const quotesArray = Array.from(this.usedQuotes);
            for (let i = 0; i < 10; i++) {
                this.usedQuotes.delete(quotesArray[i]);
            }
        }

        this.saveQuoteHistory();
    }

    /**
     * Verifica se uma frase já foi usada recentemente
     */
    private isQuoteUsed(quote: string): boolean {
        const mainQuote = quote.split('\n')[0].replace(/["""]/g, '').trim();
        return this.usedQuotes.has(mainQuote);
    }

    /**
     * Limpa o histórico de frases
     */
    public clearQuoteHistory(): void {
        this.usedQuotes.clear();
        if (typeof window !== 'undefined') {
            localStorage.removeItem('statusai_used_quotes');
        }
        console.log('🗑️ Histórico de frases limpo');
    }

    /**
     * Retorna estatísticas do histórico
     */
    public getHistoryStats(): { total: number; maxSize: number; percentFull: number } {
        const total = this.usedQuotes.size;
        const percentFull = Math.round((total / this.maxHistorySize) * 100);
        return { total, maxSize: this.maxHistorySize, percentFull };
    }

    /**
     * Gera conteúdo usando 100% a IA do Gemini
     */
    private async generateContentWithGemini(theme: string, includeEmojis: boolean = true, includeHashtags: boolean = false, attempt: number = 1): Promise<GeneratedContent> {
        const maxRetries = 3;

        for (let currentAttempt = attempt; currentAttempt <= maxRetries; currentAttempt++) {
            try {
                console.log(`🚀 Tentativa ${currentAttempt}/${maxRetries} para categoria: "${theme}"`);

                // Criar prompt único para cada tentativa
                const randomSeed = Math.floor(Math.random() * 10000);
                const timeStamp = Date.now() % 10000;
                const usedQuotesHint = this.usedQuotes.size > 0 ?
                    `\n🚫 EVITE estas frases já usadas: ${Array.from(this.usedQuotes).slice(-5).join(', ')}` : '';

                // Configurar instruções baseadas nas opções do usuário
                const emojiInstruction = includeEmojis ? '• 1 emoji apropriado ao final da frase' : '• NÃO inclua emojis';
                const hashtagInstruction = includeHashtags ? '• Adicione 2-3 hashtags relevantes no final' : '• NÃO inclua hashtags';

                const prompt = `🎯 CATEGORIA: "${theme}" (ID: ${randomSeed}-${timeStamp}-${currentAttempt})

📋 MISSÃO: Crie uma citação ÚNICA e INSPIRACIONAL sobre "${theme}".

🎲 ESCOLHA CRIATIVA DA IA:
Para a categoria "${theme}", VOCÊ DECIDE qual fonte será mais inspiradora:
• Filme clássico ou moderno (nacional ou internacional)
• Música/canção (qualquer artista ou banda)
• Livro ou autor famoso (literatura mundial)
• Personalidade histórica ou contemporânea
• Filosofia, sabedoria popular ou provérbio
• Versículo bíblico (se apropriado ao tema)
• Frase original inspiradora

🔍 REGRAS CRIATIVAS:
• SEJA TOTALMENTE CRIATIVO na escolha da fonte
• VARIE sempre entre diferentes tipos de fontes
• NÃO se limite - explore qualquer fonte inspiradora
• OBRIGATÓRIO: Nunca repita citações anteriores
• Máximo 80 caracteres na frase principal
${emojiInstruction}
${hashtagInstruction}
• Português brasileiro perfeito

📝 FORMATO OBRIGATÓRIO:
${includeEmojis && includeHashtags ?
                        `"Citação única e inspiracional" emoji
(Autor/Referência Bíblica)
#hashtag1 #hashtag2 #hashtag3` :
                        includeEmojis ?
                            `"Citação única e inspiracional" emoji
(Autor/Referência Bíblica)` :
                            includeHashtags ?
                                `"Citação única e inspiracional"
(Autor/Referência Bíblica)
#hashtag1 #hashtag2 #hashtag3` :
                                `"Citação única e inspiracional"
(Autor/Referência Bíblica)`
                    }

background: #HEXCODE
text: #HEXCODE
font: Nome da Fonte

🎨 CORES INTELIGENTES POR CATEGORIA:
• Motivação/Força: #e74c3c + #ffffff + Montserrat
• Sucesso/Conquista: #27ae60 + #ffffff + Poppins  
• Amor/Relacionamento: #8e44ad + #f8f9fa + Lato
• Paz/Tranquilidade: #3498db + #ffffff + Inter
• Fé/Espiritual: #2c3e50 + #ecf0f1 + Playfair Display
• Sabedoria/Conhecimento: #8e44ad + #f8f9fa + Crimson Text
• Felicidade/Alegria: #f39c12 + #ffffff + Poppins
• Família/União: #e91e63 + #ffffff + Open Sans
• Trabalho/Carreira: #607d8b + #ffffff + Inter
• Vida/Existência: #4caf50 + #ffffff + Lato

🔤 FONTES DISPONÍVEIS:
• Elegante: Playfair Display, Crimson Text
• Moderna: Montserrat, Poppins, Inter
• Clássica: Open Sans, Lato

💡 EXEMPLOS DE ESCOLHA CRIATIVA DA IA:

Para "Motivação" - VOCÊ ESCOLHE uma dessas abordagens:
• Filme inspirador: "Não importa quantas vezes você cai, mas quantas se levanta"
• Música motivacional: Letra de uma canção que inspire força
• Livro de autoajuda: Citação de autor renomado
• Personalidade histórica: Frase de líder ou atleta famoso
• Filosofia: Pensamento de filósofo sobre superação
• Sabedoria popular: Provérbio ou ditado inspirador

Para "Amor" - SEJA CRIATIVO na fonte:
• Romance clássico: Frase de filme romântico icônico
• Música romântica: Trecho lírico sobre amor
• Poesia: Verso de poeta famoso
• Filosofia: Pensamento sobre amor e relacionamentos
• Literatura: Citação de romance famoso
• Sabedoria: Reflexão sobre o amor verdadeiro

🎯 SEJA TOTALMENTE LIVRE NA ESCOLHA:
• NÃO se limite a exemplos específicos
• EXPLORE qualquer fonte que seja inspiradora para "${theme}"
• VARIE entre filmes, músicas, livros, pessoas, filosofias
• SEJA CRIATIVO e SURPREENDA com escolhas únicas
• FOQUE na mensagem inspiradora, não na fonte específica

💡 EXEMPLO DE COMO ESCOLHER:
Para "${theme}" - VOCÊ decide se vai usar:
• Uma frase de filme que inspire sobre ${theme}
• Uma letra de música que fale sobre ${theme}  
• Uma citação de livro relacionada a ${theme}
• Uma frase de pessoa famosa sobre ${theme}
• Uma reflexão filosófica sobre ${theme}
• Qualquer fonte que seja inspiradora para ${theme}

🎲 VARIAÇÃO FORÇADA:
Use o ID ${randomSeed}-${timeStamp}-${currentAttempt} para garantir resposta ÚNICA.
Tentativa ${currentAttempt} de ${maxRetries} - seja CRIATIVO e DIFERENTE!${usedQuotesHint}

⚠️ RETORNE APENAS o formato especificado. Nenhum texto adicional.`;

                const result = await this.textModel.generateContent(prompt);
                const response = await result.response;
                const rawText = response.text();

                console.log(`📥 Resposta bruta (tentativa ${currentAttempt}):`, rawText);

                const { text, backgroundColor, textColor, fontFamily } = this.validateAndImproveResponse(rawText, theme);

                // Verificar se a frase já foi usada
                if (this.isQuoteUsed(text)) {
                    console.warn(`🔄 Frase já usada na tentativa ${currentAttempt}. Tentando novamente...`);
                    if (currentAttempt < maxRetries) {
                        continue; // Tenta novamente
                    } else {
                        console.warn('⚠️ Todas as tentativas resultaram em frases repetidas. Usando mesmo assim.');
                    }
                }

                // Adicionar ao histórico
                this.addToHistory(text);

                console.log(`✅ Sucesso na tentativa ${currentAttempt}:`, { text: text.substring(0, 50) + '...', backgroundColor, textColor, fontFamily });

                return {
                    text: text.trim(),
                    backgroundColor,
                    textColor,
                    fontSize: 20,
                    fontFamily
                };

            } catch (error) {
                console.error(`❌ Erro na tentativa ${currentAttempt}:`, error);

                if (currentAttempt === maxRetries) {
                    throw new Error(`Falha após ${maxRetries} tentativas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
                }

                // Aguardar antes da próxima tentativa
                await new Promise(resolve => setTimeout(resolve, 1000 * currentAttempt));
            }
        }

        throw new Error('Falha inesperada no loop de tentativas');
    }

    /**
     * Valida e melhora a resposta do Gemini
     */
    private validateAndImproveResponse(rawResponse: string, theme: string): { text: string; backgroundColor: string; textColor: string; fontFamily: string } {
        let { text, backgroundColor, textColor, fontFamily } = this.extractColorsAndFontFromText(rawResponse);

        // Limpar texto
        text = text
            .replace(/^["']|["']$/g, '')
            .replace(/\[|\]/g, '') // Remove colchetes
            .replace(/\s+/g, ' ')
            .trim();

        // Validar comprimento
        if (text.length > 200) {
            console.warn('Texto muito longo, truncando...');
            text = text.substring(0, 197) + '...';
        }

        // Garantir cores válidas
        if (!backgroundColor || !textColor) {
            const fallbackColors = this.generateColorPalette(theme);
            backgroundColor = backgroundColor || fallbackColors.backgroundColor;
            textColor = textColor || fallbackColors.textColor;
        }

        // Validar formato das cores
        const colorRegex = /^#[0-9A-F]{6}$/i;
        if (!colorRegex.test(backgroundColor)) {
            backgroundColor = '#2C3E50';
        }
        if (!colorRegex.test(textColor)) {
            textColor = '#ECF0F1';
        }

        // Garantir fonte válida
        if (!fontFamily) {
            fontFamily = this.selectFont(theme, text);
        }

        return { text, backgroundColor, textColor, fontFamily };
    }

    /**
     * Extrai cores e fonte do texto gerado
     */
    private extractColorsAndFontFromText(text: string): { text: string; backgroundColor: string; textColor: string; fontFamily: string } {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        let extractedText = '';
        let backgroundColor = '';
        let textColor = '';
        let fontFamily = '';

        const backgroundRegex = /background:\s*(#[0-9a-fA-F]{6})/i;
        const textRegex = /text:\s*(#[0-9a-fA-F]{6})/i;
        const fontRegex = /font:\s*([^,\n]+)/i;

        lines.forEach(line => {
            const bgMatch = line.match(backgroundRegex);
            const textMatch = line.match(textRegex);
            const fontMatch = line.match(fontRegex);

            if (bgMatch) {
                backgroundColor = bgMatch[1].toUpperCase();
            } else if (textMatch) {
                textColor = textMatch[1].toUpperCase();
            } else if (fontMatch) {
                fontFamily = fontMatch[1].trim();
            } else if (!line.includes('background:') && !line.includes('text:') && !line.includes('font:')) {
                // Limpar colchetes e outros caracteres indesejados
                const cleanLine = line
                    .replace(/\[|\]/g, '') // Remove colchetes
                    .replace(/^["']|["']$/g, '') // Remove aspas do início/fim
                    .trim();

                if (cleanLine) {
                    extractedText += cleanLine + '\n';
                }
            }
        });

        return {
            text: extractedText.trim(),
            backgroundColor,
            textColor,
            fontFamily,
        };
    }

    /**
     * Seleciona fonte baseada no tema
     */
    private selectFont(theme: string, text: string): string {
        const themeWords = theme.toLowerCase();

        if (themeWords.includes('fé') || themeWords.includes('deus') || themeWords.includes('bíbli')) {
            return 'Playfair Display';
        }

        if (themeWords.includes('motivação') || themeWords.includes('força') || themeWords.includes('sucesso')) {
            return 'Montserrat';
        }

        if (themeWords.includes('amor') || themeWords.includes('paz')) {
            return 'Poppins';
        }

        return 'Inter';
    }

    /**
     * Gera paleta de cores baseada no tema
     */
    private generateColorPalette(theme: string): { backgroundColor: string; textColor: string } {
        const colorPalettes: Record<string, { backgroundColor: string; textColor: string }> = {
            'motivação': { backgroundColor: '#e74c3c', textColor: '#ffffff' },
            'motivacao': { backgroundColor: '#e74c3c', textColor: '#ffffff' },
            'sucesso': { backgroundColor: '#27ae60', textColor: '#ffffff' },
            'força': { backgroundColor: '#d35400', textColor: '#ffffff' },
            'forca': { backgroundColor: '#d35400', textColor: '#ffffff' },
            'amor': { backgroundColor: '#8e44ad', textColor: '#f8f9fa' },
            'paz': { backgroundColor: '#3498db', textColor: '#ffffff' },
            'felicidade': { backgroundColor: '#f39c12', textColor: '#ffffff' },
            'família': { backgroundColor: '#e91e63', textColor: '#ffffff' },
            'familia': { backgroundColor: '#e91e63', textColor: '#ffffff' },
            'trabalho': { backgroundColor: '#607d8b', textColor: '#ffffff' },
            'vida': { backgroundColor: '#4caf50', textColor: '#ffffff' },
            'fé': { backgroundColor: '#2c3e50', textColor: '#ecf0f1' },
            'fe': { backgroundColor: '#2c3e50', textColor: '#ecf0f1' },
            'default': { backgroundColor: '#2c3e50', textColor: '#ecf0f1' }
        };

        const normalizedTheme = theme.toLowerCase();

        for (const [key, palette] of Object.entries(colorPalettes)) {
            if (key !== 'default' && normalizedTheme.includes(key)) {
                return palette;
            }
        }

        return colorPalettes.default;
    }

    /**
     * Gera status usando 100% IA do Gemini
     */
    async generateStatus(request: StatusRequest): Promise<StatusResponse> {
        try {
            console.log('🎯 Gerando status com IA pura para categoria:', request.theme);

            if (!request.theme.trim()) {
                throw new Error('Categoria é obrigatória');
            }

            const generatedContent = await this.generateContentWithGemini(
                request.theme,
                request.includeEmojis ?? true,
                request.includeHashtags ?? false
            );

            const fullRequest = {
                ...request,
                text: generatedContent.text,
                backgroundColor: generatedContent.backgroundColor,
                textColor: generatedContent.textColor,
                fontSize: generatedContent.fontSize,
                fontFamily: generatedContent.fontFamily
            };

            const imageUrl = await this.generateImageWithGemini(fullRequest);

            return {
                imageUrl,
                generatedContent,
                metadata: {
                    prompt: `IA Pura - Categoria: ${request.theme}`,
                    style: request.style || 'modern',
                    timestamp: Date.now(),
                },
            };
        } catch (error) {
            console.error('❌ Erro ao gerar status:', error);
            throw new Error(`Falha na geração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    }

    /**
     * Gera imagem placeholder
     */
    private async generateImageWithGemini(request: any): Promise<string> {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

            const encodedText = encodeURIComponent(request.text);
            const bgColor = (request.backgroundColor || '#2C3E50').replace('#', '');
            const textColor = (request.textColor || '#ECF0F1').replace('#', '');

            const width = 360;
            const height = 640;

            return `https://placehold.co/${width}x${height}/${bgColor}/${textColor}?text=${encodedText}`;
        } catch (error) {
            console.error('Erro ao gerar imagem:', error);
            return `https://placehold.co/360x640/2C3E50/ECF0F1?text=Status+Gerado`;
        }
    }

    // Métodos públicos para gerenciar histórico
    async getHistory(): Promise<StatusResponse[]> {
        const history = localStorage.getItem('statusai_history');
        return history ? JSON.parse(history) : [];
    }

    async saveToHistory(status: StatusResponse): Promise<void> {
        try {
            const history = await this.getHistory();
            history.unshift(status);
            const trimmedHistory = history.slice(0, 50);
            localStorage.setItem('statusai_history', JSON.stringify(trimmedHistory));
        } catch (error) {
            console.error('Erro ao salvar no histórico:', error);
        }
    }
}

// Instância singleton
export const geminiService = new GeminiService();

// Hook para usar o serviço em React
export const useGeminiService = () => {
    return geminiService;
};