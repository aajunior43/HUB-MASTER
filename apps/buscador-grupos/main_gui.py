"""
WhatsApp Group Link Searcher - Enhanced GUI Version
Interface gráfica moderna usando tkinter com recursos avançados
"""

import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import threading
import os
import sys
import json
from datetime import datetime
import queue

# Importar a lógica core
from core_logic import buscar_grupos_whatsapp


class BuscadorGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("🔍 Buscador de Grupos e Comunidades")
        self.root.geometry("900x700")
        self.root.minsize(800, 600)
        
        # Variáveis
        self.plataforma_var = tk.StringVar(value="whatsapp")
        self.termo_var = tk.StringVar()
        self.max_pages_var = tk.IntVar(value=5)
        self.auto_open_var = tk.BooleanVar(value=False)
        self.is_searching = False
        self.stop_event = threading.Event()
        self.message_queue = queue.Queue()
        self.current_page = 0
        self.total_pages = 5
        self.total_links = 0
        
        # Cores modernas
        self.bg_color = "#2b2b2b"
        self.fg_color = "#ffffff"
        self.accent_color = "#4CAF50"
        self.button_color = "#2196F3"
        self.text_bg = "#1e1e1e"
        self.warning_color = "#ff9800"
        
        # Configurar estilo
        self.setup_style()
        
        # Criar interface
        self.create_widgets()
        
        # Configurar atalhos de teclado
        self.setup_keyboard_shortcuts()
        
        # Iniciar processamento de mensagens
        self.process_queue()
        
        # Configurar pasta de resultados
        self.pasta_base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "resultados")
        if not os.path.exists(self.pasta_base):
            os.makedirs(self.pasta_base)
        
        # Carregar configurações e histórico
        self.settings_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "settings.json")
        self.load_settings()
    
    def setup_style(self):
        """Configurar estilo moderno"""
        style = ttk.Style()
        style.theme_use('clam')
        
        # Configurar cores
        style.configure("TFrame", background=self.bg_color)
        style.configure("TLabel", background=self.bg_color, foreground=self.fg_color, font=("Segoe UI", 10))
        style.configure("Title.TLabel", font=("Segoe UI", 16, "bold"), foreground=self.accent_color)
        style.configure("TRadiobutton", background=self.bg_color, foreground=self.fg_color, font=("Segoe UI", 9))
        style.configure("TCheckbutton", background=self.bg_color, foreground=self.fg_color, font=("Segoe UI", 9))
        
        # Progress bar style
        style.configure("green.Horizontal.TProgressbar", 
                       background=self.accent_color,
                       troughcolor=self.text_bg,
                       bordercolor=self.bg_color,
                       lightcolor=self.accent_color,
                       darkcolor=self.accent_color)
        
        # Configurar root
        self.root.configure(bg=self.bg_color)
    
    def create_widgets(self):
        """Criar todos os widgets da interface"""
        
        # Frame principal com scrollbar
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # ===== HEADER =====
        header_frame = ttk.Frame(main_frame)
        header_frame.pack(fill=tk.X, pady=(0, 15))
        
        title_label = ttk.Label(
            header_frame,
            text="🔍 Buscador de Grupos e Comunidades",
            style="Title.TLabel"
        )
        title_label.pack()
        
        subtitle_label = ttk.Label(
            header_frame,
            text="WhatsApp | Telegram | Discord | Reddit | Facebook",
            font=("Segoe UI", 9, "italic")
        )
        subtitle_label.pack()
        
        # ===== CONFIGURAÇÕES =====
        config_frame = ttk.Frame(main_frame)
        config_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Plataforma
        plat_label = ttk.Label(config_frame, text="📱 Plataforma:", font=("Segoe UI", 10, "bold"))
        plat_label.pack(anchor=tk.W, pady=(0, 5))
        
        plat_frame = ttk.Frame(config_frame)
        plat_frame.pack(fill=tk.X, pady=(0, 10))
        
        plataformas = [
            ("🟢 WhatsApp", "whatsapp"),
            ("🔵 Telegram", "telegram"),
            ("🟣 Discord", "discord"),
            ("🟠 Reddit", "reddit"),
            ("🔵 Facebook", "facebook")
        ]
        
        for i, (text, value) in enumerate(plataformas):
            rb = ttk.Radiobutton(
                plat_frame,
                text=text,
                variable=self.plataforma_var,
                value=value
            )
            rb.pack(side=tk.LEFT, padx=(0, 15))
        
        # Termo de busca com histórico
        termo_frame = ttk.Frame(config_frame)
        termo_frame.pack(fill=tk.X, pady=(0, 5))
        
        termo_label = ttk.Label(termo_frame, text="🔍 Termo de busca:", font=("Segoe UI", 10, "bold"))
        termo_label.pack(side=tk.LEFT, padx=(0, 10))
        
        # Botão de histórico
        self.history_button = tk.Button(
            termo_frame,
            text="📜 Histórico",
            command=self.show_history,
            font=("Segoe UI", 8),
            bg="#555555",
            fg=self.fg_color,
            activebackground="#666666",
            activeforeground=self.fg_color,
            relief=tk.FLAT,
            cursor="hand2",
            padx=10,
            pady=2
        )
        self.history_button.pack(side=tk.LEFT)
        
        termo_entry_frame = ttk.Frame(config_frame)
        termo_entry_frame.pack(fill=tk.X, pady=(0, 2))
        
        self.termo_entry = tk.Entry(
            termo_entry_frame,
            textvariable=self.termo_var,
            font=("Segoe UI", 11),
            bg="#3c3c3c",
            fg=self.fg_color,
            insertbackground=self.fg_color,
            relief=tk.FLAT,
            bd=5
        )
        self.termo_entry.pack(fill=tk.X, ipady=5)
        
        hint_label = ttk.Label(
            config_frame,
            text="💡 Exemplos: futebol, tecnologia, estudos (deixe em branco para buscar todos)",
            font=("Segoe UI", 8, "italic"),
            foreground="#888888"
        )
        hint_label.pack(anchor=tk.W, pady=(2, 0))
        
        # ===== CONFIGURAÇÕES AVANÇADAS =====
        settings_frame = ttk.Frame(main_frame)
        settings_frame.pack(fill=tk.X, pady=(10, 0))
        
        settings_label = ttk.Label(settings_frame, text="⚙️ Configurações:", font=("Segoe UI", 10, "bold"))
        settings_label.pack(anchor=tk.W, pady=(0, 5))
        
        settings_controls = ttk.Frame(settings_frame)
        settings_controls.pack(fill=tk.X)
        
        # Max páginas
        max_pages_frame = ttk.Frame(settings_controls)
        max_pages_frame.pack(side=tk.LEFT, padx=(0, 20))
        
        max_pages_label = ttk.Label(max_pages_frame, text="Páginas máx:", font=("Segoe UI", 9))
        max_pages_label.pack(side=tk.LEFT, padx=(0, 5))
        
        self.max_pages_spinbox = tk.Spinbox(
            max_pages_frame,
            from_=1,
            to=20,
            textvariable=self.max_pages_var,
            width=5,
            font=("Segoe UI", 9),
            bg="#3c3c3c",
            fg=self.fg_color,
            buttonbackground="#555555",
            relief=tk.FLAT,
            bd=3
        )
        self.max_pages_spinbox.pack(side=tk.LEFT)
        
        # Auto-abrir resultados
        auto_open_check = ttk.Checkbutton(
            settings_controls,
            text="📁 Abrir pasta automaticamente",
            variable=self.auto_open_var
        )
        auto_open_check.pack(side=tk.LEFT)
        
        # ===== BOTÕES =====
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, pady=(15, 10))
        
        self.start_button = tk.Button(
            button_frame,
            text="🚀 Iniciar Busca (Ctrl+Enter)",
            command=self.iniciar_busca,
            font=("Segoe UI", 11, "bold"),
            bg=self.accent_color,
            fg="white",
            activebackground="#45a049",
            activeforeground="white",
            relief=tk.FLAT,
            cursor="hand2",
            padx=20,
            pady=10
        )
        self.start_button.pack(side=tk.LEFT, padx=(0, 10))
        
        self.stop_button = tk.Button(
            button_frame,
            text="⏹ Parar (Ctrl+S)",
            command=self.parar_busca,
            font=("Segoe UI", 11, "bold"),
            bg="#f44336",
            fg="white",
            activebackground="#da190b",
            activeforeground="white",
            relief=tk.FLAT,
            cursor="hand2",
            padx=20,
            pady=10,
            state=tk.DISABLED
        )
        self.stop_button.pack(side=tk.LEFT, padx=(0, 10))
        
        self.folder_button = tk.Button(
            button_frame,
            text="📁 Abrir Resultados (Ctrl+O)",
            command=self.abrir_pasta_resultados,
            font=("Segoe UI", 11, "bold"),
            bg=self.button_color,
            fg="white",
            activebackground="#0b7dda",
            activeforeground="white",
            relief=tk.FLAT,
            cursor="hand2",
            padx=20,
            pady=10
        )
        self.folder_button.pack(side=tk.LEFT)
        
        # ===== BARRA DE PROGRESSO =====
        progress_frame = ttk.Frame(main_frame)
        progress_frame.pack(fill=tk.X, pady=(10, 5))
        
        progress_header = ttk.Frame(progress_frame)
        progress_header.pack(fill=tk.X, pady=(0, 5))
        
        progress_label = ttk.Label(progress_header, text="📊 Progresso:", font=("Segoe UI", 10, "bold"))
        progress_label.pack(side=tk.LEFT)
        
        self.progress_percent_label = ttk.Label(
            progress_header,
            text="0%",
            font=("Segoe UI", 10, "bold"),
            foreground=self.accent_color
        )
        self.progress_percent_label.pack(side=tk.RIGHT)
        
        self.progress_bar = ttk.Progressbar(
            progress_frame,
            mode='determinate',
            maximum=100,
            style="green.Horizontal.TProgressbar"
        )
        self.progress_bar.pack(fill=tk.X, pady=(0, 5))
        
        self.progress_detail_label = ttk.Label(
            progress_frame,
            text="Aguardando início...",
            font=("Segoe UI", 8, "italic"),
            foreground="#888888"
        )
        self.progress_detail_label.pack(anchor=tk.W)
        
        # ===== ÁREA DE LOG =====
        log_label = ttk.Label(main_frame, text="📝 Log de Atividades:", font=("Segoe UI", 10, "bold"))
        log_label.pack(anchor=tk.W, pady=(10, 5))
        
        # Text widget com scrollbar
        self.progress_text = scrolledtext.ScrolledText(
            main_frame,
            font=("Consolas", 9),
            bg=self.text_bg,
            fg="#00ff00",
            insertbackground=self.fg_color,
            relief=tk.FLAT,
            wrap=tk.WORD,
            state=tk.DISABLED,
            height=12
        )
        self.progress_text.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Configurar tags para cores
        self.progress_text.tag_config("success", foreground="#4CAF50")
        self.progress_text.tag_config("error", foreground="#f44336")
        self.progress_text.tag_config("warning", foreground="#ff9800")
        self.progress_text.tag_config("info", foreground="#2196F3")
        self.progress_text.tag_config("normal", foreground="#00ff00")
        
        # ===== STATUS BAR =====
        status_frame = ttk.Frame(main_frame)
        status_frame.pack(fill=tk.X)
        
        self.status_label = ttk.Label(
            status_frame,
            text="✅ Pronto para buscar",
            font=("Segoe UI", 9),
            foreground="#4CAF50"
        )
        self.status_label.pack(side=tk.LEFT)
        
        self.links_label = ttk.Label(
            status_frame,
            text="Links: 0",
            font=("Segoe UI", 9, "bold"),
            foreground=self.accent_color
        )
        self.links_label.pack(side=tk.RIGHT)
    
    def setup_keyboard_shortcuts(self):
        """Configurar atalhos de teclado"""
        self.root.bind('<Control-Return>', lambda e: self.iniciar_busca())
        self.root.bind('<Control-s>', lambda e: self.parar_busca())
        self.root.bind('<Control-S>', lambda e: self.parar_busca())
        self.root.bind('<Control-o>', lambda e: self.abrir_pasta_resultados())
        self.root.bind('<Control-O>', lambda e: self.abrir_pasta_resultados())
        self.root.bind('<Control-h>', lambda e: self.show_history())
        self.root.bind('<Control-H>', lambda e: self.show_history())
        self.root.bind('<Escape>', lambda e: self.root.focus())
    
    def load_settings(self):
        """Carregar configurações salvas"""
        try:
            if os.path.exists(self.settings_file):
                with open(self.settings_file, 'r', encoding='utf-8') as f:
                    settings = json.load(f)
                    self.max_pages_var.set(settings.get('max_pages', 5))
                    self.auto_open_var.set(settings.get('auto_open_results', False))
                    self.search_history = settings.get('search_history', [])
            else:
                self.search_history = []
        except Exception as e:
            self.search_history = []
            print(f"Erro ao carregar configurações: {e}")
    
    def save_settings(self):
        """Salvar configurações"""
        try:
            settings = {
                'max_pages': self.max_pages_var.get(),
                'auto_open_results': self.auto_open_var.get(),
                'search_history': self.search_history[-10:]  # Manter apenas últimas 10
            }
            with open(self.settings_file, 'w', encoding='utf-8') as f:
                json.dump(settings, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Erro ao salvar configurações: {e}")
    
    def add_to_history(self, termo, plataforma):
        """Adicionar busca ao histórico"""
        if not termo:
            termo = "(todos)"
        
        history_entry = {
            'termo': termo,
            'plataforma': plataforma,
            'data': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Remover duplicatas
        self.search_history = [h for h in self.search_history 
                              if not (h['termo'] == termo and h['plataforma'] == plataforma)]
        
        # Adicionar no início
        self.search_history.insert(0, history_entry)
        
        # Manter apenas últimas 10
        self.search_history = self.search_history[:10]
        
        # Salvar
        self.save_settings()
    
    def show_history(self):
        """Mostrar histórico de buscas"""
        if not self.search_history:
            messagebox.showinfo("Histórico", "Nenhuma busca realizada ainda.")
            return
        
        # Criar janela de histórico
        history_window = tk.Toplevel(self.root)
        history_window.title("📜 Histórico de Buscas")
        history_window.geometry("500x400")
        history_window.configure(bg=self.bg_color)
        history_window.transient(self.root)
        
        # Centralizar
        history_window.update_idletasks()
        x = (history_window.winfo_screenwidth() // 2) - (history_window.winfo_width() // 2)
        y = (history_window.winfo_screenheight() // 2) - (history_window.winfo_height() // 2)
        history_window.geometry(f"+{x}+{y}")
        
        # Frame principal
        frame = ttk.Frame(history_window, padding="20")
        frame.pack(fill=tk.BOTH, expand=True)
        
        title = ttk.Label(frame, text="📜 Histórico de Buscas", style="Title.TLabel")
        title.pack(pady=(0, 15))
        
        # Lista de histórico
        list_frame = ttk.Frame(frame)
        list_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        scrollbar = ttk.Scrollbar(list_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        history_list = tk.Listbox(
            list_frame,
            font=("Segoe UI", 10),
            bg=self.text_bg,
            fg=self.fg_color,
            selectbackground=self.accent_color,
            selectforeground="white",
            relief=tk.FLAT,
            yscrollcommand=scrollbar.set
        )
        history_list.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=history_list.yview)
        
        # Preencher lista
        for entry in self.search_history:
            plat_emoji = {
                'whatsapp': '🟢',
                'telegram': '🔵',
                'discord': '🟣',
                'reddit': '🟠',
                'facebook': '🔵'
            }.get(entry['plataforma'], '⚪')
            
            text = f"{plat_emoji} {entry['termo']} | {entry['plataforma'].title()} | {entry['data']}"
            history_list.insert(tk.END, text)
        
        # Botões
        button_frame = ttk.Frame(frame)
        button_frame.pack(fill=tk.X)
        
        def use_selected():
            selection = history_list.curselection()
            if selection:
                idx = selection[0]
                entry = self.search_history[idx]
                self.termo_var.set(entry['termo'] if entry['termo'] != "(todos)" else "")
                self.plataforma_var.set(entry['plataforma'])
                history_window.destroy()
        
        def clear_history():
            if messagebox.askyesno("Confirmar", "Deseja limpar todo o histórico?"):
                self.search_history = []
                self.save_settings()
                history_window.destroy()
        
        use_button = tk.Button(
            button_frame,
            text="✅ Usar Selecionado",
            command=use_selected,
            font=("Segoe UI", 10, "bold"),
            bg=self.accent_color,
            fg="white",
            relief=tk.FLAT,
            cursor="hand2",
            padx=15,
            pady=8
        )
        use_button.pack(side=tk.LEFT, padx=(0, 10))
        
        clear_button = tk.Button(
            button_frame,
            text="🗑️ Limpar Histórico",
            command=clear_history,
            font=("Segoe UI", 10, "bold"),
            bg="#f44336",
            fg="white",
            relief=tk.FLAT,
            cursor="hand2",
            padx=15,
            pady=8
        )
        clear_button.pack(side=tk.LEFT)
        
        # Double-click para usar
        history_list.bind('<Double-Button-1>', lambda e: use_selected())
    
    def update_progress(self, current, total):
        """Atualizar barra de progresso"""
        self.current_page = current
        self.total_pages = total
        percentage = int((current / total) * 100) if total > 0 else 0
        self.progress_bar['value'] = percentage
        self.progress_percent_label.config(text=f"{percentage}%")
        self.progress_detail_label.config(text=f"Página {current} de {total}")
    
    def log_message(self, message, tag="normal"):
        """Adicionar mensagem ao log"""
        self.message_queue.put((message, tag))
    
    def process_queue(self):
        """Processar mensagens da fila"""
        try:
            while True:
                message, tag = self.message_queue.get_nowait()
                self.progress_text.config(state=tk.NORMAL)
                self.progress_text.insert(tk.END, message + "\n", tag)
                self.progress_text.see(tk.END)
                self.progress_text.config(state=tk.DISABLED)
                
                # Atualizar progresso se mensagem contém informação de página
                if "Processando página" in message:
                    try:
                        # Extrair número da página
                        parts = message.split("página")[1].split("...")
                        current = int(parts[0].strip())
                        self.update_progress(current, self.max_pages_var.get())
                    except:
                        pass
        except queue.Empty:
            pass
        
        # Agendar próxima verificação
        self.root.after(100, self.process_queue)
    
    def update_status(self, text, color="#4CAF50"):
        """Atualizar status bar"""
        self.status_label.config(text=text, foreground=color)
    
    def update_link_count(self, count):
        """Atualizar contador de links"""
        self.total_links = count
        self.links_label.config(text=f"Links: {count}")
    
    def iniciar_busca(self):
        """Iniciar busca em thread separada"""
        if self.is_searching:
            messagebox.showwarning("Aviso", "Uma busca já está em andamento!")
            return
        
        # Validar configurações
        max_pages = self.max_pages_var.get()
        if max_pages < 1 or max_pages > 20:
            messagebox.showerror("Erro", "O número de páginas deve estar entre 1 e 20!")
            return
        
        # Limpar log anterior
        self.progress_text.config(state=tk.NORMAL)
        self.progress_text.delete(1.0, tk.END)
        self.progress_text.config(state=tk.DISABLED)
        
        # Resetar progresso
        self.update_progress(0, max_pages)
        self.update_link_count(0)
        
        # Resetar stop flag
        self.stop_event.clear()
        
        # Obter parâmetros
        plataforma = self.plataforma_var.get()
        termo = self.termo_var.get().strip()
        
        # Adicionar ao histórico
        self.add_to_history(termo, plataforma)
        
        # Atualizar UI
        self.is_searching = True
        self.start_button.config(state=tk.DISABLED)
        self.stop_button.config(state=tk.NORMAL)
        self.update_status("🔄 Buscando...", self.warning_color)
        
        # Log inicial
        self.log_message("=" * 70, "info")
        self.log_message(f"🚀 Iniciando busca", "success")
        self.log_message(f"📱 Plataforma: {plataforma.upper()}", "info")
        self.log_message(f"🔍 Termo: {termo if termo else 'todos'}", "info")
        self.log_message(f"📄 Páginas máximas: {max_pages}", "info")
        self.log_message("=" * 70, "info")
        
        # Iniciar thread
        thread = threading.Thread(
            target=self.executar_busca,
            args=(termo, plataforma, max_pages),
            daemon=True
        )
        thread.start()
    
    def executar_busca(self, termo, plataforma, max_pages):
        """Executar busca (roda em thread separada)"""
        try:
            # Modificar core_logic temporariamente para usar max_pages configurável
            import core_logic
            original_max_pages = 5
            
            def progress_callback(msg):
                """Callback para atualizar progresso"""
                # Determinar tag baseado no conteúdo
                tag = "normal"
                if "✅" in msg or "sucesso" in msg.lower():
                    tag = "success"
                elif "❌" in msg or "erro" in msg.lower():
                    tag = "error"
                elif "⚠️" in msg or "aviso" in msg.lower():
                    tag = "warning"
                elif "🔍" in msg or "📄" in msg or "📊" in msg:
                    tag = "info"
                
                self.log_message(msg, tag)
                
                # Atualizar contador de links
                if "Total acumulado:" in msg:
                    try:
                        count = int(msg.split("Total acumulado:")[1].split("links")[0].strip())
                        self.root.after(0, self.update_link_count, count)
                    except:
                        pass
            
            def captcha_callback():
                """Callback para notificar CAPTCHA"""
                self.root.after(0, self.mostrar_captcha_dialog)
            
            # Executar busca com max_pages personalizado
            # Precisamos modificar a função para aceitar max_pages
            resultado = self.buscar_com_max_pages(
                termo_usuario=termo,
                plataforma=plataforma,
                max_pages=max_pages,
                progress_callback=progress_callback,
                captcha_callback=captcha_callback
            )
            
            # Processar resultado
            self.root.after(0, self.finalizar_busca, resultado)
            
        except Exception as e:
            self.root.after(0, self.finalizar_busca, {"success": False, "erro": str(e)})
    
    def buscar_com_max_pages(self, termo_usuario, plataforma, max_pages, progress_callback, captcha_callback):
        """Wrapper para buscar_grupos_whatsapp com max_pages configurável"""
        # Importar e modificar temporariamente
        from selenium import webdriver
        from selenium.webdriver.chrome.service import Service
        from selenium.webdriver.common.by import By
        from selenium.webdriver.common.keys import Keys
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        from webdriver_manager.chrome import ChromeDriverManager
        import time
        from core_logic import verificar_e_aguardar_captcha, extrair_links_pagina
        
        driver = None
        
        try:
            progress_callback("🚀 Iniciando o navegador Chrome...")
            
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service)
            
            if self.stop_event.is_set():
                return {"success": False, "erro": "Operação cancelada pelo usuário"}
            
            driver.maximize_window()
            progress_callback("✅ Chrome aberto com sucesso!")
            
            progress_callback("🔍 Acessando o Google...")
            driver.get("https://www.google.com")
            
            if self.stop_event.is_set():
                return {"success": False, "erro": "Operação cancelada pelo usuário"}
            
            time.sleep(2)
            
            search_box = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.NAME, "q"))
            )
            
            # Construir termo de busca
            if plataforma == "whatsapp":
                termo_busca = f'{termo_usuario} "chat.whatsapp.com"' if termo_usuario else '"chat.whatsapp.com"'
            elif plataforma == "telegram":
                termo_busca = f'{termo_usuario} "t.me"' if termo_usuario else '"t.me"'
            elif plataforma == "discord":
                termo_busca = f'{termo_usuario} "discord.gg"' if termo_usuario else '"discord.gg"'
            elif plataforma == "reddit":
                termo_busca = f'{termo_usuario} "reddit.com/r/"' if termo_usuario else '"reddit.com/r/"'
            else:
                termo_busca = f'{termo_usuario} "facebook.com/groups/"' if termo_usuario else '"facebook.com/groups/"'
            
            progress_callback(f"🔎 Buscando por: '{termo_busca}'")
            
            search_box.send_keys(termo_busca)
            search_box.send_keys(Keys.RETURN)
            
            if self.stop_event.is_set():
                return {"success": False, "erro": "Operação cancelada pelo usuário"}
            
            progress_callback("⏳ Aguardando resultados...")
            time.sleep(3)
            
            verificar_e_aguardar_captcha(driver, captcha_callback if captcha_callback else None)
            
            if self.stop_event.is_set():
                return {"success": False, "erro": "Operação cancelada pelo usuário"}
            
            todos_links = set()
            pagina_atual = 1
            
            progress_callback("=" * 70)
            progress_callback("📄 PROCESSANDO PÁGINAS DE RESULTADOS")
            progress_callback("=" * 70)
            
            while pagina_atual <= max_pages:
                if self.stop_event.is_set():
                    return {"success": False, "erro": "Operação cancelada pelo usuário"}
                
                progress_callback(f"📖 Processando página {pagina_atual}...")
                time.sleep(3)
                
                links_pagina = extrair_links_pagina(driver, plataforma)
                
                if links_pagina:
                    todos_links.update(links_pagina)
                    progress_callback(f"   ✅ {len(links_pagina)} links encontrados nesta página")
                    progress_callback(f"   📊 Total acumulado: {len(todos_links)} links únicos")
                else:
                    progress_callback("   ⚠️ Nenhum link encontrado nesta página")
                
                # Próxima página
                try:
                    next_button = None
                    selectors = [
                        "a#pnnext",
                        "a[aria-label='Próxima página']",
                        "a[aria-label='Next page']",
                        "td.d6cvqb a",
                        "a[href*='start=']"
                    ]
                    
                    for selector in selectors:
                        try:
                            next_button = driver.find_element(By.CSS_SELECTOR, selector)
                            if next_button and next_button.is_displayed():
                                break
                        except:
                            continue
                    
                    if next_button and next_button.is_displayed():
                        progress_callback(f"   ➡️  Avançando para página {pagina_atual + 1}...")
                        next_button.click()
                        pagina_atual += 1
                        time.sleep(2)
                        verificar_e_aguardar_captcha(driver, captcha_callback if captcha_callback else None)
                    else:
                        progress_callback(f"   ℹ️  Não há mais páginas disponíveis (última página: {pagina_atual})")
                        break
                except:
                    progress_callback(f"   ℹ️  Fim da paginação (processadas {pagina_atual} páginas)")
                    break
            
            # Salvar resultados
            progress_callback("=" * 70)
            progress_callback("📋 SALVANDO RESULTADOS")
            progress_callback("=" * 70)
            
            arquivo_salvo = None
            
            if todos_links:
                links_lista = sorted(list(todos_links))
                
                for i, link in enumerate(links_lista, 1):
                    if "chat.whatsapp.com" in link:
                        progress_callback(f"{i}. 🟢 [WhatsApp] {link}")
                    elif "t.me" in link:
                        progress_callback(f"{i}. 🔵 [Telegram] {link}")
                    elif "discord.gg" in link or "discord.com/invite" in link:
                        progress_callback(f"{i}. 🟣 [Discord] {link}")
                    elif "reddit.com/r/" in link:
                        progress_callback(f"{i}. 🟠 [Reddit] {link}")
                    elif "facebook.com/groups/" in link:
                        progress_callback(f"{i}. 🔵 [Facebook] {link}")
                    else:
                        progress_callback(f"{i}. {link}")
                
                # Salvar arquivo
                try:
                    if termo_usuario:
                        nome_pasta = "".join(c if c.isalnum() or c in " -_" else "_" for c in termo_usuario).strip()
                    else:
                        nome_pasta = "todos_grupos"
                    
                    pasta_tema = os.path.join(self.pasta_base, nome_pasta)
                    
                    if not os.path.exists(pasta_tema):
                        os.makedirs(pasta_tema)
                        progress_callback(f"📁 Pasta criada: {pasta_tema}")
                    
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    nome_arquivo = f"{plataforma}_{timestamp}.txt"
                    caminho_arquivo = os.path.join(pasta_tema, nome_arquivo)
                    
                    with open(caminho_arquivo, "w", encoding="utf-8") as f:
                        f.write(f"# Links de {plataforma.upper()}\n")
                        f.write(f"# Termo de busca: {termo_usuario if termo_usuario else 'todos'}\n")
                        f.write(f"# Data: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n")
                        f.write(f"# Total: {len(links_lista)} links\n")
                        f.write(f"# Páginas processadas: {pagina_atual}\n")
                        f.write("=" * 60 + "\n\n")
                        
                        for link in links_lista:
                            f.write(f"{link}\n")
                    
                    arquivo_salvo = caminho_arquivo
                    progress_callback(f"💾 Links salvos em: {caminho_arquivo}")
                    progress_callback(f"   📊 {len(links_lista)} links salvos com sucesso!")
                    
                except Exception as e:
                    progress_callback(f"⚠️ Erro ao salvar arquivo: {str(e)}")
            else:
                progress_callback("⚠️ Nenhum link encontrado. Tente outro termo de busca.")
            
            progress_callback("=" * 70)
            progress_callback(f"✅ Total de {len(todos_links)} links únicos encontrados em {pagina_atual} página(s)!")
            
            return {
                "success": True,
                "links": list(todos_links),
                "arquivo": arquivo_salvo,
                "total_paginas": pagina_atual
            }
            
        except Exception as e:
            error_msg = f"❌ Erro ao executar o script: {str(e)}"
            progress_callback(error_msg)
            return {"success": False, "erro": str(e)}
        
        finally:
            if driver:
                try:
                    driver.quit()
                    progress_callback("🔒 Navegador fechado.")
                except:
                    pass
    
    def mostrar_captcha_dialog(self):
        """Mostrar diálogo de CAPTCHA"""
        dialog = tk.Toplevel(self.root)
        dialog.title("⚠️ CAPTCHA Detectado")
        dialog.geometry("450x250")
        dialog.configure(bg=self.bg_color)
        dialog.transient(self.root)
        dialog.grab_set()
        
        # Centralizar
        dialog.update_idletasks()
        x = (dialog.winfo_screenwidth() // 2) - (dialog.winfo_width() // 2)
        y = (dialog.winfo_screenheight() // 2) - (dialog.winfo_height() // 2)
        dialog.geometry(f"+{x}+{y}")
        
        # Conteúdo
        frame = ttk.Frame(dialog, padding="20")
        frame.pack(fill=tk.BOTH, expand=True)
        
        icon_label = ttk.Label(frame, text="🤖", font=("Segoe UI", 48))
        icon_label.pack(pady=(0, 10))
        
        msg_label = ttk.Label(
            frame,
            text="CAPTCHA detectado no navegador!",
            font=("Segoe UI", 14, "bold"),
            foreground=self.warning_color
        )
        msg_label.pack(pady=(0, 5))
        
        inst_label = ttk.Label(
            frame,
            text="Por favor, resolva o CAPTCHA no navegador\ne clique em 'Continuar' quando terminar.",
            font=("Segoe UI", 10),
            justify=tk.CENTER
        )
        inst_label.pack(pady=(0, 20))
        
        continue_button = tk.Button(
            frame,
            text="✅ Continuar",
            command=dialog.destroy,
            font=("Segoe UI", 12, "bold"),
            bg=self.accent_color,
            fg="white",
            activebackground="#45a049",
            activeforeground="white",
            relief=tk.FLAT,
            cursor="hand2",
            padx=40,
            pady=12
        )
        continue_button.pack()
        
        # Aguardar fechamento
        self.root.wait_window(dialog)
    
    def parar_busca(self):
        """Parar busca em andamento"""
        if not self.is_searching:
            return
        
        if messagebox.askyesno("Confirmar", "Deseja realmente parar a busca?"):
            self.stop_event.set()
            self.log_message("⏹ Parando busca...", "warning")
            self.update_status("⏹ Parando...", self.warning_color)
    
    def finalizar_busca(self, resultado):
        """Finalizar busca e atualizar UI"""
        self.is_searching = False
        self.start_button.config(state=tk.NORMAL)
        self.stop_button.config(state=tk.DISABLED)
        
        if resultado.get("success"):
            total_links = len(resultado.get("links", []))
            self.update_link_count(total_links)
            self.update_progress(self.max_pages_var.get(), self.max_pages_var.get())
            self.update_status(f"✅ Busca concluída! {total_links} links encontrados", self.accent_color)
            
            # Auto-abrir resultados se configurado
            if self.auto_open_var.get() and total_links > 0:
                self.abrir_pasta_resultados()
            
            # Mostrar diálogo de sucesso
            if total_links > 0:
                msg = f"Busca concluída com sucesso!\n\n"
                msg += f"📊 Total de links: {total_links}\n"
                msg += f"📄 Páginas processadas: {resultado.get('total_paginas', 0)}\n"
                msg += f"💾 Arquivo: {os.path.basename(resultado.get('arquivo', ''))}\n\n"
                
                if not self.auto_open_var.get():
                    msg += "Deseja abrir a pasta de resultados?"
                    if messagebox.askyesno("Sucesso", msg):
                        self.abrir_pasta_resultados()
                else:
                    messagebox.showinfo("Sucesso", msg)
        else:
            erro = resultado.get("erro", "Erro desconhecido")
            self.update_status(f"❌ Erro: {erro}", "#f44336")
            self.update_progress(0, self.max_pages_var.get())
            if "cancelada" not in erro.lower():
                messagebox.showerror("Erro", f"Erro durante a busca:\n\n{erro}\n\nVerifique:\n• Conexão com internet\n• Google Chrome instalado\n• ChromeDriver atualizado")
    
    def abrir_pasta_resultados(self):
        """Abrir pasta de resultados no explorador"""
        if os.path.exists(self.pasta_base):
            os.startfile(self.pasta_base)
        else:
            messagebox.showwarning("Aviso", "Pasta de resultados não encontrada!\n\nRealize uma busca primeiro.")


def main():
    """Função principal"""
    root = tk.Tk()
    app = BuscadorGUI(root)
    
    # Centralizar janela
    root.update_idletasks()
    x = (root.winfo_screenwidth() // 2) - (root.winfo_width() // 2)
    y = (root.winfo_screenheight() // 2) - (root.winfo_height() // 2)
    root.geometry(f"+{x}+{y}")
    
    root.mainloop()


if __name__ == "__main__":
    main()
