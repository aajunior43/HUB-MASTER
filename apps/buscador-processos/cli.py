"""
CLI Interface for Judicial Process Searcher
Command-line interface using shared core module
"""

from core import buscar_processos_judiciais


def main():
    """Função principal da interface CLI"""
    print("="*80)
    print("  BUSCADOR DE PROCESSOS JUDICIAIS")
    print("  Busca processos por CPF ou CNPJ")
    print("="*80)
    print()
    
    print("📋 Digite o CPF ou CNPJ")
    print("   CPF: 000.000.000-00 ou 00000000000")
    print("   CNPJ: 00.000.000/0000-00 ou 00000000000000")
    print()
    
    documento = input("🔢 CPF/CNPJ: ").strip()
    print()
    
    if documento:
        resultado = buscar_processos_judiciais(documento)
        
        if resultado:
            print("\n" + "="*80)
            print("💡 O navegador permanecerá aberto para você explorar os resultados.")
            print("   Pressione ENTER para fechar...")
            input()
    else:
        print("❌ Documento não informado!")
    
    print("\n✨ Script finalizado!")


if __name__ == "__main__":
    main()
