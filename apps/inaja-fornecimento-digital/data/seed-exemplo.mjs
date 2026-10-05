/**
 * Seed de dados de exemplo para as novas tabelas.
 * Uso: node data/seed-exemplo.mjs
 */
import { openDatabase } from "../server/db.mjs";
import { randomUUID } from "node:crypto";

const db = openDatabase();

function ins(tabela, dados) {
  const keys = Object.keys(dados);
  const sql = `INSERT OR IGNORE INTO ${tabela} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`;
  db.prepare(sql).run(...keys.map(k => dados[k]));
}

const now = () => new Date().toISOString().slice(0, 10);

// ── RPAs ────────────────────────────────────────────────────────────
console.log("📄 Inserindo RPAs...");
ins("rpas", {
  id: randomUUID(), numero_rpa: "001/2026",
  nome_prestador: "Carlos Alberto dos Santos", cpf_prestador: "12345678901",
  endereco_prestador: "Rua das Flores, 123 - Centro, Inajá/PR",
  descricao_servico: "Prestação de serviços de consultoria jurídica",
  periodo_referencia: "Janeiro/2026", carga_horaria: "40h mensais",
  local_execucao: "Sede da Prefeitura",
  valor_bruto: 5000.00, num_dependentes: 2, pensao_alimenticia: 0,
  inss: 550.00, iss: 250.00,
  deducao_dependentes: 379.18, base_calculo_irrf: 3870.82,
  aliquota_irrf: 15, parcela_deduzir_irrf: 381.44,
  irrf: 199.18, valor_liquido: 4000.82,
  observacoes: "Referente ao mês de janeiro de 2026",
  data_emissao: "2026-01-31",
});

ins("rpas", {
  id: randomUUID(), numero_rpa: "002/2026",
  nome_prestador: "Maria Aparecida Oliveira", cpf_prestador: "98765432100",
  endereco_prestador: "Av. Brasil, 456 - Jardim América, Inajá/PR",
  descricao_servico: "Serviços de limpeza e conservação predial",
  periodo_referencia: "Fevereiro/2026", carga_horaria: "80h mensais",
  local_execucao: "Secretaria de Educação",
  valor_bruto: 2200.00, num_dependentes: 1, pensao_alimenticia: 500.00,
  inss: 242.00, iss: 110.00,
  deducao_dependentes: 189.59, base_calculo_irrf: 1148.41,
  aliquota_irrf: 0, parcela_deduzir_irrf: 0,
  irrf: 0, valor_liquido: 1348.00,
  observacoes: "Isento de IRRF",
  data_emissao: "2026-02-28",
});

ins("rpas", {
  id: randomUUID(), numero_rpa: "003/2026",
  nome_prestador: "João Pereira da Silva", cpf_prestador: "45678912300",
  descricao_servico: "Serviço de manutenção elétrica predial",
  periodo_referencia: "Janeiro/2026",
  valor_bruto: 3500.00, num_dependentes: 3,
  inss: 385.00, iss: 175.00,
  valor_liquido: 2940.00,
  data_emissao: "2026-01-31",
});

// ── CALENDÁRIO ──────────────────────────────────────────────────────
console.log("📅 Inserindo eventos no calendário...");
const eventos = [
  { data: "2026-01-15", tipo: "PAYMENT", texto: "Pagamento dos servidores municipais", descricao: "Folha de pagamento referente a dezembro/2025" },
  { data: "2026-01-20", tipo: "COMMITMENT", texto: "Reunião Câmara de Vereadores", descricao: "Apresentação do orçamento anual" },
  { data: "2026-01-25", tipo: "PAYMENT", texto: "Vencimento ISS - Empresas", descricao: "Prazo para pagamento do ISS" },
  { data: "2026-02-02", tipo: "NOTE", texto: "Início do ano letivo", descricao: "Abertura do ano escolar municipal" },
  { data: "2026-02-10", tipo: "PAYMENT", texto: "Pagamento fornecedores", descricao: "Empenhos de janeiro" },
  { data: "2026-02-14", tipo: "HOLIDAY", texto: "Carnaval", descricao: "Ponto facultativo" },
  { data: "2026-02-15", tipo: "PAYMENT", texto: "Vencimento IPTU - 1ª parcela", descricao: "Primeira parcela do IPTU 2026" },
  { data: "2026-03-01", tipo: "PAYMENT", texto: "Vencimento Folha", descricao: "Folha de fevereiro" },
  { data: "2026-03-15", tipo: "COMMITMENT", texto: "Entrega relatório fiscal", descricao: "SIAFIC - relatório mensal" },
  { data: "2026-03-20", tipo: "HOLIDAY", texto: "Aniversário da Cidade", descricao: "Feriado municipal" },
  { data: "2026-04-01", tipo: "NOTE", texto: "Prazo declaração IRPF", descricao: "Início do prazo para declaração" },
  { data: "2026-04-15", tipo: "PAYMENT", texto: "Repasse FPM", descricao: "Fundo de Participação dos Municípios" },
  { data: "2026-04-21", tipo: "HOLIDAY", texto: "Tiradentes", descricao: "Feriado nacional" },
  { data: "2026-05-01", tipo: "HOLIDAY", texto: "Dia do Trabalho", descricao: "Feriado nacional" },
  { data: "2026-06-15", tipo: "PAYMENT", texto: "Parcelamento precatórios", descricao: "Quota mensal" },
];
for (const ev of eventos) {
  ins("calendario_eventos", { id: randomUUID(), ...ev });
}
ins("calendario_regras", { chave: "dia_pagamento", valor: "15" });

// ── PRAZOS ──────────────────────────────────────────────────────────
console.log("⏰ Inserindo prazos...");
const prazos = [
  { titulo: "Entrega declaração DCTFWeb", descricao: "Obrigação fiscal mensal", data_limite: "2026-02-15", categoria: "fiscal" },
  { titulo: "Envio SIAFIC mensal", descricao: "Sistema de informações fiscais", data_limite: "2026-02-20", categoria: "fiscal" },
  { titulo: "Vencimento contrato limpeza", descricao: "Contrato 015/2025 - Empresa Limpeza Total Ltda", data_limite: "2026-03-01", categoria: "contrato" },
  { titulo: "Prestação de contas - PDE", descricao: "Programa Dinheiro Direto na Escola", data_limite: "2026-03-10", categoria: "educacao" },
  { titulo: "Validade ata registro preço", descricao: "Ata 003/2025 - Material de escritório", data_limite: "2026-04-15", categoria: "licitacao" },
  { titulo: "Vencimento INSS mensal", descricao: "GPS - competência janeiro", data_limite: "2026-02-20", categoria: "fiscal" },
  { titulo: "Relatório saúde - SIOPS", descricao: "Sistema de Informações sobre Orçamentos Públicos em Saúde", data_limite: "2026-03-30", categoria: "saude" },
  { titulo: "Obras - medição 1º trimestre", descricao: "Medição de obra da Creche Jardim América", data_limite: "2026-04-05", categoria: "obra" },
];
for (const p of prazos) {
  ins("prazos", { id: randomUUID(), ...p, resolvido: p.data_limite < "2026-02-01" ? 1 : 0 });
}

// ── MURAL ───────────────────────────────────────────────────────────
console.log("📌 Inserindo recados no mural...");
const muralId1 = randomUUID();
ins("mural_recados", {
  id: muralId1, titulo: "Aviso: Reforma da Secretaria", conteudo: "Informamos que a Secretaria Municipal de Educação passará por reforma a partir do dia 01/03. O atendimento será temporariamente na Rua XV de Novembro, 200.",
  autor: "ALEKSANDRO", destinatario: "Todos", prioridade: "alta", status: "a_fazer", cor: "blue",
});
const muralId2 = randomUUID();
ins("mural_recados", {
  id: muralId2, titulo: "Lembrete: Entrega de relatórios", conteudo: "Todos os setores devem entregar os relatórios mensais até o dia 10 de cada mês.",
  autor: "LUANA", destinatario: "Todos", prioridade: "media", status: "concluido", cor: "green",
});
ins("mural_comentarios", { id: randomUUID(), recado_id: muralId2, autor: "MAICON", texto: "Ok, já estou providenciando o da saúde." });

// ── AUTENTIQUE - Contatos ────────────────────────────────────────────
console.log("📝 Inserindo contatos Autentique...");
const contatos = [
  { nome: "João Silva", phone: "44999910001" },
  { nome: "Empresa Limpeza Total Ltda", phone: "44999920002" },
  { nome: "Maria Oliveira - Contabilidade", phone: "44999930003" },
];
for (const c of contatos) {
  ins("autentique_contatos", { id: randomUUID(), ...c });
}

// ── EXPERTMONEY - Contas e Transações ───────────────────────────────
console.log("💰 Inserindo contas e transações bancárias...");
const c1 = randomUUID();
ins("em_contas", { id: c1, nome: "Conta Corrente - Banco do Brasil", banco: "Banco do Brasil", tipo: "corrente", saldo_inicial: 50000.00 });
const c2 = randomUUID();
ins("em_contas", { id: c2, nome: "Fundo Municipal de Saúde", banco: "Caixa Econômica", tipo: "corrente", saldo_inicial: 120000.00 });
const c3 = randomUUID();
ins("em_contas", { id: c3, nome: "Fundo de Educação", banco: "Banco do Brasil", tipo: "corrente", saldo_inicial: 80000.00 });

const transacoes = [
  { conta_id: c1, data: "2026-01-05", descricao: "Repasse FPM", valor: 350000.00, tipo: "receita", categoria: "fpm" },
  { conta_id: c1, data: "2026-01-10", descricao: "Pagamento folha servidores", valor: 280000.00, tipo: "despesa", categoria: "pessoal" },
  { conta_id: c1, data: "2026-01-15", descricao: "Fornecedor - Material escritório", valor: 5000.00, tipo: "despesa", categoria: "material" },
  { conta_id: c2, data: "2026-01-08", descricao: "Repasse SUS", valor: 180000.00, tipo: "receita", categoria: "sus" },
  { conta_id: c2, data: "2026-01-20", descricao: "Pagamento farmácia básica", valor: 25000.00, tipo: "despesa", categoria: "saude" },
  { conta_id: c3, data: "2026-01-12", descricao: "Repasse FUNDEB", valor: 220000.00, tipo: "receita", categoria: "fundeb" },
  { conta_id: c3, data: "2026-01-25", descricao: "Pagamento merenda escolar", valor: 15000.00, tipo: "despesa", categoria: "educacao" },
];
for (const t of transacoes) {
  ins("em_transacoes", { id: randomUUID(), ...t });
}

ins("em_alertas", { id: randomUUID(), conta_id: c1, tipo: "saldo_baixo", mensagem: "Saldo da conta corrente abaixo do mínimo recomendado (R$ 10.000)", severidade: "media" });
ins("em_alertas", { id: randomUUID(), conta_id: c2, tipo: "movimento_atipico", mensagem: "Movimentação 40% acima da média mensal", severidade: "alta" });

// ── CONFIGURAÇÕES ──────────────────────────────────────────────────
console.log("⚙️ Inserindo configurações...");
ins("configuracoes", { chave: "api_openrouter_modelo", valor: "opencode-go/deepseek-v4-flash" });
ins("configuracoes", { chave: "municipio_nome", valor: "Inajá" });
ins("configuracoes", { chave: "municipio_uf", valor: "PR" });

console.log("\n✅ Seed de exemplo concluído!");
console.log("📊 Resumo:");
for (const tabela of ["rpas", "calendario_eventos", "prazos", "mural_recados", "autentique_contatos", "em_contas", "em_transacoes", "em_alertas", "configuracoes"]) {
  const { c } = db.prepare(`SELECT COUNT(*) AS c FROM ${tabela}`).get();
  console.log(`   ${tabela}: ${c} registro(s)`);
}

db.close();
