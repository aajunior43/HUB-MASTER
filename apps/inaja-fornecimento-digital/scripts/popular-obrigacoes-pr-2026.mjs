import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync(new URL("../data/inaja.sqlite", import.meta.url));

const fonte = "Agenda de Obrigações Municipais do Paraná — TCE-PR / União";
const descricao = (ambito, fundamentacao, complemento = "") => [
  complemento,
  `Âmbito: ${ambito}.`,
  `Fundamentação: ${fundamentacao}.`,
  fonte,
].filter(Boolean).join(" ");

const obrigacoes = [
  ["encerramento-mural-dezembro", "Encerramento do Mural das Licitações — dezembro do exercício anterior", "2026-01-08", "licitacao", descricao("Executivo, Legislativo, Administração Indireta, Consórcios, Empresas Públicas e Sociedades de Economia Mista", "Art. 37 da CF/88; Lei Federal nº 14.133/2021; IN TCE-PR nº 156/2020")],
  ["rreo-siope-6-bimestre", "Publicação do RREO do 6º bimestre e transmissão/validação SIOPE", "2026-01-30", "educacao", descricao("Poder Executivo Municipal", "Art. 52 da LRF; Lei Federal nº 14.113/2020 (Fundeb)", "Referente ao exercício anterior.")],
  ["sim-am-mes-13", "Fechamento do SIM-AM — dezembro e mês 13 de 2025", "2026-02-10", "tribunal_contas", descricao("Executivo, Legislativo, entidades da Administração Direta e Indireta, Consórcios, empresas públicas, sociedades de economia mista e fundações públicas de direito privado", "Art. 71 da CF/88; LRF; Lei Federal nº 4.320/64; LC Estadual nº 113/2005; IN TCE-PR nº 84/2012")],
  ["declaracao-audiencia-3q", "Declaração da Audiência Pública de Metas Fiscais — 3º quadrimestre", "2026-03-06", "fiscal", descricao("Poder Executivo e Poder Legislativo", "Art. 9º, § 4º, da LRF; IN TCE-PR nº 89/2013", "Declarar no site do TCE-PR.")],
  ["direitos-crianca-1b", "Publicação do Relatório de Gestão dos Direitos da Criança e do Adolescente — 1º bimestre", "2026-03-30", "geral", descricao("Poder Executivo Municipal", "Art. 227 da CF/88; ECA (Lei nº 8.069/90); IN TCE-PR nº 36/2009")],
  ["pca-exercicio-anterior", "Envio da Prestação de Contas Anual (PCA) — exercício financeiro anterior", "2026-03-31", "prestacao_contas", descricao("Executivo, Legislativo e entidades da Administração Direta e Indireta", "Art. 71 da CF/88; Lei Federal nº 4.320/64; LC Estadual nº 113/2005")],
  ["pca-consorcios", "Envio da Prestação de Contas Anual (PCA) de consórcios intermunicipais", "2026-04-30", "prestacao_contas", descricao("Consórcios Intermunicipais e entidades congêneres", "Art. 71 da CF/88; Lei Federal nº 11.107/2005; LC Estadual nº 113/2005")],
  ["rgf-1q", "Publicação do RGF do 1º quadrimestre e declaração de publicidade", "2026-05-30", "fiscal", descricao("Poder Executivo, Poder Legislativo e Consórcios Intermunicipais", "Art. 54 da LRF; IN TCE-PR nº 89/2013", "Declarar a publicidade no TCE-PR.")],
  ["direitos-crianca-2b", "Publicação do Relatório de Gestão dos Direitos da Criança e do Adolescente — 2º bimestre", "2026-05-30", "geral", descricao("Poder Executivo Municipal", "Art. 227 da CF/88; ECA; IN TCE-PR nº 36/2009")],
  ["audiencia-1q", "Realização de Audiência Pública de Metas Fiscais — 1º quadrimestre", "2026-05-31", "fiscal", descricao("Poder Executivo Municipal", "Art. 9º, § 4º, da LRF; IN TCE-PR nº 89/2013")],
  ["declaracao-audiencia-1q", "Declaração da Audiência Pública de Metas Fiscais — 1º quadrimestre", "2026-06-08", "fiscal", descricao("Poder Executivo e Poder Legislativo", "Art. 9º, § 4º, da LRF; IN TCE-PR nº 89/2013", "Declarar no site do TCE-PR.")],
  ["direitos-crianca-4b", "Publicação do Relatório de Gestão dos Direitos da Criança e do Adolescente — 4º bimestre", "2026-09-30", "geral", descricao("Poder Executivo Municipal", "Art. 227 da CF/88; ECA; IN TCE-PR nº 36/2009")],
  ["audiencia-2q", "Realização de Audiência Pública de Metas Fiscais — 2º quadrimestre", "2026-09-30", "fiscal", descricao("Poder Executivo Municipal", "Art. 9º, § 4º, da LRF; IN TCE-PR nº 89/2013")],
  ["cadastro-interlocutores-pca", "Abertura do Cadastro de Interlocutores Municipais para a PCA do Prefeito", "2026-10-06", "prestacao_contas", descricao("Poder Executivo Municipal", "IN TCE-PR nº 172/2022, art. 14, parágrafo único")],
  ["declaracao-audiencia-2q", "Declaração da Audiência Pública de Metas Fiscais — 2º quadrimestre", "2026-10-07", "fiscal", descricao("Poder Executivo e Poder Legislativo", "Art. 9º, § 4º, da LRF; IN TCE-PR nº 89/2013", "Declarar no site do TCE-PR.")],
  ["direitos-crianca-5b", "Publicação do Relatório de Gestão dos Direitos da Criança e do Adolescente — 5º bimestre", "2026-11-30", "geral", descricao("Poder Executivo Municipal", "Art. 227 da CF/88; ECA; IN TCE-PR nº 36/2009")],
];

const adicionar = (chave, titulo, data, categoria, ambito, fundamentacao, complemento = "") => {
  obrigacoes.push([chave, titulo, data, categoria, descricao(ambito, fundamentacao, complemento)]);
};

const ambitoGeral = "Executivo, Legislativo, entidades da Administração Direta e Indireta, Consórcios, empresas públicas, sociedades de economia mista e fundações públicas de direito privado";
const baseSiap = "Art. 37 da CF/88; LRF; IN TCE-PR nº 120/2016";
const baseSimAm = "Art. 71 da CF/88; LRF; Lei Federal nº 4.320/64; LC Estadual nº 113/2005; IN TCE-PR nº 84/2012";
const baseFiscal = "LRF, art. 52; IN TCE-PR nº 89/2013";
const baseRgf = "LRF, art. 54; IN TCE-PR nº 89/2013";
const baseCrianca = "Art. 227 da CF/88; ECA (Lei nº 8.069/90); IN TCE-PR nº 36/2009";

[
  ["siap-dez-2025", "Envio do SIAP-FP — folha de dezembro de 2025", "2026-01-20", "rh", "dezembro de 2025"],
  ["siap-jan", "Envio do SIAP-FP — folha de janeiro de 2026", "2026-02-20", "rh", "janeiro de 2026"],
  ["siap-fev", "Envio do SIAP-FP — folha de fevereiro de 2026", "2026-03-20", "rh", "fevereiro de 2026"],
  ["siap-mar", "Envio do SIAP-FP — folha de março de 2026", "2026-04-20", "rh", "março de 2026"],
  ["siap-abr", "Envio do SIAP-FP — folha de abril de 2026", "2026-05-20", "rh", "abril de 2026"],
  ["siap-mai", "Envio do SIAP-FP — folha de maio de 2026", "2026-06-22", "rh", "maio de 2026"],
  ["siap-jun", "Envio do SIAP-FP — folha de junho de 2026", "2026-07-21", "rh", "junho de 2026"],
  ["siap-jul", "Envio do SIAP-FP — folha de julho de 2026", "2026-08-20", "rh", "julho de 2026"],
  ["siap-ago", "Envio do SIAP-FP — folha de agosto de 2026", "2026-09-21", "rh", "agosto de 2026"],
  ["siap-set", "Envio do SIAP-FP — folha de setembro de 2026", "2026-10-20", "rh", "setembro de 2026"],
  ["siap-out", "Envio do SIAP-FP — folha de outubro de 2026", "2026-11-23", "rh", "outubro de 2026"],
  ["siap-nov", "Envio do SIAP-FP — folha de novembro de 2026", "2026-12-21", "rh", "novembro de 2026"],
].forEach(([chave, titulo, data, categoria, competencia]) => adicionar(chave, titulo, data, categoria, ambitoGeral, baseSiap, `Competência: ${competencia}.`));

[
  ["sim-am-zero-jan", "Fechamento do SIM-AM — mês zero e janeiro de 2026", "2026-02-28", "mês de abertura do exercício e janeiro de 2026"],
  ["sim-am-fev", "Fechamento do SIM-AM — fevereiro de 2026", "2026-03-31", "fevereiro de 2026"],
  ["sim-am-mar", "Fechamento do SIM-AM — março de 2026", "2026-04-30", "março de 2026"],
  ["sim-am-abr", "Fechamento do SIM-AM — abril de 2026", "2026-05-31", "abril de 2026"],
  ["sim-am-mai", "Fechamento do SIM-AM — maio de 2026", "2026-06-30", "maio de 2026"],
  ["sim-am-jun", "Fechamento do SIM-AM — junho de 2026", "2026-07-31", "junho de 2026"],
  ["sim-am-jul", "Fechamento do SIM-AM — julho de 2026", "2026-08-31", "julho de 2026"],
  ["sim-am-ago", "Fechamento do SIM-AM — agosto de 2026", "2026-09-30", "agosto de 2026"],
  ["sim-am-set", "Fechamento do SIM-AM — setembro de 2026", "2026-10-31", "setembro de 2026"],
  ["sim-am-out", "Fechamento do SIM-AM — outubro de 2026", "2026-11-30", "outubro de 2026"],
  ["sim-am-nov", "Fechamento do SIM-AM — novembro de 2026", "2026-12-31", "novembro de 2026"],
].forEach(([chave, titulo, data, competencia]) => adicionar(chave, titulo, data, "tribunal_contas", ambitoGeral, baseSimAm, `Competência: ${competencia}.`));

adicionar("rgf-3q-2025", "Publicação do RGF — período encerrado em 31/12/2025", "2026-01-30", "fiscal", "Executivo, Legislativo e Consórcios", baseRgf, "Incluir declaração de publicidade na página do TCE-PR.");
adicionar("direitos-crianca-6b-2025", "Publicação do Relatório de Gestão dos Direitos da Criança e do Adolescente — 6º bimestre de 2025", "2026-01-30", "geral", "Poder Executivo Municipal", baseCrianca);
adicionar("audiencia-3q-2025", "Realização de Audiência Pública de Metas Fiscais — 3º quadrimestre de 2025", "2026-02-28", "fiscal", "Poder Executivo Municipal", "LRF, art. 9º, § 4º; IN TCE-PR nº 89/2013");
adicionar("audiencia-saude-3q-2025", "Realização de Audiência Pública do Plano Municipal de Saúde — 3º quadrimestre de 2025", "2026-02-28", "saude", "Poder Executivo Municipal", "Lei Complementar Federal nº 141/2012, art. 36, § 5º; IN TCE-PR nº 89/2013");
adicionar("rgf-consolidado-2025", "Publicação do Relatório de Gestão Fiscal Consolidado — 2025", "2026-02-28", "fiscal", "Poder Executivo Municipal", "LRF, arts. 50 e 54; IN TCE-PR nº 89/2013");
adicionar("rreo-1b", "Publicação do RREO do 1º bimestre e declaração de publicidade", "2026-03-30", "fiscal", "Executivo e Consórcios", baseFiscal);
adicionar("rreo-2b", "Publicação do RREO do 2º bimestre e declaração de publicidade", "2026-05-30", "fiscal", "Executivo e Consórcios", baseFiscal);
adicionar("audiencia-saude-1q", "Realização de Audiência Pública do Plano Municipal de Saúde — 1º quadrimestre", "2026-05-31", "saude", "Poder Executivo Municipal", "Lei Complementar Federal nº 141/2012, art. 36, § 5º; IN TCE-PR nº 89/2013");
adicionar("rgf-semestral", "Publicação do RGF do 1º semestre e declaração de publicidade", "2026-07-30", "fiscal", "Executivo e Legislativo", baseRgf, "Aplicável aos municípios com menos de 50 mil habitantes que adotarem a periodicidade semestral.");
adicionar("rreo-3b", "Publicação do RREO do 3º bimestre e declaração de publicidade", "2026-07-30", "fiscal", "Executivo e Consórcios", baseFiscal);
adicionar("direitos-crianca-3b", "Publicação do Relatório de Gestão dos Direitos da Criança e do Adolescente — 3º bimestre", "2026-07-30", "geral", "Poder Executivo Municipal", baseCrianca);
adicionar("rgf-2q", "Publicação do RGF do 2º quadrimestre e declaração de publicidade", "2026-09-30", "fiscal", "Executivo, Legislativo e Consórcios", baseRgf, "Aplicável aos municípios a partir de 50 mil habitantes.");
adicionar("rreo-4b", "Publicação do RREO do 4º bimestre e declaração de publicidade", "2026-09-30", "fiscal", "Executivo e Consórcios", baseFiscal);
adicionar("audiencia-saude-2q", "Realização de Audiência Pública do Plano Municipal de Saúde — 2º quadrimestre", "2026-09-30", "saude", "Poder Executivo Municipal", "Lei Complementar Federal nº 141/2012, art. 36, § 5º; IN TCE-PR nº 89/2013");
adicionar("fim-cadastro-interlocutores", "Término do cadastro de interlocutores municipais da PCA do Prefeito", "2026-10-22", "prestacao_contas", "Poder Executivo Municipal", "IN TCE-PR nº 172/2022, art. 14, parágrafo único");
adicionar("inicio-formularios-pca", "Início do envio dos formulários de avaliação de políticas públicas da PCA do Prefeito", "2026-11-03", "prestacao_contas", "Poder Executivo Municipal", "IN TCE-PR nº 172/2022, art. 7º, § 3º");
adicionar("fim-formularios-pca", "Término do envio dos formulários de avaliação de políticas públicas da PCA do Prefeito", "2026-11-26", "prestacao_contas", "Poder Executivo Municipal", "IN TCE-PR nº 172/2022, art. 7º, § 3º");
adicionar("rreo-5b", "Publicação do RREO do 5º bimestre e declaração de publicidade", "2026-11-30", "fiscal", "Executivo e Consórcios", baseFiscal);

[
  ["siope-1b", "Transmissão e validação do SIOPE — 1º bimestre", "2026-03-30", "1º bimestre de 2026"],
  ["siope-2b", "Transmissão e validação do SIOPE — 2º bimestre", "2026-05-30", "2º bimestre de 2026"],
  ["siope-3b", "Transmissão e validação do SIOPE — 3º bimestre", "2026-07-30", "3º bimestre de 2026"],
  ["siope-4b", "Transmissão e validação do SIOPE — 4º bimestre", "2026-09-30", "4º bimestre de 2026"],
  ["siope-5b", "Transmissão e validação do SIOPE — 5º bimestre", "2026-11-30", "5º bimestre de 2026"],
].forEach(([chave, titulo, data, competencia]) => adicionar(chave, titulo, data, "educacao", "Poder Executivo Municipal", "Lei Federal nº 14.113/2020; regramentos do FNDE", `Competência: ${competencia}.`));

adicionar("dca-siconfi", "Envio da Declaração de Contas Anuais (DCA) no Siconfi", "2026-04-30", "fiscal", "Poder Executivo Municipal", "LRF, art. 51, § 1º; Portaria STN nº 642/2019, art. 4º");
[
  ["msc-jan", "Envio da Matriz de Saldos Contábeis (MSC) — competência janeiro", "2026-02-28"],
  ["msc-fev", "Envio da Matriz de Saldos Contábeis (MSC) — competência fevereiro", "2026-03-31"],
  ["msc-mar", "Envio da Matriz de Saldos Contábeis (MSC) — competência março", "2026-04-30"],
  ["msc-abr", "Envio da Matriz de Saldos Contábeis (MSC) — competência abril", "2026-05-31"],
  ["msc-mai", "Envio da Matriz de Saldos Contábeis (MSC) — competência maio", "2026-06-30"],
  ["msc-jun", "Envio da Matriz de Saldos Contábeis (MSC) — competência junho", "2026-07-31"],
  ["msc-jul", "Envio da Matriz de Saldos Contábeis (MSC) — competência julho", "2026-08-31"],
  ["msc-ago", "Envio da Matriz de Saldos Contábeis (MSC) — competência agosto", "2026-09-30"],
  ["msc-set", "Envio da Matriz de Saldos Contábeis (MSC) — competência setembro", "2026-10-31"],
  ["msc-out", "Envio da Matriz de Saldos Contábeis (MSC) — competência outubro", "2026-11-30"],
  ["msc-nov", "Envio da Matriz de Saldos Contábeis (MSC) — competência novembro", "2026-12-31"],
].forEach(([chave, titulo, data]) => adicionar(chave, titulo, data, "fiscal", "Poder Executivo Municipal", "Portaria STN nº 642/2019, art. 8º, §§ 1º e 2º", "Prazo: último dia do mês subsequente à competência."));

const inserir = db.prepare("INSERT INTO prazos (id, titulo, descricao, data_limite, categoria, resolvido) VALUES (?, ?, ?, ?, ?, 0) ON CONFLICT(id) DO UPDATE SET titulo = excluded.titulo, descricao = excluded.descricao, data_limite = excluded.data_limite, categoria = excluded.categoria, atualizado_em = datetime('now')");
const salvar = () => {
  db.exec("BEGIN");
  try {
  for (const [chave, titulo, data, categoria, texto] of obrigacoes) inserir.run(`obrigacao-pr-2026-${chave}`, titulo, texto, data, categoria);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
};

salvar();
console.log(`${obrigacoes.length} obrigações anuais cadastradas ou atualizadas.`);
