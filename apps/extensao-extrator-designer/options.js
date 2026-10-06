// Options page: configurações avançadas e validação da API key

// Elementos da interface
const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveBtn');
const showBtn = document.getElementById('showBtn');
const testBtn = document.getElementById('testBtn');
const clearBtn = document.getElementById('clearBtn');
const statusEl = document.getElementById('status');

// Configurações avançadas
const maxElementsInput = document.getElementById('maxElements');
const cacheTimeoutInput = document.getElementById('cacheTimeout');
const promptLanguageSelect = document.getElementById('promptLanguage');
const includeMotionCheck = document.getElementById('includeMotion');
const includeFontsCheck = document.getElementById('includeFonts');
const includeVariablesCheck = document.getElementById('includeVariables');
const debugModeCheck = document.getElementById('debugMode');

// Estatísticas
const promptCountEl = document.getElementById('promptCount');
const lastUsedEl = document.getElementById('lastUsed');

// Constantes
const API_KEY_PATTERN = /^AIza[0-9A-Za-z-_]{35}$/;
const DEFAULT_SETTINGS = {
  maxElements: 200,
  cacheTimeout: 30,
  promptLanguage: 'pt',
  includeMotion: true,
  includeFonts: true,
  includeVariables: true,
  debugMode: false
};

// Funções utilitárias
function setStatus(msg, type = 'info') {
  if (!statusEl) return;
  
  statusEl.className = `status ${type}`;
  statusEl.textContent = msg;
  statusEl.style.display = 'block';
  
  // Auto-hide após 5 segundos
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 5000);
}

function validateApiKey(key) {
  if (!key || typeof key !== 'string') return false;
  return API_KEY_PATTERN.test(key.trim());
}

function addLoadingState(button) {
  if (!button) return;
  button.disabled = true;
  button.setAttribute('data-original-text', button.innerHTML);
  button.innerHTML = '<span class="icon">⏳</span> Carregando...';
}

function removeLoadingState(button) {
  if (!button) return;
  button.disabled = false;
  const originalText = button.getAttribute('data-original-text');
  if (originalText) {
    button.innerHTML = originalText;
    button.removeAttribute('data-original-text');
  }
}

// Carregar configurações
async function loadSettings() {
  try {
    const data = await new Promise(resolve => {
      chrome.storage.sync.get([
        'geminiApiKey',
        'maxElements',
        'cacheTimeout', 
        'promptLanguage',
        'includeMotion',
        'includeFonts',
        'includeVariables',
        'debugMode',
        'promptCount',
        'lastUsed'
      ], resolve);
    });
    
    // API Key
    if (apiKeyInput) {
      apiKeyInput.value = data.geminiApiKey || '';
    }
    
    // Configurações avançadas
    if (maxElementsInput) maxElementsInput.value = data.maxElements || DEFAULT_SETTINGS.maxElements;
    if (cacheTimeoutInput) cacheTimeoutInput.value = data.cacheTimeout || DEFAULT_SETTINGS.cacheTimeout;
    if (promptLanguageSelect) promptLanguageSelect.value = data.promptLanguage || DEFAULT_SETTINGS.promptLanguage;
    if (includeMotionCheck) includeMotionCheck.checked = data.includeMotion !== false;
    if (includeFontsCheck) includeFontsCheck.checked = data.includeFonts !== false;
    if (includeVariablesCheck) includeVariablesCheck.checked = data.includeVariables !== false;
    if (debugModeCheck) debugModeCheck.checked = data.debugMode === true;
    
    // Estatísticas
    if (promptCountEl) promptCountEl.textContent = data.promptCount || 0;
    if (lastUsedEl) {
      const lastUsed = data.lastUsed;
      if (lastUsed) {
        const date = new Date(lastUsed);
        lastUsedEl.textContent = date.toLocaleString('pt-BR');
      } else {
        lastUsedEl.textContent = 'Nunca';
      }
    }
    
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
    setStatus('Erro ao carregar configurações', 'error');
  }
}

// Salvar configurações
async function saveSettings() {
  try {
    addLoadingState(saveBtn);
    
    const key = apiKeyInput ? apiKeyInput.value.trim() : '';
    
    // Validar API key se fornecida
    if (key && !validateApiKey(key)) {
      setStatus('Formato da API key inválido. Deve começar com "AIza" e ter 39 caracteres.', 'error');
      removeLoadingState(saveBtn);
      return;
    }
    
    // Validar configurações numéricas
    const maxElements = parseInt(maxElementsInput?.value) || DEFAULT_SETTINGS.maxElements;
    const cacheTimeout = parseInt(cacheTimeoutInput?.value) || DEFAULT_SETTINGS.cacheTimeout;
    
    if (maxElements < 50 || maxElements > 500) {
      setStatus('Máximo de elementos deve estar entre 50 e 500', 'error');
      removeLoadingState(saveBtn);
      return;
    }
    
    if (cacheTimeout < 0 || cacheTimeout > 300) {
      setStatus('Tempo de cache deve estar entre 0 e 300 segundos', 'error');
      removeLoadingState(saveBtn);
      return;
    }
    
    const settings = {
      geminiApiKey: key,
      maxElements,
      cacheTimeout,
      promptLanguage: promptLanguageSelect?.value || DEFAULT_SETTINGS.promptLanguage,
      includeMotion: includeMotionCheck?.checked !== false,
      includeFonts: includeFontsCheck?.checked !== false,
      includeVariables: includeVariablesCheck?.checked !== false,
      debugMode: debugModeCheck?.checked === true
    };
    
    await new Promise((resolve, reject) => {
      chrome.storage.sync.set(settings, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
    
    setStatus('Configurações salvas com sucesso!', 'success');
    
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    setStatus('Erro ao salvar configurações', 'error');
  } finally {
    removeLoadingState(saveBtn);
  }
}

// Testar API key
async function testApiKey() {
  try {
    addLoadingState(testBtn);
    
    const key = apiKeyInput ? apiKeyInput.value.trim() : '';
    
    if (!key) {
      setStatus('Informe uma API key para testar', 'error');
      removeLoadingState(testBtn);
      return;
    }
    
    if (!validateApiKey(key)) {
      setStatus('Formato da API key inválido', 'error');
      removeLoadingState(testBtn);
      return;
    }
    
    // Fazer uma chamada de teste para a API do Gemini
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: 'Teste de conexão. Responda apenas "OK".' }]
        }]
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.candidates && data.candidates.length > 0) {
        setStatus('✅ API key válida e funcionando!', 'success');
      } else {
        setStatus('⚠️ API key válida, mas resposta inesperada', 'error');
      }
    } else {
      const errorText = await response.text();
      if (response.status === 401) {
        setStatus('❌ API key inválida ou sem permissões', 'error');
      } else if (response.status === 429) {
        setStatus('⚠️ Limite de requisições atingido. Tente novamente mais tarde.', 'error');
      } else {
        setStatus(`❌ Erro na API: ${response.status}`, 'error');
      }
      console.error('Erro no teste da API:', errorText);
    }
    
  } catch (error) {
    console.error('Erro ao testar API key:', error);
    setStatus('❌ Erro de conexão. Verifique sua internet.', 'error');
  } finally {
    removeLoadingState(testBtn);
  }
}

// Limpar todos os dados
async function clearAllData() {
  if (!confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
    return;
  }
  
  try {
    addLoadingState(clearBtn);
    
    await new Promise((resolve, reject) => {
      chrome.storage.sync.clear(() => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
    
    // Limpar também o sessionStorage se possível
    try {
      sessionStorage.clear();
    } catch (e) {
      console.warn('Não foi possível limpar sessionStorage:', e);
    }
    
    setStatus('Todos os dados foram limpos!', 'success');
    
    // Recarregar configurações padrão
    setTimeout(() => {
      loadSettings();
    }, 1000);
    
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    setStatus('Erro ao limpar dados', 'error');
  } finally {
    removeLoadingState(clearBtn);
  }
}

// Alternar visibilidade da API key
function toggleVisibility() {
  if (!apiKeyInput) return;
  
  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type = isPassword ? 'text' : 'password';
  
  // Atualizar ícone do botão
  if (showBtn) {
    const icon = showBtn.querySelector('.icon');
    if (icon) {
      icon.textContent = isPassword ? '🙈' : '👁';
    }
  }
}

// Event listeners
if (saveBtn) saveBtn.addEventListener('click', saveSettings);
if (showBtn) showBtn.addEventListener('click', toggleVisibility);
if (testBtn) testBtn.addEventListener('click', testApiKey);
if (clearBtn) clearBtn.addEventListener('click', clearAllData);

// Validação em tempo real da API key
if (apiKeyInput) {
  apiKeyInput.addEventListener('input', () => {
    const key = apiKeyInput.value.trim();
    if (key && !validateApiKey(key)) {
      apiKeyInput.style.borderColor = 'var(--error-color)';
    } else {
      apiKeyInput.style.borderColor = '';
    }
  });
}

// Carregar configurações ao inicializar
document.addEventListener('DOMContentLoaded', loadSettings);
loadSettings();