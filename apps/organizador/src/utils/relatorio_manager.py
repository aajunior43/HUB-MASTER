#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerenciador de Relatórios
Utilitário para organizar e gerenciar relatórios em estrutura organizada
"""

import os
import json
from datetime import datetime
from pathlib import Path
import sys

# Import do config
try:
    import config
except ImportError:
    try:
        # Adiciona o diretório config ao path
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'config'))
        import config
    except ImportError:
        # Fallback para executável
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config'))
        import config

class RelatorioManager:
    """Gerenciador para organização de relatórios"""
    
    def __init__(self):
        # Verifica se o config tem os atributos necessários
        if hasattr(config, 'DIRETORIO_RELATORIOS'):
            self.base_dir = config.DIRETORIO_RELATORIOS
        else:
            # Fallback para diretório padrão
            self.base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'relatorios')
        
        if hasattr(config, 'ESTRUTURA_RELATORIOS'):
            self.estrutura = config.ESTRUTURA_RELATORIOS
        else:
            # Estrutura padrão
            self.estrutura = {
                "por_ano": True,
                "por_mes": True,
                "por_tipo": True
            }
        
        self._criar_estrutura()
    
    def _criar_estrutura(self):
        """Cria a estrutura de pastas se não existir"""
        try:
            # Cria diretório base
            os.makedirs(self.base_dir, exist_ok=True)
            
            # Cria subpastas apenas se a estrutura for um dicionário com strings
            if isinstance(self.estrutura, dict):
                for chave, valor in self.estrutura.items():
                    if isinstance(valor, str):
                        caminho_completo = os.path.join(self.base_dir, valor)
                        os.makedirs(caminho_completo, exist_ok=True)
                
        except Exception as e:
            print(f"Erro ao criar estrutura de relatórios: {e}")
    
    def obter_caminho_relatorio(self, tipo_relatorio, nome_arquivo=None, timestamp=None):
        """
        Obtém o caminho completo para salvar um relatório
        
        Args:
            tipo_relatorio: Tipo do relatório ('html', 'json', 'simulacoes', 'organizacoes', 'finais')
            nome_arquivo: Nome do arquivo (opcional, será gerado se não fornecido)
            timestamp: Timestamp para o arquivo (opcional, será gerado se não fornecido)
        
        Returns:
            str: Caminho completo do arquivo
        """
        if tipo_relatorio not in self.estrutura:
            raise ValueError(f"Tipo de relatório inválido: {tipo_relatorio}")
        
        if timestamp is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        if nome_arquivo is None:
            extensao = '.html' if tipo_relatorio == 'html' else '.json'
            nome_arquivo = f"{tipo_relatorio}_{timestamp}{extensao}"
        
        pasta = self.estrutura[tipo_relatorio]
        caminho_pasta = os.path.join(os.path.dirname(self.base_dir), pasta)
        
        return os.path.join(caminho_pasta, nome_arquivo)
    
    def salvar_relatorio_json(self, dados, tipo_relatorio, nome_arquivo=None):
        """
        Salva um relatório JSON na estrutura organizada
        
        Args:
            dados: Dados do relatório (dict)
            tipo_relatorio: Tipo do relatório
            nome_arquivo: Nome do arquivo (opcional)
        
        Returns:
            str: Caminho do arquivo salvo
        """
        caminho = self.obter_caminho_relatorio(tipo_relatorio, nome_arquivo)
        
        try:
            with open(caminho, 'w', encoding='utf-8') as f:
                json.dump(dados, f, indent=2, ensure_ascii=False)
            
            print(f"Relatório JSON salvo: {caminho}")
            return caminho
            
        except Exception as e:
            print(f"Erro ao salvar relatório JSON: {e}")
            return None
    
    def salvar_relatorio_html(self, conteudo_html, tipo_relatorio='html', nome_arquivo=None):
        """
        Salva um relatório HTML na estrutura organizada
        
        Args:
            conteudo_html: Conteúdo HTML do relatório
            tipo_relatorio: Tipo do relatório (padrão: 'html')
            nome_arquivo: Nome do arquivo (opcional)
        
        Returns:
            str: Caminho do arquivo salvo
        """
        caminho = self.obter_caminho_relatorio(tipo_relatorio, nome_arquivo)
        
        try:
            with open(caminho, 'w', encoding='utf-8') as f:
                f.write(conteudo_html)
            
            print(f"Relatório HTML salvo: {caminho}")
            return caminho
            
        except Exception as e:
            print(f"Erro ao salvar relatório HTML: {e}")
            return None
    
    def listar_relatorios(self, tipo_relatorio=None):
        """
        Lista relatórios existentes
        
        Args:
            tipo_relatorio: Tipo específico (opcional, lista todos se None)
        
        Returns:
            dict: Dicionário com relatórios por tipo
        """
        relatorios = {}
        
        tipos_para_listar = [tipo_relatorio] if tipo_relatorio else self.estrutura.keys()
        
        for tipo in tipos_para_listar:
            pasta = self.estrutura[tipo]
            caminho_pasta = os.path.join(os.path.dirname(self.base_dir), pasta)
            
            if os.path.exists(caminho_pasta):
                arquivos = []
                for arquivo in os.listdir(caminho_pasta):
                    caminho_arquivo = os.path.join(caminho_pasta, arquivo)
                    if os.path.isfile(caminho_arquivo):
                        stat = os.stat(caminho_arquivo)
                        arquivos.append({
                            'nome': arquivo,
                            'caminho': caminho_arquivo,
                            'tamanho': stat.st_size,
                            'modificado': datetime.fromtimestamp(stat.st_mtime)
                        })
                
                relatorios[tipo] = sorted(arquivos, key=lambda x: x['modificado'], reverse=True)
            else:
                relatorios[tipo] = []
        
        return relatorios
    
    def limpar_relatorios_antigos(self, dias=30, tipo_relatorio=None):
        """
        Remove relatórios mais antigos que o número especificado de dias
        
        Args:
            dias: Número de dias (padrão: 30)
            tipo_relatorio: Tipo específico (opcional, limpa todos se None)
        
        Returns:
            int: Número de arquivos removidos
        """
        from datetime import timedelta
        
        limite = datetime.now() - timedelta(days=dias)
        removidos = 0
        
        relatorios = self.listar_relatorios(tipo_relatorio)
        
        for tipo, arquivos in relatorios.items():
            for arquivo in arquivos:
                if arquivo['modificado'] < limite:
                    try:
                        os.remove(arquivo['caminho'])
                        removidos += 1
                        print(f"Removido: {arquivo['nome']}")
                    except Exception as e:
                        print(f"Erro ao remover {arquivo['nome']}: {e}")
        
        return removidos

# Instância global para facilitar o uso
relatorio_manager = RelatorioManager()