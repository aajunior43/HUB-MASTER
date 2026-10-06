/** Item de linha no arquivo de lote (parse). */
export interface BatchItem {
  codigoItem?: string;
  item: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

/** Alias usado pelo hook de processamento de lote. */
export type BatchRequestItem = BatchItem;

/** Solicitação parseada do arquivo (ainda sem id/totais). */
export interface BatchRequestInput {
  solicitante: string;
  empresa: string;
  observacoes: string;
  items: BatchItem[];
}

/** @deprecated use BatchRequestInput — mantido para imports existentes */
export type BatchRequest = BatchRequestInput;

export interface ParseLineResult {
  line: number;
  error: string;
  data?: BatchRequest;
}

const EXPECTED_FIELDS = 4;
const MIN_ITEM_PARTS = 4;

/** Faz o parse de um trecho "NOME:DESCRIÇÃO:QTD:VALOR" preservando ':' na descrição. */
const parseItem = (raw: string): BatchItem | string => {
  const parts = raw.trim().split(':');
  if (parts.length < MIN_ITEM_PARTS) {
    return `Item inválido: "${raw}". Esperado formato NOME:DESCRIÇÃO:QTD:VALOR`;
  }

  const item = parts[0].trim();
  const valorStr = parts[parts.length - 1].trim();
  const qtdStr = parts[parts.length - 2].trim();
  const descricao = parts.slice(1, parts.length - 2).join(':').trim();

  if (!item || !descricao) {
    return `Item com nome ou descrição vazia: "${raw}"`;
  }

  const quantidade = parseInt(qtdStr, 10);
  if (isNaN(quantidade) || quantidade <= 0) {
    return `Quantidade inválida no item "${item}": "${qtdStr}"`;
  }

  const valorUnitario = parseFloat(valorStr.replace(',', '.'));
  if (isNaN(valorUnitario) || valorUnitario < 0) {
    return `Valor unitário inválido no item "${item}": "${valorStr}"`;
  }

  return { item, descricao, quantidade, valorUnitario };
};

const parseLine = (rawLine: string, lineNumber: number): ParseLineResult => {
  const parts = rawLine.split('|');
  if (parts.length !== EXPECTED_FIELDS) {
    return {
      line: lineNumber,
      error: `Formato inválido. Esperado ${EXPECTED_FIELDS} campos separados por |, encontrados ${parts.length}`,
    };
  }

  const [solicitante, empresa, observacoes, itemsStr] = parts.map(p => p.trim());
  if (!solicitante) return { line: lineNumber, error: 'Nome do solicitante é obrigatório' };
  if (!empresa) return { line: lineNumber, error: 'Nome da empresa é obrigatório' };

  const items: BatchItem[] = [];
  if (itemsStr) {
    for (const raw of itemsStr.split(';')) {
      const parsed = parseItem(raw);
      if (typeof parsed === 'string') {
        return { line: lineNumber, error: parsed };
      }
      items.push(parsed);
    }
  }

  if (items.length === 0) {
    return { line: lineNumber, error: 'Nenhum item válido encontrado' };
  }

  return {
    line: lineNumber,
    error: '',
    data: { solicitante, empresa, observacoes: observacoes || '', items },
  };
};

/** Processa o conteúdo completo de um arquivo .txt de solicitações em lote. */
export const parseBatchFile = (content: string): ParseLineResult[] => {
  const results: ParseLineResult[] = [];
  content.split('\n').forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    try {
      results.push(parseLine(trimmed, index + 1));
    } catch (error) {
      results.push({
        line: index + 1,
        error: `Erro ao processar linha: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      });
    }
  });
  return results;
};
