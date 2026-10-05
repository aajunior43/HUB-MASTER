// Popup logic: solicita extração e chama Gemini

const statusEl = document.getElementById('statusText');
const statusIndicator = document.getElementById('statusIndicator');
const generateBtn = document.getElementById('generateBtn');
const copyBtn = document.getElementById('copyBtn');
const resultEl = document.getElementById('result');
const progressEl = document.getElementById('progress');
const optionsLink = document.getElementById('optionsLink');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const toggleKeyBtn = document.getElementById('toggleKeyBtn');
const exportBtn = document.getElementById('exportBtn');
const exportMenu = document.getElementById('exportMenu');
const exportTxtBtn = document.getElementById('exportTxt');
const exportMdBtn = document.getElementById('exportMd');
const exportJsonBtn = document.getElementById('exportJson');
const historyBtn = document.getElementById('historyBtn');
const historyModal = document.getElementById('historyModal');
const closeHistoryModal = document.getElementById('closeHistoryModal');
const historyContent = document.getElementById('historyContent');

// Dados globais
let currentPromptData = null;
let promptHistory = [];

// Constantes para melhor UX
const API_KEY_PATTERN = /^AIza[0-9A-Za-z-_]{35}$/;
const MESSAGES = {
  API_KEY_CONFIGURED: 'API key configurada',
  API_KEY_NOT_CONFIGURED: 'API key não configurada',
  API_KEY_INVALID: 'API key inválida',
  API_KEY_SAVED: 'Chave salva com sucesso',
  API_KEY_AUTO_CONFIGURED: 'API key configurada automaticamente',
  EXTRACTING_STYLES: 'Analisando estilos da página...',
  CALLING_GEMINI: 'Gerando prompt com IA...',
  READY: 'Pronto para usar',
  COPIED: 'Copiado para área de transferência',
  COPY_FAILED: 'Falha ao copiar - selecione e copie manualmente',
  PROVIDE_VALID_KEY: 'Informe uma chave de API válida',
  CONFIGURE_KEY: 'Configure sua API key acima ou em Opções',
  NO_ACTIVE_TAB: 'Não foi possível identificar a aba atual',
  EXTRACTION_FAILED: 'Falha ao extrair estilos',
  GEMINI_ERROR: 'Erro na API do Gemini'
};

function setProgress(msg, busy = false, progress = null) {
  if (!progressEl) return;
  
  let html = '';
  if (busy) {
    html = `<span class="spinner"></span> ${msg}`;
    if (progress !== null && progress >= 0 && progress <= 100) {
      html += `<div class="progress-bar"><div class="progress-bar-fill" style="width: ${progress}%"></div></div>`;
    }
  } else {
    html = msg;
  }
  
  progressEl.innerHTML = html;
  
  // Adicionar animação fade-in para novas mensagens
  if (msg) {
    progressEl.classList.remove('fade-in');
    void progressEl.offsetWidth; // Force reflow
    progressEl.classList.add('fade-in');
  }
}

function addLoadingState(element, loadingText = 'Carregando...') {
  if (!element) return;
  
  element.disabled = true;
  element.classList.add('btn-loading');
  element.setAttribute('data-original-text', element.innerHTML);
  element.setAttribute('aria-busy', 'true');
  element.innerHTML = loadingText;
  
  // Anunciar para leitores de tela
  const announcement = `${element.textContent || loadingText} - carregando`;
  announceToScreenReader(announcement);
}

function removeLoadingState(element) {
  if (!element) return;
  
  element.disabled = false;
  element.classList.remove('btn-loading');
  element.removeAttribute('aria-busy');
  
  const originalText = element.getAttribute('data-original-text');
  if (originalText) {
    element.innerHTML = originalText;
    element.removeAttribute('data-original-text');
  }
}

function announceToScreenReader(message) {
  // Criar elemento temporário para anúncios
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remover após um tempo
  setTimeout(() => {
    if (announcement.parentNode) {
      announcement.parentNode.removeChild(announcement);
    }
  }, 1000);
}

function showToast(message, type = 'info', duration = 3000) {
  // Criar toast notification
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 12px 16px;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    border-left: 4px solid var(--${type === 'success' ? 'success' : type === 'error' ? 'error' : 'primary'}-color);
    z-index: 10000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 300px;
    font-size: 14px;
  `;
  
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Animar entrada
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 10);
  
  // Remover após duração
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

function showSuccessAnimation(element) {
  if (!element) return;
  
  element.classList.add('success-flash');
  setTimeout(() => {
    element.classList.remove('success-flash');
  }, 600);
}

function showErrorAnimation(element) {
  if (!element) return;
  
  element.classList.add('shake');
  setTimeout(() => {
    element.classList.remove('shake');
  }, 500);
}

function setStatus(message, isError = false) {
  if (statusEl) statusEl.textContent = message;
  if (statusIndicator) {
    statusIndicator.className = isError ? 'status-indicator error' : 'status-indicator';
  }
}

function validateApiKey(key) {
  if (!key || typeof key !== 'string') return false;
  return API_KEY_PATTERN.test(key.trim());
}

function getApiKey() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['geminiApiKey'], data => resolve(data.geminiApiKey || ''));
  });
}

async function getEffectiveApiKey() {
  const inline = apiKeyInput ? apiKeyInput.value.trim() : '';
  if (inline) return inline;
  return await getApiKey();
}

async function updateStatus() {
  try {
    const key = await getApiKey();
    if (key && validateApiKey(key)) {
      setStatus(MESSAGES.API_KEY_CONFIGURED, false);
    } else if (key) {
      setStatus(MESSAGES.API_KEY_INVALID, true);
    } else {
      setStatus(MESSAGES.API_KEY_NOT_CONFIGURED, true);
    }
    
    if (apiKeyInput && !apiKeyInput.value) {
      apiKeyInput.value = key || '';
    }
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    setStatus('Erro ao verificar API key', true);
  }
}

function getCurrentTab() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs[0]));
  });
}

async function sendExtractMessage(tabId) {
  return new Promise(async (resolve) => {
    try {
      // Primeiro, tentar enviar mensagem diretamente
      chrome.tabs.sendMessage(tabId, { type: 'extract_styles' }, async (response) => {
        if (chrome.runtime.lastError) {
          // Se falhar, tentar injetar o content script
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['content_script.js']
            });
            
            // Aguardar um pouco para o script carregar
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, { type: 'extract_styles' }, (retryResponse) => {
                if (chrome.runtime.lastError) {
                  resolve({ ok: false, error: 'Não foi possível injetar o script na página. Verifique se a página permite extensões.' });
                } else {
                  resolve(retryResponse || { ok: false, error: 'Resposta vazia do content script' });
                }
              });
            }, 500);
          } catch (injectionError) {
            resolve({ ok: false, error: `Falha ao injetar script: ${injectionError.message}` });
          }
        } else {
          resolve(response || { ok: false, error: 'Resposta vazia do content script' });
        }
      });
    } catch (e) {
      resolve({ ok: false, error: String(e?.message || e) });
    }
  });
}

function saveKey() {
  if (!apiKeyInput) return;
  
  const key = apiKeyInput.value.trim();
  
  if (!key) {
    setProgress(MESSAGES.PROVIDE_VALID_KEY);
    apiKeyInput.focus();
    return;
  }
  
  if (!validateApiKey(key)) {
    setProgress(MESSAGES.API_KEY_INVALID);
    apiKeyInput.focus();
    apiKeyInput.select();
    return;
  }
  
  // Adicionar loading state ao botão
  addLoadingState(saveKeyBtn, '<span class="icon">💾</span> Salvando...');
  setProgress('Salvando...', true);
  
  chrome.storage.sync.set({ geminiApiKey: key }, () => {
    removeLoadingState(saveKeyBtn);
    
    if (chrome.runtime.lastError) {
      console.error('Erro ao salvar API key:', chrome.runtime.lastError);
      setProgress('Erro ao salvar chave');
      showErrorAnimation(saveKeyBtn);
    } else {
      setProgress(MESSAGES.API_KEY_SAVED);
      updateStatus();
      showSuccessAnimation(saveKeyBtn);
      showToast('API key salva com sucesso! 🎉', 'success');
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => {
        setProgress('');
      }, 3000);
    }
  });
}

function toggleKey() {
  if (!apiKeyInput || !toggleKeyBtn) return;
  
  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type = isPassword ? 'text' : 'password';
  
  // Atualizar ARIA state
  toggleKeyBtn.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
  
  // Atualizar label para leitores de tela
  const newLabel = isPassword ? 'Ocultar chave da API' : 'Mostrar chave da API';
  toggleKeyBtn.setAttribute('aria-label', newLabel);
  
  // Atualizar ícone
  const icon = toggleKeyBtn.querySelector('.icon');
  if (icon) {
    icon.textContent = isPassword ? '🙈' : '👁';
  }
}

async function callGemini(apiKey, data) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  
  const instructionText = [
    'Você é um especialista em design de produtos e sistemas de design. Com base nos DADOS EXTRAÍDOS abaixo, escreva um PROMPT de texto, em português, extremamente detalhado que descreva o estilo visual do site de origem e possa ser usado para replicá-lo em outro projeto.',
    '',
    'Regras importantes:',
    '- Não invente informações inexistentes; faça inferências razoáveis quando apropriado, apontando que são estimativas.',
    '- Estruture a saída nas seções: 1) Identidade Visual, 2) Tipografia, 3) Paleta de Cores, 4) Espaçamentos e Grid, 5) Bordas e Raios, 6) Sombras e Profundidade, 7) Componentes (links, botões, inputs), 8) Estados e Motion, 9) Acessibilidade e Contraste, 10) Diretrizes de Redação (tom/voz), 11) Variáveis/CSS Tokens, 12) Observações.',
    '- Inclua exemplos de tokens (ex.: spacing-xxs=4px, radius-md=8px) quando possível.',
    '- Nomeie cores com rótulos úteis (ex.: Primária, Secundária, Texto, Fundo, Sucesso, Aviso, Erro) e associe os hexadecimais.',
    '- Para tipografia, descreva escala (H1..H6, parágrafos), pesos, alturas de linha, tracking e famílias.',
    '- Para grid/layout, comente sobre uso de Flex e Grid e larguras típicas.',
    '- Para componentes, descreva aparência padrão e hover/active/focus, quando disponível.',
    '- Seja conciso, porém completo e acionável.',
    '',
    'DADOS EXTRAÍDOS:',
    '',
    JSON.stringify(data, null, 2),
    '',
    'Agora, gere o PROMPT detalhado conforme as regras acima.'
  ].join('\n');

  const body = {
    contents: [
      { role: 'user', parts: [{ text: instructionText }] }
    ]
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Erro na API Gemini (${res.status}): ${txt || res.statusText}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Resposta vazia do Gemini.');
  return text;
}

async function onGenerate() {
  // Validações iniciais
  if (!generateBtn || !resultEl) return;
  
  addLoadingState(generateBtn);
  copyBtn.disabled = true;
  resultEl.value = '';
  resultEl.classList.add('skeleton');
  
  try {
    // Verificar API key (10% progresso)
    setProgress('Verificando API key...', true, 10);
    const apiKey = await getEffectiveApiKey();
    if (!apiKey) {
      setProgress(MESSAGES.CONFIGURE_KEY);
      showErrorAnimation(generateBtn);
      return;
    }
    
    if (!validateApiKey(apiKey)) {
      setProgress(MESSAGES.API_KEY_INVALID);
      showErrorAnimation(generateBtn);
      return;
    }
    
    // Verificar aba ativa (25% progresso)
    setProgress(MESSAGES.EXTRACTING_STYLES, true, 25);
    const tab = await getCurrentTab();
    if (!tab || !tab.id) {
      setProgress(MESSAGES.NO_ACTIVE_TAB);
      showErrorAnimation(generateBtn);
      return;
    }
    
    // Verificar se é uma página válida
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
      setProgress('Não é possível analisar páginas internas do navegador. Navegue para um site normal.');
      showErrorAnimation(generateBtn);
      return;
    }
    
    // Verificar se é uma página local
    if (tab.url && (tab.url.startsWith('file://') || tab.url === 'about:blank')) {
      setProgress('Não é possível analisar páginas locais. Navegue para um site na internet.');
      showErrorAnimation(generateBtn);
      return;
    }
    
    // Extrair estilos (50% progresso)
    setProgress('Extraindo estilos da página...', true, 50);
    const extract = await sendExtractMessage(tab.id);
    if (!extract?.ok) {
      const errorMsg = extract?.error || 'erro desconhecido';
      
      // Fornecer instruções específicas baseadas no tipo de erro
      let userMessage = `${MESSAGES.EXTRACTION_FAILED}: ${errorMsg}`;
      if (errorMsg.includes('Could not establish connection')) {
        userMessage = 'Não foi possível conectar com a página. Tente recarregar a página e tentar novamente.';
      } else if (errorMsg.includes('Receiving end does not exist')) {
        userMessage = 'Script não carregado na página. Recarregue a página e tente novamente.';
      } else if (errorMsg.includes('não foi possível injetar')) {
        userMessage = 'Esta página não permite extensões. Tente em outro site.';
      }
      
      setProgress(userMessage);
      console.error('Erro na extração:', extract);
      showErrorAnimation(generateBtn);
      return;
    }
    
    // Verificar se há dados extraídos
    if (!extract.data || Object.keys(extract.data).length === 0) {
      setProgress('Nenhum estilo encontrado na página');
      showErrorAnimation(generateBtn);
      return;
    }
    
    // Chamar Gemini (75% progresso)
    setProgress(MESSAGES.CALLING_GEMINI, true, 75);
    const text = await callGemini(apiKey, extract.data);
    
    if (!text || text.trim().length === 0) {
      setProgress('Resposta vazia do Gemini');
      showErrorAnimation(generateBtn);
      return;
    }
    
    // Sucesso (100% progresso)
    setProgress('Finalizando...', true, 100);
    await new Promise(resolve => setTimeout(resolve, 500)); // Pequena pausa para mostrar 100%
    
    resultEl.classList.remove('skeleton');
    resultEl.value = text;
    copyBtn.disabled = false;
    exportBtn.disabled = false;
    setProgress(MESSAGES.READY);
    showSuccessAnimation(resultEl);
    
    // Salvar dados do prompt atual
    currentPromptData = {
      prompt: text,
      extractedData: extract.data,
      timestamp: Date.now(),
      url: tab.url,
      title: tab.title || 'Página sem título'
    };
    
    // Adicionar ao histórico
    await saveToHistory(currentPromptData);
    
    // Atualizar estatísticas
    await updateUsageStats();
    
    // Limpar mensagem de sucesso após 5 segundos
    setTimeout(() => {
      setProgress('');
    }, 5000);
    
  } catch (error) {
    console.error('Erro durante geração:', error);
    resultEl.classList.remove('skeleton');
    resultEl.value = '';
    
    // Tratamento específico de erros
    let errorMessage = 'Erro desconhecido';
    if (error.message) {
      if (error.message.includes('API key')) {
        errorMessage = MESSAGES.API_KEY_INVALID;
      } else if (error.message.includes('Gemini')) {
        errorMessage = `${MESSAGES.GEMINI_ERROR}: ${error.message}`;
      } else {
        errorMessage = error.message;
      }
    }
    
    setProgress(errorMessage);
    showErrorAnimation(generateBtn);
    showErrorAnimation(resultEl);
  } finally {
    removeLoadingState(generateBtn);
  }
}

async function onCopy() {
  if (!resultEl || !resultEl.value.trim()) {
    setProgress('Nenhum conteúdo para copiar');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(resultEl.value);
    setProgress(MESSAGES.COPIED);
    showToast('Prompt copiado! 📋', 'success');
    
    // Feedback visual no botão
    if (copyBtn) {
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '<span class="icon">✅</span> Copiado!';
      copyBtn.disabled = true;
      
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.disabled = false;
        setProgress('');
      }, 2000);
    }
  } catch (error) {
    console.error('Erro ao copiar:', error);
    setProgress(MESSAGES.COPY_FAILED);
    showToast('Erro ao copiar. Tente selecionar manualmente.', 'error');
    
    // Fallback: selecionar texto para cópia manual
    try {
      resultEl.select();
      resultEl.setSelectionRange(0, 99999);
    } catch (selectError) {
      console.error('Erro ao selecionar texto:', selectError);
    }
  }
}

if (optionsLink) {
  optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html');
    }
  });
}
// Event listeners principais
if (saveKeyBtn) saveKeyBtn.addEventListener('click', saveKey);
if (toggleKeyBtn) toggleKeyBtn.addEventListener('click', toggleKey);
if (generateBtn) generateBtn.addEventListener('click', onGenerate);
if (copyBtn) copyBtn.addEventListener('click', onCopy);

// Event listeners para exportação
if (exportBtn) exportBtn.addEventListener('click', toggleExportDropdown);
if (exportTxtBtn) exportTxtBtn.addEventListener('click', () => {
  exportAsText();
  closeExportDropdown();
});
if (exportMdBtn) exportMdBtn.addEventListener('click', () => {
  exportAsMarkdown();
  closeExportDropdown();
});
if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => {
  exportAsJson();
  closeExportDropdown();
});

// Event listeners para histórico
if (historyBtn) historyBtn.addEventListener('click', showHistory);
if (closeHistoryModal) closeHistoryModal.addEventListener('click', hideHistory);

// Fechar modal clicando fora
if (historyModal) {
  historyModal.addEventListener('click', (event) => {
    if (event.target === historyModal) {
      hideHistory();
    }
  });
}

// Fechar dropdown clicando fora
document.addEventListener('click', (event) => {
  if (exportBtn && exportMenu && !exportBtn.contains(event.target) && !exportMenu.contains(event.target)) {
    closeExportDropdown();
  }
});

// Definir e salvar a API key fornecida pelo usuário
function initializeApiKey() {
  const providedKey = 'AIzaSyBolH0TO1T4HLZ38hiwMyM7tsQHjTBy8l8';
  
  if (!validateApiKey(providedKey)) {
    console.error('API key fornecida é inválida');
    return;
  }
  
  if (apiKeyInput) {
    apiKeyInput.value = providedKey;
    
    // Salvar a chave diretamente no storage
    chrome.storage.sync.set({ geminiApiKey: providedKey }, () => {
      if (chrome.runtime.lastError) {
        console.error('Erro ao salvar API key:', chrome.runtime.lastError);
        setProgress('Erro ao configurar API key automaticamente');
      } else {
        setProgress(MESSAGES.API_KEY_AUTO_CONFIGURED);
        updateStatus();
        
        // Limpar mensagem após 3 segundos
        setTimeout(() => {
          setProgress('');
        }, 3000);
      }
    });
  }
}

// Funções de exportação
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportAsText() {
  if (!currentPromptData) return;
  
  const content = `# Prompt de Estilo Visual\n\nGerado em: ${new Date(currentPromptData.timestamp).toLocaleString('pt-BR')}\nURL: ${currentPromptData.url}\nTítulo: ${currentPromptData.title}\n\n---\n\n${currentPromptData.prompt}`;
  
  const filename = `prompt-estilo-${new Date(currentPromptData.timestamp).toISOString().split('T')[0]}.txt`;
  downloadFile(content, filename, 'text/plain');
  
  announceToScreenReader('Arquivo de texto exportado com sucesso');
  showToast('Arquivo TXT exportado! 📄', 'success');
}

function exportAsMarkdown() {
  if (!currentPromptData) return;
  
  const content = `# 🎨 Prompt de Estilo Visual\n\n**Gerado em:** ${new Date(currentPromptData.timestamp).toLocaleString('pt-BR')}  \n**URL:** ${currentPromptData.url}  \n**Título:** ${currentPromptData.title}\n\n---\n\n${currentPromptData.prompt}`;
  
  const filename = `prompt-estilo-${new Date(currentPromptData.timestamp).toISOString().split('T')[0]}.md`;
  downloadFile(content, filename, 'text/markdown');
  
  announceToScreenReader('Arquivo Markdown exportado com sucesso');
  showToast('Arquivo Markdown exportado! 📝', 'success');
}

function exportAsJson() {
  if (!currentPromptData) return;
  
  const exportData = {
    metadata: {
      generatedAt: new Date(currentPromptData.timestamp).toISOString(),
      url: currentPromptData.url,
      title: currentPromptData.title,
      version: '1.0'
    },
    prompt: currentPromptData.prompt,
    extractedData: currentPromptData.extractedData
  };
  
  const content = JSON.stringify(exportData, null, 2);
  const filename = `dados-estilo-${new Date(currentPromptData.timestamp).toISOString().split('T')[0]}.json`;
  downloadFile(content, filename, 'application/json');
  
  announceToScreenReader('Arquivo JSON exportado com sucesso');
  showToast('Dados JSON exportados! 🔧', 'success');
}

// Funções de histórico
async function saveToHistory(promptData) {
  try {
    const history = await getPromptHistory();
    history.unshift(promptData); // Adicionar no início
    
    // Manter apenas os últimos 50 prompts
    const limitedHistory = history.slice(0, 50);
    
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ promptHistory: limitedHistory }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
    
    promptHistory = limitedHistory;
  } catch (error) {
    console.error('Erro ao salvar no histórico:', error);
  }
}

async function getPromptHistory() {
  try {
    const data = await new Promise(resolve => {
      chrome.storage.local.get(['promptHistory'], resolve);
    });
    return data.promptHistory || [];
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
    return [];
  }
}

async function updateUsageStats() {
  try {
    const stats = await new Promise(resolve => {
      chrome.storage.sync.get(['promptCount', 'lastUsed'], resolve);
    });
    
    const newStats = {
      promptCount: (stats.promptCount || 0) + 1,
      lastUsed: Date.now()
    };
    
    await new Promise((resolve, reject) => {
      chrome.storage.sync.set(newStats, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('Erro ao atualizar estatísticas:', error);
  }
}

function renderHistoryItem(item, index) {
  const date = new Date(item.timestamp).toLocaleString('pt-BR');
  const preview = item.prompt.substring(0, 150) + (item.prompt.length > 150 ? '...' : '');
  
  return `
    <div class="history-item">
      <div class="history-item-header">
        <div class="history-item-title">${item.title}</div>
        <div class="history-item-date">${date}</div>
      </div>
      <div class="history-item-preview">${preview}</div>
      <div class="history-item-actions">
        <button onclick="loadFromHistory(${index})" class="btn-primary">
          <span class="icon" aria-hidden="true">📋</span>
          Carregar
        </button>
        <button onclick="exportHistoryItem(${index})" title="Exportar este item">
          <span class="icon" aria-hidden="true">📤</span>
          Exportar
        </button>
        <button onclick="deleteHistoryItem(${index})" class="btn-danger" title="Excluir este item">
          <span class="icon" aria-hidden="true">🗑</span>
          Excluir
        </button>
      </div>
    </div>
  `;
}

async function showHistory() {
  try {
    promptHistory = await getPromptHistory();
    
    if (promptHistory.length === 0) {
      historyContent.innerHTML = `
        <div class="empty-history">
          <div class="icon">📝</div>
          <p>Nenhum prompt gerado ainda.</p>
          <p>Gere seu primeiro prompt para começar o histórico!</p>
        </div>
      `;
    } else {
      historyContent.innerHTML = promptHistory.map(renderHistoryItem).join('');
    }
    
    historyModal.classList.add('show');
    historyModal.setAttribute('aria-hidden', 'false');
    
    // Focar no botão de fechar para acessibilidade
    setTimeout(() => {
      closeHistoryModal.focus();
    }, 100);
    
  } catch (error) {
    console.error('Erro ao mostrar histórico:', error);
    setProgress('Erro ao carregar histórico');
  }
}

function hideHistory() {
  historyModal.classList.remove('show');
  historyModal.setAttribute('aria-hidden', 'true');
}

window.loadFromHistory = function(index) {
  if (promptHistory[index]) {
    const item = promptHistory[index];
    resultEl.value = item.prompt;
    currentPromptData = item;
    copyBtn.disabled = false;
    exportBtn.disabled = false;
    hideHistory();
    announceToScreenReader('Prompt carregado do histórico');
  }
};

window.exportHistoryItem = function(index) {
  if (promptHistory[index]) {
    const oldData = currentPromptData;
    currentPromptData = promptHistory[index];
    exportAsMarkdown();
    currentPromptData = oldData;
  }
};

window.deleteHistoryItem = async function(index) {
  if (!confirm('Tem certeza que deseja excluir este item do histórico?')) {
    return;
  }
  
  try {
    promptHistory.splice(index, 1);
    
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ promptHistory }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
    
    showHistory(); // Recarregar a lista
    announceToScreenReader('Item excluído do histórico');
  } catch (error) {
    console.error('Erro ao excluir item:', error);
  }
};

// Funções de dropdown
function toggleExportDropdown() {
  const isExpanded = exportBtn.getAttribute('aria-expanded') === 'true';
  
  if (isExpanded) {
    exportMenu.classList.remove('show');
    exportBtn.setAttribute('aria-expanded', 'false');
  } else {
    exportMenu.classList.add('show');
    exportBtn.setAttribute('aria-expanded', 'true');
    
    // Focar no primeiro item do menu
    setTimeout(() => {
      exportTxtBtn.focus();
    }, 100);
  }
}

function closeExportDropdown() {
  exportMenu.classList.remove('show');
  exportBtn.setAttribute('aria-expanded', 'false');
}

// Suporte a navegação por teclado e atalhos
function setupKeyboardNavigation() {
  document.addEventListener('keydown', (event) => {
    // Atalho Ctrl+Enter para gerar prompt
    if (event.ctrlKey && event.key === 'Enter' && !generateBtn.disabled) {
      event.preventDefault();
      onGenerate();
      return;
    }
    
    // Atalho Ctrl+C quando textarea está focada para copiar
    if (event.ctrlKey && event.key === 'c' && document.activeElement === resultEl && resultEl.value) {
      // Deixar o comportamento padrão do Ctrl+C funcionar
      setTimeout(() => {
        announceToScreenReader('Conteúdo copiado para área de transferência');
      }, 100);
      return;
    }
    
    // Atalho Alt+C para copiar resultado
    if (event.altKey && event.key === 'c' && !copyBtn.disabled) {
      event.preventDefault();
      onCopy();
      return;
    }
    
    // Atalho Alt+S para salvar API key
    if (event.altKey && event.key === 's' && saveKeyBtn && !saveKeyBtn.disabled) {
      event.preventDefault();
      saveKey();
      return;
    }
    
    // Atalho Alt+T para alternar visibilidade da API key
    if (event.altKey && event.key === 't' && toggleKeyBtn) {
      event.preventDefault();
      toggleKey();
      return;
    }
    
    // Escape para limpar foco
    if (event.key === 'Escape') {
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
    }
  });
  
  // Melhorar navegação por Tab
  const focusableElements = [
    apiKeyInput,
    saveKeyBtn,
    toggleKeyBtn,
    generateBtn,
    copyBtn,
    resultEl,
    optionsLink
  ].filter(el => el); // Filtrar elementos que existem
  
  focusableElements.forEach((element, index) => {
    element.addEventListener('keydown', (event) => {
      // Navegação circular com Ctrl+Tab
      if (event.ctrlKey && event.key === 'Tab') {
        event.preventDefault();
        const nextIndex = event.shiftKey 
          ? (index - 1 + focusableElements.length) % focusableElements.length
          : (index + 1) % focusableElements.length;
        focusableElements[nextIndex].focus();
      }
    });
  });
}

// Adicionar tooltips com atalhos de teclado
function addKeyboardTooltips() {
  if (generateBtn) {
    const currentTitle = generateBtn.getAttribute('title') || '';
    generateBtn.setAttribute('title', `${currentTitle} (Ctrl+Enter)`.trim());
  }
  
  if (copyBtn) {
    const currentTitle = copyBtn.getAttribute('title') || '';
    copyBtn.setAttribute('title', `${currentTitle} (Alt+C)`.trim());
  }
  
  if (saveKeyBtn) {
    const currentTitle = saveKeyBtn.getAttribute('title') || '';
    saveKeyBtn.setAttribute('title', `${currentTitle} (Alt+S)`.trim());
  }
  
  if (toggleKeyBtn) {
    const currentTitle = toggleKeyBtn.getAttribute('title') || '';
    toggleKeyBtn.setAttribute('title', `${currentTitle} (Alt+T)`.trim());
  }
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeApiKey();
    setupKeyboardNavigation();
    addKeyboardTooltips();
  });
} else {
  initializeApiKey();
  setupKeyboardNavigation();
  addKeyboardTooltips();
}

updateStatus();