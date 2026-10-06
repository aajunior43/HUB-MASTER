import { logger } from '@/utils/logger';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'fiscal' | 'juridico' | 'corporativo' | 'pessoal' | 'academico' | 'geral';
  fileTypes: string[];
  prompt: string;
  isDefault: boolean;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

class PromptTemplateService {
  private static instance: PromptTemplateService;
  private templates: PromptTemplate[] = [];
  private storageKey = 'prompt_templates';
  private usageStatsKey = 'template_usage_stats';

  private constructor() {
    this.loadTemplates();
    this.initializeDefaultTemplates();
  }

  static getInstance(): PromptTemplateService {
    if (!PromptTemplateService.instance) {
      PromptTemplateService.instance = new PromptTemplateService();
    }
    return PromptTemplateService.instance;
  }

  /**
   * Obtém todas as categorias disponíveis
   */
  getCategories(): TemplateCategory[] {
    return [
      {
        id: 'fiscal',
        name: 'Documentos Fiscais',
        description: 'Notas fiscais, recibos, comprovantes de pagamento',
        icon: '🧾',
        color: 'bg-green-100 text-green-800'
      },
      {
        id: 'juridico',
        name: 'Documentos Jurídicos',
        description: 'Contratos, certidões, procurações, petições',
        icon: '⚖️',
        color: 'bg-blue-100 text-blue-800'
      },
      {
        id: 'corporativo',
        name: 'Documentos Corporativos',
        description: 'Relatórios, apresentações, memorandos',
        icon: '🏢',
        color: 'bg-purple-100 text-purple-800'
      },
      {
        id: 'pessoal',
        name: 'Documentos Pessoais',
        description: 'RG, CPF, comprovantes de residência',
        icon: '👤',
        color: 'bg-orange-100 text-orange-800'
      },
      {
        id: 'academico',
        name: 'Documentos Acadêmicos',
        description: 'Diplomas, certificados, históricos escolares',
        icon: '🎓',
        color: 'bg-indigo-100 text-indigo-800'
      },
      {
        id: 'geral',
        name: 'Uso Geral',
        description: 'Templates genéricos para qualquer tipo de documento',
        icon: '📄',
        color: 'bg-gray-100 text-gray-800'
      }
    ];
  }

  /**
   * Obtém todos os templates
   */
  getAllTemplates(): PromptTemplate[] {
    return [...this.templates].sort((a, b) => {
      // Ordenar por: padrão primeiro, depois por uso, depois por nome
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1;
      }
      if (a.usageCount !== b.usageCount) {
        return b.usageCount - a.usageCount;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Obtém templates por categoria
   */
  getTemplatesByCategory(category: string): PromptTemplate[] {
    return this.templates
      .filter(template => template.category === category)
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) {
          return a.isDefault ? -1 : 1;
        }
        return b.usageCount - a.usageCount;
      });
  }

  /**
   * Obtém um template por ID
   */
  getTemplate(id: string): PromptTemplate | null {
    return this.templates.find(template => template.id === id) || null;
  }

  /**
   * Obtém templates recomendados para um tipo de arquivo
   */
  getRecommendedTemplates(fileType: string): PromptTemplate[] {
    return this.templates
      .filter(template => 
        template.fileTypes.includes(fileType.toLowerCase()) || 
        template.fileTypes.includes('all')
      )
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) {
          return a.isDefault ? -1 : 1;
        }
        return b.usageCount - a.usageCount;
      })
      .slice(0, 5);
  }

  /**
   * Cria um novo template personalizado
   */
  createTemplate(templateData: Omit<PromptTemplate, 'id' | 'isDefault' | 'isCustom' | 'createdAt' | 'updatedAt' | 'usageCount'>): PromptTemplate {
    const newTemplate: PromptTemplate = {
      ...templateData,
      id: this.generateId(),
      isDefault: false,
      isCustom: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    };

    this.templates.push(newTemplate);
    this.saveTemplates();

    logger.info('Template personalizado criado', {
      templateId: newTemplate.id,
      name: newTemplate.name,
      category: newTemplate.category
    });

    return newTemplate;
  }

  /**
   * Atualiza um template existente
   */
  updateTemplate(id: string, updates: Partial<Omit<PromptTemplate, 'id' | 'isDefault' | 'createdAt' | 'usageCount'>>): PromptTemplate | null {
    const templateIndex = this.templates.findIndex(template => template.id === id);
    if (templateIndex === -1) {
      return null;
    }

    const template = this.templates[templateIndex];
    
    // Não permitir edição de templates padrão
    if (template.isDefault) {
      throw new Error('Templates padrão não podem ser editados');
    }

    this.templates[templateIndex] = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    this.saveTemplates();

    logger.info('Template atualizado', {
      templateId: id,
      updates: Object.keys(updates)
    });

    return this.templates[templateIndex];
  }

  /**
   * Remove um template personalizado
   */
  deleteTemplate(id: string): boolean {
    const templateIndex = this.templates.findIndex(template => template.id === id);
    if (templateIndex === -1) {
      return false;
    }

    const template = this.templates[templateIndex];
    
    // Não permitir remoção de templates padrão
    if (template.isDefault) {
      throw new Error('Templates padrão não podem ser removidos');
    }

    this.templates.splice(templateIndex, 1);
    this.saveTemplates();

    logger.info('Template removido', {
      templateId: id,
      name: template.name
    });

    return true;
  }

  /**
   * Registra o uso de um template
   */
  recordUsage(templateId: string): void {
    const template = this.templates.find(t => t.id === templateId);
    if (template) {
      template.usageCount++;
      template.updatedAt = new Date();
      this.saveTemplates();
      
      logger.info('Uso de template registrado', {
        templateId,
        name: template.name,
        usageCount: template.usageCount
      });
    }
  }

  /**
   * Duplica um template existente
   */
  duplicateTemplate(id: string, newName?: string): PromptTemplate | null {
    const originalTemplate = this.getTemplate(id);
    if (!originalTemplate) {
      return null;
    }

    const duplicatedTemplate = this.createTemplate({
      name: newName || `${originalTemplate.name} (Cópia)`,
      description: originalTemplate.description,
      category: originalTemplate.category,
      fileTypes: [...originalTemplate.fileTypes],
      prompt: originalTemplate.prompt
    });

    logger.info('Template duplicado', {
      originalId: id,
      duplicatedId: duplicatedTemplate.id,
      newName: duplicatedTemplate.name
    });

    return duplicatedTemplate;
  }

  /**
   * Exporta templates personalizados
   */
  exportCustomTemplates(): string {
    const customTemplates = this.templates.filter(template => template.isCustom);
    const exportData = {
      templates: customTemplates,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Importa templates personalizados
   */
  importTemplates(jsonData: string): { imported: number; skipped: number; errors: string[] } {
    const result = { imported: 0, skipped: 0, errors: [] as string[] };

    try {
      const data = JSON.parse(jsonData);
      
      if (!data.templates || !Array.isArray(data.templates)) {
        throw new Error('Formato de arquivo inválido');
      }

      for (const templateData of data.templates) {
        try {
          // Verificar se já existe um template com o mesmo nome
          const existingTemplate = this.templates.find(t => t.name === templateData.name);
          if (existingTemplate) {
            result.skipped++;
            continue;
          }

          // Criar novo template
          this.createTemplate({
            name: templateData.name,
            description: templateData.description || '',
            category: templateData.category || 'geral',
            fileTypes: templateData.fileTypes || ['all'],
            prompt: templateData.prompt
          });

          result.imported++;
        } catch (error) {
          result.errors.push(`Erro ao importar template "${templateData.name}": ${error}`);
        }
      }

      logger.info('Templates importados', {
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors.length
      });

    } catch (error) {
      result.errors.push(`Erro ao processar arquivo: ${error}`);
    }

    return result;
  }

  /**
   * Obtém estatísticas de uso dos templates
   */
  getUsageStatistics() {
    const totalTemplates = this.templates.length;
    const customTemplates = this.templates.filter(t => t.isCustom).length;
    const defaultTemplates = this.templates.filter(t => t.isDefault).length;
    const totalUsage = this.templates.reduce((sum, t) => sum + t.usageCount, 0);
    
    const categoryStats = this.getCategories().map(category => {
      const categoryTemplates = this.getTemplatesByCategory(category.id);
      const categoryUsage = categoryTemplates.reduce((sum, t) => sum + t.usageCount, 0);
      
      return {
        category: category.name,
        templates: categoryTemplates.length,
        usage: categoryUsage
      };
    });

    const mostUsedTemplate = this.templates.reduce((prev, current) => 
      (prev.usageCount > current.usageCount) ? prev : current
    );

    return {
      totalTemplates,
      customTemplates,
      defaultTemplates,
      totalUsage,
      categoryStats,
      mostUsedTemplate: mostUsedTemplate ? {
        name: mostUsedTemplate.name,
        usageCount: mostUsedTemplate.usageCount
      } : null
    };
  }

  private generateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveTemplates(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.templates));
    } catch (error) {
      logger.error('Erro ao salvar templates no localStorage', { error });
    }
  }

  private loadTemplates(): void {
    try {
      const templatesData = localStorage.getItem(this.storageKey);
      if (templatesData) {
        this.templates = JSON.parse(templatesData).map((template: any) => ({
          ...template,
          createdAt: new Date(template.createdAt),
          updatedAt: new Date(template.updatedAt)
        }));
      }
    } catch (error) {
      logger.error('Erro ao carregar templates do localStorage', { error });
      this.templates = [];
    }
  }

  private initializeDefaultTemplates(): void {
    // Verificar se os templates padrão já foram inicializados
    const hasDefaultTemplates = this.templates.some(template => template.isDefault);
    if (hasDefaultTemplates) {
      return;
    }

    const defaultTemplates: Omit<PromptTemplate, 'id' | 'isCustom' | 'createdAt' | 'updatedAt' | 'usageCount'>[] = [
      {
        name: 'Documentos Fiscais - Geral',
        description: 'Template otimizado para notas fiscais, recibos e comprovantes de pagamento',
        category: 'fiscal',
        fileTypes: ['pdf', 'image', 'all'],
        isDefault: true,
        prompt: `ANALISE este documento fiscal [FILETYPE] e crie um nome profissional baseado no conteúdo.

📋 INSTRUÇÕES ESPECÍFICAS PARA DOCUMENTOS FISCAIS:
- Identifique: TIPO_DOCUMENTO_EMPRESA_NUMERO_DATA
- Máximo 60 caracteres
- SEMPRE EM MAIÚSCULAS
- Use underscores para separar

🔍 PROCURE ESPECIFICAMENTE:
1. Tipo: NOTA_FISCAL, RECIBO, COMPROVANTE_PAGAMENTO, CUPOM_FISCAL
2. Nome da empresa emissora
3. Número do documento
4. Data de emissão
5. Valor (se relevante)

📄 PADRÕES ESPERADOS:
- NOTA_FISCAL_EMPRESA_ABC_001234_20240315
- RECIBO_SERVICOS_TECH_LTDA_R001_20240315
- COMPROVANTE_PIX_BANCO_XYZ_20240315

RESPONDA APENAS COM O NOME EM MAIÚSCULAS.`
      },
      {
        name: 'Contratos e Documentos Jurídicos',
        description: 'Template para contratos, certidões e documentos legais',
        category: 'juridico',
        fileTypes: ['pdf', 'word', 'all'],
        isDefault: true,
        prompt: `ANALISE este documento jurídico [FILETYPE] e crie um nome profissional.

📋 INSTRUÇÕES PARA DOCUMENTOS JURÍDICOS:
- Formato: TIPO_DOCUMENTO_PARTES_DATA
- Máximo 60 caracteres
- SEMPRE EM MAIÚSCULAS

🔍 IDENTIFIQUE:
1. Tipo: CONTRATO, CERTIDAO, PROCURACAO, ESCRITURA, PETICAO
2. Partes envolvidas (pessoas/empresas)
3. Objeto do documento
4. Data de assinatura/emissão

📄 EXEMPLOS:
- CONTRATO_LOCACAO_JOAO_SILVA_20240315
- CERTIDAO_NASCIMENTO_MARIA_SANTOS_20240315
- PROCURACAO_EMPRESA_ABC_ADVOGADO_XYZ_20240315

RESPONDA APENAS COM O NOME EM MAIÚSCULAS.`
      },
      {
        name: 'Relatórios Corporativos',
        description: 'Template para relatórios empresariais e documentos corporativos',
        category: 'corporativo',
        fileTypes: ['pdf', 'word', 'all'],
        isDefault: true,
        prompt: `ANALISE este documento corporativo [FILETYPE] e crie um nome profissional.

📋 INSTRUÇÕES PARA DOCUMENTOS CORPORATIVOS:
- Formato: TIPO_PERIODO_DEPARTAMENTO_ANO
- Máximo 60 caracteres
- SEMPRE EM MAIÚSCULAS

🔍 IDENTIFIQUE:
1. Tipo: RELATORIO, APRESENTACAO, MEMORANDO, ATA, POLITICA
2. Período: MENSAL, TRIMESTRAL, ANUAL, SEMESTRAL
3. Departamento/Área
4. Ano de referência

📄 EXEMPLOS:
- RELATORIO_MENSAL_VENDAS_2024
- APRESENTACAO_RESULTADOS_Q1_2024
- MEMORANDO_RH_POLITICA_FERIAS_2024

RESPONDA APENAS COM O NOME EM MAIÚSCULAS.`
      },
      {
        name: 'Documentos Pessoais',
        description: 'Template para RG, CPF, comprovantes de residência e documentos pessoais',
        category: 'pessoal',
        fileTypes: ['pdf', 'image', 'all'],
        isDefault: true,
        prompt: `ANALISE este documento pessoal [FILETYPE] e crie um nome profissional.

📋 INSTRUÇÕES PARA DOCUMENTOS PESSOAIS:
- Formato: TIPO_DOCUMENTO_NOME_DATA
- Máximo 60 caracteres
- SEMPRE EM MAIÚSCULAS

🔍 IDENTIFIQUE:
1. Tipo: RG, CPF, CNH, COMPROVANTE_RESIDENCIA, TITULO_ELEITOR
2. Nome da pessoa
3. Data de emissão/validade

📄 EXEMPLOS:
- RG_JOAO_SILVA_20240315
- CPF_MARIA_SANTOS_20240315
- COMPROVANTE_RESIDENCIA_PEDRO_OLIVEIRA_20240315

RESPONDA APENAS COM O NOME EM MAIÚSCULAS.`
      },
      {
        name: 'Certificados Acadêmicos',
        description: 'Template para diplomas, certificados e documentos educacionais',
        category: 'academico',
        fileTypes: ['pdf', 'image', 'all'],
        isDefault: true,
        prompt: `ANALISE este documento acadêmico [FILETYPE] e crie um nome profissional.

📋 INSTRUÇÕES PARA DOCUMENTOS ACADÊMICOS:
- Formato: TIPO_CURSO_INSTITUICAO_ANO
- Máximo 60 caracteres
- SEMPRE EM MAIÚSCULAS

🔍 IDENTIFIQUE:
1. Tipo: DIPLOMA, CERTIFICADO, HISTORICO, DECLARACAO
2. Nome do curso/programa
3. Instituição de ensino
4. Ano de conclusão/emissão

📄 EXEMPLOS:
- DIPLOMA_ENGENHARIA_CIVIL_UFMG_2024
- CERTIFICADO_CURSO_PYTHON_UDEMY_2024
- HISTORICO_ESCOLAR_ENSINO_MEDIO_2024

RESPONDA APENAS COM O NOME EM MAIÚSCULAS.`
      },
      {
        name: 'Template Geral Inteligente',
        description: 'Template versátil para qualquer tipo de documento',
        category: 'geral',
        fileTypes: ['all'],
        isDefault: true,
        prompt: `ANALISE DETALHADAMENTE este documento [FILETYPE] e crie um nome profissional baseado no conteúdo.

📋 INSTRUÇÕES GERAIS:
- Nome ESPECÍFICO e DESCRITIVO
- Máximo 60 caracteres
- SEMPRE EM MAIÚSCULAS
- Use underscores para separar palavras

🔍 ANÁLISE INTELIGENTE:
1. IDENTIFIQUE o tipo de documento
2. EXTRAIA informações-chave (nomes, datas, números)
3. DETERMINE o contexto (fiscal, jurídico, pessoal, etc.)
4. CRIE um nome que facilite a localização futura

📄 ESTRUTURA SUGERIDA:
TIPO_DOCUMENTO_DETALHES_RELEVANTES_DATA

⚠️ IMPORTANTE:
- Use informações visíveis no documento
- Seja específico mas conciso
- Mantenha consistência na nomenclatura

RESPONDA APENAS COM O NOME EM MAIÚSCULAS.`
      }
    ];

    // Adicionar templates padrão
    for (const templateData of defaultTemplates) {
      const template: PromptTemplate = {
        ...templateData,
        id: this.generateId(),
        isCustom: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0
      };
      
      this.templates.push(template);
    }

    this.saveTemplates();
    
    logger.info('Templates padrão inicializados', {
      count: defaultTemplates.length
    });
  }
}

export const promptTemplateService = PromptTemplateService.getInstance();
export default promptTemplateService;