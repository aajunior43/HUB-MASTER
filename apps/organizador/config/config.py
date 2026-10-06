# -*- coding: utf-8 -*-
"""
Configurações do Organizador de Extratos
"""

# Configurações de Diretórios
import os
import sys

# Obtém o diretório base do executável ou script
if getattr(sys, 'frozen', False):
    # Se estiver rodando como executável
    BASE_DIR = os.path.dirname(sys.executable)
else:
    # Se estiver rodando como script Python
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Diretórios padrão - serão selecionados pelo usuário na interface
DIRETORIO_BASE_PADRAO = None  # Será selecionado pelo usuário
DIRETORIO_DESTINO_PADRAO = None  # Será selecionado pelo usuário

# Configurações de Nomenclatura
ANO_PADRAO = "2025"
FORMATO_NOME_ARQUIVO = "{ano}-{mes}_{conta}_{tipo}{extensao}"  # Ex: 2025-04_123456_PDF.pdf

# Mapeamento de Meses (pode ser personalizado)
MESES = {
    'JANEIRO': '01', 'FEVEREIRO': '02', 'MARÇO': '03', 'MARCO': '03',
    'ABRIL': '04', 'MAIO': '05', 'JUNHO': '06',
    'JULHO': '07', 'AGOSTO': '08', 'SETEMBRO': '09',
    'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12'
}

# Padrões de Regex para Identificação
PADROES_REGEX = {
    # Para extrair número da conta de arquivos PDF
    'conta_pdf': r'EXT\s+\w+\s+(\d+[-]\d+)',

    # Para extrair número da conta de arquivos OFX com prefixo
    'conta_ofx': r'Extrato(\d+)\.ofx',

    # Para arquivos OFX simples (apenas números)
    'conta_ofx_simples': r'^(\d+)\.ofx$',

    # Para arquivos com padrão "CONTA ANTIGA" ou similar
    'conta_antiga': r'CONTA\s+\w*\s*(\d+)',

    # Para extrair conta de nomes mais complexos
    'conta_geral': r'(\d+[-]?\d*)',

    # Para identificar mês em nomes de pastas
    'mes_pasta': r'(JANEIRO|FEVEREIRO|MARÇO|MARCO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)',

    # Para identificar duplicatas
    'duplicata': r'\s*\(\d+\)$'
}

# Configurações de Logging
LOG_LEVEL = 'INFO'  # DEBUG, INFO, WARNING, ERROR
LOG_FILE = 'organizador_extratos.log'

# Extensões de Arquivo Suportadas
EXTENSOES_SUPORTADAS = ['.pdf', '.ofx']

# Configurações de Estrutura de Diretórios
ESTRUTURA_DIRETORIOS = {
    "2025": {
        "01_JANEIRO": ["PDF", "OFX"],
        "02_FEVEREIRO": ["PDF", "OFX"],
        "03_MARÇO": ["PDF", "OFX"],
        "04_ABRIL": ["PDF", "OFX"],
        "05_MAIO": ["PDF", "OFX"],
        "06_JUNHO": ["PDF", "OFX"],
        "07_JULHO": ["PDF", "OFX"],
        "08_AGOSTO": ["PDF", "OFX"],
        "09_SETEMBRO": ["PDF", "OFX"],
        "10_OUTUBRO": ["PDF", "OFX"],
        "11_NOVEMBRO": ["PDF", "OFX"],
        "12_DEZEMBRO": ["PDF", "OFX"]
    }
}

# Configurações de Relatórios
GERAR_RELATORIO_HTML = True
INCLUIR_PREVIEW_ARQUIVOS = True
ABRIR_RELATORIO_AUTOMATICAMENTE = True
NOME_RELATORIO_HTML = "relatorio_organizacao.html"

# Estrutura de Pastas para Relatórios
DIRETORIO_RELATORIOS = os.path.join(BASE_DIR, "relatorios")
ESTRUTURA_RELATORIOS = {
    "html": "relatorios/html",           # Relatórios HTML
    "json": "relatorios/json",           # Relatórios JSON
    "simulacoes": "relatorios/simulacoes", # Relatórios de simulação
    "organizacoes": "relatorios/organizacoes", # Relatórios de organização real
    "finais": "relatorios/finais"        # Relatórios finais consolidados
}

# Configurações da API do Google Gemini
GEMINI_API_KEY = "AIzaSyAIlVCJTK_FRLAifieKjDSBdzh2IY7d6MA"  # Configurado via script
GEMINI_MODEL = "gemini-1.5-flash"  # Modelo do Gemini a ser usado
USAR_GEMINI = True  # Se True, usa Gemini quando disponível; se False, usa apenas análise local
GEMINI_FALLBACK = True  # Se True, usa análise local quando Gemini falhar
GEMINI_CACHE_ENABLED = True  # Se True, mantém cache das análises do Gemini
GEMINI_MIN_CONFIDENCE = 70  # Confiança mínima para aceitar resultado do Gemini (0-100)

# Configurações de Segurança
CRIAR_BACKUP_ANTES_MOVER = False  # Se True, cria backup antes de mover arquivos
DIRETORIO_BACKUP = "BACKUP_EXTRATOS"

# Configurações de Processamento
MODO_TESTE_PADRAO = True  # Sempre inicia em modo teste por segurança
CONFIRMAR_OPERACOES_REAIS = True  # Pede confirmação antes de operações reais

# Configurações de Interface
MOSTRAR_PROGRESSO = True  # Mostra barra de progresso durante processamento
CORES_TERMINAL = True  # Usa cores no terminal (se suportado)

# Configurações Avançadas
IGNORAR_ARQUIVOS_OCULTOS = True
PROCESSAR_SUBDIRETORIOS = True
LIMITE_TAMANHO_ARQUIVO_MB = 100  # Ignora arquivos maiores que este limite (0 = sem limite)

# Configurações de Validação
VALIDAR_ESTRUTURA_OFX = False  # Se True, valida se arquivos OFX são válidos
VALIDAR_ESTRUTURA_PDF = False  # Se True, valida se arquivos PDF são válidos

# Mensagens Personalizadas
MENSAGENS = {
    'inicio': "🏦 Organizador de Extratos Bancários iniciado",
    'fim_teste': "✅ Simulação concluída com sucesso",
    'fim_real': "✅ Organização concluída com sucesso",
    'erro_geral': "❌ Erro durante o processamento",
    'confirmacao_real': "⚠️  ATENÇÃO: Esta operação irá MOVER os arquivos. Confirma?",
    'cancelado': "🚫 Operação cancelada pelo usuário"
}