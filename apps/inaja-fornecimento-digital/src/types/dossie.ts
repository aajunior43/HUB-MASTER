export type DiagnosticoRisco = {
  nivelRisco: "BAIXO" | "MEDIO" | "ALTO";
  status: string;
  apto: boolean;
  pontosAtencao: string[];
  pontosPositivos: string[];
};

export type TcuCertidao = {
  emissor: string;
  tipo: string;
  descricao: string;
  situacao: string;
  dataEmissao: string;
  observacao: string;
  link: string;
};

export type TcuInidoneo = {
  nome: string;
  registro: string;
  processo: string;
  acordo: string;
  dataAcordao: string;
  transitoEmJulgado: string;
  fimSancao: string;
  municipio: string;
  uf: string;
  linkProcesso: string;
  linkDeliberacao: string;
};

export type SancaoPortal = {
  cadastro: string;
  id: string;
  nome: string;
  cnpj: string | null;
  processo: string;
  tipo: string;
  fonte: string;
  fundamentacao: string;
  orgaoSancionador: string;
  situacao: string;
  dataInicio: string;
  dataFim: string;
  valor: number;
};

export type ContratoPortal = {
  id: string;
  numero: string;
  objeto: string;
  fornecedor: string;
  cnpjFornecedor: string | null;
  orgao: string;
  situacao: string;
  valor: number;
  dataAssinatura: string;
  inicioVigencia: string;
  fimVigencia: string;
};

export type PncpItemDossie = {
  id: string;
  tipo: string;
  chave_pncp: string;
  titulo: string | null;
  objeto: string | null;
  numero: string | null;
  ano: number | null;
  processo: string | null;
  modalidade: string | null;
  situacao: string | null;
  valor: number;
  fornecedor_nome: string | null;
  data_publicacao: string | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  url: string | null;
};

export type EmpenhoItemDossie = {
  id: string;
  numero_empenho: string;
  ano_empenho: number;
  tipo_empenho: string;
  modalidade: string;
  data: string;
  especificacao: string;
  valor_empenhado_bruto: number;
  valor_liquidado_bruto: number;
  saldo_pagar: number;
  nome_credor: string;
  id_credor: string;
};

export type CredorFixoDossie = {
  id: string;
  nome: string;
  documento: string;
  departamento: string;
  valor_mensal: number;
  tipo_valor: string;
  descricao: string;
  email: string | null;
  solicitacao: string | null;
  pagamento: string | null;
  obs: string | null;
};

export type DadosCadastraisRfb = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao: string;
  data_situacao: string;
  data_abertura: string;
  natureza_juridica: string;
  capital_social: string;
  porte: string;
  simples: string;
  mei: string;
  matriz: string;
  endereco: string;
  cnae_principal: string;
  cnaes_secundarios: string[];
  socios: { nome: string; qualificacao: string }[];
  telefones: string[];
  emails: string[];
  fonte: string;
};

export type DossieFornecedorData = {
  cnpj: string;
  cnpjFormatado: string;
  geradoEm: string;
  diagnostico: DiagnosticoRisco;
  cadastral?: DadosCadastraisRfb | null;
  transparencia: {
    disponivel?: boolean;
    consultadoEm: string;
    tcu: {
      disponivel: boolean;
      consolidada: { razaoSocial: string; nomeFantasia: string; cnpj: string; uf: string } | null;
      certidoes: TcuCertidao[];
      inidoneos: TcuInidoneo[];
      erros: string[];
    };
    portal: {
      configurado: boolean;
      ceis: SancaoPortal[];
      cnep: SancaoPortal[];
      contratos: ContratoPortal[];
      erros: string[];
    };
    resumo: {
      status: "regular" | "alerta" | "parcial" | "indisponivel";
      tcuOcorrencias: number;
      portalOcorrencias: number;
      totalOcorrencias: number;
      certidoesComOcorrencia: number;
      portalConfigurado: boolean;
      fontesComErro: number;
      mensagem: string;
    };
    fontes: {
      tcuCertidoes: string;
      tcuInidoneos: string;
      portalSancoes: string;
      portalContratos: string;
    };
  };
  pncp: {
    total: number;
    valorTotal: number;
    registros: PncpItemDossie[];
  };
  municipio: {
    totalEmpenhos: number;
    totalEmpenhado: number;
    totalLiquidado: number;
    totalPago: number;
    saldoPagar: number;
    primeiroAno: number | null;
    ultimoAno: number | null;
    anos: number[];
    ultimosEmpenhos: EmpenhoItemDossie[];
    credorFixo: CredorFixoDossie | null;
  };
  linksUteisCertidoes?: {
    cndt?: string;
    fgts?: string;
    cndFederal?: string;
    cnjImprobidade?: string;
  };
};
