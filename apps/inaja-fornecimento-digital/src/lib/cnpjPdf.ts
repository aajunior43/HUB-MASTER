type Socio = { nome: string; qualificacao: string };

export type CnpjPdfData = {
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
  socios: Socio[];
  telefones: string[];
  emails: string[];
  fonte: string;
};

const formatarCnpj = (valor: string) => {
  const digitos = valor.replace(/\D/g, "");
  return digitos.length === 14 ? `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}` : valor;
};

const carregarBrasao = async (): Promise<string | null> => {
  try {
    const resposta = await fetch("/brasao.png");
    if (!resposta.ok) return null;
    const imagem = await resposta.blob();
    return await new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result));
      leitor.onerror = () => reject(leitor.error);
      leitor.readAsDataURL(imagem);
    });
  } catch {
    return null;
  }
};

export async function gerarPdfCnpj(dados: CnpjPdfData): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const M = 14;
  const L = W - (2 * M);
  let y = 40;

  const novaPaginaSeNecessario = (altura = 12) => {
    if (y + altura < H - 18) return;
    doc.addPage();
    y = 18;
  };
  const texto = (valor: string, x: number, largura: number, tamanho = 9) => {
    const linhas = doc.splitTextToSize(valor || "-", largura);
    doc.setFont("helvetica", "normal").setFontSize(tamanho).setTextColor(42, 52, 47);
    doc.text(linhas, x, y);
    y += linhas.length * (tamanho * 0.44) + 3;
  };
  const tituloSecao = (titulo: string) => {
    novaPaginaSeNecessario(14);
    doc.setFillColor(6, 78, 59);
    doc.roundedRect(M, y - 5, L, 8, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(255, 255, 255);
    doc.text(titulo.toUpperCase(), M + 3, y);
    y += 10;
  };
  const campo = (rotulo: string, valor: string) => {
    novaPaginaSeNecessario();
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(92, 104, 97);
    doc.text(rotulo, M, y);
    y += 3.5;
    texto(valor || "-", M, L);
  };

  doc.setProperties({ title: `Consulta CNPJ - ${formatarCnpj(dados.cnpj)}`, author: "Prefeitura Municipal de Inajá" });
  const brasao = await carregarBrasao();
  doc.setFillColor(6, 78, 59);
  doc.rect(0, 0, W, 31, "F");
  doc.setFillColor(201, 168, 76);
  doc.rect(0, 31, W, 1, "F");
  if (brasao) doc.addImage(brasao, "PNG", M, 5, 62, 20);
  doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(6, 78, 59);
  doc.text("CONSULTA DE CNPJ", M, y);
  y += 6;
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(42, 52, 47);
  const nomeEmpresa = doc.splitTextToSize(dados.razao_social || dados.nome_fantasia || "EMPRESA NÃO INFORMADA", L);
  doc.text(nomeEmpresa, M, y);
  y += nomeEmpresa.length * 5;
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(6, 78, 59);
  doc.text(`CNPJ: ${formatarCnpj(dados.cnpj)}`, M, y);
  y += 6;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(92, 104, 97);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} · Fonte: ${dados.fonte}`, M, y);
  y += 10;

  tituloSecao("Identificação");
  campo("RAZÃO SOCIAL", dados.razao_social);
  if (dados.nome_fantasia && dados.nome_fantasia !== dados.razao_social) campo("NOME FANTASIA", dados.nome_fantasia);
  campo("CNPJ", formatarCnpj(dados.cnpj));
  campo("SITUAÇÃO CADASTRAL", [dados.situacao, dados.data_situacao].filter(Boolean).join(" · "));

  tituloSecao("Dados cadastrais");
  campo("ABERTURA", dados.data_abertura);
  campo("MATRIZ / FILIAL", dados.matriz);
  campo("PORTE", dados.porte);
  campo("NATUREZA JURÍDICA", dados.natureza_juridica);
  campo("CAPITAL SOCIAL", dados.capital_social);
  campo("SIMPLES NACIONAL / MEI", `Simples: ${dados.simples || "-"} · MEI: ${dados.mei || "-"}`);

  tituloSecao("Endereço e contatos");
  campo("ENDEREÇO", dados.endereco);
  campo("TELEFONES", dados.telefones?.filter(Boolean).join(", "));
  campo("E-MAILS", dados.emails?.filter(Boolean).join(", "));

  tituloSecao("Atividades econômicas");
  campo("CNAE PRINCIPAL", dados.cnae_principal);
  if (dados.cnaes_secundarios?.length) campo("CNAEs SECUNDÁRIOS", dados.cnaes_secundarios.filter(Boolean).map((item) => `• ${item}`).join("\n"));

  if (dados.socios?.length) {
    tituloSecao("Quadro societário");
    for (const socio of dados.socios) campo(socio.qualificacao || "SÓCIO", socio.nome);
  }

  const total = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= total; pagina++) {
    doc.setPage(pagina);
    doc.setDrawColor(201, 168, 76).setLineWidth(0.35);
    doc.line(M, H - 12, W - M, H - 12);
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(92, 104, 97);
    doc.text("Prefeitura Municipal de Inajá", M, H - 8);
    doc.text(`Página ${pagina} de ${total}`, W - M, H - 8, { align: "right" });
  }
  doc.save(`consulta-cnpj-${dados.cnpj.replace(/\D/g, "")}.pdf`);
}
