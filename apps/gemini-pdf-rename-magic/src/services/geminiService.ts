
import { AppError, ErrorType, createAPIError, createFileError, createProcessingError, normalizeError } from '@/types/errors';
import { logger } from '@/utils/logger';
import { withRetry, RETRY_CONFIGS } from '@/utils/retry';
import { aiResultCache } from '@/utils/cache';
import { DocumentInfo, DocumentType, DocumentAnalysisResult } from '@/types/document';
import { PDFToImageConverter } from '@/utils/pdfToImage';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface GeminiErrorResponse {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

export class GeminiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeDocument(file: File, customPrompt?: string, model: string = 'gemini-2.5-flash-lite'): Promise<string> {
    const startTime = Date.now();
    
    try {
      logger.logFileProcessing(file.name, 'start');
      logger.info('Iniciando análise do documento', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        model,
        hasCustomPrompt: !!customPrompt
      });
      
      // Validar arquivo antes do processamento
      this.validateFile(file);
      
      // Verificar cache primeiro
      const prompt = this.getEffectivePrompt(customPrompt, this.getFileType(file));
      const cacheKey = aiResultCache.generateKey(file, prompt, model);
      const cachedResult = aiResultCache.get<string>(cacheKey);
      
      if (cachedResult) {
        logger.info('Resultado encontrado no cache', {
          fileName: file.name,
          cacheKey: cacheKey.substring(0, 20) + '...'
        });
        
        const duration = Date.now() - startTime;
        logger.logFileProcessing(file.name, 'success', duration);
        return cachedResult;
      }
      
      // Check if it's a scanned PDF and convert to image if needed
      let base64Data: string;
      let mimeType: string;
      let fileType: string;
      
      if (PDFToImageConverter.isPDF(file) && await PDFToImageConverter.isScannedPDF(file)) {
        logger.debug('Detected scanned PDF, converting to image', { fileName: file.name });
        base64Data = await PDFToImageConverter.convertFirstPageToImage(file, {
          scale: 2.0,
          quality: 0.8,
          format: 'jpeg'
        });
        mimeType = 'image/jpeg';
        fileType = 'image';
        logger.debug('PDF converted to image for analysis', { fileName: file.name });
      } else {
        // Convert file to base64 normally
        base64Data = await this.fileToBase64(file);
        mimeType = this.getMimeType(file);
        fileType = this.getFileType(file);
      }
      
      logger.debug('Prompt configurado', {
        promptLength: prompt.length,
        fileType,
        model
      });

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 150,
          stopSequences: []
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      // Fazer a requisição com retry inteligente
      const data = await this.makeAPIRequestWithSmartRetry(
        requestBody,
        model,
        file.name,
        startTime,
        fileType
      );
      
      if (!data.candidates || data.candidates.length === 0) {
        throw createProcessingError(
          ErrorType.ANALYSIS_FAILED,
          'API returned no candidates',
          'A IA não conseguiu gerar uma resposta. Tente novamente.',
          true,
          { model, fileName: file.name }
        );
      }

      const suggestedName = data.candidates[0].content.parts[0].text.trim();
      logger.debug('Nome sugerido pela IA', { suggestedName, fileName: file.name });
      
      // Clean the suggested name and convert to uppercase
      const cleanedName = this.cleanFileName(suggestedName);
      
      if (!cleanedName) {
        logger.warn('Nome limpo resultou vazio, usando nome padrão', {
          originalName: suggestedName,
          fileName: file.name
        });
        return this.getDefaultName(file);
      }
      
      const duration = Date.now() - startTime;
      logger.logFileProcessing(file.name, 'success', duration);
      
      // Salvar no cache
      aiResultCache.set(cacheKey, cleanedName);
      logger.debug('Resultado salvo no cache', {
        fileName: file.name,
        result: cleanedName,
        cacheKey: cacheKey.substring(0, 20) + '...'
      });
      
      return cleanedName;
    } catch (error) {
      const duration = Date.now() - startTime;
      const appError = normalizeError(error, {
        fileName: file.name,
        fileSize: file.size,
        model,
        duration
      });
      
      logger.logFileProcessing(file.name, 'error', duration);
      logger.error('Erro ao analisar documento', appError);
      
      throw appError;
    }
  }

  private async makeAPIRequestWithSmartRetry(
    requestBody: any,
    model: string,
    fileName: string,
    startTime: number,
    fileType?: string
  ): Promise<GeminiResponse> {
    let lastError: AppError | null = null;
    
    // Primeira tentativa com configuração padrão
    try {
      return await withRetry(
        async () => {
          logger.debug('Enviando requisição para API Gemini', { model });
          
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            let errorData: GeminiErrorResponse;
            
            try {
              errorData = JSON.parse(errorText);
            } catch {
              throw this.createAPIErrorFromStatus(response.status, errorText);
            }
            
            throw this.createAPIErrorFromResponse(response.status, errorData);
          }

          const data: GeminiResponse = await response.json();
          
          const duration = Date.now() - startTime;
          logger.logAPICall(model, fileType, duration);
          
          return data;
        },
        `Gemini API call for ${fileName}`,
        RETRY_CONFIGS.API_CALL
      );
    } catch (error) {
      lastError = error instanceof AppError ? error : normalizeError(error);
      
      // Se for erro de sobrecarga, tentar com configuração específica
      if (lastError.type === ErrorType.API_MODEL_OVERLOADED) {
        logger.warn('Modelo sobrecarregado detectado, aplicando retry com delay maior', {
          fileName,
          model,
          error: lastError.message
        });
        
        return await withRetry(
          async () => {
            logger.debug('Tentativa com delay maior para modelo sobrecarregado', { model });
            
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
              }
            );

            if (!response.ok) {
              const errorText = await response.text();
              let errorData: GeminiErrorResponse;
              
              try {
                errorData = JSON.parse(errorText);
              } catch {
                throw this.createAPIErrorFromStatus(response.status, errorText);
              }
              
              throw this.createAPIErrorFromResponse(response.status, errorData);
            }

            const data: GeminiResponse = await response.json();
            
            const duration = Date.now() - startTime;
            logger.logAPICall(model, fileType, duration);
            
            return data;
          },
          `Gemini API call (overload retry) for ${fileName}`,
          RETRY_CONFIGS.MODEL_OVERLOAD
        );
      }
      
      // Re-lançar o erro original se não for sobrecarga
      throw lastError;
    }
  }

  private getEffectivePrompt(customPrompt?: string, fileType?: string): string {
    // Check if user wants to use custom prompt from localStorage
    const useCustomPrompt = localStorage.getItem('geminiUseCustomPrompt') === 'true';
    const savedCustomPrompt = localStorage.getItem('geminiCustomPrompt');
    
    let effectivePrompt = '';
    
    if (useCustomPrompt && savedCustomPrompt) {
      console.log('Usando prompt personalizado salvo no localStorage');
      effectivePrompt = savedCustomPrompt;
    } else if (customPrompt) {
      console.log('Usando prompt personalizado fornecido diretamente');
      effectivePrompt = customPrompt;
    } else {
      console.log('Usando prompt padrão');
      effectivePrompt = `VOCÊ É UM ESPECIALISTA EM ORGANIZAÇÃO DOCUMENTAL. Analise DETALHADAMENTE este documento [FILETYPE] e crie um nome ESPECÍFICO e PROFISSIONAL.

🎯 OBJETIVO: Criar um nome que permita localizar o documento rapidamente no futuro.

📋 REGRAS OBRIGATÓRIAS:
- MÁXIMO 60 caracteres
- APENAS letras, números, hífens e underscores
- TODAS AS LETRAS EM CAIXA ALTA
- SEM a extensão do arquivo
- Em PORTUGUÊS
- Use underscores para separar elementos

🔍 ANÁLISE SISTEMÁTICA - PROCURE ESPECIFICAMENTE:

1️⃣ TIPO DE DOCUMENTO (identifique com precisão):
   • NOTA_FISCAL, RECIBO, COMPROVANTE_PAGAMENTO, CUPOM_FISCAL
   • CONTRATO, CERTIDAO, PROCURACAO, ESCRITURA, PETICAO
   • RELATORIO, APRESENTACAO, MEMORANDO, ATA, POLITICA
   • RG, CPF, CNH, COMPROVANTE_RESIDENCIA, TITULO_ELEITOR
   • DIPLOMA, CERTIFICADO, HISTORICO, DECLARACAO
   • FATURA, BOLETO, EXTRATO, DEMONSTRATIVO

2️⃣ INFORMAÇÕES-CHAVE (extraia dados específicos):
   • Nome da empresa/pessoa/instituição
   • Número do documento (se houver)
   • Data de emissão/vencimento/assinatura
   • Valor monetário (se relevante)
   • Período de referência

3️⃣ CONTEXTO ESPECÍFICO:
   • Para FISCAIS: empresa_numero_data
   • Para JURÍDICOS: partes_envolvidas_data
   • Para CORPORATIVOS: departamento_periodo_ano
   • Para PESSOAIS: nome_pessoa_data
   • Para ACADÊMICOS: curso_instituicao_ano

📄 ESTRUTURA IDEAL:
TIPO_DOCUMENTO_DETALHES_ESPECIFICOS_DATA

🎯 EXEMPLOS DE NOMES ASSERTIVOS:
- NOTA_FISCAL_EMPRESA_ABC_001234_20240315
- CONTRATO_LOCACAO_JOAO_SILVA_20240315
- RELATORIO_VENDAS_JANEIRO_2024
- RG_MARIA_SANTOS_20240315
- DIPLOMA_ENGENHARIA_CIVIL_UFMG_2024
- FATURA_ENERGIA_CEMIG_MARCO_2024

⚠️ IMPORTANTE:
- Use informações VISÍVEIS no documento
- Seja ESPECÍFICO, não genérico
- Priorize dados que facilitem busca futura
- Se não conseguir extrair dados específicos, use padrão: DOCUMENTO_[FILETYPE]_AAAAMMDD

RESPONDA APENAS COM O NOME EM CAIXA ALTA, SEM EXPLICAÇÕES.`;
    }
    
    // Replace [FILETYPE] placeholder with actual file type
    if (fileType) {
      effectivePrompt = effectivePrompt.replace(/\[FILETYPE\]/g, fileType);
    }
    
    return effectivePrompt;
  }

  private validateFile(file: File): void {
    const maxSize = 20 * 1024 * 1024; // 20MB
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (file.size === 0) {
      throw createFileError(
        ErrorType.FILE_EMPTY,
        'File is empty',
        'O arquivo está vazio. Selecione um arquivo válido.',
        { fileName: file.name, fileSize: file.size }
      );
    }

    if (file.size > maxSize) {
      throw createFileError(
        ErrorType.FILE_TOO_LARGE,
        `File size ${file.size} exceeds maximum ${maxSize}`,
        `O arquivo é muito grande (${Math.round(file.size / 1024 / 1024)}MB). O tamanho máximo é 20MB.`,
        { fileName: file.name, fileSize: file.size, maxSize }
      );
    }

    if (!allowedTypes.includes(file.type)) {
      throw createFileError(
        ErrorType.FILE_INVALID_FORMAT,
        `Unsupported file type: ${file.type}`,
        'Formato de arquivo não suportado. Use PDF, Word ou imagens (JPEG, PNG, GIF, WebP).',
        { fileName: file.name, fileType: file.type, allowedTypes }
      );
    }
  }

  private createAPIErrorFromStatus(status: number, errorText: string): AppError {
    switch (status) {
      case 400:
        return createAPIError(
          ErrorType.API_KEY_INVALID,
          `Bad Request: ${errorText}`,
          'Requisição inválida. Verifique a configuração da API.',
          status
        );
      case 401:
        return createAPIError(
          ErrorType.API_UNAUTHORIZED,
          `Unauthorized: ${errorText}`,
          'Chave API inválida ou expirada. Verifique suas credenciais.',
          status
        );
      case 403:
        return createAPIError(
          ErrorType.API_QUOTA_EXCEEDED,
          `Forbidden: ${errorText}`,
          'Acesso negado. Verifique as permissões da sua chave API.',
          status
        );
      case 429:
        return createAPIError(
          ErrorType.API_RATE_LIMIT,
          `Rate limit exceeded: ${errorText}`,
          'Limite de requisições excedido. Tente novamente em alguns minutos.',
          status
        );
      case 500:
      case 502:
      case 503:
        // Verificar se é erro de sobrecarga do modelo
        if (errorText.toLowerCase().includes('overloaded') || errorText.toLowerCase().includes('try again later')) {
          return createAPIError(
            ErrorType.API_MODEL_OVERLOADED,
            `Model overloaded: ${errorText}`,
            'O modelo está sobrecarregado. Tentando novamente automaticamente...',
            status
          );
        }
        return createAPIError(
          ErrorType.API_SERVICE_UNAVAILABLE,
          `Server error: ${errorText}`,
          'Serviço temporariamente indisponível. Tente novamente em alguns minutos.',
          status
        );
      default:
        return createAPIError(
          ErrorType.API_NETWORK_ERROR,
          `HTTP ${status}: ${errorText}`,
          'Erro de comunicação com a API. Tente novamente.',
          status
        );
    }
  }

  private createAPIErrorFromResponse(status: number, errorData: GeminiErrorResponse): AppError {
    const { error } = errorData;
    
    // Mapear códigos específicos do Gemini
    if (error.status === 'INVALID_ARGUMENT') {
      return createAPIError(
        ErrorType.API_KEY_INVALID,
        error.message,
        'Parâmetros inválidos na requisição. Verifique a configuração.',
        status,
        { geminiError: error }
      );
    }
    
    if (error.status === 'PERMISSION_DENIED') {
      return createAPIError(
        ErrorType.API_UNAUTHORIZED,
        error.message,
        'Permissão negada. Verifique sua chave API.',
        status,
        { geminiError: error }
      );
    }
    
    if (error.status === 'RESOURCE_EXHAUSTED') {
      return createAPIError(
        ErrorType.API_QUOTA_EXCEEDED,
        error.message,
        'Cota da API esgotada. Tente novamente mais tarde.',
        status,
        { geminiError: error }
      );
    }
    
    // Detectar sobrecarga do modelo
    if (error.message.toLowerCase().includes('overloaded') || 
        error.message.toLowerCase().includes('try again later') ||
        error.status === 'UNAVAILABLE') {
      return createAPIError(
        ErrorType.API_MODEL_OVERLOADED,
        error.message,
        'O modelo está sobrecarregado. Tentando novamente automaticamente...',
        status,
        { geminiError: error }
      );
    }
    
    return createAPIError(
      ErrorType.API_NETWORK_ERROR,
      error.message,
      'Erro na API do Gemini. Tente novamente.',
      status,
      { geminiError: error }
    );
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => {
        const appError = createFileError(
          ErrorType.FILE_READ_ERROR,
          `Failed to read file: ${error}`,
          'Erro ao ler o arquivo. Tente novamente.',
          { fileName: file.name }
        );
        reject(appError);
      };
    });
  }

  private cleanFileName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s\-_áéíóúâêîôûàèìòùãõçÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]/gi, '') // Remove special characters but keep accents
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toUpperCase() // Convert to uppercase
      .substring(0, 50) // Limit to 50 characters
      .replace(/^_+|_+$/g, ''); // Remove underscores at beginning and end
  }

  private getMimeType(file: File): string {
    const mimeTypeMap: { [key: string]: string } = {
      'application/pdf': 'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword': 'application/msword',
      'image/jpeg': 'image/jpeg',
      'image/png': 'image/png',
      'image/gif': 'image/gif',
      'image/webp': 'image/webp'
    };
    
    return mimeTypeMap[file.type] || file.type;
  }

  private getFileType(file: File): string {
    if (file.type === 'application/pdf') {
      return 'PDF';
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword'
    ) {
      return 'Word';
    } else if (file.type.startsWith('image/')) {
      return 'Imagem';
    }
    return 'documento';
  }

  private getDefaultName(file: File): string {
    const fileType = this.getFileType(file);
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `DOCUMENTO_${fileType.toUpperCase()}_${timestamp}`;
  }

  async extractStructuredDocumentInfo(file: File, model: string = 'gemini-2.5-flash-lite'): Promise<DocumentAnalysisResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Iniciando extração estruturada de dados do documento', {
        fileName: file.name,
        fileSize: file.size,
        model
      });

      // Validar arquivo
      this.validateFile(file);

      // Prompt específico para extração estruturada
      const structuredPrompt = this.getStructuredExtractionPrompt();
      
      // Verificar cache
      const cacheKey = aiResultCache.generateKey(file, structuredPrompt, model);
      const cachedResult = aiResultCache.get<string>(cacheKey);
      
      if (cachedResult) {
        logger.info('Resultado encontrado no cache para extração estruturada');
        return this.parseStructuredResponse(cachedResult, file.name, Date.now() - startTime);
      }

      // Check if it's a scanned PDF and convert to image if needed
      let base64Data: string;
      let mimeType: string;
      
      if (PDFToImageConverter.isPDF(file) && await PDFToImageConverter.isScannedPDF(file)) {
        logger.debug('Detected scanned PDF for structured extraction, converting to image', { fileName: file.name });
        base64Data = await PDFToImageConverter.convertFirstPageToImage(file, {
          scale: 2.0,
          quality: 0.8,
          format: 'jpeg'
        });
        mimeType = 'image/jpeg';
        logger.debug('PDF converted to image for structured extraction', { fileName: file.name });
      } else {
        // Convert file to base64 normally
        base64Data = await this.fileToBase64(file);
        mimeType = this.getMimeType(file);
      }

      // Preparar requisição
      const requestBody = {
        contents: [{
          parts: [
            { text: structuredPrompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1, // Baixa temperatura para maior precisão
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 2048,
        }
      };

      // Fazer requisição com retry
      const response = await this.makeAPIRequestWithSmartRetry(
        requestBody,
        model,
        file.name,
        startTime,
        'structured_extraction'
      );

      const result = response.candidates[0]?.content?.parts[0]?.text;
      
      if (!result) {
        throw createProcessingError(
          ErrorType.PROCESSING_FAILED,
          'Resposta vazia da API para extração estruturada',
          'Não foi possível extrair informações do documento.'
        );
      }

      // Cache do resultado
      aiResultCache.set(cacheKey, result);

      const analysisResult = this.parseStructuredResponse(result, file.name, Date.now() - startTime);
      
      logger.info('Extração estruturada concluída com sucesso', {
        fileName: file.name,
        documentType: analysisResult.documentInfo.type,
        confidence: analysisResult.documentInfo.confidence,
        extractionTime: analysisResult.extractionTime
      });

      return analysisResult;

    } catch (error) {
      const normalizedError = normalizeError(error);
      logger.logFileProcessing(file.name, 'error');
      throw normalizedError;
    }
  }

  private getStructuredExtractionPrompt(): string {
    return `
Você é um especialista em análise e organização de documentos brasileiros. Sua tarefa é extrair informações estruturadas de documentos para criar nomes de arquivo específicos e organizados.

OBJETIVO: Analisar o documento e extrair informações precisas em formato JSON para gerar nomes de arquivo inteligentes.

ESTRATÉGIA DE ANÁLISE POR CATEGORIA:

📋 DOCUMENTOS FISCAIS:
- Foque em: Empresa emissora, número da nota/cupom, valor total, data de emissão
- Exemplo: "NOTA_FISCAL_EMPRESA_ABC_123456_R50000_20240315"

⚖️ DOCUMENTOS JURÍDICOS:
- Foque em: Partes envolvidas, objeto do contrato/documento, número do processo
- Exemplo: "CONTRATO_JOAO_SILVA_LOCACAO_IMOVEL_20240315"

🏢 DOCUMENTOS CORPORATIVOS:
- Foque em: Empresa, departamento, assunto principal, data
- Exemplo: "RELATORIO_EMPRESA_XYZ_VENDAS_TRIMESTRAL_20240315"

👤 DOCUMENTOS PESSOAIS:
- Foque em: Nome da pessoa, número do documento, órgão emissor
- Exemplo: "RG_JOAO_SILVA_123456789_SSP_20240315"

🎓 DOCUMENTOS ACADÊMICOS:
- Foque em: Nome da pessoa, curso/área, instituição, ano
- Exemplo: "DIPLOMA_MARIA_SANTOS_ENGENHARIA_USP_20240315"

💰 DOCUMENTOS FINANCEIROS:
- Foque em: Empresa, tipo de demonstrativo, período
- Exemplo: "BALANCO_EMPRESA_ABC_ANUAL_20240315"

👷 DOCUMENTOS TRABALHISTAS:
- Foque em: Empresa, funcionário, tipo de documento, período
- Exemplo: "HOLERITE_EMPRESA_XYZ_JOAO_SILVA_202403"

🏠 DOCUMENTOS IMOBILIÁRIOS:
- Foque em: Endereço/localização, partes envolvidas, tipo de transação
- Exemplo: "IPTU_RUA_DAS_FLORES_123_JOAO_SILVA_2024"

🚗 DOCUMENTOS VEICULARES:
- Foque em: Proprietário, placa do veículo, tipo de documento
- Exemplo: "CRLV_JOAO_SILVA_ABC1234_2024"

🏛️ DOCUMENTOS GOVERNAMENTAIS:
- Foque em: Órgão, número do processo, objeto/finalidade
- Exemplo: "EMPENHO_PREFEITURA_123456_MATERIAL_ESCRITORIO"

INSTRUÇÕES ESPECÍFICAS DE EXTRAÇÃO:

1. TIPO DO DOCUMENTO:
   - Seja específico (ex: "Nota Fiscal Eletrônica" ao invés de "Nota Fiscal")
   - Use a nomenclatura exata encontrada no documento

2. EMPRESA/PESSOA:
   - Para empresas: Use razão social completa
   - Para pessoas: Use nome completo
   - Remova caracteres especiais desnecessários

3. DATA:
   - Priorize data de emissão/vencimento
   - Formato obrigatório: YYYY-MM-DD
   - Se apenas mês/ano, use dia 01

4. NÚMERO DO DOCUMENTO:
   - Mantenha formatação original
   - Inclua prefixos importantes (ex: "NF-123456")

5. ASSUNTO/OBJETO:
   - Seja específico e descritivo
   - Use termos técnicos quando apropriado
   - Máximo 3-4 palavras principais

6. PARTES ENVOLVIDAS:
   - Liste todas as partes principais
   - Ordem: [parte_principal, parte_secundária, ...]

7. LOCALIZAÇÃO:
   - Para imóveis: endereço completo resumido
   - Para empresas: cidade/estado
   - Para documentos pessoais: local de emissão

8. INFORMAÇÕES ADICIONAIS:
   - value: valores monetários com moeda
   - category: subcategoria específica
   - department: setor/departamento relevante
   - reference: informações de referência (placas, códigos, etc.)
   - urgency: "alta", "média", "baixa", "N/A"
   - keywords: palavras-chave importantes do documento

FORMATO DE RESPOSTA (JSON):
{
  "type": "tipo_específico_do_documento",
  "companyName": "nome_completo_empresa_ou_pessoa",
  "documentDate": "YYYY-MM-DD",
  "documentNumber": "numero_com_formatacao_original",
  "subject": "assunto_principal_específico",
  "parties": ["parte_principal", "outras_partes"],
  "location": "local_específico_relevante",
  "additionalInfo": {
    "value": "R$ 1.234,56",
    "category": "subcategoria_específica",
    "department": "departamento_ou_setor",
    "reference": "referencia_importante",
    "urgency": "nivel_urgencia",
    "keywords": ["palavra1", "palavra2", "palavra3"]
  },
  "confidence": 0.95
}

REGRAS CRÍTICAS:
- Use "N/A" APENAS quando a informação realmente não existir
- Seja o mais específico possível em todos os campos
- Mantenha consistência na nomenclatura
- Confidence deve ser realista (0.7-0.95)
- Priorize informações que tornem o nome do arquivo único e identificável

Analise o documento fornecido e retorne APENAS o JSON estruturado:`;
  }

  private parseStructuredResponse(response: string, fileName: string, extractionTime: number): DocumentAnalysisResult {
    try {
      // Limpar a resposta para extrair apenas o JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON não encontrado na resposta');
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      
      // Validar e mapear o tipo de documento
      const documentType = this.mapDocumentType(parsedData.type);
      
      // Criar objeto DocumentInfo
      const documentInfo: DocumentInfo = {
        type: documentType,
        companyName: parsedData.companyName || 'N/A',
        documentDate: parsedData.documentDate || 'N/A',
        documentNumber: parsedData.documentNumber || 'N/A',
        subject: parsedData.subject || undefined,
        parties: parsedData.parties || undefined,
        location: parsedData.location || undefined,
        additionalInfo: parsedData.additionalInfo || {},
        confidence: Math.min(100, Math.max(0, parsedData.confidence || 50))
      };

      // Gerar nome sugerido baseado nas informações extraídas
      const suggestedFileName = this.generateStructuredFileName(documentInfo);

      return {
        documentInfo,
        suggestedFileName,
        extractionTime,
        rawText: response
      };

    } catch (error) {
      logger.error('Erro ao fazer parse da resposta estruturada', { error, response });
      
      // Fallback: criar estrutura básica
      return {
        documentInfo: {
          type: DocumentType.OUTROS,
          companyName: 'N/A',
          documentDate: 'N/A',
          documentNumber: 'N/A',
          confidence: 0
        },
        suggestedFileName: this.getDefaultName({ name: fileName } as File),
        extractionTime,
        rawText: response
      };
    }
  }

  private mapDocumentType(type: string): DocumentType {
    const typeMap: Record<string, DocumentType> = {
      // FISCAIS
      'nota fiscal': DocumentType.NOTA_FISCAL,
      'nota fiscal eletronica': DocumentType.NOTA_FISCAL_ELETRONICA,
      'nota fiscal eletrônica': DocumentType.NOTA_FISCAL_ELETRONICA,
      'cupom fiscal': DocumentType.CUPOM_FISCAL,
      'recibo': DocumentType.RECIBO,
      'fatura': DocumentType.FATURA,
      'boleto': DocumentType.BOLETO,
      'comprovante pagamento': DocumentType.COMPROVANTE_PAGAMENTO,
      'comprovante de pagamento': DocumentType.COMPROVANTE_PAGAMENTO,
      
      // JURÍDICOS
      'contrato': DocumentType.CONTRATO,
      'procuração': DocumentType.PROCURACAO,
      'procuracao': DocumentType.PROCURACAO,
      'petição': DocumentType.PETICAO,
      'peticao': DocumentType.PETICAO,
      'certidão': DocumentType.CERTIDAO,
      'certidao': DocumentType.CERTIDAO,
      'escritura': DocumentType.ESCRITURA,
      'alvará': DocumentType.ALVARA,
      'alvara': DocumentType.ALVARA,
      'licença': DocumentType.LICENCA,
      'licenca': DocumentType.LICENCA,
      
      // CORPORATIVOS
      'relatório': DocumentType.RELATORIO,
      'relatorio': DocumentType.RELATORIO,
      'ata': DocumentType.ATA,
      'memorando': DocumentType.MEMORANDO,
      'ofício': DocumentType.OFICIO,
      'oficio': DocumentType.OFICIO,
      'política': DocumentType.POLITICA,
      'politica': DocumentType.POLITICA,
      'procedimento': DocumentType.PROCEDIMENTO,
      'manual': DocumentType.MANUAL,
      
      // PESSOAIS
      'rg': DocumentType.RG,
      'cpf': DocumentType.CPF,
      'cnh': DocumentType.CNH,
      'comprovante residencia': DocumentType.COMPROVANTE_RESIDENCIA,
      'comprovante de residencia': DocumentType.COMPROVANTE_RESIDENCIA,
      'comprovante residência': DocumentType.COMPROVANTE_RESIDENCIA,
      'comprovante de residência': DocumentType.COMPROVANTE_RESIDENCIA,
      'titulo eleitor': DocumentType.TITULO_ELEITOR,
      'título eleitor': DocumentType.TITULO_ELEITOR,
      'passaporte': DocumentType.PASSAPORTE,
      
      // ACADÊMICOS
      'diploma': DocumentType.DIPLOMA,
      'certificado': DocumentType.CERTIFICADO,
      'histórico': DocumentType.HISTORICO,
      'historico': DocumentType.HISTORICO,
      'declaração': DocumentType.DECLARACAO,
      'declaracao': DocumentType.DECLARACAO,
      'atestado': DocumentType.ATESTADO,
      
      // FINANCEIROS
      'extrato': DocumentType.EXTRATO,
      'demonstrativo': DocumentType.DEMONSTRATIVO,
      'balanço': DocumentType.BALANCO,
      'balanco': DocumentType.BALANCO,
      'dre': DocumentType.DRE,
      'fluxo caixa': DocumentType.FLUXO_CAIXA,
      'fluxo de caixa': DocumentType.FLUXO_CAIXA,
      
      // TRABALHISTAS
      'contrato trabalho': DocumentType.CONTRATO_TRABALHO,
      'contrato de trabalho': DocumentType.CONTRATO_TRABALHO,
      'holerite': DocumentType.HOLERITE,
      'ctps': DocumentType.CTPS,
      'atestado medico': DocumentType.ATESTADO_MEDICO,
      'atestado médico': DocumentType.ATESTADO_MEDICO,
      'ferias': DocumentType.FERIAS,
      'férias': DocumentType.FERIAS,
      
      // IMOBILIÁRIOS
      'escritura imovel': DocumentType.ESCRITURA_IMOVEL,
      'escritura imóvel': DocumentType.ESCRITURA_IMOVEL,
      'escritura de imovel': DocumentType.ESCRITURA_IMOVEL,
      'escritura de imóvel': DocumentType.ESCRITURA_IMOVEL,
      'iptu': DocumentType.IPTU,
      'condominio': DocumentType.CONDOMINIO,
      'condomínio': DocumentType.CONDOMINIO,
      'locação': DocumentType.LOCACAO,
      'locacao': DocumentType.LOCACAO,
      'venda imovel': DocumentType.VENDA_IMOVEL,
      'venda imóvel': DocumentType.VENDA_IMOVEL,
      'venda de imovel': DocumentType.VENDA_IMOVEL,
      'venda de imóvel': DocumentType.VENDA_IMOVEL,
      'financiamento': DocumentType.FINANCIAMENTO,
      
      // VEICULARES
      'crlv': DocumentType.CRLV,
      'ipva': DocumentType.IPVA,
      'seguro veiculo': DocumentType.SEGURO_VEICULO,
      'seguro veículo': DocumentType.SEGURO_VEICULO,
      'seguro de veiculo': DocumentType.SEGURO_VEICULO,
      'seguro de veículo': DocumentType.SEGURO_VEICULO,
      'multa': DocumentType.MULTA,
      'licenciamento': DocumentType.LICENCIAMENTO,
      
      // GOVERNAMENTAIS
      'empenho': DocumentType.EMPENHO,
      'liquidação': DocumentType.LIQUIDACAO,
      'liquidacao': DocumentType.LIQUIDACAO,
      'solicitação compra': DocumentType.SOLICITACAO_COMPRA,
      'solicitacao compra': DocumentType.SOLICITACAO_COMPRA,
      'solicitação de compra': DocumentType.SOLICITACAO_COMPRA,
      'solicitacao de compra': DocumentType.SOLICITACAO_COMPRA,
      'ordem serviço': DocumentType.ORDEM_SERVICO,
      'ordem servico': DocumentType.ORDEM_SERVICO,
      'ordem de serviço': DocumentType.ORDEM_SERVICO,
      'ordem de servico': DocumentType.ORDEM_SERVICO,
      'licitação': DocumentType.LICITACAO,
      'licitacao': DocumentType.LICITACAO
    };

    const normalizedType = type.toLowerCase().trim();
    return typeMap[normalizedType] || DocumentType.OUTROS;
  }

  private generateStructuredFileName(documentInfo: DocumentInfo): string {
    const parts: string[] = [];
    const maxLength = 60; // Limite de caracteres para o nome do arquivo
    
    // 1. TIPO DO DOCUMENTO (sempre primeiro)
    const documentType = this.normalizeForFileName(documentInfo.type);
    parts.push(documentType);
    
    // 2. ESTRATÉGIA ESPECÍFICA POR CATEGORIA
    const category = this.getDocumentCategory(documentInfo.type);
    
    switch (category) {
      case 'FISCAL':
        this.addFiscalInfo(parts, documentInfo);
        break;
      case 'JURIDICO':
        this.addJuridicoInfo(parts, documentInfo);
        break;
      case 'CORPORATIVO':
        this.addCorporativoInfo(parts, documentInfo);
        break;
      case 'PESSOAL':
        this.addPessoalInfo(parts, documentInfo);
        break;
      case 'ACADEMICO':
        this.addAcademicoInfo(parts, documentInfo);
        break;
      case 'FINANCEIRO':
        this.addFinanceiroInfo(parts, documentInfo);
        break;
      case 'TRABALHISTA':
        this.addTrabalhistaInfo(parts, documentInfo);
        break;
      case 'IMOBILIARIO':
        this.addImobiliarioInfo(parts, documentInfo);
        break;
      case 'VEICULAR':
        this.addVeicularInfo(parts, documentInfo);
        break;
      case 'GOVERNAMENTAL':
        this.addGovernamentalInfo(parts, documentInfo);
        break;
      default:
        this.addGenericInfo(parts, documentInfo);
    }
    
    // 3. ADICIONAR DATA (sempre importante)
    this.addDateInfo(parts, documentInfo);
    
    // 4. OTIMIZAR TAMANHO E RETORNAR
    return this.optimizeFileName(parts, maxLength);
  }

  private getDocumentCategory(type: DocumentType): string {
    const categoryMap: Record<string, string> = {
      [DocumentType.NOTA_FISCAL]: 'FISCAL',
      [DocumentType.NOTA_FISCAL_ELETRONICA]: 'FISCAL',
      [DocumentType.CUPOM_FISCAL]: 'FISCAL',
      [DocumentType.RECIBO]: 'FISCAL',
      [DocumentType.FATURA]: 'FISCAL',
      [DocumentType.BOLETO]: 'FISCAL',
      [DocumentType.COMPROVANTE_PAGAMENTO]: 'FISCAL',
      
      [DocumentType.CONTRATO]: 'JURIDICO',
      [DocumentType.PROCURACAO]: 'JURIDICO',
      [DocumentType.PETICAO]: 'JURIDICO',
      [DocumentType.CERTIDAO]: 'JURIDICO',
      [DocumentType.ESCRITURA]: 'JURIDICO',
      [DocumentType.ALVARA]: 'JURIDICO',
      [DocumentType.LICENCA]: 'JURIDICO',
      
      [DocumentType.RELATORIO]: 'CORPORATIVO',
      [DocumentType.ATA]: 'CORPORATIVO',
      [DocumentType.MEMORANDO]: 'CORPORATIVO',
      [DocumentType.OFICIO]: 'CORPORATIVO',
      [DocumentType.POLITICA]: 'CORPORATIVO',
      [DocumentType.PROCEDIMENTO]: 'CORPORATIVO',
      [DocumentType.MANUAL]: 'CORPORATIVO',
      
      [DocumentType.RG]: 'PESSOAL',
      [DocumentType.CPF]: 'PESSOAL',
      [DocumentType.CNH]: 'PESSOAL',
      [DocumentType.COMPROVANTE_RESIDENCIA]: 'PESSOAL',
      [DocumentType.TITULO_ELEITOR]: 'PESSOAL',
      [DocumentType.PASSAPORTE]: 'PESSOAL',
      
      [DocumentType.DIPLOMA]: 'ACADEMICO',
      [DocumentType.CERTIFICADO]: 'ACADEMICO',
      [DocumentType.HISTORICO]: 'ACADEMICO',
      [DocumentType.DECLARACAO]: 'ACADEMICO',
      [DocumentType.ATESTADO]: 'ACADEMICO',
      
      [DocumentType.EXTRATO]: 'FINANCEIRO',
      [DocumentType.DEMONSTRATIVO]: 'FINANCEIRO',
      [DocumentType.BALANCO]: 'FINANCEIRO',
      [DocumentType.DRE]: 'FINANCEIRO',
      [DocumentType.FLUXO_CAIXA]: 'FINANCEIRO',
      
      [DocumentType.CONTRATO_TRABALHO]: 'TRABALHISTA',
      [DocumentType.HOLERITE]: 'TRABALHISTA',
      [DocumentType.CTPS]: 'TRABALHISTA',
      [DocumentType.ATESTADO_MEDICO]: 'TRABALHISTA',
      [DocumentType.FERIAS]: 'TRABALHISTA',
      
      [DocumentType.ESCRITURA_IMOVEL]: 'IMOBILIARIO',
      [DocumentType.IPTU]: 'IMOBILIARIO',
      [DocumentType.CONDOMINIO]: 'IMOBILIARIO',
      [DocumentType.LOCACAO]: 'IMOBILIARIO',
      [DocumentType.VENDA_IMOVEL]: 'IMOBILIARIO',
      [DocumentType.FINANCIAMENTO]: 'IMOBILIARIO',
      
      [DocumentType.CRLV]: 'VEICULAR',
      [DocumentType.IPVA]: 'VEICULAR',
      [DocumentType.SEGURO_VEICULO]: 'VEICULAR',
      [DocumentType.MULTA]: 'VEICULAR',
      [DocumentType.LICENCIAMENTO]: 'VEICULAR',
      
      [DocumentType.EMPENHO]: 'GOVERNAMENTAL',
      [DocumentType.LIQUIDACAO]: 'GOVERNAMENTAL',
      [DocumentType.SOLICITACAO_COMPRA]: 'GOVERNAMENTAL',
      [DocumentType.ORDEM_SERVICO]: 'GOVERNAMENTAL',
      [DocumentType.LICITACAO]: 'GOVERNAMENTAL'
    };
    
    return categoryMap[type] || 'GENERICO';
  }

  private addFiscalInfo(parts: string[], info: DocumentInfo): void {
    // Para documentos fiscais: EMPRESA + NUMERO + VALOR
    if (info.companyName && info.companyName !== 'N/A') {
      parts.push(this.normalizeCompanyName(info.companyName));
    }
    
    if (info.documentNumber && info.documentNumber !== 'N/A') {
      parts.push(this.normalizeDocumentNumber(info.documentNumber));
    }
    
    if (info.additionalInfo?.value) {
      const value = this.normalizeValue(info.additionalInfo.value);
      if (value) parts.push(value);
    }
  }

  private addJuridicoInfo(parts: string[], info: DocumentInfo): void {
    // Para documentos jurídicos: PARTES + OBJETO + NUMERO
    if (info.parties && info.parties.length > 0) {
      const mainParty = this.normalizePartyName(info.parties[0]);
      if (mainParty) parts.push(mainParty);
    } else if (info.companyName && info.companyName !== 'N/A') {
      parts.push(this.normalizeCompanyName(info.companyName));
    }
    
    if (info.subject) {
      const subject = this.normalizeSubject(info.subject);
      if (subject) parts.push(subject);
    }
    
    if (info.documentNumber && info.documentNumber !== 'N/A') {
      parts.push(this.normalizeDocumentNumber(info.documentNumber));
    }
  }

  private addCorporativoInfo(parts: string[], info: DocumentInfo): void {
    // Para documentos corporativos: EMPRESA + DEPARTAMENTO + ASSUNTO
    if (info.companyName && info.companyName !== 'N/A') {
      parts.push(this.normalizeCompanyName(info.companyName));
    }
    
    if (info.additionalInfo?.department) {
      const dept = this.normalizeDepartment(info.additionalInfo.department);
      if (dept) parts.push(dept);
    }
    
    if (info.subject) {
      const subject = this.normalizeSubject(info.subject);
      if (subject) parts.push(subject);
    }
  }

  private addPessoalInfo(parts: string[], info: DocumentInfo): void {
    // Para documentos pessoais: NOME_PESSOA + NUMERO
    if (info.companyName && info.companyName !== 'N/A') {
      parts.push(this.normalizePersonName(info.companyName));
    }
    
    if (info.documentNumber && info.documentNumber !== 'N/A') {
      parts.push(this.normalizeDocumentNumber(info.documentNumber));
    }
  }

  private addAcademicoInfo(parts: string[], info: DocumentInfo): void {
    // Para documentos acadêmicos: PESSOA + CURSO + INSTITUICAO
    if (info.companyName && info.companyName !== 'N/A') {
      parts.push(this.normalizePersonName(info.companyName));
    }
    
    if (info.subject) {
      const course = this.normalizeCourse(info.subject);
      if (course) parts.push(course);
    }
    
    if (info.additionalInfo?.reference) {
      const institution = this.normalizeInstitution(info.additionalInfo.reference);
      if (institution) parts.push(institution);
    }
  }

  private addFinanceiroInfo(parts: string[], info: DocumentInfo): void {
    // Para documentos financeiros: EMPRESA + PERIODO + TIPO_RELATORIO
    if (info.companyName && info.companyName !== 'N/A') {
      parts.push(this.normalizeCompanyName(info.companyName));
    }
    
    if (info.additionalInfo?.category) {
      const category = this.normalizeCategory(info.additionalInfo.category);
      if (category) parts.push(category);
    }
  }

  private addTrabalhistaInfo(parts: string[], info: DocumentInfo): void {
    // Para documentos trabalhistas: EMPRESA + FUNCIONARIO + PERIODO
    if (info.companyName && info.companyName !== 'N/A') {
      parts.push(this.normalizeCompanyName(info.companyName));
    }
    
    if (info.parties && info.parties.length > 0) {
      const employee = this.normalizePersonName(info.parties[0]);
      if (employee) parts.push(employee);
    }
  }

  private addImobiliarioInfo(parts: string[], info: DocumentInfo): void {
    // Para documentos imobiliários: ENDERECO + PARTES + NUMERO
    if (info.location) {
      const location = this.normalizeLocation(info.location);
      if (location) parts.push(location);
    }
    
    if (info.parties && info.parties.length > 0) {
      const party = this.normalizePartyName(info.parties[0]);
      if (party) parts.push(party);
    }
    
    if (info.documentNumber && info.documentNumber !== 'N/A') {
      parts.push(this.normalizeDocumentNumber(info.documentNumber));
    }
  }

  private addVeicularInfo(parts: string[], info: DocumentInfo): void {
    // Para documentos veiculares: PROPRIETARIO + PLACA + NUMERO
    if (info.companyName && info.companyName !== 'N/A') {
      parts.push(this.normalizePersonName(info.companyName));
    }
    
    if (info.additionalInfo?.reference) {
      const plate = this.normalizePlate(info.additionalInfo.reference);
      if (plate) parts.push(plate);
    }
    
    if (info.documentNumber && info.documentNumber !== 'N/A') {
      parts.push(this.normalizeDocumentNumber(info.documentNumber));
    }
  }

  private addGovernamentalInfo(parts: string[], info: DocumentInfo): void {
    // Para documentos governamentais: ORGAO + NUMERO + OBJETO
    if (info.companyName && info.companyName !== 'N/A') {
      parts.push(this.normalizeCompanyName(info.companyName));
    }
    
    if (info.documentNumber && info.documentNumber !== 'N/A') {
      parts.push(this.normalizeDocumentNumber(info.documentNumber));
    }
    
    if (info.subject) {
      const subject = this.normalizeSubject(info.subject);
      if (subject) parts.push(subject);
    }
  }

  private addGenericInfo(parts: string[], info: DocumentInfo): void {
    // Para documentos genéricos: EMPRESA + NUMERO + ASSUNTO
    if (info.companyName && info.companyName !== 'N/A') {
      parts.push(this.normalizeCompanyName(info.companyName));
    }
    
    if (info.documentNumber && info.documentNumber !== 'N/A') {
      parts.push(this.normalizeDocumentNumber(info.documentNumber));
    }
    
    if (info.subject) {
      const subject = this.normalizeSubject(info.subject);
      if (subject) parts.push(subject);
    }
  }

  private addDateInfo(parts: string[], info: DocumentInfo): void {
    if (info.documentDate && info.documentDate !== 'N/A') {
      const datePart = info.documentDate.replace(/-/g, '');
      if (datePart.length === 8) {
        parts.push(datePart);
      }
    }
  }

  // Métodos de normalização específicos
  private normalizeForFileName(text: string): string {
    return text
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toUpperCase();
  }

  private normalizeCompanyName(name: string): string {
    return name
      .split(' ')
      .slice(0, 2) // Primeiras 2 palavras
      .join('_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toUpperCase()
      .substring(0, 15); // Máximo 15 caracteres
  }

  private normalizePersonName(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0]}_${parts[parts.length - 1]}`
        .replace(/[^a-zA-Z0-9_]/g, '')
        .toUpperCase()
        .substring(0, 12);
    }
    return name
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toUpperCase()
      .substring(0, 12);
  }

  private normalizeDocumentNumber(number: string): string {
    return number
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .substring(0, 10);
  }

  private normalizeSubject(subject: string): string {
    return subject
      .split(' ')
      .slice(0, 2)
      .join('_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toUpperCase()
      .substring(0, 12);
  }

  private normalizePartyName(party: string): string {
    return this.normalizePersonName(party);
  }

  private normalizeDepartment(dept: string): string {
    return dept
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toUpperCase()
      .substring(0, 8);
  }

  private normalizeCourse(course: string): string {
    return course
      .split(' ')
      .slice(0, 2)
      .join('_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toUpperCase()
      .substring(0, 10);
  }

  private normalizeInstitution(institution: string): string {
    return institution
      .split(' ')
      .slice(0, 1)
      .join('_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toUpperCase()
      .substring(0, 8);
  }

  private normalizeCategory(category: string): string {
    return category
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toUpperCase()
      .substring(0, 8);
  }

  private normalizeLocation(location: string): string {
    return location
      .split(' ')
      .slice(0, 2)
      .join('_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toUpperCase()
      .substring(0, 10);
  }

  private normalizePlate(plate: string): string {
    return plate
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .substring(0, 7);
  }

  private normalizeValue(value: string): string {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue.length > 0) {
      return `R${numericValue.substring(0, 6)}`;
    }
    return '';
  }

  private optimizeFileName(parts: string[], maxLength: number): string {
    let fileName = parts.filter(part => part && part.length > 0).join('_');
    
    // Se o nome for muito longo, encurtar partes
    if (fileName.length > maxLength) {
      const optimizedParts = parts.map((part, index) => {
        if (index === 0) return part; // Manter tipo do documento completo
        if (part.length > 8) return part.substring(0, 8);
        return part;
      });
      
      fileName = optimizedParts.filter(part => part && part.length > 0).join('_');
      
      // Se ainda for muito longo, truncar
      if (fileName.length > maxLength) {
        fileName = fileName.substring(0, maxLength);
      }
    }
    
    return fileName || this.getDefaultName({ name: 'documento' } as File);
  }
}
