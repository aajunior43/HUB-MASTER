"""
Core logic for WhatsApp Group Link Searcher
Shared between CLI and GUI versions
"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
import os
from datetime import datetime
import re


def verificar_e_aguardar_captcha(driver, captcha_callback=None):
    """
    Verifica se há CAPTCHA na página e aguarda resolução manual
    Usa múltiplos métodos de detecção para maior precisão
    
    Args:
        driver: Instância do WebDriver
        captcha_callback: Função callback para notificar GUI sobre CAPTCHA
                         Deve retornar True quando usuário resolver
    """
    captcha_detectado = False
    
    try:
        # Método 1: Verificar URL
        current_url = driver.current_url
        if "sorry/index" in current_url or "/sorry/" in current_url or "captcha" in current_url.lower():
            captcha_detectado = True
        
        # Método 2: Procurar por texto comum de CAPTCHA
        if not captcha_detectado:
            try:
                page_text = driver.find_element(By.TAG_NAME, "body").text.lower()
                captcha_keywords = [
                    # Inglês
                    "unusual traffic",
                    "captcha",
                    "verify you're not a robot",
                    "verify you are not a robot",
                    "i'm not a robot",
                    "prove you're not a robot",
                    "automated queries",
                    "suspicious activity",
                    # Português BR
                    "tráfego incomum",
                    "tráfego suspeito",
                    "verificar que você não é um robô",
                    "verifique que você não é um robô",
                    "não sou um robô",
                    "prove que você não é um robô",
                    "consultas automatizadas",
                    "atividade suspeita",
                    "confirme que você é humano",
                    "verificação de segurança",
                    "comportamento incomum"
                ]
                
                for keyword in captcha_keywords:
                    if keyword in page_text:
                        captcha_detectado = True
                        break
            except:
                pass
        
        # Método 3: Procurar por iframes do reCAPTCHA
        if not captcha_detectado:
            try:
                iframes = driver.find_elements(By.TAG_NAME, "iframe")
                for iframe in iframes:
                    src = iframe.get_attribute("src") or ""
                    if "recaptcha" in src.lower() or "captcha" in src.lower():
                        captcha_detectado = True
                        break
            except:
                pass
        
        # Método 4: Procurar por elementos específicos do Google CAPTCHA
        if not captcha_detectado:
            try:
                captcha_selectors = [
                    "div.g-recaptcha",
                    "div#recaptcha",
                    "div[class*='captcha']",
                    "form[action*='captcha']",
                    "div#captcha-form"
                ]
                
                for selector in captcha_selectors:
                    elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    if elements:
                        captcha_detectado = True
                        break
            except:
                pass
        
        # Método 5: Verificar título da página
        if not captcha_detectado:
            try:
                title = driver.title.lower()
                if "captcha" in title or "verify" in title or "unusual traffic" in title:
                    captcha_detectado = True
            except:
                pass
        
    except Exception as e:
        pass
    
    if captcha_detectado:
        if captcha_callback:
            # GUI mode - usar callback
            captcha_callback()
        else:
            # CLI mode - usar input tradicional
            print("\n" + "=" * 80)
            print("⚠️  CAPTCHA DETECTADO!")
            print("=" * 80)
            print("\n🔐 Por favor, resolva o CAPTCHA manualmente no navegador.")
            print("   Após resolver, pressione ENTER aqui para continuar...")
            print()
            input("   Pressione ENTER quando terminar >>> ")
            print("\n✅ Continuando a extração de links...")
        time.sleep(2)
    
    return captcha_detectado


def extrair_links_pagina(driver, plataforma="whatsapp"):
    """
    Extrai todos os links relevantes da página atual
    Filtra apenas links DIRETOS de grupos/comunidades
    Também extrai links que aparecem como texto (não apenas em href)
    
    Args:
        driver: Instância do WebDriver
        plataforma: Plataforma para filtrar
        
    Returns:
        set: Conjunto de links únicos encontrados
    """
    links_encontrados = set()
    
    try:
        # Método 1: Buscar links em elementos <a href>
        all_elements = driver.find_elements(By.TAG_NAME, "a")
        
        for elem in all_elements:
            try:
                link = elem.get_attribute("href")
                if link and link.startswith("http"):
                    # Filtrar baseado na plataforma selecionada
                    if plataforma == "whatsapp" or plataforma == "todas":
                        if "chat.whatsapp.com" in link and "google.com" not in link:
                            links_encontrados.add(link)
                    
                    if plataforma == "telegram" or plataforma == "todas":
                        if "t.me/" in link and "google.com" not in link:
                            if ("/joinchat/" in link or 
                                (link.count("/") >= 3 and "telegram.org" not in link)):
                                links_encontrados.add(link)
                    
                    if plataforma == "discord" or plataforma == "todas":
                        if ("discord.gg/" in link or "discord.com/invite/" in link) and "google.com" not in link:
                            links_encontrados.add(link)
                    
                    if plataforma == "reddit" or plataforma == "todas":
                        if "reddit.com/r/" in link and "google.com" not in link:
                            links_encontrados.add(link)
                    
                    if plataforma == "facebook" or plataforma == "todas":
                        if "facebook.com/groups/" in link and "google.com" not in link:
                            links_encontrados.add(link)
            except:
                continue
        
        # Método 2: Buscar links no texto da página usando regex
        try:
            page_text = driver.find_element(By.TAG_NAME, "body").text
            
            if plataforma == "whatsapp" or plataforma == "todas":
                whatsapp_pattern = r'(?:https?://)?chat\.whatsapp\.com/[A-Za-z0-9_-]+'
                whatsapp_matches = re.findall(whatsapp_pattern, page_text)
                for match in whatsapp_matches:
                    if not match.startswith("http"):
                        match = "https://" + match
                    links_encontrados.add(match)
            
            if plataforma == "telegram" or plataforma == "todas":
                telegram_patterns = [
                    r'(?:https?://)?t\.me/joinchat/[A-Za-z0-9_-]+',
                    r'(?:https?://)?t\.me/\+[A-Za-z0-9_-]+',
                    r'(?:https?://)?t\.me/[A-Za-z0-9_]+(?:/[0-9]+)?'
                ]
                for pattern in telegram_patterns:
                    telegram_matches = re.findall(pattern, page_text)
                    for match in telegram_matches:
                        if not match.startswith("http"):
                            match = "https://" + match
                        if len(match) > 15 and "telegram.org" not in match:
                            links_encontrados.add(match)
            
            if plataforma == "discord" or plataforma == "todas":
                discord_patterns = [
                    r'(?:https?://)?discord\.gg/[A-Za-z0-9_-]+',
                    r'(?:https?://)?discord\.com/invite/[A-Za-z0-9_-]+'
                ]
                for pattern in discord_patterns:
                    discord_matches = re.findall(pattern, page_text)
                    for match in discord_matches:
                        if not match.startswith("http"):
                            match = "https://" + match
                        if len(match) > 15:
                            links_encontrados.add(match)
            
            if plataforma == "reddit" or plataforma == "todas":
                reddit_pattern = r'(?:https?://)?(?:www\.)?reddit\.com/r/[A-Za-z0-9_]+'
                reddit_matches = re.findall(reddit_pattern, page_text)
                for match in reddit_matches:
                    if not match.startswith("http"):
                        match = "https://" + match
                    if len(match) > 20:
                        links_encontrados.add(match)
            
            if plataforma == "facebook" or plataforma == "todas":
                facebook_pattern = r'(?:https?://)?(?:www\.)?facebook\.com/groups/[A-Za-z0-9_.-]+'
                facebook_matches = re.findall(facebook_pattern, page_text)
                for match in facebook_matches:
                    if not match.startswith("http"):
                        match = "https://" + match
                    if len(match) > 25:
                        links_encontrados.add(match)
        except Exception as e:
            pass
                
    except Exception as e:
        pass
    
    return links_encontrados


def buscar_grupos_whatsapp(termo_usuario="", plataforma="whatsapp", pasta_base=None, 
                          progress_callback=None, captcha_callback=None, stop_flag=None):
    """
    Abre o Chrome e busca automaticamente por links de grupos
    usando busca com aspas para resultados mais precisos
    Salva os resultados em arquivos TXT organizados por pasta
    
    Args:
        termo_usuario: Termo personalizado para buscar (ex: "futebol", "tecnologia")
        plataforma: Plataforma para buscar
        pasta_base: Pasta base onde os resultados serão salvos
        progress_callback: Função callback para atualizar progresso (GUI)
        captcha_callback: Função callback para notificar CAPTCHA (GUI)
        stop_flag: Flag para parar a execução (threading.Event)
        
    Returns:
        dict: Resultado com 'success', 'links', 'arquivo', 'erro'
    """
    if pasta_base is None:
        pasta_base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "resultados")
    
    def log(msg):
        """Helper para log que funciona em CLI e GUI"""
        if progress_callback:
            progress_callback(msg)
        else:
            print(msg)
    
    def check_stop():
        """Verifica se deve parar a execução"""
        if stop_flag and stop_flag.is_set():
            return True
        return False
    
    driver = None
    
    try:
        log("🚀 Iniciando o navegador Chrome...")
        
        # Configurar o ChromeDriver automaticamente
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service)
        
        if check_stop():
            return {"success": False, "erro": "Operação cancelada pelo usuário"}
        
        # Maximizar a janela
        driver.maximize_window()
        
        log("✅ Chrome aberto com sucesso!")
        
        # Acessar o Google
        log("🔍 Acessando o Google...")
        driver.get("https://www.google.com")
        
        if check_stop():
            return {"success": False, "erro": "Operação cancelada pelo usuário"}
        
        # Aguardar a página carregar
        time.sleep(2)
        
        # Encontrar a caixa de pesquisa
        search_box = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "q"))
        )
        
        # Construir o termo de busca baseado na plataforma
        if plataforma == "whatsapp":
            if termo_usuario:
                termo_busca = f'{termo_usuario} "chat.whatsapp.com"'
            else:
                termo_busca = '"chat.whatsapp.com"'
        elif plataforma == "telegram":
            if termo_usuario:
                termo_busca = f'{termo_usuario} "t.me"'
            else:
                termo_busca = '"t.me"'
        elif plataforma == "discord":
            if termo_usuario:
                termo_busca = f'{termo_usuario} "discord.gg"'
            else:
                termo_busca = '"discord.gg"'
        elif plataforma == "reddit":
            if termo_usuario:
                termo_busca = f'{termo_usuario} "reddit.com/r/"'
            else:
                termo_busca = '"reddit.com/r/"'
        else:  # facebook
            if termo_usuario:
                termo_busca = f'{termo_usuario} "facebook.com/groups/"'
            else:
                termo_busca = '"facebook.com/groups/"'
        
        log(f"🔎 Buscando por: '{termo_busca}'")
        
        # Digitar o termo de busca
        search_box.send_keys(termo_busca)
        search_box.send_keys(Keys.RETURN)
        
        if check_stop():
            return {"success": False, "erro": "Operação cancelada pelo usuário"}
        
        # Aguardar os resultados carregarem
        log("⏳ Aguardando resultados...")
        time.sleep(3)
        
        # Verificar se há CAPTCHA
        def captcha_handler():
            if captcha_callback:
                captcha_callback()
        
        verificar_e_aguardar_captcha(driver, captcha_handler if captcha_callback else None)
        
        if check_stop():
            return {"success": False, "erro": "Operação cancelada pelo usuário"}
        
        # Coletar links de todas as páginas
        todos_links = set()
        pagina_atual = 1
        max_paginas = 5  # Número máximo de páginas para processar
        
        log("=" * 60)
        log("📄 PROCESSANDO PÁGINAS DE RESULTADOS")
        log("=" * 60)
        
        while pagina_atual <= max_paginas:
            if check_stop():
                return {"success": False, "erro": "Operação cancelada pelo usuário"}
            
            log(f"📖 Processando página {pagina_atual}...")
            
            # Aguardar a página carregar completamente
            time.sleep(3)
            
            # Extrair links da página atual
            links_pagina = extrair_links_pagina(driver, plataforma)
            
            if links_pagina:
                todos_links.update(links_pagina)
                log(f"   ✅ {len(links_pagina)} links encontrados nesta página")
                log(f"   📊 Total acumulado: {len(todos_links)} links únicos")
            else:
                log("   ⚠️ Nenhum link encontrado nesta página")
            
            # Tentar ir para a próxima página
            try:
                # Procurar pelo botão "Próxima" ou "Next"
                next_button = None
                
                # Tentar diferentes seletores para o botão de próxima página
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
                    log(f"   ➡️  Avançando para página {pagina_atual + 1}...")
                    next_button.click()
                    pagina_atual += 1
                    time.sleep(2)
                    
                    # VERIFICAR CAPTCHA APÓS MUDAR DE PÁGINA
                    verificar_e_aguardar_captcha(driver, captcha_handler if captcha_callback else None)
                else:
                    log(f"   ℹ️  Não há mais páginas disponíveis (última página: {pagina_atual})")
                    break
                    
            except Exception as e:
                log(f"   ℹ️  Fim da paginação (processadas {pagina_atual} páginas)")
                break
        
        # Exibir todos os links coletados
        log("=" * 60)
        log("📋 LINKS ENCONTRADOS")
        log("=" * 60)
        
        arquivo_salvo = None
        
        if todos_links:
            links_lista = sorted(list(todos_links))
            
            for i, link in enumerate(links_lista, 1):
                # Destacar links diretos por plataforma
                if "chat.whatsapp.com" in link:
                    log(f"{i}. 🟢 [WhatsApp] {link}")
                elif "t.me" in link:
                    log(f"{i}. 🔵 [Telegram] {link}")
                elif "discord.gg" in link or "discord.com/invite" in link:
                    log(f"{i}. 🟣 [Discord] {link}")
                elif "reddit.com/r/" in link:
                    log(f"{i}. 🟠 [Reddit] {link}")
                elif "facebook.com/groups/" in link:
                    log(f"{i}. 🔵 [Facebook] {link}")
                else:
                    log(f"{i}. {link}")
            
            # Salvar links em arquivo TXT
            try:
                # Criar nome da pasta baseado no termo de busca
                if termo_usuario:
                    # Limpar caracteres inválidos do nome da pasta
                    nome_pasta = "".join(c if c.isalnum() or c in " -_" else "_" for c in termo_usuario)
                    nome_pasta = nome_pasta.strip()
                else:
                    nome_pasta = "todos_grupos"
                
                # Caminho completo da pasta
                pasta_tema = os.path.join(pasta_base, nome_pasta)
                
                # Criar pasta se não existir
                if not os.path.exists(pasta_tema):
                    os.makedirs(pasta_tema)
                    log(f"📁 Pasta criada: {pasta_tema}")
                
                # Nome do arquivo com plataforma e timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                nome_arquivo = f"{plataforma}_{timestamp}.txt"
                caminho_arquivo = os.path.join(pasta_tema, nome_arquivo)
                
                # Salvar links no arquivo
                with open(caminho_arquivo, "w", encoding="utf-8") as f:
                    f.write(f"# Links de {plataforma.upper()}\n")
                    f.write(f"# Termo de busca: {termo_usuario if termo_usuario else 'todos'}\n")
                    f.write(f"# Data: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n")
                    f.write(f"# Total: {len(links_lista)} links\n")
                    f.write("=" * 60 + "\n\n")
                    
                    for link in links_lista:
                        f.write(f"{link}\n")
                
                arquivo_salvo = caminho_arquivo
                log(f"💾 Links salvos em: {caminho_arquivo}")
                log(f"   📊 {len(links_lista)} links salvos com sucesso!")
                
            except Exception as e:
                log(f"⚠️ Erro ao salvar arquivo: {str(e)}")
        else:
            log("⚠️ Nenhum link encontrado. Tente outro termo de busca.")
        
        log("=" * 60)
        log(f"✅ Total de {len(todos_links)} links únicos encontrados em {pagina_atual} página(s)!")
        
        return {
            "success": True,
            "links": list(todos_links),
            "arquivo": arquivo_salvo,
            "total_paginas": pagina_atual
        }
        
    except Exception as e:
        error_msg = f"❌ Erro ao executar o script: {str(e)}"
        log(error_msg)
        return {"success": False, "erro": str(e)}
    
    finally:
        # Fechar o navegador
        if driver:
            try:
                driver.quit()
                log("🔒 Navegador fechado.")
            except:
                pass
