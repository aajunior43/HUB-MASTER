#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RENOMER IA v3 - Organizador com IA, Delay, Log e Modo Genérico
Usa Google Gemini para detectar informações
Com modo extratos bancários e modo genérico
"""

import os
import shutil
import time
from pathlib import Path
from datetime import datetime
import PyPDF2
import tkinter as tk
from tkinter import filedialog, messagebox, ttk, scrolledtext
import json

try:
    import google.generativeai as genai
    GEMINI_DISPONIVEL = True
except:
    GEMINI_DISPONIVEL = False


class LogProgresso:
    """Gerencia log de progresso para retomada"""

    def __init__(self, pasta_origem):
        self.pasta_origem = Path(pasta_origem)
        self.arquivo_log = self.pasta_origem / '.renomer_progress.json'
        self.dados = self.carregar()

    def carregar(self):
        """Carrega log existente"""
        if self.arquivo_log.exists():
            try:
                with open(self.arquivo_log, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return {'processados': [], 'erros': [], 'iniciado_em': None, 'ultima_atualizacao': None}
        return {'processados': [], 'erros': [], 'iniciado_em': None, 'ultima_atualizacao': None}

    def salvar(self):
        """Salva log atual"""
        try:
            self.dados['ultima_atualizacao'] = datetime.now().isoformat()
            with open(self.arquivo_log, 'w', encoding='utf-8') as f:
                json.dump(self.dados, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Erro ao salvar log: {e}")

    def iniciar(self):
        """Marca início do processamento"""
        if not self.dados['iniciado_em']:
            self.dados['iniciado_em'] = datetime.now().isoformat()
            self.salvar()

    def arquivo_processado(self, caminho):
        """Verifica se arquivo já foi processado"""
        caminho_str = str(caminho)
        return caminho_str in self.dados['processados'] or caminho_str in [e['arquivo'] for e in self.dados['erros']]

    def adicionar_sucesso(self, caminho, info):
        """Registra arquivo processado com sucesso"""
        self.dados['processados'].append({
            'arquivo': str(caminho),
            'novo_nome': info['novo_nome'],
            'pasta_destino': info.get('pasta_destino'),
            'processado_em': datetime.now().isoformat()
        })
        self.salvar()

    def adicionar_erro(self, caminho, erro):
        """Registra erro no processamento"""
        self.dados['erros'].append({
            'arquivo': str(caminho),
            'erro': str(erro),
            'processado_em': datetime.now().isoformat()
        })
        self.salvar()

    def obter_estatisticas(self):
        """Retorna estatísticas do log"""
        return {
            'total_processados': len(self.dados['processados']),
            'total_erros': len(self.dados['erros']),
            'iniciado_em': self.dados.get('iniciado_em'),
            'ultima_atualizacao': self.dados.get('ultima_atualizacao')
        }

    def limpar(self):
        """Limpa o log"""
        if self.arquivo_log.exists():
            self.arquivo_log.unlink()
        self.dados = {'processados': [], 'erros': [], 'iniciado_em': None, 'ultima_atualizacao': None}


class RenomerIA:
    """Organizador com IA"""

    def __init__(self, api_key=None, delay=1.0):
        self.api_key = api_key
        self.model = None
        self.delay = delay

        if api_key and GEMINI_DISPONIVEL:
            try:
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel('gemini-1.5-flash')
            except:
                pass

    def set_delay(self, delay):
        """Define delay entre requisições"""
        self.delay = max(0.1, float(delay))

    def ler_pdf(self, caminho, max_chars=3000):
        """Lê conteúdo de PDF"""
        try:
            with open(caminho, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                texto = ""
                for page in reader.pages[:2]:
                    texto += page.extract_text()
                    if len(texto) > max_chars:
                        break
                return texto[:max_chars]
        except:
            return ""

    def ler_ofx(self, caminho, max_chars=3000):
        """Lê conteúdo de OFX"""
        try:
            with open(caminho, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read(max_chars)
        except:
            try:
                with open(caminho, 'r', encoding='latin-1', errors='ignore') as f:
                    return f.read(max_chars)
            except:
                return ""

    def detectar_extrato_com_ia(self, nome_arquivo, conteudo):
        """Usa Gemini para detectar informações de extrato bancário"""
        if not self.model:
            return None

        prompt = f"""Analise este extrato bancário e extraia as informações em JSON.

Nome do arquivo: {nome_arquivo}

Conteúdo (início):
{conteudo[:2000]}

Retorne APENAS um JSON válido (sem markdown, sem explicações) com:
{{
    "banco": "NOME_DO_BANCO" (ex: ITAU, BRADESCO, SANTANDER, BB, CAIXA, NUBANK, INTER, C6, BTG, ou BANCO se não identificar),
    "conta": "numero_da_conta" (apenas números e hífen, ex: "12345-6", ou null),
    "mes": "MM" (01 a 12),
    "ano": "AAAA" (ex: 2024, 2025)
}}

IMPORTANTE:
- Use apenas o nome do banco em maiúsculas
- Mês e ano devem estar em formato numérico
- Se não encontrar conta, use null
- Retorne APENAS o JSON, nada mais"""

        try:
            time.sleep(self.delay)
            response = self.model.generate_content(prompt)
            texto_resposta = response.text.strip()

            if '```json' in texto_resposta:
                texto_resposta = texto_resposta.split('```json')[1].split('```')[0].strip()
            elif '```' in texto_resposta:
                texto_resposta = texto_resposta.split('```')[1].split('```')[0].strip()

            dados = json.loads(texto_resposta)

            if not dados.get('mes') or not dados.get('ano'):
                return None

            mes = str(dados['mes']).zfill(2)
            ano = str(dados['ano'])
            banco = dados.get('banco', 'BANCO').upper()
            conta = dados.get('conta')

            return {
                'banco': banco,
                'conta': conta,
                'mes': mes,
                'ano': ano
            }

        except Exception as e:
            print(f"Erro na IA (extrato): {e}")
            return None

    def sugerir_nome_com_ia(self, nome_arquivo, conteudo):
        """Usa Gemini para sugerir nome descritivo para arquivo genérico"""
        if not self.model:
            return None

        prompt = f"""Analise este documento e sugira um nome descritivo curto.

Nome original: {nome_arquivo}

Conteúdo (início):
{conteudo[:2000]}

Retorne APENAS um JSON válido com:
{{
    "nome_sugerido": "nome_descritivo_curto" (máximo 50 caracteres, sem espaços, use underscore, sem caracteres especiais, sem extensão),
    "categoria": "categoria_do_documento" (ex: contrato, nota_fiscal, relatorio, manual, formulario, carta, etc),
    "data": "AAAA-MM-DD" (se houver data no documento, ou null)
}}

IMPORTANTE:
- Nome deve ser descritivo mas curto
- Use apenas letras, números e underscore
- Não inclua extensão no nome
- Se encontrar data, use formato AAAA-MM-DD
- Retorne APENAS o JSON"""

        try:
            time.sleep(self.delay)
            response = self.model.generate_content(prompt)
            texto_resposta = response.text.strip()

            if '```json' in texto_resposta:
                texto_resposta = texto_resposta.split('```json')[1].split('```')[0].strip()
            elif '```' in texto_resposta:
                texto_resposta = texto_resposta.split('```')[1].split('```')[0].strip()

            dados = json.loads(texto_resposta)

            return {
                'nome_sugerido': dados.get('nome_sugerido', 'documento'),
                'categoria': dados.get('categoria', 'diversos'),
                'data': dados.get('data')
            }

        except Exception as e:
            print(f"Erro na IA (genérico): {e}")
            return None

    def processar_arquivo_extrato(self, caminho_origem):
        """Processa arquivo como extrato bancário"""
        arquivo = Path(caminho_origem)
        nome = arquivo.name
        extensao = arquivo.suffix.lower()

        # Lê conteúdo
        if extensao == '.pdf':
            conteudo = self.ler_pdf(caminho_origem)
        elif extensao == '.ofx':
            conteudo = self.ler_ofx(caminho_origem)
        else:
            conteudo = ""

        # Usa IA para detectar
        resultado = self.detectar_extrato_com_ia(nome, conteudo)

        if resultado:
            banco = resultado['banco']
            conta = resultado['conta']
            mes = resultado['mes']
            ano = resultado['ano']
        else:
            banco = "BANCO"
            conta = None
            mes = f"{datetime.now().month:02d}"
            ano = str(datetime.now().year)

        # Gera nome do arquivo
        conta_str = f"_{conta}" if conta else ""
        novo_nome = f"{ano}-{mes}_{banco}{conta_str}{extensao}"

        return {
            'original': nome,
            'novo_nome': novo_nome,
            'ano': ano,
            'mes': mes,
            'banco': banco,
            'conta': conta,
            'extensao': extensao,
            'ia_usada': resultado is not None,
            'modo': 'extrato'
        }

    def processar_arquivo_generico(self, caminho_origem):
        """Processa arquivo de forma genérica"""
        arquivo = Path(caminho_origem)
        nome = arquivo.name
        extensao = arquivo.suffix.lower()

        # Lê conteúdo
        if extensao == '.pdf':
            conteudo = self.ler_pdf(caminho_origem)
        else:
            conteudo = ""

        # Usa IA para sugerir nome
        resultado = self.sugerir_nome_com_ia(nome, conteudo)

        if resultado:
            nome_sugerido = resultado['nome_sugerido']
            categoria = resultado['categoria']
            data = resultado['data']

            # Gera nome: data_categoria_nome_sugerido.ext ou categoria_nome_sugerido.ext
            if data:
                novo_nome = f"{data}_{categoria}_{nome_sugerido}{extensao}"
            else:
                novo_nome = f"{categoria}_{nome_sugerido}{extensao}"
        else:
            # Fallback: mantém nome original ou usa data atual
            data_atual = datetime.now().strftime("%Y-%m-%d")
            novo_nome = f"{data_atual}_documento_{nome}"

        return {
            'original': nome,
            'novo_nome': novo_nome,
            'categoria': resultado.get('categoria', 'diversos') if resultado else 'diversos',
            'data': resultado.get('data') if resultado else None,
            'extensao': extensao,
            'ia_usada': resultado is not None,
            'modo': 'generico'
        }

    def organizar(self, pasta_origem, pasta_destino, modo_teste=True, recursivo=True,
                  modo_extrato=True, callback=None, retomar=False):
        """Organiza arquivos"""
        pasta_origem = Path(pasta_origem)
        pasta_destino = Path(pasta_destino)

        if not pasta_origem.exists():
            return {'erro': f'Pasta de origem não existe: {pasta_origem}'}

        if not pasta_origem.is_dir():
            return {'erro': f'Caminho não é um diretório: {pasta_origem}'}

        # Inicializa log
        log = LogProgresso(pasta_origem)

        if not retomar:
            log.limpar()
            log = LogProgresso(pasta_origem)

        log.iniciar()

        # Lista arquivos
        if modo_extrato:
            # Modo extrato: PDF e OFX
            if recursivo:
                arquivos = list(pasta_origem.rglob('*.[pP][dD][fF]')) + list(pasta_origem.rglob('*.[oO][fF][xX]'))
            else:
                arquivos = list(pasta_origem.glob('*.[pP][dD][fF]')) + list(pasta_origem.glob('*.[oO][fF][xX]'))
        else:
            # Modo genérico: apenas PDF
            if recursivo:
                arquivos = list(pasta_origem.rglob('*.[pP][dD][fF]'))
            else:
                arquivos = list(pasta_origem.glob('*.[pP][dD][fF]'))

        arquivos = list(set(arquivos))

        if not arquivos:
            ext_texto = "PDF e OFX" if modo_extrato else "PDF"
            return {'erro': f'Nenhum arquivo {ext_texto} encontrado em: {pasta_origem}'}

        # Filtra já processados
        if retomar:
            arquivos_pendentes = [a for a in arquivos if not log.arquivo_processado(a)]
            arquivos = arquivos_pendentes

            if callback:
                stats = log.obter_estatisticas()
                callback(f"Retomando processamento...")
                callback(f"Já processados: {stats['total_processados']}")
                callback(f"Erros anteriores: {stats['total_erros']}")
                callback(f"Pendentes: {len(arquivos)}")

        if not arquivos:
            stats = log.obter_estatisticas()
            return {
                'total': stats['total_processados'] + stats['total_erros'],
                'processados': stats['total_processados'],
                'erros': stats['total_erros'],
                'modo_teste': modo_teste,
                'resultados': [],
                'mensagem': 'Todos os arquivos já foram processados!'
            }

        resultados = []
        processados = 0
        erros = 0
        total = len(arquivos)

        for idx, arquivo in enumerate(arquivos, 1):
            try:
                if callback:
                    callback(f"Processando {idx}/{total}: {arquivo.name}")

                # Processa conforme modo
                if modo_extrato:
                    info = self.processar_arquivo_extrato(arquivo)
                    # Organiza em ano/mes
                    pasta_final = pasta_destino / info['ano'] / info['mes']
                else:
                    info = self.processar_arquivo_generico(arquivo)
                    # Organiza em categoria
                    pasta_final = pasta_destino / info['categoria']

                if not modo_teste:
                    pasta_final.mkdir(parents=True, exist_ok=True)
                    destino = pasta_final / info['novo_nome']

                    # Evita sobrescrever
                    contador = 1
                    while destino.exists():
                        nome_base = destino.stem
                        novo_nome_com_sufixo = f"{nome_base}_{contador}{info['extensao']}"
                        destino = pasta_final / novo_nome_com_sufixo
                        contador += 1

                    shutil.copy2(arquivo, destino)

                    # Salva no log
                    info['pasta_destino'] = str(pasta_final)
                    log.adicionar_sucesso(arquivo, info)

                resultados.append({
                    'status': 'OK',
                    'original': info['original'],
                    'novo': info['novo_nome'],
                    'pasta': str(pasta_final),
                    'ia_usada': info['ia_usada'],
                    'modo': info['modo']
                })
                processados += 1

            except Exception as e:
                if not modo_teste:
                    log.adicionar_erro(arquivo, str(e))

                resultados.append({
                    'status': 'ERRO',
                    'original': arquivo.name,
                    'erro': str(e)
                })
                erros += 1

        return {
            'total': total,
            'processados': processados,
            'erros': erros,
            'modo_teste': modo_teste,
            'modo_extrato': modo_extrato,
            'resultados': resultados,
            'log_stats': log.obter_estatisticas()
        }


class InterfaceRenomerIA:
    """Interface gráfica"""

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("RENOMER IA v3 - Extratos + Genérico")
        self.root.geometry("850x800")

        self.renomer = None
        self.pasta_origem = tk.StringVar()
        self.pasta_destino = tk.StringVar()
        self.api_key = tk.StringVar()
        self.recursivo = tk.BooleanVar(value=True)
        self.retomar = tk.BooleanVar(value=False)
        self.modo_extrato = tk.BooleanVar(value=True)
        self.delay = tk.DoubleVar(value=1.0)

        self.criar_interface()

    def criar_interface(self):
        """Cria interface"""
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        linha = 0

        # Título
        ttk.Label(main_frame, text="RENOMER IA v3", font=('Arial', 16, 'bold')).grid(row=linha, column=0, columnspan=3, pady=5)
        linha += 1
        ttk.Label(main_frame, text="Modo Extratos Bancários + Modo Genérico", font=('Arial', 10)).grid(row=linha, column=0, columnspan=3, pady=5)
        linha += 1

        # API Key
        ttk.Label(main_frame, text="Google Gemini API Key:").grid(row=linha, column=0, sticky=tk.W, pady=5)
        ttk.Entry(main_frame, textvariable=self.api_key, width=50, show="*").grid(row=linha, column=1, pady=5)
        ttk.Button(main_frame, text="Configurar", command=self.configurar_ia).grid(row=linha, column=2, pady=5, padx=5)
        linha += 1

        # Delay
        ttk.Label(main_frame, text="Delay entre requisições (segundos):").grid(row=linha, column=0, sticky=tk.W, pady=5)
        delay_frame = ttk.Frame(main_frame)
        delay_frame.grid(row=linha, column=1, sticky=tk.W, pady=5)
        ttk.Spinbox(delay_frame, from_=0.1, to=10.0, increment=0.1, textvariable=self.delay, width=10).pack(side=tk.LEFT)
        ttk.Label(delay_frame, text=" (recomendado: 1.0 a 2.0s)", font=('Arial', 8), foreground='gray').pack(side=tk.LEFT, padx=5)
        linha += 1

        # Status IA
        self.label_status_ia = ttk.Label(main_frame, text="❌ IA não configurada", foreground="red")
        self.label_status_ia.grid(row=linha, column=0, columnspan=3, pady=5)
        linha += 1

        # Separador
        ttk.Separator(main_frame, orient='horizontal').grid(row=linha, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=10)
        linha += 1

        # Modo de operação
        modo_frame = ttk.LabelFrame(main_frame, text="Modo de Operação", padding="10")
        modo_frame.grid(row=linha, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=10)
        linha += 1

        ttk.Radiobutton(modo_frame, text="📊 Modo Extratos Bancários (organiza por Ano/Mês/Banco)",
                       variable=self.modo_extrato, value=True).pack(anchor=tk.W, pady=2)
        ttk.Label(modo_frame, text="   → Detecta: banco, conta, mês, ano", font=('Arial', 8), foreground='gray').pack(anchor=tk.W, padx=20)
        ttk.Label(modo_frame, text="   → Formato: AAAA-MM_BANCO_CONTA.pdf", font=('Arial', 8), foreground='gray').pack(anchor=tk.W, padx=20)
        ttk.Label(modo_frame, text="   → Arquivos: PDF e OFX", font=('Arial', 8), foreground='gray').pack(anchor=tk.W, padx=20, pady=(0,5))

        ttk.Radiobutton(modo_frame, text="📄 Modo Genérico (renomeia PDFs com descrição inteligente)",
                       variable=self.modo_extrato, value=False).pack(anchor=tk.W, pady=2)
        ttk.Label(modo_frame, text="   → Detecta: tipo de documento, data, conteúdo", font=('Arial', 8), foreground='gray').pack(anchor=tk.W, padx=20)
        ttk.Label(modo_frame, text="   → Formato: AAAA-MM-DD_categoria_descricao.pdf", font=('Arial', 8), foreground='gray').pack(anchor=tk.W, padx=20)
        ttk.Label(modo_frame, text="   → Arquivos: apenas PDF", font=('Arial', 8), foreground='gray').pack(anchor=tk.W, padx=20)

        # Pasta origem
        ttk.Label(main_frame, text="Pasta de Origem:").grid(row=linha, column=0, sticky=tk.W, pady=5)
        ttk.Entry(main_frame, textvariable=self.pasta_origem, width=50).grid(row=linha, column=1, pady=5)
        ttk.Button(main_frame, text="Selecionar", command=self.selecionar_origem).grid(row=linha, column=2, pady=5, padx=5)
        linha += 1

        # Pasta destino
        ttk.Label(main_frame, text="Pasta de Destino:").grid(row=linha, column=0, sticky=tk.W, pady=5)
        ttk.Entry(main_frame, textvariable=self.pasta_destino, width=50).grid(row=linha, column=1, pady=5)
        ttk.Button(main_frame, text="Selecionar", command=self.selecionar_destino).grid(row=linha, column=2, pady=5, padx=5)
        linha += 1

        # Opções
        ttk.Checkbutton(main_frame, text="Buscar em subpastas (recursivo)", variable=self.recursivo).grid(row=linha, column=0, columnspan=2, sticky=tk.W, pady=2)
        linha += 1
        ttk.Checkbutton(main_frame, text="Retomar processamento anterior", variable=self.retomar).grid(row=linha, column=0, columnspan=3, sticky=tk.W, pady=2)
        linha += 1

        # Botão verificar progresso
        ttk.Button(main_frame, text="📊 Verificar Progresso", command=self.verificar_progresso).grid(row=linha, column=0, columnspan=3, pady=5)
        linha += 1

        # Botões principais
        btn_frame = ttk.Frame(main_frame)
        btn_frame.grid(row=linha, column=0, columnspan=3, pady=15)
        linha += 1

        ttk.Button(btn_frame, text="Testar (Simulação)", command=lambda: self.processar(True)).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Organizar (Real)", command=lambda: self.processar(False)).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Limpar Log", command=self.limpar_log).pack(side=tk.LEFT, padx=5)

        # Área de resultados
        ttk.Label(main_frame, text="Resultados:").grid(row=linha, column=0, sticky=tk.W, pady=5)
        linha += 1

        self.text_resultado = scrolledtext.ScrolledText(main_frame, height=20, width=100)
        self.text_resultado.grid(row=linha, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=5)
        linha += 1

        # Configurar grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(linha - 1, weight=1)

        # Info
        info_text = "💡 API Key: https://aistudio.google.com/apikey"
        ttk.Label(main_frame, text=info_text, font=('Arial', 8), foreground="blue").grid(row=linha, column=0, columnspan=3, pady=5)

    def configurar_ia(self):
        """Configura IA"""
        api_key = self.api_key.get().strip()

        if not api_key:
            messagebox.showerror("Erro", "Digite a API key do Google Gemini")
            return

        if not GEMINI_DISPONIVEL:
            messagebox.showerror("Erro", "Biblioteca google-generativeai não instalada!\n\nInstale: pip install google-generativeai")
            return

        try:
            delay = self.delay.get()
            self.renomer = RenomerIA(api_key, delay)
            if self.renomer.model:
                self.label_status_ia.config(text=f"✅ IA configurada! Delay: {delay}s", foreground="green")
                messagebox.showinfo("Sucesso", f"IA configurada!\nDelay: {delay}s")
            else:
                self.label_status_ia.config(text="❌ Erro ao configurar IA", foreground="red")
                messagebox.showerror("Erro", "Verifique a API key")
        except Exception as e:
            self.label_status_ia.config(text="❌ Erro", foreground="red")
            messagebox.showerror("Erro", str(e))

    def selecionar_origem(self):
        """Seleciona pasta origem"""
        pasta = filedialog.askdirectory(title="Pasta com arquivos")
        if pasta:
            self.pasta_origem.set(pasta)

    def selecionar_destino(self):
        """Seleciona pasta destino"""
        pasta = filedialog.askdirectory(title="Pasta de destino")
        if pasta:
            self.pasta_destino.set(pasta)

    def verificar_progresso(self):
        """Verifica progresso"""
        origem = self.pasta_origem.get()
        if not origem:
            messagebox.showerror("Erro", "Selecione a pasta de origem")
            return

        log = LogProgresso(origem)
        stats = log.obter_estatisticas()

        if not stats['iniciado_em']:
            messagebox.showinfo("Progresso", "Nenhum processamento anterior")
            return

        mensagem = f"""Processamento anterior:

📅 Iniciado: {stats['iniciado_em']}
🕐 Atualizado: {stats['ultima_atualizacao']}

✅ Processados: {stats['total_processados']}
❌ Erros: {stats['total_erros']}

Total: {stats['total_processados'] + stats['total_erros']}"""

        messagebox.showinfo("Progresso", mensagem)

    def limpar_log(self):
        """Limpa log"""
        origem = self.pasta_origem.get()
        if not origem:
            messagebox.showerror("Erro", "Selecione a pasta de origem")
            return

        if messagebox.askyesno("Confirmar", "Limpar log de progresso?"):
            log = LogProgresso(origem)
            log.limpar()
            messagebox.showinfo("Sucesso", "Log limpo!")

    def atualizar_status(self, mensagem):
        """Atualiza status"""
        self.text_resultado.insert(tk.END, f"{mensagem}\n")
        self.text_resultado.see(tk.END)
        self.root.update()

    def processar(self, modo_teste):
        """Processa arquivos"""
        if not self.renomer or not self.renomer.model:
            messagebox.showerror("Erro", "Configure a IA primeiro!")
            return

        origem = self.pasta_origem.get()
        destino = self.pasta_destino.get()

        if not origem or not destino:
            messagebox.showerror("Erro", "Selecione as pastas")
            return

        self.renomer.set_delay(self.delay.get())

        self.text_resultado.delete(1.0, tk.END)
        modo_txt = "EXTRATOS BANCÁRIOS" if self.modo_extrato.get() else "GENÉRICO"
        self.text_resultado.insert(tk.END, f"{'='*85}\n")
        self.text_resultado.insert(tk.END, f"RENOMER IA v3 - Modo: {modo_txt}\n")
        self.text_resultado.insert(tk.END, f"{'='*85}\n")
        self.text_resultado.insert(tk.END, f"Tipo: {'TESTE' if modo_teste else 'REAL'}\n")
        self.text_resultado.insert(tk.END, f"Recursivo: {'Sim' if self.recursivo.get() else 'Não'}\n")
        self.text_resultado.insert(tk.END, f"Retomar: {'Sim' if self.retomar.get() else 'Não'}\n")
        self.text_resultado.insert(tk.END, f"Delay: {self.delay.get()}s\n")
        self.text_resultado.insert(tk.END, f"Origem: {origem}\n")
        self.text_resultado.insert(tk.END, f"Destino: {destino}\n")
        self.text_resultado.insert(tk.END, f"{'='*85}\n\n")

        self.text_resultado.insert(tk.END, "🔍 Buscando arquivos...\n")
        self.root.update()

        resultado = self.renomer.organizar(origem, destino, modo_teste, self.recursivo.get(),
                                          self.modo_extrato.get(), self.atualizar_status, self.retomar.get())

        if 'erro' in resultado:
            self.text_resultado.insert(tk.END, f"\n❌ ERRO: {resultado['erro']}\n")
            messagebox.showerror("Erro", resultado['erro'])
            return

        # Resumo
        self.text_resultado.insert(tk.END, f"\n{'='*85}\n")
        self.text_resultado.insert(tk.END, f"📊 RESUMO\n")
        self.text_resultado.insert(tk.END, f"{'='*85}\n")

        if 'mensagem' in resultado:
            self.text_resultado.insert(tk.END, f"ℹ️  {resultado['mensagem']}\n\n")

        self.text_resultado.insert(tk.END, f"Total processado: {resultado['total']}\n")
        self.text_resultado.insert(tk.END, f"✅ Sucessos: {resultado['processados']}\n")
        self.text_resultado.insert(tk.END, f"❌ Erros: {resultado['erros']}\n\n")

        com_ia = sum(1 for r in resultado['resultados'] if r.get('ia_usada'))
        self.text_resultado.insert(tk.END, f"🤖 Detectados com IA: {com_ia}/{resultado['total']}\n\n")

        if 'log_stats' in resultado:
            stats = resultado['log_stats']
            self.text_resultado.insert(tk.END, f"📝 LOG COMPLETO:\n")
            self.text_resultado.insert(tk.END, f"Total (histórico): {stats['total_processados']}\n")
            self.text_resultado.insert(tk.END, f"Erros (histórico): {stats['total_erros']}\n\n")

        # Detalhes
        if resultado['resultados']:
            self.text_resultado.insert(tk.END, f"📋 DETALHES (primeiros 25):\n")
            self.text_resultado.insert(tk.END, f"{'-'*85}\n")

            for i, r in enumerate(resultado['resultados'][:25], 1):
                if r['status'] == 'OK':
                    ia_icon = "🤖" if r.get('ia_usada') else "📝"
                    self.text_resultado.insert(tk.END, f"{i}. {ia_icon} {r['original']}\n")
                    self.text_resultado.insert(tk.END, f"   → {r['novo']}\n")
                    self.text_resultado.insert(tk.END, f"   → {r['pasta']}\n\n")
                else:
                    self.text_resultado.insert(tk.END, f"{i}. ❌ {r['original']}\n")
                    self.text_resultado.insert(tk.END, f"   Erro: {r['erro']}\n\n")

            if len(resultado['resultados']) > 25:
                self.text_resultado.insert(tk.END, f"... e mais {len(resultado['resultados']) - 25} arquivos\n")

        if not modo_teste:
            messagebox.showinfo("Sucesso", f"Concluído!\n\n✅ {resultado['processados']} processados\n🤖 {com_ia} com IA")

    def executar(self):
        """Executa"""
        self.root.mainloop()


if __name__ == '__main__':
    if not GEMINI_DISPONIVEL:
        print("AVISO: google-generativeai não instalado!")
        print("Instale: pip install google-generativeai")

    app = InterfaceRenomerIA()
    app.executar()
