#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador de Relatório Simples
Lê arquivos JSON de relatórios e gera um relatório HTML consolidado
"""

import json
import os
import sys
from datetime import datetime
import glob

# Adiciona o diretório utils ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'utils'))
from relatorio_manager import relatorio_manager

def ler_relatorio_json(arquivo):
    """Lê um arquivo de relatório JSON se existir"""
    try:
        if os.path.exists(arquivo):
            with open(arquivo, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"Erro ao ler {arquivo}: {str(e)}")
    return None

def gerar_html_relatorio(dados_relatorios):
    """Gera relatório HTML a partir dos dados"""
    html = """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Organização de Extratos</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ background: #2c3e50; color: white; padding: 20px; text-align: center; }}
        .section {{ margin: 20px 0; padding: 15px; border: 1px solid #ddd; }}
        .stats {{ display: flex; justify-content: space-around; flex-wrap: wrap; }}
        .stat-box {{ background: #f8f9fa; padding: 15px; margin: 10px; border-radius: 5px; text-align: center; }}
        .stat-number {{ font-size: 2em; font-weight: bold; color: #27ae60; }}
        .erro {{ color: #e74c3c; }}
        .sucesso {{ color: #27ae60; }}
        table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background: #f2f2f2; }}
        .resumo {{ background: #ecf0f1; padding: 20px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>RELATÓRIO DE ORGANIZAÇÃO DE EXTRATOS</h1>
        <p>Gerado em: {data_geracao}</p>
    </div>
"""

    # Seção de resumo geral
    html += '<div class="resumo"><h2>RESUMO EXECUTIVO</h2>'

    total_geral = 0
    sucessos_geral = 0
    erros_geral = 0

    for nome, dados in dados_relatorios.items():
        if dados:
            total = dados.get('total_arquivos', 0)
            sucessos = dados.get('processados_com_sucesso', dados.get('sucessos_previstos', 0))
            erros = dados.get('erros', dados.get('erros_previstos', 0))

            total_geral += total
            sucessos_geral += sucessos
            erros_geral += erros

    html += f"""
    <div class="stats">
        <div class="stat-box">
            <div class="stat-number">{total_geral}</div>
            <div>Total de Arquivos</div>
        </div>
        <div class="stat-box">
            <div class="stat-number sucesso">{sucessos_geral}</div>
            <div>Sucessos</div>
        </div>
        <div class="stat-box">
            <div class="stat-number erro">{erros_geral}</div>
            <div>Erros</div>
        </div>
    """

    if total_geral > 0:
        taxa_sucesso = (sucessos_geral / total_geral) * 100
        html += f"""
        <div class="stat-box">
            <div class="stat-number">{taxa_sucesso:.1f}%</div>
            <div>Taxa de Sucesso</div>
        </div>
        """

    html += '</div></div>'

    # Seção detalhada para cada relatório
    for nome, dados in dados_relatorios.items():
        if not dados:
            continue

        html += f'<div class="section"><h2>{nome.upper()}</h2>'

        # Estatísticas específicas
        total = dados.get('total_arquivos', 0)
        sucessos = dados.get('processados_com_sucesso', dados.get('sucessos_previstos', 0))
        erros = dados.get('erros', dados.get('erros_previstos', 0))

        html += f"""
        <p><strong>Total de arquivos:</strong> {total}</p>
        <p><strong>Sucessos:</strong> <span class="sucesso">{sucessos}</span></p>
        <p><strong>Erros:</strong> <span class="erro">{erros}</span></p>
        """

        if total > 0:
            taxa = (sucessos / total) * 100
            html += f'<p><strong>Taxa de sucesso:</strong> {taxa:.1f}%</p>'

        # Informações específicas
        if 'metodo' in dados:
            html += f'<p><strong>Método:</strong> {dados["metodo"]}</p>'

        if 'estrutura' in dados:
            html += f'<p><strong>Estrutura:</strong> {dados["estrutura"]}</p>'

        # Estatísticas de método (para relatórios híbridos)
        stats = dados.get('stats', {})
        if 'analisados_local' in stats:
            html += f'<p><strong>Processados LOCAL:</strong> {stats["analisados_local"]}</p>'
        if 'analisados_gemini' in stats:
            html += f'<p><strong>Processados GEMINI:</strong> {stats["analisados_gemini"]}</p>'

        # Lista de erros (primeiros 10)
        detalhes = dados.get('detalhes', [])
        erros_lista = [d for d in detalhes if not d.get('sucesso_previsto', d.get('sucesso', True))]

        if erros_lista:
            html += '<h3>Principais Erros:</h3><ul>'
            for erro in erros_lista[:10]:  # Primeiros 10 erros
                nome_arquivo = erro.get('nome_original', erro.get('arquivo_original', 'Desconhecido'))
                erro_msg = erro.get('erro_previsto', erro.get('erro', 'Erro desconhecido'))
                html += f'<li><strong>{nome_arquivo}</strong>: {erro_msg}</li>'
            if len(erros_lista) > 10:
                html += f'<li>... e mais {len(erros_lista) - 10} erros</li>'
            html += '</ul>'

        html += '</div>'

    # Informações do sistema
    html += f"""
    <div class="section">
        <h2>INFORMAÇÕES DO SISTEMA</h2>
        <p><strong>Data/Hora:</strong> {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</p>
        <p><strong>Sistema:</strong> Organizador de Extratos Bancários</p>
        <p><strong>Relatórios analisados:</strong> {len([d for d in dados_relatorios.values() if d])}</p>
    </div>

    </body>
    </html>
    """

    return html

def main():
    """Função principal para gerar relatório consolidado"""
    print("🔍 Procurando arquivos de relatório...")
    
    # Procura por arquivos de relatório JSON na nova estrutura
    arquivos_relatorio = []
    
    # Verifica na estrutura nova primeiro
    relatorios_existentes = relatorio_manager.listar_relatorios()
    for tipo, arquivos in relatorios_existentes.items():
        if tipo in ['json', 'simulacoes', 'organizacoes']:
            for arquivo_info in arquivos:
                if arquivo_info['nome'].endswith('.json'):
                    arquivos_relatorio.append(arquivo_info['caminho'])
    
    # Se não encontrar na nova estrutura, procura na raiz (compatibilidade)
    if not arquivos_relatorio:
        padroes = [
            "relatorio_*.json",
            "simulacao_*.json", 
            "organizacao_*.json",
            "relatorio_local_*.json",
            "relatorio_super.json",
            "relatorio_local.json"
        ]
        
        for padrao in padroes:
            arquivos_encontrados = glob.glob(padrao)
            arquivos_relatorio.extend(arquivos_encontrados)
    
    if not arquivos_relatorio:
        print("❌ Nenhum arquivo de relatório encontrado!")
        return
    
    print(f"📄 Encontrados {len(arquivos_relatorio)} arquivo(s) de relatório")
    
    # Lê todos os relatórios
    relatorios = []
    for arquivo in arquivos_relatorio:
        print(f"📖 Lendo: {os.path.basename(arquivo)}")
        relatorio = ler_relatorio_json(arquivo)
        if relatorio:
            relatorio['arquivo_origem'] = os.path.basename(arquivo)
            relatorios.append(relatorio)
    
    if not relatorios:
        print("❌ Nenhum relatório válido encontrado!")
        return
    
    # Gera HTML
    print("🔨 Gerando relatório HTML...")
    html_content = gerar_html_relatorio(relatorios)
    
    # Salva arquivo na nova estrutura
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    nome_arquivo = f"relatorio_final_{timestamp}.html"
    
    # Usa o gerenciador de relatórios para salvar
    caminho_salvo = relatorio_manager.salvar_relatorio_html(
        html_content, 
        'finais', 
        nome_arquivo
    )
    
    if caminho_salvo:
        print(f"✅ Relatório salvo como: {caminho_salvo}")
        
        # Abre o arquivo automaticamente
        try:
            os.startfile(caminho_salvo)
            print("🌐 Relatório aberto no navegador")
        except:
            print("ℹ️ Abra o arquivo manualmente no navegador")
    else:
        print("❌ Erro ao salvar relatório!")

if __name__ == "__main__":
    main()