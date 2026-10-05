#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RENOMER IA v3 - OTIMIZADO
Organizador com IA, Threading e Performance Melhorada
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
import threading
import queue

try:
    import google.generativeai as genai
    GEMINI_DISPONIVEL = True
except:
    GEMINI_DISPONIVEL = False


class LogProgresso:
    """Gerencia log de progresso"""

    def __init__(self, pasta_origem):
        self.pasta_origem = Path(pasta_origem)
        self.arquivo_log = self.pasta_origem / '.renomer_progress.json'
        self.dados = self.carregar()

    def carregar(self):
        if self.arquivo_log.exists():
            try:
                with open(self.arquivo_log, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return {'processados': [], 'erros': [], 'iniciado_em': None}
        return {'processados': [], 'erros': [], 'iniciado_em': None}

    def salvar(self):
        try:
            self.dados['ultima_atualizacao'] = datetime.now().isoformat()
            with open(self.arquivo_log, 'w', encoding='utf-8') as f:
                json.dump(self.dados, f, indent=2, ensure_ascii=False)
        except:
            pass

    def iniciar(self):
        if not self.dados['iniciado_em']:
            self.dados['iniciado_em'] = datetime.now().isoformat()
            self.salvar()

    def arquivo_processado(self, caminho):
        caminho_str = str(caminho)
        return caminho_str in self.dados['processados'] or \
               caminho_str in [e['arquivo'] for e in self.dados['erros']]

    def adicionar_sucesso(self, caminho, info):
        self.dados['processados'].append({
            'arquivo': str(caminho),
            'novo_nome': info['novo_nome'],
            'processado_em': datetime.now().isoformat()
        })
        self.salvar()

    def adicionar_erro(self, caminho, erro):
        self.dados['erros'].append({
            'arquivo': str(caminho),
            'erro': str(erro),
            'processado_em': datetime.now().isoformat()
        })
        self.salvar()

    def obter_estatisticas(self):
        return {
            'total_processados': len(self.dados['processados']),
            'total_erros': len(self.dados['erros']),
            'iniciado_em': self.dados.get('iniciado_em')
        }

    def limpar(self):
        if self.arquivo_log.exists():
            self.arquivo_log.unlink()
        self.dados = {'processados': [], 'erros': [], 'iniciado_em': None}


class RenomerIA:
    """Organizador com IA otimizado"""

    def __init__(self, api_key=None, delay=1.0):
        self.api_key = api_key
        self.model = None
        self.delay = delay
        self.cancelado = False

        if api_key and GEMINI_DISPONIVEL:
            try:
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel('gemini-1.5-flash')
            except:
                pass

    def set_delay(self, delay):
        self.delay = max(0.1, float(delay))

    def cancelar(self):
        """Cancela processamento"""
        self.cancelado = True

    def ler_pdf(self, caminho, max_chars=2000):
        """Lê PDF de forma otimizada"""
        try:
            with open(caminho, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                texto = ""
                # Apenas primeira página para velocidade
                if len(reader.pages) > 0:
                    texto = reader.pages[0].extract_text()[:max_chars]
                return texto
        except:
            return ""

    def ler_ofx(self, caminho, max_chars=2000):
        """Lê OFX de forma otimizada"""
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
        """Detecta extrato com IA"""
        if not self.model:
            return None

        prompt = f"""Analise e retorne JSON:
Nome: {nome_arquivo}
Conteúdo: {conteudo[:1500]}

{{"banco":"NOME","conta":"12345-6 ou null","mes":"MM","ano":"AAAA"}}

Apenas JSON, sem markdown."""

        try:
            time.sleep(self.delay)
            response = self.model.generate_content(prompt)
            texto = response.text.strip()

            if '```' in texto:
                texto = texto.split('```')[1].replace('json','').strip()

            dados = json.loads(texto)
            if dados.get('mes') and dados.get('ano'):
                return {
                    'banco': dados.get('banco', 'BANCO').upper(),
                    'conta': dados.get('conta'),
                    'mes': str(dados['mes']).zfill(2),
                    'ano': str(dados['ano'])
                }
        except:
            pass
        return None

    def sugerir_nome_com_ia(self, nome_arquivo, conteudo):
        """Sugere nome com IA"""
        if not self.model:
            return None

        prompt = f"""Analise e retorne JSON:
Nome: {nome_arquivo}
Conteúdo: {conteudo[:1500]}

{{"nome_sugerido":"descricao_curta","categoria":"tipo","data":"AAAA-MM-DD ou null"}}

Apenas JSON, sem markdown."""

        try:
            time.sleep(self.delay)
            response = self.model.generate_content(prompt)
            texto = response.text.strip()

            if '```' in texto:
                texto = texto.split('```')[1].replace('json','').strip()

            dados = json.loads(texto)
            return {
                'nome_sugerido': dados.get('nome_sugerido', 'documento'),
                'categoria': dados.get('categoria', 'diversos'),
                'data': dados.get('data')
            }
        except:
            pass
        return None

    def processar_arquivo_extrato(self, caminho_origem):
        """Processa extrato"""
        arquivo = Path(caminho_origem)
        extensao = arquivo.suffix.lower()

        conteudo = self.ler_pdf(caminho_origem) if extensao == '.pdf' else self.ler_ofx(caminho_origem)
        resultado = self.detectar_extrato_com_ia(arquivo.name, conteudo)

        if resultado:
            banco, conta, mes, ano = resultado['banco'], resultado['conta'], resultado['mes'], resultado['ano']
        else:
            banco, conta = "BANCO", None
            mes, ano = f"{datetime.now().month:02d}", str(datetime.now().year)

        conta_str = f"_{conta}" if conta else ""
        novo_nome = f"{ano}-{mes}_{banco}{conta_str}{extensao}"

        return {
            'original': arquivo.name,
            'novo_nome': novo_nome,
            'ano': ano,
            'mes': mes,
            'extensao': extensao,
            'ia_usada': resultado is not None,
            'modo': 'extrato'
        }

    def processar_arquivo_generico(self, caminho_origem):
        """Processa genérico"""
        arquivo = Path(caminho_origem)
        extensao = arquivo.suffix.lower()

        conteudo = self.ler_pdf(caminho_origem)
        resultado = self.sugerir_nome_com_ia(arquivo.name, conteudo)

        if resultado:
            nome_sugerido = resultado['nome_sugerido']
            categoria = resultado['categoria']
            data = resultado['data']

            if data:
                novo_nome = f"{data}_{categoria}_{nome_sugerido}{extensao}"
            else:
                novo_nome = f"{categoria}_{nome_sugerido}{extensao}"
        else:
            data_atual = datetime.now().strftime("%Y-%m-%d")
            novo_nome = f"{data_atual}_documento_{arquivo.name}"

        return {
            'original': arquivo.name,
            'novo_nome': novo_nome,
            'categoria': resultado.get('categoria', 'diversos') if resultado else 'diversos',
            'extensao': extensao,
            'ia_usada': resultado is not None,
            'modo': 'generico'
        }

    def organizar(self, pasta_origem, pasta_destino, modo_teste=True, recursivo=True,
                  modo_extrato=True, callback=None, retomar=False, progress_queue=None):
        """Organiza arquivos com callback para progresso"""
        self.cancelado = False
        pasta_origem = Path(pasta_origem)
        pasta_destino = Path(pasta_destino)

        if not pasta_origem.exists():
            return {'erro': f'Pasta de origem não existe: {pasta_origem}'}

        log = LogProgresso(pasta_origem)
        if not retomar:
            log.limpar()
            log = LogProgresso(pasta_origem)
        log.iniciar()

        # Lista arquivos
        if modo_extrato:
            if recursivo:
                arquivos = list(pasta_origem.rglob('*.[pP][dD][fF]')) + list(pasta_origem.rglob('*.[oO][fF][xX]'))
            else:
                arquivos = list(pasta_origem.glob('*.[pP][dD][fF]')) + list(pasta_origem.glob('*.[oO][fF][xX]'))
        else:
            if recursivo:
                arquivos = list(pasta_origem.rglob('*.[pP][dD][fF]'))
            else:
                arquivos = list(pasta_origem.glob('*.[pP][dD][fF]'))

        arquivos = list(set(arquivos))

        if not arquivos:
            return {'erro': 'Nenhum arquivo encontrado'}

        if retomar:
            arquivos = [a for a in arquivos if not log.arquivo_processado(a)]

        if not arquivos:
            return {'total': 0, 'processados': 0, 'erros': 0, 'resultados': [],
                    'mensagem': 'Todos já foram processados!'}

        resultados = []
        processados = 0
        erros = 0
        total = len(arquivos)

        for idx, arquivo in enumerate(arquivos, 1):
            if self.cancelado:
                break

            try:
                # Envia progresso
                if progress_queue:
                    progress_queue.put(('progress', idx, total, arquivo.name))

                # Processa
                if modo_extrato:
                    info = self.processar_arquivo_extrato(arquivo)
                    pasta_final = pasta_destino / info['ano'] / info['mes']
                else:
                    info = self.processar_arquivo_generico(arquivo)
                    pasta_final = pasta_destino / info.get('categoria', 'diversos')

                if not modo_teste:
                    pasta_final.mkdir(parents=True, exist_ok=True)
                    destino = pasta_final / info['novo_nome']

                    contador = 1
                    while destino.exists():
                        nome_base = destino.stem
                        destino = pasta_final / f"{nome_base}_{contador}{info['extensao']}"
                        contador += 1

                    shutil.copy2(arquivo, destino)
                    log.adicionar_sucesso(arquivo, info)

                resultados.append({
                    'status': 'OK',
                    'original': info['original'],
                    'novo': info['novo_nome'],
                    'pasta': str(pasta_final),
                    'ia_usada': info['ia_usada']
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
            'resultados': resultados,
            'log_stats': log.obter_estatisticas(),
            'cancelado': self.cancelado
        }


class InterfaceRenomerIA:
    """Interface gráfica otimizada"""

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("RENOMER IA v3 - Otimizado")
        self.root.geometry("850x800")

        self.renomer = None
        self.pasta_origem = tk.StringVar()
        self.pasta_destino = tk.StringVar()
        self.api_key = tk.StringVar()
        self.recursivo = tk.BooleanVar(value=True)
        self.retomar = tk.BooleanVar(value=False)
        self.modo_extrato = tk.BooleanVar(value=True)
        self.delay = tk.DoubleVar(value=1.0)

        self.processando = False
        self.thread_processamento = None
        self.progress_queue = queue.Queue()

        self.criar_interface()
        self.verificar_progresso_thread()

    def criar_interface(self):
        """Cria interface"""
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        linha = 0

        # Título
        ttk.Label(main_frame, text="RENOMER IA v3", font=('Arial', 16, 'bold')).grid(row=linha, column=0, columnspan=3, pady=5)
        linha += 1
        ttk.Label(main_frame, text="Otimizado - Sem Travamentos", font=('Arial', 10)).grid(row=linha, column=0, columnspan=3, pady=5)
        linha += 1

        # API Key
        ttk.Label(main_frame, text="Google Gemini API Key:").grid(row=linha, column=0, sticky=tk.W, pady=5)
        ttk.Entry(main_frame, textvariable=self.api_key, width=50, show="*").grid(row=linha, column=1, pady=5)
        ttk.Button(main_frame, text="Configurar", command=self.configurar_ia).grid(row=linha, column=2, pady=5, padx=5)
        linha += 1

        # Delay
        ttk.Label(main_frame, text="Delay (segundos):").grid(row=linha, column=0, sticky=tk.W, pady=5)
        ttk.Spinbox(main_frame, from_=0.5, to=5.0, increment=0.5, textvariable=self.delay, width=10).grid(row=linha, column=1, sticky=tk.W, pady=5)
        linha += 1

        # Status
        self.label_status_ia = ttk.Label(main_frame, text="❌ IA não configurada", foreground="red")
        self.label_status_ia.grid(row=linha, column=0, columnspan=3, pady=5)
        linha += 1

        ttk.Separator(main_frame, orient='horizontal').grid(row=linha, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=10)
        linha += 1

        # Modo
        modo_frame = ttk.LabelFrame(main_frame, text="Modo", padding="10")
        modo_frame.grid(row=linha, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=5)
        linha += 1

        ttk.Radiobutton(modo_frame, text="📊 Extratos Bancários", variable=self.modo_extrato, value=True).pack(anchor=tk.W)
        ttk.Radiobutton(modo_frame, text="📄 Genérico", variable=self.modo_extrato, value=False).pack(anchor=tk.W)

        # Pastas
        ttk.Label(main_frame, text="Origem:").grid(row=linha, column=0, sticky=tk.W, pady=5)
        ttk.Entry(main_frame, textvariable=self.pasta_origem, width=50).grid(row=linha, column=1, pady=5)
        ttk.Button(main_frame, text="...", command=self.selecionar_origem, width=3).grid(row=linha, column=2, pady=5, padx=5)
        linha += 1

        ttk.Label(main_frame, text="Destino:").grid(row=linha, column=0, sticky=tk.W, pady=5)
        ttk.Entry(main_frame, textvariable=self.pasta_destino, width=50).grid(row=linha, column=1, pady=5)
        ttk.Button(main_frame, text="...", command=self.selecionar_destino, width=3).grid(row=linha, column=2, pady=5, padx=5)
        linha += 1

        # Opções
        ttk.Checkbutton(main_frame, text="Buscar em subpastas", variable=self.recursivo).grid(row=linha, column=0, columnspan=2, sticky=tk.W, pady=2)
        linha += 1
        ttk.Checkbutton(main_frame, text="Retomar processamento", variable=self.retomar).grid(row=linha, column=0, columnspan=2, sticky=tk.W, pady=2)
        linha += 1

        # Barra de progresso
        self.progressbar = ttk.Progressbar(main_frame, length=400, mode='determinate')
        self.progressbar.grid(row=linha, column=0, columnspan=3, pady=10, sticky=(tk.W, tk.E))
        linha += 1

        self.label_progresso = ttk.Label(main_frame, text="")
        self.label_progresso.grid(row=linha, column=0, columnspan=3)
        linha += 1

        # Botões
        btn_frame = ttk.Frame(main_frame)
        btn_frame.grid(row=linha, column=0, columnspan=3, pady=10)
        linha += 1

        self.btn_testar = ttk.Button(btn_frame, text="Testar", command=lambda: self.iniciar_processamento(True))
        self.btn_testar.pack(side=tk.LEFT, padx=5)

        self.btn_organizar = ttk.Button(btn_frame, text="Organizar", command=lambda: self.iniciar_processamento(False))
        self.btn_organizar.pack(side=tk.LEFT, padx=5)

        self.btn_cancelar = ttk.Button(btn_frame, text="Cancelar", command=self.cancelar_processamento, state='disabled')
        self.btn_cancelar.pack(side=tk.LEFT, padx=5)

        # Resultados
        ttk.Label(main_frame, text="Resultados:").grid(row=linha, column=0, sticky=tk.W, pady=5)
        linha += 1

        self.text_resultado = scrolledtext.ScrolledText(main_frame, height=18, width=100)
        self.text_resultado.grid(row=linha, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S))
        linha += 1

        # Grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(linha - 1, weight=1)

    def configurar_ia(self):
        """Configura IA"""
        api_key = self.api_key.get().strip()
        if not api_key:
            messagebox.showerror("Erro", "Digite a API key")
            return

        if not GEMINI_DISPONIVEL:
            messagebox.showerror("Erro", "google-generativeai não instalado")
            return

        try:
            self.renomer = RenomerIA(api_key, self.delay.get())
            if self.renomer.model:
                self.label_status_ia.config(text=f"✅ IA configurada! Delay: {self.delay.get()}s", foreground="green")
                messagebox.showinfo("Sucesso", "IA configurada!")
            else:
                self.label_status_ia.config(text="❌ Erro", foreground="red")
                messagebox.showerror("Erro", "Verifique a API key")
        except Exception as e:
            messagebox.showerror("Erro", str(e))

    def selecionar_origem(self):
        pasta = filedialog.askdirectory(title="Pasta de origem")
        if pasta:
            self.pasta_origem.set(pasta)

    def selecionar_destino(self):
        pasta = filedialog.askdirectory(title="Pasta de destino")
        if pasta:
            self.pasta_destino.set(pasta)

    def iniciar_processamento(self, modo_teste):
        """Inicia processamento em thread separada"""
        if not self.renomer or not self.renomer.model:
            messagebox.showerror("Erro", "Configure a IA primeiro!")
            return

        origem = self.pasta_origem.get()
        destino = self.pasta_destino.get()

        if not origem or not destino:
            messagebox.showerror("Erro", "Selecione as pastas")
            return

        self.processando = True
        self.btn_testar.config(state='disabled')
        self.btn_organizar.config(state='disabled')
        self.btn_cancelar.config(state='normal')

        self.text_resultado.delete(1.0, tk.END)
        self.text_resultado.insert(tk.END, "Iniciando processamento...\n\n")

        self.progressbar['value'] = 0

        # Inicia thread
        self.renomer.set_delay(self.delay.get())
        self.thread_processamento = threading.Thread(
            target=self._processar_thread,
            args=(origem, destino, modo_teste),
            daemon=True
        )
        self.thread_processamento.start()

    def _processar_thread(self, origem, destino, modo_teste):
        """Processa em thread separada"""
        try:
            resultado = self.renomer.organizar(
                origem, destino, modo_teste,
                self.recursivo.get(), self.modo_extrato.get(),
                None, self.retomar.get(), self.progress_queue
            )
            self.progress_queue.put(('done', resultado))
        except Exception as e:
            self.progress_queue.put(('error', str(e)))

    def verificar_progresso_thread(self):
        """Verifica progresso da thread"""
        try:
            while True:
                msg = self.progress_queue.get_nowait()
                tipo = msg[0]

                if tipo == 'progress':
                    _, idx, total, nome = msg
                    progresso = (idx / total) * 100
                    self.progressbar['value'] = progresso
                    self.label_progresso.config(text=f"{idx}/{total}: {nome[:50]}")
                    self.root.update_idletasks()

                elif tipo == 'done':
                    resultado = msg[1]
                    self.processar_resultado(resultado)
                    self.finalizar_processamento()

                elif tipo == 'error':
                    erro = msg[1]
                    self.text_resultado.insert(tk.END, f"\n❌ ERRO: {erro}\n")
                    self.finalizar_processamento()

        except queue.Empty:
            pass

        if self.processando:
            self.root.after(100, self.verificar_progresso_thread)

    def processar_resultado(self, resultado):
        """Processa resultado"""
        self.text_resultado.delete(1.0, tk.END)

        if 'erro' in resultado:
            self.text_resultado.insert(tk.END, f"❌ {resultado['erro']}\n")
            return

        com_ia = sum(1 for r in resultado['resultados'] if r.get('ia_usada'))

        self.text_resultado.insert(tk.END, f"{'='*80}\n")
        self.text_resultado.insert(tk.END, f"📊 RESUMO\n")
        self.text_resultado.insert(tk.END, f"{'='*80}\n")
        self.text_resultado.insert(tk.END, f"Total: {resultado['total']}\n")
        self.text_resultado.insert(tk.END, f"✅ Sucessos: {resultado['processados']}\n")
        self.text_resultado.insert(tk.END, f"❌ Erros: {resultado['erros']}\n")
        self.text_resultado.insert(tk.END, f"🤖 Com IA: {com_ia}\n\n")

        if resultado.get('cancelado'):
            self.text_resultado.insert(tk.END, "⚠️ PROCESSAMENTO CANCELADO\n\n")

        # Primeiros 20
        for i, r in enumerate(resultado['resultados'][:20], 1):
            if r['status'] == 'OK':
                ia = "🤖" if r.get('ia_usada') else "📝"
                self.text_resultado.insert(tk.END, f"{i}. {ia} {r['original']}\n   → {r['novo']}\n\n")
            else:
                self.text_resultado.insert(tk.END, f"{i}. ❌ {r['original']}: {r['erro']}\n\n")

        if len(resultado['resultados']) > 20:
            self.text_resultado.insert(tk.END, f"... e mais {len(resultado['resultados']) - 20}\n")

        if not resultado['modo_teste'] and resultado['processados'] > 0:
            messagebox.showinfo("Concluído", f"✅ {resultado['processados']} arquivos processados!")

    def cancelar_processamento(self):
        """Cancela processamento"""
        if self.renomer and self.processando:
            self.renomer.cancelar()
            self.text_resultado.insert(tk.END, "\n⚠️ Cancelando...\n")

    def finalizar_processamento(self):
        """Finaliza processamento"""
        self.processando = False
        self.btn_testar.config(state='normal')
        self.btn_organizar.config(state='normal')
        self.btn_cancelar.config(state='disabled')
        self.progressbar['value'] = 0
        self.label_progresso.config(text="")

    def executar(self):
        self.root.mainloop()


if __name__ == '__main__':
    if not GEMINI_DISPONIVEL:
        print("AVISO: google-generativeai não instalado")
        print("Instale: pip install google-generativeai")

    app = InterfaceRenomerIA()
    app.executar()
