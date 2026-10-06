export enum DocumentType {
  // FISCAIS
  NOTA_FISCAL = 'Nota Fiscal',
  NOTA_FISCAL_ELETRONICA = 'Nota Fiscal Eletrônica',
  CUPOM_FISCAL = 'Cupom Fiscal',
  RECIBO = 'Recibo',
  FATURA = 'Fatura',
  BOLETO = 'Boleto',
  COMPROVANTE_PAGAMENTO = 'Comprovante Pagamento',
  
  // JURÍDICOS
  CONTRATO = 'Contrato',
  PROCURACAO = 'Procuração',
  PETICAO = 'Petição',
  CERTIDAO = 'Certidão',
  ESCRITURA = 'Escritura',
  ALVARA = 'Alvará',
  LICENCA = 'Licença',
  
  // CORPORATIVOS
  RELATORIO = 'Relatório',
  ATA = 'Ata',
  MEMORANDO = 'Memorando',
  OFICIO = 'Ofício',
  POLITICA = 'Política',
  PROCEDIMENTO = 'Procedimento',
  MANUAL = 'Manual',
  
  // PESSOAIS
  RG = 'RG',
  CPF = 'CPF',
  CNH = 'CNH',
  COMPROVANTE_RESIDENCIA = 'Comprovante Residência',
  TITULO_ELEITOR = 'Título Eleitor',
  PASSAPORTE = 'Passaporte',
  
  // ACADÊMICOS
  DIPLOMA = 'Diploma',
  CERTIFICADO = 'Certificado',
  HISTORICO = 'Histórico',
  DECLARACAO = 'Declaração',
  ATESTADO = 'Atestado',
  
  // FINANCEIROS
  EXTRATO = 'Extrato',
  DEMONSTRATIVO = 'Demonstrativo',
  BALANCO = 'Balanço',
  DRE = 'DRE',
  FLUXO_CAIXA = 'Fluxo Caixa',
  
  // TRABALHISTAS
  CONTRATO_TRABALHO = 'Contrato Trabalho',
  HOLERITE = 'Holerite',
  CTPS = 'CTPS',
  ATESTADO_MEDICO = 'Atestado Médico',
  FERIAS = 'Férias',
  
  // IMOBILIÁRIOS
  ESCRITURA_IMOVEL = 'Escritura Imóvel',
  IPTU = 'IPTU',
  CONDOMINIO = 'Condomínio',
  LOCACAO = 'Locação',
  VENDA_IMOVEL = 'Venda Imóvel',
  FINANCIAMENTO = 'Financiamento',
  
  // VEICULARES
  CRLV = 'CRLV',
  IPVA = 'IPVA',
  SEGURO_VEICULO = 'Seguro Veículo',
  MULTA = 'Multa',
  LICENCIAMENTO = 'Licenciamento',
  
  // GOVERNAMENTAIS
  EMPENHO = 'Empenho',
  LIQUIDACAO = 'Liquidação',
  SOLICITACAO_COMPRA = 'Solicitação Compra',
  ORDEM_SERVICO = 'Ordem Serviço',
  LICITACAO = 'Licitação',
  
  // OUTROS
  OUTROS = 'Outros'
}

export interface DocumentInfo {
  type: DocumentType;
  companyName: string;
  documentDate: string;
  documentNumber: string;
  subject?: string;
  parties?: string[];
  location?: string;
  additionalInfo?: {
    value?: string;
    description?: string;
    department?: string;
    status?: string;
    dueDate?: string;
    reference?: string;
    category?: string;
    urgency?: string;
    keywords?: string[];
  };
  confidence: number; // 0-100, confiança na extração dos dados
}

export interface DocumentAnalysisResult {
  documentInfo: DocumentInfo;
  suggestedFileName: string;
  extractionTime: number;
  rawText?: string;
}

export interface DocumentDisplayConfig {
  showConfidence: boolean;
  showAdditionalInfo: boolean;
  animationEnabled: boolean;
  compactMode: boolean;
}