# Teste de Drag & Drop - Instruções

## Como testar o problema:

1. **Abra a aplicação**: http://localhost:8081/

2. **Abra o Console do navegador**: 
   - Pressione F12
   - Vá para a aba "Console"

3. **Teste o drag & drop**:
   - Arraste um arquivo PDF do Windows Explorer para a área de upload
   - Observe os logs no console

4. **Logs esperados** (com a correção):
   ```
   [DEBUG] Processando item: {index: 0, kind: "file", type: "application/pdf"}
   [DEBUG] Resultado getAsFile: {hasFile: true, fileName: "exemplo.pdf", fileType: "application/pdf", fileSize: 12345}
   [INFO] Processando arquivo via getAsFile: {fileName: "exemplo.pdf", fileType: "application/pdf"}
   ```

5. **Se ainda houver erro**:
   - Copie a mensagem de erro completa do console
   - Verifique se o arquivo é realmente um PDF (não um atalho)
   - Teste arrastar de locais diferentes (Desktop, pasta, etc.)

## Possíveis causas do erro persistente:

1. **Cache do navegador**: Ctrl+F5 para recarregar
2. **Arquivo não é PDF**: Verificar extensão real
3. **Navegador não suporta**: Testar em Chrome/Edge
4. **Origem do arquivo**: Alguns locais (email, etc.) podem causar problemas

## Teste alternativo:

- Clique na área de upload e selecione o arquivo pelo seletor
- Se funcionar, o problema é específico do drag & drop