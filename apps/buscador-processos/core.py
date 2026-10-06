"""
Core functionality for Judicial Process Searcher
Shared module used by both CLI and GUI interfaces
"""

import os
import re
import csv
import requests
import sqlite3
from datetime import datetime

# =====================================================================
# CONFIGURAÇÃO DE ACESSO À API E BANCO DE DADOS
# =====================================================================
TAVILY_API_KEY = "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"

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "historico.db")
# =====================================================================

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS buscas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            documento TEXT NOT NULL,
            data_busca TEXT NOT NULL,
            tipo_doc TEXT NOT NULL,
            pasta_destino TEXT NOT NULL,
            arquivo_html TEXT NOT NULL,
            total_resultados INTEGER NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# Inicia o BD caso não exista
init_db()

def validar_cpf_cnpj(documento):
    """
    Valida se é CPF ou CNPJ válido
    """
    numeros = re.sub(r'\D', '', documento)
    
    if len(numeros) == 11:
        cpf_formatado = f"{numeros[:3]}.{numeros[3:6]}.{numeros[6:9]}-{numeros[9:11]}"
        return ("CPF", cpf_formatado, numeros)
    elif len(numeros) == 14:
        cnpj_formatado = f"{numeros[:2]}.{numeros[2:5]}.{numeros[5:8]}/{numeros[8:12]}-{numeros[12:14]}"
        return ("CNPJ", cnpj_formatado, numeros)
    
    return (None, None, None)

def buscar_processos_judiciais(documento, filtros=None, pasta_base=None, progress_callback=None, captcha_callback=None):
    """
    Busca baseada nas categorias selecionadas via 'filtros'
    """
    if pasta_base is None:
        pasta_base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "resultados")

    def log(mensagem, porcentagem=0, tipo='info'):
        if progress_callback:
            progress_callback(mensagem, porcentagem, tipo)
        else:
            print(mensagem)
    
    log("⚖️ Iniciando motor de busca...", 0, 'info')
    
    tipo_doc, doc_formatado, doc_numeros = validar_cpf_cnpj(documento)
    if not tipo_doc:
        log("❌ Documento inválido! Digite um CPF ou CNPJ.", 0, 'error')
        return None
    
    log(f"✅ Documento setado para o alvo: {doc_formatado}", 5, 'success')
    
    if not TAVILY_API_KEY:
        log("❌ ERRO CRÍTICO: Chave da API ausente!", 5, 'error')
        return None

    # ====== [NOVO] LAPIDAÇÃO: INTELIGÊNCIA CADASTRAL (RECEITA WS) ======
    dados_empresa = None
    if tipo_doc == "CNPJ":
        log("🏢 (ReceitaWS) Puxando estrutura corporativa pública do CNPJ...", 8, 'info')
        try:
            r_ws = requests.get(f"https://receitaws.com.br/v1/cnpj/{doc_numeros}", timeout=10)
            if r_ws.status_code == 200:
                json_ws = r_ws.json()
                if json_ws.get("status") != "ERROR":
                    dados_empresa = {
                        "nome": json_ws.get("nome", "Não informado"),
                        "fantasia": json_ws.get("fantasia", "Não informado"),
                        "abertura": json_ws.get("abertura", "Não informada"),
                        "situacao": json_ws.get("situacao", "Não informada"),
                        "capital_social": json_ws.get("capital_social", "0.00"),
                        "socios": [s["nome"] for s in json_ws.get("qsa", [])]
                    }
                    log(f"✅ Empresa identificada: {dados_empresa['nome']} ({len(dados_empresa['socios'])} sócios)", 10, 'success')
        except Exception as e:
            log(f"⚠️ Aviso: Falha ao puxar ficha cadastral da Receita: {str(e)}", 10, 'warning')
    # ===================================================================

    todas_buscas_suportadas = {
        # Ambas Entidades
        "Processos Judiciais (TJs/TRFs/STF)": f'"{doc_formatado}" OR "{doc_numeros}" processo OR jurisprudência site:jus.br',
        "Jusbrasil e Diários Oficiais": f'"{doc_formatado}" OR "{doc_numeros}" site:jusbrasil.com.br',
        "Dívida Ativa e Regularidade Fiscal": f'"{doc_formatado}" OR "{doc_numeros}" devedores OR dívida ativa OR PGFN site:gov.br',
        "Doações Eleitorais e Vínculos Políticos": f'"{doc_formatado}" OR "{doc_numeros}" prestação de contas OR doação eleitoral site:tse.jus.br',
        "Lista Suja de Trabalho Escravo": f'"{doc_formatado}" OR "{doc_numeros}" trabalho escravo OR lista suja site:mte.gov.br OR site:gov.br',
        
        # Exclusivos CNPJ (Empresarial)
        "Investigação Licitatória (TCU/Transparência)": f'"{doc_formatado}" OR "{doc_numeros}" inidôneo OR penalidade OR fraude site:gov.br',
        "Multas e Embargos Ambientais (IBAMA)": f'"{doc_formatado}" OR "{doc_numeros}" infração ambiental OR embargo site:ibama.gov.br',
        "ReclameAqui e Procon": f'"{doc_formatado}" OR "{doc_numeros}" site:reclameaqui.com.br OR site:procon.sp.gov.br',
        "Leilões e Falências": f'"{doc_formatado}" OR "{doc_numeros}" massa falida OR leilão OR recuperação judicial',
        
        # Exclusivos CPF (Pessoa Física)
        "Mídia Policial Estadual e Antecedentes": f'"{doc_formatado}" OR "{doc_numeros}" mandado judicial OR suspeito OR procurado OR polícia',
        "Redes Sociais Profissionais": f'"{doc_formatado}" OR "{doc_numeros}" site:linkedin.com OR site:twitter.com',
        "Concursos Públicos e Editais": f'"{doc_formatado}" OR "{doc_numeros}" aprovado OR convocado site:gov.br OR site:edu.br'
    }
    
    if filtros is None or len(filtros) == 0:
        filtros = list(todas_buscas_suportadas.keys())
        
    buscas = []
    for f_nome in filtros:
        if f_nome in todas_buscas_suportadas:
            buscas.append((f_nome, todas_buscas_suportadas[f_nome]))
            
    if not buscas:
        log("❌ Nenhum filtro ativo para fazer consultas.", 0, 'error')
        return None
    
    nome_pasta = f"{tipo_doc}_{doc_numeros}"
    pasta_doc = os.path.join(pasta_base, nome_pasta)
    if not os.path.exists(pasta_doc):
        os.makedirs(pasta_doc)
        log(f"📁 Pasta de resultados pronta: {pasta_doc}", 10, 'info')
    
    todos_resultados = {}
    total_buscas = len(buscas)
    
    for idx, (tipo_busca, query) in enumerate(buscas):
        porcentagem = 10 + int((idx / total_buscas) * 75)
        log(f"🔍 Vasculhando o motor (Tavily): {tipo_busca}", porcentagem, 'info')
        
        headers = {"Content-Type": "application/json"}
        payload = {
            "api_key": TAVILY_API_KEY,
            "query": query,
            "search_depth": "advanced",
            "include_raw_content": False,
            "max_results": 20
        }
        
        resultados = []
        try:
            response = requests.post(
                "https://api.tavily.com/search",
                headers=headers,
                json=payload,
                timeout=20
            )
            if response.status_code == 200:
                data = response.json()
                web_results = data.get("results", [])
                for item in web_results:
                    resultados.append({
                        "titulo": item.get("title", "Sem título"),
                        "link": item.get("url", ""),
                        "descricao": item.get("content", "")[:250]
                    })
                log(f"✅ Encontrado {len(resultados)} correspondências", porcentagem + 5, 'success')
            else:
                log(f"⚠️ Erro código HTTP {response.status_code}", porcentagem, 'warning')
        except Exception as e:
            log(f"⚠️ Erro de rede (Tavily): {str(e)}", porcentagem, 'error')
            
        todos_resultados[tipo_busca] = resultados
        
    log("💾 Organizando laudos...", 90, 'info')
    timestamp_data = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    timestamp_arq = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    total_resultados = sum(len(r) for r in todos_resultados.values())

    arquivo_html = os.path.join(pasta_doc, f"laudo_{timestamp_arq}.html")
    html_content = [f"<html><head><meta charset='utf-8'><title>Dossiê - {doc_formatado}</title><style>body{{font-family:Segoe UI, sans-serif;padding:20px;background:#f5f6fa;color:#2f3640;}} .cat{{color:#273c75; border-bottom:3px solid #00a8ff; padding-bottom:5px; margin-top:30px;}} .card{{background:#ffffff; padding:15px; margin:10px 0; border-radius:5px; border-left:5px solid #00a8ff; box-shadow: 0 2px 5px rgba(0,0,0,0.05);}} a{{color:#0097e6;text-decoration:none;font-weight:bold;}} a:hover{{text-decoration:underline;}} .desc{{color:#718093; margin-top:5px;}} .receita-card{{background:#ffffff; border:1px solid #ced6e0; border-radius:8px; padding:20px; margin-top:20px; box-shadow: 0 4px 6px rgba(0,0,0,0.04);}} .receita-card h2{{margin-top:0; color:#2f3542; border-bottom:2px solid #2ed573; padding-bottom:10px; display:inline-block;}}</style></head><body>"]
    
    html_content.append(f"<h1>⚖️ Dossiê de Inteligência: {doc_formatado}</h1><p>Relatório gerado em <b>{timestamp_data}</b></p>")
    
    if dados_empresa:
        lista_socios = ", ".join(dados_empresa['socios']) if dados_empresa['socios'] else "Nenhum sócio registrado."
        html_content.append(f"""
        <div class="receita-card">
            <h2>🏢 Ficha Oficial (Receita Federal)</h2>
            <p><b>Razão Social:</b> {dados_empresa['nome']}</p>
            <p><b>Nome Fantasia:</b> {dados_empresa['fantasia']}</p>
            <p><b>Abertura:</b> {dados_empresa['abertura']} &nbsp;|&nbsp; <b>Situação:</b> <span style="background:#2ed573; color:white; padding:2px 8px; border-radius:4px;">{dados_empresa['situacao']}</span></p>
            <p><b>Capital Social:</b> R$ {dados_empresa['capital_social']}</p>
            <p><b>Quadro de Sócios e Administradores (QSA):</b><br>{lista_socios}</p>
        </div>
        """)
        
    for tipo, res_list in todos_resultados.items():
        html_content.append(f"<h2 class='cat'>{tipo} <span style='color:#7f8fa6;font-size:16px;'>({len(res_list)} resultados)</span></h2>")
        if res_list:
            for r in res_list:
                html_content.append(f"<div class='card'><b>{r['titulo']}</b><br><a href='{r['link']}' target='_blank'>{r['link']}</a><p class='desc'>{r['descricao']}</p></div>")
        else:
            html_content.append("<p style='color:#c23616;'>Nenhum apontamento encontrado para este alvo na categoria selecionada.</p>")
    html_content.append(f"<br><hr><p style='text-align:right;'><b>Varredura finalizada. Total de achados: {total_resultados}</b></p>")
    
    # Adicionando o Bloco de Emissão Rápida de Certidões Licitatórias se for CNPJ
    if tipo_doc == "CNPJ":
        html_content.append(f"""
        <div style="background:#e8f4f8; padding:20px; margin-top:40px; border-radius:8px; border-left:5px solid #2980b9;">
            <h2 style="color:#2c3e50; margin-top:0;">📋 Central de Acesso à Certidões (Licitações)</h2>
            <p style="color:#34495e;">Devido ao nível de segurança federal envolvendo encriptação severa e sistemas de CAPTCHAs do governo, as certidões negativas são bloqueadas nativamente para raspagem via robôs da web. No entanto, criamos atalhos diretos para que você emita rapidamente todas as <b>Certidões Obrigatórias para Licitações</b> com o <b>CNPJ: {doc_formatado}</b> copiado na sua área de transferência.</p>
            <ul style="line-height:1.8;">
                <li><a href="https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir" target="_blank">Receita Federal (CND Federal PGFN)</a></li>
                <li><a href="https://tst.jus.br/certidao1" target="_blank">Tribunal Superior do Trabalho (CNDT - Certidão Trabalhista)</a></li>
                <li><a href="https://consultacrf.caixa.gov.br/consultacrf/" target="_blank">Caixa Econômica Federal (CRF - FGTS)</a></li>
                <li><a href="https://portaldatransparencia.gov.br/sancoes/ceis" target="_blank">CGU - Cadastro de Empresas Inidôneas (CEIS)</a></li>
                <li><a href="https://certidoes-apf.apps.tcu.gov.br/" target="_blank">TCU - Certidão de Licitante Inidôneo</a></li>
            </ul>
        </div>
        """)
        
    html_content.append("</body></html>")
    
    with open(arquivo_html, "w", encoding="utf-8") as f:
        f.write("".join(html_content))

    # Registrar no Banco de Dados
    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO buscas (documento, data_busca, tipo_doc, pasta_destino, arquivo_html, total_resultados) VALUES (?, ?, ?, ?, ?, ?)",
            (doc_formatado, timestamp_data, tipo_doc, pasta_doc, arquivo_html, total_resultados)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        log(f"⚠️ Não foi possível salvar no SQL histórico: {e}", 90, 'warning')

    log("✅ Varredura concluída brilhantemente!", 100, 'success')
    log(f"🌐 Laudo HTML aberto automaticamente! ({arquivo_html})", 100, 'info')
    
    return {
        'tipo_doc': tipo_doc,
        'doc_formatado': doc_formatado,
        'pasta_doc': pasta_doc,
        'arquivo_html': arquivo_html,
        'resultados': todos_resultados,
        'total_resultados': total_resultados
    }
