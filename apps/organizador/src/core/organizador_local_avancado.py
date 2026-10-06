#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Organizador Local Avançado
Sistema de organização de arquivos com detecção inteligente e relatórios detalhados
"""

import os
import sys
import re
import shutil
import json
from datetime import datetime
from pathlib import Path
import logging
from typing import Dict, List, Optional
from functools import lru_cache
import hashlib

# Adiciona o diretório utils ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'utils'))
from relatorio_manager import relatorio_manager

class OrganizadorLocalAvancado:
    def __init__(self, diretorio_origem: str, diretorio_destino: str):
        """Inicializa organizador local avançado com validações"""
        # Valida e sanitiza inputs
        self.diretorio_origem = self._validar_diretorio(diretorio_origem, "origem")
        self.diretorio_destino = self._validar_diretorio(diretorio_destino, "destino")

        # Verifica se origem e destino não são iguais
        if self.diretorio_origem.resolve() == self.diretorio_destino.resolve():
            raise ValueError("Diretório de origem e destino não podem ser iguais")

        self.setup_logging()

        # Compila padrões regex uma vez para melhor performance
        self._compilar_padroes()

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

        self.stats = {
            'total_arquivos': 0,
            'processados': 0,
            'erros': 0,
            'data_encontrada': 0,
            'conta_encontrada': 0
        }

        # Cache para detecções
        self._cache_deteccao = {}

    def _compilar_padroes(self):
        """Compila padrões regex para melhor performance"""
        self.padroes = {
            # Datas em vários formatos
            'data_mm_yyyy': re.compile(r'(\d{1,2})[\/\-\.](\d{4})', re.IGNORECASE),
            'data_mm_yy': re.compile(r'(\d{1,2})[\/\-\.](\d{2})', re.IGNORECASE),
            'data_yyyy_mm': re.compile(r'(\d{4})[\/\-\.](\d{1,2})', re.IGNORECASE),
            'data_yyyymm': re.compile(r'(\d{4})(\d{2})', re.IGNORECASE),
            'data_timestamp': re.compile(r'(\d{4})-(\d{2})-(\d{2})', re.IGNORECASE),  # 2025-07-02

            # Meses por nome
            'mes_nome_completo': re.compile(r'(JANEIRO|FEVEREIRO|MARÇO|MARCO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)', re.IGNORECASE),
            'mes_nome_abrev': re.compile(r'(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)', re.IGNORECASE),

            # Contas bancárias - padrões diversos MELHORADOS
            'conta_inicio_mes': re.compile(r'^(\d{4,8}[-]?[A-Z0-9])\s+(JANEIRO|FEVEREIRO|MARÇO|MARCO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)', re.IGNORECASE),  # 18417-9 ABRIL
            'conta_inicio_mes_abrev': re.compile(r'^(\d{4,8}[-]?[A-Z0-9])\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)', re.IGNORECASE),  # 28758-X MAIO
            'conta_mes_inicio': re.compile(r'^(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4,8}[-]?[A-Z0-9])', re.IGNORECASE),  # FEV 28142-5
            'conta_hifen': re.compile(r'(\d{3,8}[-]\d{1})', re.IGNORECASE),  # 12345-6
            'conta_hifen_letra': re.compile(r'(\d{3,8}[-][A-Z0-9]{1})', re.IGNORECASE),  # 12345-X
            'conta_hifen_espaco': re.compile(r'(\d{4,8}[-]\s*[A-Z0-9])', re.IGNORECASE),  # 22989- X
            'conta_simples': re.compile(r'(?<![\d])(\d{4,8})(?![\d])', re.IGNORECASE),  # 123456
            'conta_ext': re.compile(r'EXT\w*\s+\w*\s*(\d+[-]?\w*)', re.IGNORECASE),  # EXT ABRIL 12345-6
            'conta_ext_simples': re.compile(r'^EXT\s+(\d+[-]?\w*)', re.IGNORECASE),  # EXT 4049-5
            'conta_extrato': re.compile(r'[Ee]xtrato\s*(\d+)', re.IGNORECASE),  # Extrato123456
            'conta_extrato_longo': re.compile(r'[Ee]xtrato(\d{8,})', re.IGNORECASE),  # Extrato6769113603
            'conta_caixa': re.compile(r'CAIXA\w*\s+\w*\s+(\d+[-]?\w*)', re.IGNORECASE),  # CAIXA JAN 123-4
            'conta_banco': re.compile(r'(?:BANCO|CONTA|CC|AG)\s*(\d+[-]?\w*)', re.IGNORECASE),
            'conta_codigo_data': re.compile(r'(\d{8,12})(?=\d{4})', re.IGNORECASE),  # códigos seguidos de data
            'conta_gfi': re.compile(r'GFI(\d+)', re.IGNORECASE),  # GFI625082025
            'conta_timestamp_longo': re.compile(r'(\d{15,})', re.IGNORECASE),  # números muito longos em timestamps

            # Anos
            'ano_4digitos': re.compile(r'(20\d{2})', re.IGNORECASE),  # 2023, 2024, etc
            'ano_2digitos': re.compile(r'(\d{2})(?=\D|$)', re.IGNORECASE),  # 23, 24
        }

    def _validar_diretorio(self, caminho: str, tipo: str) -> Path:
        """Valida e sanitiza caminho de diretório"""
        if not caminho or not isinstance(caminho, str):
            raise ValueError(f"Caminho {tipo} inválido: {caminho}")

        # Remove espaços e normaliza
        caminho = caminho.strip()

        # Converte para Path
        path_obj = Path(caminho)

        # Verifica se existe (cria destino se não existir)
        if tipo == "origem":
            if not path_obj.exists():
                raise FileNotFoundError(f"Diretório de origem não existe: {caminho}")
            if not path_obj.is_dir():
                raise NotADirectoryError(f"Caminho de origem não é um diretório: {caminho}")
        elif tipo == "destino":
            # Cria diretório de destino se não existir
            path_obj.mkdir(parents=True, exist_ok=True)

        # Verifica permissões
        if not os.access(path_obj, os.R_OK):
            raise PermissionError(f"Sem permissão de leitura no diretório {tipo}: {caminho}")

        if tipo == "destino" and not os.access(path_obj, os.W_OK):
            raise PermissionError(f"Sem permissão de escrita no diretório {tipo}: {caminho}")

        return path_obj.resolve()  # Retorna caminho absoluto

    def setup_logging(self):
        """Configura logging com rotação de arquivos"""
        from logging.handlers import RotatingFileHandler

        # Remove handlers existentes para evitar duplicação
        for handler in logging.root.handlers[:]:
            logging.root.removeHandler(handler)

        # Cria diretório de logs se não existir
        log_dir = Path('logs')
        log_dir.mkdir(exist_ok=True)

        # Handler com rotação (max 5MB, mantém 5 arquivos)
        file_handler = RotatingFileHandler(
            log_dir / 'organizador_local.log',
            maxBytes=5*1024*1024,
            backupCount=5,
            encoding='utf-8'
        )
        file_handler.setLevel(logging.DEBUG)

        # Handler para console
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)

        # Formato detalhado
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)

        # Configura logger
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.DEBUG)
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)

    def _gerar_cache_key(self, texto: str, contexto: str = "") -> str:
        """Gera chave única para cache"""
        conteudo = f"{texto}|{contexto}"
        return hashlib.md5(conteudo.encode()).hexdigest()

    def detectar_data(self, texto: str, caminho_completo: str = "", arquivo_path: str = "") -> Dict:
        """Detecta mês e ano no texto usando múltiplos padrões com cache"""
        # Verifica cache
        cache_key = self._gerar_cache_key(texto, caminho_completo)
        if cache_key in self._cache_deteccao:
            cached = self._cache_deteccao[cache_key]
            if 'data' in cached:
                return cached['data']

        # Inclui todo o caminho para pegar ano da pasta pai
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

        # 3. Busca datas numéricas (MM/YYYY, MM/YY, etc)
        if not mes or not ano:
            # MM/YYYY ou MM-YYYY
            match = self.padroes['data_mm_yyyy'].search(texto_completo)
            if match:
                mes_num = match.group(1).zfill(2)
                ano_encontrado = match.group(2)
                if not mes and 1 <= int(mes_num) <= 12:
                    mes = mes_num
                if not ano:
                    ano = ano_encontrado

            # MM/YY
            if not mes or not ano:
                match = self.padroes['data_mm_yy'].search(texto_completo)
                if match:
                    mes_num = match.group(1).zfill(2)
                    ano_curto = match.group(2)
                    if not mes and 1 <= int(mes_num) <= 12:
                        mes = mes_num
                    if not ano:
                        # Assume 20XX para anos curtos
                        ano = f"20{ano_curto}"

            # YYYY/MM
            if not mes or not ano:
                match = self.padroes['data_yyyy_mm'].search(texto_completo)
                if match:
                    ano_encontrado = match.group(1)
                    mes_num = match.group(2).zfill(2)
                    if not ano:
                        ano = ano_encontrado
                    if not mes and 1 <= int(mes_num) <= 12:
                        mes = mes_num

            # YYYYMM
            if not mes or not ano:
                match = self.padroes['data_yyyymm'].search(texto_completo)
                if match:
                    ano_encontrado = match.group(1)
                    mes_num = match.group(2)
                    if not ano:
                        ano = ano_encontrado
                    if not mes and 1 <= int(mes_num) <= 12:
                        mes = mes_num

            # Timestamp YYYY-MM-DD
            if not mes or not ano:
                match = self.padroes['data_timestamp'].search(texto_completo)
                if match:
                    ano_encontrado = match.group(1)
                    mes_num = match.group(2)
                    if not ano:
                        ano = ano_encontrado
                    if not mes and 1 <= int(mes_num) <= 12:
                        mes = mes_num

        # Validações
        if mes and not (1 <= int(mes) <= 12):
            mes = None

        if ano and len(ano) == 2:
            ano = f"20{ano}"

        if ano and not (2020 <= int(ano) <= 2030):
            ano = None

        # 4. Se não encontrou data e é arquivo OFX, tenta analisar conteúdo
        if (not mes or not ano) and arquivo_path and arquivo_path.lower().endswith('.ofx'):
            try:
                data_ofx = self._analisar_conteudo_ofx(arquivo_path)
                if data_ofx:
                    if not mes and data_ofx.get('mes'):
                        mes = data_ofx['mes']
                    if not ano and data_ofx.get('ano'):
                        ano = data_ofx['ano']
            except Exception as e:
                self.logger.debug(f"Erro ao analisar conteúdo OFX {arquivo_path}: {e}")

        resultado = {
            'mes': mes,
            'ano': ano,
            'encontrado': bool(mes and ano)
        }

        # Salva no cache
        if cache_key not in self._cache_deteccao:
            self._cache_deteccao[cache_key] = {}
        self._cache_deteccao[cache_key]['data'] = resultado

        return resultado

    def detectar_conta(self, texto: str) -> Dict:
        """Detecta número da conta usando múltiplos padrões com cache"""
        # Verifica cache
        cache_key = self._gerar_cache_key(texto, "conta")
        if cache_key in self._cache_deteccao:
            cached = self._cache_deteccao[cache_key]
            if 'conta' in cached:
                return cached['conta']

        texto_upper = texto.upper()
        conta = None
        metodo = None

        # Lista de padrões em ordem de prioridade - MELHORADA
        padroes_conta = [
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
                    conta_bruta = match.group(2)  # Conta está no segundo grupo
                elif padrao_nome in ['conta_inicio_mes', 'conta_inicio_mes_abrev']:
                    conta_bruta = match.group(1)  # Conta está no primeiro grupo
                else:
                    conta_bruta = match.group(1)

                # Limpa a conta
                conta = re.sub(r'[^\w]', '', conta_bruta)
                metodo = metodo_nome
                break

        # Validações
        if conta and len(conta) < 3:  # Conta muito curta
            conta = None
            metodo = None

        resultado = {
            'conta': conta,
            'metodo': metodo,
            'encontrado': bool(conta)
        }

        # Salva no cache
        if cache_key not in self._cache_deteccao:
            self._cache_deteccao[cache_key] = {}
        self._cache_deteccao[cache_key]['conta'] = resultado

        return resultado

    def _analisar_conteudo_ofx(self, arquivo_path: str) -> Dict:
        """Analisa o conteúdo de um arquivo OFX para extrair informações de data"""
        try:
            with open(arquivo_path, 'r', encoding='utf-8', errors='ignore') as f:
                conteudo = f.read(2048)  # Lê apenas os primeiros 2KB para performance
            
            mes = None
            ano = None
            
            # Padrões específicos para arquivos OFX
            padroes_ofx = {
                # Data no formato YYYYMMDD (comum em OFX)
                'dtstart': re.compile(r'<DTSTART>(\d{8})', re.IGNORECASE),
                'dtend': re.compile(r'<DTEND>(\d{8})', re.IGNORECASE),
                'dtserver': re.compile(r'<DTSERVER>(\d{8})', re.IGNORECASE),
                'dtacctup': re.compile(r'<DTACCTUP>(\d{8})', re.IGNORECASE),
                # Data no formato YYYYMMDDHHMMSS
                'dtstart_full': re.compile(r'<DTSTART>(\d{4})(\d{2})(\d{2})\d{6}', re.IGNORECASE),
                'dtend_full': re.compile(r'<DTEND>(\d{4})(\d{2})(\d{2})\d{6}', re.IGNORECASE),
                'dtserver_full': re.compile(r'<DTSERVER>(\d{4})(\d{2})(\d{2})\d{6}', re.IGNORECASE),
                # Período de extrato
                'periodo': re.compile(r'(\d{1,2})[\/\-](\d{4})', re.IGNORECASE),
                # Data em formato brasileiro
                'data_br': re.compile(r'(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})', re.IGNORECASE),
            }
            
            # Tenta extrair data dos campos OFX
            for padrao_nome, padrao in padroes_ofx.items():
                match = padrao.search(conteudo)
                if match:
                    if padrao_nome in ['dtstart', 'dtend', 'dtserver', 'dtacctup']:
                        # Formato YYYYMMDD
                        data_str = match.group(1)
                        if len(data_str) == 8:
                            ano_encontrado = data_str[:4]
                            mes_encontrado = data_str[4:6]
                            if 2020 <= int(ano_encontrado) <= 2030 and 1 <= int(mes_encontrado) <= 12:
                                ano = ano_encontrado
                                mes = mes_encontrado.zfill(2)
                                break
                    elif padrao_nome in ['dtstart_full', 'dtend_full', 'dtserver_full']:
                        # Formato YYYYMMDDHHMMSS
                        ano_encontrado = match.group(1)
                        mes_encontrado = match.group(2)
                        if 2020 <= int(ano_encontrado) <= 2030 and 1 <= int(mes_encontrado) <= 12:
                            ano = ano_encontrado
                            mes = mes_encontrado.zfill(2)
                            break
                    elif padrao_nome == 'periodo':
                        # MM/YYYY
                        mes_encontrado = match.group(1).zfill(2)
                        ano_encontrado = match.group(2)
                        if 1 <= int(mes_encontrado) <= 12 and 2020 <= int(ano_encontrado) <= 2030:
                            mes = mes_encontrado
                            ano = ano_encontrado
                            break
                    elif padrao_nome == 'data_br':
                        # DD/MM/YYYY
                        dia = match.group(1)
                        mes_encontrado = match.group(2).zfill(2)
                        ano_encontrado = match.group(3)
                        if 1 <= int(mes_encontrado) <= 12 and 2020 <= int(ano_encontrado) <= 2030:
                            mes = mes_encontrado
                            ano = ano_encontrado
                            break
            
            return {
                'mes': mes,
                'ano': ano,
                'encontrado': bool(mes and ano)
            }
            
        except Exception as e:
            self.logger.debug(f"Erro ao analisar conteúdo OFX: {e}")
            return {}

    def processar_arquivo(self, arquivo: Path, modo_teste: bool = True) -> Dict:
        """Processa um arquivo individual com validações robustas"""
        resultado = {
            'arquivo_original': str(arquivo),
            'nome_original': arquivo.name,
            'sucesso': False,
            'erro': None,
            'detalhes': {},
            'avisos': []
        }

        try:
            # Validações iniciais
            if not arquivo.exists():
                raise FileNotFoundError(f"Arquivo não encontrado: {arquivo}")

            if not arquivo.is_file():
                raise ValueError(f"Caminho não é um arquivo válido: {arquivo}")

            # Verifica tamanho do arquivo
            tamanho_mb = arquivo.stat().st_size / (1024 * 1024)
            if tamanho_mb > 100:
                resultado['avisos'].append(f"Arquivo grande: {tamanho_mb:.2f}MB")

            # Verifica permissões
            if not os.access(arquivo, os.R_OK):
                raise PermissionError(f"Sem permissão de leitura: {arquivo}")

            self.logger.info(f"Processando: {arquivo.name}")

            # Detecta data - passa caminho completo para detectar ano
            deteccao_data = self.detectar_data(arquivo.name, str(arquivo.parent), str(arquivo))

            # Detecta conta
            deteccao_conta = self.detectar_conta(arquivo.name)

            resultado['detalhes'] = {
                'data': deteccao_data,
                'conta': deteccao_conta
            }

            if not deteccao_data['encontrado']:
                raise Exception("Data não identificada")

            if not deteccao_conta['encontrado']:
                raise Exception("Conta não identificada")

            # Gera nome padronizado
            mes = deteccao_data['mes']
            ano = deteccao_data['ano']
            conta = deteccao_conta['conta']

            tipo = "PDF" if arquivo.suffix.lower() == ".pdf" else "OFX"
            nome_novo = f"{ano}-{mes}_{conta}_{tipo}{arquivo.suffix.lower()}"

            # Define estrutura CONTA/ANO_MES
            meses_nomes = {
                '01': 'JANEIRO', '02': 'FEVEREIRO', '03': 'MARÇO',
                '04': 'ABRIL', '05': 'MAIO', '06': 'JUNHO',
                '07': 'JULHO', '08': 'AGOSTO', '09': 'SETEMBRO',
                '10': 'OUTUBRO', '11': 'NOVEMBRO', '12': 'DEZEMBRO'
            }

            pasta_conta = f"CONTA_{conta}"
            pasta_data = f"{ano}_{mes}_{meses_nomes.get(mes, 'DESCONHECIDO')}"
            destino_final = self.diretorio_destino / pasta_conta / pasta_data / nome_novo

            # Verifica duplicatas
            contador = 1
            destino_original = destino_final
            while destino_final.exists():
                nome_base = destino_original.stem
                extensao = destino_original.suffix
                destino_final = destino_original.parent / f"{nome_base}_v{contador:02d}{extensao}"
                contador += 1

            resultado['arquivo_destino'] = str(destino_final)
            resultado['estrutura'] = f"{pasta_conta}/{pasta_data}"

            if not modo_teste:
                try:
                    # Cria diretórios com tratamento de erro
                    destino_final.parent.mkdir(parents=True, exist_ok=True)

                    # Verifica espaço em disco
                    stat = os.statvfs(destino_final.parent) if hasattr(os, 'statvfs') else None
                    if stat:
                        espaco_livre = stat.f_bavail * stat.f_frsize / (1024 * 1024 * 1024)
                        if espaco_livre < 1:
                            raise IOError(f"Espaço em disco insuficiente: {espaco_livre:.2f}GB")

                    # Copia arquivo (preserva original) com verificação
                    shutil.copy2(str(arquivo), str(destino_final))

                    # Verifica integridade da cópia
                    if arquivo.stat().st_size != destino_final.stat().st_size:
                        destino_final.unlink()  # Remove cópia defeituosa
                        raise IOError("Falha na verificação de integridade da cópia")

                    resultado['acao'] = 'copiado'
                    resultado['tamanho_bytes'] = arquivo.stat().st_size

                except (OSError, IOError, PermissionError) as e:
                    raise Exception(f"Erro ao copiar arquivo: {str(e)}")
            else:
                resultado['acao'] = 'simulado'

            resultado['sucesso'] = True
            self.stats['processados'] += 1
            self.stats['data_encontrada'] += 1
            self.stats['conta_encontrada'] += 1

            self.logger.info(f"SUCESSO: {arquivo.name}")
            self.logger.info(f"  -> {pasta_conta}/{pasta_data}/{nome_novo}")
            self.logger.info(f"  Data: {mes}/{ano} | Conta: {conta}")
            if not modo_teste:
                self.logger.info(f"  Arquivo COPIADO (original preservado)")

            # Log avisos se existirem
            for aviso in resultado['avisos']:
                self.logger.warning(f"  AVISO: {aviso}")

        except FileNotFoundError as e:
            resultado['erro'] = f"Arquivo não encontrado: {str(e)}"
            self.stats['erros'] += 1
            self.logger.error(f"ERRO FileNotFound: {arquivo.name} - {str(e)}")
        except PermissionError as e:
            resultado['erro'] = f"Sem permissão: {str(e)}"
            self.stats['erros'] += 1
            self.logger.error(f"ERRO Permission: {arquivo.name} - {str(e)}")
        except ValueError as e:
            resultado['erro'] = f"Valor inválido: {str(e)}"
            self.stats['erros'] += 1
            self.logger.error(f"ERRO ValueError: {arquivo.name} - {str(e)}")
        except Exception as e:
            resultado['erro'] = str(e)
            self.stats['erros'] += 1
            self.logger.error(f"ERRO: {arquivo.name} - {str(e)}", exc_info=True)

        return resultado

    def organizar_arquivos(self, modo_teste: bool = True, max_workers: int = 4) -> Dict:
        """Organiza todos os arquivos com processamento paralelo opcional"""
        self.logger.info("=== ORGANIZACAO LOCAL AVANCADA ===")
        self.logger.info(f"Origem: {self.diretorio_origem}")
        self.logger.info(f"Destino: {self.diretorio_destino}")
        self.logger.info(f"Modo teste: {modo_teste}")

        # Encontra arquivos com progress
        self.logger.info("Buscando arquivos...")
        arquivos = []
        extensoes = ['*.pdf', '*.ofx', '*.PDF', '*.OFX']
        for ext in extensoes:
            encontrados = list(self.diretorio_origem.rglob(ext))
            if encontrados:
                self.logger.info(f"  Encontrados {len(encontrados)} arquivos {ext}")
            arquivos.extend(encontrados)

        self.stats['total_arquivos'] = len(arquivos)
        self.logger.info(f"Total de arquivos: {len(arquivos)}")

        relatorio = {
            'total_arquivos': len(arquivos),
            'processados_com_sucesso': 0,
            'erros': 0,
            'detalhes': [],
            'modo_teste': modo_teste,
            'metodo': 'LOCAL_AVANCADO',
            'inicio': datetime.now().isoformat()
        }

        # Processa arquivos
        for i, arquivo in enumerate(arquivos, 1):
            self.logger.info(f"=== {i}/{len(arquivos)} ===")

            resultado = self.processar_arquivo(arquivo, modo_teste)
            relatorio['detalhes'].append(resultado)

            if resultado['sucesso']:
                relatorio['processados_com_sucesso'] += 1
            else:
                relatorio['erros'] += 1

        relatorio['fim'] = datetime.now().isoformat()
        relatorio['stats'] = self.stats

        self.logger.info("=== ORGANIZACAO CONCLUIDA ===")
        self.logger.info(f"Sucessos: {relatorio['processados_com_sucesso']}")
        self.logger.info(f"Erros: {relatorio['erros']}")

        return relatorio

def main():
    """Função principal para teste"""
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'config'))
    import config

    organizador = OrganizadorLocalAvancado(
        config.DIRETORIO_BASE_PADRAO,
        config.DIRETORIO_DESTINO_PADRAO
    )

    print("ORGANIZADOR LOCAL AVANCADO")
    print("=" * 50)

    modo_teste = input("Executar em modo teste? (S/n): ").strip().lower() != 'n'

    relatorio = organizador.organizar_arquivos(modo_teste)

    # Salva relatório na nova estrutura
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    nome_arquivo = f"relatorio_local_{timestamp}.json"
    
    caminho_salvo = relatorio_manager.salvar_relatorio_json(
        relatorio, 
        'organizacoes', 
        nome_arquivo
    )

    print(f"\nTotal: {relatorio['total_arquivos']}")
    print(f"Sucessos: {relatorio['processados_com_sucesso']}")
    print(f"Erros: {relatorio['erros']}")

if __name__ == "__main__":
    main()