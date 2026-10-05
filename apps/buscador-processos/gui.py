"""
GUI Interface for Judicial Process Searcher
NextGen CustomTkinter interface with Sidebar layout, API Support & SQL History
"""

import customtkinter as ctk
import threading
import os
import webbrowser
from core import validar_cpf_cnpj, buscar_processos_judiciais, get_db

# Default theme settings
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

class ProcessSearcherGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("⚖️ Buscador Jurídico - NextGen")
        self.root.geometry("1000x700")
        self.root.minsize(900, 650)
        
        # Variáveis
        self.searching = False
        self.resultado_info = None
        self.filtros_vars = {}
        
        self.setup_ui()
        self.load_history()
    
    def setup_ui(self):
        # Configure layout principal (1 linha, 2 colunas)
        self.root.grid_rowconfigure(0, weight=1)
        self.root.grid_columnconfigure(1, weight=1)
        
        # ==================== SIDEBAR (Menu Lateral) ====================
        self.sidebar_frame = ctk.CTkFrame(self.root, width=220, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(4, weight=1) # Espaçador

        self.logo_label = ctk.CTkLabel(
            self.sidebar_frame, 
            text="⚖️ Buscador\nMestre", 
            font=ctk.CTkFont(size=22, weight="bold")
        )
        self.logo_label.grid(row=0, column=0, padx=20, pady=(30, 5))
        
        self.subtitle_label = ctk.CTkLabel(
            self.sidebar_frame, 
            text="Inteligência de Dados", 
            font=ctk.CTkFont(size=12), text_color="gray"
        )
        self.subtitle_label.grid(row=1, column=0, padx=20, pady=(0, 30))

        # Botões de Navegação
        self.btn_nav_varredura = ctk.CTkButton(
            self.sidebar_frame, text="🔍 Nova Varredura", 
            fg_color="transparent", text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"),
            anchor="w", command=self.show_aba_busca
        )
        self.btn_nav_varredura.grid(row=2, column=0, padx=20, pady=5, sticky="ew")

        self.btn_nav_historico = ctk.CTkButton(
            self.sidebar_frame, text="📂 Histórico de Laudos", 
            fg_color="transparent", text_color=("gray10", "gray90"), hover_color=("gray70", "gray30"),
            anchor="w", command=self.show_aba_historico
        )
        self.btn_nav_historico.grid(row=3, column=0, padx=20, pady=5, sticky="ew")
        
        # Controles de Tema (Fundo da Sidebar)
        self.lbl_tema = ctk.CTkLabel(self.sidebar_frame, text="Aparência:", anchor="w")
        self.lbl_tema.grid(row=5, column=0, padx=20, pady=(10, 0), sticky="w")
        self.opt_tema = ctk.CTkOptionMenu(
            self.sidebar_frame, values=["Dark", "Light"],
            command=self.change_appearance_mode_event
        )
        self.opt_tema.grid(row=6, column=0, padx=20, pady=(10, 20), sticky="ew")

        # ==================== MAIN AREA (Conteúdo Principal) ====================
        self.main_frame = ctk.CTkFrame(self.root, fg_color="transparent")
        self.main_frame.grid(row=0, column=1, sticky="nsew", padx=20, pady=20)
        self.main_frame.grid_rowconfigure(0, weight=1)
        self.main_frame.grid_columnconfigure(0, weight=1)

        # Criando os frames flutuantes que ficarão alternando
        self.frame_busca = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        self.frame_historico = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        
        self._setup_frame_busca()
        self._setup_frame_historico()
        
        # Mostrar Busca por padrão
        self.show_aba_busca()

    def change_appearance_mode_event(self, new_appearance_mode: str):
        ctk.set_appearance_mode(new_appearance_mode)

    def show_aba_busca(self):
        # Destacar o botão de menu ativo
        self.btn_nav_varredura.configure(fg_color=("gray75", "gray25"))
        self.btn_nav_historico.configure(fg_color="transparent")
        
        self.frame_historico.grid_forget()
        self.frame_busca.grid(row=0, column=0, sticky="nsew")

    def show_aba_historico(self):
        # Destacar o botão de menu ativo
        self.btn_nav_varredura.configure(fg_color="transparent")
        self.btn_nav_historico.configure(fg_color=("gray75", "gray25"))
        
        self.frame_busca.grid_forget()
        self.frame_historico.grid(row=0, column=0, sticky="nsew")
        self.load_history() # recarrega o histórico sempre que abrir a aba

    def _setup_frame_busca(self):
        self.frame_busca.grid_columnconfigure(0, weight=2) # Painel Input
        self.frame_busca.grid_columnconfigure(1, weight=3) # Painel Log
        self.frame_busca.grid_rowconfigure(0, weight=1)

        # ----- COLUNA 1: PAINEL DE CONTROLE -----
        left_panel = ctk.CTkFrame(self.frame_busca, corner_radius=12)
        left_panel.grid(row=0, column=0, sticky="nsew", padx=(0, 10))
        
        # Título interno
        ctk.CTkLabel(left_panel, text="🎯 Alvo da Investigação", font=ctk.CTkFont(size=18, weight="bold")).pack(anchor="w", padx=20, pady=(20, 5))
        
        # Caixa de Texto CPF/CNPJ
        self.doc_entry = ctk.CTkEntry(left_panel, placeholder_text="000.000.000-00", height=45, font=ctk.CTkFont(size=14))
        self.doc_entry.pack(fill="x", padx=20, pady=(10, 5))
        self.doc_entry.bind('<KeyRelease>', self.validate_document_realtime)
        
        self.validation_label = ctk.CTkLabel(left_panel, text="Digite 11 (CPF) ou 14 dígitos (CNPJ)", font=ctk.CTkFont(size=11), text_color="gray")
        self.validation_label.pack(anchor="w", padx=20, pady=(0, 20))
        
        # Título de Sessão
        ctk.CTkLabel(left_panel, text="🔎 Módulos de Varredura", font=ctk.CTkFont(size=16, weight="bold")).pack(anchor="w", padx=20, pady=(10, 10))
        
        # Switches de Configuração baseados em dicionário para melhor interface
        modulos = {
            "Geral (Ambos)": [
                "Processos Judiciais (TJs/TRFs/STF)", 
                "Jusbrasil e Diários Oficiais",
                "Dívida Ativa e Regularidade Fiscal",
                "Doações Eleitorais e Vínculos Políticos",
                "Lista Suja de Trabalho Escravo"
            ],
            "Empresarial (Exclusivo CNPJ)": [
                "Investigação Licitatória (TCU/Transparência)", 
                "Multas e Embargos Ambientais (IBAMA)",
                "ReclameAqui e Procon", 
                "Leilões e Falências"
            ],
            "Pessoa Física (Exclusivo CPF)": [
                "Mídia Policial Estadual e Antecedentes", 
                "Redes Sociais Profissionais", 
                "Concursos Públicos e Editais"
            ]
        }
        
        scroll_modulos = ctk.CTkScrollableFrame(left_panel, fg_color="transparent")
        scroll_modulos.pack(fill="both", expand=True, padx=10, pady=5)
        
        self.switches_by_cat = {"Geral (Ambos)": [], "Empresarial (Exclusivo CNPJ)": [], "Pessoa Física (Exclusivo CPF)": []}
        
        for cat_name, items in modulos.items():
            # Cabeçalho da categoria
            ctk.CTkLabel(scroll_modulos, text=f"• {cat_name.upper()}", font=ctk.CTkFont(size=12, weight="bold"), text_color="#3498db").pack(anchor="w", padx=10, pady=(10, 5))
            for f_name in items:
                var = ctk.StringVar(value=f_name) # Todos ligados por padrão
                switch = ctk.CTkSwitch(scroll_modulos, text=f_name, variable=var, onvalue=f_name, offvalue="")
                switch.pack(anchor="w", padx=20, pady=6)
                self.filtros_vars[f_name] = var
                self.switches_by_cat[cat_name].append(switch)

        # Botão Investigar
        self.search_button = ctk.CTkButton(
            left_panel, 
            text="🚀 INICIAR VARREDURA PROFUNDA",
            font=ctk.CTkFont(size=14, weight="bold"),
            height=50,
            command=self.start_search
        )
        self.search_button.pack(fill="x", padx=20, pady=20, side="bottom")

        # ----- COLUNA 2: TERMINAL DE LOGS E AÇÕES -----
        right_panel = ctk.CTkFrame(self.frame_busca, fg_color="transparent")
        right_panel.grid(row=0, column=1, sticky="nsew")
        right_panel.grid_columnconfigure(0, weight=1)
        right_panel.grid_rowconfigure(1, weight=1)
        
        # Status topo
        status_frame = ctk.CTkFrame(right_panel, corner_radius=10, height=65)
        status_frame.grid(row=0, column=0, sticky="new", pady=(0, 10))
        status_frame.grid_propagate(False)
        status_frame.grid_columnconfigure(0, weight=1)
        
        self.status_label = ctk.CTkLabel(status_frame, text="💻 TERMINAL - Aguardando instruções...", font=ctk.CTkFont(size=13, weight="bold"))
        self.status_label.grid(row=0, column=0, sticky="w", padx=15, pady=(5,0))
        self.progress_bar = ctk.CTkProgressBar(status_frame, height=8)
        self.progress_bar.set(0)
        self.progress_bar.grid(row=1, column=0, sticky="ew", padx=15, pady=5)

        # Textbox
        self.results_text = ctk.CTkTextbox(
            right_panel, 
            font=ctk.CTkFont(family="Consolas", size=13),
            corner_radius=10
        )
        self.results_text.grid(row=1, column=0, sticky="nsew", pady=(0, 10))
        self.results_text.tag_config('info', foreground="#FFFFFF")
        self.results_text.tag_config('success', foreground="#2ecc71")
        self.results_text.tag_config('warning', foreground="#f1c40f")
        self.results_text.tag_config('error', foreground="#e74c3c")
        
        # Container Inferior Ações
        action_frame = ctk.CTkFrame(right_panel, fg_color="transparent")
        action_frame.grid(row=2, column=0, sticky="ew")
        
        self.open_html_button = ctk.CTkButton(action_frame, text="🌐 Visualizar Dossiê", height=35, state="disabled", fg_color="#0097e6", hover_color="#00a8ff", command=self.open_html_file)
        self.open_html_button.pack(side="left", padx=(0, 10))
        
        self.open_folder_button = ctk.CTkButton(action_frame, text="📁 Pasta Raiz", height=35, state="disabled", fg_color="#44bd32", hover_color="#4cd137", command=self.open_results_folder)
        self.open_folder_button.pack(side="left", padx=(0, 10))
        
        ctk.CTkButton(action_frame, text="Limpar Tela", width=100, height=35, fg_color="transparent", border_width=1, command=self.clear_results).pack(side="right")

    def _setup_frame_historico(self):
        self.frame_historico.grid_columnconfigure(0, weight=1)
        self.frame_historico.grid_rowconfigure(1, weight=1)
        
        # Cabeçalho do Histórico
        top_hist = ctk.CTkFrame(self.frame_historico, corner_radius=10)
        top_hist.grid(row=0, column=0, sticky="ew", pady=(0, 10))
        
        ctk.CTkLabel(top_hist, text="📂 Histórico de Investigação", font=ctk.CTkFont(size=20, weight="bold")).pack(side="left", padx=20, pady=15)
        ctk.CTkButton(top_hist, text="🔄 Sincronizar", fg_color="transparent", border_width=1, command=self.load_history).pack(side="right", padx=20)
        
        # Scroll das Cartelas
        self.scroll_hist = ctk.CTkScrollableFrame(self.frame_historico, corner_radius=10)
        self.scroll_hist.grid(row=1, column=0, sticky="nsew")

    def load_history(self):
        for widget in self.scroll_hist.winfo_children():
            widget.destroy()
            
        try:
            conn = get_db()
            cursor = conn.execute("SELECT * FROM buscas ORDER BY id DESC")
            rows = cursor.fetchall()
            conn.close()
            
            if not rows:
                ctk.CTkLabel(self.scroll_hist, text="Nenhum registro de busca encontrado na base local.", text_color="gray").pack(pady=40)
                return
                
            for row in rows:
                card = ctk.CTkFrame(self.scroll_hist, corner_radius=10, fg_color="#2f3640" if ctk.get_appearance_mode()=="Dark" else "#f1f2f6")
                card.pack(fill="x", padx=10, pady=8)
                
                info = f"🎯 Alvo: {row['documento']} ({row['tipo_doc']})\n" \
                       f"📅 Realizado em: {row['data_busca']}\n" \
                       f"🚨 Capturas: {row['total_resultados']} itens encontrados"
                
                ctk.CTkLabel(card, text=info, justify="left", anchor="w", 
                             font=ctk.CTkFont(size=13)).pack(side="left", padx=20, pady=15)
                
                def make_open_html(path):
                    return lambda: webbrowser.open(f'file://{path}') if os.path.exists(path) else None
                
                ctk.CTkButton(card, text="Abrir Dossiê", width=120, height=35, fg_color="#0097e6", hover_color="#00a8ff",
                              command=make_open_html(row['arquivo_html'])).pack(side="right", padx=20, pady=15)
                              
        except Exception as e:
            ctk.CTkLabel(self.scroll_hist, text=f"Erro de Banco de Dados: {e}", text_color="red").pack()

    def validate_document_realtime(self, event=None):
        documento = self.doc_entry.get().strip()
        if not documento:
            self.validation_label.configure(text="Digite 11 (CPF) ou 14 dígitos (CNPJ)", text_color="gray")
            for cat, widgets in self.switches_by_cat.items():
                for sw in widgets:
                    sw.configure(state="normal")
            return
            
        tipo_doc, doc_formatado, _ = validar_cpf_cnpj(documento)
        
        if tipo_doc == "CPF":
            self.validation_label.configure(text=f"✅ {tipo_doc} Validado: {doc_formatado}", text_color="#2ecc71")
            for sw in self.switches_by_cat["Empresarial (Exclusivo CNPJ)"]:
                sw.configure(state="disabled")
                self.filtros_vars[sw.cget("text")].set("")
            for sw in self.switches_by_cat["Pessoa Física (Exclusivo CPF)"]:
                sw.configure(state="normal")
                self.filtros_vars[sw.cget("text")].set(sw.cget("text"))
        elif tipo_doc == "CNPJ":
            self.validation_label.configure(text=f"✅ {tipo_doc} Validado: {doc_formatado}", text_color="#2ecc71")
            for sw in self.switches_by_cat["Pessoa Física (Exclusivo CPF)"]:
                sw.configure(state="disabled")
                self.filtros_vars[sw.cget("text")].set("")
            for sw in self.switches_by_cat["Empresarial (Exclusivo CNPJ)"]:
                sw.configure(state="normal")
                self.filtros_vars[sw.cget("text")].set(sw.cget("text"))
        else:
            self.validation_label.configure(text="❌ Formato imperfeito. Continue digitando.", text_color="#e74c3c")
            
    def start_search(self):
        if self.searching:
            return
            
        documento = self.doc_entry.get().strip()
        tipo_doc, _, _ = validar_cpf_cnpj(documento)
        
        if not tipo_doc:
            self.update_progress("❌ O Alvo introduzido é inválido!", 0, 'error')
            return
            
        filtros_selecionados = [nome for nome, var in self.filtros_vars.items() if var.get() != ""]
        
        if not filtros_selecionados:
            self.update_progress("❌ ATENÇÃO: Habilite um (ou mais) Módulos de Varredura para prosseguir.", 0, 'error')
            return
            
        self.clear_results()
        self.search_button.configure(state="disabled", text="⏳ VARREDURA EM ANDAMENTO...")
        self.searching = True
        
        search_thread = threading.Thread(target=self.perform_search, args=(documento, filtros_selecionados))
        search_thread.daemon = True
        search_thread.start()
        
    def perform_search(self, documento, filtros_ativas):
        try:
            resultado = buscar_processos_judiciais(
                documento=documento,
                filtros=filtros_ativas,
                progress_callback=self.update_progress
            )
            
            if resultado:
                self.resultado_info = resultado
                self.root.after(0, self.enable_action_buttons)
                self.root.after(0, self.load_history)
                
                arq_html = resultado['arquivo_html']
                if os.path.exists(arq_html):
                    webbrowser.open(f'file://{arq_html}')
                    
        except Exception as e:
            self.update_progress(f"❌ Erro Sistemico Fatal: {str(e)}", 0, 'error')
        finally:
            self.searching = False
            self.root.after(0, lambda: self.search_button.configure(state="normal", text="🚀 INICIAR VARREDURA PROFUNDA"))
            
    def update_progress(self, mensagem, porcentagem, tipo='info'):
        def update():
            self.progress_bar.set(porcentagem / 100.0)
            self.status_label.configure(text=f"💻 TERMINAL - Executando ({porcentagem}%)")
            self.results_text.insert("end", mensagem + "\n", tipo)
            self.results_text.see("end")
            
            if porcentagem == 100:
                self.status_label.configure(text="💻 TERMINAL - Varredura Finalizada e Armazenada!")
        self.root.after(0, update)

    def enable_action_buttons(self):
        self.open_folder_button.configure(state="normal")
        self.open_html_button.configure(state="normal")

    def open_results_folder(self):
        if self.resultado_info and 'pasta_doc' in self.resultado_info:
            pasta = self.resultado_info['pasta_doc']
            if os.path.exists(pasta):
                os.startfile(pasta)

    def open_html_file(self):
        if self.resultado_info and 'arquivo_html' in self.resultado_info:
            arquivo = self.resultado_info['arquivo_html']
            if os.path.exists(arquivo):
                webbrowser.open(f'file://{arquivo}')

    def clear_results(self):
        self.results_text.delete("0.0", "end")
        self.progress_bar.set(0)
        self.status_label.configure(text="💻 TERMINAL - Aguardando instruções...")
        self.open_folder_button.configure(state="disabled")
        self.open_html_button.configure(state="disabled")
        self.resultado_info = None

def main():
    root = ctk.CTk()
    app = ProcessSearcherGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()
