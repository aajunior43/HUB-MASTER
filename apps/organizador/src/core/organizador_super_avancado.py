#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Organizador Super Avançado com IA
Sistema de organização de arquivos usando Google Gemini para detecção inteligente
"""

import os
import sys
import json
import shutil
from datetime import datetime
from pathlib import Path
import re
import logging
from typing import Dict, List, Optional

# Adiciona o diretório utils ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'utils'))
from relatorio_manager import relatorio_manager

class OrganizadorSuperAvancado:
    def __init__(self, diretorio_origem: str, diretorio_destino: str):
        """Inicializa organizador super avançado"""
        self.diretorio_origem = Path(diretorio_origem)
        self.diretorio_destino = Path(diretorio_destino)
        self.setup_logging()

        # Padrões SUPER AVANÇADOS baseados em dados reais
        self.padroes = {
            # === DATAS ===
            'data_mm_yyyy': re.compile(r'(\d{1,2})[\/\-\.](\d{4})', re.IGNORECASE),
            'data_mm_yy': re.compile(r'(\d{1,2})[\/\-\.](\d{2})', re.IGNORECASE),
            'data_yyyy_mm': re.compile(r'(\d{4})[\/\-\.](\d{1,2})', re.IGNORECASE),
            'data_yyyymm': re.compile(r'(\d{4})(\d{2})', re.IGNORECASE),
            'data_timestamp': re.compile(r'(\d{4})-(\d{2})-(\d{2})', re.IGNORECASE),
            'data_timestamp_completo': re.compile(r'(\d{4})-(\d{2})-(\d{2})-\d{2}-\d{2}-\d{2}', re.IGNORECASE),

            # === MESES ===
            'mes_nome_completo': re.compile(r'(JANEIRO|FEVEREIRO|MARÇO|MARCO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)', re.IGNORECASE),
            'mes_nome_abrev': re.compile(r'(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)', re.IGNORECASE),

            # === CONTAS BANCÁRIAS - SUPER EXPANDIDAS ===
            'conta_inicio_mes': re.compile(r'^(\d{4,8}[-]?[A-Z0-9])\s+(JANEIRO|FEVEREIRO|MARÇO|MARCO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)', re.IGNORECASE),
            'conta_inicio_mes_abrev': re.compile(r'^(\d{4,8}[-]?[A-Z0-9])\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)', re.IGNORECASE),
            'conta_mes_inicio': re.compile(r'^(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4,8}[-]?[A-Z0-9])', re.IGNORECASE),
            'conta_ext_simples': re.compile(r'^EXT\s+(\d+[-]?\w*)', re.IGNORECASE),
            'conta_ext': re.compile(r'EXT\w*\s+\w*\s*(\d+[-]?\w*)', re.IGNORECASE),
            'conta_hifen': re.compile(r'(\d{3,8}[-]\d{1})', re.IGNORECASE),
            'conta_hifen_letra': re.compile(r'(\d{3,8}[-][A-Z0-9]{1})', re.IGNORECASE),
            'conta_hifen_espaco': re.compile(r'(\d{4,8}[-]\s*[A-Z0-9])', re.IGNORECASE),
            'conta_extrato': re.compile(r'[Ee]xtrato\s*(\d+)', re.IGNORECASE),
            'conta_extrato_longo': re.compile(r'[Ee]xtrato(\d{8,})', re.IGNORECASE),
            'conta_caixa': re.compile(r'CAIXA\w*\s+\w*\s+(\d+[-]?\w*)', re.IGNORECASE),
            'conta_banco': re.compile(r'(?:BANCO|CONTA|CC|AG)\s*(\d+[-]?\w*)', re.IGNORECASE),
            'conta_gfi': re.compile(r'GFI(\d+)', re.IGNORECASE),
            'conta_timestamp_longo': re.compile(r'(\d{15,})', re.IGNORECASE),
            'conta_codigo_data': re.compile(r'(\d{8,12})(?=\d{4})', re.IGNORECASE),
            'conta_simples': re.compile(r'(?<![\d])(\d{4,8})(?![\d])', re.IGNORECASE),

            # === NOVOS PADRÕES AVANÇADOS ===
            'conta_prefixo_037': re.compile(r'(\d{21})', re.IGNORECASE),  # 037550146000729800451
            'conta_prefixo_375': re.compile(r'(375\d{13})', re.IGNORECASE),  # 3755000600647051

            # === TIPOS DE CONTA ===
            'tipo_investimento': re.compile(r'(INVEST|INEST)', re.IGNORECASE),
            'tipo_poupanca': re.compile(r'(POUP|POUPANÇA)', re.IGNORECASE),
            'tipo_corrente': re.compile(r'(CORRENTE|CC)', re.IGNORECASE),

            # === BANCOS ===
            'banco_caixa': re.compile(r'(CAIXA)', re.IGNORECASE),
            'banco_bb': re.compile(r'(BANCO.DO.BRASIL|BB)', re.IGNORECASE),
            'banco_itau': re.compile(r'(ITAU|ITAÚ)', re.IGNORECASE),
            'banco_bradesco': re.compile(r'(BRADESCO)', re.IGNORECASE),
            'banco_santander': re.compile(r'(SANTANDER)', re.IGNORECASE),

            # === ANOS ===
            'ano_4digitos': re.compile(r'(20\d{2})', re.IGNORECASE),
            'ano_2digitos': re.compile(r'(\d{2})(?=\D|$)', re.IGNORECASE),
        }

        # Mapeamento de meses
        self.meses_nomes = {
            'JANEIRO': '01', 'JAN': '01',
            'FEVEREIRO': '02', 'FEV': '02',
            'MARÇO': '03', 'MARCO': '03', 'MAR': '03',
            'ABRIL': '04', 'ABR': '04',
            'MAIO': '05', 'MAI': '05',
            'JUNHO': '06', 'JUN': '06',
            'JULHO': '07', 'JUL': '07',
            'AGOSTO': '08', 'AGO': '08',
            'SETEMBRO': '09', 'SET': '09',
            'OUTUBRO': '10', 'OUT': '10',
            'NOVEMBRO': '11', 'NOV': '11',
            'DEZEMBRO': '12', 'DEZ': '12'
        }

        # Bancos conhecidos
        self.bancos_conhecidos = {
            'CAIXA': 'CAIXA',
            'BB': 'BANCO_DO_BRASIL',
            'ITAU': 'ITAU',
            'BRADESCO': 'BRADESCO',
            'SANTANDER': 'SANTANDER'
        }

        # Tipos de conta
        self.tipos_conta = {
            'INVEST': 'INVESTIMENTO',
            'INEST': 'INVESTIMENTO',
            'POUP': 'POUPANCA',
            'CC': 'CORRENTE'
        }

        self.stats = {
            'total_arquivos': 0,
            'processados': 0,
            'erros': 0,
            'data_encontrada': 0,
            'conta_encontrada': 0,
            'banco_detectado': 0,
            'tipo_detectado': 0
        }

    def setup_logging(self):
        """Configura logging"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('organizador_super.log', encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def detectar_banco(self, texto: str) -> Dict:
        """Detecta banco/instituição financeira"""
        texto_upper = texto.upper()

        for padrao_nome in ['banco_caixa', 'banco_bb', 'banco_itau', 'banco_bradesco', 'banco_santander']:
            match = self.padroes[padrao_nome].search(texto_upper)
            if match:
                banco_detectado = match.group(1)
                banco_padronizado = self.bancos_conhecidos.get(banco_detectado.upper(), banco_detectado)
                return {
                    'banco': banco_padronizado,
                    'original': banco_detectado,
                    'encontrado': True
                }

        return {'banco': None, 'original': None, 'encontrado': False}

    def detectar_tipo_conta(self, texto: str) -> Dict:
        """Detecta tipo de conta (corrente, poupança, investimento)"""
        texto_upper = texto.upper()

        for padrao_nome in ['tipo_investimento', 'tipo_poupanca', 'tipo_corrente']:
            match = self.padroes[padrao_nome].search(texto_upper)
            if match:
                tipo_detectado = match.group(1)
                tipo_padronizado = self.tipos_conta.get(tipo_detectado.upper(), tipo_detectado)
                return {
                    'tipo': tipo_padronizado,
                    'original': tipo_detectado,
                    'encontrado': True
                }

        return {'tipo': 'PADRAO', 'original': None, 'encontrado': False}

    def detectar_data(self, texto: str, caminho_completo: str = "") -> Dict:
        """Detecta mês e ano no texto usando múltiplos padrões"""
        texto_completo = f"{texto} {caminho_completo}".upper()

        mes = None
        ano = None

        # 1. Busca mês por nome
        for padrao_nome in ['mes_nome_completo', 'mes_nome_abrev']:
            match = self.padroes[padrao_nome].search(texto_completo)
            if match:
                nome_mes = match.group(1).upper()
                mes = self.meses_nomes.get(nome_mes)
                if mes:
                    break

        # 2. Busca ano
        match = self.padroes['ano_4digitos'].search(texto_completo)
        if match:
            ano = match.group(1)

        # 3. Busca datas numéricas e timestamps
        padroes_data = [
            ('data_timestamp_completo', [1, 2]),  # YYYY-MM-DD-HH-MM-SS
            ('data_timestamp', [1, 2]),           # YYYY-MM-DD
            ('data_mm_yyyy', [2, 1]),             # MM/YYYY
            ('data_yyyy_mm', [1, 2]),             # YYYY/MM
            ('data_yyyymm', [1, 2]),              # YYYYMM
            ('data_mm_yy', [2, 1])                # MM/YY
        ]

        for padrao_nome, indices in padroes_data:
            if mes and ano:
                break

            match = self.padroes[padrao_nome].search(texto_completo)
            if match:
                ano_idx, mes_idx = indices

                if not ano and len(match.groups()) >= ano_idx:
                    ano_candidato = match.group(ano_idx)
                    if len(ano_candidato) == 2:
                        ano_candidato = f"20{ano_candidato}"
                    ano = ano_candidato

                if not mes and len(match.groups()) >= mes_idx:
                    mes_candidato = match.group(mes_idx).zfill(2)
                    if 1 <= int(mes_candidato) <= 12:
                        mes = mes_candidato

        # Validações
        if mes and not (1 <= int(mes) <= 12):
            mes = None

        if ano and len(ano) == 2:
            ano = f"20{ano}"

        if ano and not (2020 <= int(ano) <= 2030):
            ano = None

        return {
            'mes': mes,
            'ano': ano,
            'encontrado': bool(mes and ano)
        }

    def detectar_conta(self, texto: str) -> Dict:
        """Detecta número da conta usando múltiplos padrões"""
        texto_upper = texto.upper()
        conta = None
        metodo = None

        # Lista de padrões em ordem de prioridade - SUPER EXPANDIDA
        padroes_conta = [
            ('conta_prefixo_037', 'PREFIXO_037'),
            ('conta_prefixo_375', 'PREFIXO_375'),
            ('conta_inicio_mes', 'INICIO_MES'),
            ('conta_inicio_mes_abrev', 'INICIO_MES_ABREV'),
            ('conta_mes_inicio', 'MES_INICIO'),
            ('conta_ext_simples', 'EXT_SIMPLES'),
            ('conta_ext', 'EXT'),
            ('conta_caixa', 'CAIXA'),
            ('conta_extrato_longo', 'EXTRATO_LONGO'),
            ('conta_extrato', 'EXTRATO'),
            ('conta_gfi', 'GFI'),
            ('conta_banco', 'BANCO'),
            ('conta_hifen_espaco', 'HIFEN_ESPACO'),
            ('conta_hifen', 'HIFEN'),
            ('conta_hifen_letra', 'HIFEN_LETRA'),
            ('conta_timestamp_longo', 'TIMESTAMP_LONGO'),
            ('conta_codigo_data', 'CODIGO_DATA'),
            ('conta_simples', 'SIMPLES')
        ]

        for padrao_nome, metodo_nome in padroes_conta:
            match = self.padroes[padrao_nome].search(texto_upper)
            if match:
                # Tratamento especial para diferentes padrões
                if padrao_nome == 'conta_mes_inicio':
                    conta_bruta = match.group(2)
                elif padrao_nome in ['conta_inicio_mes', 'conta_inicio_mes_abrev']:
                    conta_bruta = match.group(1)
                else:
                    conta_bruta = match.group(1)

                # Limpa a conta
                conta = re.sub(r'[^\w]', '', conta_bruta)
                metodo = metodo_nome
                break

        # Validações
        if conta and len(conta) < 3:
            conta = None
            metodo = None

        return {
            'conta': conta,
            'metodo': metodo,
            'encontrado': bool(conta)
        }

    def classificar_arquivo(self, arquivo: Path, deteccoes: Dict) -> Dict:
        """Classifica o arquivo com informações avançadas"""

        # Detecta banco
        banco_info = self.detectar_banco(arquivo.name)

        # Detecta tipo de conta
        tipo_info = self.detectar_tipo_conta(arquivo.name)

        # Determina prioridade baseada na qualidade da detecção
        score = 0
        if deteccoes['data']['encontrado']:
            score += 50
        if deteccoes['conta']['encontrado']:
            score += 40
        if banco_info['encontrado']:
            score += 5
        if tipo_info['encontrado']:
            score += 5

        # Sugere nome de arquivo otimizado
        mes = deteccoes['data']['mes']
        ano = deteccoes['data']['ano']
        conta = deteccoes['conta']['conta']

        tipo_arquivo = "PDF" if arquivo.suffix.lower() == ".pdf" else "OFX"
        tipo_conta = tipo_info['tipo'] if tipo_info['encontrado'] else ""
        banco = banco_info['banco'] if banco_info['encontrado'] else ""

        # Nome super detalhado
        nome_partes = [f"{ano}-{mes}", conta, tipo_conta, banco, tipo_arquivo]
        nome_partes = [p for p in nome_partes if p]  # Remove vazios
        nome_novo = "_".join(nome_partes) + arquivo.suffix.lower()

        return {
            'banco': banco_info,
            'tipo_conta': tipo_info,
            'score': score,
            'nome_sugerido': nome_novo,
            'categoria': self.categorizar_por_score(score)
        }

    def categorizar_por_score(self, score: int) -> str:
        """Categoriza arquivo baseado no score de confiança"""
        if score >= 90:
            return "EXCELENTE"
        elif score >= 70:
            return "BOM"
        elif score >= 50:
            return "REGULAR"
        else:
            return "PROBLEMATICO"

    def processar_arquivo(self, arquivo: Path, modo_teste: bool = True) -> Dict:
        """Processa um arquivo individual com detecção super avançada"""
        resultado = {
            'arquivo_original': str(arquivo),
            'nome_original': arquivo.name,
            'sucesso': False,
            'erro': None,
            'detalhes': {},
            'classificacao': {}
        }

        try:
            self.logger.info(f"Processando: {arquivo.name}")

            # Detecta data
            deteccao_data = self.detectar_data(arquivo.name, str(arquivo.parent))

            # Detecta conta
            deteccao_conta = self.detectar_conta(arquivo.name)

            # Classificação avançada
            classificacao = self.classificar_arquivo(arquivo, {
                'data': deteccao_data,
                'conta': deteccao_conta
            })

            resultado['detalhes'] = {
                'data': deteccao_data,
                'conta': deteccao_conta
            }

            resultado['classificacao'] = classificacao

            if not deteccao_data['encontrado']:
                raise Exception("Data não identificada")

            if not deteccao_conta['encontrado']:
                raise Exception("Conta não identificada")

            # Gera estrutura de pastas super organizada
            mes = deteccao_data['mes']
            ano = deteccao_data['ano']
            conta = deteccao_conta['conta']

            # Pasta principal por conta
            pasta_conta = f"CONTA_{conta}"

            # Se detectou banco, adiciona ao nome
            if classificacao['banco']['encontrado']:
                pasta_conta = f"{classificacao['banco']['banco']}_{pasta_conta}"

            # Pasta por data
            meses_nomes = {
                '01': 'JANEIRO', '02': 'FEVEREIRO', '03': 'MARÇO',
                '04': 'ABRIL', '05': 'MAIO', '06': 'JUNHO',
                '07': 'JULHO', '08': 'AGOSTO', '09': 'SETEMBRO',
                '10': 'OUTUBRO', '11': 'NOVEMBRO', '12': 'DEZEMBRO'
            }
            pasta_data = f"{ano}_{mes}_{meses_nomes.get(mes, 'DESCONHECIDO')}"

            # Se detectou tipo, cria subpasta
            if classificacao['tipo_conta']['encontrado'] and classificacao['tipo_conta']['tipo'] != 'PADRAO':
                pasta_tipo = classificacao['tipo_conta']['tipo']
                destino_final = self.diretorio_destino / pasta_conta / pasta_data / pasta_tipo / classificacao['nome_sugerido']
            else:
                destino_final = self.diretorio_destino / pasta_conta / pasta_data / classificacao['nome_sugerido']

            # Controle de duplicatas
            contador = 1
            destino_original = destino_final
            while destino_final.exists():
                nome_base = destino_original.stem
                extensao = destino_original.suffix
                destino_final = destino_original.parent / f"{nome_base}_v{contador:02d}{extensao}"
                contador += 1

            resultado['arquivo_destino'] = str(destino_final)
            resultado['estrutura'] = str(destino_final.relative_to(self.diretorio_destino))

            if not modo_teste:
                # Cria diretórios
                destino_final.parent.mkdir(parents=True, exist_ok=True)

                # Copia arquivo (preserva original)
                shutil.copy2(str(arquivo), str(destino_final))
                resultado['acao'] = 'copiado'
            else:
                resultado['acao'] = 'simulado'

            resultado['sucesso'] = True
            self.stats['processados'] += 1
            self.stats['data_encontrada'] += 1
            self.stats['conta_encontrada'] += 1

            if classificacao['banco']['encontrado']:
                self.stats['banco_detectado'] += 1
            if classificacao['tipo_conta']['encontrado']:
                self.stats['tipo_detectado'] += 1

            self.logger.info(f"SUCESSO: {arquivo.name}")
            self.logger.info(f"  -> {resultado['estrutura']}")
            self.logger.info(f"  Data: {mes}/{ano} | Conta: {conta}")
            self.logger.info(f"  Score: {classificacao['score']} | Categoria: {classificacao['categoria']}")

        except Exception as e:
            resultado['erro'] = str(e)
            self.stats['erros'] += 1
            self.logger.error(f"ERRO: {arquivo.name} - {str(e)}")

        return resultado

    def organizar_arquivos(self, modo_teste: bool = True) -> Dict:
        """Organiza todos os arquivos com sistema super avançado"""
        self.logger.info("=== ORGANIZACAO SUPER AVANCADA ===")
        self.logger.info(f"Origem: {self.diretorio_origem}")
        self.logger.info(f"Destino: {self.diretorio_destino}")
        self.logger.info(f"Modo teste: {modo_teste}")

        # Encontra arquivos
        arquivos = []
        for ext in ['*.pdf', '*.ofx']:
            arquivos.extend(self.diretorio_origem.rglob(ext))

        self.stats['total_arquivos'] = len(arquivos)
        self.logger.info(f"Total de arquivos: {len(arquivos)}")

        relatorio = {
            'total_arquivos': len(arquivos),
            'processados_com_sucesso': 0,
            'erros': 0,
            'detalhes': [],
            'modo_teste': modo_teste,
            'metodo': 'SUPER_AVANCADO',
            'inicio': datetime.now().isoformat(),
            'categorias': {'EXCELENTE': 0, 'BOM': 0, 'REGULAR': 0, 'PROBLEMATICO': 0},
            'bancos_detectados': {},
            'tipos_detectados': {}
        }

        # Processa arquivos
        for i, arquivo in enumerate(arquivos, 1):
            self.logger.info(f"=== {i}/{len(arquivos)} ===")

            resultado = self.processar_arquivo(arquivo, modo_teste)
            relatorio['detalhes'].append(resultado)

            if resultado['sucesso']:
                relatorio['processados_com_sucesso'] += 1

                # Estatísticas de categoria
                categoria = resultado['classificacao']['categoria']
                relatorio['categorias'][categoria] += 1

                # Estatísticas de bancos
                if resultado['classificacao']['banco']['encontrado']:
                    banco = resultado['classificacao']['banco']['banco']
                    relatorio['bancos_detectados'][banco] = relatorio['bancos_detectados'].get(banco, 0) + 1

                # Estatísticas de tipos
                if resultado['classificacao']['tipo_conta']['encontrado']:
                    tipo = resultado['classificacao']['tipo_conta']['tipo']
                    relatorio['tipos_detectados'][tipo] = relatorio['tipos_detectados'].get(tipo, 0) + 1
            else:
                relatorio['erros'] += 1

        relatorio['fim'] = datetime.now().isoformat()
        relatorio['stats'] = self.stats

        self.logger.info("=== ORGANIZACAO SUPER AVANCADA CONCLUIDA ===")
        self.logger.info(f"Sucessos: {relatorio['processados_com_sucesso']}")
        self.logger.info(f"Erros: {relatorio['erros']}")
        self.logger.info(f"Taxa de sucesso: {relatorio['processados_com_sucesso']/len(arquivos)*100:.1f}%")

        return relatorio

def main():
    """Função principal para teste"""
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'config'))

    organizador = OrganizadorSuperAvancado("EXTRATOS", "RESULTADO_SUPER")

    print("ORGANIZADOR SUPER AVANCADO")
    print("=" * 50)

    modo_teste = input("Executar em modo teste? (S/n): ").strip().lower() != 'n'

    relatorio = organizador.organizar_arquivos(modo_teste)

    # Salva relatório na nova estrutura
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    nome_arquivo = f"relatorio_super_{timestamp}.json"
    
    caminho_salvo = relatorio_manager.salvar_relatorio_json(
        relatorio, 
        'organizacoes', 
        nome_arquivo
    )

    print(f"\nTotal: {relatorio['total_arquivos']}")
    print(f"Sucessos: {relatorio['processados_com_sucesso']}")
    print(f"Erros: {relatorio['erros']}")
    print(f"Taxa de sucesso: {relatorio['processados_com_sucesso']/relatorio['total_arquivos']*100:.1f}%")

if __name__ == "__main__":
    main()