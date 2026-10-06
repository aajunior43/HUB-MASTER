"""
WhatsApp Group Link Searcher - CLI Version
Automatiza o Chrome para buscar links de grupos do WhatsApp
"""

import os
from core_logic import buscar_grupos_whatsapp


if __name__ == "__main__":
    print("=" * 80)
    print("  BUSCADOR AUTOMÁTICO DE GRUPOS E COMUNIDADES")
    print("  WhatsApp | Telegram | Discord | Reddit | Facebook")
    print("=" * 80)
    print()
    
    # Solicitar plataforma
    print("📱 Escolha a plataforma para buscar:")
    print("   1 - WhatsApp")
    print("   2 - Telegram")
    print("   3 - Discord")
    print("   4 - Reddit")
    print("   5 - Facebook Groups")
    print("   6 - Todas - Buscas separadas")
    print()
    
    opcao = input("🔢 Digite o número da opção (1-6): ").strip()
    print()
    
    # Mapear opção para plataforma
    if opcao == "1":
        plataforma = "whatsapp"
        print("✅ Plataforma selecionada: WhatsApp")
    elif opcao == "2":
        plataforma = "telegram"
        print("✅ Plataforma selecionada: Telegram")
    elif opcao == "3":
        plataforma = "discord"
        print("✅ Plataforma selecionada: Discord")
    elif opcao == "4":
        plataforma = "reddit"
        print("✅ Plataforma selecionada: Reddit")
    elif opcao == "5":
        plataforma = "facebook"
        print("✅ Plataforma selecionada: Facebook Groups")
    elif opcao == "6":
        plataforma = "todas"
        print("✅ Plataforma selecionada: Todas (buscas separadas)")
    else:
        print("⚠️ Opção inválida! Usando WhatsApp como padrão.")
        plataforma = "whatsapp"
    
    print()
    
    # Solicitar termo de busca do usuário
    print("💬 Digite o termo que você deseja buscar")
    print("   Exemplos: futebol, tecnologia, estudos, vendas, etc.")
    print("   (Deixe em branco para buscar todos)")
    print()
    termo = input("🔍 Termo de busca: ").strip()
    print()
    
    if termo:
        print(f"✨ Buscando sobre: '{termo}'")
    else:
        print("✨ Buscando todas as comunidades disponíveis")
    
    print()
    
    # Criar pasta base para resultados
    # Caminho relativo local: salvar em resultados/ dentro da pasta do script
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    pasta_base = os.path.join(BASE_DIR, "resultados")
    
    if not os.path.exists(pasta_base):
        os.makedirs(pasta_base)
    
    # Se escolheu todas, fazer buscas separadas
    if plataforma == "todas":
        print("\n" + "=" * 80)
        print("🔄 MODO: BUSCAS SEPARADAS")
        print("=" * 80)
        print("\nSerão realizadas 5 buscas independentes:")
        print("  1️⃣  WhatsApp")
        print("  2️⃣  Telegram")
        print("  3️⃣  Discord")
        print("  4️⃣  Reddit")
        print("  5️⃣  Facebook Groups")
        print(f"\n📁 Resultados serão salvos em: {pasta_base}/{termo if termo else 'todos_grupos'}/")
        print()
        input("Pressione ENTER para iniciar...")
        
        plataformas = [
            ("whatsapp", "WhatsApp", "🟢"),
            ("telegram", "Telegram", "🔵"),
            ("discord", "Discord", "🟣"),
            ("reddit", "Reddit", "🟠"),
            ("facebook", "Facebook", "🔵")
        ]
        
        for idx, (plat_id, plat_nome, emoji) in enumerate(plataformas, 1):
            print("\n" + emoji * 40)
            print(f"BUSCA {idx}/5: {plat_nome.upper()}")
            print(emoji * 40 + "\n")
            buscar_grupos_whatsapp(termo, plat_id, pasta_base)
            
            print("\n" + "=" * 80)
            print(f"✅ Busca no {plat_nome} concluída!")
            print("=" * 80)
            
            if idx < 5:
                print()
                input(f"Pressione ENTER para continuar ({plataformas[idx][1]})...")
    else:
        # Busca única na plataforma selecionada
        print(f"\n📁 Resultados serão salvos em: {pasta_base}/{termo if termo else 'todos_grupos'}/")
        buscar_grupos_whatsapp(termo, plataforma, pasta_base)
    
    # Mostrar resumo final
    print("\n" + "=" * 80)
    print("📊 RESUMO FINAL")
    print("=" * 80)
    if termo:
        pasta_tema = os.path.join(pasta_base, "".join(c if c.isalnum() or c in " -_" else "_" for c in termo).strip())
    else:
        pasta_tema = os.path.join(pasta_base, "todos_grupos")
    
    if os.path.exists(pasta_tema):
        arquivos = [f for f in os.listdir(pasta_tema) if f.endswith('.txt')]
        print(f"\n📁 Pasta: {pasta_tema}")
        print(f"📄 Arquivos criados: {len(arquivos)}")
        for arq in arquivos:
            print(f"   • {arq}")
    
    print("\n✨ Script finalizado!")
